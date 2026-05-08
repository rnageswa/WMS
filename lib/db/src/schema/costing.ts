import { pgTable, uuid, text, numeric, integer, timestamp, index } from "drizzle-orm/pg-core";
import { productsTable } from "./products";
import { inventoryMovementsTable } from "./inventory";

// ── Inventory Valuation Log ─────────────────────────────────────────────────────

export const inventoryValuationLogTable = pgTable(
  "inventory_valuation_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "restrict" }),
    movementId: uuid("movement_id").references(() => inventoryMovementsTable.id, { onDelete: "set null" }),
    qty: integer("qty").notNull(),
    unitCost: numeric("unit_cost", { precision: 12, scale: 4 }).notNull(),
    totalCost: numeric("total_cost", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("valuation_log_product_id_idx").on(t.productId),
    index("valuation_log_movement_id_idx").on(t.movementId),
    index("valuation_log_created_at_idx").on(t.createdAt),
  ]
);

// ── Types ────────────────────────────────────────────────────────────────────────

export type InventoryValuationLog = typeof inventoryValuationLogTable.$inferSelect;
