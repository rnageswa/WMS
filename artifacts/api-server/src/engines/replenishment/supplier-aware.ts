// ── Supplier-Aware Replenishment ────────────────────────────────────────────────

import { db } from "@workspace/db";
import {
  suppliersTable,
  purchaseOrdersTable,
  purchaseOrderLinesTable,
} from "@workspace/db/schema";
import { supplierPerformanceTable } from "@workspace/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { logger } from "../../lib/logger";

export interface SupplierRisk {
  supplierId: string;
  supplierName: string;
  reliabilityScore: number;
  onTimeRate: number;
  fillRate: number;
  avgLeadTimeDays: number;
  leadTimeStdDev: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendation: string;
}

export async function assessSupplierRisk(supplierId: string): Promise<SupplierRisk | null> {
  const [perf] = await db.select().from(supplierPerformanceTable).where(eq(supplierPerformanceTable.supplierId, supplierId)).limit(1);
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, supplierId)).limit(1);
  if (!supplier) return null;
  const reliabilityScore = parseFloat(perf?.reliabilityScore?.toString() || "0");
  const onTimeRate = parseFloat(perf?.onTimeRate?.toString() || "0");
  const fillRate = parseFloat(perf?.fillRate?.toString() || "0");
  const avgLeadTime = parseFloat(perf?.avgLeadTimeDays?.toString() || "7");
  const ltStdDev = parseFloat(perf?.leadTimeStdDev?.toString() || "0");
  let riskLevel: SupplierRisk["riskLevel"];
  let recommendation: string;
  if (reliabilityScore >= 80) { riskLevel = "low"; recommendation = "Reliable supplier. Standard replenishment."; }
  else if (reliabilityScore >= 60) { riskLevel = "medium"; recommendation = "Increase safety stock by 15-20% to buffer variability."; }
  else if (reliabilityScore >= 40) { riskLevel = "high"; recommendation = "Find alternate supplier. Increase safety stock by 30-50%."; }
  else { riskLevel = "critical"; recommendation = "Replace supplier. Use only as backup with manual oversight."; }
  return { supplierId, supplierName: supplier.name, reliabilityScore, onTimeRate, fillRate, avgLeadTimeDays: avgLeadTime, leadTimeStdDev: ltStdDev, riskLevel, recommendation };
}

export async function calculateSupplierPerformance(supplierId: string): Promise<void> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const pos = await db.select().from(purchaseOrdersTable).where(and(eq(purchaseOrdersTable.supplierId, supplierId), gte(purchaseOrdersTable.createdAt, since))).orderBy(desc(purchaseOrdersTable.createdAt));
  if (pos.length === 0) { logger.info({ supplierId }, "No POs for performance calc"); return; }
  let onTimeCount = 0, totalOrdered = 0, totalReceived = 0;
  const leadTimes: number[] = [];
  for (const po of pos) {
    const lines = await db.select().from(purchaseOrderLinesTable).where(eq(purchaseOrderLinesTable.poId, po.id));
    for (const line of lines) { totalOrdered += line.qtyOrdered; totalReceived += line.qtyReceived; }
    if (po.status === "received" || po.status === "partially_received") {
      const orderDate = new Date(po.createdAt!);
      const receiptDate = new Date(po.updatedAt!);
      const lt = Math.round((receiptDate.getTime() - orderDate.getTime()) / (24 * 60 * 60 * 1000));
      if (lt > 0) leadTimes.push(lt);
      if (po.expectedDeliveryDate) { if (receiptDate <= new Date(po.expectedDeliveryDate)) onTimeCount++; } else { onTimeCount++; }
    }
  }
  const onTimeRate = pos.length > 0 ? onTimeCount / pos.length : 0;
  const fillRate = totalOrdered > 0 ? totalReceived / totalOrdered : 0;
  const avgLeadTime = leadTimes.length > 0 ? leadTimes.reduce((s, l) => s + l, 0) / leadTimes.length : 7;
  const ltVar = leadTimes.length > 1 ? leadTimes.reduce((s, l) => s + Math.pow(l - avgLeadTime, 2), 0) / (leadTimes.length - 1) : 0;
  const reliabilityScore = Math.round((onTimeRate * 40 + fillRate * 40 + Math.min(avgLeadTime / 14, 1) * 20) * 100) / 100;
  const [existing] = await db.select().from(supplierPerformanceTable).where(eq(supplierPerformanceTable.supplierId, supplierId)).limit(1);
  const data = {
    supplierId, totalDeliveries: pos.length, onTimeDeliveries: onTimeCount,
    onTimeRate: String(onTimeRate), totalOrdered, totalReceived, fillRate: String(fillRate),
    avgLeadTimeDays: String(avgLeadTime), leadTimeStdDev: String(Math.sqrt(ltVar)),
    minLeadTimeDays: leadTimes.length > 0 ? Math.min(...leadTimes) : null,
    maxLeadTimeDays: leadTimes.length > 0 ? Math.max(...leadTimes) : null,
    reliabilityScore: String(reliabilityScore), lastCalculatedAt: new Date(), updatedAt: new Date(),
  };
  if (existing) {
    await db.update(supplierPerformanceTable).set(data).where(eq(supplierPerformanceTable.id, existing.id));
  } else {
    await db.insert(supplierPerformanceTable).values(data);
  }
  logger.info({ supplierId, reliabilityScore, onTimeRate, fillRate }, "Supplier performance updated");
}
