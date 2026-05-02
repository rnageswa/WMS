import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  index,
} from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const poStatusEnum = ["draft", "ordered", "partially_received", "received", "cancelled"] as const;
export const poLineStatusEnum = ["pending", "partially_received", "received"] as const;

// ── Suppliers ──────────────────────────────────────────────────────────────────

export const suppliersTable = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  leadTimeDays: integer("lead_time_days"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Purchase Orders ────────────────────────────────────────────────────────────

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  poNumber: text("po_number").notNull().unique(),
  supplierId: uuid("supplier_id").references(() => suppliersTable.id, { onDelete: "set null" }),
  supplierName: text("supplier_name").notNull(),
  status: text("status")
    .$type<(typeof poStatusEnum)[number]>()
    .notNull()
    .default("draft"),
  notes: text("notes"),
  expectedDeliveryDate: date("expected_delivery_date"),
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

// ── PO Templates ───────────────────────────────────────────────────────────────

export const poTemplatesTable = pgTable("po_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  supplierId: uuid("supplier_id").references(() => suppliersTable.id, { onDelete: "set null" }),
  supplierName: text("supplier_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const poTemplateLinesTable = pgTable(
  "po_template_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => poTemplatesTable.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "restrict" }),
    defaultQty: integer("default_qty").notNull().default(1),
    defaultUnitCost: numeric("default_unit_cost", { precision: 12, scale: 4 }),
  },
  (t) => [index("po_template_lines_template_id_idx").on(t.templateId)]
);

// ── PO Status History ──────────────────────────────────────────────────────────

export const poHistoryEventEnum = [
  "created",
  "ordered",
  "partially_received",
  "received",
  "cancelled",
  "duplicated_from",
  "stock_received",
] as const;

export const poStatusHistoryTable = pgTable(
  "po_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poId: uuid("po_id")
      .notNull()
      .references(() => purchaseOrdersTable.id, { onDelete: "cascade" }),
    event: text("event")
      .$type<(typeof poHistoryEventEnum)[number]>()
      .notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("po_status_history_po_id_idx").on(t.poId)]
);

export type Supplier = typeof suppliersTable.$inferSelect;
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
export type PurchaseOrderLine = typeof purchaseOrderLinesTable.$inferSelect;
export type PoTemplate = typeof poTemplatesTable.$inferSelect;
export type PoTemplateLine = typeof poTemplateLinesTable.$inferSelect;
export type PoStatusHistory = typeof poStatusHistoryTable.$inferSelect;
