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
  Grid3x3,
  Star,
  MapPin,
  Search,
  X,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SlottingAssignment {
  id: string;
  productId: string;
  binId: string;
  score: number | null;
  rank: number | null;
  reason: string | null;
  assignedBy: string | null;
  isValid: boolean;
  assignedAt: string;
  productName: string | null;
  productSku: string | null;
  binCode: string | null;
  zoneName: string | null;
  warehouseName: string | null;
}

function ScoreBadge({ score }: { score: number | null }) {
  const s = score ?? 0;
  if (s >= 80) {
    return <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50 text-[10px] font-bold">{s.toFixed(0)}</Badge>;
  }
  if (s >= 50) {
    return <Badge variant="secondary" className="text-[10px] font-bold">{s.toFixed(0)}</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] font-bold">{s.toFixed(0)}</Badge>;
}

const REASON_META: Record<string, string> = {
  velocity: "Velocity",
  co_pick: "Co-Pick",
  temperature: "Temperature",
  manual: "Manual",
};

export default function SlottingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [validFilter, setValidFilter] = useState<string>("all");

  const {
    data: assignments,
    isLoading,
    error,
  } = useQuery<SlottingAssignment[]>({
    queryKey: ["slotting", "assignments"],
    queryFn: async () => {
      const res = await fetch("/api/slotting/assignments", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load slotting assignments");
      return res.json();
    },
  });

  const confirmAssignment = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/slotting/assignments/${id}/confirm`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmedBy: "user" }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slotting", "assignments"] });
      toast({ title: "Assignment confirmed", description: "Bin assignment marked as valid." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to confirm", description: err.message, variant: "destructive" });
    },
  });

  const filtered = (assignments ?? []).filter((a) => {
    const matchesSearch =
      searchInput.trim() === "" ||
      (a.productName?.toLowerCase().includes(searchInput.trim().toLowerCase()) ?? false) ||
      (a.productSku?.toLowerCase().includes(searchInput.trim().toLowerCase()) ?? false) ||
      (a.binCode?.toLowerCase().includes(searchInput.trim().toLowerCase()) ?? false);
    const matchesValid =
      validFilter === "all" ||
      (validFilter === "valid" && a.isValid) ||
      (validFilter === "pending" && !a.isValid);
    return matchesSearch && matchesValid;
  });

  const total = assignments?.length ?? 0;
  const valid = assignments?.filter((a) => a.isValid).length ?? 0;
  const avgScore = assignments?.length
    ? Math.round(assignments.reduce((s, a) => s + (a.score ?? 0), 0) / assignments.length)
    : 0;

  const hasFilters = searchInput.trim().length > 0 || validFilter !== "all";

  return (
    <Layout>
      <PageHeader
        title="Slotting"
        subtitle="Manage bin assignments and product placement optimization scores"
        action={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => qc.invalidateQueries({ queryKey: ["slotting", "assignments"] })}
          >
            <Grid3x3 className="w-3.5 h-3.5" /> Refresh
          </Button>
        }
        helpKey="/slotting"
      />

      <div className="p-6 max-w-6xl space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Total Assignments
              </p>
              <p className="text-2xl font-bold mt-1">
                {isLoading ? "…" : total}
              </p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/20">
            <CardContent className="p-4">
              <p className="text-xs text-green-600 uppercase tracking-wide font-semibold">
                Confirmed
              </p>
              <p className="text-2xl font-bold mt-1 text-green-700">
                {isLoading ? "…" : valid}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Avg Score
              </p>
              <p className="text-2xl font-bold mt-1">
                {isLoading ? "…" : avgScore}
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
              placeholder="Search product, SKU, or bin…"
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

          <Select value={validFilter} onValueChange={setValidFilter}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="valid">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground">
            {isLoading ? "…" : `${filtered.length} assignment${filtered.length !== 1 ? "s" : ""}`}
          </span>

          {hasFilters && (
            <button
              onClick={() => {
                setSearchInput("");
                setValidFilter("all");
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
                <p className="text-sm text-muted-foreground">Failed to load slotting assignments</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <MapPin className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                {hasFilters ? (
                  <>
                    <p className="text-sm text-muted-foreground">No assignments match your filters</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-1"
                      onClick={() => {
                        setSearchInput("");
                        setValidFilter("all");
                      }}
                    >
                      <X className="w-3 h-3" /> Clear filters
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">No slotting assignments yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Assignments are created by the slotting optimization engine
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
                      SKU
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Bin
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Zone
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">
                      Score
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
                  {filtered.map((a) => (
                    <TableRow key={a.id} className="hover:bg-muted/40">
                      <TableCell className="pl-4">
                        <p className="text-sm font-medium">{a.productName ?? a.productId}</p>
                      </TableCell>
                      <TableCell>
                        <code className="text-[10px] text-muted-foreground font-mono">
                          {a.productSku ?? "—"}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {a.binCode ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.zoneName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <ScoreBadge score={a.score} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {REASON_META[a.reason ?? ""] ?? a.reason ?? "—"}
                      </TableCell>
                      <TableCell>
                        {a.isValid ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <Star className="w-3 h-3 fill-current" />
                            Confirmed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <Star className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="pr-4">
                        {!a.isValid && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => confirmAssignment.mutate(a.id)}
                          >
                            <CheckCircle className="w-3 h-3" />
                            Confirm
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
