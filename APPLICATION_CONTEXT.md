# WareIQ — Warehouse Management System (WMS)
## Complete Application Context & Design Document

**Last Updated:** 2026-05-09
**Version:** MVP — Phase 1-6 Complete + Admin Console

---

## 1. Executive Summary

WareIQ is a full-featured Warehouse Management System built as a modern web application. It manages the complete warehouse lifecycle: receiving goods from suppliers, storing inventory in structured locations (warehouses → zones → bins), fulfilling customer sales orders through picking/packing/shipping, and providing reports/alerts for operational visibility.

**Brand:** WareIQ (orange accent `#E8622A`, dark navy `#0F2540`)

---

## 2. Technology Stack

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 19.1.4 + TypeScript |
| Routing | wouter (lightweight SPA router) |
| State / Data Fetching | TanStack React Query v5 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS v4 |
| Forms | react-hook-form + @hookform/resolvers + Zod |
| Icons | lucide-react |
| Date Handling | date-fns |
| Barcodes | react-barcode, qrcode.react |
| Build Tool | Vite v7 |
| Auth | Clerk v6.5 (`@clerk/react`) |

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js + TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Neon serverless) |
| Validation | Zod v3 |
| Auth | Clerk Express middleware (`@clerk/express`) |
| Logging | pino-http |
| Email | Resend API |
| API Client Generation | Orval (OpenAPI → React Query hooks) |

### Infrastructure
| Component | Detail |
|-----------|--------|
| Monorepo | pnpm workspaces |
| DB Hosting | Neon (serverless PostgreSQL) |
| Auth | Clerk (JWT-based, session cookies) |
| Email | Resend |
| Deployment Target | Replit (dev), configurable for production |

---

## 3. Project Structure (Monorepo)

```
D:\MyProjects\WMS\WMS\
├── artifacts/
│   ├── wms-app/                  # Frontend React application
│   │   ├── src/
│   │   │   ├── pages/            # 30+ page components
│   │   │   ├── components/       # Shared UI components
│   │   │   │   ├── ui/           # shadcn/ui primitives
│   │   │   │   ├── layout.tsx    # App layout wrapper
│   │   │   │   ├── help-tooltip.tsx
│   │   │   │   └── label-print.tsx
│   │   │   ├── lib/              # Utilities
│   │   │   │   ├── queryClient.ts
│   │   │   │   ├── help-content.ts
│   │   │   │   └── ...
│   │   │   ├── hooks/            # Custom hooks (use-toast, etc.)
│   │   │   └── App.tsx           # Route definitions
│   │   └── package.json
│   │
│   └── api-server/               # Backend Express application
│       ├── src/
│       │   ├── routes/           # API route modules
│       │   │   ├── index.ts      # Route mounting
│       │   │   ├── products.ts
│       │   │   ├── inventory.ts
│       │   │   ├── locations.ts
│       │   │   ├── purchasing.ts
│       │   │   ├── orders.ts
│       │   │   ├── picking.ts
│       │   │   ├── suppliers.ts
│       │   │   ├── notifications.ts
│       │   │   ├── auth.ts
│       │   │   ├── seed.ts
│       │   │   └── health.ts
│       │   ├── middlewares/       # Auth, Clerk proxy
│       │   ├── lib/              # logger, email, velocity-alert
│       │   └── app.ts            # Express app setup
│       └── package.json
│
├── lib/
│   ├── db/                       # Database package
│   │   ├── src/schema/           # Drizzle ORM schemas
│   │   │   ├── products.ts
│   │   │   ├── locations.ts
│   │   │   ├── inventory.ts
│   │   │   ├── orders.ts
│   │   │   ├── purchasing.ts
│   │   │   ├── alerts.ts
│   │   │   ├── auth.ts
│   │   │   └── index.ts
│   │   ├── drizzle/              # Migrations & snapshots
│   │   └── drizzle.config.ts
│   │
│   ├── api-client-react/         # Auto-generated API hooks
│   │   └── src/
│   │       ├── generated/        # Orval-generated hooks & types
│   │       ├── picking.ts        # Custom picking hooks
│   │       └── custom-fetch.ts   # Fetch wrapper with auth
│   │
│   └── api-zod/                  # Shared Zod validation schemas
│
├── pnpm-workspace.yaml
├── .env                          # DATABASE_URL, CLERK keys, RESEND key
└── package.json
```

---

## 4. Database Schema (Complete)

### 4.1 Products
**Table:** `products`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, auto-generated |
| skuCode | text | UNIQUE, not null |
| name | text | not null |
| description | text | nullable |
| category | text | nullable |
| barcode | text | UNIQUE, nullable |
| unitOfMeasure | text | default: "each" |
| unitPrice | numeric(10,2) | nullable |
| reorderThreshold | integer | default: 0 |
| isActive | boolean | default: true |
| createdAt | timestamptz | auto |
| updatedAt | timestamptz | auto |

### 4.2 Locations (Warehouse → Zone → Bin Hierarchy)
**Table:** `warehouses`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | text | not null |
| address | text | nullable |
| isActive | boolean | default: true |
| createdAt | timestamptz | auto |
| updatedAt | timestamptz | auto |

**Table:** `zones`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| warehouseId | UUID | FK → warehouses, CASCADE |
| name | text | not null |
| code | text | not null |
| createdAt | timestamptz | auto |

**Table:** `bins`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| zoneId | UUID | FK → zones, CASCADE |
| code | text | not null |
| name | text | nullable |
| isActive | boolean | default: true |
| createdAt | timestamptz | auto |
| **Unique:** (zoneId, code) |

### 4.3 Inventory
**Table:** `inventory_items`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| productId | UUID | FK → products, RESTRICT |
| binId | UUID | FK → bins, RESTRICT |
| qtyOnHand | integer | default: 0, CHECK >= 0 |
| updatedAt | timestamptz | auto |
| **Unique:** (productId, binId) |

**Table:** `inventory_movements`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| productId | UUID | FK → products |
| binId | UUID | FK → bins |
| movementType | text | enum: adjustment, inbound, outbound |
| quantity | integer | not null |
| reasonCode | text | nullable |
| referenceId | UUID | nullable |
| referenceType | text | nullable |
| createdBy | text | nullable |
| createdAt | timestamptz | auto |

### 4.4 Sales Orders
**Table:** `sales_orders`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| orderNumber | text | UNIQUE, format: SO-YYMM-XXXX |
| customerName | text | not null |
| customerEmail | text | nullable |
| customerPhone | text | nullable |
| shippingAddress | text | nullable |
| status | text | enum: draft, confirmed, picking, picking_complete, packed, shipped, delivered, cancelled |
| notes | text | nullable |
| expectedShipDate | date | nullable |
| shippedAt | timestamptz | nullable |
| deliveredAt | timestamptz | nullable |
| createdAt | timestamptz | auto |
| updatedAt | timestamptz | auto |

**Table:** `sales_order_lines`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| orderId | UUID | FK → sales_orders, CASCADE |
| productId | UUID | FK → products, RESTRICT |
| qtyOrdered | integer | not null |
| qtyPicked | integer | default: 0 |
| qtyPacked | integer | default: 0 |
| qtyShipped | integer | default: 0 |
| unitPrice | numeric(12,2) | nullable |
| status | text | enum: pending, picking, picked, packed, shipped, fulfilled |

**Table:** `sales_order_history` — audit trail of status changes

### 4.5 Picking
**Table:** `picking_tasks`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| orderId | UUID | FK → sales_orders, CASCADE |
| status | text | default: pending (pending, assigned, in_progress, completed, cancelled) |
| assignedTo | text | nullable |
| startedAt | timestamptz | nullable |
| completedAt | timestamptz | nullable |
| createdAt | timestamptz | auto |
| updatedAt | timestamptz | auto |

**Table:** `picking_lines`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| taskId | UUID | FK → picking_tasks, CASCADE |
| orderLineId | UUID | FK → sales_order_lines, CASCADE |
| productId | UUID | FK → products |
| binId | UUID | nullable (suggested pick bin) |
| qtyToPick | integer | not null |
| qtyPicked | integer | default: 0 |
| status | text | enum: pending, picking, picked, short |
| pickedAt | timestamptz | nullable |
| createdAt | timestamptz | auto |
| updatedAt | timestamptz | auto |

### 4.6 Purchase Orders
**Table:** `purchase_orders`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| poNumber | text | UNIQUE, format: PO-YYMM-XXXX |
| supplierId | UUID | FK → suppliers, SET NULL |
| supplierName | text | not null |
| status | text | enum: draft, ordered, partially_received, received, cancelled |
| notes | text | nullable |
| expectedDeliveryDate | date | nullable |
| createdAt | timestamptz | auto |
| updatedAt | timestamptz | auto |

**Table:** `purchase_order_lines`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| poId | UUID | FK → purchase_orders, CASCADE |
| productId | UUID | FK → products, RESTRICT |
| qtyOrdered | integer | not null |
| qtyReceived | integer | default: 0 |
| unitCost | numeric(12,4) | nullable |
| status | text | enum: pending, partially_received, received |

**Table:** `po_templates` + `po_template_lines` — reusable PO templates
**Table:** `po_status_history` — audit trail

### 4.7 Suppliers
**Table:** `suppliers`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | text | not null |
| contactName | text | nullable |
| email | text | nullable |
| phone | text | nullable |
| address | text | nullable |
| leadTimeDays | integer | nullable |
| notes | text | nullable |
| isActive | boolean | default: true |
| createdAt | timestamptz | auto |
| updatedAt | timestamptz | auto |

### 4.8 Shipments
**Table:** `shipments`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| orderId | UUID | FK → sales_orders, SET NULL |
| trackingNumber | text | nullable |
| carrier | text | nullable |
| shippedAt | timestamptz | auto |
| notes | text | nullable |
| createdAt | timestamptz | auto |

### 4.9 Alerts & Notifications
**Table:** `velocity_alert_settings` — global alert config (threshold, lookback, email)
**Table:** `sku_alert_overrides` — per-SKU alert mode (always/never)
**Table:** `alert_send_log` — audit of every alert email sent

### 4.10 Auth
**Table:** `user_roles` — maps Clerk user IDs to app roles (admin/operator/viewer)

---

## 5. API Routes (Complete)

All routes prefixed with `/api`. Auth via Clerk session cookie.

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List products (search, category, isActive filter) |
| GET | `/products/:id` | Get product detail |
| POST | `/products` | Create product |
| PUT | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |

### Inventory
| Method | Path | Description |
|--------|------|-------------|
| GET | `/inventory` | List inventory (productId, binId, warehouseId, lowStock) |
| GET | `/inventory/movements` | List movements (with filters) |
| POST | `/inventory/adjust` | Adjust inventory qty (atomic: update + movement record) |

### Locations
| Method | Path | Description |
|--------|------|-------------|
| GET | `/warehouses` | List all warehouses |
| POST | `/warehouses` | Create warehouse |
| PUT | `/warehouses/:id` | Update warehouse |
| DELETE | `/warehouses/:id` | Delete warehouse |
| GET | `/warehouses/:id/zones` | List zones in a warehouse |
| POST | `/warehouses/:id/zones` | Create zone |
| PUT | `/zones/:id` | Update zone |
| DELETE | `/zones/:id` | Delete zone |
| GET | `/zones/:id/bins` | List bins in a zone |
| POST | `/zones/:id/bins` | Create bin |
| PUT | `/bins/:id` | Update bin |
| DELETE | `/bins/:id` | Delete bin |
| GET | `/locations/bin-activity` | Movement counts per bin in a zone |

### Sales Orders
| Method | Path | Description |
|--------|------|-------------|
| GET | `/sales-orders` | List orders (search q, status, customer filter) |
| GET | `/sales-orders/:id` | Get order detail with lines |
| GET | `/sales-orders/:id/pick-list` | Get pick list data |
| GET | `/sales-orders/:id/packing-slip` | Get packing slip data |
| GET | `/sales-orders/export` | Export orders as CSV |
| POST | `/sales-orders` | Create order |
| PUT | `/sales-orders/:id` | Update order |
| DELETE | `/sales-orders/:id` | Delete order |
| POST | `/sales-orders/:id/confirm` | Confirm order (draft → confirmed) |
| POST | `/sales-orders/:id/start-picking` | Start picking (confirmed → picking) |
| POST | `/sales-orders/:id/complete-picking` | Complete picking (picking → picking_complete) |
| POST | `/sales-orders/:id/pack` | Pack order (picking_complete → packed) |
| POST | `/sales-orders/:id/ship` | Ship order (packed → shipped, creates shipment record) |
| POST | `/sales-orders/:id/deliver` | Deliver order (shipped → delivered) |
| POST | `/sales-orders/:id/cancel` | Cancel order |
| PUT | `/sales-orders/:id/lines/:lineId/pick` | Update pick qty on a line |

### Picking Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/picking-tasks` | List tasks (status, assignedTo, orderId filter) |
| GET | `/picking-tasks/:id` | Get task detail with lines |
| POST | `/picking-tasks` | Create task from sales order (auto-creates lines from order lines, finds best bin with inventory) |
| PUT | `/picking-tasks/:id/start` | Start picking (pending/assigned → in_progress) |
| PUT | `/picking-tasks/:id/lines/:lineId/pick` | Pick a line (qtyPicked, optional binId override) |
| PUT | `/picking-tasks/:id/complete` | Complete task (in_progress → completed, updates order to picking_complete) |
| PUT | `/picking-tasks/:id/cancel` | Cancel task |

### Purchase Orders
| Method | Path | Description |
|--------|------|-------------|
| GET | `/purchase-orders` | List POs (status, search q) |
| GET | `/purchase-orders/:id` | Get PO detail with lines |
| GET | `/purchase-orders/export` | Export as CSV |
| POST | `/purchase-orders` | Create PO |
| PUT | `/purchase-orders/:id` | Update PO |
| DELETE | `/purchase-orders/:id` | Delete PO (draft only) |
| PUT | `/purchase-orders/:id/status` | Update status (draft→ordered→received, etc.) |
| PUT | `/purchase-orders/:id/delivery-date` | Update expected delivery date |
| POST | `/purchase-orders/:id/receive` | Receive stock (creates inventory movements, updates qty_received) |
| POST | `/purchase-orders/:id/email` | Email PO to supplier |
| POST | `/purchase-orders/:id/duplicate` | Duplicate PO |
| POST | `/purchase-orders/bulk-cancel` | Bulk cancel |
| POST | `/purchase-orders/bulk-delete` | Bulk delete drafts |

### PO Templates
| Method | Path | Description |
|--------|------|-------------|
| GET | `/purchase-orders/templates` | List templates |
| GET | `/purchase-orders/templates/:id` | Get template detail |
| POST | `/purchase-orders/templates` | Create template |
| PUT | `/purchase-orders/templates/:id` | Update template |
| DELETE | `/purchase-orders/templates/:id` | Delete template |

### Suppliers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/suppliers` | List suppliers (search) |
| GET | `/suppliers/:id` | Get supplier detail |
| POST | `/suppliers` | Create supplier |
| PUT | `/suppliers/:id` | Update supplier |
| DELETE | `/suppliers/:id` | Delete supplier |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications/velocity-alert-settings` | Get alert settings |
| PUT | `/notifications/velocity-alert-settings` | Update settings |
| GET | `/notifications/sku-alert-overrides` | List SKU overrides |
| POST | `/notifications/sku-alert-overrides` | Create override |
| DELETE | `/notifications/sku-alert-overrides/:id` | Delete override |
| POST | `/notifications/reorder-alert` | Send reorder alert email |
| GET | `/notifications/alert-send-log` | List alert send history |

### Auth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/me` | Get current user role |
| POST | `/auth/roles` | Set user role |

### Seed
| Method | Path | Description |
|--------|------|-------------|
| POST | `/seed` | Seed demo data (warehouses, zones, bins, products, suppliers, inventory, POs, movements, alerts) |

---

## 6. Frontend Pages & Routes

All routes protected by Clerk auth (redirect to `/sign-in` if not authenticated).

| Route | Page Component | Module |
|-------|---------------|--------|
| `/` | Dashboard | Dashboard |
| `/products` | Products | Products |
| `/products/new` | ProductNew | Products |
| `/products/:id` | ProductDetail | Products |
| `/inventory` | Inventory | Inventory |
| `/inventory/adjust` | InventoryAdjust | Inventory |
| `/movements` | Movements | Inventory |
| `/locations` | Locations | Locations |
| `/locations/new` | LocationNew | Locations |
| `/locations/labels` | LocationLabelsPage | Locations |
| `/scan` | ScanPage | Scan |
| `/receiving` | ReceivingPage | Receiving |
| `/dispatch` | DispatchPage | Dispatch |
| `/transfer` | TransferPage | Transfer |
| `/cycle-count` | CycleCountPage | Cycle Count |
| `/reports` | ReportsPage | Reports |
| `/sales-orders` | SalesOrdersPage | Sales Orders |
| `/sales-orders/new` | SalesOrderNewPage | Sales Orders |
| `/sales-orders/:id` | SalesOrderDetailPage | Sales Orders |
| `/sales-orders/:id/pick-list` | SalesOrderPickListPage | Sales Orders |
| `/sales-orders/:id/packing-slip` | SalesOrderPackingSlipPage | Sales Orders |
| `/sales-orders/:id/shipping-label` | ShippingLabelPage | Sales Orders |
| `/picker` | PickerPage | Picking |
| `/purchase-orders` | PurchaseOrdersPage | Purchase Orders |
| `/purchase-orders/new` | PurchaseOrderNewPage | Purchase Orders |
| `/purchase-orders/:id` | PurchaseOrderDetailPage | Purchase Orders |
| `/purchase-orders/:id/print` | PurchaseOrderPrintPage | Purchase Orders |
| `/purchase-orders/:id/grn` | PurchaseOrderGrnPage | Purchase Orders |
| `/purchase-orders/templates` | PoTemplatesPage | PO Templates |
| `/purchase-orders/templates/new` | PoTemplateNewPage | PO Templates |
| `/purchase-orders/templates/:id` | PoTemplateDetailPage | PO Templates |
| `/purchase-orders/reorder` | ReorderSuggestionsPage | Reorder |
| `/purchase-orders/schedule` | ReceivingSchedulePage | Receiving Schedule |
| `/suppliers` | SuppliersPage | Suppliers |
| `/suppliers/:id` | SupplierDetailPage | Suppliers |
| `/suppliers/performance` | SupplierPerformancePage | Suppliers |
| `/admin` | AdminPage (Admin Console) | Admin |
| `/admin/settings` | AdminSettingsPage | Admin |
| `/sign-in` | SignInPage | Auth |
| `/sign-up` | SignUpPage | Auth |
| `*` | NotFound | 404 |

---

## 7. Core Business Flows

### 7.1 Sales Order Fulfillment Flow
```
Draft → Confirmed → Picking → Picking Complete → Packed → Shipped → Delivered
                                                                          ↘ Cancelled (from any state)
```

1. **Create** sales order with customer info + line items
2. **Confirm** — status changes to `confirmed`
3. **Start Picking** — status changes to `picking`, redirects to Picker page
4. **Picker View** — shows orders in `picking` status:
   - Select order → auto-creates picking task if none exists
   - "Start Picking" → task becomes `in_progress`
   - Per-line: warehouse/zone/bin selectors (cascade dropdowns)
   - Scan SKU or bin code to match and pick lines
   - Click "Pick" button per line (with optional bin override)
   - "Complete Picking" → task `completed`, order → `picking_complete`
5. **Pack** — order → `packed`
6. **Ship** — order → `shipped`, creates shipment record with tracking
7. **Deliver** — order → `delivered`

### 7.2 Purchase Order / Receiving Flow
```
Draft → Ordered → Partially Received → Received
                                    ↘ Cancelled
```

1. **Create** PO with supplier + line items (or from template)
2. **Mark as Ordered** — status → `ordered`
3. **Receive Stock** — per-line: select warehouse/zone/bin, enter qty:
   - Creates inventory movements (inbound)
   - Updates `qty_received` on PO line
   - Updates `qty_on_hand` on inventory item
   - PO status auto-advances (partially_received → received)
4. **Print GRN** — goods receipt note
5. **Email PO** — send formatted PO to supplier via Resend

### 7.3 Picking Task Lifecycle
```
pending/assigned → in_progress → completed
                              ↘ cancelled
```

- Task auto-created from sales order lines
- Each picking line gets suggested bin (highest stock for that product)
- Picker can override bin via warehouse → zone → bin cascade
- Pick endpoint does NOT auto-complete task (prevents deadlock)
- Explicit "Complete Picking" required to advance order status

### 7.4 Inventory Movement Types
- **inbound** — receiving from PO, transfer in
- **outbound** — dispatch/shipping, transfer out
- **adjustment** — manual count adjustment, cycle count correction

---

## 8. Key Design Patterns & Conventions

### 8.1 Navigation
- **Always use wouter's `setLocation()` or `<Link>`** for in-app navigation
- **Never use `window.location.assign()` or `window.location.href =`** — causes full page reload, destroys React state and Query cache
- Route paths must NOT include `/wms/` prefix

### 8.2 React Hooks Rules
- **Never call hooks inside `.map()`, loops, or callbacks**
- For per-item state in lists: use a single `useState` object keyed by item ID at component top, or extract the item into its own component
- Example pattern:
  ```ts
  const [lineLocations, setLineLocations] = useState<Record<string, { warehouseId: string; zoneId: string; binId: string }>>({});
  const setLineWarehouse = (lineId: string, warehouseId: string) =>
    setLineLocations(prev => ({ ...prev, [lineId]: { ...(prev[lineId] || {}), warehouseId, zoneId: "", binId: "" } }));
  ```

### 8.3 Boolean Filters
- Use `x.prop !== false` instead of `x.prop` for boolean filters
- Handles `NULL`/`undefined` gracefully (treats as active/true)
- Critical for `isActive` filters — DB column may be missing or NULL

### 8.4 Database Schema
- Always run `npx drizzle-kit push` after schema changes
- Schema columns must match what TypeScript types declare
- `numeric` columns need string values in Drizzle (e.g., `unitPrice: "10.99"`)
- Enum values must match schema exactly

### 8.5 API Client
- Auto-generated by Orval from OpenAPI spec
- Custom hooks in `api-client-react/src/picking.ts` for picking-specific logic
- `useGetPickingTask` accepts optional `{ query: { enabled } }` second arg

### 8.6 Print Patterns
- All print pages follow `purchase-order-print.tsx` as gold standard
- Pattern: `window.open("_blank")` → `document.write(html)` → `window.print()`

### 8.7 Auth
- Clerk handles authentication (JWT via session cookies)
- `@clerk/express` middleware validates sessions on API routes
- `requireAuth` middleware protects all API routes except health/seed
- `AuthGuard` component wraps all protected frontend pages
- Roles stored in `user_roles` table (admin/operator/viewer)

---

## 9. Seed Data

`POST /api/seed` creates:
- 2 warehouses (Main, Secondary)
- 3 zones (Receiving RCV, Storage A STG-A, Storage B STG-B)
- 4 bins (A-01, B-01, B-02, C-01)
- 10 products (SKU-001 through SKU-010, various categories)
- 3 suppliers (Acme, Global Parts, Tech Components)
- Inventory items (random qty 10-210 per product-bin combo)
- 3 purchase orders (ordered, received, draft)
- PO lines, templates, movements, alert settings, SKU alert overrides

---

## 10. Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `CLERK_PUBLISHABLE_KEY` | Clerk frontend key (pk_test_...) |
| `CLERK_SECRET_KEY` | Clerk backend key (sk_test_...) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Vite-exposed Clerk key for frontend |
| `VITE_CLERK_PROXY_URL` | Clerk proxy URL for Replit |
| `RESEND_API_KEY` | Resend email API key |
| `SESSION_SECRET` | Express session secret |
| `PORT` | Server port (5173) |

---

## 11. Build & Run Commands

```bash
# Install dependencies (from workspace root)
pnpm install

# Push DB schema changes
cd lib/db && npx drizzle-kit push

# Seed demo data
# (POST to /api/seed via curl or browser)

# Run frontend dev server
cd artifacts/wms-app && pnpm dev

# Run backend dev server
cd artifacts/api-server && pnpm dev

# Typecheck frontend
cd artifacts/wms-app && npx tsc -p tsconfig.json --noEmit

# Typecheck backend
cd artifacts/api-server && npx tsc -p tsconfig.json --noEmit

# Build frontend for production
cd artifacts/wms-app && pnpm build
```

---

## 12. MVP Phases Summary

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** (Weeks 1-3) | SKU + Inventory + Locations | ✅ Complete |
| **Phase 2** (Weeks 4-6) | Procurement + Goods Receipt | ✅ Complete |
| **Phase 3** (Weeks 7-9) | Orders + Picking + Packing + Dispatch | ✅ Complete |
| **Phase 4** (Weeks 10-11) | Reports + Polish + QA | ✅ Complete |
| **Phase 5** (Weeks 12-14) | Currency + Costing + Pricing Foundation | ✅ Complete |

### Phase 3 Details 
- Sales Orders: full CRUD, status flow, pick list, packing slip, CSV export
- Picking Tasks: DB tables, API routes, picker UI with scan-to-pick, per-line location selectors
- Packing: status transitions, packing slip print
- Dispatch: 3-step flow with stock validation, atomic outbound movements
- Shipping Label: print page at `/sales-orders/:id/shipping-label`

## 12.5 Admin Console

The Admin Console (`/admin`) is the central system administration hub, accessible only to users with the `admin` role. It uses a tabbed layout (similar to Reports) with three sections:

| Tab | Icon | Purpose |
|-----|------|---------|
| User Management | Users | View all signed-in users, assign roles (admin/operator/viewer) |
| Currency Settings | Coins | Set base currency, add currencies, manage currency list |
| Pricing & Costing | Tags | Quick links to Price Lists, COGS Report, Margin Report, Exchange Rates; overview of pricing/costing concepts |

**Navigation:** Sidebar → "Admin Console" (shield icon, admin-only). Previously called "User Management".

**Currency Behavior:**
- Base currency configurable at `/admin` → Currency Settings tab (or `/admin/settings`)
- All monetary values across the app reflect the base currency via `useBaseCurrency()` hook
- `formatCurrency()` defaults to base currency; pages use the hook instead of hardcoded "USD"
- Exchange rates locked at transaction time (SO confirm / PO order) — historical values never recalculated

**Pricing & Costing Access:**

| Screen | Route | How to Access |
|--------|-------|---------------|
| Price Lists | `/price-lists` | Admin Console → Pricing & Costing → Price Lists card, or direct URL |
| Price List Detail | `/price-lists/:id` | Click on a price list row |
| New Price List | `/price-lists/new` | "New Price List" button on Price Lists page |
| COGS Report | `/reports` → COGS tab | Admin Console → Pricing & Costing → COGS Report card, or Reports → COGS tab |
| Margin Report | `/reports` → Margin tab | Admin Console → Pricing & Costing → Margin Report card, or Reports → Margin tab |
| Exchange Rates | `/admin/settings` | Admin Console → Currency Settings → Exchange Rates card |

**Key Pricing Concepts:**
- Price Lists: multiple tiers (Retail, Wholesale, VIP), each with own currency
- Default price list auto-applies on Sales Order creation
- `costAtTime` locked at order confirm — prevents margin drift
- MAC (Moving Average Cost): recalculated on each inbound receipt
- COGS: computed on outbound (dispatch/ship), stored in `inventory_valuation_log`
- Margin: Revenue − COGS, shown on SO detail and aggregate reports

---

### Phase 5 Details (Complete)
- **Currency Foundation**: `currencies` table (USD base, INR, EUR), `exchange_rates` table, currency on SO/PO, rate locked at confirmation/ordering
- **Costing Engine (MAC)**: Moving Average Cost on `inventory_items.avgCost`, `inventory_valuation_log` table, COGS on outbound, `totalCogs` on sales_orders
- **Pricing Engine**: `price_lists` + `price_list_items` tables, default price auto-fetch on SO create, `costAtTime` locked at confirm, margin display on SO detail, COGS + margin reports
- **Services Layer**: `currency.service.ts`, `costing.service.ts`, `pricing.service.ts` — extracted from routes for reuse
- **API Routes**: `/currencies`, `/exchange-rates`, `/convert`, `/price-lists/*`, `/reports/cogs`, `/reports/margin`, `/dashboard/financial` endpoints
- **Frontend**: `CurrencySelector` on SO/PO forms, price list CRUD pages (list/new/detail), margin summary on SO detail, COGS + Margin report tabs, financial KPI tiles + charts on dashboard
- **Financial Dashboard**: `GET /api/dashboard/financial` — totalInventoryValue, cogsThisMonth, avgMarginThisMonth, valueByWarehouse (bar chart), cogsTrend 30-day (line chart)
- **API Client**: `lib/api-client-react/src/pricing.ts` — 9 hand-written hooks (CRUD + default price lookup) with cache invalidation; types in `api.schemas.ts`
- **OpenAPI Spec**: Full pricing paths, report paths, financial dashboard schemas in `lib/api-spec/openapi.yaml`
- **Key Rule**: Never recalculate historical transactions — rate locked at transaction time; costAtTime locked at confirm

### Phase 4 Details
- Reports: stock value, stock velocity, supplier performance, low-stock alerts
- Print patterns: standardized across all print pages
- QA: D:\MyProjects\WMS\WMS\qa-test-plan.md,  D:\MyProjects\WMS\WMS\artifacts\wms-app\README-TESTS.md

---

## 13. Known Issues & Bug Fixes (Chronological)

| Date | Issue | Root Cause | Fix |
|------|-------|-----------|-----|
| 2026-05-05 | Picker empty after "Start Picking" | No picking tasks auto-created | Picker now shows orders in `picking` status, auto-creates tasks |
| 2026-05-06 | `useState` inside `.map()` crash | React hooks rule violation | Replaced with `lineLocations` state object keyed by line ID |
| 2026-05-06 | Picking complete deadlock | Pick endpoint auto-completed task; complete endpoint requires `in_progress` | Removed auto-complete from pick endpoint |
| 2026-05-06 | "Pick List" button shows after completion | Button visibility included `picking_complete`, `packed`, `shipped` | Restricted to `status === "picking"` only |
| 2026-05-06 | 404 on PO/Supplier navigation | `/wms/` prefix in `window.location.assign()` | Removed prefix, replaced with `setLocation()` |
| 2026-05-06 | Full page refresh on navigation | `window.location.assign()` causes browser reload | Replaced all with wouter's `setLocation()` |
| 2026-05-07 | Bins dropdown empty in PO receive | `binsTable` schema missing `isActive` column; `undefined` filtered out | Added column to schema, pushed migration, filter uses `!== false` |

---

## 14. Key Files Reference

| File | Purpose |
|------|---------|
| `artifacts/wms-app/src/App.tsx` | All frontend route definitions |
| `artifacts/wms-app/src/pages/picker.tsx` | Picker view (scan-to-pick, location selectors) |
| `artifacts/wms-app/src/pages/purchase-order-detail.tsx` | PO detail (receive stock, BinSelector) |
| `artifacts/wms-app/src/pages/sales-order-detail.tsx` | Sales order detail (workflow actions) |
| `artifacts/api-server/src/routes/picking.ts` | Picking task API endpoints |
| `artifacts/api-server/src/routes/purchasing.ts` | PO API endpoints |
| `artifacts/api-server/src/routes/orders.ts` | Sales order API endpoints |
| `artifacts/api-server/src/routes/locations.ts` | Warehouse/zone/bin API endpoints |
| `lib/db/src/schema/locations.ts` | Location schemas (added `isActive` to bins) |
| `lib/db/src/schema/orders.ts` | Sales order + picking schemas |
| `lib/db/src/schema/purchasing.ts` | PO + supplier schemas |
| `lib/db/src/schema/inventory.ts` | Inventory + movement schemas |
| `lib/db/src/schema/alerts.ts` | Alert settings + log schemas |
| `lib/api-client-react/src/picking.ts` | Custom picking hooks |
| `lib/api-client-react/src/pricing.ts` | Custom pricing hooks (9 hooks, cache invalidation) |
| `lib/db/src/schema/pricing.ts` | Price list + price list item schemas |
| `artifacts/api-server/src/routes/pricing.ts` | Price list CRUD endpoints |
| `artifacts/api-server/src/services/pricing.service.ts` | Default price lookup service |
| `artifacts/wms-app/src/pages/admin.tsx` | Admin Console (tabs: Users, Currency, Pricing & Costing) |
| `artifacts/wms-app/src/pages/dashboard.tsx` | Financial KPI tiles + charts |
| `lib/db/src/schema/currency.ts` | Currency + exchange rate schemas |
| `lib/db/src/schema/costing.ts` | Inventory valuation log schema |
| `artifacts/api-server/src/services/currency.service.ts` | Currency conversion service |
| `artifacts/api-server/src/services/costing.service.ts` | MAC costing + COGS service |
| `artifacts/api-server/src/routes/currency.ts` | Currency API endpoints |
| `artifacts/wms-app/src/components/currency-selector.tsx` | Reusable currency dropdown |
| `artifacts/wms-app/src/hooks/use-base-currency.ts` | Hook: fetches base currency, used by all pages for formatting |

---

---

## Phase 6: Automation + Intelligence (Completed)

### Features Implemented

#### 1. Smart Replenishment (`/smart-replenishment`)
- **Backend:** New `replenishment.ts` API route with endpoints:
  - `GET /replenishment/calculate/:productId` — Per-product reorder calculation using 30-day outbound demand, lead time, and safety stock.
  - `GET /replenishment/recommendations` — Lists all active products below their reorder point with severity (`critical` / `warning`), shortfall, suggested quantity, and predicted stockout date.
  - `GET /replenishment/generate-pr` — Generates purchase requisition suggestions grouped by supplier with line-level details.
  - `GET /replenishment/forecast/:productId` — Returns 30-day historical demand, 7-day moving average, and a 30-day forward forecast with confidence scores.
  - `GET /alerts/inventory-anomalies` — Detects negative inventory, zero-stock items, and unpicked orders stuck >24h.
  - `PUT /alerts/inventory-anomalies/:id/resolve` — Marks an anomaly alert as resolved.
- **Frontend Page:** `smart-replenishment.tsx`
  - Table view with filtering by severity (`critical` / `warning`) and search (product name / SKU).
  - Summary cards showing total recommendations, critical count, and warning count.
  - Actions column with "Create PO" button per recommendation.
  - Uses `@tanstack/react-query`, shadcn/ui `Table`, `Badge`, `Button`, `Card`, and `useBaseCurrency` hook.

#### 2. Smart Picking (`/smart-picking`)
- **Frontend Page:** `smart-picking.tsx`
  - Displays pick batch suggestions (batch picks, zone picks, single-item express picks).
  - Table with batch details: orders, items, estimated time, distance, zones, and status.
  - Route optimization panel with a visual path preview (A → B → C).
  - Summary metrics for pending picks, active batches, total orders, and estimated total distance.
  - Picking optimization tips card.
  - Fully interactive: clicking a batch highlights it and shows its optimized route.

#### 3. Demand Forecast (`/demand-forecast`)
- **Frontend Page:** `demand-forecast.tsx`
  - Product dropdown selector (fetches from `GET /api/products`).
  - Fetches forecast data from `GET /api/replenishment/forecast/:productId`.
  - Summary cards: 30-day average demand, suggested reorder point, suggested order quantity.
  - Historical demand bar chart (30 days, actual units per day).
  - 7-day moving average chart overlay.
  - Predicted demand bar chart (30 days forward) with confidence scores.
  - Simple CSS/DIV-based charts (no external chart library needed).
  - Legend and date labels for all chart sections.

#### 4. Navigation & Routes
- **App.tsx:** Registered three new protected routes:
  - `/smart-replenishment` → `SmartReplenishment`
  - `/smart-picking` → `SmartPicking`
  - `/demand-forecast` → `DemandForecast`
- **Layout (Sidebar):** New "Intelligence" section added below the main nav items with Lucide icons:
  - `BrainCircuit` for Smart Replenishment
  - `Navigation` for Smart Picking
  - `BarChart4` for Demand Forecast
- **Backend Routes:** `replenishment.ts` route imported and mounted in `routes/index.ts` after `pricingRouter`.

### Technical Notes
- All frontend pages follow the existing shadcn/ui + Tailwind CSS patterns (`bg-background`, `text-foreground`, etc.).
- Uses standard `fetch` with `credentials: "include"` for authenticated API calls.
- `useBaseCurrency` hook is used for currency formatting on the Smart Replenishment page.
- The new `replenishment.ts` backend route was cleaned to remove unused Drizzle imports (`count`, `asc`).

### Files Created / Modified
| Action | File |
|--------|------|
| Created | `artifacts/api-server/src/routes/replenishment.ts` |
| Modified | `artifacts/api-server/src/routes/index.ts` (import + mount route) |
| Created | `artifacts/wms-app/src/pages/smart-replenishment.tsx` |
| Created | `artifacts/wms-app/src/pages/smart-picking.tsx` |
| Created | `artifacts/wms-app/src/pages/demand-forecast.tsx` |
| Modified | `artifacts/wms-app/src/App.tsx` (new routes + imports) |
| Modified | `artifacts/wms-app/src/components/layout.tsx` (sidebar nav items) |
| Modified | `APPLICATION_CONTEXT.md` (this section) |

---

## Phase 6.1: Enterprise Intelligence — Engine Architecture (In Progress)

### New Backend Architecture

Routes are now thin controllers. Business logic lives in engines.

```
artifacts/api-server/src/
├── domain/           # Shared business types (Money, DateRange, etc.)
├── engines/
│   ├── replenishment/
│   │   ├── engine.ts           # Main orchestrator: runs full replenishment check
│   │   ├── demand-classifier.ts # Stable/Seasonal/Intermittent/Erratic/New per SKU
│   │   ├── safety-stock.ts     # SS = Z × √(LT × σD² + D² × σLT²)
│   │   ├── eoq.ts              # EOQ = √(2DS/H) with MOQ, carton/pallet rounding
│   │   ├── supplier-aware.ts   # Lead-time variance, fill-rate, reliability scoring
│   │   ├── anomaly-detector.ts # Negative stock, zero stock, stuck orders
│   │   └── index.ts
│   ├── slotting/
│   │   ├── engine.ts           # Bin scoring, velocity profiles, heatmap, co-pick
│   │   └── index.ts
│   ├── forecasting/
│   │   ├── engine.ts           # Seasonality, trend, Holt-Winters
│   │   └── index.ts
│   └── planning/
│       ├── engine.ts           # Inventory plans, distribution plans, procurement forecasts
│       └── index.ts
├── events/
│   ├── types.ts                # Domain event types + payloads
│   ├── bus.ts                  # In-process event bus (subscribe/emit)
│   ├── factory.ts              # createEvent() helper
│   └── index.ts
├── workers/
│   ├── queue.ts                # BullMQ queue definitions + scheduled jobs
│   ├── replenishment.worker.ts # Replenishment job processor
│   ├── alert.worker.ts         # Alert/anomaly job processor
│   ├── slotting.worker.ts      # Slotting optimization job processor
│   ├── forecasting.worker.ts   # Forecast update job processor
│   ├── planning.worker.ts      # Planning cycle job processor
│   └── index.ts
├── repositories/
│   ├── base.ts                 # Base repository class
│   ├── product.repository.ts   # Product data access
│   ├── inventory.repository.ts # Inventory + movement data access
│   ├── supplier.repository.ts  # Supplier + performance data access
│   ├── order.repository.ts     # Sales order data access
│   └── index.ts
├── schedulers/
│   └── index.ts                # BullMQ scheduler (replaces lib/scheduler.ts)
├── services/                   # Existing: currency, costing, pricing
├── routes/
│   ├── index.ts                # Route mounting (now includes enginesRouter)
│   ├── engines.ts              # NEW: Thin controllers for all engines
│   └── ... (existing routes, to be refactored)
├── lib/                        # Existing: logger, email, velocity-alert, scheduler
├── middlewares/                # Existing: auth, clerkProxy
├── app.ts                      # Unchanged
└── index.ts                    # Now imports workers + starts BullMQ schedulers
```

### New Database Schemas (`lib/db/src/schema/phase6.ts`)

| Table | Purpose |
|-------|---------|
| `replenishment_policies` | Per-product: demand type, service level, safety stock params, EOQ params |
| `supplier_performance` | Per-supplier: on-time rate, fill rate, lead time stats, reliability score |
| `inventory_targets` | Per product per warehouse: min/max/target stock, days of supply |
| `bin_attributes` | Per bin: capacity, weight limit, temp zone, hazmat, travel/access scores |
| `slotting_rules` | Configurable rules: conditions → actions for slotting |
| `velocity_profiles` | Per product per bin: picks 7/30/90 days, velocity class |
| `forecast_snapshots` | Per product per date: forecast outputs, model metadata |
| `domain_events` | Event log: type, payload, status, processing |
| `job_queue` | Background job tracking |
| `workflow_rules` | Automation rules: trigger event → action |
| `inventory_plans` | Per product per warehouse: projected stock, ATP, stockout risk |
| `distribution_plans` | Inter-warehouse transfer suggestions |
| `procurement_forecasts` | Per product per supplier: forecasted qty, container optimization |

### New API Routes (mounted at `/api/engines/*`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/engines/replenishment/run` | Run full replenishment check |
| GET | `/engines/replenishment/classify` | Classify all products by demand type |
| POST | `/engines/suppliers/performance` | Update all supplier performance scores |
| POST | `/engines/slotting/run` | Run slotting optimization |
| GET | `/engines/slotting/heatmap` | Get bin heatmap data |
| GET | `/engines/slotting/co-pick` | Co-pick proximity analysis |
| GET | `/engines/forecast/:productId` | Forecast for a product |
| POST | `/engines/forecast/update-all` | Batch update all forecasts |
| POST | `/engines/planning/run` | Run full planning cycle |
| GET | `/engines/planning/inventory` | Get inventory plans |
| GET | `/engines/planning/distribution` | Get distribution/transfer plans |

### Event Bus

- **In-process bus** (`events/bus.ts`): subscribe/emit pattern for synchronous event handling
- **BullMQ queues** (`workers/queue.ts`): 5 queues (replenishment, alerts, slotting, forecasting, planning)
- **Scheduled jobs**: daily replenishment (08:00), daily forecast (06:00), weekly slotting (Sun 02:00), monthly planning (1st 04:00)
- **Event types**: inventory.low_stock, order.shipped, po.received, anomaly.detected, etc.

### Dependencies Added

| Package | Purpose |
|---------|---------|
| `bullmq` | Background job queue |
| `ioredis` | Redis client for BullMQ |

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `REDIS_URL` | Redis connection for BullMQ | `redis://localhost:6379` |

### Key Design Decisions

1. **Routes are thin** — validate input → call engine → return response. No business logic in routes.
2. **Engines are testable** — pure functions + repository pattern, no Express dependencies.
3. **Event-driven** — routes emit events → workers process asynchronously.
4. **Repository pattern** — data access abstracted, engines call repositories not db directly.
5. **BullMQ over raw node-cron** — retry, dedup, monitoring, job tracking built-in.
6. **No Redis required for dev** — falls back to node-cron if Redis unavailable.

### Files Created / Modified

| Action | File |
|--------|------|
| Created | `artifacts/api-server/src/events/types.ts` |
| Created | `artifacts/api-server/src/events/bus.ts` |
| Created | `artifacts/api-server/src/events/factory.ts` |
| Created | `artifacts/api-server/src/events/index.ts` |
| Created | `artifacts/api-server/src/workers/queue.ts` |
| Created | `artifacts/api-server/src/workers/replenishment.worker.ts` |
| Created | `artifacts/api-server/src/workers/alert.worker.ts` |
| Created | `artifacts/api-server/src/workers/slotting.worker.ts` |
| Created | `artifacts/api-server/src/workers/forecasting.worker.ts` |
| Created | `artifacts/api-server/src/workers/planning.worker.ts` |
| Created | `artifacts/api-server/src/workers/index.ts` |
| Created | `artifacts/api-server/src/repositories/base.ts` |
| Created | `artifacts/api-server/src/repositories/product.repository.ts` |
| Created | `artifacts/api-server/src/repositories/inventory.repository.ts` |
| Created | `artifacts/api-server/src/repositories/supplier.repository.ts` |
| Created | `artifacts/api-server/src/repositories/order.repository.ts` |
| Created | `artifacts/api-server/src/repositories/index.ts` |
| Created | `artifacts/api-server/src/engines/replenishment/engine.ts` |
| Created | `artifacts/api-server/src/engines/replenishment/demand-classifier.ts` |
| Created | `artifacts/api-server/src/engines/replenishment/safety-stock.ts` |
| Created | `artifacts/api-server/src/engines/replenishment/eoq.ts` |
| Created | `artifacts/api-server/src/engines/replenishment/supplier-aware.ts` |
| Created | `artifacts/api-server/src/engines/replenishment/anomaly-detector.ts` |
| Created | `artifacts/api-server/src/engines/replenishment/index.ts` |
| Created | `artifacts/api-server/src/engines/slotting/engine.ts` |
| Created | `artifacts/api-server/src/engines/slotting/index.ts` |
| Created | `artifacts/api-server/src/engines/forecasting/engine.ts` |
| Created | `artifacts/api-server/src/engines/forecasting/index.ts` |
| Created | `artifacts/api-server/src/engines/planning/engine.ts` |
| Created | `artifacts/api-server/src/engines/planning/index.ts` |
| Created | `artifacts/api-server/src/schedulers/index.ts` |
| Created | `artifacts/api-server/src/domain/index.ts` |
| Created | `artifacts/api-server/src/routes/engines.ts` |
| Created | `lib/db/src/schema/phase6.ts` |
| Modified | `lib/db/src/schema/index.ts` (export phase6) |
| Modified | `artifacts/api-server/src/routes/index.ts` (mount engines) |
| Modified | `artifacts/api-server/src/index.ts` (workers + BullMQ schedulers) |
| Modified | `artifacts/api-server/package.json` (bullmq + ioredis) |
