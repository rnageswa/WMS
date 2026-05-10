// ── Replenishment Engine V2 ─────────────────────────────────────────────────────

import { db } from "@workspace/db";
import {
  productsTable, inventoryItemsTable, warehousesTable, suppliersTable,
} from "@workspace/db/schema";
import {
  replenishmentPoliciesTable, inventoryTargetsTable, distributionPlansTable, supplierPerformanceTable,
} from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "../../lib/logger";
import { classifyDemand } from "./demand-classifier";
import { calculateSafetyStock } from "./safety-stock";
import { calculateEOQ } from "./eoq";
import { calculateSupplierPerformance } from "./supplier-aware";
import { inventoryRepository } from "../../repositories/inventory.repository";
import { productRepository } from "../../repositories/product.repository";

export interface ReplenishmentRecommendation {
  productId: string; skuCode: string; productName: string; currentStock: number;
  demandType: string; safetyStock: number; eoq: number; reorderPoint: number;
  suggestedQty: number; suggestedAction: "create_po" | "transfer" | "monitor";
  severity: "critical" | "warning" | "ok";
  supplierId?: string; supplierName?: string; supplierReliability?: number;
  notes: string[];
}

export interface TransferRecommendation {
  productId: string; skuCode: string;
  fromWarehouseId: string; fromWarehouseName: string;
  toWarehouseId: string; toWarehouseName: string;
  transferQty: number; reason: string;
}

export interface ReplenishmentRunResult {
  runAt: string; totalProducts: number; critical: number; warning: number; ok: number;
  recommendations: ReplenishmentRecommendation[]; transfers: TransferRecommendation[];
}

export async function runReplenishmentCheck(): Promise<ReplenishmentRunResult> {
  logger.info("Starting replenishment engine V2 run");
  const startTime = Date.now();
  const products = await productRepository.findAll({ isActive: true });
  const recommendations: ReplenishmentRecommendation[] = [];

  for (const product of products) {
    try {
      const rec = await analyzeProduct(product.id);
      if (rec) recommendations.push(rec);
    } catch (err) {
      logger.error({ err, productId: product.id }, "Replenishment analysis failed");
    }
  }

  const transfers = await findTransferOpportunities();
  const duration = Date.now() - startTime;
  const result: ReplenishmentRunResult = {
    runAt: new Date().toISOString(), totalProducts: products.length,
    critical: recommendations.filter((r) => r.severity === "critical").length,
    warning: recommendations.filter((r) => r.severity === "warning").length,
    ok: recommendations.filter((r) => r.severity === "ok").length,
    recommendations, transfers,
  };
  logger.info({ duration: `${duration}ms`, total: result.totalProducts, critical: result.critical, warning: result.warning, transfers: result.transfers.length }, "Replenishment engine V2 completed");
  return result;
}

async function analyzeProduct(productId: string): Promise<ReplenishmentRecommendation | null> {
  const [product] = await productRepository.findById(productId);
  if (!product) return null;
  const currentStock = await inventoryRepository.getTotalStockForProduct(productId);
  const demand = await classifyDemand(productId);

  let [policy] = await db.select().from(replenishmentPoliciesTable).where(eq(replenishmentPoliciesTable.productId, productId)).limit(1);
  if (!policy) {
    const [created] = await db.insert(replenishmentPoliciesTable).values({
      productId, demandType: demand.demandType, avgDailyDemand: String(demand.avgDailyDemand), demandStdDev: String(demand.demandStdDev), demandVolatility: String(demand.cv),
    }).returning();
    policy = created;
  }

  const safety = calculateSafetyStock({
    serviceLevel: parseFloat(policy.serviceLevel?.toString() || "0.95"),
    avgDailyDemand: demand.avgDailyDemand, demandStdDev: demand.demandStdDev,
    avgLeadTimeDays: parseFloat(policy.avgLeadTimeDays?.toString() || "7"),
    leadTimeStdDev: parseFloat(policy.leadTimeStdDev?.toString() || "0"),
  });

  const annualDemand = demand.avgDailyDemand * 365;
  const unitCost = parseFloat(policy.unitCost?.toString() || "0");
  const eoqResult = calculateEOQ({
    annualDemand, orderingCost: parseFloat(policy.orderingCost?.toString() || "50"),
    unitCost: unitCost || 1, carryingCostPercent: parseFloat(policy.carryingCostPercent?.toString() || "0.25"),
    moq: policy.moq || undefined, cartonQty: policy.cartonQty || undefined, palletQty: policy.palletQty || undefined,
  });

  const notes: string[] = [];
  let severity: ReplenishmentRecommendation["severity"];
  let suggestedAction: ReplenishmentRecommendation["suggestedAction"];
  let suggestedQty = 0;

  if (currentStock === 0) { severity = "critical"; suggestedAction = "create_po"; suggestedQty = Math.max(eoqResult.roundedEOQ, policy.reorderQty || 0); notes.push("ZERO STOCK"); }
  else if (currentStock <= safety.reorderPoint) { severity = "warning"; suggestedAction = "create_po"; suggestedQty = Math.max(eoqResult.roundedEOQ, policy.reorderQty || 0); notes.push(`Stock (${currentStock}) <= reorder point (${safety.reorderPoint})`); }
  else if (currentStock <= safety.reorderPoint * 1.5) { severity = "ok"; suggestedAction = "monitor"; notes.push(`Stock (${currentStock}) approaching reorder point`); }
  else { severity = "ok"; suggestedAction = "monitor"; }

  switch (demand.demandType) {
    case "intermittent": notes.push("Intermittent demand — use Croston forecasting"); break;
    case "erratic": notes.push("Erratic demand — increase safety stock buffer"); break;
    case "seasonal": notes.push("Seasonal demand — review forecast curve"); break;
    case "new_item": notes.push("New item — limited history, manual review"); break;
  }

  const [bestSupplier] = await db.select().from(supplierPerformanceTable).orderBy(sql`${supplierPerformanceTable.reliabilityScore} DESC NULLS LAST`).limit(1);
  let supplierId: string | undefined, supplierName: string | undefined, supplierReliability: number | undefined;
  if (bestSupplier?.supplierId) {
    supplierId = bestSupplier.supplierId;
    supplierReliability = parseFloat(bestSupplier.reliabilityScore?.toString() || "0");
    const [sup] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, supplierId!)).limit(1);
    supplierName = sup?.name;
  }

  return {
    productId, skuCode: product.skuCode, productName: product.name, currentStock,
    demandType: demand.demandType, safetyStock: safety.safetyStock, eoq: eoqResult.roundedEOQ,
    reorderPoint: safety.reorderPoint, suggestedQty, suggestedAction, severity,
    supplierId, supplierName, supplierReliability, notes,
  };
}

async function findTransferOpportunities(): Promise<TransferRecommendation[]> {
  const transfers: TransferRecommendation[] = [];
  const warehouses = await db.select().from(warehousesTable).where(eq(warehousesTable.isActive, true));
  if (warehouses.length < 2) return transfers;
  const products = await productRepository.findAll({ isActive: true });
  for (const product of products) {
    const stockByWh = await inventoryRepository.getStockByWarehouse(product.id);
    const excess = stockByWh.filter((s) => s.total > 50);
    const shortage = stockByWh.filter((s) => s.total < 10);
    for (const sh of shortage) {
      for (const ex of excess) {
        if (ex.warehouseId === sh.warehouseId) continue;
        const transferQty = Math.min(ex.total - 50, 10 - sh.total);
        if (transferQty > 0) transfers.push({ productId: product.id, skuCode: product.skuCode, fromWarehouseId: ex.warehouseId, fromWarehouseName: ex.warehouseName, toWarehouseId: sh.warehouseId, toWarehouseName: sh.warehouseName, transferQty, reason: `Excess at ${ex.warehouseName} (${ex.total}), shortage at ${sh.warehouseName} (${sh.total})` });
      }
    }
  }
  return transfers;
}

export async function updateAllSupplierPerformance(): Promise<void> {
  const { suppliersTable } = await import("@workspace/db/schema");
  const suppliers = await db.select().from(suppliersTable).where(eq(suppliersTable.isActive, true));
  for (const supplier of suppliers) { await calculateSupplierPerformance(supplier.id); }
  logger.info({ count: suppliers.length }, "Supplier performance updated for all");
}
