import { Router } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  inventoryItemsTable,
  inventoryMovementsTable,
  binsTable,
  zonesTable,
  warehousesTable,
  salesOrdersTable,
  salesOrderLinesTable,
  pickingTasksTable,
  purchaseOrdersTable,
  purchaseOrderLinesTable,
  poStatusHistoryTable,
  suppliersTable,
} from "@workspace/db/schema";
import {
  reorderPointSettingsTable,
  demandHistoryTable,
  replenishmentRecommendationsTable,
  alertEventsTable,
} from "@workspace/db/schema";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// ── Helper: Generate a PO number ───────────────────────────────────────────

function generatePoNumber() {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PO-${yy}${mm}-${rand}`;
}

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

  const filtered = recommendations.filter((r): r is NonNullable<typeof r> => r != null);
  res.json({
    generatedAt: new Date().toISOString(),
    totalRecommendations: filtered.length,
    critical: filtered.filter((r) => r.severity === "critical").length,
    warning: filtered.filter((r) => r.severity === "warning").length,
    recommendations: filtered,
  });
});

// ── POST /replenishment/generate-pr — Create draft POs for products below reorder point ─

router.post("/replenishment/generate-pr", async (_req, res) => {
  // 1. Find all active products below reorder point
  const products = await db.select().from(productsTable).where(eq(productsTable.isActive, true));

  const belowThreshold = await Promise.all(
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
          suggestedQty,
        };
      }
      return null;
    })
  );

  const lines = belowThreshold.filter(Boolean) as { productId: string; suggestedQty: number }[];

  if (lines.length === 0) {
    res.json({ createdCount: 0, poIds: [] });
    return;
  }

  // 2. Find most recent PO per product to determine supplier and unit cost
  const productsWithSupplier = await Promise.all(
    lines.map(async (line) => {
      const lastPORows = await db
        .select({
          supplierId: purchaseOrdersTable.supplierId,
          supplierName: purchaseOrdersTable.supplierName,
          unitCost: purchaseOrderLinesTable.unitCost,
        })
        .from(purchaseOrderLinesTable)
        .innerJoin(purchaseOrdersTable, eq(purchaseOrderLinesTable.poId, purchaseOrdersTable.id))
        .where(eq(purchaseOrderLinesTable.productId, line.productId))
        .orderBy(desc(purchaseOrdersTable.createdAt))
        .limit(1);

      return {
        ...line,
        supplierId: lastPORows[0]?.supplierId ?? null,
        supplierName: lastPORows[0]?.supplierName ?? null,
        unitCost: lastPORows[0]?.unitCost ?? null,
      };
    })
  );

  // 3. Group by supplier
  const grouped = new Map<string, typeof productsWithSupplier>();
  for (const item of productsWithSupplier) {
    const key = item.supplierId ?? item.supplierName ?? "unknown";
    const existing = grouped.get(key) ?? [];
    existing.push(item);
    grouped.set(key, existing);
  }

  // 4. Create draft PO per supplier group
  const createdPoIds: string[] = [];

  for (const [, items] of grouped) {
    const firstItem = items[0];
    const poNumber = generatePoNumber();

    const [po] = await db
      .insert(purchaseOrdersTable)
      .values({
        poNumber,
        status: "draft",
        supplierId: firstItem.supplierId,
        supplierName: firstItem.supplierName ?? "Automatic Reorder",
      })
      .returning();

    if (po) {
      createdPoIds.push(po.id);

      await db.insert(purchaseOrderLinesTable).values(
        items.map((item) => ({
          poId: po.id,
          productId: item.productId,
          qtyOrdered: item.suggestedQty,
          unitCost: item.unitCost,
        }))
      );

      await db.insert(poStatusHistoryTable).values({
        poId: po.id,
        event: "created",
        note: "Auto-generated from Smart Replenishment",
      });
    }
  }

  res.json({ createdCount: createdPoIds.length, poIds: createdPoIds });
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

  const seenZero = new Set<string>();
  for (const item of zeroStockItems) {
    if (seenZero.has(item.productId)) continue;
    seenZero.add(item.productId);
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
  const resolvedBy = (req as any).auth?.userId || "system";

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

// ── GET /replenishment/stockout-predictions — Predict stockouts ────────────────

router.get("/replenishment/stockout-predictions", async (_req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get current stock levels per product
  const stockRows = await db
    .select({
      productId: productsTable.id,
      skuCode: productsTable.skuCode,
      name: productsTable.name,
      category: productsTable.category,
      unitPrice: productsTable.unitPrice,
      reorderThreshold: productsTable.reorderThreshold,
      totalStock: sql<number>`coalesce(sum(${inventoryItemsTable.qtyOnHand}), 0)::numeric`,
    })
    .from(productsTable)
    .leftJoin(inventoryItemsTable, eq(productsTable.id, inventoryItemsTable.productId))
    .where(eq(productsTable.isActive, true))
    .groupBy(productsTable.id, productsTable.skuCode, productsTable.name, productsTable.category, productsTable.unitPrice, productsTable.reorderThreshold);

  // Get 30-day outbound demand per product
  const demandRows = await db
    .select({
      productId: inventoryMovementsTable.productId,
      totalOutbound: sql<number>`coalesce(sum(abs(${inventoryMovementsTable.quantity})), 0)::numeric`,
    })
    .from(inventoryMovementsTable)
    .where(and(
      eq(inventoryMovementsTable.movementType, "outbound"),
      gte(inventoryMovementsTable.createdAt, thirtyDaysAgo)
    ))
    .groupBy(inventoryMovementsTable.productId);

  const demandMap = new Map<string, number>();
  demandRows.forEach(r => demandMap.set(r.productId, Number(r.totalOutbound || 0)));

  const predictions = stockRows
    .filter(r => Number(r.totalStock) > 0)
    .map(r => {
      const stock = Number(r.totalStock);
      const dailyDemand = (demandMap.get(r.productId) || 0) / 30;
      const daysUntilStockout = dailyDemand > 0 ? Math.floor(stock / dailyDemand) : 999;
      const severity = daysUntilStockout <= 3 ? "critical" : daysUntilStockout <= 7 ? "warning" : daysUntilStockout <= 14 ? "watch" : "normal";

      return {
        productId: r.productId,
        skuCode: r.skuCode,
        name: r.name,
        category: r.category,
        currentStock: stock,
        reorderThreshold: Number(r.reorderThreshold || 0),
        dailyDemand: Number(dailyDemand.toFixed(2)),
        daysUntilStockout,
        severity,
        estimatedStockoutDate: dailyDemand > 0
          ? new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
          : null,
      };
    })
    .filter(p => p.severity !== "normal")
    .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

  res.json({
    generatedAt: new Date().toISOString(),
    totalPredictions: predictions.length,
    critical: predictions.filter(p => p.severity === "critical").length,
    warning: predictions.filter(p => p.severity === "warning").length,
    watch: predictions.filter(p => p.severity === "watch").length,
    predictions,
  });
});

// ── GET /reports/abc-analysis — ABC analysis by revenue ────────────────────────

router.get("/reports/abc-analysis", async (_req, res) => {
  // Get 12 months of sales data
  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const revenueRows = await db
    .select({
      productId: salesOrderLinesTable.productId,
      skuCode: productsTable.skuCode,
      name: productsTable.name,
      category: productsTable.category,
      revenue: sql<number>`sum(${salesOrderLinesTable.unitPrice} * ${salesOrderLinesTable.qtyOrdered})::numeric`,
      pickCount: sql<number>`sum(${salesOrderLinesTable.qtyPicked})`,
    })
    .from(salesOrderLinesTable)
    .innerJoin(productsTable, eq(salesOrderLinesTable.productId, productsTable.id))
    .innerJoin(salesOrdersTable, eq(salesOrderLinesTable.orderId, salesOrdersTable.id))
    .where(gte(salesOrdersTable.createdAt, twelveMonthsAgo))
    .groupBy(salesOrderLinesTable.productId, productsTable.skuCode, productsTable.name, productsTable.category)
    .orderBy(sql`sum(${salesOrderLinesTable.unitPrice} * ${salesOrderLinesTable.qtyOrdered}) desc`);

  const totalRevenue = revenueRows.reduce((sum, r) => sum + Number(r.revenue || 0), 0);
  let cumulRevenue = 0;
  let cumulPicks = 0;
  const totalPicks = revenueRows.reduce((sum, r) => sum + Number(r.pickCount || 0), 0);

  const analyzed = revenueRows.map((r, i) => {
    const rev = Number(r.revenue || 0);
    const picks = Number(r.pickCount || 0);
    cumulRevenue += rev;
    cumulPicks += picks;
    const revPct = totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0;
    const cumRevPct = totalRevenue > 0 ? (cumulRevenue / totalRevenue) * 100 : 0;
    const pickPct = totalPicks > 0 ? (picks / totalPicks) * 100 : 0;
    const cumPickPct = totalPicks > 0 ? (cumulPicks / totalPicks) * 100 : 0;

    return {
      productId: r.productId,
      skuCode: r.skuCode,
      name: r.name,
      category: r.category,
      revenue: rev,
      revenuePercent: Number(revPct.toFixed(2)),
      cumulativeRevenuePercent: Number(cumRevPct.toFixed(2)),
      pickCount: picks,
      pickPercent: Number(pickPct.toFixed(2)),
      cumulativePickPercent: Number(cumPickPct.toFixed(2)),
      revenueClass: cumRevPct <= 80 ? "A" : cumRevPct <= 95 ? "B" : "C",
      velocityClass: cumPickPct <= 80 ? "A" : cumPickPct <= 95 ? "B" : "C",
      combinedClass: `${cumRevPct <= 80 ? "A" : cumRevPct <= 95 ? "B" : "C"}${cumPickPct <= 80 ? "A" : cumPickPct <= 95 ? "B" : "C"}`,
    };
  });

  // Summary counts
  const aRev = analyzed.filter(r => r.revenueClass === "A").length;
  const bRev = analyzed.filter(r => r.revenueClass === "B").length;
  const cRev = analyzed.filter(r => r.revenueClass === "C").length;
  const aVel = analyzed.filter(r => r.velocityClass === "A").length;
  const bVel = analyzed.filter(r => r.velocityClass === "B").length;
  const cVel = analyzed.filter(r => r.velocityClass === "C").length;

  res.json({
    generatedAt: new Date().toISOString(),
    totalProducts: analyzed.length,
    totalRevenue,
    totalUnitsMoved: totalPicks,
    summary: {
      revenueClass: { A: aRev, B: bRev, C: cRev },
      velocityClass: { A: aVel, B: bVel, C: cVel },
    },
    products: analyzed,
  });
});

export default router;
