import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Users,
  TrendingUp,
  Clock,
  Search,
  X,
  UserCheck,
  Timer,
  Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkerPerformance {
  id: string;
  workerId: string;
  workerName: string | null;
  tasksCompleted: number;
  linesPicked: number;
  unitsPicked: number;
  hoursWorked: number;
  productivityScore: number | null;
  accuracyRate: number | null;
  efficiencyScore: number | null;
  periodStart: string;
  periodEnd: string;
}

function fmt(n: number | null | undefined, decimals = 0): string {
  return (n ?? 0).toFixed(decimals);
}

function ScoreBadge({ score }: { score: number | null }) {
  const s = score ?? 0;
  const variant = s >= 80 ? "default" : s >= 50 ? "secondary" : "outline";
  return (
    <Badge variant={variant} className={s >= 80 ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-50" : undefined}>
      {s.toFixed(0)}
    </Badge>
  );
}

export default function LaborTrackingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");

  const {
    data: workers,
    isLoading,
    error,
  } = useQuery<WorkerPerformance[]>({
    queryKey: ["labor", "workers"],
    queryFn: async () => {
      const res = await fetch("/api/labor/workers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load worker data");
      return res.json();
    },
  });

  const filtered = (workers ?? []).filter((w) => {
    const matchesSearch =
      searchInput.trim() === "" ||
      (w.workerName?.toLowerCase().includes(searchInput.trim().toLowerCase()) ?? false) ||
      w.workerId.toLowerCase().includes(searchInput.trim().toLowerCase());
    const matchesPeriod =
      periodFilter === "all" || w.periodStart === periodFilter;
    return matchesSearch && matchesPeriod;
  });

  const selectedWorker = workers?.find((w) => w.workerId === selectedWorkerId);

  const totalWorkers = workers?.length ?? 0;
  const avgProd = workers?.length
    ? Math.round(workers.reduce((s, w) => s + (w.productivityScore ?? 0), 0) / workers.length * 100) / 100
    : 0;
  const avgAcc = workers?.length
    ? Math.round(workers.reduce((s, w) => s + (w.accuracyRate ?? 0), 0) / workers.length * 10000) / 100
    : 0;
  const totalUnits = workers?.reduce((s, w) => s + w.unitsPicked, 0) ?? 0;

  const hasFilters = searchInput.trim().length > 0 || periodFilter !== "all";

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["labor", "workers"] });
    toast({ title: "Worker data refreshed", description: "Latest performance metrics loaded." });
  };

  return (
    <Layout>
      <PageHeader
        title="Labor Tracking"
        subtitle="Monitor worker productivity, accuracy, and efficiency metrics across the warehouse"
        action={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRefresh}>
            <TrendingUp className="w-3.5 h-3.5" /> Refresh
          </Button>
        }
        helpKey="/labor-tracking"
      />

      <div className="p-6 max-w-6xl space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Total Workers
              </p>
              <p className="text-2xl font-bold mt-1">
                {isLoading ? "…" : totalWorkers}
              </p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/20">
            <CardContent className="p-4">
              <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">
                Avg Productivity
              </p>
              <p className="text-2xl font-bold mt-1 text-blue-700">
                {isLoading ? "…" : fmt(avgProd, 2)}
                <span className="text-sm font-normal"> units/hr</span>
              </p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/20">
            <CardContent className="p-4">
              <p className="text-xs text-green-600 uppercase tracking-wide font-semibold">
                Avg Accuracy
              </p>
              <p className="text-2xl font-bold mt-1 text-green-700">
                {isLoading ? "…" : `${fmt(avgAcc, 1)}%`}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Total Units Picked
              </p>
              <p className="text-2xl font-bold mt-1">
                {isLoading ? "…" : totalUnits}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Worker detail card */}
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <UserCheck className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Worker Detail</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger className="w-64 h-8 text-sm">
                  <SelectValue placeholder="Select a worker…" />
                </SelectTrigger>
                <SelectContent>
                  {workers?.map((w) => (
                    <SelectItem key={w.workerId} value={w.workerId}>
                      {w.workerName ?? w.workerId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedWorkerId && (
                <button
                  onClick={() => setSelectedWorkerId("")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  Clear selection
                </button>
              )}
            </div>

            {selectedWorker && (
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/60">
                <div className="flex items-start gap-2.5">
                  <Timer className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Productivity Score</p>
                    <p className="text-lg font-bold">{fmt(selectedWorker.productivityScore, 1)} <span className="text-xs font-normal text-muted-foreground">units/hr</span></p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Target className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Accuracy Rate</p>
                    <p className="text-lg font-bold">{fmt((selectedWorker.accuracyRate ?? 0) * 100, 1)}%</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <TrendingUp className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Efficiency Score</p>
                    <p className="text-lg font-bold">{fmt(selectedWorker.efficiencyScore, 1)}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search worker name or ID…"
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

          <span className="text-xs text-muted-foreground">
            {isLoading ? "…" : `${filtered.length} worker${filtered.length !== 1 ? "s" : ""}`}
          </span>

          {hasFilters && (
            <button
              onClick={() => {
                setSearchInput("");
                setPeriodFilter("all");
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
                <Users className="w-8 h-8 mx-auto text-red-400 mb-2" />
                <p className="text-sm text-muted-foreground">Failed to load worker data</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                {hasFilters ? (
                  <>
                    <p className="text-sm text-muted-foreground">No workers match your filters</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-1"
                      onClick={() => {
                        setSearchInput("");
                        setPeriodFilter("all");
                      }}
                    >
                      <X className="w-3 h-3" /> Clear filters
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">No worker performance data yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Data appears as workers complete picking tasks
                    </p>
                  </>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold pl-4">
                      Worker
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">
                      Tasks Completed
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">
                      Lines Picked
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">
                      Units Picked
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">
                      Hours Worked
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">
                      Productivity
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">
                      Accuracy
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Efficiency
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((w) => (
                    <TableRow
                      key={w.workerId}
                      className="hover:bg-muted/40 cursor-pointer"
                      onClick={() => setSelectedWorkerId(w.workerId)}
                    >
                      <TableCell className="pl-4">
                        <div>
                          <p className="text-sm font-medium">{w.workerName ?? w.workerId}</p>
                          <code className="text-[10px] text-muted-foreground font-mono">
                            {w.workerId}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {w.tasksCompleted}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {w.linesPicked}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-semibold">
                        {w.unitsPicked}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                        {fmt(w.hoursWorked, 1)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {fmt(w.productivityScore, 1)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {fmt((w.accuracyRate ?? 0) * 100, 1)}%
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={w.efficiencyScore} />
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
