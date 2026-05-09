import { useState, useEffect } from "react";
import {
  useListPurchaseOrders,
  useBulkCancelPurchaseOrders,
  useBulkDeletePurchaseOrders,
  getListPurchaseOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  ShoppingCart,
  ChevronRight,
  CalendarDays,
  Copy,
  Search,
  X,
  Ban,
  Trash2,
  CheckSquare,
  Download,
  AlertTriangle,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format, isPast, parseISO, differenceInCalendarDays } from "date-fns";
import { getCurrencySymbol } from "@/lib/utils";

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

function isCancellable(status: string) {
  return status === "draft" || status === "ordered";
}

export default function PurchaseOrdersPage() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState(ALL);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Clear selection when filters change
  useEffect(() => { setSelected(new Set()); }, [statusFilter, debouncedQ]);

  const params: Record<string, string> = {};
  if (statusFilter !== ALL) params.status = statusFilter;
  if (debouncedQ) params.q = debouncedQ;

  const { data = [], isLoading } = useListPurchaseOrders(params);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });

  const { mutate: bulkCancel, isPending: cancelling } = useBulkCancelPurchaseOrders({
    mutation: {
      onSuccess: (res) => {
        invalidate();
        setSelected(new Set());
        toast({ title: `${(res as any).cancelled} order${(res as any).cancelled !== 1 ? "s" : ""} cancelled` });
      },
      onError: () => toast({ title: "Failed to cancel orders", variant: "destructive" }),
    },
  });

  const { mutate: bulkDelete, isPending: deleting } = useBulkDeletePurchaseOrders({
    mutation: {
      onSuccess: (res) => {
        invalidate();
        setSelected(new Set());
        setDeleteConfirmOpen(false);
        toast({ title: `${(res as any).deleted} draft${(res as any).deleted !== 1 ? "s" : ""} deleted` });
      },
      onError: () => toast({ title: "Failed to delete orders", variant: "destructive" }),
    },
  });

  const hasSearch = debouncedQ.length > 0;
  const hasFilters = statusFilter !== ALL || hasSearch;

  const handleExport = () => {
    const qs = new URLSearchParams();
    if (statusFilter !== ALL) qs.set("status", statusFilter);
    if (debouncedQ) qs.set("q", debouncedQ);
    const url = `/api/purchase-orders/export${qs.toString() ? `?${qs}` : ""}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    a.click();
  };

  // Selection helpers
  const selectableIds = data.map((po) => po.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;
  const indeterminate = someSelected && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableIds));
    }
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // What the selected POs can do
  const selectedPos = data.filter((po) => selected.has(po.id));
  const cancellableIds = selectedPos.filter((po) => isCancellable(po.status)).map((po) => po.id);
  const deletableIds = selectedPos.filter((po) => po.status === "draft").map((po) => po.id);

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

          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              disabled={data.length === 0 || isLoading}
              onClick={handleExport}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>

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
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={allSelected}
                        ref={(el) => { if (el) (el as any).indeterminate = indeterminate; }}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">PO Number</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Supplier</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Status</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Currency</TableHead>
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
                    const isSelected = selected.has(po.id);
                    const delivDate = (po as any).expectedDeliveryDate as string | null | undefined;
                    const isOverdue = !!(delivDate && po.status !== "received" && po.status !== "cancelled" && isPast(parseISO(delivDate)));
                    const daysOverdue = isOverdue ? differenceInCalendarDays(new Date(), parseISO(delivDate!)) : 0;
                    return (
                      <TableRow
                        key={po.id}
                        className={`cursor-pointer hover:bg-muted/40 ${
                          isSelected
                            ? "bg-orange-50/60 hover:bg-orange-50"
                            : isOverdue
                            ? "bg-red-50/40 hover:bg-red-50/60"
                            : ""
                        }`}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('[role="checkbox"]') || target.closest("button")) return;
                          setLocation(`/purchase-orders/${po.id}`);
                        }}
                      >
                        <TableCell className="pl-4 w-10" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(po.id)}
                            aria-label={`Select ${po.poNumber}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm font-semibold">{po.poNumber}</TableCell>
                        <TableCell className="text-sm font-medium">{po.supplierName}</TableCell>
                        <TableCell><StatusBadge status={po.status} /></TableCell>
                        <TableCell><Badge variant="outline">{getCurrencySymbol((po as any).currency)} {(po as any).currency}</Badge></TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{po.lineCount}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{po.totalQtyOrdered}</TableCell>
                        <TableCell className="text-xs">
                          {delivDate ? (
                            <div className="flex flex-col gap-0.5">
                              <span className={isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}>
                                {format(parseISO(delivDate), "dd MMM yyyy")}
                              </span>
                              {isOverdue && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-0 w-fit leading-4">
                                  <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                  {daysOverdue}d overdue
                                </span>
                              )}
                            </div>
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

      {/* Bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-gray-900 text-white rounded-xl shadow-2xl border border-white/10 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 pr-3 border-r border-white/20">
            <CheckSquare className="w-4 h-4 text-white/70" />
            <span className="text-sm font-medium">{selected.size} selected</span>
          </div>

          {cancellableIds.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-amber-300 hover:text-amber-200 hover:bg-white/10 text-xs"
              disabled={cancelling}
              onClick={() => bulkCancel({ data: { ids: cancellableIds } })}
            >
              <Ban className="w-3.5 h-3.5" />
              Cancel {cancellableIds.length > 1 ? `${cancellableIds.length} orders` : "order"}
            </Button>
          )}

          {deletableIds.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-red-400 hover:text-red-300 hover:bg-white/10 text-xs"
              disabled={deleting}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete {deletableIds.length > 1 ? `${deletableIds.length} drafts` : "draft"}
            </Button>
          )}

          <button
            onClick={() => setSelected(new Set())}
            className="ml-1 text-white/50 hover:text-white transition-colors"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletableIds.length} draft{deletableIds.length !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deletableIds.length === 1 ? "this draft purchase order" : `these ${deletableIds.length} draft purchase orders`}. Only draft POs can be deleted — ordered or received POs are not affected.
              <br /><br />
              <span className="font-medium text-foreground">This cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => bulkDelete({ data: { ids: deletableIds } })}
            >
              {deleting ? "Deleting…" : `Delete ${deletableIds.length} draft${deletableIds.length !== 1 ? "s" : ""}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
