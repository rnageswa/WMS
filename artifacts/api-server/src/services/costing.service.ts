import { db } from "@workspace/db";
import {
  inventoryItemsTable,
  inventoryMovementsTable,
  inventoryValuationLogTable,
  productCostHistoryTable,
  poLandedCostsTable,
  purchaseOrderLinesTable,
} from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Calculate new Moving Average Cost.
 * Formula: (oldQty * oldAvgCost + receivedQty * unitCost) / (oldQty + receivedQty)
 */
export function calculateNewAvgCost(
  oldQty: number,
  oldAvgCost: number | null,
  receivedQty: number,
  unitCost: number
): number {
  const oldCost = oldAvgCost ?? 0;
  const totalQty = oldQty + receivedQty;
  if (totalQty === 0) return 0;
  return Math.round((((oldQty * oldCost) + (receivedQty * unitCost)) / totalQty) * 10000) / 10000;
}

/**
 * Calculate COGS for outbound movement.
 */
export function calculateCOGS(qty: number, avgCost: number | null): number {
  const cost = avgCost ?? 0;
  return Math.round(qty * cost * 100) / 100;
}

/**
 * Record a valuation log entry.
 */
export async function recordValuation(
  productId: string,
  movementId: string | null,
  qty: number,
  unitCost: number
): Promise<void> {
  const totalCost = Math.round(qty * unitCost * 100) / 100;
  await db.insert(inventoryValuationLogTable).values({
    productId,
    movementId,
    qty,
    unitCost: String(unitCost),
    totalCost: String(totalCost),
  });
}

/**
 * Update avgCost and inventoryValue on an inventory item after receiving stock.
 * Returns the new avgCost.
 */
export async function updateInventoryCostAfterReceipt(
  productId: string,
  binId: string,
  receivedQty: number,
  unitCost: number
): Promise<number> {
  const [item] = await db
    .select()
    .from(inventoryItemsTable)
    .where(
      and(
        eq(inventoryItemsTable.productId, productId),
        eq(inventoryItemsTable.binId, binId)
      )
    )
    .limit(1);

  const oldQty = item?.qtyOnHand ?? 0;
  const oldAvgCost = item?.avgCost ? parseFloat(item.avgCost) : null;

  const newAvgCost = calculateNewAvgCost(oldQty, oldAvgCost, receivedQty, unitCost);
  const newInventoryValue = Math.round((oldQty + receivedQty) * newAvgCost * 100) / 100;

  if (item) {
    await db
      .update(inventoryItemsTable)
      .set({
        avgCost: String(newAvgCost),
        inventoryValue: String(newInventoryValue),
        updatedAt: new Date(),
      })
      .where(eq(inventoryItemsTable.id, item.id));
  }

  return newAvgCost;
}

/**
 * Record outbound cost (COGS) when shipping/dispatching.
 * Updates inventoryValue after qty reduction.
 */
export async function recordOutboundCost(
  productId: string,
  binId: string,
  movementId: string,
  qty: number
): Promise<number> {
  const [item] = await db
    .select()
    .from(inventoryItemsTable)
    .where(
      and(
        eq(inventoryItemsTable.productId, productId),
        eq(inventoryItemsTable.binId, binId)
      )
    )
    .limit(1);

  const avgCost = item?.avgCost ? parseFloat(item.avgCost) : 0;
  const cogs = calculateCOGS(qty, avgCost);

  // Record valuation log (negative qty for outbound)
  await recordValuation(productId, movementId, -qty, avgCost);

  // Update inventory value
  if (item) {
    const newQty = item.qtyOnHand - qty;
    const newValue = Math.round(newQty * avgCost * 100) / 100;
    await db
      .update(inventoryItemsTable)
      .set({
        inventoryValue: String(newValue),
        updatedAt: new Date(),
      })
      .where(eq(inventoryItemsTable.id, item.id));
  }

  return cogs;
}

// ── Landed Cost Functions ──────────────────────────────────────────────────────

export interface LandedCostInput {
  costType: "freight" | "insurance" | "duties" | "handling" | "overhead";
  amount: number;
  allocationMethod?: "value" | "weight" | "quantity" | "equal";
  currency?: string;
}

/**
 * Add landed costs to a PO and allocate to lines by value ratio.
 */
export async function addLandedCosts(poId: string, costs: LandedCostInput[]): Promise<void> {
  for (const cost of costs) {
    await db.insert(poLandedCostsTable).values({
      poId,
      costType: cost.costType,
      amount: String(cost.amount),
      allocationMethod: cost.allocationMethod ?? "value",
      currency: cost.currency ?? "USD",
    });
  }

  // Allocate to lines
  const totalLanded = costs.reduce((s, c) => s + c.amount, 0);
  if (totalLanded <= 0) return;

  const lines = await db
    .select()
    .from(purchaseOrderLinesTable)
    .where(eq(purchaseOrderLinesTable.poId, poId));

  const totalLineValue = lines.reduce((s, l) => {
    const cost = l.unitCost ? parseFloat(l.unitCost) : 0;
    return s + l.qtyOrdered * cost;
  }, 0);

  for (const line of lines) {
    const lineValue = (line.unitCost ? parseFloat(line.unitCost) : 0) * line.qtyOrdered;
    const ratio = totalLineValue > 0 ? lineValue / totalLineValue : 1 / lines.length;
    const allocated = Math.round(totalLanded * ratio * 10000) / 10000;
    const existing = line.allocatedLandedCost ? parseFloat(line.allocatedLandedCost) : 0;
    await db
      .update(purchaseOrderLinesTable)
      .set({ allocatedLandedCost: String(existing + allocated) })
      .where(eq(purchaseOrderLinesTable.id, line.id));
  }
}

/**
 * Get landed costs for a PO.
 */
export async function getLandedCosts(poId: string) {
  const costs = await db
    .select()
    .from(poLandedCostsTable)
    .where(eq(poLandedCostsTable.poId, poId));
  return costs.map((c) => ({
    ...c,
    amount: parseFloat(c.amount),
  }));
}

/**
 * Calculate effective unit cost including allocated landed cost.
 */
export function effectiveUnitCost(unitCost: number, allocatedLandedCost: number, qtyOrdered: number): number {
  if (qtyOrdered <= 0) return unitCost;
  const perUnitLanded = allocatedLandedCost / qtyOrdered;
  return Math.round((unitCost + perUnitLanded) * 10000) / 10000;
}

// ── Copy Landed Costs ────────────────────────────────────────────────────────

/**
 * Copy landed costs from one PO to another.
 */
export async function copyLandedCostsFromPO(fromPoId: string, toPoId: string): Promise<number> {
  const sourceCosts = await getLandedCosts(fromPoId);
  if (sourceCosts.length === 0) return 0;

  for (const cost of sourceCosts) {
    await db.insert(poLandedCostsTable).values({
      poId: toPoId,
      costType: cost.costType,
      amount: String(cost.amount),
      allocationMethod: cost.allocationMethod,
      currency: cost.currency,
    });
  }

  // Re-allocate to target PO lines
  const totalLanded = sourceCosts.reduce((s, c) => s + c.amount, 0);
  const lines = await db
    .select()
    .from(purchaseOrderLinesTable)
    .where(eq(purchaseOrderLinesTable.poId, toPoId));

  const totalLineValue = lines.reduce((s, l) => {
    const cost = l.unitCost ? parseFloat(l.unitCost) : 0;
    return s + l.qtyOrdered * cost;
  }, 0);

  for (const line of lines) {
    const lineValue = (line.unitCost ? parseFloat(line.unitCost) : 0) * line.qtyOrdered;
    const ratio = totalLineValue > 0 ? lineValue / totalLineValue : 1 / lines.length;
    const allocated = Math.round(totalLanded * ratio * 10000) / 10000;
    await db
      .update(purchaseOrderLinesTable)
      .set({ allocatedLandedCost: String(allocated) })
      .where(eq(purchaseOrderLinesTable.id, line.id));
  }

  return sourceCosts.length;
}

// ── Cost History Functions ────────────────────────────────────────────────────

/**
 * Record a cost history snapshot.
 */
export async function recordCostHistory(
  productId: string,
  avgCost: number,
  totalQty: number,
  sourceType: "receipt" | "adjustment" | "manual" | "standard",
  sourceId?: string,
  standardCost?: number
): Promise<void> {
  await db.insert(productCostHistoryTable).values({
    productId,
    avgCost: String(avgCost),
    standardCost: standardCost !== undefined ? String(standardCost) : null,
    totalQty,
    sourceType,
    sourceId: sourceId ?? null,
  });
}
