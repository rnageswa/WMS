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

## Database Schema

- `warehouses(id, name, address, is_active, created_at, updated_at)`
- `zones(id, warehouse_id, name, code, created_at)`
- `bins(id, zone_id, code, name, created_at)` — unique(zone_id, code)
- `products(id, sku_code, name, description, category, barcode, unit_of_measure, unit_price, reorder_threshold, is_active, created_at, updated_at)`
- `inventory_items(id, product_id, bin_id, qty_on_hand, updated_at)`
- `inventory_movements(id, product_id, bin_id, movement_type, quantity, reason_code, reference_id, reference_type, created_by, created_at)`

## API Routes

All routes prefixed `/api`:
- `GET/POST /products` · `GET/PATCH/DELETE /products/:id`
- `GET/POST /warehouses` · `GET/PATCH /warehouses/:id`
- `GET/POST /warehouses/:id/zones` · `GET/POST /zones/:id/bins`
- `GET /inventory` · `POST /inventory/adjust`
- `GET /movements`
- `GET /dashboard/summary`

## Important Notes

- Orval config: `mode: "single"`, `target: "generated/api"`, no `schemas` key — do NOT revert
- DB schema has no `code` column on `warehouses` (only on zones/bins)
- API server imports Zod schemas from `@workspace/api-zod`, DB tables from `@workspace/db/schema`
- Frontend imports hooks from `@workspace/api-client-react`
- Generated hooks return `T` directly (not wrapped in `.data`)
- `zod` must be in `@workspace/api-server` dependencies (it's used in `inventory.ts`)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
