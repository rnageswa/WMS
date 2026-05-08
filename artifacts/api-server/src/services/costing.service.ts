import { db } from "@workspace/db";
import {
  inventoryItemsTable,
  inventoryMovementsTable,
  inventoryValuationLogTable,
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
