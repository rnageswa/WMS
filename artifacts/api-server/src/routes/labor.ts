import { Router } from "express";
import { db } from "@workspace/db";
import { workerPerformanceTable, laborMetricsTable, laborEntriesTable, laborAssignmentsTable } from "@workspace/db/schema";
import { eq, desc, gte, lte, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// ── GET /labor/workers ─────────────────────────────────────────────────────────

router.get("/workers", async (req, res) => {
  const { startDate, endDate, workerId } = req.query;

  const conditions = [];
  if (startDate) conditions.push(gte(workerPerformanceTable.periodStart, startDate as string));
  if (endDate) conditions.push(lte(workerPerformanceTable.periodEnd, endDate as string));
  if (workerId) conditions.push(eq(workerPerformanceTable.workerId, workerId as string));

  const workers = await db
    .select()
    .from(workerPerformanceTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(workerPerformanceTable.periodStart));

  res.json(workers);
});

// ── GET /labor/workers/:workerId ───────────────────────────────────────────────

router.get("/workers/:workerId", async (req, res) => {
  const { workerId } = req.params;
  const { period } = req.query;

  let startDate: string;
  const today = new Date().toISOString().split("T")[0];

  switch (period) {
    case "week":
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      break;
    case "month":
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      break;
    default:
      startDate = today;
  }

  const worker = await db
    .select()
    .from(workerPerformanceTable)
    .where(and(eq(workerPerformanceTable.workerId, workerId), gte(workerPerformanceTable.periodStart, startDate)))
    .orderBy(desc(workerPerformanceTable.periodStart))
    .limit(1);

  res.json(worker[0] || null);
});

// ── GET /labor/entries ───────────────────────────────────────────────────────

router.get("/entries", async (req, res) => {
  const { workerId, shiftDate } = req.query;
  const conditions = [];
  if (workerId) conditions.push(eq(laborEntriesTable.workerId, workerId as string));
  if (shiftDate) conditions.push(eq(laborEntriesTable.shiftDate, shiftDate as string));
  const entries = await db
    .select()
    .from(laborEntriesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(laborEntriesTable.shiftDate));
  res.json(entries);
});

// ── POST /labor/workers ─────────────────────────────────────────────────────────

// ── POST /labor/entries ───────────────────────────────────────────────────────

// ── POST /labor/assignments ───────────────────────────────────────────────────

const assignmentSchema = z.object({
  laborEntryId: z.string(),
  taskId: z.string(),
  taskType: z.enum(["stock_movement", "picking", "cycle_count", "replenishment"]),
});

router.post("/assignments", async (req, res) => {
  const parsed = assignmentSchema.parse(req.body);
  try {
    const [created] = await db
      .insert(laborAssignmentsTable)
      .values({
        laborEntryId: parsed.laborEntryId,
        taskId: parsed.taskId,
        taskType: parsed.taskType,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to assign labor" });
  }
});

const entrySchema = z.object({
  workerId: z.string(),
  shiftDate: z.string(), // ISO date
  hoursWorked: z.number().optional(),
  tasksCompleted: z.number().optional(),
  notes: z.string().optional(),
});

router.post("/entries", async (req, res) => {
  const parsed = entrySchema.parse(req.body);
  try {
    const [created] = await db
      .insert(laborEntriesTable)
      .values({
        workerId: parsed.workerId,
        shiftDate: parsed.shiftDate,
        hoursWorked: parsed.hoursWorked?.toString(),
        tasksCompleted: parsed.tasksCompleted,
        notes: parsed.notes,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to create labor entry" });
  }
});

const upsertSchema = z.object({
  workerId: z.string(),
  workerName: z.string().optional().nullable(),
  periodStart: z.string(),
  periodEnd: z.string(),
  tasksCompleted: z.number().int().optional().default(0),
  linesPicked: z.number().int().optional().default(0),
  unitsPicked: z.number().int().optional().default(0),
  hoursWorked: z.number().optional(),
  accuracyRate: z.number().min(0).max(1).optional().nullable(),
});

router.post("/workers", async (req, res) => {
  const parsed = upsertSchema.parse(req.body);

  const existing = await db
    .select()
    .from(workerPerformanceTable)
    .where(and(
      eq(workerPerformanceTable.workerId, parsed.workerId),
      eq(workerPerformanceTable.periodStart, parsed.periodStart),
    ))
    .limit(1);

  const productivityScore = parsed.hoursWorked && parsed.hoursWorked > 0 && parsed.unitsPicked
    ? parsed.unitsPicked / parsed.hoursWorked
    : undefined;
  const efficiencyScore = parsed.tasksCompleted
    ? Math.min(100, Math.round(parsed.tasksCompleted / 10))
    : undefined;

  const values = {
    workerName: parsed.workerName ?? null,
    periodEnd: parsed.periodEnd,
    tasksCompleted: parsed.tasksCompleted,
    linesPicked: parsed.linesPicked,
    unitsPicked: parsed.unitsPicked,
    hoursWorked: parsed.hoursWorked?.toString(),
    productivityScore: productivityScore?.toString(),
    efficiencyScore: efficiencyScore?.toString(),
    accuracyRate: parsed.accuracyRate?.toString() ?? null,
  };

  if (existing.length) {
    const [updated] = await db
      .update(workerPerformanceTable)
      .set(values)
      .where(eq(workerPerformanceTable.id, existing[0].id))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db
      .insert(workerPerformanceTable)
      .values({
        workerId: parsed.workerId,
        periodStart: parsed.periodStart,
        ...values,
      })
      .returning();
    res.json(created);
  }
});

// ── GET /labor/metrics ──────────────────────────────────────────────────────────

router.get("/metrics", async (req, res) => {
  const { workerId, metricType, days = "7" } = req.query;

  const conditions = [];
  if (workerId) conditions.push(eq(laborMetricsTable.workerId, workerId as string));
  if (metricType) conditions.push(eq(laborMetricsTable.metricType, metricType as string));
  const cutoff = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
  conditions.push(gte(laborMetricsTable.recordedAt, cutoff));

  const metrics = await db
    .select()
    .from(laborMetricsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(laborMetricsTable.recordedAt));

  res.json(metrics);
});

export default router;
