import { Router } from "express";
import { db } from "@workspace/db";
import {
  pickingTasksTable,
  pickingLinesTable,
  salesOrdersTable,
  salesOrderLinesTable,
  productsTable,
  binsTable,
  inventoryItemsTable,
} from "@workspace/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────

async function getTaskWithLines(taskId: string) {
  const [task] = await db
    .select()
    .from(pickingTasksTable)
    .where(eq(pickingTasksTable.id, taskId))
    .limit(1);

  if (!task) return null;

  const lines = await db
    .select({
      id: pickingLinesTable.id,
      taskId: pickingLinesTable.taskId,
      orderLineId: pickingLinesTable.orderLineId,
      productId: pickingLinesTable.productId,
      binId: pickingLinesTable.binId,
      qtyToPick: pickingLinesTable.qtyToPick,
      qtyPicked: pickingLinesTable.qtyPicked,
      status: pickingLinesTable.status,
      pickedAt: pickingLinesTable.pickedAt,
      createdAt: pickingLinesTable.createdAt,
      skuCode: productsTable.skuCode,
      productName: productsTable.name,
      binCode: binsTable.code,
      binName: binsTable.name,
    })
    .from(pickingLinesTable)
    .leftJoin(productsTable, eq(pickingLinesTable.productId, productsTable.id))
    .leftJoin(binsTable, eq(pickingLinesTable.binId, binsTable.id))
    .where(eq(pickingLinesTable.taskId, taskId))
    .orderBy(pickingLinesTable.createdAt);

  return { ...task, lines };
}

// ── List Tasks ──────────────────────────────────────────────────────

// GET /picking-tasks
router.get("/picking-tasks", requireAuth, async (req: any, res) => {
  const { status, assignedTo, orderId } = req.query as {
    status?: string;
    assignedTo?: string;
    orderId?: string;
  };

  const conditions = [];
  if (status) conditions.push(eq(pickingTasksTable.status, status));
  if (assignedTo) conditions.push(eq(pickingTasksTable.assignedTo, assignedTo));
  if (orderId) conditions.push(eq(pickingTasksTable.orderId, orderId));

  const tasks = await db
    .select({
      id: pickingTasksTable.id,
      orderId: pickingTasksTable.orderId,
      status: pickingTasksTable.status,
      assignedTo: pickingTasksTable.assignedTo,
      startedAt: pickingTasksTable.startedAt,
      completedAt: pickingTasksTable.completedAt,
      createdAt: pickingTasksTable.createdAt,
      orderNumber: salesOrdersTable.orderNumber,
      customerName: salesOrdersTable.customerName,
    })
    .from(pickingTasksTable)
    .leftJoin(salesOrdersTable, eq(pickingTasksTable.orderId, salesOrdersTable.id))
    .where(and(...conditions))
    .orderBy(desc(pickingTasksTable.createdAt));

  res.json(tasks);
});

// ── Get Task Detail ─────────────────────────────────────────────────

// GET /picking-tasks/:id
router.get("/picking-tasks/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const task = await getTaskWithLines(id);
  if (!task) {
    res.status(404).json({ error: "Picking task not found" });
    return;
  }
  res.json(task);
});

// ── Create Task from Sales Order ───────────────────────────────────

// POST /picking-tasks
router.post("/picking-tasks", requireAuth, async (req: any, res) => {
  const schema = z.object({
    orderId: z.string().uuid(),
    assignedTo: z.string().optional(),
    laborAssignmentId: z.string().uuid().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors });
    return;
  }

  const { orderId, assignedTo } = parsed.data;

  // Verify order exists and is in picking state
  const [order] = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, orderId))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Sales order not found" });
    return;
  }

  if (!["confirmed", "picking"].includes(order.status)) {
    res.status(400).json({ error: "Order must be confirmed or in picking state" });
    return;
  }

  // Check for existing active task
  const existing = await db
    .select()
    .from(pickingTasksTable)
    .where(and(eq(pickingTasksTable.orderId, orderId), eq(pickingTasksTable.status, "pending")))
    .limit(1);

  if (existing.length > 0) {
    res.status(400).json({ error: "Active picking task already exists for this order" });
    return;
  }

  // Update order status to picking
  if (order.status === "confirmed") {
    await db
      .update(salesOrdersTable)
      .set({ status: "picking", updatedAt: new Date() })
      .where(eq(salesOrdersTable.id, orderId));
  }

  // Create picking task
  const [task] = await db
    .insert(pickingTasksTable)
    .values({
      orderId,
      assignedTo: assignedTo || null,
      status: assignedTo ? "assigned" : "pending",
      laborAssignmentId: parsed.laborAssignmentId || null,
    })
    .returning();

  // Get order lines and create picking lines
  const lines = await db
    .select()
    .from(salesOrderLinesTable)
    .where(eq(salesOrderLinesTable.orderId, orderId));

  // For each line, find best bin with inventory
  const pickingLinesData = await Promise.all(
    lines.map(async (line) => {
      // Find bin with most stock for this product
      const [inv] = await db
        .select({
          binId: inventoryItemsTable.binId,
          qtyOnHand: inventoryItemsTable.qtyOnHand,
        })
        .from(inventoryItemsTable)
        .where(
          and(
            eq(inventoryItemsTable.productId, line.productId),
            sql`qty_on_hand > 0`
          )
        )
        .orderBy(sql`qty_on_hand DESC`)
        .limit(1);

      return {
        taskId: task.id,
        orderLineId: line.id,
        productId: line.productId,
        binId: inv?.binId || null,
        qtyToPick: line.qtyOrdered - (line.qtyPicked || 0),
        qtyPicked: 0,
        status: "pending" as const,
      };
    })
  );

  if (pickingLinesData.length > 0) {
    await db.insert(pickingLinesTable).values(pickingLinesData);
  }

  const result = await getTaskWithLines(task.id);
  res.status(201).json(result);
});

// ── Assign Task ─────────────────────────────────────────────────────

// PUT /picking-tasks/:id/assign
router.put("/picking-tasks/:id/assign", requireAuth, async (req: any, res) => {
  const { id } = req.params;
  const schema = z.object({ assignedTo: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors });
    return;
  }

  const [task] = await db
    .select()
    .from(pickingTasksTable)
    .where(eq(pickingTasksTable.id, id))
    .limit(1);

  if (!task) {
    res.status(404).json({ error: "Picking task not found" });
    return;
  }

  if (!["pending", "assigned"].includes(task.status)) {
    res.status(400).json({ error: "Task already in progress or completed" });
    return;
  }

  const [updated] = await db
    .update(pickingTasksTable)
    .set({
      assignedTo: parsed.data.assignedTo,
      status: "assigned",
      updatedAt: new Date(),
    })
    .where(eq(pickingTasksTable.id, id))
    .returning();

  res.json(updated);
});

// ── Start Picking ──────────────────────────────────────────────────

// PUT /picking-tasks/:id/start
router.put("/picking-tasks/:id/start", requireAuth, async (req: any, res) => {
  const { id } = req.params;

  const [task] = await db
    .select()
    .from(pickingTasksTable)
    .where(eq(pickingTasksTable.id, id))
    .limit(1);

  if (!task) {
    res.status(404).json({ error: "Picking task not found" });
    return;
  }

  if (!["pending", "assigned"].includes(task.status)) {
    res.status(400).json({ error: "Task cannot be started" });
    return;
  }

  const [updated] = await db
    .update(pickingTasksTable)
    .set({
      status: "in_progress",
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pickingTasksTable.id, id))
    .returning();

  // Update picking line statuses
  await db
    .update(pickingLinesTable)
    .set({ status: "picking" })
    .where(
      and(
        eq(pickingLinesTable.taskId, id),
        eq(pickingLinesTable.status, "pending")
      )
    );

  res.json(updated);
});

// ── Pick a Line ────────────────────────────────────────────────────

// PUT /picking-tasks/:id/lines/:lineId/pick
router.put("/picking-tasks/:id/lines/:lineId/pick", requireAuth, async (req: any, res) => {
  const { id, lineId } = req.params;
  const schema = z.object({
    qtyPicked: z.number().int().min(0),
    binId: z.string().uuid().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors });
    return;
  }

  const { qtyPicked, binId } = parsed.data;

  // Verify task
  const [task] = await db
    .select()
    .from(pickingTasksTable)
    .where(eq(pickingTasksTable.id, id))
    .limit(1);

  if (!task) {
    res.status(404).json({ error: "Picking task not found" });
    return;
  }

  if (task.status !== "in_progress") {
    res.status(400).json({ error: "Task is not in progress" });
    return;
  }

  // Get line
  const [line] = await db
    .select()
    .from(pickingLinesTable)
    .where(and(eq(pickingLinesTable.id, lineId), eq(pickingLinesTable.taskId, id)))
    .limit(1);

  if (!line) {
    res.status(404).json({ error: "Picking line not found" });
    return;
  }

  if (qtyPicked > line.qtyToPick) {
    res.status(400).json({ error: "Cannot pick more than required" });
    return;
  }

  // Update line
  const [updatedLine] = await db
    .update(pickingLinesTable)
    .set({
      qtyPicked,
      binId: binId || line.binId,
      status: qtyPicked >= line.qtyToPick ? "picked" : "picking",
      pickedAt: qtyPicked > 0 ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(pickingLinesTable.id, lineId))
    .returning();

  // Also update sales order line
  await db
    .update(salesOrderLinesTable)
    .set({
      qtyPicked: sql`qty_picked + ${qtyPicked - line.qtyPicked}`,
      status: qtyPicked >= line.qtyToPick ? "picked" : "picking",
    })
    .where(eq(salesOrderLinesTable.id, line.orderLineId));

  res.json(updatedLine);
});

// ── Complete Task ───────────────────────────────────────────────────

// PUT /picking-tasks/:id/complete
router.put("/picking-tasks/:id/complete", requireAuth, async (req, res) => {
  const { id } = req.params;

  const [task] = await db
    .select()
    .from(pickingTasksTable)
    .where(eq(pickingTasksTable.id, id))
    .limit(1);

  if (!task) {
    res.status(404).json({ error: "Picking task not found" });
    return;
  }

  if (task.status !== "in_progress") {
    res.status(400).json({ error: "Task must be in progress to complete" });
    return;
  }

  // Check all lines picked
  const incomplete = await db
    .select()
    .from(pickingLinesTable)
    .where(
      and(
        eq(pickingLinesTable.taskId, id),
        eq(pickingLinesTable.status, "picking")
      )
    );

  if (incomplete.length > 0) {
    res.status(400).json({
      error: "Not all lines are picked",
      incompleteLines: incomplete.length,
    });
    return;
  }

  const [updated] = await db
    .update(pickingTasksTable)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pickingTasksTable.id, id))
    .returning();

  // Update order status
  await db
    .update(salesOrdersTable)
    .set({ status: "picking_complete", updatedAt: new Date() })
    .where(eq(salesOrdersTable.id, task.orderId));

  res.json(updated);
});

// ── Cancel Task ─────────────────────────────────────────────────────

// PUT /picking-tasks/:id/cancel
router.put("/picking-tasks/:id/cancel", requireAuth, async (req: any, res) => {
  const { id } = req.params;

  const [task] = await db
    .select()
    .from(pickingTasksTable)
    .where(eq(pickingTasksTable.id, id))
    .limit(1);

  if (!task) {
    res.status(404).json({ error: "Picking task not found" });
    return;
  }

  if (task.status === "completed") {
    res.status(400).json({ error: "Cannot cancel completed task" });
    return;
  }

  const [updated] = await db
    .update(pickingTasksTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(pickingTasksTable.id, id))
    .returning();

  // Reset sales order lines if needed
  const lines = await db
    .select()
    .from(pickingLinesTable)
    .where(eq(pickingLinesTable.taskId, id));

  for (const line of lines) {
    await db
      .update(salesOrderLinesTable)
      .set({ status: "pending" })
      .where(eq(salesOrderLinesTable.id, line.orderLineId));
  }

  res.json(updated);
});

export default router;
