import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Package,
  FileSpreadsheet,
  Download,
  RefreshCw,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { RoleGate } from "@/components/role-gate";
import { useBaseCurrency } from "@/hooks/use-base-currency";

import { formatCurrency } from "@/lib/utils";
import { exportToExcel } from "@/lib/export-excel";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductProfitability {
  productId: string;
  skuCode: string;
  name: string;
  category: string | null;
  totalRevenue: number;
  totalCogs: number;
  grossMargin: number;
  marginPct: number;
  unitsSold: number;
}

interface PriceEffectiveness {
  totalOrders: number;
  totalRevenue: number;
  totalCogs: number;
  grossMarginPct: number;
  totalProducts: number;
  productsWithPrice: number;
  priceCoveragePct: number;
}

// ── Profitability Tab ─────────────────────────────────────────────────────────

const CHART_COLORS = [
  "#0F2540", "#E8622A", "#2563eb", "#16a34a",
  "#9333ea", "#db2777", "#d97706", "#0891b2",
  "#65a30d", "#7c3aed",
];

function ProfitabilityTab() {
  const baseCurrency = useBaseCurrency();
  const fmt = (n: number) => formatCurrency(n, baseCurrency);
  const [filter, setFilter] = useState<"all" | "positive" | "negative">("all");
  const [search, setSearch] = useState("");
  const [periodDays, setPeriodDays] = useState(30);
  const [comparePeriod, setComparePeriod] = useState(false);

  const endDate = new Date();
  const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const prevStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const prevEndDate = new Date(startDate.getTime());

  const { data: profitability, isLoading, refetch } = useQuery({
    queryKey: ["finance-profitability", periodDays],
    queryFn: async () => {
      const res = await fetch(`/api/finance/reports/profitability?startDate=${startDate.toISOString().slice(0,10)}&endDate=${endDate.toISOString().slice(0,10)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json() as Promise<ProductProfitability[]>;
    },
    refetchInterval: 120_000,
  });

  // Compare period data
  const { data: prevProfitability } = useQuery({
    queryKey: ["finance-profitability-prev", periodDays],
    queryFn: async () => {
      const res = await fetch(`/api/finance/reports/profitability?startDate=${prevStartDate.toISOString().slice(0,10)}&endDate=${prevEndDate.toISOString().slice(0,10)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json() as Promise<ProductProfitability[]>;
    },
    enabled: comparePeriod,
  });

  const filtered = (profitability ?? []).filter((p) => {
    if (filter === "positive" && p.marginPct < 0) return false;
    if (filter === "negative" && p.marginPct >= 0) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.skuCode.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalRevenue = filtered.reduce((s, p) => s + p.totalRevenue, 0);
  const totalCogs = filtered.reduce((s, p) => s + p.totalCogs, 0);
  const totalMargin = totalRevenue - totalCogs;
  const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
  const negativeCount = profitability?.filter((p) => p.marginPct < 0).length ?? 0;

  // Compare period metrics
  const prevFiltered = (prevProfitability ?? []).filter((p) => {
    if (filter === "positive" && p.marginPct < 0) return false;
    if (filter === "negative" && p.marginPct >= 0) return false;
    return true;
  });
  const prevRevenue = prevFiltered.reduce((s, p) => s + p.totalRevenue, 0);
  const prevMargin = prevRevenue - prevFiltered.reduce((s, p) => s + p.totalCogs, 0);
  const prevAvgMarginPct = prevRevenue > 0 ? (prevMargin / prevRevenue) * 100 : 0;
  const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  const marginChange = prevAvgMarginPct > 0 ? avgMarginPct - prevAvgMarginPct : 0;

  const chartData = filtered
    .sort((a, b) => b.grossMargin - a.grossMargin)
    .slice(0, 15);

  const handleExport = () => {
    if (!filtered.length) return;
    const rows = filtered.map((p) => ({
      SKU: p.skuCode,
      Product: p.name,
      Category: p.category ?? "",
      Revenue: p.totalRevenue.toFixed(2),
      COGS: p.totalCogs.toFixed(2),
      Margin: p.grossMargin.toFixed(2),
      "Margin %": p.marginPct.toFixed(1),
      "Units Sold": p.unitsSold,
    }));
    exportToExcel(rows, "profitability-report");
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
            {isLoading ? <Skeleton className="h-6 w-20" /> : <p className="text-xl font-bold">{fmt(totalRevenue)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total COGS</p>
            {isLoading ? <Skeleton className="h-6 w-20" /> : <p className="text-xl font-bold">{fmt(totalCogs)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Gross Margin</p>
            {isLoading ? <Skeleton className="h-6 w-20" /> : (
              <p className={`text-xl font-bold ${totalMargin < 0 ? "text-red-600" : "text-green-600"}`}>
                {fmt(totalMargin)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Avg Margin %</p>
            {isLoading ? <Skeleton className="h-6 w-16" /> : (
              <p className={`text-xl font-bold ${avgMarginPct < 0 ? "text-red-600" : "text-green-600"}`}>
                {avgMarginPct.toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert Banner */}
      {negativeCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-sm text-red-700">
              {negativeCount} product{negativeCount !== 1 ? "s" : ""} with negative margin detected
            </p>
            <Button variant="outline" size="sm" className="ml-auto border-red-300 text-red-700" asChild>
              <a href="/finance/margin/alerts">View Alerts</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Chart */}  
      {!isLoading && chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top 15 Products by Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="skuCode" tick={{ fontSize: 9 }} interval={0} angle={-35} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: number, name: string) => [fmt(val), name === "grossMargin" ? "Margin" : name]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.name ?? label}
                />
                <Bar dataKey="grossMargin" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.grossMargin < 0 ? "#ef4444" : (CHART_COLORS[i % CHART_COLORS.length])} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Period & Compare Toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Period:</span>
          {([30, 60, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setPeriodDays(d)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                periodDays === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setComparePeriod(!comparePeriod)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              comparePeriod ? "bg-purple-100 text-purple-700 border border-purple-300" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {comparePeriod ? "🔄 Compare On" : "Compare Periods"}
          </button>
        </div>
        <div className="flex gap-1">
          {(["all", "positive", "negative"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "positive" ? "Positive Margin" : "Negative Margin"}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm h-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!filtered.length}>
          <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
          Export Excel
        </Button>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Compare Period Banner */}
      {comparePeriod && prevProfitability && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-700 font-medium">
                Compare: Previous {periodDays} days vs Current {periodDays} days
              </span>
              <div className="flex items-center gap-4">
                <span>
                  Revenue: <strong>{fmt(prevRevenue)}</strong>
                  <span className={`ml-1 ${revenueChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {revenueChange >= 0 ? "↑" : "↓"} {Math.abs(revenueChange).toFixed(1)}%
                  </span>
                </span>
                <span>
                  Margin: <strong>{prevAvgMarginPct.toFixed(1)}%</strong>
                  <span className={`ml-1 ${marginChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {marginChange >= 0 ? "↑" : "↓"} {Math.abs(marginChange).toFixed(1)}%
                  </span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No data for the selected period</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs uppercase">Product</TableHead>
                  <TableHead className="text-xs uppercase text-right">Units Sold</TableHead>
                  <TableHead className="text-xs uppercase text-right">Revenue</TableHead>
                  <TableHead className="text-xs uppercase text-right">COGS</TableHead>
                  <TableHead className="text-xs uppercase text-right">Margin</TableHead>
                  <TableHead className="text-xs uppercase text-right">Margin %</TableHead>
                  <TableHead className="text-xs uppercase text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.productId} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{p.skuCode}</span>
                        <span className="text-xs text-muted-foreground">{p.name}</span>
                        {p.category && <Badge variant="outline" className="text-[10px]">{p.category}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{p.unitsSold}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmt(p.totalRevenue)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmt(p.totalCogs)}</TableCell>
                    <TableCell className={`text-right text-sm font-medium tabular-nums ${
                      p.grossMargin < 0 ? "text-red-600" : "text-green-600"
                    }`}>
                      {p.marginPct < 0 ? <TrendingDown className="w-3 h-3 inline mr-1" /> : <TrendingUp className="w-3 h-3 inline mr-1" />}
                      {fmt(p.grossMargin)}
                    </TableCell>
                    <TableCell className={`text-right text-sm font-medium tabular-nums ${
                      p.marginPct < 0 ? "text-red-600" : "text-green-600"
                    }`}>
                      {p.marginPct.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                        <a href={`/finance/costing/${p.productId}`}>Cost Detail</a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Price Effectiveness Tab ────────────────────────────────────────────────────

function PriceEffectivenessTab() {
  const baseCurrency = useBaseCurrency();
  const fmt = (n: number) => formatCurrency(n, baseCurrency);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["finance-price-effectiveness"],
    queryFn: async () => {
      const res = await fetch("/api/finance/reports/price-effectiveness", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json() as Promise<PriceEffectiveness>;
    },
    refetchInterval: 120_000,
  });

  const gaugeData = data ? [
    { name: "With Price", value: data.productsWithPrice, fill: "#16a34a" },
    { name: "No Price", value: data.totalProducts - data.productsWithPrice, fill: "#e5e7eb" },
  ] : [];

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Orders</p>
                <p className="text-xl font-bold">{data.totalOrders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-xl font-bold">{fmt(data.totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Gross Margin</p>
                <p className={`text-xl font-bold ${data.grossMarginPct < 0 ? "text-red-600" : "text-green-600"}`}>
                  {data.grossMarginPct.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Price Coverage</p>
                <p className="text-xl font-bold text-blue-600">{data.priceCoveragePct.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Coverage chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Price List Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <div className="relative w-32 h-32">
                  <ResponsiveContainer width={130} height={130}>
                    <BarChart data={gaugeData} layout="vertical">
                      <CartesianGrid strokeDasharray="0" horizontal={false} />
                      <XAxis type="number" hide domain={[0, data.totalProducts]} />
                      <YAxis type="category" hide dataKey="name" />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} stackId="a">
                        {gaugeData.map((d, i) => (
                          <Cell key={i} fill={d.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span className="text-sm">{data.productsWithPrice} products with price ({data.priceCoveragePct.toFixed(1)}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-200" />
                    <span className="text-sm">{data.totalProducts - data.productsWithPrice} products without price</span>
                  </div>
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <a href="/finance/costing">
                      <DollarSign className="w-3.5 h-3.5 mr-1" />
                      Set Prices
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Coverage Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground text-xs mb-1">Product Count</p>
                  <p className="font-bold">{data.totalProducts}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-green-700 text-xs mb-1">Priced</p>
                  <p className="font-bold text-green-800">{data.productsWithPrice}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-gray-600 text-xs mb-1">Unpriced</p>
                  <p className="font-bold text-gray-700">{data.totalProducts - data.productsWithPrice}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Refresh
            </Button>
          </div>
        </>
      ) : (
        <p className="text-center text-muted-foreground py-8">Failed to load price effectiveness data</p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function FinanceReportsPage() {
  return (
    <Layout>
      <PageHeader
        title="Finance Reports"
        description="Profitability analysis, price effectiveness, and financial performance metrics"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Reports" },
        ]}
      />
      <div className="p-6 max-w-6xl">
        <Tabs defaultValue="profitability">
          <TabsList className="mb-6">
            <TabsTrigger value="profitability" className="gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Profitability
            </TabsTrigger>
            <TabsTrigger value="price-effectiveness" className="gap-1.5">
              <Percent className="w-3.5 h-3.5" />
              Price Effectiveness
            </TabsTrigger>
          </TabsList>
          <TabsContent value="profitability">
            <ProfitabilityTab />
          </TabsContent>
          <TabsContent value="price-effectiveness">
            <PriceEffectivenessTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

export default function FinanceReportsPageWithGate() {
  return (
    <RoleGate roles={["admin", "operator"]}>
      <FinanceReportsPage />
    </RoleGate>
  );
}
