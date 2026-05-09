import { pgTable, uuid, text, integer, numeric, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

// ── 1. Smart Replenishment: Reorder Point Engine ──────────────────────────────

export const reorderPointSettingsTable = pgTable("reorder_point_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" })
    .unique(),
  avgDailyDemand: numeric("avg_daily_demand", { precision: 10, scale: 4 }).notNull().default("0"),
  leadTimeDays: integer("lead_time_days").notNull().default(7), // calculated from actual supplier deliveries
  safetyStockDays: integer("safety_stock_days").notNull().default(7),
  reorderPoint: integer("reorder_point").notNull().default(0), // (avgDailyDemand * leadTimeDays) + (avgDailyDemand * safetyStockDays)
  suggestedOrderQty: integer("suggested_order_qty").notNull().default(0), // (leadTimeDays + safetyStockDays + coverageDays) * avgDailyDemand
  lastCalculatedAt: timestamp("last_calculated_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ReorderPointSetting = typeof reorderPointSettingsTable.$inferSelect;

// ── 2. Demand History ────────────────────────────────────────────────────────────

export const demandHistoryTable = pgTable("demand_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  dailyDemand: integer("daily_demand").notNull().default(0), // units consumed on this day (outbound)
  movingAvg7d: numeric("moving_avg_7d", { precision: 10, scale: 4 }), // 7-day moving average
  movingAvg30d: numeric("moving_avg_30d", { precision: 10, scale: 4 }), // 30-day moving average
  weightedDemand: numeric("weighted_demand", { precision: 10, scale: 4 }), // weighted: more recent days count more
  predictedDemand: numeric("predicted_demand", { precision: 10, scale: 4 }), // from simple forecasting
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DemandHistory = typeof demandHistoryTable.$inferSelect;

// ── 3. Replenishment Recommendations (pending purchase requisitions) ──────────

export const replenishmentStatusEnum = ["suggested", "pending", "ordered", "rejected"] as const;

export const replenishmentRecommendationsTable = pgTable("replenishment_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  currentStock: integer("current_stock").notNull().default(0),
  reorderPoint: integer("reorder_point").notNull().default(0),
  projectedStock: integer("projected_stock").notNull().default(0), // min(currentStock - demand, reorderPoint)
  suggestedQty: integer("suggested_qty").notNull().default(0),
  reason: text("reason").notNull().default("below_reorder_point"),
  status: text("status")
    .$type<(typeof replenishmentStatusEnum)[number]>()
    .notNull()
    .default("suggested"),
  predictedStockoutDate: date("predicted_stockout_date"), // based on current demand rate
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ReplenishmentRecommendation = typeof replenishmentRecommendationsTable.$inferSelect;

// ── 4. Alert Events (Anomaly Detection Log) ───────────────────────────────────

export const alertEventTypeEnum = [
  "sudden_stock_drop",
  "negative_inventory",
  "zero_stock",
  "delayed_order",
  "unpicked_order",
  "demand_spike",
  "data_error",
  "theft_suspected",
] as const;

export const alertEventSeverityEnum = ["low", "medium", "high", "critical"] as const;

export const alertEventsTable = pgTable("alert_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: text("event_type")
    .$type<(typeof alertEventTypeEnum)[number]>()
    .notNull(),
  severity: text("severity")
    .$type<(typeof alertEventSeverityEnum)[number]>()
    .notNull()
    .default("medium"),
  productId: uuid("product_id").references(() => productsTable.id, { onDelete: "cascade" }),
  referenceId: uuid("reference_id"), // could be orderId, movementId, etc.
  referenceType: text("reference_type"), // e.g. "sales_order", "inventory_movement"
  description: text("description").notNull(),
  details: text("details"), // JSON string for extensibility
  isRead: boolean("is_read").notNull().default(false),
  resolvedBy: text("resolved_by"), // user who resolved
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AlertEvent = typeof alertEventsTable.$inferSelect;
