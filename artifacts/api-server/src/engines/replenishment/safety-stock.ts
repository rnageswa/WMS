// ── Safety Stock Calculator ─────────────────────────────────────────────────────
// SS = Z × √(LT × σD² + D² × σLT²)

import { getZScore } from "./demand-classifier";

export interface SafetyStockInput {
  serviceLevel: number;
  avgDailyDemand: number;
  demandStdDev: number;
  avgLeadTimeDays: number;
  leadTimeStdDev: number;
}

export interface SafetyStockResult {
  safetyStock: number;
  zScore: number;
  demandVariability: number;
  leadTimeVariability: number;
  combinedVariability: number;
  reorderPoint: number;
}

export function calculateSafetyStock(input: SafetyStockInput): SafetyStockResult {
  const { serviceLevel, avgDailyDemand, demandStdDev, avgLeadTimeDays, leadTimeStdDev } = input;
  const z = getZScore(serviceLevel);
  const demandVariability = demandStdDev * Math.sqrt(avgLeadTimeDays);
  const leadTimeVariability = avgDailyDemand * leadTimeStdDev;
  const combinedVariability = Math.sqrt(
    avgLeadTimeDays * Math.pow(demandStdDev, 2) +
    Math.pow(avgDailyDemand, 2) * Math.pow(leadTimeStdDev, 2)
  );
  const safetyStock = Math.ceil(z * combinedVariability);
  const reorderPoint = Math.ceil(avgDailyDemand * avgLeadTimeDays + safetyStock);
  return {
    safetyStock,
    zScore: z,
    demandVariability: Math.round(demandVariability * 100) / 100,
    leadTimeVariability: Math.round(leadTimeVariability * 100) / 100,
    combinedVariability: Math.round(combinedVariability * 100) / 100,
    reorderPoint,
  };
}

export function calculateSimpleSafetyStock(
  serviceLevel: number,
  avgDailyDemand: number,
  demandStdDev: number,
  leadTimeDays: number
): number {
  const z = getZScore(serviceLevel);
  return Math.ceil(z * demandStdDev * Math.sqrt(leadTimeDays));
}
