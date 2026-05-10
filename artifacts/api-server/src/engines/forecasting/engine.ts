// ── Forecasting Engine V2 ───────────────────────────────────────────────────────

import { db } from "@workspace/db";
import { productsTable, inventoryMovementsTable } from "@workspace/db/schema";
import { forecastSnapshotsTable } from "@workspace/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { logger } from "../../lib/logger";

export interface ForecastResult {
  productId: string; skuCode: string; productName: string; modelUsed: string;
  avgDailyDemand: number; demandStdDev: number; seasonalityIndex: number;
  trendSlope: number; forecasts: { days30: number; days60: number; days90: number };
  confidence: number;
  dailyForecast: { date: string; predicted: number; lower: number; upper: number }[];
}

export function calculateSeasonalityIndex(dailyData: number[], period = 7): number[] {
  if (dailyData.length < period * 2) return dailyData.map(() => 1);
  const seasonalIndices: number[] = new Array(period).fill(0);
  const counts: number[] = new Array(period).fill(0);
  for (let i = 0; i < dailyData.length; i++) { seasonalIndices[i % period] += dailyData[i]; counts[i % period]++; }
  const overallAvg = dailyData.reduce((s, d) => s + d, 0) / dailyData.length;
  for (let i = 0; i < period; i++) { const periodAvg = counts[i] > 0 ? seasonalIndices[i] / counts[i] : overallAvg; seasonalIndices[i] = overallAvg > 0 ? periodAvg / overallAvg : 1; }
  return seasonalIndices;
}

export function detectTrend(dailyData: number[]): { slope: number; intercept: number; r2: number } {
  const n = dailyData.length;
  if (n < 2) return { slope: 0, intercept: dailyData[0] || 0, r2: 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) { sumX += i; sumY += dailyData[i]; sumXY += i * dailyData[i]; sumX2 += i * i; sumY2 += dailyData[i] * dailyData[i]; }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) { const predicted = intercept + slope * i; ssRes += Math.pow(dailyData[i] - predicted, 2); ssTot += Math.pow(dailyData[i] - meanY, 2); }
  return { slope, intercept, r2: ssTot > 0 ? 1 - ssRes / ssTot : 0 };
}

export function holtWinters(data: number[], alpha: number, beta: number, gamma: number, seasonLength: number, forecastDays: number): number[] {
  const n = data.length;
  if (n < seasonLength * 2) { const avg = data.reduce((s, d) => s + d, 0) / n; return Array(forecastDays).fill(Math.round(avg)); }
  let level = data.slice(0, seasonLength).reduce((s, d) => s + d, 0) / seasonLength;
  let trend = (data.slice(seasonLength, seasonLength * 2).reduce((s, d) => s + d, 0) - data.slice(0, seasonLength).reduce((s, d) => s + d, 0)) / (seasonLength * seasonLength);
  const seasonal: number[] = [];
  for (let i = 0; i < seasonLength; i++) seasonal.push(data[i] / level);
  for (let i = seasonLength; i < n; i++) { const value = data[i]; const seasonIdx = i % seasonLength; const prevLevel = level; level = alpha * (value / seasonal[seasonIdx]) + (1 - alpha) * (prevLevel + trend); trend = beta * (level - prevLevel) + (1 - beta) * trend; seasonal[seasonIdx] = gamma * (value / level) + (1 - gamma) * seasonal[seasonIdx]; }
  const forecast: number[] = [];
  for (let i = 1; i <= forecastDays; i++) { const seasonIdx = (n + i - 1) % seasonLength; forecast.push(Math.max(0, Math.round((level + i * trend) * seasonal[seasonIdx]))); }
  return forecast;
}

export async function forecastProduct(productId: string, days = 90): Promise<ForecastResult | null> {
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!product) return null;
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const movementRows = await db.select({ date: sql<string>`DATE(${inventoryMovementsTable.createdAt})`, qty: sql<number>`coalesce(sum(abs(${inventoryMovementsTable.quantity})), 0)::int` })
    .from(inventoryMovementsTable).where(and(eq(inventoryMovementsTable.productId, productId), eq(inventoryMovementsTable.movementType, "outbound"), gte(inventoryMovementsTable.createdAt, since)))
    .groupBy(sql`DATE(${inventoryMovementsTable.createdAt})`).orderBy(sql`DATE(${inventoryMovementsTable.createdAt})`);
  const dailyMap = new Map(movementRows.map((r) => [r.date, r.qty]));
  const dailyData: number[] = [];
  for (let i = 0; i < 90; i++) { const d = new Date(Date.now() - (89 - i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); dailyData.push(dailyMap.get(d) ?? 0); }
  const total = dailyData.reduce((s, d) => s + d, 0);
  const avg = total / 90;
  const variance = dailyData.reduce((s, d) => s + Math.pow(d - avg, 2), 0) / 90;
  const stdDev = Math.sqrt(variance);
  const seasonality = calculateSeasonalityIndex(dailyData, 7);
  const avgSeasonality = seasonality.reduce((s, v) => s + v, 0) / seasonality.length;
  const trend = detectTrend(dailyData);
  const hw = holtWinters(dailyData, 0.3, 0.1, 0.2, 7, days);
  const dataDensity = movementRows.length / 90;
  const confidence = Math.min(0.95, Math.max(0.3, dataDensity * 0.5 + Math.abs(trend.r2) * 0.3 + 0.2));
  const dailyForecast = hw.slice(0, days).map((predicted, i) => { const d = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); const margin = Math.round(stdDev * 1.96 * Math.sqrt(i + 1)); return { date: d, predicted, lower: Math.max(0, predicted - margin), upper: predicted + margin }; });
  return { productId, skuCode: product.skuCode, productName: product.name, modelUsed: "holt_winters", avgDailyDemand: Math.round(avg * 100) / 100, demandStdDev: Math.round(stdDev * 100) / 100, seasonalityIndex: Math.round(avgSeasonality * 10000) / 10000, trendSlope: Math.round(trend.slope * 10000) / 10000, forecasts: { days30: hw.slice(0, 30).reduce((s, v) => s + v, 0), days60: hw.slice(0, 60).reduce((s, v) => s + v, 0), days90: hw.slice(0, 90).reduce((s, v) => s + v, 0) }, confidence: Math.round(confidence * 10000) / 10000, dailyForecast };
}

export async function saveForecastSnapshot(result: ForecastResult): Promise<void> {
  await db.insert(forecastSnapshotsTable).values({
    productId: result.productId, snapshotDate: new Date().toISOString().slice(0, 10),
    avgDailyDemand: String(result.avgDailyDemand), demandStdDev: String(result.demandStdDev),
    seasonalityIndex: String(result.seasonalityIndex), trendSlope: String(result.trendSlope),
    forecast30Day: result.forecasts.days30, forecast60Day: result.forecasts.days60, forecast90Day: result.forecasts.days90,
    confidence: String(result.confidence), modelUsed: result.modelUsed,
    modelParams: JSON.stringify({ alpha: 0.3, beta: 0.1, gamma: 0.2, seasonLength: 7 }),
  });
}

export async function updateAllForecasts(): Promise<{ totalProducts: number; updated: number; failed: number }> {
  const products = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.isActive, true));
  let updated = 0, failed = 0;
  for (const product of products) {
    try { const forecast = await forecastProduct(product.id); if (forecast) { await saveForecastSnapshot(forecast); updated++; } } catch (err) { logger.error({ err, productId: product.id }, "Forecast update failed"); failed++; }
  }
  logger.info({ total: products.length, updated, failed }, "Forecast batch update completed");
  return { totalProducts: products.length, updated, failed };
}
