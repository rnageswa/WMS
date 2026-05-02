import { useState, useEffect } from "react";
import { useListPurchaseOrders } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  ShoppingCart,
  ChevronRight,
  CalendarDays,
  Copy,
  Search,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow, format, isPast, parseISO } from "date-fns";

type PoStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled";

const STATUS_META: Record<PoStatus, { label: string; cls: string }> = {
  draft:              { label: "Draft",              cls: "bg-muted text-muted-foreground border-border" },
  ordered:            { label: "Ordered",            cls: "bg-blue-50 text-blue-700 border-blue-200" },
  partially_received: { label: "Part. Received",     cls: "bg-amber-50 text-amber-700 border-amber-200" },
  received:           { label: "Received",           cls: "bg-green-50 text-green-700 border-green-200" },
  cancelled:          { label: "Cancelled",          cls: "bg-red-50 text-red-500 border-red-200" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as PoStatus] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <Badge className={`${meta.cls} hover:${meta.cls} text-[11px] font-medium`}>{meta.label}</Badge>
  );
}

const ALL = "__all__";

export default function PurchaseOrdersPage() {
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params: Record<string, string> = {};
  if (statusFilter !== ALL) params.status = statusFilter;
  if (debouncedQ) params.q = debouncedQ;

  const { data = [], isLoading } = useListPurchaseOrders(params);

  const hasSearch = debouncedQ.length > 0;
  const hasFilters = statusFilter !== ALL || hasSearch;

  return (
    <Layout>
      <PageHeader
        title="Purchase Orders"
        subtitle="Track supplier orders and receive stock against them"
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/purchase-orders/templates">
                <Copy className="w-3.5 h-3.5" /> Templates
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white">
              <Link href="/purchase-orders/new">
                <Plus className="w-3.5 h-3.5" /> New PO
              </Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-5xl space-y-4">
        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search input */}
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search PO#, supplier, SKU…"
              className="pl-8 pr-8 h-8 text-sm"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="partially_received">Partially Received</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground">
            {isLoading ? "…" : `${data.length} order${data.length !== 1 ? "s" : ""}`}
          </span>

          {hasFilters && (
            <button
              onClick={() => { setSearchInput(""); setStatusFilter(ALL); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <Card className="border-border/60">
          <CardContent className="p-0 pb-1">
            {isLoading ? (
              <div className="px-5 py-4 space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : data.length === 0 ? (
              <div className="py-16 text-center">
                <ShoppingCart className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                {hasSearch ? (
                  <>
                    <p className="text-sm text-muted-foreground">No orders match <span className="font-medium text-foreground">"{debouncedQ}"</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Try a different PO number, supplier, or SKU</p>
                    <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => setSearchInput("")}>
                      <X className="w-3 h-3" /> Clear search
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">No purchase orders yet</p>
                    <Button asChild variant="outline" size="sm" className="mt-3 gap-1">
                      <Link href="/purchase-orders/new"><Plus className="w-3 h-3" />Create your first PO</Link>
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">PO Number</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Supplier</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Status</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Lines</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Qty</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />Delivery</span>
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Created</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((po) => {
                    const delivDate = (po as any).expectedDeliveryDate as string | null | undefined;
                    const isOverdue = delivDate && po.status !== "received" && po.status !== "cancelled" && isPast(parseISO(delivDate));
                    return (
                      <TableRow key={po.id} className="cursor-pointer hover:bg-muted/40" onClick={() => window.location.assign(`/wms/purchase-orders/${po.id}`)}>
                        <TableCell className="font-mono text-sm font-semibold">{po.poNumber}</TableCell>
                        <TableCell className="text-sm font-medium">{po.supplierName}</TableCell>
                        <TableCell><StatusBadge status={po.status} /></TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{po.lineCount}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{po.totalQtyOrdered}</TableCell>
                        <TableCell className="text-xs">
                          {delivDate ? (
                            <span className={isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}>
                              {format(parseISO(delivDate), "dd MMM yyyy")}
                              {isOverdue && <span className="ml-1 text-[10px]">⚠</span>}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(po.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="w-6">
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
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
