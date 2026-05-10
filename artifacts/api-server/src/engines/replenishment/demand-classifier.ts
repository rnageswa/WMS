// ── Demand Classification Engine ────────────────────────────────────────────────
// Classifies each SKU into: stable, seasonal, intermittent, erratic, new_item

import { db } from "@workspace/db";
import { inventoryMovementsTable, productsTable } from "@workspace/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export type DemandType = "stable" | "seasonal" | "intermittent" | "erratic" | "new_item";

export interface DemandClassification {
  productId: string;
  demandType: DemandType;
  avgDailyDemand: number;
  demandStdDev: number;
  cv: number;
  adi: number;
  dataPoints: number;
  daysOfHistory: number;
}

export const Z_SCORES: Record<string, number> = {
  "0.90": 1.282,
  "0.95": 1.645,
  "0.97": 1.881,
  "0.98": 2.054,
  "0.99": 2.326,
  "0.995": 2.576,
  "0.999": 3.090,
};

export function getZScore(serviceLevel: number): number {
  const key = serviceLevel.toFixed(2);
  return Z_SCORES[key] ?? 1.645;
}

function detectSeasonality(quantities: number[]): boolean {
  if (quantities.length < 14) return false;
  const weekCount = Math.floor(quantities.length / 7);
  if (weekCount < 2) return false;
  const weeklyAvgs: number[] = [];
  for (let w = 0; w < weekCount; w++) {
    const weekStart = w * 7;
    const weekEnd = Math.min(weekStart + 7, quantities.length);
    const weekQty = quantities.slice(weekStart, weekEnd);
    weeklyAvgs.push(weekQty.reduce((s, q) => s + q, 0) / weekQty.length);
  }
  let correlationCount = 0;
  for (let i = 1; i < weeklyAvgs.length; i++) {
    const prev = weeklyAvgs[i - 1];
    const curr = weeklyAvgs[i];
    if (prev > 0 && curr > 0) {
      const ratio = Math.min(prev, curr) / Math.max(prev, curr);
      if (ratio > 0.5) correlationCount++;
    }
  }
  return correlationCount >= weeklyAvgs.length * 0.5;
}

export async function classifyDemand(productId: string): Promise<DemandClassification> {
  const lookbackDays = 90;
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const dailyData = await db
    .select({
      date: sql<string>`DATE(${inventoryMovementsTable.createdAt})`,
      qty: sql<number>`coalesce(sum(abs(${inventoryMovementsTable.quantity})), 0)::int`,
    })
    .from(inventoryMovementsTable)
    .where(
      and(
        eq(inventoryMovementsTable.productId, productId),
        eq(inventoryMovementsTable.movementType, "outbound"),
        gte(inventoryMovementsTable.createdAt, since)
      )
    )
    .groupBy(sql`DATE(${inventoryMovementsTable.createdAt})`)
    .orderBy(sql`DATE(${inventoryMovementsTable.createdAt})`);

  const daysOfHistory = dailyData.length;
  const quantities = dailyData.map((d) => d.qty);
  const nonZeroDays = quantities.filter((q) => q > 0);
  const totalDemand = quantities.reduce((s, q) => s + q, 0);
  const avgDailyDemand = daysOfHistory > 0 ? totalDemand / daysOfHistory : 0;

  const variance =
    quantities.length > 1
      ? quantities.reduce((s, q) => s + Math.pow(q - avgDailyDemand, 2), 0) / (quantities.length - 1)
      : 0;
  const demandStdDev = Math.sqrt(variance);
  const cv = avgDailyDemand > 0 ? demandStdDev / avgDailyDemand : 0;

  let adi = 0;
  if (nonZeroDays.length > 0 && nonZeroDays.length < quantities.length) {
    adi = quantities.length / nonZeroDays.length;
  } else if (nonZeroDays.length === quantities.length) {
    adi = 1;
  } else {
    adi = Infinity;
  }

  let demandType: DemandType;
  if (daysOfHistory < 30) {
    demandType = "new_item";
  } else if (cv < 0.5 && adi < 1.39) {
    demandType = "stable";
  } else if (cv >= 0.5 && adi < 1.39) {
    demandType = "erratic";
  } else if (cv < 0.5 && adi >= 1.39) {
    demandType = "intermittent";
  } else {
    demandType = detectSeasonality(quantities) ? "seasonal" : "intermittent";
  }

  return {
    productId,
    demandType,
    avgDailyDemand: Math.round(avgDailyDemand * 10000) / 10000,
    demandStdDev: Math.round(demandStdDev * 10000) / 10000,
    cv: Math.round(cv * 10000) / 10000,
    adi: Math.round(adi * 100) / 100,
    dataPoints: daysOfHistory,
    daysOfHistory,
  };
}

export async function classifyAllProducts(): Promise<DemandClassification[]> {
  const products = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.isActive, true));
  const results: DemandClassification[] = [];
  for (const product of products) {
    const classification = await classifyDemand(product.id);
    results.push(classification);
  }
  return results;
}
