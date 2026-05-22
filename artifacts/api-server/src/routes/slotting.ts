import { Router } from "express";
import { db } from "@workspace/db";
import { slottingAssignmentsTable, binAttributesTable, productsTable, binsTable, zonesTable, warehousesTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// ── GET /slotting/assignments ──────────────────────────────────────────────────

router.get("/assignments", async (req, res) => {
  const { warehouseId, isValid, limit = "50" } = req.query;

  const baseQuery = db
    .select({
      id: slottingAssignmentsTable.id,
      productId: slottingAssignmentsTable.productId,
      binId: slottingAssignmentsTable.binId,
      score: slottingAssignmentsTable.score,
      rank: slottingAssignmentsTable.rank,
      reason: slottingAssignmentsTable.reason,
      assignedBy: slottingAssignmentsTable.assignedBy,
      isValid: slottingAssignmentsTable.isValid,
      assignedAt: slottingAssignmentsTable.assignedAt,
      productName: productsTable.name,
      productSku: productsTable.skuCode,
      binCode: binsTable.code,
      zoneName: zonesTable.name,
      warehouseName: warehousesTable.name,
    })
    .from(slottingAssignmentsTable)
    .leftJoin(productsTable, eq(slottingAssignmentsTable.productId, productsTable.id))
    .leftJoin(binsTable, eq(slottingAssignmentsTable.binId, binsTable.id))
    .leftJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
    .leftJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id));

  let assignments;
  if (warehouseId) {
    assignments = await baseQuery
      .where(eq(warehousesTable.id, warehouseId as string))
      .orderBy(desc(slottingAssignmentsTable.score))
      .limit(Number(limit));
  } else if (isValid !== undefined) {
    assignments = await baseQuery
      .where(eq(slottingAssignmentsTable.isValid, isValid === "true"))
      .orderBy(desc(slottingAssignmentsTable.score))
      .limit(Number(limit));
  } else {
    assignments = await baseQuery
      .orderBy(desc(slottingAssignmentsTable.score))
      .limit(Number(limit));
  }

  res.json(assignments);
});

// ── GET /slotting/heatmap ──────────────────────────────────────────────────────

router.get("/heatmap", async (req, res) => {
  const { warehouseId } = req.query;

  const baseQuery = db
    .select({
      binId: binAttributesTable.binId,
      binCode: binsTable.code,
      zoneId: binsTable.zoneId,
      zoneName: zonesTable.name,
      warehouseId: warehousesTable.id,
      warehouseName: warehousesTable.name,
      travelScore: binAttributesTable.travelScore,
      accessibilityScore: binAttributesTable.accessibilityScore,
      pickFrequency: binAttributesTable.pickFrequency,
      velocityClass: binAttributesTable.velocityClass,
    })
    .from(binAttributesTable)
    .leftJoin(binsTable, eq(binAttributesTable.binId, binsTable.id))
    .leftJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
    .leftJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id));

  let heatmap;
  if (warehouseId) {
    heatmap = await baseQuery.where(eq(warehousesTable.id, warehouseId as string));
  } else {
    heatmap = await baseQuery;
  }

  res.json(heatmap);
});

// ── POST /slotting/assignments ─────────────────────────────────────────────────

router.post("/assignments", async (req, res) => {
  const { productId, binId, score, reason, assignedBy } = req.body;

  const [assignment] = await db
    .insert(slottingAssignmentsTable)
    .values({
      productId,
      binId,
      score: score?.toString() ?? "0",
      reason: reason || "manual",
      assignedBy: assignedBy || "user",
    })
    .returning();

  res.json(assignment);
});

// ── PUT /slotting/assignments/:id/confirm ─────────────────────────────────────

router.put("/assignments/:id/confirm", async (req, res) => {
  const { id } = req.params;
  const { confirmedBy } = req.body;

  const [assignment] = await db
    .update(slottingAssignmentsTable)
    .set({
      isValid: true,
      confirmedAt: new Date(),
      confirmedBy,
    })
    .where(eq(slottingAssignmentsTable.id, id))
    .returning();

  res.json(assignment);
});

export default router;
