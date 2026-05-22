import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  ArrowLeftRight,
  Package,
  CheckCircle,
  Clock,
  Search,
  X,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TransferSuggestion {
  id: string;
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  recommendedQty: number;
  confidenceScore: number | null;
  reason: string | null;
  priority: number;
  status: string;
  productName: string | null;
  fromWarehouseName: string | null;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  recommended: { label: "Recommended", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  approved: { label: "Approved", cls: "bg-green-50 text-green-700 border-green-200" },
  scheduled: { label: "Scheduled", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  completed: { label: "Completed", cls: "bg-muted text-muted-foreground" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <Badge className={`${meta.cls} hover:${meta.cls} text-[10px] font-bold`}>
      {meta.label}
    </Badge>
  );
}

const REASON_META: Record<string, { label: string; icon: typeof AlertTriangle }> = {
  stockout_risk: { label: "Stockout Risk", icon: AlertTriangle },
  excess_stock: { label: "Excess Stock", icon: Package },
  demand_spike: { label: "Demand Spike", icon: Zap },
};

function ReasonBadge({ reason }: { reason: string | null }) {
  if (!reason) return <span className="text-xs text-muted-foreground">—</span>;
  const meta = REASON_META[reason] ?? { label: reason, icon: Package };
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <meta.icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

export default function TransferOptimizationPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const {
    data: suggestions,
    isLoading,
    error,
  } = useQuery<TransferSuggestion[]>({
    queryKey: ["transfer-optimization", "suggestions"],
    queryFn: async () => {
      const res = await fetch("/api/transfer-optimization/suggestions", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load transfer suggestions");
      return res.json();
    },
  });

  const runOptimization = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/transfer-optimization/run", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to run optimization");
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["transfer-optimization", "suggestions"] });
      toast({
        title: "Optimization complete",
        description: `Analyzed ${data.productsAnalyzed} products for transfer opportunities.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Optimization failed", description: err.message, variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/transfer-optimization/${id}/status`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transfer-optimization", "suggestions"] });
      toast({ title: "Status updated" });
    },
  });

  const filtered = (suggestions ?? []).filter((s) => {
    const matchesSearch =
      searchInput.trim() === "" ||
      (s.productName?.toLowerCase().includes(searchInput.trim().toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const recommended = suggestions?.filter((s) => s.status === "recommended").length ?? 0;
  const approved = suggestions?.filter((s) => s.status === "approved").length ?? 0;
  const scheduled = suggestions?.filter((s) => s.status === "scheduled").length ?? 0;

  const hasFilters = searchInput.trim().length > 0 || statusFilter !== "all";

  return (
    <Layout>
      <PageHeader
        title="Transfer Optimization"
        subtitle="Analyze inventory imbalances and generate inter-warehouse transfer suggestions"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => qc.invalidateQueries({ queryKey: ["transfer-optimization", "suggestions"] })}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
              disabled={runOptimization.isPending}
              onClick={() => runOptimization.mutate()}
            >
              <Zap className="w-3.5 h-3.5" />
              {runOptimization.isPending ? "Running…" : "Run Optimization"}
            </Button>
          </div>
        }
        helpKey="/transfer-optimization"
      />

      <div className="p-6 max-w-6xl space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-blue-200 bg-blue-50/20">
            <CardContent className="p-4">
              <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">
                Recommended
              </p>
              <p className="text-2xl font-bold mt-1 text-blue-700">
                {isLoading ? "…" : recommended}
              </p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/20">
            <CardContent className="p-4">
              <p className="text-xs text-green-600 uppercase tracking-wide font-semibold">
                Approved
              </p>
              <p className="text-2xl font-bold mt-1 text-green-700">
                {isLoading ? "…" : approved}
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/20">
            <CardContent className="p-4">
              <p className="text-xs text-amber-700 uppercase tracking-wide font-semibold">
                Scheduled
              </p>
              <p className="text-2xl font-bold mt-1 text-amber-700">
                {isLoading ? "…" : scheduled}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search product…"
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
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground">
            {isLoading ? "…" : `${filtered.length} suggestion${filtered.length !== 1 ? "s" : ""}`}
          </span>

          {hasFilters && (
            <button
              onClick={() => {
                setSearchInput("");
                setStatusFilter("all");
              }}
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
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="py-16 text-center">
                <AlertTriangle className="w-8 h-8 mx-auto text-red-400 mb-2" />
                <p className="text-sm text-muted-foreground">Failed to load transfer suggestions</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <ArrowLeftRight className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                {hasFilters ? (
                  <>
                    <p className="text-sm text-muted-foreground">No suggestions match your filters</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-1"
                      onClick={() => {
                        setSearchInput("");
                        setStatusFilter("all");
                      }}
                    >
                      <X className="w-3 h-3" /> Clear filters
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">No transfer suggestions right now</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click "Run Optimization" to analyze inventory across warehouses
                    </p>
                  </>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold pl-4">
                      Product
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      From
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      To
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">
                      Qty
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">
                      Confidence
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Reason
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Status
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold pr-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/40">
                      <TableCell className="pl-4">
                        <p className="text-sm font-medium">{s.productName ?? s.productId}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.fromWarehouseName ?? s.fromWarehouseId}
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.toWarehouseId}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-semibold">
                        {s.recommendedQty}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {((s.confidenceScore ?? 0) * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell>
                        <ReasonBadge reason={s.reason} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={s.status} />
                      </TableCell>
                      <TableCell className="pr-4">
                        {s.status === "recommended" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => updateStatus.mutate({ id: s.id, status: "approved" })}
                          >
                            <CheckCircle className="w-3 h-3" />
                            Approve
                          </Button>
                        )}
                        {s.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => updateStatus.mutate({ id: s.id, status: "scheduled" })}
                          >
                            <Clock className="w-3 h-3" />
                            Schedule
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
