import { pgTable, uuid, text, numeric, boolean, integer, date, timestamp, unique, index } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

// ── Price Lists ─────────────────────────────────────────────────────────────────

export const priceListsTable = pgTable(
  "price_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    currency: text("currency").notNull().default("USD"),
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("price_lists_default_idx").on(t.isDefault),
    index("price_lists_active_idx").on(t.isActive),
  ]
);

// ── Price List Items ─────────────────────────────────────────────────────────────

export const priceListItemsTable = pgTable(
  "price_list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    priceListId: uuid("price_list_id")
      .notNull()
      .references(() => priceListsTable.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "restrict" }),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    minQty: integer("min_qty").notNull().default(1),
    maxQty: integer("max_qty"),
    currency: text("currency").notNull().default("USD"),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("price_list_items_unique_tier").on(t.priceListId, t.productId, t.minQty),
    index("price_list_items_list_id_idx").on(t.priceListId),
    index("price_list_items_product_id_idx").on(t.productId),
  ]
);

// ── Types ────────────────────────────────────────────────────────────────────────

export type PriceList = typeof priceListsTable.$inferSelect;
export type PriceListItem = typeof priceListItemsTable.$inferSelect;
