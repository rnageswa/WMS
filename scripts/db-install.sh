#!/usr/bin/env bash
# =============================================================================
# WareIQ WMS — Database Installation & Seed Script
# =============================================================================
# Usage:
#   1. Copy .env.example to .env and fill in your DATABASE_URL
#   2. Run: bash scripts/db-install.sh
#
# This script:
#   Step 1 — Verify DATABASE_URL is set
#   Step 2 — Push all Drizzle ORM schemas to PostgreSQL
#   Step 3 — Seed demo data (warehouses, products, suppliers, inventory, etc.)
#   Step 4 — Verify tables exist and seed counts
# =============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Helpers ───────────────────────────────────────────────────────────────────
info()    { echo -e "${BLUE}ℹ${NC}  $1"; }
success() { echo -e "${GREEN}✓${NC}  $1"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $1"; }
error()   { echo -e "${RED}✗${NC}  $1"; }
header()  { echo -e "\n${BOLD}${CYAN}━━━ $1 ━━━${NC}\n"; }
step()    { echo -e "\n${BOLD}${CYAN}Step $1:${NC} $2"; }

# ── Root directory ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# =============================================================================
# Step 1 — Verify prerequisites
# =============================================================================
step 1 "Verify prerequisites"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  error "pnpm is not installed. Install it: npm install -g pnpm"
  exit 1
fi
success "pnpm $(pnpm --version) found"

# Check node
if ! command -v node &> /dev/null; then
  error "Node.js is not installed. Install from https://nodejs.org"
  exit 1
fi
success "Node.js $(node --version) found"

# Check .env exists
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    warn ".env not found. Copying .env.example → .env"
    cp .env.example .env
    warn "Edit .env with your actual DATABASE_URL before re-running."
    exit 1
  else
    error ".env not found and no .env.example to copy."
    exit 1
  fi
fi
success ".env file exists"

# Load .env
export $(grep -v '^#' .env | xargs) 2>/dev/null || true

if [ -z "${DATABASE_URL:-}" ]; then
  error "DATABASE_URL is not set in .env"
  echo "  Get a free PostgreSQL database from https://neon.tech"
  echo "  Then set DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require"
  exit 1
fi
success "DATABASE_URL is set"

# Mask credentials for display
SAFE_URL=$(echo "$DATABASE_URL" | sed 's|://[^:]*:[^@]*@|://****:****@|')
info "Target database: $SAFE_URL"

# =============================================================================
# Step 2 — Install dependencies
# =============================================================================
step 2 "Install dependencies"

if [ ! -d "node_modules" ]; then
  info "Running pnpm install (first time, may take a minute)..."
  pnpm install --frozen-lockfile 2>&1 | tail -5
  success "Dependencies installed"
else
  info "node_modules exists, checking for updates..."
  pnpm install --frozen-lockfile 2>&1 | tail -3
  success "Dependencies up to date"
fi

# =============================================================================
# Step 3 — Push schema to database
# =============================================================================
step 3 "Push Drizzle ORM schemas to PostgreSQL"

info "This creates all tables: products, locations, inventory, orders, purchasing,"
info "alerts, auth, currencies, costing, pricing, picking, shipments, and more."

cd "$ROOT_DIR/lib/db"

# Run drizzle-kit push
if npx drizzle-kit push --config ./drizzle.config.ts 2>&1; then
  success "All schemas pushed successfully"
else
  error "Schema push failed. Check DATABASE_URL and ensure the database is accessible."
  exit 1
fi

cd "$ROOT_DIR"

# =============================================================================
# Step 4 — Verify tables exist
# =============================================================================
step 4 "Verify tables in database"

info "Checking that all expected tables were created..."

EXPECTED_TABLES=(
  "products" "warehouses" "zones" "bins"
  "inventory_items" "inventory_movements"
  "sales_orders" "sales_order_lines" "sales_order_history"
  "picking_tasks" "picking_lines" "shipments"
  "suppliers" "purchase_orders" "purchase_order_lines"
  "po_templates" "po_template_lines" "po_status_history"
  "velocity_alert_settings" "sku_alert_overrides" "alert_send_log"
  "user_roles"
  "currencies" "exchange_rates"
  "inventory_valuation_log"
  "price_lists" "price_list_items"
)

TABLE_LIST=$(psql "$DATABASE_URL" -t -c "
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
" 2>/dev/null || echo "")

MISSING=0
FOUND=0
for table in "${EXPECTED_TABLES[@]}"; do
  if echo "$TABLE_LIST" | grep -qw "$table"; then
    ((FOUND++))
  else
    warn "  Missing: $table"
    ((MISSING++))
  fi
done

if [ "$MISSING" -gt 0 ]; then
  error "$MISSING table(s) missing. Schema push may have partially failed."
  exit 1
fi
success "All ${#EXPECTED_TABLES[@]} tables verified ($FOUND found)"

# =============================================================================
# Step 5 — Seed demo data
# =============================================================================
step 5 "Seed demo data"

info "Starting the API server temporarily to seed data..."

# Check if server is already running
API_PORT="${PORT:-5173}"
API_URL="http://localhost:${API_PORT}"

if curl -s --max-time 2 "${API_URL}/api/health" > /dev/null 2>&1; then
  info "API server already running on port ${API_PORT}"
  SERVER_WAS_RUNNING=true
else
  SERVER_WAS_RUNNING=false
  info "Starting API server on port ${API_PORT}..."

  # Start server in background
  cd "$ROOT_DIR/artifacts/api-server"
  PORT=$API_PORT pnpm dev > /tmp/wms-api-seed.log 2>&1 &
  SERVER_PID=$!
  echo $SERVER_PID > /tmp/wms-api-seed.pid

  # Wait for server to be ready
  RETRIES=30
  until curl -s --max-time 1 "${API_URL}/api/health" > /dev/null 2>&1; do
    sleep 1
    ((RETRIES--))
    if [ "$RETRIES" -le 0 ]; then
      error "API server failed to start within 30 seconds"
      echo "  Check /tmp/wms-api-seed.log for details"
      kill $SERVER_PID 2>/dev/null || true
      exit 1
    fi
  done
  success "API server started (PID: $SERVER_PID)"
  cd "$ROOT_DIR"
fi

# Call the seed endpoint
info "Calling POST /api/seed ..."
SEED_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST "${API_URL}/api/seed" \
  -H "Content-Type: application/json" 2>/dev/null)

HTTP_CODE=$(echo "$SEED_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$SEED_RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "200" ]; then
  success "Seed completed successfully"
  echo ""
  echo "  Seeded data includes:"
  echo "    • 2 warehouses (Main, Secondary)"
  echo "    • 3 zones (Receiving, Storage A, Storage B)"
  echo "    • 4 bins (A-01, B-01, B-02, C-01)"
  echo "    • 10 products (SKU-001 through SKU-010)"
  echo "    • 3 suppliers (Acme, Global Parts, Tech Components)"
  echo "    • Inventory items with random quantities"
  echo "    • 3 purchase orders (ordered, received, draft)"
  echo "    • PO templates and lines"
  echo "    • Inventory movements (inbound, outbound, adjustment)"
  echo "    • Velocity alert settings + SKU overrides"
  echo "    • Currencies (USD base, INR, EUR) + exchange rates"
  echo "    • Default price list with product prices"
  echo "    • Inventory avgCost seeded from product prices"
else
  error "Seed failed (HTTP $HTTP_CODE)"
  echo "  Response: $BODY"

  # Stop server if we started it
  if [ "$SERVER_WAS_RUNNING" = false ]; then
    kill $(cat /tmp/wms-api-seed.pid 2>/dev/null) 2>/dev/null || true
  fi
  exit 1
fi

# Stop server if we started it
if [ "$SERVER_WAS_RUNNING" = false ]; then
  info "Stopping temporary API server..."
  kill $(cat /tmp/wms-api-seed.pid 2>/dev/null) 2>/dev/null || true
  rm -f /tmp/wms-api-seed.pid /tmp/wms-api-seed.log
  success "Server stopped"
fi

# =============================================================================
# Step 6 — Verify seed data
# =============================================================================
step 6 "Verify seed data counts"

info "Querying database for seed verification..."

verify_count() {
  local table="$1"
  local expected="$2"
  local label="$3"
  local count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs)
  if [ "$count" -ge "$expected" ] 2>/dev/null; then
    success "  $label: $count rows"
  else
    warn "  $label: $count rows (expected ≥ $expected)"
  fi
}

verify_count "warehouses" 2 "Warehouses"
verify_count "zones" 3 "Zones"
verify_count "bins" 4 "Bins"
verify_count "products" 10 "Products"
verify_count "suppliers" 3 "Suppliers"
verify_count "inventory_items" 4 "Inventory items"
verify_count "purchase_orders" 3 "Purchase orders"
verify_count "currencies" 3 "Currencies"
verify_count "price_lists" 1 "Price lists"

# =============================================================================
# Done
# =============================================================================
header "Installation Complete"

echo -e "  ${GREEN}Database is ready!${NC}"
echo ""
echo -e "  ${BOLD}Next steps:${NC}"
echo ""
echo "  1. Configure Clerk auth keys in .env:"
echo "     CLERK_PUBLISHABLE_KEY=pk_test_..."
echo "     CLERK_SECRET_KEY=sk_test_..."
echo "     VITE_CLERK_PUBLISHABLE_KEY=pk_test_..."
echo ""
echo "  2. Start the development servers:"
echo "     Terminal 1: cd artifacts/api-server && pnpm dev"
echo "     Terminal 2: cd artifacts/wms-app && pnpm dev"
echo ""
echo "  3. Open http://localhost:5173 in your browser"
echo ""
echo "  4. Sign up — the first user becomes admin automatically"
echo ""
echo -e "  ${BOLD}To re-seed (WARNING: deletes existing data):${NC}"
echo "     curl -X POST http://localhost:5173/api/seed"
echo ""
echo -e "  ${BOLD}To reset schema (WARNING: drops all tables):${NC}"
echo "     cd lib/db && npx drizzle-kit push --force"
echo ""
