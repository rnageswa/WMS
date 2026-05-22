import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

// ── Interfaces ───────────────────────────────────────────────────────────

export interface StockoutPrediction {
  productId: string;
  skuCode: string;
  name: string;
  category: string | null;
  currentStock: number;
  reorderThreshold: number;
  dailyDemand: number;
  daysUntilStockout: number;
  severity: "critical" | "warning" | "watch" | "normal";
  estimatedStockoutDate: string | null;
}

export interface StockoutPredictionsResponse {
  generatedAt: string;
  totalPredictions: number;
  critical: number;
  warning: number;
  watch: number;
  predictions: StockoutPrediction[];
}

export interface ABCProduct {
  productId: string;
  skuCode: string;
  name: string;
  category: string | null;
  revenue: number;
  revenuePercent: number;
  cumulativeRevenuePercent: number;
  pickCount: number;
  pickPercent: number;
  cumulativePickPercent: number;
  revenueClass: "A" | "B" | "C";
  velocityClass: "A" | "B" | "C";
  combinedClass: string;
}

export interface ABCAnalysisResponse {
  generatedAt: string;
  totalProducts: number;
  totalRevenue: number;
  totalUnitsMoved: number;
  summary: {
    revenueClass: { A: number; B: number; C: number };
    velocityClass: { A: number; B: number; C: number };
  };
  products: ABCProduct[];
}

export interface DashboardFinancialResponse {
  totalInventoryValue: number;
  cogsThisPeriod: number;
  avgMarginThisPeriod: number;
  periodOrderCount: number;
  valueByWarehouse: Array<{ warehouseName: string; totalValue: number }>;
  cogsTrend: Array<{ date: string; cogs: number }>;
  lowStockValue: number;
}

// ── Queries ────────────────────────────────────────────────────────────

// GET /api/replenishment/stockout-predictions
export function useGetStockoutPredictions() {
  return useQuery<StockoutPredictionsResponse>({
    queryKey: ["stockout-predictions"],
    queryFn: () => customFetch("/api/replenishment/stockout-predictions", { method: "GET" }),
    refetchInterval: 60000, // refresh every 60s
  });
}

// GET /api/reports/abc-analysis
export function useGetABCAnalysis() {
  return useQuery<ABCAnalysisResponse>({
    queryKey: ["abc-analysis"],
    queryFn: () => customFetch("/api/reports/abc-analysis", { method: "GET" }),
  });
}

// GET /api/dashboard/financial
export function useGetDashboardFinancial(params?: {
  startDate?: string;
  endDate?: string;
  trendDays?: number;
}) {
  const query = new URLSearchParams();
  if (params?.startDate) query.set("startDate", params.startDate);
  if (params?.endDate) query.set("endDate", params.endDate);
  if (params?.trendDays) query.set("trendDays", String(params.trendDays));
  const url = `/api/dashboard/financial${query.toString() ? "?" + query.toString() : ""}`;

  return useQuery<DashboardFinancialResponse>({
    queryKey: ["dashboard-financial", params],
    queryFn: () => customFetch(url, { method: "GET" }),
    refetchInterval: 120000, // refresh every 120s
  });
}
