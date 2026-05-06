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

// ── Sales Order Status ───────────────────────────────────────────────────────────

export const soStatusEnum = [
  "draft",
  "confirmed",
  "picking",
  "picking_complete",
  "packed",
  "shipped",
  "delivered",
  "cancelled"
] as const;

export const soLineStatusEnum = [
  "pending",
  "picking",
  "picked",
  "packed",
  "shipped",
  "fulfilled"
] as const;

// ── Sales Orders ─────────────────────────────────────────────────────────────────

export const salesOrdersTable = pgTable("sales_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerId: uuid("customer_id"), // Future: link to customers table
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  shippingAddress: text("shipping_address"),
  status: text("status")
    .$type<(typeof soStatusEnum)[number]>()
    .notNull()
    .default("draft"),
  notes: text("notes"),
  expectedShipDate: date("expected_ship_date"),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Sales Order Lines ────────────────────────────────────────────────────────────

export const salesOrderLinesTable = pgTable(
  "sales_order_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => salesOrdersTable.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "restrict" }),
    qtyOrdered: integer("qty_ordered").notNull(),
    qtyPicked: integer("qty_picked").notNull().default(0),
    qtyPacked: integer("qty_packed").notNull().default(0),
    qtyShipped: integer("qty_shipped").notNull().default(0),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
    status: text("status")
      .$type<(typeof soLineStatusEnum)[number]>()
      .notNull()
      .default("pending"),
  },
  (t) => [index("so_lines_order_id_idx").on(t.orderId)]
);

// ── Sales Order Status History ──────────────────────────────────────────────────

export const soHistoryEventEnum = [
  "created",
  "confirmed",
  "picking_started",
  "picking_complete",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const salesOrderHistoryTable = pgTable(
  "sales_order_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => salesOrdersTable.id, { onDelete: "cascade" }),
    event: text("event")
      .$type<(typeof soHistoryEventEnum)[number]>()
      .notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("so_history_order_id_idx").on(t.orderId)]
);

// ── Picking Tasks ────────────────────────────────────────────────────────────────

export const pickingTasksTable = pgTable("picking_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => salesOrdersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed
  assignedTo: text("assigned_to"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pickingLinesTable = pgTable(
  "picking_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => pickingTasksTable.id, { onDelete: "cascade" }),
    orderLineId: uuid("order_line_id")
      .notNull()
      .references(() => salesOrderLinesTable.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "restrict" }),
    binId: uuid("bin_id"), // Where to pick from
    qtyToPick: integer("qty_to_pick").notNull(),
    qtyPicked: integer("qty_picked").notNull().default(0),
    status: text("status").notNull().default("pending"), // pending, picked, short
    pickedAt: timestamp("picked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("picking_lines_task_id_idx").on(t.taskId)]
);

// ── Shipments ───────────────────────────────────────────────────────────────────

export const shipmentsTable = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => salesOrdersTable.id, { onDelete: "set null" }),
  trackingNumber: text("tracking_number"),
  carrier: text("carrier"),
  shippedAt: timestamp("shipped_at", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Types ────────────────────────────────────────────────────────────────────────

export type SalesOrder = typeof salesOrdersTable.$inferSelect;
export type SalesOrderLine = typeof salesOrderLinesTable.$inferSelect;
export type SalesOrderHistory = typeof salesOrderHistoryTable.$inferSelect;
export type PickingTask = typeof pickingTasksTable.$inferSelect;
export type PickingLine = typeof pickingLinesTable.$inferSelect;
export type Shipment = typeof shipmentsTable.$inferSelect;