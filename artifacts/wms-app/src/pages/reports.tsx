import { useState } from "react";
import { useGetStockValueReport } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Download,
  BarChart3,
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
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

// Custom tooltip for the bar chart
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

export default function ReportsPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const { data, isLoading } = useGetStockValueReport();
  const report = data as ReportData | undefined;

  const handleExportCsv = () => {
    window.open("/api/reports/inventory-csv", "_blank");
  };

  const categoryProducts = (cat: string) =>
    report?.products.filter((p) => p.category === cat) ?? [];

  return (
    <Layout>
      <PageHeader
        title="Stock Value Report"
        subtitle="Inventory value by category with per-product breakdown"
      />

      <div className="p-6 space-y-6 max-w-5xl">

        {/* Actions bar */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {report ? (
              <>Generated {new Date(report.generatedAt).toLocaleString()}</>
            ) : (
              <Skeleton className="h-4 w-40" />
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Total Stock Value",
              icon: DollarSign,
              value: report ? fmtFull(report.totalStockValue) : null,
              color: "text-primary",
            },
            {
              label: "Total Units",
              icon: Package,
              value: report ? report.totalUnits.toLocaleString() : null,
              color: "text-foreground",
            },
            {
              label: "Categories",
              icon: BarChart3,
              value: report ? String(report.categories.length) : null,
              color: "text-foreground",
            },
          ].map(({ label, icon: Icon, value, color }) => (
            <Card key={label} className="border-border/60">
              <CardContent className="px-5 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {value !== null ? (
                    <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
                  ) : (
                    <Skeleton className="h-6 w-24 mt-0.5" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bar chart */}
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
                <BarChart
                  data={report.categories}
                  margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="totalValue" radius={[4, 4, 0, 0]}>
                    {report.categories.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category breakdown table */}
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
                    const pct = report.totalStockValue > 0
                      ? ((cat.totalValue / report.totalStockValue) * 100).toFixed(1)
                      : "0.0";
                    const isExpanded = expandedCategory === cat.category;
                    const prods = categoryProducts(cat.category);
                    return [
                      <TableRow
                        key={cat.category}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                            <span className="text-sm font-medium">{cat.category}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {isExpanded ? "▲" : "▼"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{cat.productCount}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{cat.totalUnits.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold tabular-nums text-sm">{fmtFull(cat.totalValue)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{pct}%</TableCell>
                        <TableCell>
                          {cat.lowStockCount > 0 && (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-[10px] gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {cat.lowStockCount} low
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
                                    <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold py-1.5 h-auto">SKU</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold py-1.5 h-auto">Product</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold py-1.5 h-auto text-right">Units</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold py-1.5 h-auto text-right">Unit Price</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold py-1.5 h-auto text-right">Value</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold py-1.5 h-auto"></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {prods.map((p) => (
                                    <TableRow key={p.productId} className="hover:bg-muted/10 border-b border-border/20">
                                      <TableCell className="font-mono text-[11px] text-muted-foreground py-1.5">{p.skuCode}</TableCell>
                                      <TableCell className="text-xs font-medium py-1.5">{p.name}</TableCell>
                                      <TableCell className="text-right tabular-nums text-xs py-1.5">{p.totalUnits.toLocaleString()}</TableCell>
                                      <TableCell className="text-right tabular-nums text-xs text-muted-foreground py-1.5">
                                        {p.unitPrice !== null ? fmtFull(p.unitPrice) : "—"}
                                      </TableCell>
                                      <TableCell className="text-right font-bold tabular-nums text-xs py-1.5">{fmtFull(p.totalValue)}</TableCell>
                                      <TableCell className="py-1.5">
                                        {p.isLow && (
                                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 text-[10px]">
                                            Low
                                          </Badge>
                                        )}
                                      </TableCell>
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
    </Layout>
  );
}
