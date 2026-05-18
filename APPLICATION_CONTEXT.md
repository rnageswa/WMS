# WareIQ — Warehouse Management System (WMS)
## Complete Application Context & Design Document

**Last Updated:** 2026-05-18
**Version:** MVP — Phase 1-6.1 Complete + Admin Console + Production Deployment + Sprint 1 Quick Wins + Sprint 2 Core Ops + Sprint 3 Picking Efficiency

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
| Deployment Target | Netlify (frontend) + Render (API) + Neon (DB) |

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
│   │   │   │   ├── label-print.tsx
│   │   │   │   ├── command-palette.tsx  # Ctrl+K command palette (cmdk)
│   │   │   │   └── scan-modal.tsx      # Mobile camera scan modal
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

### 4.11 Wave Picking
**Table:** `pick_waves`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| waveNumber | text | UNIQUE, format: WAVE-YYMMDD-XXX |
| status | text | enum: draft, ready, picking, completed, cancelled |
| totalOrders | integer | default: 0 |
| totalLines | integer | default: 0 |
| totalUnits | integer | default: 0 |
| pickedLines | integer | default: 0 |
| pickedUnits | integer | default: 0 |
| startedAt | timestamptz | nullable |
| completedAt | timestamptz | nullable |
| createdAt | timestamptz | auto |
| updatedAt | timestamptz | auto |

**Table:** `pick_wave_orders`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| waveId | UUID | FK → pick_waves, CASCADE |
| orderId | UUID | FK → sales_orders, CASCADE |
| taskId | UUID | FK → picking_tasks, SET NULL |
| sortOrder | integer | default: 0 |
| createdAt | timestamptz | auto |

**Table:** `pick_wave_zone_stops`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| waveId | UUID | FK → pick_waves, CASCADE |
| zoneId | UUID | FK → zones, CASCADE |
| stopOrder | integer | not null |
| linesCount | integer | default: 0 |
| unitsCount | integer | default: 0 |
| createdAt | timestamptz | auto |

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
| GET | `/locations/putaway-suggest` | Suggest optimal bin for inbound stock (productId, qty, warehouseId; scores by co-location, zone activity, capacity) |
| GET | `/locations/zone-activity` | Movement counts per zone across all warehouses |

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

### Wave Picking
| Method | Path | Description |
|--------|------|-------------|
| GET | `/picking/waves` | List waves (optional status filter) |
| GET | `/picking/waves/suggest` | Suggest orders available for wave creation (orders in `picking` status not already in an active wave) |
| POST | `/picking/waves` | Create wave from selected order IDs (auto-creates picking tasks, computes zone stops, generates optimized pick path) |
| GET | `/picking/waves/:id` | Wave detail with zone stops + pick lines grouped by zone |
| PUT | `/picking/waves/:id/start` | Start wave (ready → picking, starts all tasks/lines) |
| PUT | `/picking/waves/:id/pick-line` | Pick a line within a wave (qty, optional bin override) |
| PUT | `/picking/waves/:id/complete` | Complete wave (all lines must be picked, updates orders to picking_complete) |

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

### Cycle Count
| Method | Path | Description |
|--------|------|-------------|
| GET | `/cycle-counts/schedules` | List all active schedules |
| POST | `/cycle-counts/schedules` | Create schedule |
| PUT | `/cycle-counts/schedules/:id` | Update schedule |
| DELETE | `/cycle-counts/schedules/:id` | Soft delete schedule |
| POST | `/cycle-counts/schedules/:id/run` | Mark schedule as run now |
| GET | `/cycle-counts/history` | List count history (last 50) |
| POST | `/cycle-counts/history` | Record completed count |

### Activity
| Method | Path | Description |
|--------|------|-------------|
| GET | `/activity/recent` | Recent activity feed (union of movements, SO history, PO history) |

### Returns (RMA)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/returns` | List RMAs (optional status filter) |
| GET | `/returns/:id` | Get RMA detail with lines |
| POST | `/returns` | Create RMA with lines |
| PUT | `/returns/:id/status` | Update RMA status (with timestamp tracking) |
| PUT | `/returns/:id/lines/:lineId` | Update return line (qty received, condition, disposition) |
| DELETE | `/returns/:id` | Delete RMA (cascade lines) |

### Bulk Operations
| Method | Path | Description |
|--------|------|-------------|
| POST | `/inventory/adjust/bulk` | Bulk adjust inventory qty (array of product/bin/newQty) |
| POST | `/sales-orders/bulk-ship` | Bulk ship packed sales orders |

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
| `/cycle-count/schedule` | CycleCountSchedulePage | Count Schedule |
| `/reports` | ReportsPage | Reports |
| `/sales-orders` | SalesOrdersPage | Sales Orders |
| `/sales-orders/new` | SalesOrderNewPage | Sales Orders |
| `/sales-orders/:id` | SalesOrderDetailPage | Sales Orders |
| `/sales-orders/:id/pick-list` | SalesOrderPickListPage | Sales Orders |
| `/sales-orders/:id/packing-slip` | SalesOrderPackingSlipPage | Sales Orders |
| `/sales-orders/:id/shipping-label` | ShippingLabelPage | Sales Orders |
| `/picker` | PickerPage | Picking |
| `/smart-picking` | SmartPickingPage | Wave Picking (Plan + Execute) |
| `/returns` | ReturnsPage | Returns (RMA) |
| `/returns/new` | ReturnNewPage | Returns (RMA) |
| `/returns/:id` | ReturnDetailPage | Returns (RMA) |
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

### Root `.env` (local dev only — gitignored)

| Variable | Purpose | Safe in Frontend? |
|----------|---------|-------------------|
| `DATABASE_URL` | Neon PostgreSQL connection string | ❌ Backend only |
| `PGDATABASE` / `PGHOST` / `PGPORT` / `PGUSER` / `PGPASSWORD` | Neon connection params | ❌ Backend only |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key (pk_test_...) | ❌ Backend only |
| `CLERK_SECRET_KEY` | Clerk secret key (sk_test_...) | ❌ Backend only |
| `VITE_CLERK_PUBLISHABLE_KEY` | Vite-exposed Clerk key for frontend | ✅ Embedded in bundle |
| `RESEND_API_KEY` | Resend email API key | ❌ Backend only |
| `SESSION_SECRET` | Express session secret | ❌ Backend only |
| `REDIS_URL` | Redis connection for BullMQ | ❌ Backend only |
| `PORT` | Server port (5173) | — |
| `BASE_PATH` | Vite base path | — |

> **Rule:** Only `VITE_*` vars are embedded in the frontend bundle. Never prefix secrets with `VITE_`.
> `VITE_CLERK_PROXY_URL` removed — Clerk JS loads from CDN (`js.clerk.com`) in all environments.

### Netlify Env Vars (production)

| Variable | Value |
|----------|-------|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...` (production Clerk key) |
| `VITE_API_BASE_URL` | `https://wareiq-api.onrender.com` |

### Render Env Vars (production)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon connection string |
| `CLERK_PUBLISHABLE_KEY` | `pk_live_...` |
| `CLERK_SECRET_KEY` | `sk_live_...` |
| `RESEND_API_KEY` | Resend production key |
| `SESSION_SECRET` | Random secret |
| `REDIS_URL` | Upstash Redis URL |
| `NODE_ENV` | `production` |

---

## 10.5 Production Deployment Architecture

```
Frontend:  wareiq.netlify.app     → Netlify (static SPA)
API:       wareiq-api.onrender.com → Render (Express + BullMQ workers)
DB:        Neon Postgres           → Neon (serverless PostgreSQL)
Auth:      Clerk                   → Clerk SaaS (JWT session cookies)
Email:     Resend                  → Resend SaaS
Cache/Queue: Upstash Redis         → Redis (BullMQ job queues)
```

### Netlify Config (`artifacts/wms-app/netlify.toml`)
- Build: `pnpm build` from `artifacts/wms-app`
- Publish: `dist/public`
- Redirect: `/api/*` → `https://wareiq-api.onrender.com/api/:splat` (proxy)
- Redirect: `/*` → `/index.html` (SPA routing)

### Clerk Auth Flow (Production)
- Frontend loads Clerk JS from `js.clerk.com` CDN (no proxy)
- Browser talks directly to Clerk FAPI for auth
- API server uses `@clerk/express` middleware for server-side session validation
- Session cookie sent with `credentials: "include"` on all API calls

### Security Notes
- `.env` and `.env.*` are gitignored — never commit secrets
- `CLERK_SECRET_KEY` was exposed in git history (commits `451f099`, `98f0177`, `2304648`) — history rewritten with `git-filter-repo`, keys must be rotated
- Only `VITE_CLERK_PUBLISHABLE_KEY` is embedded in frontend bundle
- All other secrets (DB, Resend, Clerk secret) are backend-only

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
| 2026-05-16 | Clerk JS 404/504 on Netlify | `clerkProxyUrl=undefined` made Clerk load JS from `/api/__clerk/...` on the deployed domain; Netlify proxied to Render → 404/504. Also `VITE_CLERK_PROXY_URL` was set in Netlify env vars. | Set `clerkProxyUrl=""` in production → Clerk loads from `js.clerk.com` CDN. Removed `VITE_CLERK_PROXY_URL` from Netlify env vars. |
| 2026-05-16 | Secrets exposed in git history | `.env` with `CLERK_SECRET_KEY`, `DATABASE_URL`, `RESEND_API_KEY`, `SESSION_SECRET` was committed in 3 commits. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` also embedded `CLERK_SECRET_KEY` in frontend bundle. | Rewrote git history with `git-filter-repo` to remove `.env`/`.env.newdb`. Added `.env`/`.env.*` to `.gitignore`. Rotated all keys required. |
| 2026-05-16 | `VITE_CLERK_PUBLISHABLE_KEY` had secret appended | Netlify env var value was the full `.env` line including `CLERK_SECRET_KEY=sk_test_...` — embedded in frontend bundle. | Fixed Netlify env var to contain only the publishable key. |
| 2026-05-16 | Clerk proxy middleware 501 on Render | `clerkProxyMiddleware` on API server proxied token requests to Clerk FAPI but got 501. Replit-specific hack not needed in production. | Removed `clerkProxyMiddleware` from `app.ts`. Clerk works directly from browser via CDN. |
| 2026-05-16 | Dashboard `toFixed` crash | `finData.avgMarginThisMonth` was `undefined` when API returned no financial data. `undefined.toFixed(1)` throws TypeError. | Added `?? 0` guard: `(finData.avgMarginThisMonth ?? 0).toFixed(1)`. |
| 2026-05-17 | Clerk JS still loading from `/api/__clerk/...` in dev | `clerkProxyUrl` fell back to `undefined` when `VITE_CLERK_PROXY_URL` not set. Clerk SDK treats `undefined` as "use current origin". Vite proxy forwarded to API server → 401. | Simplified to `clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL || ""` — always empty string unless explicitly set. Clerk loads from CDN in all environments. |
| 2026-05-17 | All API calls 500 in dev | `clerkMiddleware` from `@clerk/express` requires `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` env vars. Root `.env` only had `VITE_CLERK_PUBLISHABLE_KEY` (Vite-prefixed, not loaded by Node). | Added `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to root `.env` (backend-only, no `VITE_` prefix). |
| 2026-05-17 | `scan.tsx` runtime: `Cannot access 'data' before initialization` | `useEffect` referencing `data` was placed before `useScanLookup` hook declaration. | Moved `useEffect` after `useScanLookup` hook declaration. |
| 2026-05-18 | Waves API 500 on Netlify | `pick_waves`, `pick_wave_orders`, `pick_wave_zone_stops` tables not pushed to Neon DB. | Ran `drizzle-kit push` to create tables. |
| 2026-05-18 | `waves.ts` TS errors: `inArray` type mismatch | `.filter(Boolean)` on nullable `taskId` array returns `(string | null)[]` — TS can't narrow. | Changed to `.filter((t): t is string => !!t)` for proper type guard. |
| 2026-05-18 | `waves.ts` schema not exported | `waves.ts` schema file created but not re-exported from `schema/index.ts`. | Added `export * from "./waves"` to `schema/index.ts`. |

---

## 14. Key Files Reference

| File | Purpose |
|------|---------|
| `artifacts/wms-app/src/App.tsx` | All frontend route definitions |
| `artifacts/wms-app/src/pages/picker.tsx` | Picker view (scan-to-pick, location selectors) |
| `artifacts/wms-app/src/pages/purchase-order-detail.tsx` | PO detail (receive stock, BinSelector) |
| `artifacts/wms-app/src/pages/sales-order-detail.tsx` | Sales order detail (workflow actions) |
| `artifacts/api-server/src/routes/picking.ts` | Picking task API endpoints |
| `artifacts/api-server/src/routes/waves.ts` | Wave picking API endpoints |
| `artifacts/api-server/src/routes/purchasing.ts` | PO API endpoints |
| `artifacts/api-server/src/routes/orders.ts` | Sales order API endpoints |
| `artifacts/api-server/src/routes/locations.ts` | Warehouse/zone/bin API endpoints |
| `lib/db/src/schema/locations.ts` | Location schemas (added `isActive` to bins) |
| `lib/db/src/schema/orders.ts` | Sales order + picking schemas |
| `lib/db/src/schema/purchasing.ts` | PO + supplier schemas |
| `lib/db/src/schema/waves.ts` | Wave picking schemas (pick_waves, pick_wave_orders, pick_wave_zone_stops) |
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
| `artifacts/wms-app/netlify.toml` | Netlify build config + redirect rules |
| `artifacts/wms-app/src/App.tsx` | Clerk proxy URL config (`clerkProxyUrl=""` for CDN loading) |
| `artifacts/api-server/src/app.ts` | Express app — clerkMiddleware (no proxy middleware) |
| `.env` | Local dev secrets (gitignored) |
| `.gitignore` | Includes `.env`, `.env.*` |

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

#### 2. Smart Picking + Wave Picking (`/smart-picking`)
- **Unified flow:** Smart Picking (planning) + Wave Picking (execution) merged into a single page with 3 views:
  - **Plan View:** Real-time order suggestions from `GET /api/picking/waves/suggest`, auto-grouped by zone proximity. Each zone batch shows orders, line counts, zone badges. "Create Wave" button per batch or select individual orders. Active waves summary with progress bars.
  - **Waves View:** Full wave list with status, progress, Start/Continue actions.
  - **Pick View:** Zone-by-zone picking with scan-to-pick (barcode/SKU), zone navigation, stats (total lines, units, picked, remaining), Complete Wave action.
- **Backend:** 7 API endpoints: list waves, suggest orders, create wave, wave detail, start wave, pick line, complete wave.
- **DB Tables:** `pick_waves`, `pick_wave_orders`, `pick_wave_zone_stops` (with zone-stop optimization).
- **Route:** `/smart-picking` (Intelligence section, Layers icon). Previously separate `/wave-picking` route removed.

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

## Quick Wins (2026-05-17)

### Collapsible Sidebar for Mobile

**Problem:** Sidebar always visible at `w-56`, consuming precious screen real estate on mobile devices.

**Solution:** Sidebar is now collapsible on mobile (< `md` breakpoint):
- **Mobile:** Hidden by default (`-translate-x-full`). Hamburger `Menu` button in a mobile header bar toggles sidebar as an overlay with slide-in animation. Dark backdrop (`bg-black/40`) closes sidebar on tap. `X` button inside sidebar header also closes. Nav item click auto-closes sidebar.
- **Desktop (≥ md):** Sidebar always visible, unchanged behavior.
- **Animation:** `transition-transform duration-200 ease-in-out`

**Files Modified:** `artifacts/wms-app/src/components/layout.tsx`

### Cycle Count Schedule Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/cycle-counts/schedules` | List all active schedules |
| POST | `/cycle-counts/schedules` | Create schedule |
| PUT | `/cycle-counts/schedules/:id` | Update schedule |
| DELETE | `/cycle-counts/schedules/:id` | Soft delete schedule |
| POST | `/cycle-counts/schedules/:id/run` | Mark schedule as run now |
| GET | `/cycle-counts/history` | List count history (last 50) |
| POST | `/cycle-counts/history` | Record completed count |

**Frontend Pages:**
| Route | Page | Description |
|-------|------|-------------|
| `/cycle-count` | CycleCountPage | Main cycle count page |
| `/cycle-count/schedule` | CycleCountSchedulePage | Schedule management |

**Files:** `artifacts/api-server/src/routes/cycle-count.ts`, `artifacts/wms-app/src/pages/cycle-count-schedule.tsx`

---

## Sprint 1 — Quick Wins (2026-05-17) ✅ COMPLETE

### A1: Print-Friendly Stylesheets

**Problem:** Detail pages (SO, PO, pick list) look bad when printed via browser Ctrl+P.

**Solution:** Added `@media print` CSS rules to `artifacts/wms-app/src/index.css`:
- Hides `.no-print`, `aside`, `nav`, `header`, `button`, dialogs, popovers
- Resets body/table layout for print
- `@page { margin: 12mm 14mm; size: A4; }`
- Shows URLs after external links

**Files Modified:** `artifacts/wms-app/src/index.css`

### A2: Export to Excel (XLSX)

**Problem:** Only CSV export available. Users need Excel for reports.

**Solution:** Added `xlsx` (SheetJS) package. Created reusable `exportToExcel()` utility. Added "Export Excel" buttons on:
- Reports page (inventory report + stock velocity)
- Inventory page
- Sales Orders page
- Purchase Orders page

**Files Created:** `artifacts/wms-app/src/lib/export-excel.ts`
**Files Modified:** `reports.tsx`, `inventory.tsx`, `sales-orders.tsx`, `purchase-orders.tsx`

### A3: Dashboard Date Range Picker

**Problem:** Dashboard KPIs show fixed periods only. No way to customize date range.

**Solution:** Added date range picker to Financial Overview card header:
- 5 presets: 7d, 30d, 90d, This Month, Last Month
- Custom range via Calendar popover
- Dynamic KPI labels: `COGS (${rangeLabel})`, `Avg Margin (${rangeLabel})`
- Dynamic chart title: `COGS Trend ({trendDays} Days)`
- API accepts `startDate`, `endDate`, `trendDays` query params

**Files Modified:** `artifacts/wms-app/src/pages/dashboard.tsx`, `artifacts/api-server/src/routes/inventory.ts`

### A5: Mobile Camera Scan Modal

**Problem:** Current scan page may not work well on all mobile cameras.

**Solution:** Created reusable `ScanModal` component:
- Uses BarcodeDetector API (Chrome/Edge)
- Mobile-first: bottom sheet on mobile (`items-end` + `rounded-t-2xl`), centered dialog on desktop
- Reticle overlay with corner markers
- Status badge (scanning/error)
- Last scanned result with success flash animation
- Escape key to close, state reset on open
- Embedded in picker, receiving, and cycle count pages

**Files Created:** `artifacts/wms-app/src/components/scan-modal.tsx`
**Files Modified:** `picker.tsx`, `receiving.tsx`, `cycle-count.tsx`

---

## Phase 6.1: Enterprise Intelligence — Engine Architecture 

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

---

## Sprint 2 — Core Ops (2026-05-18) ✅ COMPLETE

### A4: Recent Activity Feed

**Problem:** No visibility into what's happening across the warehouse right now.

**Solution:** New `GET /api/activity/recent` endpoint that unions inventory movements, sales order history, and PO status history into a single activity stream. Dashboard card with:
- Color-coded icons per event type (inbound/outbound/adjustment/shipped/delivered/etc.)
- Auto-refresh every 30 seconds with pulsing green dot indicator
- Timestamp with `formatDistanceToNow`

**Files Created:** `artifacts/api-server/src/routes/activity.ts`
**Files Modified:** `artifacts/api-server/src/routes/index.ts`, `artifacts/wms-app/src/pages/dashboard.tsx`

### B6: Returns Processing (RMA)

**Problem:** No reverse logistics flow. Customer returns handled outside the system.

**Solution:** Full RMA lifecycle:
- **DB Tables:** `return_authorizations` (RMA header) + `return_lines` (line items with condition/disposition)
- **Status Flow:** `requested → approved → received → inspected → restocked/quarantined/refunded/rejected`
- **API Routes:** Full CRUD + status transitions + line-level updates (qty received, condition, disposition)
- **Frontend Pages:**
  - `/returns` — List view with status filter, search, delete draft RMAs
  - `/returns/new` — Create RMA with customer, reason, multi-line product selection
  - `/returns/:id` — Detail view with status workflow, progress bar, line-level inspection (condition/disposition dropdowns)
- **Integration:** "Initiate Return" button on sales order detail (shipped/delivered orders)
- **Navigation:** Sidebar → "Returns (RMA)" with RotateCcw icon

**Files Created:** `lib/db/src/schema/returns.ts`, `artifacts/api-server/src/routes/returns.ts`, `artifacts/wms-app/src/pages/returns.tsx`, `return-new.tsx`, `return-detail.tsx`
**Files Modified:** `lib/db/src/schema/index.ts`, `artifacts/api-server/src/routes/index.ts`, `artifacts/wms-app/src/App.tsx`, `layout.tsx`, `sales-order-detail.tsx`

### B1: Bulk Operations

**Problem:** No way to select multiple items for batch actions.

**Solution:** Checkbox selection + floating action bar on list pages:
- **Inventory:** Checkbox per row → "Bulk Adjust to 0" with reason code confirmation dialog. New `POST /api/inventory/adjust/bulk` endpoint.
- **Sales Orders:** Checkbox per row → "Bulk Ship" for packed orders. New `POST /api/sales-orders/bulk-ship` endpoint.
- **Purchase Orders:** Already had bulk cancel/delete (pre-existing from earlier work).
- **UI Pattern:** Fixed bottom bar with selection count, action buttons, clear selection. Orange highlight on selected rows.

**Files Modified:** `artifacts/wms-app/src/pages/inventory.tsx`, `sales-orders.tsx`, `artifacts/api-server/src/routes/inventory.ts`, `orders.ts`

---

## Sprint 3 — Picking Efficiency (2026-05-18) ✅ COMPLETE

### B3: Wave Picking (Smart Picking + Wave Execution)

**Problem:** Pickers fulfill orders one at a time, traveling back-and-forth across zones. No batching or route optimization. Supervisors had no planning tool.

**Solution:** Merged smart-picking (planning) and wave-picking (execution) into a single `/smart-picking` page:
- **Backend:**
  - New `pick_waves`, `pick_wave_orders`, `pick_wave_zone_stops` tables
  - `GET /api/picking/waves/suggest` — finds orders in `picking` status not already in an active wave, with zone distribution per order
  - `POST /api/picking/waves` — creates wave from order IDs: auto-creates picking tasks/lines, computes zone stops sorted by zone name, assigns best bin per line (highest stock)
  - `GET /api/picking/waves/:id` — wave detail with zone stops + pick lines grouped by zone for optimized path
  - `PUT /api/picking/waves/:id/start` — transitions wave + all tasks/lines to picking
  - `PUT /api/picking/waves/:id/pick-line` — pick a line (qty, bin override), auto-updates wave progress
  - `PUT /api/picking/waves/:id/complete` — validates all lines picked, completes tasks, advances orders to `picking_complete`
- **Frontend Page:** `/smart-picking` (3 views in one):
  - **Plan View:** Real suggestions grouped by zone proximity, checkbox selection, "Create Wave" per batch, active waves summary
  - **Waves View:** Full wave list with status, progress bars, Start/Continue actions
  - **Pick View:** Zone-by-zone picking with scan-to-pick, zone navigation, stats, Complete Wave
- **Files Created:** `lib/db/src/schema/waves.ts`, `artifacts/api-server/src/routes/waves.ts`, `artifacts/wms-app/src/pages/wave-picking.tsx` (now unused)
- **Files Modified:** `lib/db/src/schema/index.ts`, `artifacts/api-server/src/routes/index.ts`, `artifacts/wms-app/src/App.tsx`, `layout.tsx`, `smart-picking.tsx` (merged wave-picking logic)

### B4: Bin Putaway Suggestions

**Problem:** Receiving clerks manually choose bins for inbound stock — slow, suboptimal placement.

**Solution:** Smart bin scoring for inbound stock:
- **Backend:** `GET /api/locations/putaway-suggest?productId=&qty=&warehouseId=`
  - Scores all active bins by: co-location bonus (+100 if same product already there), zone activity (+1-50), capacity sweet spot (+5 for 1-5 products), empty bin penalty (-20), preferred warehouse (+10)
  - Returns top 3 suggestions with scores and human-readable reasons
- **Frontend:** Receiving page shows suggestion card with "Accept" (auto-fills bin) / "Override" (manual selection) options
- **Files Modified:** `artifacts/api-server/src/routes/locations.ts`, `artifacts/wms-app/src/pages/receiving.tsx`

### B2: Command Palette

**Problem:** Power users navigate slowly through sidebar menus. No keyboard-driven navigation.

**Solution:** `Ctrl+K` command palette using `cmdk` library:
- Full-text search across all nav items (labels, categories, keywords, hrefs)
- Recent pages (localStorage, max 5) shown at top when no search query
- Grouped by category with keyboard navigation (↑↓ Enter Esc)
- Trigger button in header area with `Ctrl+K` badge
- Mobile-responsive: trigger text hidden on small screens,kbd badge always visible
- **Files Created:** `artifacts/wms-app/src/components/command-palette.tsx`
- **Files Modified:** `artifacts/wms-app/src/components/layout.tsx` (integrated trigger in header)
