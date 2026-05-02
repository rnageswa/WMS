import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const poStatusEnum = ["draft", "ordered", "partially_received", "received", "cancelled"] as const;
export const poLineStatusEnum = ["pending", "partially_received", "received"] as const;

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  poNumber: text("po_number").notNull().unique(),
  supplierName: text("supplier_name").notNull(),
  status: text("status")
    .$type<(typeof poStatusEnum)[number]>()
    .notNull()
    .default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseOrderLinesTable = pgTable(
  "purchase_order_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poId: uuid("po_id")
      .notNull()
      .references(() => purchaseOrdersTable.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "restrict" }),
    qtyOrdered: integer("qty_ordered").notNull(),
    qtyReceived: integer("qty_received").notNull().default(0),
    unitCost: numeric("unit_cost", { precision: 12, scale: 4 }),
    status: text("status")
      .$type<(typeof poLineStatusEnum)[number]>()
      .notNull()
      .default("pending"),
  },
  (t) => [index("po_lines_po_id_idx").on(t.poId)],
);

export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
export type PurchaseOrderLine = typeof purchaseOrderLinesTable.$inferSelect;
