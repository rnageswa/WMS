import { pgTable, uuid, text, integer, timestamp, unique, check } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { binsTable } from "./locations";

export const inventoryItemsTable = pgTable(
  "inventory_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "restrict" }),
    binId: uuid("bin_id")
      .notNull()
      .references(() => binsTable.id, { onDelete: "restrict" }),
    qtyOnHand: integer("qty_on_hand").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("inventory_product_bin_unique").on(t.productId, t.binId),
    check("qty_non_negative", sql`${t.qtyOnHand} >= 0`),
  ],
);

export const movementTypeEnum = ["adjustment", "inbound", "outbound"] as const;

export const inventoryMovementsTable = pgTable("inventory_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "restrict" }),
  binId: uuid("bin_id")
    .notNull()
    .references(() => binsTable.id, { onDelete: "restrict" }),
  movementType: text("movement_type")
    .$type<(typeof movementTypeEnum)[number]>()
    .notNull(),
  quantity: integer("quantity").notNull(),
  reasonCode: text("reason_code"),
  referenceId: uuid("reference_id"),
  referenceType: text("reference_type"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItemsTable).omit({
  id: true,
  updatedAt: true,
});

export const selectInventoryItemSchema = createSelectSchema(inventoryItemsTable);
export const selectInventoryMovementSchema = createSelectSchema(inventoryMovementsTable);

export const adjustmentSchema = z.object({
  productId: z.string().uuid(),
  binId: z.string().uuid(),
  newQty: z.number().int().min(0),
  reasonCode: z.string().min(1),
});

export type InventoryItem = typeof inventoryItemsTable.$inferSelect;
export type InventoryMovement = typeof inventoryMovementsTable.$inferSelect;
export type AdjustmentPayload = z.infer<typeof adjustmentSchema>;
