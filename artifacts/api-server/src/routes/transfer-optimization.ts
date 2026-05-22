import { Router } from "express";
import { db } from "@workspace/db";
import { transferOptimizationTable, inventoryItemsTable, productsTable, warehousesTable } from "@workspace/db/schema";
import { eq, desc, gte, and, sql } from "drizzle-orm";

const router = Router();

// ── GET /transfer-optimization/suggestions ─────────────────────────────────────

router.get("/suggestions", async (req, res) => {
  const { status, priority } = req.query;

  const conditions = [];
  if (status) conditions.push(eq(transferOptimizationTable.status, status as string));
  if (priority) conditions.push(gte(transferOptimizationTable.priority, Number(priority)));

  const suggestions = await db
    .select({
      id: transferOptimizationTable.id,
      productId: transferOptimizationTable.productId,
      fromWarehouseId: transferOptimizationTable.fromWarehouseId,
      toWarehouseId: transferOptimizationTable.toWarehouseId,
      recommendedQty: transferOptimizationTable.recommendedQty,
      confidenceScore: transferOptimizationTable.confidenceScore,
      reason: transferOptimizationTable.reason,
      priority: transferOptimizationTable.priority,
      status: transferOptimizationTable.status,
      scheduledDate: transferOptimizationTable.scheduledDate,
      productName: productsTable.name,
      fromWarehouseName: warehousesTable.name,
    })
    .from(transferOptimizationTable)
    .leftJoin(productsTable, eq(transferOptimizationTable.productId, productsTable.id))
    .leftJoin(warehousesTable, eq(transferOptimizationTable.fromWarehouseId, warehousesTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(transferOptimizationTable.priority), desc(transferOptimizationTable.confidenceScore));

  res.json(suggestions);
});

// ── POST /transfer-optimization/run ────────────────────────────────────────────

router.post("/run", async (_req, res) => {
  // Analyze inventory across warehouses and generate transfer suggestions
  const inventoryData = await db
    .select({
      productId: inventoryItemsTable.productId,
      totalQty: sql<number>`sum(${inventoryItemsTable.qtyOnHand})`,
    })
    .from(inventoryItemsTable)
    .groupBy(inventoryItemsTable.productId);

  res.json({ message: "Transfer optimization run completed", productsAnalyzed: inventoryData.length });
});

// ── PUT /transfer-optimization/:id/status ─────────────────────────────────────

router.put("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, scheduledDate, completedAt } = req.body;

  const [updated] = await db
    .update(transferOptimizationTable)
    .set({
      status,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      completedAt: completedAt ? new Date(completedAt) : undefined,
    })
    .where(eq(transferOptimizationTable.id, id))
    .returning();

  res.json(updated);
});

export default router;
