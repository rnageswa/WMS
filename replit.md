# Workspace

## Overview

pnpm workspace monorepo using TypeScript. WareIQ — a full Warehouse Management System MVP.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind v4 + shadcn/ui + TanStack Query + wouter

## Artifacts

| Artifact | Path | Port | Notes |
|---|---|---|---|
| `wms-app` | `/wms/` | 18736 | WareIQ frontend (React+Vite) |
| `api-server` | `/api` | 8080 | Express REST API |
| `wms-design` | `/` | 22384 | Design blueprint (21 slides) |

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## WMS Phase 1 — Implemented Features

- **Dashboard** — KPI tiles (SKUs, bins, low-stock count, movements today) + recent movements feed
- **Products** — Searchable SKU catalog with create, view detail, and deactivate
- **Inventory** — Bin-level stock browser filtered by warehouse / low-stock flag
- **Inventory Adjust** — Manual adjustment form with cascading warehouse→zone→bin selectors, reason code, audit trail
- **Locations** — Warehouse/Zone/Bin hierarchy browser with inline zone and bin creation dialogs
- **Movements** — Full audit trail filterable by product, type, date range
- **Scan Lookup** — Barcode / SKU scanner with instant bin-level stock view
- **Receiving** — Inbound stock form; upserts inventory, records inbound movement
- **Dispatch** — Outbound pick form with validation against on-hand qty
- **Stock Transfer** — Bin-to-bin transfer with cascading location selectors
- **Reports** — Stock value, Supplier Performance, and Stock Velocity reports with CSV export; velocity alert settings panel (daily cron + manual send via Resend); per-SKU alert exceptions (always/never overrides)
- **Cycle Count** — Guided count workflow; records adjustments and audit movements
- **Low-Stock Alerts** — Dashboard badge + alert list for SKUs below reorder threshold
- **Purchase Orders** — Full PO workflow: create draft PO with line items, mark as ordered, receive stock per-line into specific bins (upserts inventory, records inbound movements), status machine (draft→ordered→partially_received→received / cancelled)
- **Supplier Management** — Supplier directory with contact info (name, email, phone, address, lead time, notes), inline create dialog, edit-in-place detail page, active/inactive toggle, PO history per supplier, supplier selector in PO create form (with free-text fallback)

## Database Schema

- `warehouses(id, name, address, is_active, created_at, updated_at)`
- `zones(id, warehouse_id, name, code, created_at)`
- `bins(id, zone_id, code, name, is_active, created_at)`
- `products(id, sku_code, name, description, category, barcode, unit_of_measure, unit_price, reorder_threshold, is_active, created_at, updated_at)`
- `inventory_items(id, product_id, bin_id, qty_on_hand, updated_at)` — unique(product_id, bin_id)
- `inventory_movements(id, product_id, bin_id, movement_type, quantity, reason_code, reference_id, reference_type, created_by, created_at)`
- `suppliers(id, name, contact_name, email, phone, address, lead_time_days, notes, is_active, created_at, updated_at)`
- `purchase_orders(id, po_number, supplier_id (FK nullable), supplier_name, status, notes, created_at, updated_at)` — status: draft|ordered|partially_received|received|cancelled
- `purchase_order_lines(id, po_id, product_id, qty_ordered, qty_received, unit_cost, status, created_at)` — status: pending|partially_received|received

## API Routes

All routes prefixed `/api`:
- `GET/POST /products` · `GET/PATCH/DELETE /products/:id`
- `GET/POST /warehouses` · `GET/PATCH /warehouses/:id`
- `GET/POST /warehouses/:id/zones` · `GET/POST /zones/:id/bins`
- `GET /inventory` · `POST /inventory/adjust`
- `GET /movements`
- `GET /dashboard/summary`
- `GET /alerts/low-stock`
- `GET/POST /suppliers` · `GET/PATCH /suppliers/:id`
- `GET/POST /purchase-orders` · `GET /purchase-orders/:id`
- `PATCH /purchase-orders/:id/status` · `POST /purchase-orders/:id/receive`

## Authentication (Clerk)

- **Provider**: Clerk (`@clerk/react` v6, `@clerk/express` v2)
- **Clerk App ID**: `app_3DCFNiJfg1T8eNH5Kf6EFh1J85E` — instance FAPI: `concise-duck-23.clerk.accounts.dev`
- **Env vars**: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`
- **Dev proxy fix**: Whitelabel key encodes custom domain as FAPI host (production-only). In dev:
  - Clerk JS loaded from CDN via `extraClerkProps` spread on `ClerkProvider`
  - All Clerk API calls proxied through `/api/__clerk` → `clerkProxyMiddleware` forwards to `https://concise-duck-23.clerk.accounts.dev`
  - FAPI host derived dynamically from publishable key by base64-decoding its payload
- **Roles**: Stored in `user_roles(user_id, role, created_at)` table (NOT Clerk publicMetadata)
  - First user to sign up gets `admin`; subsequent users get `operator`
  - Roles: `admin`, `operator`, `viewer`
- **Auth middleware**: `requireAuth` (any signed-in user), `requireRole('admin')` (admin-only)
- **Auth routes**: `GET /api/auth/me`, `GET /api/auth/users` (admin), `PUT /api/auth/users/:id/role` (admin)
- **Frontend**: Sign-in at `/sign-in`, sign-up at `/sign-up`, admin panel at `/admin`
- **Layout**: User profile button + role badge in top-right corner of sidebar

## Database Schema

- `warehouses(id, name, address, is_active, created_at, updated_at)`
- `zones(id, warehouse_id, name, code, created_at)`
- `bins(id, zone_id, code, name, is_active, created_at)`
- `products(id, sku_code, name, description, category, barcode, unit_of_measure, unit_price, reorder_threshold, is_active, created_at, updated_at)`
- `inventory_items(id, product_id, bin_id, qty_on_hand, updated_at)` — unique(product_id, bin_id)
- `inventory_movements(id, product_id, bin_id, movement_type, quantity, reason_code, reference_id, reference_type, created_by, created_at)`
- `suppliers(id, name, contact_name, email, phone, address, lead_time_days, notes, is_active, created_at, updated_at)`
- `purchase_orders(id, po_number, supplier_id (FK nullable), supplier_name, status, notes, created_at, updated_at)` — status: draft|ordered|partially_received|received|cancelled
- `purchase_order_lines(id, po_id, product_id, qty_ordered, qty_received, unit_cost, status, created_at)` — status: pending|partially_received|received
- `user_roles(user_id, role, created_at)` — role: admin|operator|viewer

## Important Notes

- Orval config: `mode: "single"`, `target: "generated/api"`, no `schemas` key — do NOT revert
- DB schema has no `code` column on `warehouses` (only on zones/bins)
- API server imports Zod schemas from `@workspace/api-zod`, DB tables from `@workspace/db/schema`
- Frontend imports hooks from `@workspace/api-client-react`
- Generated hooks return `T` directly (not wrapped in `.data`)
- `zod` must be in `@workspace/api-server` dependencies (it's used in `inventory.ts`)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
