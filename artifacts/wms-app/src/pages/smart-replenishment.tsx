import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  AlertTriangle,
  ShoppingCart,
  Zap,
  Search,
  X,
  PackagePlus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBaseCurrency } from "@/hooks/use-base-currency";

interface Recommendation {
  productId: string;
  skuCode: string;
  name: string;
  currentStock: number;
  reorderPoint: number;
  shortfall: number;
  suggestedQty: number;
  severity: "critical" | "warning";
  predictedStockoutDate: string | null;
}

interface RecommendationsResponse {
  generatedAt: string;
  totalRecommendations: number;
  critical: number;
  warning: number;
  recommendations: Recommendation[];
}

const SEVERITY_META: Record<string, { label: string; cls: string }> = {
  critical: { label: "Critical", cls: "bg-red-50 text-red-700 border-red-200" },
  warning: { label: "Warning", cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const meta = SEVERITY_META[severity] ?? { label: severity, cls: "bg-muted text-muted-foreground" };
  return (
    <Badge className={`${meta.cls} hover:${meta.cls} text-[10px] font-bold`}>
      {meta.label}
    </Badge>
  );
}

export default function SmartReplenishmentPage() {
  const baseCurrency = useBaseCurrency();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [prGenerated, setPrGenerated] = useState(false);
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const {
    data: recData,
    isLoading: recLoading,
    error: recError,
  } = useQuery<RecommendationsResponse>({
    queryKey: ["replenishment", "recommendations"],
    queryFn: async () => {
      const res = await fetch("/api/replenishment/recommendations", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load recommendations");
      return res.json();
    },
  });

  const { data: prData, isFetching: prFetching } = useQuery({
    queryKey: ["replenishment", "generate-pr"],
    queryFn: async () => {
      const res = await fetch("/api/replenishment/generate-pr", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate PR");
      return res.json();
    },
    enabled: false,
    staleTime: Infinity,
  });

  const recommendations = recData?.recommendations ?? [];

  const filtered = recommendations.filter((r) => {
    const matchesSearch =
      searchInput.trim() === "" ||
      r.name.toLowerCase().includes(searchInput.trim().toLowerCase()) ||
      r.skuCode.toLowerCase().includes(searchInput.trim().toLowerCase());
    const matchesSeverity =
      severityFilter === "all" || r.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const hasFilters = searchInput.trim().length > 0 || severityFilter !== "all";

  const handleCreatePo = (rec: Recommendation) => {
    // Navigate to new PO page with productId and suggestedQty pre-filled
    const params = new URLSearchParams({
      productId: rec.productId,
      qty: String(rec.suggestedQty),
      source: "smart-replenishment",
    });
    navigate(`/purchase-orders/new?${params.toString()}`);
  };

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["replenishment", "recommendations"] });
    toast({
      title: "Recommendations refreshed",
      description: "Latest demand calculations loaded.",
    });
  };

  const handleGeneratePRs = async () => {
    try {
      const res = await fetch("/api/replenishment/generate-pr", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to generate PRs");
      const data = await res.json();
      setPrGenerated(true);
      toast({
        title: "Purchase requisitions created",
        description: `${data.createdCount} draft PO(s) created.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to generate PRs",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Smart Replenishment"
        subtitle="AI-driven reorder suggestions based on demand, stock levels, and lead times"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleRefresh}
            >
              <Zap className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
              disabled={prFetching}
              onClick={handleGeneratePRs}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              {prFetching ? "Generating…" : "Generate PRs"}
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-6xl space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Total Recommendations
              </p>
              <p className="text-2xl font-bold mt-1">
                {recLoading ? "…" : recData?.totalRecommendations ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/20">
            <CardContent className="p-4">
              <p className="text-xs text-red-600 uppercase tracking-wide font-semibold">
                Critical
              </p>
              <p className="text-2xl font-bold mt-1 text-red-700">
                {recLoading ? "…" : recData?.critical ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/20">
            <CardContent className="p-4">
              <p className="text-xs text-amber-700 uppercase tracking-wide font-semibold">
                Warning
              </p>
              <p className="text-2xl font-bold mt-1 text-amber-700">
                {recLoading ? "…" : recData?.warning ?? 0}
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
              placeholder="Search product or SKU…"
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

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue placeholder="All severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground">
            {recLoading ? "…" : `${filtered.length} item${filtered.length !== 1 ? "s" : ""}`}
          </span>

          {hasFilters && (
            <button
              onClick={() => {
                setSearchInput("");
                setSeverityFilter("all");
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
            {recLoading ? (
              <div className="px-5 py-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recError ? (
              <div className="py-16 text-center">
                <AlertTriangle className="w-8 h-8 mx-auto text-red-400 mb-2" />
                <p className="text-sm text-muted-foreground">Failed to load recommendations</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <PackagePlus className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                {hasFilters ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      No recommendations match your filters
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-1"
                      onClick={() => {
                        setSearchInput("");
                        setSeverityFilter("all");
                      }}
                    >
                      <X className="w-3 h-3" /> Clear filters
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      No replenishment recommendations right now
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      All stock levels are healthy
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
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">
                      Current Stock
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">
                      Reorder Point
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">
                      Shortfall
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">
                      Suggested Qty
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Severity
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Predicted Stockout
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold pr-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((rec) => (
                    <TableRow key={rec.productId} className="hover:bg-muted/40">
                      <TableCell className="pl-4">
                        <div>
                          <p className="text-sm font-medium">{rec.name}</p>
                          <code className="text-[10px] text-muted-foreground font-mono">
                            {rec.skuCode}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        <span
                          className={`font-bold ${
                            rec.currentStock === 0
                              ? "text-red-600"
                              : "text-amber-600"
                          }`}
                        >
                          {rec.currentStock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                        {rec.reorderPoint}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-red-600 font-medium">
                        {rec.shortfall}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-semibold">
                        {rec.suggestedQty}
                      </TableCell>
                      <TableCell>
                        <SeverityBadge severity={rec.severity} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {rec.predictedStockoutDate
                          ? new Date(rec.predictedStockoutDate).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="pr-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleCreatePo(rec)}
                        >
                          <ShoppingCart className="w-3 h-3" />
                          Create PO
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
    </Layout>
  );
}
