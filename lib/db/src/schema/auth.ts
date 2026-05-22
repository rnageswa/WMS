import { pgTable, uuid, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { laborAssignmentsTable } from "./labor";

export const userRolesTable = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  role: text("role").notNull().default("operator"), // 'admin' | 'operator' | 'viewer'
  displayName: text("display_name"),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserRole = typeof userRolesTable.$inferSelect;

export const cycleCountSchedulesTable = pgTable("cycle_count_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  warehouseId: uuid("warehouse_id").notNull(),
  zoneId: uuid("zone_id"),
  frequency: text("frequency").notNull().default("weekly"), // 'daily' | 'weekly' | 'monthly'
  assignedTo: text("assigned_to"),
  isActive: boolean("is_active").notNull().default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CycleCountSchedule = typeof cycleCountSchedulesTable.$inferSelect;

export const cycleCountHistoryTable = pgTable("cycle_count_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference"),
  warehouseId: uuid("warehouse_id").notNull(),
  zoneId: uuid("zone_id"),
  itemsCounted: integer("items_counted").notNull().default(0),
  discrepancyCount: integer("discrepancy_count").notNull().default(0),
  netVariance: integer("net_variance").notNull().default(0),
  submittedBy: text("submitted_by"),
  laborAssignmentId: uuid("labor_assignment_id")
    .references(() => laborAssignmentsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CycleCountHistory = typeof cycleCountHistoryTable.$inferSelect;
