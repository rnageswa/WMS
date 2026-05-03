import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const velocityAlertSettingsTable = pgTable("velocity_alert_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  thresholdDays: integer("threshold_days").notNull().default(14),
  lookbackDays: integer("lookback_days").notNull().default(30),
  recipientEmail: text("recipient_email").notNull().default(""),
  enabled: boolean("enabled").notNull().default(false),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VelocityAlertSettings = typeof velocityAlertSettingsTable.$inferSelect;

// mode: 'always' — include this SKU in alerts regardless of velocity threshold
// mode: 'never'  — exclude this SKU from alerts regardless of velocity threshold
export const skuAlertOverridesTable = pgTable("sku_alert_overrides", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" })
    .unique(),
  mode: text("mode").notNull(), // 'always' | 'never'
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SkuAlertOverride = typeof skuAlertOverridesTable.$inferSelect;
