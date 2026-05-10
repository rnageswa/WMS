// ── Anomaly Detector ────────────────────────────────────────────────────────────

import { db } from "@workspace/db";
import {
  inventoryItemsTable, productsTable, binsTable,
  salesOrdersTable, pickingTasksTable,
} from "@workspace/db/schema";
import { alertEventsTable } from "@workspace/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";

export interface Anomaly {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  productId?: string;
  referenceId?: string;
  referenceType?: string;
  description: string;
  details: Record<string, unknown>;
}

export async function detectAnomalies(): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];

  const negative = await db
    .select({ productId: inventoryItemsTable.productId, skuCode: productsTable.skuCode, name: productsTable.name, qty: inventoryItemsTable.qtyOnHand, binCode: binsTable.code })
    .from(inventoryItemsTable)
    .innerJoin(productsTable, eq(inventoryItemsTable.productId, productsTable.id))
    .innerJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
    .where(sql`${inventoryItemsTable.qtyOnHand} < 0`);
  for (const item of negative) {
    anomalies.push({ type: "negative_inventory", severity: "critical", productId: item.productId, description: `Negative inventory: ${item.name} (${item.skuCode}) has ${item.qty} at bin ${item.binCode}`, details: { qty: item.qty, binCode: item.binCode } });
  }

  const zeroStock = await db
    .select({ productId: inventoryItemsTable.productId, skuCode: productsTable.skuCode, name: productsTable.name })
    .from(inventoryItemsTable)
    .innerJoin(productsTable, eq(inventoryItemsTable.productId, productsTable.id))
    .where(and(eq(inventoryItemsTable.qtyOnHand, 0), eq(productsTable.isActive, true)));
  const seenProducts = new Set<string>();
  for (const item of zeroStock) {
    if (seenProducts.has(item.productId)) continue;
    seenProducts.add(item.productId);
    anomalies.push({ type: "zero_stock", severity: "critical", productId: item.productId, description: `Zero stock: ${item.name} (${item.skuCode})`, details: { skuCode: item.skuCode } });
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stuckOrders = await db
    .select({ orderId: salesOrdersTable.id, orderNumber: salesOrdersTable.orderNumber, customerName: salesOrdersTable.customerName, updatedAt: salesOrdersTable.updatedAt, taskId: pickingTasksTable.id })
    .from(salesOrdersTable)
    .leftJoin(pickingTasksTable, eq(salesOrdersTable.id, pickingTasksTable.orderId))
    .where(and(eq(salesOrdersTable.status, "picking"), lte(salesOrdersTable.updatedAt, yesterday)));
  for (const order of stuckOrders) {
    anomalies.push({ type: "stuck_picking", severity: order.taskId ? "medium" : "high", referenceId: order.orderId, referenceType: "sales_order", description: `Order ${order.orderNumber} stuck in picking >24h`, details: { customerName: order.customerName, updatedAt: order.updatedAt } });
  }

  for (const anomaly of anomalies.filter((a) => a.severity === "critical")) {
    await db.insert(alertEventsTable).values({
      eventType: anomaly.type as any, severity: anomaly.severity, productId: anomaly.productId,
      referenceId: anomaly.referenceId, referenceType: anomaly.referenceType,
      description: anomaly.description, details: JSON.stringify(anomaly.details),
    }).catch(() => {});
  }

  return anomalies;
}
