// ── Planning Engine ─────────────────────────────────────────────────────────────
// Inventory planning, procurement planning, distribution planning.
// Computes: days of supply, weeks of cover, ATP, projected inventory balance.

import { db } from "@workspace/db";
import {
  productsTable,
  inventoryItemsTable,
  purchaseOrdersTable,
  purchaseOrderLinesTable,
  salesOrdersTable,
  salesOrderLinesTable,
  warehousesTable,
  suppliersTable,
  binsTable,
  zonesTable,
} from "@workspace/db/schema";
import {
  inventoryPlansTable,
  distributionPlansTable,
  procurementForecastsTable,
  supplierPerformanceTable,
} from "@workspace/db/schema";
import { eq, and, sql, gte, lte, desc, isNull, not } from "drizzle-orm";
import { logger } from "../../lib/logger";
import { inventoryRepository } from "../../repositories/inventory.repository";
import { forecastProduct } from "../forecasting/engine";

// ── Inventory Plan ──────────────────────────────────────────────────────────────

export interface InventoryPlanResult {
  productId: string;
  skuCode: string;
  warehouseId: string;
  warehouseName: string;
  startingStock: number;
  projectedInbound: number;   // from open POs
  projectedOutbound: number;  // from open SOs
  projectedEndingStock: number;
  atp: number;                // available to promise
  daysOfSupply: number;
  weeksOfCover: number;
  stockoutRisk: "none" | "low" | "medium" | "high" | "critical";
  projectedStockoutDate: string | null;
}

export async function generateInventoryPlans(): Promise<InventoryPlanResult[]> {
  const products = await db.select().from(productsTable).where(eq(productsTable.isActive, true));
  const warehouses = await db.select().from(warehousesTable).where(eq(warehousesTable.isActive, true));
  const plans: InventoryPlanResult[] = [];

  for (const product of products) {
    for (const warehouse of warehouses) {
      try {
        const plan = await planProductWarehouse(product.id, warehouse.id, product.skuCode, warehouse.name);
        if (plan) plans.push(plan);
      } catch (err) {
        logger.error({ err, productId: product.id, warehouseId: warehouse.id }, "Inventory plan failed");
      }
    }
  }

  // Persist plans
  for (const plan of plans) {
    await db.insert(inventoryPlansTable).values({
      productId: plan.productId,
      warehouseId: plan.warehouseId,
      planDate: new Date().toISOString().slice(0, 10),
      planHorizonDays: 30,
      startingStock: plan.startingStock,
      projectedInbound: plan.projectedInbound,
      projectedOutbound: plan.projectedOutbound,
      projectedEndingStock: plan.projectedEndingStock,
      atp: plan.atp,
      daysOfSupply: String(plan.daysOfSupply),
      weeksOfCover: String(plan.weeksOfCover),
      stockoutRisk: plan.stockoutRisk,
      projectedStockoutDate: plan.projectedStockoutDate,
    }).onConflictDoUpdate({
      target: [inventoryPlansTable.productId, inventoryPlansTable.warehouseId],
      set: {
        startingStock: plan.startingStock,
        projectedInbound: plan.projectedInbound,
        projectedOutbound: plan.projectedOutbound,
        projectedEndingStock: plan.projectedEndingStock,
        atp: plan.atp,
        daysOfSupply: String(plan.daysOfSupply),
        weeksOfCover: String(plan.weeksOfCover),
        stockoutRisk: plan.stockoutRisk,
        projectedStockoutDate: plan.projectedStockoutDate,
        updatedAt: new Date(),
      },
    });
  }

  return plans;
}

async function planProductWarehouse(
  productId: string,
  warehouseId: string,
  skuCode: string,
  warehouseName: string
): Promise<InventoryPlanResult | null> {
  // Current stock at this warehouse (join through bins → zones → warehouses)
  const stockRows = await db
    .select({ total: sql<number>`coalesce(sum(${inventoryItemsTable.qtyOnHand}), 0)::int` })
    .from(inventoryItemsTable)
    .leftJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
    .leftJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
    .where(and(eq(inventoryItemsTable.productId, productId), eq(zonesTable.warehouseId, warehouseId)));

  const startingStock = stockRows[0]?.total ?? 0;

  // Projected inbound (open POs)
  const inboundRows = await db
    .select({
      total: sql<number>`coalesce(sum(${purchaseOrderLinesTable.qtyOrdered} - ${purchaseOrderLinesTable.qtyReceived}), 0)::int`,
    })
    .from(purchaseOrderLinesTable)
    .innerJoin(purchaseOrdersTable, eq(purchaseOrderLinesTable.poId, purchaseOrdersTable.id))
    .where(and(
      eq(purchaseOrderLinesTable.productId, productId),
      eq(purchaseOrdersTable.status, "ordered"),
    ));
  const projectedInbound = inboundRows[0]?.total ?? 0;

  // Projected outbound (open SOs)
  const outboundRows = await db
    .select({
      total: sql<number>`coalesce(sum(${salesOrderLinesTable.qtyOrdered} - ${salesOrderLinesTable.qtyShipped}), 0)::int`,
    })
    .from(salesOrderLinesTable)
    .innerJoin(salesOrdersTable, eq(salesOrderLinesTable.orderId, salesOrdersTable.id))
    .where(and(
      eq(salesOrderLinesTable.productId, productId),
      sql`${salesOrdersTable.status} IN ('confirmed', 'picking', 'picking_complete', 'packed')`,
    ));
  const projectedOutbound = outboundRows[0]?.total ?? 0;

  const projectedEndingStock = startingStock + projectedInbound - projectedOutbound;

  // ATP = starting stock + inbound - committed outbound
  const atp = Math.max(0, projectedEndingStock);

  // Days of supply (based on 30-day avg demand)
  const totalOutbound30 = await inventoryRepository.getTotalOutbound(productId, 30);
  const avgDailyDemand = totalOutbound30 / 30;
  const daysOfSupply = avgDailyDemand > 0 ? projectedEndingStock / avgDailyDemand : 999;
  const weeksOfCover = daysOfSupply / 7;

  // Stockout risk
  let stockoutRisk: InventoryPlanResult["stockoutRisk"];
  let projectedStockoutDate: string | null = null;

  if (daysOfSupply > 30) {
    stockoutRisk = "none";
  } else if (daysOfSupply > 14) {
    stockoutRisk = "low";
  } else if (daysOfSupply > 7) {
    stockoutRisk = "medium";
  } else if (daysOfSupply > 0) {
    stockoutRisk = "high";
    const stockoutDays = Math.floor(daysOfSupply);
    projectedStockoutDate = new Date(Date.now() + stockoutDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  } else {
    stockoutRisk = "critical";
    projectedStockoutDate = new Date().toISOString().slice(0, 10);
  }

  return {
    productId,
    skuCode,
    warehouseId,
    warehouseName,
    startingStock,
    projectedInbound,
    projectedOutbound,
    projectedEndingStock,
    atp,
    daysOfSupply: Math.round(daysOfSupply * 100) / 100,
    weeksOfCover: Math.round(weeksOfCover * 100) / 100,
    stockoutRisk,
    projectedStockoutDate,
  };
}

// ── Distribution Plan (Inter-Warehouse) ─────────────────────────────────────────

export interface DistributionPlanResult {
  productId: string;
  skuCode: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  transferQty: number;
  reason: string;
}

export async function generateDistributionPlans(): Promise<DistributionPlanResult[]> {
  const plans = await db
    .select()
    .from(inventoryPlansTable)
    .where(and(
      eq(inventoryPlansTable.planDate, new Date().toISOString().slice(0, 10)),
    ));

  const excessPlans = plans.filter((p) => p.stockoutRisk === "none" && (p.projectedEndingStock || 0) > 100);
  const shortagePlans = plans.filter((p) => ["high", "critical"].includes(p.stockoutRisk || ""));

  const distributions: DistributionPlanResult[] = [];

  for (const shortage of shortagePlans) {
    // Find nearest warehouse with excess
    const excess = excessPlans.find((e) => e.productId === shortage.productId && e.warehouseId !== shortage.warehouseId);
    if (!excess) continue;

    const needed = Math.abs(shortage.projectedEndingStock || 0) + 20; // buffer
    const available = (excess.projectedEndingStock || 0) - 50; // keep min 50
    const transferQty = Math.min(needed, available);

    if (transferQty <= 0) continue;

    const [fromWh, toWh] = await Promise.all([
      db.select().from(warehousesTable).where(eq(warehousesTable.id, excess.warehouseId!)).limit(1),
      db.select().from(warehousesTable).where(eq(warehousesTable.id, shortage.warehouseId!)).limit(1),
    ]);

    const [prod] = await db.select().from(productsTable).where(eq(productsTable.id, shortage.productId!)).limit(1);

    distributions.push({
      productId: shortage.productId!,
      skuCode: prod?.skuCode || "",
      fromWarehouseId: excess.warehouseId!,
      fromWarehouseName: fromWh[0]?.name || "",
      toWarehouseId: shortage.warehouseId!,
      toWarehouseName: toWh[0]?.name || "",
      transferQty,
      reason: `Stockout risk at ${toWh[0]?.name} (${shortage.stockoutRisk}), excess at ${fromWh[0]?.name}`,
    });
  }

  // Persist
  for (const d of distributions) {
    await db.insert(distributionPlansTable).values({
      productId: d.productId,
      fromWarehouseId: d.fromWarehouseId,
      toWarehouseId: d.toWarehouseId,
      transferQty: d.transferQty,
      reason: d.reason,
      status: "suggested",
    }).onConflictDoNothing();
  }

  return distributions;
}

// ── Procurement Forecast ────────────────────────────────────────────────────────

export interface ProcurementForecastResult {
  productId: string;
  skuCode: string;
  supplierId: string;
  supplierName: string;
  forecastedQty: number;
  unitCost: number;
  totalCost: number;
  confidence: number;
}

export async function generateProcurementForecasts(): Promise<ProcurementForecastResult[]> {
  const plans = await db
    .select()
    .from(inventoryPlansTable)
    .where(sql`${inventoryPlansTable.stockoutRisk} IN ('high', 'critical')`);

  const forecasts: ProcurementForecastResult[] = [];

  for (const plan of plans) {
    const forecast = await forecastProduct(plan.productId!, 90);
    if (!forecast) continue;

    // Find best supplier
    const [supplier] = await db
      .select()
      .from(supplierPerformanceTable)
      .where(sql`${supplierPerformanceTable.supplierId} IS NOT NULL`)
      .orderBy(desc(supplierPerformanceTable.reliabilityScore))
      .limit(1);

    const [sup] = supplier?.supplierId
      ? await db.select().from(suppliersTable).where(eq(suppliersTable.id, supplier.supplierId)).limit(1)
      : [];

    const forecastedQty = forecast.forecasts.days30;
    const unitCost = 0; // would come from supplier catalog

    forecasts.push({
      productId: plan.productId!,
      skuCode: forecast.skuCode,
      supplierId: supplier?.supplierId || "",
      supplierName: sup?.name || "Unknown",
      forecastedQty,
      unitCost,
      totalCost: forecastedQty * unitCost,
      confidence: forecast.confidence,
    });
  }

  return forecasts;
}

// ── Main Planning Cycle ─────────────────────────────────────────────────────────

export async function runPlanningCycle(): Promise<{
  inventoryPlans: number;
  distributionPlans: number;
  procurementForecasts: number;
}> {
  logger.info("Starting planning cycle");

  const inventoryPlans = await generateInventoryPlans();
  const distributionPlans = await generateDistributionPlans();
  const procurementForecasts = await generateProcurementForecasts();

  logger.info(
    {
      inventoryPlans: inventoryPlans.length,
      distributionPlans: distributionPlans.length,
      procurementForecasts: procurementForecasts.length,
    },
    "Planning cycle completed"
  );

  return {
    inventoryPlans: inventoryPlans.length,
    distributionPlans: distributionPlans.length,
    procurementForecasts: procurementForecasts.length,
  };
}
