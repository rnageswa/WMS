// ── Labor Tracking Schemas ───────────────────────────────────────────────────────

import { pgTable, uuid, text, integer, numeric, timestamp, date, unique } from "drizzle-orm/pg-core";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. WORKER PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════════

export const workerPerformanceTable = pgTable("worker_performance", {
  id: uuid("id").primaryKey().defaultRandom(),
  workerId: text("worker_id").notNull(),
  workerName: text("worker_name"),

  tasksCompleted: integer("tasks_completed").notNull().default(0),
  linesPicked: integer("lines_picked").notNull().default(0),
  unitsPicked: integer("units_picked").notNull().default(0),
  hoursWorked: numeric("hours_worked", { precision: 8, scale: 2 }).notNull().default("0"),

  productivityScore: numeric("productivity_score", { precision: 6, scale: 2 }),
  accuracyRate: numeric("accuracy_rate", { precision: 5, scale: 4 }),
  efficiencyScore: numeric("efficiency_score", { precision: 6, scale: 2 }),

  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("worker_performance_worker_period").on(t.workerId, t.periodStart),
]);

export type WorkerPerformance = typeof workerPerformanceTable.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// 2. LABOR METRICS
// ═════════════════════════════════════════════════════════════════════════════==

export const laborEntriesTable = pgTable("labor_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  workerId: text("worker_id").notNull(),
  shiftDate: date("shift_date").notNull(),
  hoursWorked: numeric("hours_worked", { precision: 8, scale: 2 }).notNull().default("0"),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // unique per worker per day
  unique("labor_entry_worker_date").on(t.workerId, t.shiftDate),
]);

export type LaborEntry = typeof laborEntriesTable.$inferSelect;

export const laborAssignmentsTable = pgTable("labor_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  laborEntryId: uuid("labor_entry_id").notNull().references(() => laborEntriesTable.id),
  taskId: uuid("task_id"),
  taskType: text("task_type").$type<"stock_movement" | "picking" | "cycle_count" | "replenishment">().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // optional unique per labor entry per task
  unique("labor_assignment_unique").on(t.laborEntryId, t.taskId, t.taskType),
]);

export type LaborAssignment = typeof laborAssignmentsTable.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// 2. LABOR METRICS
// ═════════════════════════════════════════════════════════════════════════════==

export const laborMetricsTable = pgTable("labor_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  metricType: text("metric_type").notNull(),
  value: numeric("value", { precision: 12, scale: 2 }),
  unit: text("unit"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  workerId: text("worker_id"),
  taskId: uuid("task_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LaborMetric = typeof laborMetricsTable.$inferSelect;
