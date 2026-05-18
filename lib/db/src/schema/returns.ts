import { pgTable, uuid, text, integer, timestamp, date, index } from "drizzle-orm/pg-core";
import { productsTable } from "./products";
import { salesOrdersTable } from "./orders";

// ── RMA Status ──────────────────────────────────────────────────────────────────

export const rmaStatusEnum = [
  "requested",
  "approved",
  "received",
  "inspected",
  "restocked",
  "quarantined",
  "refunded",
  "rejected",
] as const;

export const rmaLineConditionEnum = [
  "new",
  "good",
  "fair",
  "damaged",
  "defective",
] as const;

export const rmaDispositionEnum = [
  "restock",
  "quarantine",
  "dispose",
  "return_to_supplier",
] as const;

// ── Return Authorizations (RMA) ─────────────────────────────────────────────────

export const returnAuthorizationsTable = pgTable(
  "return_authorizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rmaNumber: text("rma_number").notNull().unique(),
    orderId: uuid("order_id").references(() => salesOrdersTable.id, { onDelete: "set null" }),
    customerName: text("customer_name").notNull(),
    reason: text("reason"),
    status: text("status")
      .$type<(typeof rmaStatusEnum)[number]>()
      .notNull()
      .default("requested"),
    notes: text("notes"),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    inspectedAt: timestamp("inspected_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rma_order_id_idx").on(t.orderId)]
);

// ── RMA Lines ────────────────────────────────────────────────────────────────────

export const returnLinesTable = pgTable(
  "return_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rmaId: uuid("rma_id")
      .notNull()
      .references(() => returnAuthorizationsTable.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "restrict" }),
    qtyReturned: integer("qty_returned").notNull(),
    qtyReceived: integer("qty_received").notNull().default(0),
    condition: text("condition")
      .$type<(typeof rmaLineConditionEnum)[number]>()
      .notNull()
      .default("good"),
    disposition: text("disposition")
      .$type<(typeof rmaDispositionEnum)[number]>()
      .notNull()
      .default("quarantine"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("return_lines_rma_id_idx").on(t.rmaId)]
);

// ── Types ────────────────────────────────────────────────────────────────────────

export type ReturnAuthorization = typeof returnAuthorizationsTable.$inferSelect;
export type ReturnLine = typeof returnLinesTable.$inferSelect;
