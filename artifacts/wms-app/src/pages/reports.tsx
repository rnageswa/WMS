import { useState } from "react";
import { Link } from "wouter";
import {
  useGetStockValueReport,
  useGetSupplierPerformanceReport,
} from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

const CHART_COLORS = [
  "#0F2540", "#E8622A", "#2563eb", "#16a34a",
  "#9333ea", "#db2777", "#d97706", "#0891b2",
  "#65a30d", "#7c3aed",
];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

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

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as CategoryRow;
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">{d.productCount} products · {d.totalUnits.toLocaleString()} units</p>
      <p className="font-bold text-foreground mt-0.5">{fmt(d.totalValue)}</p>
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
        <Button variant="outline" size="sm" onClick={() => window.open("/api/reports/inventory-csv", "_blank")} className="gap-1.5">
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
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
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
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
          </TabsList>
          <TabsContent value="stock-value">
            <StockValueTab />
          </TabsContent>
          <TabsContent value="supplier-performance">
            <SupplierPerformanceTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
