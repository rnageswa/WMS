import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { productsTable } from "./products";
import { purchaseOrdersTable, purchaseOrderLinesTable } from "./purchasing";
import { salesOrdersTable } from "./orders";

// ── Landed Cost Components ─────────────────────────────────────────────────────

export const landedCostTypeEnum = ["freight", "insurance", "duties", "handling", "overhead"] as const;
export const allocationMethodEnum = ["value", "weight", "quantity", "equal"] as const;

export const poLandedCostsTable = pgTable(
  "po_landed_costs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poId: uuid("po_id")
      .notNull()
      .references(() => purchaseOrdersTable.id, { onDelete: "cascade" }),
    costType: text("cost_type")
      .$type<(typeof landedCostTypeEnum)[number]>()
      .notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    allocationMethod: text("allocation_method")
      .$type<(typeof allocationMethodEnum)[number]>()
      .notNull()
      .default("value"),
    currency: text("currency").notNull().default("USD"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("po_landed_costs_po_id_idx").on(t.poId)]
);

// ── Product Cost History ───────────────────────────────────────────────────────

export const costSourceTypeEnum = ["receipt", "adjustment", "manual", "standard"] as const;

export const productCostHistoryTable = pgTable(
  "product_cost_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "restrict" }),
    avgCost: numeric("avg_cost", { precision: 12, scale: 4 }).notNull(),
    standardCost: numeric("standard_cost", { precision: 12, scale: 4 }),
    totalQty: integer("total_qty").notNull(),
    sourceType: text("source_type")
      .$type<(typeof costSourceTypeEnum)[number]>()
      .notNull(),
    sourceId: uuid("source_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("product_cost_history_product_id_idx").on(t.productId),
    index("product_cost_history_created_at_idx").on(t.createdAt),
  ]
);

// ── Pricing Rules ──────────────────────────────────────────────────────────────

export const pricingRuleTypeEnum = ["margin_floor", "markup_target", "competitive_match", "volume_discount"] as const;
export const pricingRuleScopeEnum = ["global", "category", "product"] as const;

export const pricingRulesTable = pgTable(
  "pricing_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    ruleType: text("rule_type")
      .$type<(typeof pricingRuleTypeEnum)[number]>()
      .notNull(),
    scope: text("scope")
      .$type<(typeof pricingRuleScopeEnum)[number]>()
      .notNull()
      .default("global"),
    scopeId: uuid("scope_id"),
    conditionJson: jsonb("condition_json"),
    actionJson: jsonb("action_json").notNull(),
    priority: integer("priority").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    validFrom: date("valid_from"),
    validTo: date("valid_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pricing_rules_type_idx").on(t.ruleType), index("pricing_rules_active_idx").on(t.isActive)]
);

// ── Margin Alerts ──────────────────────────────────────────────────────────────

export const marginAlertTypeEnum = ["negative_margin", "below_floor", "price_anomaly"] as const;
export const marginAlertSeverityEnum = ["critical", "warning", "info"] as const;

export const marginAlertsTable = pgTable(
  "margin_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => salesOrdersTable.id, { onDelete: "set null" }),
    alertType: text("alert_type")
      .$type<(typeof marginAlertTypeEnum)[number]>()
      .notNull(),
    severity: text("severity")
      .$type<(typeof marginAlertSeverityEnum)[number]>()
      .notNull(),
    expectedMargin: numeric("expected_margin", { precision: 5, scale: 2 }),
    actualMargin: numeric("actual_margin", { precision: 5, scale: 2 }),
    acknowledged: boolean("acknowledged").notNull().default(false),
    acknowledgedBy: text("acknowledged_by"),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("margin_alerts_order_id_idx").on(t.orderId),
    index("margin_alerts_severity_idx").on(t.severity),
    index("margin_alerts_acknowledged_idx").on(t.acknowledged),
  ]
);

// ── Finance Audit Log ──────────────────────────────────────────────────────────

export const auditObjectTypeEnum = ["product", "pricing_rule", "price_list", "landed_cost"] as const;
export const auditActionEnum = ["create", "update", "delete", "acknowledge", "bulk_update"] as const;

export const financeAuditLogTable = pgTable(
  "finance_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    action: text("action")
      .$type<(typeof auditActionEnum)[number]>()
      .notNull(),
    objectType: text("object_type")
      .$type<(typeof auditObjectTypeEnum)[number]>()
      .notNull(),
    objectId: text("object_id").notNull(),
    changes: jsonb("changes"),
    reason: text("reason"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("finance_audit_log_object_idx").on(t.objectType, t.objectId),
    index("finance_audit_log_created_at_idx").on(t.createdAt),
    index("finance_audit_log_user_idx").on(t.userId),
  ]
);

// ── Types ──────────────────────────────────────────────────────────────────────

export type PoLandedCost = typeof poLandedCostsTable.$inferSelect;
export type ProductCostHistory = typeof productCostHistoryTable.$inferSelect;
export type PricingRule = typeof pricingRulesTable.$inferSelect;
export type MarginAlert = typeof marginAlertsTable.$inferSelect;
export type FinanceAuditLog = typeof financeAuditLogTable.$inferSelect;
