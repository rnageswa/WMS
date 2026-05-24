import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  Percent,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { RoleGate } from "@/components/role-gate";
import { useBaseCurrency } from "@/hooks/use-base-currency";
import { formatCurrency } from "@/lib/utils";

interface FinanceDashboardData {
  grossMarginPct: number;
  totalRevenue: number;
  totalCogs: number;
  avgMarkup: number;
  negativeMarginOrders: number;
  productsBelowFloor: number;
  revenueByCategory: { category: string; revenue: number; margin: number }[];
  marginTrend: { date: string; marginPct: number }[];
}

async function fetchFinanceDashboard(startDate?: string, endDate?: string): Promise<FinanceDashboardData> {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const res = await fetch(`/api/finance/dashboard${params.toString() ? `?${params}` : ""}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load finance dashboard");
  return res.json();
}

export default function FinanceDashboardPage() {
  return (
    <RoleGate roles={["admin", "operator"]}>
      <FinanceDashboardContent />
    </RoleGate>
  );
}

function FinanceDashboardContent() {
  const currency = useBaseCurrency();
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["finance-dashboard", dateRange.start, dateRange.end],
    queryFn: () => fetchFinanceDashboard(dateRange.start, dateRange.end),
    refetchInterval: 120_000,
  });

  const formatMoney = (val: number) => formatCurrency(val, currency);

  const kpiCards = data ? [
    {
      title: "Gross Margin",
      value: `${data.grossMarginPct.toFixed(1)}%`,
      icon: Percent,
      color: data.grossMarginPct >= 30 ? "text-green-600" : data.grossMarginPct >= 15 ? "text-amber-600" : "text-red-600",
      bg: data.grossMarginPct >= 30 ? "bg-green-50" : data.grossMarginPct >= 15 ? "bg-amber-50" : "bg-red-50",
    },
    {
      title: "Total Revenue",
      value: formatMoney(data.totalRevenue),
      icon: DollarSign,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Total COGS",
      value: formatMoney(data.totalCogs),
      icon: TrendingDown,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Avg Markup",
      value: `${data.avgMarkup.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Negative Margin Orders",
      value: data.negativeMarginOrders.toString(),
      icon: AlertTriangle,
      color: data.negativeMarginOrders > 0 ? "text-red-600" : "text-green-600",
      bg: data.negativeMarginOrders > 0 ? "bg-red-50" : "bg-green-50",
    },
    {
      title: "Products Below Floor",
      value: data.productsBelowFloor.toString(),
      icon: Package,
      color: data.productsBelowFloor > 0 ? "text-amber-600" : "text-green-600",
      bg: data.productsBelowFloor > 0 ? "bg-amber-50" : "bg-green-50",
    },
  ] : [];

  return (
    <Layout>
      <PageHeader
        title="Finance Dashboard"
        description="Financial KPIs, margin analysis, and profitability overview"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            {dataUpdatedAt && (
              <span className="text-xs text-muted-foreground">
                Last updated {new Date(dataUpdatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        }
      />

      <div className="p-6 max-w-6xl">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-7 w-16" />
                </CardContent>
              </Card>
            ))
          : kpiCards.map((kpi) => (
              <Card key={kpi.title}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`p-1.5 rounded-md ${kpi.bg}`}>
                      <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{kpi.title}</span>
                  </div>
                  <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Revenue by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : data?.revenueByCategory?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.revenueByCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: number) => formatMoney(val)} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="margin" fill="#10b981" radius={[4, 4, 0, 0]} name="Margin" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No revenue data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Margin Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Margin Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : data?.marginTrend?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.marginTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(val: number) => `${val.toFixed(1)}%`} />
                  <Line type="monotone" dataKey="marginPct" stroke="#E8622A" strokeWidth={2} dot={false} name="Margin %" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No margin trend data for selected period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert Banners */}
      {data && (data.negativeMarginOrders > 0 || data.productsBelowFloor > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {data.negativeMarginOrders > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <p className="font-medium text-red-800">{data.negativeMarginOrders} order(s) with negative margin</p>
                  <p className="text-sm text-red-600">Review and acknowledge margin alerts to prevent losses</p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto border-red-300 text-red-700 hover:bg-red-100" onClick={() => setLocation("/finance/margin/alerts")}>
                  View Alerts
                </Button>
              </CardContent>
            </Card>
          )}
          {data.productsBelowFloor > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 flex items-center gap-3">
                <Package className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">{data.productsBelowFloor} product(s) below margin floor</p>
                  <p className="text-sm text-amber-600">Prices may need adjustment to meet margin targets</p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => setLocation("/finance/pricing/simulator")}>
                  Simulator
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}


      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation("/finance/reports")}>
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="font-medium text-sm">Finance Reports</p>
            <p className="text-xs text-muted-foreground">Profitability & price analysis</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation("/finance/costing")}>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="font-medium text-sm">Product Costing</p>
            <p className="text-xs text-muted-foreground">MAC & cost variance</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation("/finance/pricing/simulator")}>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-orange-600" />
            <p className="font-medium text-sm">Pricing Simulator</p>
            <p className="text-xs text-muted-foreground">What-if price analysis</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation("/finance/margin/alerts")}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
            <p className="font-medium text-sm">Margin Alerts</p>
            <p className="text-xs text-muted-foreground">{data?.negativeMarginOrders ?? 0} active alerts</p>
          </CardContent>
        </Card>
      </div>
      </div>
    </Layout>
  );
}
