import { useState } from "react";
import { useGetSupplierPerformanceReport } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "wouter";
import {
  Search,
  TrendingUp,
  Clock,
  PackageCheck,
  DollarSign,
  ChevronRight,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Minus,
} from "lucide-react";
import { format, parseISO } from "date-fns";

type Row = {
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
};

type SortKey = "totalOrders" | "totalSpend" | "onTimeRate" | "avgLeadTimeDays" | "fillRate";

function RateCell({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>;
  const good = inverse ? value <= 3 : value >= 80;
  const ok = inverse ? value <= 7 : value >= 50;
  const color = good ? "text-emerald-600" : ok ? "text-amber-600" : "text-red-500";
  const Icon = good ? CheckCircle2 : ok ? Minus : XCircle;
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {inverse ? `${value}d` : `${value}%`}
    </span>
  );
}

function fmt$(n: number | null) {
  if (n === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function SupplierPerformancePage() {
  const { data, isLoading } = useGetSupplierPerformanceReport();
  const suppliers: Row[] = data?.suppliers ?? [];

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalOrders");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = suppliers
    .filter((s) => s.supplierName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });

  // Aggregate summary stats
  const totalSpend = suppliers.reduce((s, r) => s + (r.totalSpend ?? 0), 0);
  const avgOnTime = (() => {
    const rows = suppliers.filter((r) => r.onTimeRate !== null);
    if (!rows.length) return null;
    return Math.round(rows.reduce((s, r) => s + r.onTimeRate!, 0) / rows.length);
  })();
  const avgLead = (() => {
    const rows = suppliers.filter((r) => r.avgLeadTimeDays !== null);
    if (!rows.length) return null;
    return Math.round(rows.reduce((s, r) => s + r.avgLeadTimeDays!, 0) / rows.length);
  })();
  const avgFill = (() => {
    const rows = suppliers.filter((r) => r.fillRate !== null);
    if (!rows.length) return null;
    return Math.round(rows.reduce((s, r) => s + r.fillRate!, 0) / rows.length);
  })();

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(k)}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === k ? "text-foreground" : "text-muted-foreground/50"}`} />
    </button>
  );

  return (
    <Layout>
      <PageHeader
        title="Supplier Performance"
        subtitle="Order history, lead times, fill rates and spend by supplier"
      />

      <div className="p-6 max-w-6xl space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Total Suppliers",
              value: isLoading ? null : suppliers.length.toString(),
              icon: <TrendingUp className="w-4 h-4 text-muted-foreground" />,
            },
            {
              label: "Total Spend",
              value: isLoading ? null : fmt$(totalSpend || null),
              icon: <DollarSign className="w-4 h-4 text-muted-foreground" />,
            },
            {
              label: "Avg On-Time Rate",
              value: isLoading ? null : avgOnTime !== null ? `${avgOnTime}%` : "—",
              icon: <CheckCircle2 className="w-4 h-4 text-muted-foreground" />,
            },
            {
              label: "Avg Lead Time",
              value: isLoading ? null : avgLead !== null ? `${avgLead} days` : "—",
              icon: <Clock className="w-4 h-4 text-muted-foreground" />,
            },
          ].map((card) => (
            <Card key={card.label} className="border-border/60">
              <CardHeader className="pb-1 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
                  {card.icon}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {isLoading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <p className="text-xl font-semibold">{card.value}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by supplier…"
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Table */}
        <Card className="border-border/60">
          <CardContent className="p-0 pb-1">
            {isLoading ? (
              <div className="px-5 py-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-14 text-center text-sm text-muted-foreground">
                {search ? "No suppliers match your search." : "No supplier order data yet."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="text-xs text-muted-foreground hover:bg-transparent">
                    <TableHead className="pl-5">Supplier</TableHead>
                    <TableHead className="text-right w-28">
                      <SortBtn k="totalOrders" label="Orders" />
                    </TableHead>
                    <TableHead className="text-right w-24">Open</TableHead>
                    <TableHead className="text-right w-28">
                      <SortBtn k="onTimeRate" label="On-Time" />
                    </TableHead>
                    <TableHead className="text-right w-32">
                      <SortBtn k="avgLeadTimeDays" label="Lead Time" />
                    </TableHead>
                    <TableHead className="text-right w-28">
                      <SortBtn k="fillRate" label="Fill Rate" />
                    </TableHead>
                    <TableHead className="text-right w-32">
                      <SortBtn k="totalSpend" label="Total Spend" />
                    </TableHead>
                    <TableHead className="text-right w-28 pr-5">Last Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.supplierId ?? row.supplierName} className="text-sm group">
                      <TableCell className="pl-5 font-medium">
                        {row.supplierId ? (
                          <Link
                            href={`/suppliers/${row.supplierId}`}
                            className="hover:underline text-foreground inline-flex items-center gap-1"
                          >
                            {row.supplierName}
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        ) : (
                          <span>{row.supplierName}</span>
                        )}
                        <div className="flex gap-1 mt-0.5">
                          {row.receivedOrders > 0 && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                              {row.receivedOrders} received
                            </Badge>
                          )}
                          {row.cancelledOrders > 0 && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal text-muted-foreground">
                              {row.cancelledOrders} cancelled
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.totalOrders}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.openOrders > 0 ? (
                          <span className="text-amber-600 font-medium">{row.openOrders}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <RateCell value={row.onTimeRate} />
                      </TableCell>
                      <TableCell className="text-right">
                        <RateCell value={row.avgLeadTimeDays} inverse />
                      </TableCell>
                      <TableCell className="text-right">
                        <RateCell value={row.fillRate} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {row.totalSpend !== null ? fmt$(row.totalSpend) : <span className="text-muted-foreground font-normal">—</span>}
                      </TableCell>
                      <TableCell className="text-right pr-5 text-muted-foreground text-xs">
                        {row.lastOrderDate
                          ? format(parseISO(row.lastOrderDate), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {!isLoading && filtered.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            {filtered.length} supplier{filtered.length !== 1 ? "s" : ""}
            {avgFill !== null && ` · avg fill rate ${avgFill}%`}
          </p>
        )}
      </div>
    </Layout>
  );
}
