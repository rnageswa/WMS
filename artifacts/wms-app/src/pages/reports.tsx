import { useState, useEffect } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  useGetStockValueReport,
  useGetSupplierPerformanceReport,
  useGetStockVelocityReport,
  useGetVelocityAlertConfig,
  useUpdateVelocityAlertConfig,
  useSendVelocityAlert,
  usePreviewVelocityAlert,
  useListSkuAlertOverrides,
  useSetSkuAlertOverride,
  useDeleteSkuAlertOverride,
  useListProducts,
  useGetVelocityAlertHistory,
  useRetryVelocityAlert,
  type StockVelocityRow,
} from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  LabelList,
} from "recharts";
import {
  Download,
  BarChart3,
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Truck,
  CheckCircle,
  Clock,
  PackageCheck,
  Zap,
  ArrowUp,
  ArrowDown,
  Activity,
  Bell,
  BellOff,
  Send,
  CheckCircle2,
  Loader2,
  Pin,
  PinOff,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  History,
  CalendarClock,
  Bot,
  MousePointerClick,
  RefreshCw,
  XCircle,
  Receipt,
  Percent,
  FileSpreadsheet,
} from "lucide-react";
import { exportToExcel } from "@/lib/export-excel";
import { formatCurrency } from "@/lib/utils";
import { useBaseCurrency } from "@/hooks/use-base-currency";

const CHART_COLORS = [
  "#0F2540", "#E8622A", "#2563eb", "#16a34a",
  "#9333ea", "#db2777", "#d97706", "#0891b2",
  "#65a30d", "#7c3aed",
];

// ─── Stock Value types ────────────────────────────────────────────────────────

interface CategoryRow {
  category: string;
  totalValue: number;
  totalUnits: number;
  productCount: number;
  lowStockCount: number;
}

interface ProductRow {
  productId: string;
  skuCode: string;
  name: string;
  category: string;
  totalUnits: number;
  unitPrice: number | null;
  totalValue: number;
  reorderThreshold: number;
  isLow: boolean;
}

interface ReportData {
  generatedAt: string;
  totalStockValue: number;
  totalUnits: number;
  categories: CategoryRow[];
  products: ProductRow[];
}

function ChartTooltip({ active, payload, label, fmt: fmtFn }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as CategoryRow;
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">{d.productCount} products · {d.totalUnits.toLocaleString()} units</p>
      <p className="font-bold text-foreground mt-0.5">{fmtFn(d.totalValue)}</p>
      {d.lowStockCount > 0 && (
        <p className="text-amber-600 text-xs mt-0.5">{d.lowStockCount} low-stock</p>
      )}
    </div>
  );
}

// ─── Supplier Performance types ───────────────────────────────────────────────

interface SupplierRow {
  supplierId: string | null;
  supplierName: string;
  totalOrders: number;
  receivedOrders: number;
  cancelledOrders: number;
  openOrders: number;
  onTimeOrders: number;
  ordersWithDate: number;
  onTimeRate: number | null;
  avgLeadTimeDays: number | null;
  totalItemsOrdered: number;
  totalItemsReceived: number;
  fillRate: number | null;
  totalSpend: number | null;
  lastOrderDate: string | null;
}

function RateBadge({ value, suffix = "%" }: { value: number | null; suffix?: string }) {
  if (value === null) return <span className="text-muted-foreground text-xs">—</span>;
  const color =
    value >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    value >= 70 ? "bg-amber-50 text-amber-700 border-amber-200" :
    "bg-red-50 text-red-700 border-red-200";
  return (
    <Badge className={`${color} hover:${color} text-[10px] font-bold`}>
      {value}{suffix}
    </Badge>
  );
}

function SupplierTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as SupplierRow;
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm max-w-[200px]">
      <p className="font-semibold text-foreground mb-1 truncate">{d.supplierName}</p>
      <p className="text-muted-foreground text-xs">{d.onTimeOrders}/{d.ordersWithDate} on-time deliveries</p>
      {d.fillRate !== null && <p className="text-muted-foreground text-xs">{d.fillRate}% fill rate</p>}
    </div>
  );
}

// ─── Stock Value Tab ──────────────────────────────────────────────────────────

function StockValueTab() {
  const baseCurrency = useBaseCurrency();
  const fmt = (n: number) => formatCurrency(n, baseCurrency);
  const fmtFull = (n: number) => formatCurrency(n, baseCurrency);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const { data, isLoading } = useGetStockValueReport();
  const report = data as ReportData | undefined;

  const categoryProducts = (cat: string) =>
    report?.products.filter((p) => p.category === cat) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {report ? (
            <>Generated {new Date(report.generatedAt).toLocaleString()}</>
          ) : (
            <Skeleton className="h-4 w-40" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open("/api/reports/inventory-csv", "_blank")} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
            const items = (report as any)?.products ?? (report as any)?.items ?? [];
            if (!items.length) return;
            const rows = items.map((item: Record<string, unknown>) => ({
              SKU: item.skuCode ?? "",
              Product: item.productName ?? item.name ?? "",
              Category: item.category ?? "",
              "Qty On Hand": item.qtyOnHand ?? item.currentStock ?? 0,
              "Stock Value": item.stockValue ?? "",
              "Reorder Threshold": item.reorderThreshold ?? 0,
            }));
            exportToExcel(rows, "inventory-report");
          }}>
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Stock Value", icon: DollarSign, value: report ? fmtFull(report.totalStockValue) : null },
          { label: "Total Units", icon: Package, value: report ? report.totalUnits.toLocaleString() : null },
          { label: "Categories", icon: BarChart3, value: report ? String(report.categories.length) : null },
        ].map(({ label, icon: Icon, value }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                {value !== null ? (
                  <p className="text-xl font-bold tabular-nums">{value}</p>
                ) : (
                  <Skeleton className="h-6 w-24 mt-0.5" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            Stock Value by Category
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : !report?.categories.length ? (
            <p className="text-sm text-center text-muted-foreground py-16">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={report.categories} margin={{ top: 4, right: 4, left: 0, bottom: 4 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<ChartTooltip fmt={fmt} />} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="totalValue" radius={[4, 4, 0, 0]}>
                  {report.categories.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-1">
          {isLoading ? (
            <div className="px-5 py-4 space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Category</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Products</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Units</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Stock Value</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">% of Total</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Alerts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report?.categories.map((cat, i) => {
                  const pct = report.totalStockValue > 0 ? ((cat.totalValue / report.totalStockValue) * 100).toFixed(1) : "0.0";
                  const isExpanded = expandedCategory === cat.category;
                  const prods = categoryProducts(cat.category);
                  return [
                    <TableRow key={cat.category} className="cursor-pointer hover:bg-muted/40" onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-sm font-medium">{cat.category}</span>
                          <span className="text-[10px] text-muted-foreground">{isExpanded ? "▲" : "▼"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{cat.productCount}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{cat.totalUnits.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-sm">{fmtFull(cat.totalValue)}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{pct}%</TableCell>
                      <TableCell>
                        {cat.lowStockCount > 0 && (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-[10px] gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />{cat.lowStockCount} low
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>,
                    isExpanded && (
                      <TableRow key={`${cat.category}-expanded`} className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={6} className="p-0">
                          <div className="px-8 py-2 border-t border-border/40">
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent border-b border-border/30">
                                  {["SKU", "Product", "Units", "Unit Price", "Value", ""].map(h => (
                                    <TableHead key={h} className={`text-[10px] uppercase tracking-wide text-muted-foreground font-semibold py-1.5 h-auto ${h === "Units" || h === "Unit Price" || h === "Value" ? "text-right" : ""}`}>{h}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {prods.map((p) => (
                                  <TableRow key={p.productId} className="hover:bg-muted/10 border-b border-border/20">
                                    <TableCell className="font-mono text-[11px] text-muted-foreground py-1.5">{p.skuCode}</TableCell>
                                    <TableCell className="text-xs font-medium py-1.5">{p.name}</TableCell>
                                    <TableCell className="text-right tabular-nums text-xs py-1.5">{p.totalUnits.toLocaleString()}</TableCell>
                                    <TableCell className="text-right tabular-nums text-xs text-muted-foreground py-1.5">{p.unitPrice !== null ? fmtFull(p.unitPrice) : "—"}</TableCell>
                                    <TableCell className="text-right font-bold tabular-nums text-xs py-1.5">{fmtFull(p.totalValue)}</TableCell>
                                    <TableCell className="py-1.5">{p.isLow && <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-[10px]">Low</Badge>}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    ),
                  ];
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Supplier Performance Tab ─────────────────────────────────────────────────

function SupplierPerformanceTab() {
  const baseCurrency = useBaseCurrency();
  const fmt = (n: number) => formatCurrency(n, baseCurrency);
  const { data, isLoading } = useGetSupplierPerformanceReport();
  const report = data as { generatedAt: string; suppliers: SupplierRow[] } | undefined;
  const suppliers = report?.suppliers ?? [];

  const suppliersWithData = suppliers.filter((s) => s.ordersWithDate > 0);
  const avgOnTime = suppliersWithData.length > 0
    ? Math.round(suppliersWithData.reduce((s, r) => s + (r.onTimeRate ?? 0), 0) / suppliersWithData.length)
    : null;

  const suppliersWithFill = suppliers.filter((s) => s.fillRate !== null);
  const avgFillRate = suppliersWithFill.length > 0
    ? Math.round(suppliersWithFill.reduce((s, r) => s + (r.fillRate ?? 0), 0) / suppliersWithFill.length)
    : null;

  const totalSpend = suppliers.reduce((s, r) => s + (r.totalSpend ?? 0), 0);

  const chartData = suppliers
    .filter((s) => s.onTimeRate !== null)
    .map((s) => ({ ...s, name: s.supplierName }))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Generated at + export */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {report ? (
            <>Generated {new Date(report.generatedAt).toLocaleString()}</>
          ) : (
            <Skeleton className="h-4 w-40" />
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active Suppliers", icon: Truck, value: isLoading ? null : String(suppliers.length) },
          { label: "Avg On-Time Rate", icon: CheckCircle, value: isLoading ? null : avgOnTime !== null ? `${avgOnTime}%` : "—", accent: avgOnTime !== null && avgOnTime < 70 ? "text-red-600" : avgOnTime !== null && avgOnTime < 90 ? "text-amber-600" : "text-emerald-600" },
          { label: "Avg Fill Rate", icon: PackageCheck, value: isLoading ? null : avgFillRate !== null ? `${avgFillRate}%` : "—", accent: avgFillRate !== null && avgFillRate < 70 ? "text-red-600" : avgFillRate !== null && avgFillRate < 90 ? "text-amber-600" : "text-emerald-600" },
          { label: "Total Spend", icon: DollarSign, value: isLoading ? null : totalSpend > 0 ? fmt(totalSpend) : "—" },
        ].map(({ label, icon: Icon, value, accent }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                {value !== null ? (
                  <p className={`text-xl font-bold tabular-nums ${accent ?? ""}`}>{value}</p>
                ) : (
                  <Skeleton className="h-6 w-20 mt-0.5" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* On-time rate chart */}
      {(isLoading || chartData.length > 0) && (
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
              On-Time Delivery Rate by Supplier
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {isLoading ? (
              <Skeleton className="h-44 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(chartData.length * 40, 120)}>
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<SupplierTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="onTimeRate" radius={[0, 4, 4, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={
                        (d.onTimeRate ?? 0) >= 90 ? "#16a34a" :
                        (d.onTimeRate ?? 0) >= 70 ? "#d97706" : "#dc2626"
                      } />
                    ))}
                    <LabelList dataKey="onTimeRate" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: "#374151" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metrics table */}
      <Card className="border-border/60">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold">Supplier Metrics</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-1">
          {isLoading ? (
            <div className="px-5 py-4 space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : suppliers.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-12">No purchase order data yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Supplier</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Total POs</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Open</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Received</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-center">On-Time Rate</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-center">Fill Rate</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Avg Lead Time</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Total Spend</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Last Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s) => (
                  <TableRow key={s.supplierId ?? s.supplierName} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex flex-col">
                        {s.supplierId ? (
                          <Link href={`/suppliers/${s.supplierId}`}>
                            <span className="text-sm font-medium hover:text-[#E8622A] cursor-pointer">{s.supplierName}</span>
                          </Link>
                        ) : (
                          <span className="text-sm font-medium">{s.supplierName}</span>
                        )}
                        {s.cancelledOrders > 0 && (
                          <span className="text-[10px] text-muted-foreground">{s.cancelledOrders} cancelled</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-semibold">{s.totalOrders}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {s.openOrders > 0 ? (
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 text-[10px]">{s.openOrders}</Badge>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{s.receivedOrders}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <RateBadge value={s.onTimeRate} />
                        {s.ordersWithDate > 0 && (
                          <span className="text-[9px] text-muted-foreground">{s.onTimeOrders}/{s.ordersWithDate} POs</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <RateBadge value={s.fillRate} />
                        {s.totalItemsOrdered > 0 && (
                          <span className="text-[9px] text-muted-foreground">{s.totalItemsReceived}/{s.totalItemsOrdered} items</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {s.avgLeadTimeDays !== null ? (
                        <span className="flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {s.avgLeadTimeDays}d
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">
                      {s.totalSpend !== null ? fmt(s.totalSpend) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                      {s.lastOrderDate ? new Date(s.lastOrderDate + "T00:00:00").toLocaleDateString() : "—"}
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

// ─── Stock Velocity Tab ───────────────────────────────────────────────────────

const VELOCITY_DAYS = [
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

function velocityTier(row: StockVelocityRow, maxVel: number): "fast" | "medium" | "slow" | "idle" {
  if (row.totalUnitsMoved === 0) return "idle";
  const ratio = maxVel > 0 ? row.velocityPerDay / maxVel : 0;
  if (ratio >= 0.6) return "fast";
  if (ratio >= 0.25) return "medium";
  return "slow";
}

const TIER_STYLES = {
  fast:   { badge: "bg-[#E8622A]/10 text-[#E8622A] border-[#E8622A]/20", bar: "#E8622A",  dot: "bg-[#E8622A]" },
  medium: { badge: "bg-amber-50 text-amber-700 border-amber-200",          bar: "#d97706",  dot: "bg-amber-500" },
  slow:   { badge: "bg-muted/60 text-muted-foreground border-border",       bar: "#9ca3af",  dot: "bg-gray-400" },
  idle:   { badge: "bg-muted/40 text-muted-foreground/60 border-border/40", bar: "#e5e7eb",  dot: "bg-gray-200" },
};

function VelocityTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as StockVelocityRow;
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm max-w-[200px]">
      <p className="font-semibold truncate">{d.name}</p>
      <p className="text-muted-foreground text-xs font-mono">{d.skuCode}</p>
      <div className="mt-1.5 space-y-0.5 text-xs">
        <p>
          <span className="text-green-600 font-medium">↑ {d.unitsIn}</span>
          {" in · "}
          <span className="text-red-500 font-medium">↓ {d.unitsOut}</span>
          {" out"}
        </p>
        <p className="text-muted-foreground">{d.velocityPerDay} units/day · {d.totalMoves} movements</p>
      </div>
    </div>
  );
}

function StockVelocityTab() {
  const baseCurrency = useBaseCurrency();
  const [days, setDays] = useState(30);
  const { data, isLoading } = useGetStockVelocityReport({ days });

  const rows = data?.rows ?? [];
  const maxVel = rows.length > 0 ? Math.max(...rows.map((r) => r.velocityPerDay), 0) : 0;

  const fastMovers   = rows.filter((r) => velocityTier(r, maxVel) === "fast");
  const riskRows     = rows.filter((r) => r.reorderRisk && r.totalUnitsMoved > 0);
  const activeMovers = rows.filter((r) => r.totalUnitsMoved > 0);
  const avgVel =
    activeMovers.length > 0
      ? (activeMovers.reduce((s, r) => s + r.velocityPerDay, 0) / activeMovers.length).toFixed(2)
      : "0.00";

  const chartData = rows.slice(0, 12);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {data ? (
            <>Generated {new Date(data.generatedAt).toLocaleString()} · last {days} days</>
          ) : (
            <Skeleton className="h-4 w-52" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.open(`/api/reports/stock-velocity-csv?days=${days}`, "_blank")}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!rows?.length}
            onClick={() => {
              if (!rows?.length) return;
              const excelRows = rows.map((r: StockVelocityRow) => ({
                SKU: r.skuCode ?? "",
                Product: r.name ?? "",
                Category: r.category ?? "",
                "Qty On Hand": r.currentStock ?? 0,
                "Outbound (period)": r.unitsOut ?? 0,
                "Velocity/Day": r.velocityPerDay ?? 0,
                "Reorder Risk": r.reorderRisk ? "Yes" : "No",
                "Days of Stock": r.daysOfStockRemaining ?? "—",
              }));
              exportToExcel(excelRows, `stock-velocity-${days}d`);
            }}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel
          </Button>
          <div className="flex items-center gap-1 border border-border rounded-md p-0.5 bg-muted/30">
            {VELOCITY_DAYS.map((opt) => (
              <button
                key={opt.value}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  days === opt.value
                    ? "bg-[#E8622A] text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setDays(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "SKUs Analyzed",
            icon: Package,
            value: isLoading ? null : String(rows.length),
            sub: `${activeMovers.length} with activity`,
            accent: false, warn: false,
          },
          {
            label: "Avg Velocity",
            icon: Activity,
            value: isLoading ? null : `${avgVel}/day`,
            sub: "units moved per day",
            accent: false, warn: false,
          },
          {
            label: "Fast Movers",
            icon: Zap,
            value: isLoading ? null : String(fastMovers.length),
            sub: "top throughput SKUs",
            accent: fastMovers.length > 0, warn: false,
          },
          {
            label: "Reorder Risk",
            icon: AlertTriangle,
            value: isLoading ? null : String(riskRows.length),
            sub: "active + below threshold",
            accent: false, warn: riskRows.length > 0,
          },
        ].map(({ label, icon: Icon, value, sub, accent, warn }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="px-5 py-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                warn ? "bg-amber-50" : accent ? "bg-[#E8622A]/10" : "bg-muted"
              }`}>
                <Icon className={`w-4 h-4 ${warn ? "text-amber-600" : accent ? "text-[#E8622A]" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                {value !== null ? (
                  <p className={`text-xl font-bold tabular-nums ${warn && riskRows.length > 0 ? "text-amber-600" : ""}`}>
                    {value}
                  </p>
                ) : (
                  <Skeleton className="h-6 w-16 mt-0.5" />
                )}
                <p className="text-[10px] text-muted-foreground">{sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar chart — top SKUs */}
      <Card className="border-border/60">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            Top SKUs by Units Moved
            <span className="text-xs font-normal text-muted-foreground ml-1">(inbound + outbound)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {isLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : !chartData.length || chartData.every((r) => r.totalUnitsMoved === 0) ? (
            <p className="text-sm text-center text-muted-foreground py-16">No movement data for this period</p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3 text-[11px] text-muted-foreground">
                {(["fast", "medium", "slow", "idle"] as const).map((t) => (
                  <span key={t} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: TIER_STYLES[t].bar }} />
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 32 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="skuCode"
                    tick={{ fontSize: 10, fill: "#6b7280", fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<VelocityTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="totalUnitsMoved" radius={[4, 4, 0, 0]}>
                    {chartData.map((row, i) => (
                      <Cell key={i} fill={TIER_STYLES[velocityTier(row, maxVel)].bar} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* Full SKU table */}
      <Card className="border-border/60">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold">All SKUs — Velocity Ranking</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-1">
          {isLoading ? (
            <div className="px-5 py-4 space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  {["#", "SKU", "Product", "Category", "In", "Out", "Total", "Velocity", "Stock", "Days Left", "Risk", "Last Move"].map((h, i) => (
                    <TableHead
                      key={h}
                      className={`text-xs uppercase tracking-wide text-muted-foreground font-semibold ${
                        i >= 4 && i <= 9 ? "text-right" : ""
                      } ${i === 0 ? "pl-5 w-[1%] whitespace-nowrap" : ""}`}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => {
                  const tier = velocityTier(row, maxVel);
                  const styles = TIER_STYLES[tier];
                  const barPct = maxVel > 0 ? (row.velocityPerDay / maxVel) * 100 : 0;
                  const lastMove = row.lastMovementAt
                    ? new Date(row.lastMovementAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                    : null;
                  return (
                    <TableRow key={row.productId} className="hover:bg-muted/20">
                      <TableCell className="text-xs text-muted-foreground tabular-nums pl-5">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{row.skuCode}</TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate">{row.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-normal">{row.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        <span className="text-green-600 font-medium flex items-center justify-end gap-0.5">
                          <ArrowUp className="w-3 h-3 shrink-0" />{row.unitsIn}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        <span className="text-red-500 font-medium flex items-center justify-end gap-0.5">
                          <ArrowDown className="w-3 h-3 shrink-0" />{row.unitsOut}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-semibold">{row.totalUnitsMoved}</TableCell>
                      <TableCell className="text-right min-w-[130px]">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-14 h-1.5 bg-muted/60 rounded-full overflow-hidden shrink-0">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${barPct}%`, backgroundColor: styles.bar }}
                            />
                          </div>
                          <Badge className={`${styles.badge} text-[10px] font-semibold tabular-nums border shrink-0`}>
                            {row.velocityPerDay}/d
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        <span className={row.reorderRisk ? "text-amber-600 font-semibold" : ""}>{row.currentStock}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">/ {row.reorderThreshold}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.daysOfStockRemaining === null ? (
                          <span className="text-[11px] text-muted-foreground/50">∞</span>
                        ) : row.daysOfStockRemaining <= 7 ? (
                          <Badge className="bg-red-50 text-red-600 border-red-200 hover:bg-red-50 text-[10px] font-bold tabular-nums border">
                            {row.daysOfStockRemaining}d
                          </Badge>
                        ) : row.daysOfStockRemaining <= 30 ? (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-[10px] font-bold tabular-nums border">
                            {row.daysOfStockRemaining}d
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground tabular-nums">{row.daysOfStockRemaining}d</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.reorderRisk ? (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-[10px] font-semibold gap-0.5 border">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Low Stock
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {lastMove ?? <span className="opacity-40">never</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertSettingsCard />
      <SkuExceptionsCard />
      <AlertHistoryCard />
    </div>
  );
}

// ─── Velocity Alert Settings Card ─────────────────────────────────────────────

const THRESHOLD_OPTIONS = [7, 14, 30, 60];
const LOOKBACK_OPTIONS = [
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

function AlertSettingsCard() {
  const { data: config, isLoading, refetch } = useGetVelocityAlertConfig();
  const updateConfig = useUpdateVelocityAlertConfig();
  const sendAlert = useSendVelocityAlert();

  const [email, setEmail] = useState("");
  const [thresholdDays, setThresholdDays] = useState(14);
  const [lookbackDays, setLookbackDays] = useState(30);
  const [enabled, setEnabled] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [sendMessage, setSendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setEmail(config.recipientEmail ?? "");
      setThresholdDays(config.thresholdDays);
      setLookbackDays(config.lookbackDays);
      setEnabled(config.enabled);
      setDirty(false);
    }
  }, [config]);

  const { data: preview } = usePreviewVelocityAlert({
    threshold: thresholdDays,
    lookback: lookbackDays,
  });

  const handleSave = async () => {
    setSaveStatus("saving");
    await updateConfig.mutateAsync({
      data: { thresholdDays, lookbackDays, recipientEmail: email, enabled },
    });
    await refetch();
    setDirty(false);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const handleSend = async () => {
    setSendStatus("sending");
    try {
      const result = await sendAlert.mutateAsync();
      if (result.sent) {
        setSendStatus("sent");
        setSendMessage(result.message ?? null);
        await refetch();
      } else {
        setSendStatus("error");
        setSendMessage(result.message ?? "Could not send alert.");
      }
    } catch {
      setSendStatus("error");
      setSendMessage("Unexpected error sending alert.");
    }
    setTimeout(() => { setSendStatus("idle"); setSendMessage(null); }, 4000);
  };

  const mark = () => setDirty(true);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const lastSent = config?.lastSentAt
    ? new Date(config.lastSentAt).toLocaleString()
    : null;

  const atRiskCount = preview?.atRiskCount ?? 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {enabled ? (
              <Bell className="w-4 h-4 text-[#E8622A]" />
            ) : (
              <BellOff className="w-4 h-4 text-muted-foreground" />
            )}
            <CardTitle className="text-base">Daily Velocity Alert</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="alert-enabled" className="text-sm text-muted-foreground cursor-pointer">
              {enabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              id="alert-enabled"
              checked={enabled}
              onCheckedChange={(v) => { setEnabled(v); mark(); }}
            />
          </div>
        </div>
        <CardDescription>
          Send an automated email at 8:00 AM daily when any SKU's stock runway falls below the threshold.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* At-risk preview badge */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border border-border">
          <Activity className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">
            Right now,{" "}
            <span
              className={`font-semibold ${
                atRiskCount > 0 ? "text-[#E8622A]" : "text-emerald-600"
              }`}
            >
              {atRiskCount} SKU{atRiskCount !== 1 ? "s" : ""}
            </span>{" "}
            {atRiskCount === 1 ? "has" : "have"} fewer than{" "}
            <span className="font-medium">{thresholdDays} days</span> of stock remaining.
          </span>
          {lastSent && (
            <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
              Last sent: {lastSent}
            </span>
          )}
        </div>

        <Separator />

        {/* Email */}
        <div className="grid gap-1.5">
          <Label htmlFor="alert-email" className="text-sm font-medium">
            Recipient email
          </Label>
          <Input
            id="alert-email"
            type="email"
            placeholder="ops@your-company.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); mark(); }}
            className="max-w-sm"
          />
        </div>

        {/* Threshold */}
        <div className="grid gap-2">
          <Label className="text-sm font-medium">Alert threshold (days of stock remaining)</Label>
          <div className="flex gap-2">
            {THRESHOLD_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => { setThresholdDays(opt); mark(); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  thresholdDays === opt
                    ? "bg-[#E8622A] text-white border-[#E8622A]"
                    : "bg-background border-border text-muted-foreground hover:border-[#E8622A]/60"
                }`}
              >
                {opt}d
              </button>
            ))}
          </div>
        </div>

        {/* Lookback */}
        <div className="grid gap-2">
          <Label className="text-sm font-medium">Velocity lookback window</Label>
          <div className="flex gap-2">
            {LOOKBACK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setLookbackDays(opt.value); mark(); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  lookbackDays === opt.value
                    ? "bg-[#0F2540] text-white border-[#0F2540]"
                    : "bg-background border-border text-muted-foreground hover:border-[#0F2540]/60"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={handleSave}
            disabled={!dirty || saveStatus === "saving"}
            className="bg-[#E8622A] hover:bg-[#d05520] text-white gap-2"
          >
            {saveStatus === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
            {saveStatus === "saved" && <CheckCircle2 className="w-4 h-4" />}
            {saveStatus === "saved" ? "Saved" : "Save Settings"}
          </Button>

          <Button
            variant="outline"
            onClick={handleSend}
            disabled={!email || sendStatus === "sending"}
            className="gap-2"
          >
            {sendStatus === "sending" && <Loader2 className="w-4 h-4 animate-spin" />}
            {sendStatus === "sent" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {sendStatus === "error" && <AlertTriangle className="w-4 h-4 text-destructive" />}
            {sendStatus === "idle" && <Send className="w-4 h-4" />}
            {sendStatus === "sending"
              ? "Sending…"
              : sendStatus === "sent"
              ? "Sent!"
              : sendStatus === "error"
              ? "Failed"
              : "Send Test Email Now"}
          </Button>

          {sendMessage && (
            <span
              className={`text-sm ${
                sendStatus === "error" ? "text-destructive" : "text-emerald-600"
              }`}
            >
              {sendMessage}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── SKU Alert Exceptions Card ────────────────────────────────────────────────

function SkuExceptionsCard() {
  const { data: overrides = [], refetch } = useListSkuAlertOverrides();
  const { data: allProducts = [] } = useListProducts();
  const setOverride = useSetSkuAlertOverride();
  const removeOverride = useDeleteSkuAlertOverride();

  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<"always" | "never">("always");
  const [showDropdown, setShowDropdown] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const existingIds = new Set(overrides.map((o) => o.productId));
  const selectedProduct = allProducts.find((p) => p.id === selectedId) ?? null;

  const filteredProducts = allProducts.filter(
    (p) =>
      p.isActive &&
      !existingIds.has(p.id) &&
      (search.length === 0 ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.skuCode.toLowerCase().includes(search.toLowerCase()))
  );

  const alwaysGroup = overrides.filter((o) => o.mode === "always");
  const neverGroup = overrides.filter((o) => o.mode === "never");

  const handleAdd = async () => {
    if (!selectedId) return;
    setPending(selectedId);
    await setOverride.mutateAsync({ productId: selectedId, data: { mode: selectedMode } });
    await refetch();
    setSelectedId(null);
    setSearch("");
    setPending(null);
  };

  const handleRemove = async (productId: string) => {
    setPending(productId);
    await removeOverride.mutateAsync({ productId });
    await refetch();
    setPending(null);
  };

  const overrideChip = (mode: "always" | "never") =>
    mode === "always" ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700">
        <Pin className="w-2.5 h-2.5" /> Always
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
        <PinOff className="w-2.5 h-2.5" /> Never
      </span>
    );

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              SKU Alert Exceptions
              {overrides.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {alwaysGroup.length > 0 && `${alwaysGroup.length} always`}
                  {alwaysGroup.length > 0 && neverGroup.length > 0 && " · "}
                  {neverGroup.length > 0 && `${neverGroup.length} never`}
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-0.5">
              Pin SKUs to always appear in alerts, or suppress them entirely.
            </CardDescription>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5 pt-0">
          <Separator />

          {/* Add new override */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Add an exception</p>

            <div className="flex gap-2 items-start flex-wrap">
              {/* Product search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-8 text-sm"
                  placeholder="Search SKU or product name…"
                  value={selectedProduct ? `${selectedProduct.skuCode} — ${selectedProduct.name}` : search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedId(null);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                />
                {showDropdown && !selectedId && filteredProducts.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-background border border-border rounded-md shadow-lg max-h-52 overflow-y-auto">
                    {filteredProducts.slice(0, 20).map((p) => (
                      <button
                        key={p.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                        onMouseDown={() => {
                          setSelectedId(p.id);
                          setSearch("");
                          setShowDropdown(false);
                        }}
                      >
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.skuCode}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mode selector */}
              <div className="flex rounded-md overflow-hidden border border-border shrink-0">
                <button
                  onClick={() => setSelectedMode("always")}
                  className={`px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1 ${
                    selectedMode === "always"
                      ? "bg-violet-600 text-white"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Pin className="w-3 h-3" /> Always
                </button>
                <button
                  onClick={() => setSelectedMode("never")}
                  className={`px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1 border-l border-border ${
                    selectedMode === "never"
                      ? "bg-slate-600 text-white"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <PinOff className="w-3 h-3" /> Never
                </button>
              </div>

              <Button
                onClick={handleAdd}
                disabled={!selectedId || !!pending}
                className="bg-[#E8622A] hover:bg-[#d05520] text-white shrink-0"
                size="sm"
              >
                {pending === selectedId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Exception"}
              </Button>
            </div>
          </div>

          {/* Existing overrides */}
          {overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No exceptions configured — all SKUs use the global threshold.
            </p>
          ) : (
            <div className="space-y-3">
              {[...alwaysGroup, ...neverGroup].map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {overrideChip(o.mode as "always" | "never")}
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{o.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{o.skuCode}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Flip mode */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                      disabled={!!pending}
                      onClick={async () => {
                        setPending(o.productId);
                        await setOverride.mutateAsync({
                          productId: o.productId,
                          data: { mode: o.mode === "always" ? "never" : "always" },
                        });
                        await refetch();
                        setPending(null);
                      }}
                    >
                      {o.mode === "always" ? "Switch to Never" : "Switch to Always"}
                    </Button>
                    {/* Remove */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      disabled={pending === o.productId}
                      onClick={() => handleRemove(o.productId)}
                    >
                      {pending === o.productId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Alert History Card ───────────────────────────────────────────────────────

function AlertHistoryCard() {
  const { data: entries = [], isLoading, refetch } = useGetVelocityAlertHistory({ limit: 30 });
  const retry = useRetryVelocityAlert();
  const [expanded, setExpanded] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryMsg, setRetryMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  return (
    <Card>
      <CardHeader
        className="pb-3 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              Alert History
              {entries.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {entries.length} send{entries.length !== 1 ? "s" : ""}
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-0.5">
              A record of every velocity alert email that has been sent.
            </CardDescription>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-2">
          <Separator className="mb-4" />

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <CalendarClock className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No alerts have been sent yet.</p>
              <p className="text-xs text-muted-foreground/60">
                History will appear here after the first successful email send.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const isOpen = openId === entry.id;
                const date = new Date(entry.sentAt);
                const urgentCount = entry.skus.filter(
                  (s) => s.daysOfStockRemaining !== null && s.daysOfStockRemaining <= 7
                ).length;

                return (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-border overflow-hidden"
                  >
                    {/* Row header */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                      onClick={() => setOpenId(isOpen ? null : entry.id)}
                    >
                      {/* Delivery status */}
                      {entry.status === "sent" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      )}

                      {/* Trigger badge */}
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          entry.triggeredBy === "scheduler"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-orange-50 text-[#E8622A]"
                        }`}
                      >
                        {entry.triggeredBy === "scheduler" ? (
                          <Bot className="w-2.5 h-2.5" />
                        ) : (
                          <MousePointerClick className="w-2.5 h-2.5" />
                        )}
                        {entry.triggeredBy === "scheduler" ? "Scheduled" : "Manual"}
                      </span>

                      {/* Date/time */}
                      <span className="text-sm font-medium text-foreground">
                        {date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </span>

                      <span className="ml-auto flex items-center gap-2 shrink-0">
                        {entry.status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                            disabled={retrying === entry.id}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setRetrying(entry.id);
                              setRetryMsg(null);
                              try {
                                const r = await retry.mutateAsync({ id: entry.id });
                                setRetryMsg({ id: entry.id, ok: !!r.sent, text: r.message ?? (r.sent ? "Resent successfully" : "Retry failed") });
                                if (r.sent) refetch();
                              } catch {
                                setRetryMsg({ id: entry.id, ok: false, text: "Unexpected error" });
                              } finally {
                                setRetrying(null);
                              }
                            }}
                          >
                            <RefreshCw className={`w-3 h-3 ${retrying === entry.id ? "animate-spin" : ""}`} />
                            Retry
                          </Button>
                        )}
                        {urgentCount > 0 && entry.status === "sent" && (
                          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            {urgentCount} critical
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {entry.skuCount} SKU{entry.skuCount !== 1 ? "s" : ""} · {entry.thresholdDays}d threshold
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </span>
                    </button>

                    {/* Expanded SKU list */}
                    {isOpen && (
                      <div className="border-t border-border bg-muted/10 px-4 py-3 space-y-1.5">
                        {entry.status === "failed" && entry.errorMessage && (
                          <div className="flex items-center gap-2 mb-2 text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Delivery failed: {entry.errorMessage}</span>
                          </div>
                        )}
                        {retryMsg && retryMsg.id === entry.id && (
                          <div className={`flex items-center gap-2 mb-2 text-xs rounded-md px-3 py-2 ${retryMsg.ok ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"}`}>
                            {retryMsg.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                            <span>{retryMsg.text}</span>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mb-2">
                          Sent to <span className="font-medium text-foreground">{entry.recipientEmail}</span>
                          {" · "}lookback {entry.lookbackDays}d
                        </div>
                        <div className="grid gap-1">
                          {entry.skus.map((s) => {
                            const days = s.daysOfStockRemaining;
                            const isUrgent = days !== null && days <= 7;
                            return (
                              <div
                                key={s.skuCode}
                                className="flex items-center justify-between gap-3 text-sm py-1"
                              >
                                <div className="min-w-0">
                                  <span className="font-medium">{s.name}</span>
                                  <span className="text-xs text-muted-foreground ml-2">{s.skuCode}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                                  <span>{s.velocityPerDay}/day</span>
                                  <span>stock: {s.currentStock}</span>
                                  <span
                                    className={`font-semibold ${
                                      isUrgent ? "text-red-600" : "text-amber-600"
                                    }`}
                                  >
                                    {days !== null ? `${days}d left` : "pinned"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── COGS Tab ─────────────────────────────────────────────────────────────────

function COGSTab() {
  const baseCurrency = useBaseCurrency();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customer, setCustomer] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (customer) params.set("customer", customer);
      const res = await fetch(`/api/reports/cogs?${params}`);
      setData(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 items-end">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Customer</Label>
              <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Filter by customer" />
            </div>
            <Button onClick={fetchReport} disabled={loading}>
              {loading ? "Loading..." : "Generate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Total COGS</div>
                <div className="text-2xl font-bold">{formatCurrency(data.totalCOGS, baseCurrency)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Movements</div>
                <div className="text-2xl font-bold">{data.count}</div>
              </CardContent>
            </Card>
          </div>
          {data.lines?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">COGS Detail</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.lines.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell>{format(new Date(l.createdAt), "MMM d, yyyy")}</TableCell>
                        <TableCell><Badge variant="outline">{l.skuCode || "—"}</Badge></TableCell>
                        <TableCell>{l.productName || l.productId}</TableCell>
                        <TableCell>{l.customerName || "—"}</TableCell>
                        <TableCell>{Math.abs(l.quantity)}</TableCell>
                        <TableCell>{formatCurrency(l.unitCost, baseCurrency)}</TableCell>
                        <TableCell>{formatCurrency(l.totalCost, baseCurrency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Margin Tab ───────────────────────────────────────────────────────────────

function MarginTab() {
  const baseCurrency = useBaseCurrency();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customer, setCustomer] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (customer) params.set("customer", customer);
      const res = await fetch(`/api/reports/margin?${params}`);
      setData(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 items-end">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Customer</Label>
              <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Filter by customer" />
            </div>
            <Button onClick={fetchReport} disabled={loading}>
              {loading ? "Loading..." : "Generate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Revenue</div>
                <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue, baseCurrency)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Cost</div>
                <div className="text-2xl font-bold">{formatCurrency(data.totalCost, baseCurrency)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Margin</div>
                <div className={`text-2xl font-bold ${data.totalMargin < 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatCurrency(data.totalMargin, baseCurrency)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Margin %</div>
                <div className={`text-2xl font-bold ${data.totalMarginPct < 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {data.totalMarginPct.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>
          {data.orders?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Order Margins ({data.orderCount} orders)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Shipped</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Margin</TableHead>
                      <TableHead>Margin %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.orders.map((o: any) => (
                      <TableRow key={o.orderId}>
                        <TableCell className="font-medium">{o.orderNumber}</TableCell>
                        <TableCell>{o.customerName}</TableCell>
                        <TableCell>{o.shippedAt ? format(new Date(o.shippedAt), "MMM d, yyyy") : "—"}</TableCell>
                        <TableCell>{formatCurrency(o.revenue, baseCurrency)}</TableCell>
                        <TableCell>{formatCurrency(o.cost, baseCurrency)}</TableCell>
                        <TableCell className={o.margin < 0 ? "text-red-600" : "text-emerald-600"}>
                          {formatCurrency(o.margin, baseCurrency)}
                        </TableCell>
                        <TableCell className={o.marginPct < 0 ? "text-red-600" : "text-emerald-600"}>
                          {o.marginPct.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const baseCurrency = useBaseCurrency();
  const fmt = (n: number) => formatCurrency(n, baseCurrency);
  const fmtFull = (n: number) => formatCurrency(n, baseCurrency);

  return (
    <Layout>
      <PageHeader
        title="Reports"
        subtitle="Analytics and performance metrics"
      />
      <div className="p-6 max-w-5xl">
        <Tabs defaultValue="stock-value">
          <TabsList className="mb-6">
            <TabsTrigger value="stock-value" className="gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Stock Value
            </TabsTrigger>
            <TabsTrigger value="supplier-performance" className="gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              Supplier Performance
            </TabsTrigger>
            <TabsTrigger value="stock-velocity" className="gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Stock Velocity
            </TabsTrigger>
            <TabsTrigger value="cogs" className="gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              COGS
            </TabsTrigger>
            <TabsTrigger value="margin" className="gap-1.5">
              <Percent className="w-3.5 h-3.5" />
              Margin
            </TabsTrigger>
          </TabsList>
          <TabsContent value="stock-value">
            <StockValueTab />
          </TabsContent>
          <TabsContent value="supplier-performance">
            <SupplierPerformanceTab />
          </TabsContent>
          <TabsContent value="stock-velocity">
            <StockVelocityTab />
          </TabsContent>
          <TabsContent value="cogs">
            <COGSTab />
          </TabsContent>
          <TabsContent value="margin">
            <MarginTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
