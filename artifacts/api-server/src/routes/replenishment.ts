import { Router } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  inventoryItemsTable,
  inventoryMovementsTable,
  reorderPointSettingsTable,
  demandHistoryTable,
  replenishmentRecommendationsTable,
  alertEventsTable,
  binsTable,
  zonesTable,
  warehousesTable,
  salesOrdersTable,
  salesOrderLinesTable,
  pickingTasksTable,
} from "@workspace/db/schema";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// ── Helper: Calculate total stock per product ──────────────────────────────

async function getProductStock(productId: string): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${inventoryItemsTable.qtyOnHand}), 0)::int` })
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.productId, productId));
  return rows[0]?.total ?? 0;
}

// ── GET /replenishment/calculate/{productId} — Calculate reorder for one product ──

router.get("/replenishment/calculate/:productId", async (req, res) => {
  const { productId } = req.params;

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const currentStock = await getProductStock(productId);

  // Get last 30 days of outbound movement
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const movementRows = await db
    .select({
      totalOut: sql<number>`coalesce(sum(abs(${inventoryMovementsTable.quantity})), 0)::int`,
    })
    .from(inventoryMovementsTable)
    .where(
      and(
        eq(inventoryMovementsTable.productId, productId),
        eq(inventoryMovementsTable.movementType, "outbound"),
        gte(inventoryMovementsTable.createdAt, thirtyDaysAgo)
      )
    );

  const totalOut = movementRows[0]?.totalOut ?? 0;
  const avgDailyDemand = Math.round(totalOut / 30);

  // Default lead time from supplier avg or use 7 days
  const leadTimeDays = 7;
  const safetyStockDays = 7;
  const reorderPoint = Math.round(avgDailyDemand * leadTimeDays + avgDailyDemand * safetyStockDays);
  const suggestedOrderQty = Math.round(avgDailyDemand * leadTimeDays * 2);

  const daysUntilStockout = avgDailyDemand > 0 ? Math.floor(currentStock / avgDailyDemand) : null;
  const stockoutDate = daysUntilStockout ? new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null;

  res.json({
    productId,
    skuCode: product.skuCode,
    name: product.name,
    currentStock,
    avgDailyDemand,
    leadTimeDays,
    safetyStockDays,
    reorderPoint,
    suggestedOrderQty,
    daysUntilStockout,
    predictedStockoutDate: stockoutDate,
    belowReorderPoint: currentStock <= reorderPoint,
  });
});

// ── GET /replenishment/recommendations — All products needing replenishment ───

router.get("/replenishment/recommendations", async (_req, res) => {
  const products = await db.select().from(productsTable).where(eq(productsTable.isActive, true));

  const recommendations = await Promise.all(
    products.map(async (product) => {
      const currentStock = await getProductStock(product.id);
      const thresholds = await db
        .select()
        .from(reorderPointSettingsTable)
        .where(eq(reorderPointSettingsTable.productId, product.id))
        .limit(1);
      const settings = thresholds[0];

      const effectiveReorderPoint = settings?.reorderPoint ?? product.reorderThreshold;
      if (currentStock <= effectiveReorderPoint) {
        return {
          productId: product.id,
          skuCode: product.skuCode,
          name: product.name,
          currentStock,
          reorderPoint: effectiveReorderPoint,
          shortfall: Math.max(0, effectiveReorderPoint - currentStock),
          suggestedQty: settings?.suggestedOrderQty ?? (effectiveReorderPoint - currentStock) * 2,
          severity: currentStock === 0 ? "critical" : "warning",
          predictedStockoutDate: settings?.lastCalculatedAt,
        };
      }
      return null;
    })
  );

  const filtered = recommendations.filter(Boolean);
  res.json({
    generatedAt: new Date().toISOString(),
    totalRecommendations: filtered.length,
    critical: filtered.filter((r) => r.severity === "critical").length,
    warning: filtered.filter((r) => r.severity === "warning").length,
    recommendations: filtered,
  });
});

// ── GET /replenishment/generate-pr — Generate purchase requisition suggestions ─

router.get("/replenishment/generate-pr", async (_req, res) => {
  const products = await db.select().from(productsTable).where(eq(productsTable.isActive, true));

  const prLines = await Promise.all(
    products.map(async (product) => {
      const currentStock = await getProductStock(product.id);
      const settings = await db
        .select()
        .from(reorderPointSettingsTable)
        .where(eq(reorderPointSettingsTable.productId, product.id))
        .limit(1);

      const reorderPoint = settings[0]?.reorderPoint ?? product.reorderThreshold;
      if (currentStock <= reorderPoint) {
        const suggestedQty = settings[0]?.suggestedOrderQty ?? Math.max(reorderPoint - currentStock + reorderPoint, 1);
        return {
          productId: product.id,
          skuCode: product.skuCode,
          name: product.name,
          currentStock,
          reorderPoint,
          suggestedQty,
          unitCost: null, // would come from last PO or supplier catalog
        };
      }
      return null;
    })
  );

  const lines = prLines.filter(Boolean);
  res.json({
    generatedAt: new Date().toISOString(),
    lineCount: lines.length,
    lines,
  });
});

// ── GET /replenishment/forecast/:productId — Demand forecast for a product ──

router.get("/replenishment/forecast/:productId", async (req, res) => {
  const { productId } = req.params;
  const { days = "30" } = req.query;
  const forecastDays = parseInt(String(days), 10) || 30;

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  // Get daily outbound for last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const movementRows = await db
    .select({
      date: sql<string>`DATE(${inventoryMovementsTable.createdAt})`,
      quantity: sql<number>`sum(abs(${inventoryMovementsTable.quantity}))::int`,
    })
    .from(inventoryMovementsTable)
    .where(
      and(
        eq(inventoryMovementsTable.productId, productId),
        eq(inventoryMovementsTable.movementType, "outbound"),
        gte(inventoryMovementsTable.createdAt, thirtyDaysAgo)
      )
    )
    .groupBy(sql`DATE(${inventoryMovementsTable.createdAt})`)
    .orderBy(sql`DATE(${inventoryMovementsTable.createdAt})`);

  const dailyMap = new Map(movementRows.map((r) => [r.date, Number(r.quantity) || 0]));

  // Fill all days
  const dailyData: { date: string; actual: number; movingAvg7d: number; movingAvg30d: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    dailyData.push({ date: d, actual: dailyMap.get(d) ?? 0, movingAvg7d: 0, movingAvg30d: 0 });
  }

  // Calculate 7-day moving average
  for (let i = 6; i < 30; i++) {
    let sum = 0;
    for (let j = i - 6; j <= i; j++) { sum += dailyData[j].actual; }
    dailyData[i].movingAvg7d = Math.round(sum / 7);
  }

  // 30-day average
  const total = dailyData.reduce((s, d) => s + d.actual, 0);
  const avg30 = Math.round(total / 30);
  dailyData.forEach((d) => (d.movingAvg30d = avg30));

  const predicted = avg30; // simple: 30-day average
  const forecast = Array.from({ length: forecastDays }, (_, i) => {
    const d = new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return { date: d, predictedDemand: predicted, confidence: 0.6 }; // basic confidence model
  });

  res.json({
    productId,
    skuCode: product.skuCode,
    name: product.name,
    historical: dailyData,
    forecast,
    last30Avg: avg30,
    suggestedReorderPoint: Math.round(avg30 * 7 * 2),
    suggestedOrderQty: Math.round(avg30 * 7 * 4),
  });
});

// ── GET /alerts/inventory-anomalies ─ Detect anomalies ─────────────────────────

router.get("/alerts/inventory-anomalies", async (_req, res) => {
  const anomalies: any[] = [];

  // 1. Sudden stock drops: negative inventory / zero stock
  const negativeItems = await db
    .select({
      productId: inventoryItemsTable.productId,
      skuCode: productsTable.skuCode,
      name: productsTable.name,
      qty: inventoryItemsTable.qtyOnHand,
      binId: inventoryItemsTable.binId,
      binCode: binsTable.code,
    })
    .from(inventoryItemsTable)
    .innerJoin(productsTable, eq(inventoryItemsTable.productId, productsTable.id))
    .innerJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
    .where(sql`${inventoryItemsTable.qtyOnHand} < 0`);

  for (const item of negativeItems) {
    anomalies.push({
      type: "negative_inventory",
      severity: "critical",
      productId: item.productId,
      description: `Negative inventory detected for ${item.name}`,
      details: { qty: item.qty, bin: item.binCode, skuCode: item.skuCode },
    });
  }

  // 2. Zero stock items
  const zeroStockItems = await db
    .select({
      productId: inventoryItemsTable.productId,
      skuCode: productsTable.skuCode,
      name: productsTable.name,
      qty: inventoryItemsTable.qtyOnHand,
    })
    .from(inventoryItemsTable)
    .innerJoin(productsTable, eq(inventoryItemsTable.productId, productsTable.id))
    .where(eq(inventoryItemsTable.qtyOnHand, 0));

  const zeroStockIds = new Set(zeroStockItems.map(i => i.productId));
  const seen = new Set<string>();
  for (const item of zeroStockItems) {
    if (seen.has(item.productId)) continue;
    seen.add(item.productId);
    anomalies.push({
      type: "zero_stock",
      severity: "critical",
      productId: item.productId,
      description: `Zero stock for ${item.name}`,
      details: { skuCode: item.skuCode },
    });
  }

  // 3. Unpicked orders (orders in 'picking' status for >24h)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const unpickedOrders = await db
    .select({
      orderId: salesOrdersTable.id,
      orderNumber: salesOrdersTable.orderNumber,
      customerName: salesOrdersTable.customerName,
      updatedAt: salesOrdersTable.updatedAt,
      pickingTaskId: pickingTasksTable.id,
    })
    .from(salesOrdersTable)
    .leftJoin(pickingTasksTable, eq(salesOrdersTable.id, pickingTasksTable.orderId))
    .where(
      and(
        eq(salesOrdersTable.status, "picking"),
        lte(salesOrdersTable.updatedAt, yesterday)
      )
    );

  for (const order of unpickedOrders) {
    anomalies.push({
      type: "unpicked_order",
      severity: order.pickingTaskId ? "medium" : "high",
      referenceId: order.orderId,
      referenceType: "sales_order",
      description: `Order ${order.orderNumber} has been in 'picking' for over 24 hours`,
      details: { customerName: order.customerName, updatedAt: order.updatedAt },
    });
  }

  res.json({
    generatedAt: new Date().toISOString(),
    totalAnomalies: anomalies.length,
    critical: anomalies.filter((a) => a.severity === "critical").length,
    warning: anomalies.filter((a) => a.severity === "medium" || a.severity === "high").length,
    anomalies,
  });
});

// ── PUT /alerts/inventory-anomalies/{id}/resolve — Mark anomaly as resolved ───

router.put("/alerts/inventory-anomalies/:id/resolve", async (req, res) => {
  const { id } = req.params;
  const resolvedBy = req.auth?.userId || "system";

  const [updated] = await db
    .update(alertEventsTable)
    .set({ isRead: true, resolvedBy, resolvedAt: new Date() })
    .where(eq(alertEventsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Alert event not found" });
    return;
  }

  res.json({ resolved: true, alert: updated });
});

export default router;
