import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

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
