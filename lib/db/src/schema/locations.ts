import { pgTable, uuid, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const warehousesTable = pgTable("warehouses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const zonesTable = pgTable("zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehousesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const binsTable = pgTable(
  "bins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => zonesTable.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("bins_zone_code_unique").on(t.zoneId, t.code)],
);

export const insertWarehouseSchema = createInsertSchema(warehousesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateWarehouseSchema = insertWarehouseSchema.partial();

export const insertZoneSchema = createInsertSchema(zonesTable).omit({
  id: true,
  createdAt: true,
});
export const updateZoneSchema = insertZoneSchema.partial();

export const insertBinSchema = createInsertSchema(binsTable).omit({
  id: true,
  createdAt: true,
});
export const updateBinSchema = insertBinSchema.partial();

export const selectWarehouseSchema = createSelectSchema(warehousesTable);
export const selectZoneSchema = createSelectSchema(zonesTable);
export const selectBinSchema = createSelectSchema(binsTable);

export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type UpdateWarehouse = z.infer<typeof updateWarehouseSchema>;
export type Warehouse = typeof warehousesTable.$inferSelect;

export type InsertZone = z.infer<typeof insertZoneSchema>;
export type UpdateZone = z.infer<typeof updateZoneSchema>;
export type Zone = typeof zonesTable.$inferSelect;

export type InsertBin = z.infer<typeof insertBinSchema>;
export type UpdateBin = z.infer<typeof updateBinSchema>;
export type Bin = typeof binsTable.$inferSelect;
