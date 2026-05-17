import { useState, useEffect } from "react";
import {
  useGetDashboardSummary,
  useGetLowStockAlerts,
  useGetPurchaseOrderAging,
  getGetLowStockAlertsQueryKey,
} from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Package,
  Boxes,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  XCircle,
  ArrowRight,
  TrendingDown,
  ShoppingCart,
  Zap,
  CalendarDays,
  Clock,
  CalendarCheck2,
  CalendarX2,
  DollarSign,
  TrendingUp,
  BarChart3,
  Percent,
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
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { Link } from "wouter";
import { useBaseCurrency } from "@/hooks/use-base-currency";
import { formatCurrency, getCurrencySymbol } from "@/lib/utils";

function movementIcon(type: string) {
  if (type === "inbound") return <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />;
  if (type === "outbound") return <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />;
  return <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />;
}

function movementBadge(type: string) {
  if (type === "inbound")
    return <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">inbound</Badge>;
  if (type === "outbound")
    return <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">outbound</Badge>;
  return <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">adjustment</Badge>;
}

function SeverityPill({ severity }: { severity: string }) {
  if (severity === "critical")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-2.5 h-2.5" />
        Out of stock
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <TrendingDown className="w-2.5 h-2.5" />
      Low stock
    </span>
  );
}

export default function Dashboard() {
  const baseCurrency = useBaseCurrency();
  const { data, isLoading } = useGetDashboardSummary();
  const { data: alertData, isLoading: alertsLoading } = useGetLowStockAlerts({
    query: { queryKey: getGetLowStockAlertsQueryKey() },
  });
  const { data: aging, isLoading: agingLoading } = useGetPurchaseOrderAging();
  const [finData, setFinData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/dashboard/financial")
      .then((r) => r.json())
      .then(setFinData)
      .catch(() => {});
  }, []);

  const alerts = alertData?.alerts ?? [];
  const hasAlerts = alerts.length > 0;

  const kpis = [
    {
      label: "Total SKUs",
      value: data?.totalProducts ?? 0,
      sub: `${data?.activeProducts ?? 0} active`,
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/8",
    },
    {
      label: "Total Bins",
      value: data?.totalBins ?? 0,
      sub: "across all warehouses",
      icon: Boxes,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Low Stock Alerts",
      value: data?.lowStockCount ?? 0,
      sub: "items below threshold",
      icon: AlertTriangle,
      color: data?.lowStockCount ? "text-amber-600" : "text-muted-foreground",
      bg: data?.lowStockCount ? "bg-amber-50" : "bg-muted",
    },
    {
      label: "Movements Today",
      value: data?.totalMovementsToday ?? 0,
      sub: "adjustments, in & out",
      icon: Activity,
      color: "text-accent",
      bg: "bg-accent/10",
    },
  ];

  const financialKpis = [
    {
      label: "Inventory Value",
      value: finData ? formatCurrency(finData.totalInventoryValue || 0, baseCurrency) : "—",
      sub: "total across all bins",
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "COGS (Month)",
      value: finData ? formatCurrency(finData.cogsThisMonth || 0, baseCurrency) : "—",
      sub: `${finData?.monthOrderCount ?? 0} orders shipped`,
      icon: BarChart3,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Avg Margin (Month)",
      value: finData ? `${(finData.avgMarginThisMonth ?? 0).toFixed(1)}%` : "—",
      sub: "blended across orders",
      icon: Percent,
      color: (finData?.avgMarginThisMonth ?? 0) >= 0 ? "text-emerald-600" : "text-red-600",
      bg: (finData?.avgMarginThisMonth ?? 0) >= 0 ? "bg-emerald-50" : "bg-red-50",
    },
    {
      label: "Low Stock Value",
      value: finData ? formatCurrency(finData.lowStockValue || 0, baseCurrency) : "—",
      sub: `${data?.lowStockCount ?? 0} items below threshold`,
      icon: TrendingDown,
      color: (finData?.lowStockValue || 0) > 0 ? "text-amber-600" : "text-muted-foreground",
      bg: (finData?.lowStockValue || 0) > 0 ? "bg-amber-50" : "bg-muted",
    },
  ];

  return (
    <Layout>
      <PageHeader
        title="Dashboard"
        subtitle="Warehouse operations at a glance"
        helpKey="/dashboard"
      />
      <div className="p-6 space-y-6">
        {/* KPI tiles */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="border-border/60" data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardContent className="pt-5 pb-4 px-5">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        {kpi.label}
                      </p>
                      <p className="text-3xl font-bold mt-1 text-foreground tabular-nums">
                        {kpi.value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                      <kpi.icon className={`w-4.5 h-4.5 ${kpi.color}`} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Financial KPI tiles */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Financial Overview</h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {financialKpis.map((kpi) => (
              <Card key={kpi.label} className="border-border/60">
                <CardContent className="pt-5 pb-4 px-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{kpi.label}</p>
                      <p className="text-2xl font-bold mt-1 text-foreground">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                      <kpi.icon className={`w-4.5 h-4.5 ${kpi.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Financial charts */}
        {finData && (
          <div className="grid grid-cols-2 gap-6">
            {/* Inventory value by warehouse */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Inventory Value by Warehouse</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={finData.valueByWarehouse}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="warehouseName" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${getCurrencySymbol(baseCurrency)}${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v, baseCurrency)} />
                    <Bar dataKey="totalValue" fill="#E8622A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* COGS trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">COGS Trend (30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={finData.cogsTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${getCurrencySymbol(baseCurrency)}${v.toFixed(0)}`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v, baseCurrency)} />
                    <Line type="monotone" dataKey="cogs" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Low-stock alert panel — only shown when there are alerts */}
        {(alertsLoading || hasAlerts) && (
          <Card className={`border-border/60 ${hasAlerts ? "border-amber-200 bg-amber-50/30" : ""}`}>
            <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${hasAlerts ? "text-amber-600" : "text-muted-foreground"}`} />
                Low Stock Alerts
                {!alertsLoading && hasAlerts && (
                  <div className="flex gap-1.5 ml-1">
                    {alertData!.criticalCount > 0 && (
                      <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 text-[10px]">
                        {alertData!.criticalCount} out of stock
                      </Badge>
                    )}
                    {alertData!.warningCount > 0 && (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-[10px]">
                        {alertData!.warningCount} low
                      </Badge>
                    )}
                  </div>
                )}
              </CardTitle>
              {hasAlerts && (
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" asChild className="text-xs h-7 gap-1 text-muted-foreground">
                    <Link href="/inventory?lowStock=true">
                      View all <ArrowRight className="w-3 h-3" />
                    </Link>
                  </Button>
                  <Button size="sm" asChild className="text-xs h-7 gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white">
                    <Link href="/purchase-orders/reorder">
                      <Zap className="w-3 h-3" />
                      Reorder
                    </Link>
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="px-0 pb-1">
              {alertsLoading ? (
                <div className="px-5 py-3 space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !hasAlerts ? null : (
                <div className="divide-y divide-amber-100">
                  {alerts.slice(0, 8).map((alert) => (
                    <div key={alert.productId} className="flex items-center gap-3 px-5 py-3 hover:bg-amber-50/60 transition-colors">
                      {/* Severity indicator */}
                      <div className={`w-1.5 h-8 rounded-full shrink-0 ${alert.severity === "critical" ? "bg-red-500" : "bg-amber-400"}`} />

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{alert.name}</p>
                          <SeverityPill severity={alert.severity} />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-[11px] text-muted-foreground font-mono">{alert.skuCode}</code>
                          {alert.category && (
                            <span className="text-[11px] text-muted-foreground">· {alert.category}</span>
                          )}
                          {alert.warehouseSummary.length > 0 && (
                            <span className="text-[11px] text-muted-foreground">
                              · {alert.warehouseSummary.map((w) => `${w.warehouseName}: ${w.qty}`).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Qty vs threshold */}
                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={`text-lg font-bold tabular-nums leading-none ${alert.severity === "critical" ? "text-red-600" : "text-amber-700"}`}>
                            {alert.totalQty}
                          </span>
                          <span className="text-xs text-muted-foreground">/ {alert.reorderThreshold}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          need {alert.shortfall} more
                        </p>
                      </div>

                      {/* Mini progress bar */}
                      <div className="w-16 shrink-0">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${alert.severity === "critical" ? "bg-red-400" : "bg-amber-400"}`}
                            style={{
                              width: alert.reorderThreshold > 0
                                ? `${Math.min(100, (alert.totalQty / alert.reorderThreshold) * 100)}%`
                                : "0%",
                            }}
                          />
                        </div>
                        <p className="text-[9px] text-muted-foreground text-center mt-0.5">
                          {alert.reorderThreshold > 0
                            ? `${Math.round((alert.totalQty / alert.reorderThreshold) * 100)}%`
                            : "0%"
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                  {alerts.length > 8 && (
                    <div className="px-5 py-2.5 text-center">
                      <Button variant="ghost" size="sm" asChild className="text-xs h-7 gap-1 text-muted-foreground">
                        <Link href="/inventory?lowStock=true">
                          +{alerts.length - 8} more alerts <ArrowRight className="w-3 h-3" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* PO Aging Widget */}
        {(agingLoading || (aging && aging.totalOpen > 0)) && (
          <Card className={`border-border/60 ${aging?.overdue ? "border-red-200" : ""}`}>
            <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShoppingCart className={`w-4 h-4 ${aging?.overdue ? "text-red-500" : "text-muted-foreground"}`} />
                Open Purchase Orders
                {!agingLoading && aging && (
                  <div className="flex gap-1.5 ml-1">
                    <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted text-[10px]">
                      {aging.totalOpen} open
                    </Badge>
                    {aging.overdue > 0 && (
                      <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 text-[10px]">
                        {aging.overdue} overdue
                      </Badge>
                    )}
                    {aging.dueThisWeek > 0 && (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-[10px]">
                        {aging.dueThisWeek} due this week
                      </Badge>
                    )}
                  </div>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs h-7 gap-1 text-muted-foreground">
                <Link href="/purchase-orders">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {agingLoading ? (
                <div className="space-y-2 pt-1">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : aging ? (
                <div className="space-y-4">
                  {/* Stat tiles */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      {
                        label: "Overdue",
                        value: aging.overdue,
                        icon: CalendarX2,
                        active: aging.overdue > 0,
                        activeCls: "bg-red-50 border-red-200 text-red-700",
                        inactiveCls: "bg-muted/40 border-border text-muted-foreground",
                        iconCls: aging.overdue > 0 ? "text-red-500" : "text-muted-foreground/50",
                      },
                      {
                        label: "Due this week",
                        value: aging.dueThisWeek,
                        icon: Clock,
                        active: aging.dueThisWeek > 0,
                        activeCls: "bg-amber-50 border-amber-200 text-amber-700",
                        inactiveCls: "bg-muted/40 border-border text-muted-foreground",
                        iconCls: aging.dueThisWeek > 0 ? "text-amber-500" : "text-muted-foreground/50",
                      },
                      {
                        label: "Upcoming",
                        value: aging.upcoming,
                        icon: CalendarCheck2,
                        active: aging.upcoming > 0,
                        activeCls: "bg-green-50 border-green-200 text-green-700",
                        inactiveCls: "bg-muted/40 border-border text-muted-foreground",
                        iconCls: aging.upcoming > 0 ? "text-green-500" : "text-muted-foreground/50",
                      },
                      {
                        label: "No date set",
                        value: aging.noDate,
                        icon: CalendarDays,
                        active: false,
                        activeCls: "",
                        inactiveCls: "bg-muted/40 border-border text-muted-foreground",
                        iconCls: "text-muted-foreground/50",
                      },
                    ].map((tile) => (
                      <div
                        key={tile.label}
                        className={`rounded-lg border px-3 py-2.5 flex items-center gap-2.5 ${tile.active ? tile.activeCls : tile.inactiveCls}`}
                      >
                        <tile.icon className={`w-4 h-4 shrink-0 ${tile.iconCls}`} />
                        <div>
                          <p className="text-xl font-bold tabular-nums leading-none">{tile.value}</p>
                          <p className="text-[10px] mt-0.5 leading-tight opacity-80">{tile.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Overdue PO list */}
                  {aging.overdueItems.length > 0 && (
                    <div className="rounded-lg border border-red-100 bg-red-50/30 overflow-hidden">
                      <div className="px-3 py-2 bg-red-50/60 border-b border-red-100">
                        <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide flex items-center gap-1.5">
                          <CalendarX2 className="w-3 h-3" /> Overdue orders
                        </p>
                      </div>
                      <div className="divide-y divide-red-100/60">
                        {aging.overdueItems.slice(0, 5).map((item) => (
                          <Link key={item.id} href={`/purchase-orders/${item.id}`}>
                            <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-red-50/60 transition-colors cursor-pointer">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-semibold text-red-700">{item.poNumber}</span>
                                  <span className="text-xs text-muted-foreground truncate">{item.supplierName}</span>
                                </div>
                                {item.expectedDeliveryDate && (
                                  <p className="text-[10px] text-red-500 mt-0.5">
                                    Due {format(parseISO(item.expectedDeliveryDate), "dd MMM yyyy")}
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
                                  {item.daysOverdue}d overdue
                                </span>
                              </div>
                              <ArrowRight className="w-3 h-3 text-red-400 shrink-0" />
                            </div>
                          </Link>
                        ))}
                        {aging.overdueItems.length > 5 && (
                          <div className="px-3 py-2 text-center">
                            <Button variant="ghost" size="sm" asChild className="text-xs h-6 text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Link href="/purchase-orders">+{aging.overdueItems.length - 5} more overdue</Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Recent Movements */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Recent Movements
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {isLoading ? (
              <div className="px-5 space-y-3 pb-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : !data?.recentMovements?.length ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No movements recorded yet
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {data.recentMovements.map((m) => (
                  <div
                    key={m.id}
                    data-testid={`movement-row-${m.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {movementIcon(m.movementType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {(m as any).product?.name ?? "Unknown product"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(m as any).bin?.zone?.warehouse?.name} &rsaquo;{" "}
                        {(m as any).bin?.zone?.name} &rsaquo;{" "}
                        {(m as any).bin?.code}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {movementBadge(m.movementType)}
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          m.quantity > 0 ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {m.quantity > 0 ? "+" : ""}
                        {m.quantity}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground shrink-0 w-24 text-right">
                      {formatDistanceToNow(new Date(m.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
