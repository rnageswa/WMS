import { Router } from "express";
import { db } from "@workspace/db";
import {
  cycleCountSchedulesTable,
  cycleCountHistoryTable,
} from "@workspace/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "../middlewares/auth";

const router = Router();

// All cycle count routes require admin or operator
router.use(requireRole("admin", "operator"));

// ── Schedules ──────────────────────────────────────────────────────────────────

const scheduleSchema = z.object({
  warehouseId: z.string().uuid(),
  zoneId: z.string().uuid().optional().nullable(),
  frequency: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  assignedTo: z.string().optional().nullable(),
});

// GET /api/cycle-counts/schedules
router.get("/schedules", async (_req, res) => {
  const schedules = await db
    .select()
    .from(cycleCountSchedulesTable)
    .where(eq(cycleCountSchedulesTable.isActive, true))
    .orderBy(desc(cycleCountSchedulesTable.createdAt));
  res.json(schedules);
});

// POST /api/cycle-counts/schedules
router.post("/schedules", async (req, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const [created] = await db
    .insert(cycleCountSchedulesTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(created);
});

// PUT /api/cycle-counts/schedules/:id
router.put("/schedules/:id", async (req, res) => {
  const parsed = scheduleSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const [updated] = await db
    .update(cycleCountSchedulesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(cycleCountSchedulesTable.id, req.params.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  res.json(updated);
});

// DELETE /api/cycle-counts/schedules/:id (soft delete)
router.delete("/schedules/:id", async (req, res) => {
  const [updated] = await db
    .update(cycleCountSchedulesTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(cycleCountSchedulesTable.id, req.params.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  res.json({ success: true });
});

// POST /api/cycle-counts/schedules/:id/run — mark as run now
router.post("/schedules/:id/run", async (req, res) => {
  const [updated] = await db
    .update(cycleCountSchedulesTable)
    .set({ lastRunAt: new Date(), updatedAt: new Date() })
    .where(eq(cycleCountSchedulesTable.id, req.params.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  res.json(updated);
});

// ── History ───────────────────────────────────────────────────────────────────

// GET /api/cycle-counts/history
router.get("/history", async (_req, res) => {
  const history = await db
    .select()
    .from(cycleCountHistoryTable)
    .orderBy(desc(cycleCountHistoryTable.createdAt))
    .limit(50);
  res.json(history);
});

// POST /api/cycle-counts/history — record a completed count
const historySchema = z.object({
  reference: z.string().optional().nullable(),
  warehouseId: z.string().uuid(),
  zoneId: z.string().uuid().optional().nullable(),
  itemsCounted: z.number().int().min(0),
  discrepancyCount: z.number().int().min(0),
  netVariance: z.number().int(),
  submittedBy: z.string().optional().nullable(),
});

router.post("/history", async (req, res) => {
  const parsed = historySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const [created] = await db
    .insert(cycleCountHistoryTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(created);
});

export default router;
