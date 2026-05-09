import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, Package, Calendar, AlertTriangle } from "lucide-react";

interface HistoricalData {
  date: string;
  actual: number;
  movingAvg7d: number;
  movingAvg30d: number;
}

interface ForecastData {
  date: string;
  predictedDemand: number;
  confidence: number;
}

interface ForecastResponse {
  productId: string;
  skuCode: string;
  name: string;
  historical: HistoricalData[];
  forecast: ForecastData[];
  last30Avg: number;
  suggestedReorderPoint: number;
  suggestedOrderQty: number;
}

interface Product {
  id: string;
  skuCode: string;
  name: string;
}

export default function DemandForecastPage() {
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // Fetch all products for dropdown
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    },
  });

  // Fetch forecast for selected product
  const {
    data: forecast,
    isLoading: forecastLoading,
    error: forecastError,
  } = useQuery<ForecastResponse>({
    queryKey: ["replenishment", "forecast", selectedProductId],
    queryFn: async () => {
      const res = await fetch(`/api/replenishment/forecast/${selectedProductId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load forecast");
      return res.json();
    },
    enabled: !!selectedProductId,
  });

  const isLoading = productsLoading || (forecastLoading && selectedProductId !== "");

  // Calculate chart data
  const chartData = useMemo(() => {
    if (!forecast) return [];
    return [...forecast.historical, ...forecast.forecast.map((f) => ({ ...f, actual: 0, movingAvg7d: 0, movingAvg30d: 0 }))];
  }, [forecast]);

  const maxVal = useMemo(() => {
    if (chartData.length === 0) return 10;
    const allValues = chartData.flatMap((d) => [
      d.actual,
      d.movingAvg7d,
      d.movingAvg30d,
      (d as any).predictedDemand ?? 0,
    ]);
    return Math.max(...allValues, 1) * 1.2;
  }, [chartData]);

  return (
    <Layout>
      <PageHeader
        title="Demand Forecast"
        subtitle="Predict future demand using historical data and moving averages"
      />

      <div className="p-6 max-w-6xl space-y-4">
        {/* Product selector */}
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Select Product:</span>
            </div>
            <Select
              value={selectedProductId}
              onValueChange={setSelectedProductId}
              disabled={productsLoading}
            >
              <SelectTrigger className="w-80 h-9 text-sm">
                <SelectValue placeholder="Choose a product…" />
              </SelectTrigger>
              <SelectContent>
                {products?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.skuCode} — {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        )}

        {forecastError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-8 px-4 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto text-red-400 mb-2" />
              <p className="text-sm text-red-700">
                Failed to load forecast data
              </p>
            </CardContent>
          </Card>
        )}

        {forecast && !isLoading && (
          <>
            {/* Summary metrics */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                    30-Day Average
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {forecast.last30Avg.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                    units / day
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                    Suggested Reorder Point
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {forecast.suggestedReorderPoint}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-600" />
                    ~2 weeks cover
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                    Suggested Order Qty
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {forecast.suggestedOrderQty}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-amber-600" />
                    ~4 weeks cover
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card className="border-border/60">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#E8622A]" />
                  Demand Forecast: {forecast.skuCode} — {forecast.name}
                </h3>

                {/* Simple CSS bar chart */}
                <div className="space-y-4">
                  {/* Historical bars */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Historical Demand (Last 30 Days)
                    </p>
                    <div className="h-48 flex items-end gap-1 border-b border-border pb-2">
                      {forecast.historical.map((d, i) => (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative"
                          title={`${d.date}: ${d.actual} units`}
                        >
                          <div
                            className="w-full bg-blue-400 rounded-t-sm transition-all hover:bg-blue-500"
                            style={{
                              height: `${(d.actual / maxVal) * 100}%`,
                              minHeight: d.actual > 0 ? "2px" : "1px",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                      <span>{forecast.historical[0]?.date}</span>
                      <span>…</span>
                      <span>
                        {forecast.historical[forecast.historical.length - 1]
                          ?.date}
                      </span>
                    </div>
                  </div>

                  {/* Moving average overlay */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      7-Day Moving Average
                    </p>
                    <div className="h-32 flex items-end gap-1 border-b border-border pb-2">
                      {forecast.historical.map((d, i) => (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center justify-end gap-0.5"
                          title={`7d MA: ${d.movingAvg7d?.toFixed(1) ?? 0}`}
                        >
                          <div
                            className="w-full bg-emerald-400 rounded-t-sm transition-all"
                            style={{
                              height: `${
                                ((d.movingAvg7d ?? 0) / maxVal) * 100
                              }%`,
                              minHeight: (d.movingAvg7d ?? 0) > 0 ? "2px" : "1px",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Forecast bars */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Predicted Demand (Next 30 Days)
                    </p>
                    <div className="h-48 flex items-end gap-1 border-b border-border pb-2">
                      {forecast.forecast.map((d, i) => (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center justify-end gap-0.5 group"
                          title={`${d.date}: ${d.predictedDemand} units (conf: ${
                            Math.round(d.confidence * 100)
                          }%)`}
                        >
                          <div
                            className="w-full bg-[#E8622A]/70 rounded-t-sm transition-all hover:bg-[#E8622A]"
                            style={{
                              height: `${
                                (d.predictedDemand / maxVal) * 100
                              }%`,
                              minHeight:
                                d.predictedDemand > 0 ? "2px" : "1px",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                      <span>{forecast.forecast[0]?.date}</span>
                      <span>…</span>
                      <span>
                        {forecast.forecast[forecast.forecast.length - 1]?.date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 rounded-sm bg-blue-400" />
                    <span className="text-muted-foreground">Actual Demand</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 rounded-sm bg-emerald-400" />
                    <span className="text-muted-foreground">7d Moving Avg</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 rounded-sm bg-[#E8622A]/70" />
                    <span className="text-muted-foreground">Predicted Demand</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!selectedProductId && !productsLoading && (
          <Card className="border-border/60">
            <CardContent className="py-16 text-center">
              <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold text-foreground">
                Select a product to view its demand forecast
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto">
                Demand forecasts use historical outbound movement data, moving
                averages, and simple trend models to predict future consumption.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
