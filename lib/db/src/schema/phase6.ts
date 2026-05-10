// ── Phase 6: Enterprise Intelligence Schemas ────────────────────────────────────

import { pgTable, uuid, text, integer, numeric, boolean, timestamp, date, unique } from "drizzle-orm/pg-core";
import { productsTable } from "./products";
import { suppliersTable } from "./purchasing";
import { warehousesTable } from "./locations";
import { binsTable } from "./locations";
import { zonesTable } from "./locations";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. REPLENISHMENT POLICIES
// ═══════════════════════════════════════════════════════════════════════════════

export const demandClassificationEnum = ["stable", "seasonal", "intermittent", "erratic", "new_item"] as const;

export const replenishmentPoliciesTable = pgTable("replenishment_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" })
    .unique(),
  warehouseId: uuid("warehouse_id").references(() => warehousesTable.id, { onDelete: "cascade" }),

  // Demand classification
  demandType: text("demand_type")
    .$type<(typeof demandClassificationEnum)[number]>()
    .notNull()
    .default("stable"),

  // Service level (e.g., 95% = 1.645 Z-score)
  serviceLevel: numeric("service_level", { precision: 5, scale: 4 }).notNull().default("0.9500"),
  zScore: numeric("z_score", { precision: 5, scale: 4 }).notNull().default("1.6450"),

  // Demand variability
  avgDailyDemand: numeric("avg_daily_demand", { precision: 12, scale: 4 }).notNull().default("0"),
  demandStdDev: numeric("demand_std_dev", { precision: 12, scale: 4 }).notNull().default("0"),
  demandVolatility: numeric("demand_volatility", { precision: 8, scale: 4 }), // CV = stddev/mean

  // Lead time
  avgLeadTimeDays: numeric("avg_lead_time_days", { precision: 8, scale: 2 }).notNull().default("7"),
  leadTimeStdDev: numeric("lead_time_std_dev", { precision: 8, scale: 2 }).notNull().default("0"),

  // Safety stock (calculated: Z × √(LT × σD² + D² × σLT²))
  safetyStock: integer("safety_stock").notNull().default(0),

  // EOQ parameters
  orderingCost: numeric("ordering_cost", { precision: 10, scale: 2 }).notNull().default("50.00"), // per order
  carryingCostPercent: numeric("carrying_cost_percent", { precision: 6, scale: 4 }).notNull().default("0.2500"), // 25% annually
  unitCost: numeric("unit_cost", { precision: 12, scale: 4 }),
  eoq: integer("eoq"),

  // Rounding constraints
  moq: integer("moq"), // minimum order quantity
  cartonQty: integer("carton_qty"), // units per carton
  palletQty: integer("pallet_qty"), // units per pallet

  // Reorder point
  reorderPoint: integer("reorder_point").notNull().default(0),
  reorderQty: integer("reorder_qty").notNull().default(0),

  // Forecast metadata
  lastForecastDate: date("last_forecast_date"),
  nextReviewDate: date("next_review_date"),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ReplenishmentPolicy = typeof replenishmentPoliciesTable.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SUPPLIER PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════════

export const supplierPerformanceTable = pgTable("supplier_performance", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliersTable.id, { onDelete: "cascade" })
    .unique(),

  // Delivery performance
  totalDeliveries: integer("total_deliveries").notNull().default(0),
  onTimeDeliveries: integer("on_time_deliveries").notNull().default(0),
  onTimeRate: numeric("on_time_rate", { precision: 5, scale: 4 }).notNull().default("0"), // 0-1

  // Fill rate
  totalOrdered: integer("total_ordered").notNull().default(0),
  totalReceived: integer("total_received").notNull().default(0),
  fillRate: numeric("fill_rate", { precision: 5, scale: 4 }).notNull().default("0"), // 0-1

  // Lead time tracking
  avgLeadTimeDays: numeric("avg_lead_time_days", { precision: 8, scale: 2 }),
  leadTimeStdDev: numeric("lead_time_std_dev", { precision: 8, scale: 2 }),
  minLeadTimeDays: integer("min_lead_time_days"),
  maxLeadTimeDays: integer("max_lead_time_days"),

  // Quality
  qualityScore: numeric("quality_score", { precision: 5, scale: 4 }), // 0-1
  defectRate: numeric("defect_rate", { precision: 6, scale: 4 }), // 0-1

  // Composite reliability score (0-100)
  reliabilityScore: numeric("reliability_score", { precision: 5, scale: 2 }),

  // Capacity
  maxMonthlyCapacity: integer("max_monthly_capacity"),
  currentUtilization: numeric("current_utilization", { precision: 5, scale: 4 }), // 0-1

  lastCalculatedAt: timestamp("last_calculated_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SupplierPerformance = typeof supplierPerformanceTable.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// 3. INVENTORY TARGETS (per product per warehouse)
// ═══════════════════════════════════════════════════════════════════════════════

export const inventoryTargetsTable = pgTable("inventory_targets", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehousesTable.id, { onDelete: "cascade" }),

  minStock: integer("min_stock").notNull().default(0), // safety stock
  maxStock: integer("max_stock").notNull().default(0), // capacity limit
  targetStock: integer("target_stock").notNull().default(0), // ideal level
  reorderPoint: integer("reorder_point").notNull().default(0),
  reorderQty: integer("reorder_qty").notNull().default(0),

  // Days of supply
  daysOfSupply: numeric("days_of_supply", { precision: 8, scale: 2 }),
  weeksOfCover: numeric("weeks_of_cover", { precision: 8, scale: 2 }),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("inventory_targets_product_warehouse").on(t.productId, t.warehouseId),
]);

export type InventoryTarget = typeof inventoryTargetsTable.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// 4. BIN ATTRIBUTES (for slotting optimization)
// ═══════════════════════════════════════════════════════════════════════════════

export const temperatureZoneEnum = ["ambient", "cool", "cold", "frozen"] as const;
export const hazmatClassEnum = ["none", "class1", "class2", "class3", "class4", "class5", "class6", "class7", "class8", "class9"] as const;

export const binAttributesTable = pgTable("bin_attributes", {
  id: uuid("id").primaryKey().defaultRandom(),
  binId: uuid("bin_id")
    .notNull()
    .references(() => binsTable.id, { onDelete: "cascade" })
    .unique(),

  // Physical attributes
  capacityVolume: numeric("capacity_volume", { precision: 10, scale: 2 }), // cubic meters
  weightLimit: numeric("weight_limit", { precision: 10, scale: 2 }), // kg
  temperatureZone: text("temperature_zone")
    .$type<(typeof temperatureZoneEnum)[number]>()
    .notNull()
    .default("ambient"),
  hazmatClass: text("hazmat_class")
    .$type<(typeof hazmatClassEnum)[number]>()
    .notNull()
    .default("none"),

  // Slotting scores (0-100)
  travelScore: integer("travel_score"), // distance from dispatch (lower = closer = better)
  accessibilityScore: integer("accessibility_score"), // ease of access (100 = best)
  pickFrequency: integer("pick_frequency"), // picks per day (calculated)

  // Velocity classification
  velocityClass: text("velocity_class"), // "fast", "medium", "slow", "dead"

  // Co-pick groups
  coPickGroup: text("co_pick_group"), // products often picked together

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BinAttribute = typeof binAttributesTable.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SLOTTING RULES
// ═══════════════════════════════════════════════════════════════════════════════

export const slottingRulesTable = pgTable("slotting_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  priority: integer("priority").notNull().default(0), // higher = evaluated first
  isActive: boolean("is_active").notNull().default(true),

  // Rule conditions (stored as JSON for flexibility)
  conditions: text("conditions").notNull().default("{}"), // JSON: { velocityClass, weightRange, category, etc. }
  actions: text("actions").notNull().default("{}"), // JSON: { targetZone, targetTravelScore, etc. }

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SlottingRule = typeof slottingRulesTable.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// 6. VELOCITY PROFILES (per product per bin)
// ═══════════════════════════════════════════════════════════════════════════════

export const velocityProfilesTable = pgTable("velocity_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  binId: uuid("bin_id")
    .notNull()
    .references(() => binsTable.id, { onDelete: "cascade" }),

  // Velocity metrics
  picksLast7Days: integer("picks_last_7_days").notNull().default(0),
  picksLast30Days: integer("picks_last_30_days").notNull().default(0),
  picksLast90Days: integer("picks_last_90_days").notNull().default(0),
  outboundQtyLast30Days: integer("outbound_qty_last_30_days").notNull().default(0),

  // Classification
  velocityClass: text("velocity_class"), // "fast", "medium", "slow", "dead"
  velocityScore: numeric("velocity_score", { precision: 6, scale: 2 }), // 0-100

  lastCalculatedAt: timestamp("last_calculated_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("velocity_profiles_product_bin").on(t.productId, t.binId),
]);

export type VelocityProfile = typeof velocityProfilesTable.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// 7. FORECAST SNAPSHOTS
// ═══════════════════════════════════════════════════════════════════════════════

export const forecastSnapshotsTable = pgTable("forecast_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  snapshotDate: date("snapshot_date").notNull(),

  // Forecast inputs
  avgDailyDemand: numeric("avg_daily_demand", { precision: 12, scale: 4 }),
  demandStdDev: numeric("demand_std_dev", { precision: 12, scale: 4 }),
  seasonalityIndex: numeric("seasonality_index", { precision: 6, scale: 4 }), // multiplier
  trendSlope: numeric("trend_slope", { precision: 12, scale: 6 }), // daily change

  // Forecast outputs
  forecast30Day: integer("forecast_30_day"),
  forecast60Day: integer("forecast_60_day"),
  forecast90Day: integer("forecast_90_day"),
  confidence: numeric("confidence", { precision: 5, scale: 4 }), // 0-1

  // Model metadata
  modelUsed: text("model_used").notNull().default("moving_average"), // "moving_average", "holt_winters", "arima"
  modelParams: text("model_params"), // JSON

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ForecastSnapshot = typeof forecastSnapshotsTable.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// 8. DOMAIN EVENTS (for event-driven automation)
// ═══════════════════════════════════════════════════════════════════════════════

export const domainEventsTable = pgTable("domain_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: text("event_type").notNull(),
  payload: text("payload").notNull().default("{}"), // JSON
  source: text("source").notNull(),
  correlationId: text("correlation_id"),
  status: text("status").notNull().default("pending"), // "pending", "processing", "completed", "failed"
  processedAt: timestamp("processed_at", { withTimezone: true }),
  error: text("error"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DomainEventRecord = typeof domainEventsTable.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// 9. JOB QUEUE (for background job tracking)
// ═══════════════════════════════════════════════════════════════════════════════

export const jobQueueTable = pgTable("job_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobType: text("job_type").notNull(), // "replenishment_check", "slotting_review", etc.
  status: text("status").notNull().default("queued"), // "queued", "running", "completed", "failed"
  payload: text("payload"), // JSON
  result: text("result"), // JSON
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type JobQueueItem = typeof jobQueueTable.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// 10. WORKFLOW RULES (automation rules)
// ═══════════════════════════════════════════════════════════════════════════════

export const workflowRulesTable = pgTable("workflow_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  triggerEvent: text("trigger_event").notNull(), // matches domain event type
  conditions: text("conditions").notNull().default("{}"), // JSON conditions
  action: text("action").notNull(), // "create_pr", "send_alert", "create_task"
  actionParams: text("action_params").notNull().default("{}"), // JSON
  isActive: boolean("is_active").notNull().default(true),
  executionCount: integer("execution_count").notNull().default(0),
  lastExecutedAt: timestamp("last_executed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WorkflowRule = typeof workflowRulesTable.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// 11. INVENTORY PLANS
// ═══════════════════════════════════════════════════════════════════════════════

export const inventoryPlansTable = pgTable("inventory_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehousesTable.id, { onDelete: "cascade" }),

  // Plan period
  planDate: date("plan_date").notNull(),
  planHorizonDays: integer("plan_horizon_days").notNull().default(30),

  // Projected inventory
  startingStock: integer("starting_stock").notNull().default(0),
  projectedInbound: integer("projected_inbound").notNull().default(0),
  projectedOutbound: integer("projected_outbound").notNull().default(0),
  projectedEndingStock: integer("projected_ending_stock").notNull().default(0),

  // ATP (Available to Promise)
  atp: integer("atp"), // qty available for new orders

  // Status
  daysOfSupply: numeric("days_of_supply", { precision: 8, scale: 2 }),
  weeksOfCover: numeric("weeks_of_cover", { precision: 8, scale: 2 }),
  stockoutRisk: text("stockout_risk"), // "none", "low", "medium", "high", "critical"
  projectedStockoutDate: date("projected_stockout_date"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InventoryPlan = typeof inventoryPlansTable.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// 12. DISTRIBUTION PLANS
// ═══════════════════════════════════════════════════════════════════════════════

export const distributionPlansTable = pgTable("distribution_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  fromWarehouseId: uuid("from_warehouse_id")
    .notNull()
    .references(() => warehousesTable.id, { onDelete: "cascade" }),
  toWarehouseId: uuid("to_warehouse_id")
    .notNull()
    .references(() => warehousesTable.id, { onDelete: "cascade" }),

  transferQty: integer("transfer_qty").notNull().default(0),
  reason: text("reason"), // "rebalance", "stockout_risk", "excess_transfer"
  status: text("status").notNull().default("suggested"), // "suggested", "approved", "in_transit", "completed"
  requestedAt: timestamp("requested_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DistributionPlan = typeof distributionPlansTable.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// 13. PROCUREMENT FORECASTS
// ═══════════════════════════════════════════════════════════════════════════════

export const procurementForecastsTable = pgTable("procurement_forecasts", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  supplierId: uuid("supplier_id").references(() => suppliersTable.id, { onDelete: "set null" }),

  forecastPeriod: text("forecast_period").notNull(), // "monthly", "quarterly"
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),

  forecastedQty: integer("forecasted_qty").notNull().default(0),
  confidence: numeric("confidence", { precision: 5, scale: 4 }),
  unitCost: numeric("unit_cost", { precision: 12, scale: 4 }),
  totalCost: numeric("total_cost", { precision: 14, scale: 2 }),

  // Container optimization
  containersNeeded: integer("containers_needed"),
  containerUtilization: numeric("container_utilization", { precision: 5, scale: 4 }),

  status: text("status").notNull().default("draft"), // "draft", "approved", "ordered"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProcurementForecast = typeof procurementForecastsTable.$inferSelect;
