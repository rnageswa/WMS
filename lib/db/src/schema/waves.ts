import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { pickingTasksTable } from "./orders";
import { salesOrdersTable } from "./orders";
import { zonesTable } from "./locations";

export const pickWavesTable = pgTable("pick_waves", {
  id: uuid("id").primaryKey().defaultRandom(),
  waveNumber: text("wave_number").notNull().unique(),
  status: text("status").notNull().default("draft"),
  // draft, ready, picking, completed, cancelled
  totalOrders: integer("total_orders").notNull().default(0),
  totalLines: integer("total_lines").notNull().default(0),
  totalUnits: integer("total_units").notNull().default(0),
  pickedLines: integer("picked_lines").notNull().default(0),
  pickedUnits: integer("picked_units").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pickWaveOrdersTable = pgTable(
  "pick_wave_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    waveId: uuid("wave_id")
      .notNull()
      .references(() => pickWavesTable.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => salesOrdersTable.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .references(() => pickingTasksTable.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pwo_wave_id_idx").on(t.waveId)]
);

export const pickWaveZoneStopsTable = pgTable(
  "pick_wave_zone_stops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    waveId: uuid("wave_id")
      .notNull()
      .references(() => pickWavesTable.id, { onDelete: "cascade" }),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => zonesTable.id, { onDelete: "cascade" }),
    stopOrder: integer("stop_order").notNull(),
    linesCount: integer("lines_count").notNull().default(0),
    unitsCount: integer("units_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pwzs_wave_id_idx").on(t.waveId)]
);

export type PickWave = typeof pickWavesTable.$inferSelect;
export type PickWaveOrder = typeof pickWaveOrdersTable.$inferSelect;
export type PickWaveZoneStop = typeof pickWaveZoneStopsTable.$inferSelect;
