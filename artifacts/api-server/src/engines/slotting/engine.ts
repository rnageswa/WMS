// ── Slotting Optimization Engine ─────────────────────────────────────────────────

import { db } from "@workspace/db";
import {
  binsTable, zonesTable, warehousesTable, productsTable,
  inventoryItemsTable, inventoryMovementsTable,
} from "@workspace/db/schema";
import {
  binAttributesTable, velocityProfilesTable, slottingRulesTable,
} from "@workspace/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { logger } from "../../lib/logger";

export interface BinScore {
  binId: string; binCode: string; zoneName: string; warehouseName: string;
  overallScore: number; travelScore: number; velocityScore: number;
  accessibilityScore: number; capacityUtilization: number; recommendedAction: string;
}

export interface HeatmapCell {
  binId: string; binCode: string; zoneName: string; pickCount: number; intensity: number;
}

export interface CoPickGroup {
  productIds: string[]; skuCodes: string[]; coPickFrequency: number;
  currentBins: string[]; recommendation: string;
}

export async function scoreBins(zoneId?: string): Promise<BinScore[]> {
  const conditions = zoneId ? [eq(binsTable.zoneId, zoneId)] : [];
  const bins = await db
    .select({
      binId: binsTable.id, binCode: binsTable.code, zoneName: zonesTable.name,
      warehouseName: warehousesTable.name, travelScore: binAttributesTable.travelScore,
      accessibilityScore: binAttributesTable.accessibilityScore,
      capacityVolume: binAttributesTable.capacityVolume, pickFrequency: binAttributesTable.pickFrequency,
    })
    .from(binsTable)
    .leftJoin(binAttributesTable, eq(binsTable.id, binAttributesTable.binId))
    .leftJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
    .leftJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
    .where(and(eq(binsTable.isActive, true), ...conditions));

  return bins.map((bin) => {
    const travel = bin.travelScore ?? 50;
    const accessibility = bin.accessibilityScore ?? 50;
    const pickFreq = bin.pickFrequency ?? 0;
    const velocity = Math.min(100, pickFreq * 10);
    const capacity = parseFloat(bin.capacityVolume?.toString() || "0");
    const utilization = capacity > 0 ? Math.min(1, (pickFreq * 0.01) / capacity) : 0;
    const overall = Math.round(travel * 0.3 + velocity * 0.35 + accessibility * 0.2 + (1 - utilization) * 15);
    let recommendedAction = "Keep current assignments";
    if (overall >= 80) recommendedAction = "Prime slot — assign fast movers";
    else if (overall >= 60) recommendedAction = "Good slot — medium velocity items";
    else if (overall >= 40) recommendedAction = "Average — slow movers or bulk storage";
    else recommendedAction = "Poor slot — consider reassignment";
    return { binId: bin.binId, binCode: bin.binCode, zoneName: bin.zoneName || "", warehouseName: bin.warehouseName || "", overallScore: overall, travelScore: travel, velocityScore: velocity, accessibilityScore: accessibility, capacityUtilization: Math.round(utilization * 100) / 100, recommendedAction };
  }).sort((a, b) => b.overallScore - a.overallScore);
}

export async function updateVelocityProfiles(): Promise<void> {
  const products = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.isActive, true));
  for (const product of products) {
    const invItems = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.productId, product.id));
    for (const item of invItems) {
      const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const [picks7, picks30, picks90, outbound30] = await Promise.all([
        countMovements(item.productId, item.binId, "outbound", since7),
        countMovements(item.productId, item.binId, "outbound", since30),
        countMovements(item.productId, item.binId, "outbound", since90),
        countMovements(item.productId, null, "outbound", since30),
      ]);
      const velocityScore = Math.min(100, picks30 * 2);
      const velocityClass = picks30 >= 20 ? "fast" : picks30 >= 5 ? "medium" : picks30 >= 1 ? "slow" : "dead";
      const [existing] = await db.select().from(velocityProfilesTable).where(and(eq(velocityProfilesTable.productId, item.productId), eq(velocityProfilesTable.binId, item.binId))).limit(1);
      const data = { productId: item.productId, binId: item.binId, picksLast7Days: picks7, picksLast30Days: picks30, picksLast90Days: picks90, outboundQtyLast30Days: outbound30, velocityClass, velocityScore: String(velocityScore), lastCalculatedAt: new Date(), updatedAt: new Date() };
      if (existing) { await db.update(velocityProfilesTable).set(data).where(eq(velocityProfilesTable.id, existing.id)); } else { await db.insert(velocityProfilesTable).values(data); }
    }
  }
  logger.info("Velocity profiles updated");
}

async function countMovements(productId: string, binId: string | null, type: string, since: Date): Promise<number> {
  const conditions = [eq(inventoryMovementsTable.productId, productId), eq(inventoryMovementsTable.movementType, type as any), gte(inventoryMovementsTable.createdAt, since)];
  if (binId) conditions.push(eq(inventoryMovementsTable.binId, binId));
  const rows = await db.select({ count: sql<number>`count(*)::int` }).from(inventoryMovementsTable).where(and(...conditions));
  return rows[0]?.count ?? 0;
}

export async function generateHeatmap(zoneId?: string): Promise<HeatmapCell[]> {
  const conditions = zoneId ? [eq(binsTable.zoneId, zoneId)] : [];
  const bins = await db.select({ binId: binsTable.id, binCode: binsTable.code, zoneName: zonesTable.name, pickFrequency: binAttributesTable.pickFrequency })
    .from(binsTable).leftJoin(binAttributesTable, eq(binsTable.id, binAttributesTable.binId)).leftJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
    .where(and(eq(binsTable.isActive, true), ...conditions));
  const maxPicks = Math.max(...bins.map((b) => b.pickFrequency ?? 0), 1);
  return bins.map((b) => ({ binId: b.binId, binCode: b.binCode, zoneName: b.zoneName || "", pickCount: b.pickFrequency ?? 0, intensity: maxPicks > 0 ? (b.pickFrequency ?? 0) / maxPicks : 0 }));
}

export async function analyzeCoPickProximity(): Promise<CoPickGroup[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const movements = await db.select({ date: sql<string>`DATE(${inventoryMovementsTable.createdAt})`, productId: inventoryMovementsTable.productId, binId: inventoryMovementsTable.binId })
    .from(inventoryMovementsTable).where(and(eq(inventoryMovementsTable.movementType, "outbound"), gte(inventoryMovementsTable.createdAt, since)));
  const byDate = new Map<string, Set<string>>();
  const binMap = new Map<string, string>();
  for (const m of movements) { if (!byDate.has(m.date)) byDate.set(m.date, new Set()); byDate.get(m.date)!.add(m.productId); binMap.set(m.productId, m.binId); }
  const coPickCounts = new Map<string, number>();
  for (const [, products] of byDate) { const arr = [...products]; for (let i = 0; i < arr.length; i++) { for (let j = i + 1; j < arr.length; j++) { const key = [arr[i], arr[j]].sort().join(":"); coPickCounts.set(key, (coPickCounts.get(key) || 0) + 1); } } }
  const groups: CoPickGroup[] = [];
  for (const [key, count] of coPickCounts) { if (count >= 3) { const [p1, p2] = key.split(":"); const [prod1, prod2] = await Promise.all([db.select().from(productsTable).where(eq(productsTable.id, p1)).limit(1), db.select().from(productsTable).where(eq(productsTable.id, p2)).limit(1)]); const bin1 = binMap.get(p1), bin2 = binMap.get(p2); groups.push({ productIds: [p1, p2], skuCodes: [prod1[0]?.skuCode || "", prod2[0]?.skuCode || ""], coPickFrequency: count, currentBins: [bin1 || "", bin2 || ""], recommendation: bin1 && bin2 ? "Already co-located" : `Consider placing ${prod1[0]?.skuCode} and ${prod2[0]?.skuCode} in adjacent bins` }); } }
  return groups.sort((a, b) => b.coPickFrequency - a.coPickFrequency);
}

export async function runSlottingOptimization(): Promise<{ binScores: BinScore[]; heatmap: HeatmapCell[]; coPickGroups: CoPickGroup[]; recommendations: string[] }> {
  logger.info("Starting slotting optimization run");
  await updateVelocityProfiles();
  const [binScores, heatmap, coPickGroups] = await Promise.all([scoreBins(), generateHeatmap(), analyzeCoPickProximity()]);
  const recommendations: string[] = [];
  const primeSlots = binScores.filter((b) => b.overallScore >= 80);
  const poorSlots = binScores.filter((b) => b.overallScore < 40);
  if (primeSlots.length > 0) recommendations.push(`${primeSlots.length} prime slots identified`);
  if (poorSlots.length > 0) recommendations.push(`${poorSlots.length} poor slots — consider reassignment`);
  const coPickIssues = coPickGroups.filter((g) => g.recommendation !== "Already co-located");
  if (coPickIssues.length > 0) recommendations.push(`${coPickIssues.length} co-pick groups not co-located`);
  logger.info({ binScores: binScores.length, heatmap: heatmap.length, coPickGroups: coPickGroups.length }, "Slotting optimization completed");
  return { binScores, heatmap, coPickGroups, recommendations };
}
