import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Route, Truck, MapPin, Package, Zap, Clock, CheckCircle,
  AlertTriangle, Layers, Play, ArrowRight, ChevronRight,
  Barcode, Camera, XCircle, Loader2, Navigation,
} from "lucide-react";
import { ScanModal } from "@/components/scan-modal";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type View = "plan" | "waves" | "pick";

interface SuggestedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  createdAt: string;
  lineCount: number;
  zones: string[];
}

export default function SmartPickingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [view, setView] = useState<View>("plan");
  const [selectedWaveId, setSelectedWaveId] = useState<string>("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [currentZoneIdx, setCurrentZoneIdx] = useState(0);
  const [scanInput, setScanInput] = useState("");
  const [lastScan, setLastScan] = useState<{ type: string; message: string } | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────

  const { data: suggestData, isLoading: suggestLoading } = useQuery<{ orders: SuggestedOrder[] }>({
    queryKey: ["wave-suggest"],
    queryFn: async () => {
      const res = await fetch("/api/picking/waves/suggest", { credentials: "include" });
      return res.json();
    },
    enabled: view === "plan",
  });

  const { data: wavesData, refetch: refetchWaves } = useQuery<{ waves: any[] }>({
    queryKey: ["pick-waves"],
    queryFn: async () => {
      const res = await fetch("/api/picking/waves", { credentials: "include" });
      return res.json();
    },
    enabled: view === "plan" || view === "waves",
  });

  const { data: waveDetail, refetch: refetchWave } = useQuery<any>({
    queryKey: ["pick-wave", selectedWaveId],
    queryFn: async () => {
      const res = await fetch(`/api/picking/waves/${selectedWaveId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedWaveId && view === "pick",
  });

  // ── Mutations ────────────────────────────────────────────────────────

  const createWaveMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const res = await fetch("/api/picking/waves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderIds }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create wave");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Wave created", description: `${data.wave.waveNumber} with ${data.orders.length} orders` });
      setSelectedWaveId(data.wave.id);
      setCurrentZoneIdx(0);
      setView("pick");
      qc.invalidateQueries({ queryKey: ["pick-waves"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const startWaveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/picking/waves/${selectedWaveId}/start`, {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to start wave");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Wave started" });
      refetchWave();
      refetchWaves();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const pickLineMutation = useMutation({
    mutationFn: async ({ lineId, qtyPicked, binId }: { lineId: string; qtyPicked: number; binId?: string }) => {
      const res = await fetch(`/api/picking/waves/${selectedWaveId}/pick-line`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lineId, qtyPicked, binId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to pick line");
      }
      return res.json();
    },
    onSuccess: () => {
      refetchWave();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const completeWaveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/picking/waves/${selectedWaveId}/complete`, {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to complete wave");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Wave completed!", description: "All orders advanced to picking complete." });
      refetchWave();
      refetchWaves();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ── Derived state ────────────────────────────────────────────────────

  const suggestOrders: SuggestedOrder[] = suggestData?.orders ?? [];
  const waves = wavesData?.waves ?? [];
  const wave = waveDetail?.wave;
  const zoneStops = waveDetail?.zoneStops ?? [];
  const allPickLines = waveDetail?.pickLines ?? [];
  const linesByZone = waveDetail?.linesByZone ?? {};
  const waveStatus = wave?.status || "draft";
  const currentZone = zoneStops[currentZoneIdx];
  const currentZoneLines = currentZone ? (linesByZone[currentZone.zoneName] || []) : [];
  const totalPicked = allPickLines.filter((l: any) => l.status === "picked").length;
  const allPicked = allPickLines.length > 0 && allPickLines.every((l: any) => l.status === "picked");

  // Group suggested orders by zone overlap for batch suggestions
  const zoneBatches: Record<string, SuggestedOrder[]> = suggestOrders.reduce((batches, order) => {
    const key = [...order.zones].sort().join("+") || "no-zone";
    if (!batches[key]) batches[key] = [];
    batches[key].push(order);
    return batches;
  }, {} as Record<string, SuggestedOrder[]>);

  // ── Scan handler ─────────────────────────────────────────────────────

  const handleScan = useCallback(async () => {
    if (!scanInput.trim() || waveStatus !== "picking") return;
    const scanned = scanInput.trim();
    setScanInput("");

    const matchingLine = allPickLines.find((l: any) => {
      const sku = (l.skuCode || "").toLowerCase();
      const binCode = (l.binCode || "").toLowerCase();
      return sku === scanned.toLowerCase() || binCode === scanned.toLowerCase();
    });

    if (!matchingLine) {
      setLastScan({ type: "error", message: `No match for: ${scanned}` });
      toast({ title: "No match", description: `No pick line matches "${scanned}"`, variant: "destructive" });
      return;
    }
    if (matchingLine.status === "picked") {
      setLastScan({ type: "info", message: `Already picked: ${matchingLine.skuCode}` });
      return;
    }

    await pickLineMutation.mutateAsync({
      lineId: matchingLine.id,
      qtyPicked: matchingLine.qtyToPick,
      binId: matchingLine.binId,
    });

    setLastScan({
      type: "success",
      message: `Picked: ${matchingLine.skuCode} (${matchingLine.qtyToPick}) from ${matchingLine.binCode || "—"}`,
    });
    toast({ title: "Pick confirmed", description: `${matchingLine.skuCode} picked.` });
  }, [scanInput, waveStatus, allPickLines, pickLineMutation, toast]);

  useEffect(() => {
    if (view === "pick" && waveStatus === "picking") {
      const timer = setTimeout(() => {
        const el = document.querySelector('[data-scan-input="true"]') as HTMLInputElement;
        if (el) el.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [view, waveStatus, scanInput]);

  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // VIEW: PLAN — Smart batch suggestions + route preview + active waves
  // ═══════════════════════════════════════════════════════════════════════

  const [selectedBatchKey, setSelectedBatchKey] = useState<string | null>(null);
  const selectedBatch = selectedBatchKey ? zoneBatches[selectedBatchKey] : null;
  const selectedBatchZones = selectedBatchKey && selectedBatchKey !== "no-zone" ? selectedBatchKey.split("+") : [];

  if (view === "plan") {
    return (
      <Layout>
        <PageHeader
          title="Smart Picking"
          subtitle="Plan pick waves by zone proximity, preview routes, then execute"
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setView("waves")} className="gap-1.5">
                <Layers className="w-4 h-4" />
                Active Waves ({waves.filter((w: any) => ["ready","picking"].includes(w.status)).length})
              </Button>
              <Button
                onClick={() => { setSelectedOrderIds([]); }}
                className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
                disabled={selectedOrderIds.length === 0}
              >
                <Zap className="w-4 h-4" />
                Create Wave ({selectedOrderIds.length})
              </Button>
            </div>
          }
        />

        <div className="p-6 max-w-6xl space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Available Orders</p>
                <p className="text-2xl font-bold mt-1">{suggestLoading ? "…" : suggestOrders.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Active Waves</p>
                <p className="text-2xl font-bold mt-1">
                  {waves.filter((w: any) => ["ready", "picking"].includes(w.status)).length}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Total Lines</p>
                <p className="text-2xl font-bold mt-1">
                  {suggestOrders.reduce((s, o) => s + (o.lineCount || 0), 0)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Zone Groups</p>
                <p className="text-2xl font-bold mt-1">{Object.keys(zoneBatches).length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Main content: batch list + route preview */}
          <div className="grid grid-cols-3 gap-4">
            {/* Batch list — 2 cols */}
            <div className="col-span-2 space-y-4">
              <Card className="border-border/60">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Route className="w-4 h-4 text-[#E8622A]" />
                    Suggested Batches by Zone Proximity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 pb-1">
                  {suggestLoading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading suggestions…</div>
                  ) : suggestOrders.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>No orders available for wave creation.</p>
                      <p className="text-sm mt-1">Orders must be in "picking" status and not already in a wave.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 p-4">
                      {Object.entries(zoneBatches).map(([zoneKey, orders]) => {
                        const batchOrderIds = orders.map((o) => o.id);
                        const allSelected = batchOrderIds.every((id) => selectedOrderIds.includes(id));
                        const someSelected = batchOrderIds.some((id) => selectedOrderIds.includes(id));
                        const totalLines = orders.reduce((s, o) => s + (o.lineCount || 0), 0);
                        const zones = zoneKey === "no-zone" ? [] : zoneKey.split("+");
                        const isSelected = selectedBatchKey === zoneKey;

                        return (
                          <div
                            key={zoneKey}
                            className={`border rounded-lg overflow-hidden cursor-pointer transition-colors ${isSelected ? "border-[#E8622A] ring-1 ring-[#E8622A]/20" : "hover:border-border"}`}
                            onClick={() => setSelectedBatchKey(isSelected ? null : zoneKey)}
                          >
                            {/* Batch header */}
                            <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={allSelected}
                                  data-state={someSelected && !allSelected ? "indeterminate" : undefined}
                                  onCheckedChange={() => {
                                    if (allSelected) {
                                      setSelectedOrderIds((prev) => prev.filter((id) => !batchOrderIds.includes(id)));
                                    } else {
                                      setSelectedOrderIds((prev) => [...new Set([...prev, ...batchOrderIds])]);
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div>
                                  <span className="text-sm font-semibold">
                                    {zones.length > 0 ? `Zone ${zones.join(" + ")}` : "Mixed Zones"}
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {orders.length} orders · {totalLines} lines
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {zones.map((z) => (
                                  <Badge key={z} variant="outline" className="text-[10px] font-medium">{z}</Badge>
                                ))}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1 ml-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOrderIds(batchOrderIds);
                                    createWaveMutation.mutate(batchOrderIds);
                                  }}
                                  disabled={createWaveMutation.isPending}
                                >
                                  <Zap className="w-3 h-3" />Create Wave
                                </Button>
                              </div>
                            </div>
                            {/* Orders preview (always visible) */}
                            <div className="px-4 py-2 bg-muted/10 border-t">
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {orders.map((o) => (
                                  <span key={o.id} className="text-xs text-muted-foreground">
                                    <span className="font-mono font-medium text-foreground">{o.orderNumber}</span>
                                    {" · "}{o.customerName}
                                    {" · "}{o.lineCount} lines
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Route Optimization Preview — 1 col */}
            <div className="col-span-1">
              <Card className="border-border/60 h-full">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Route className="w-4 h-4 text-[#E8622A]" />
                    Route Optimization
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {selectedBatch ? (
                    <>
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">
                          {selectedBatchZones.length > 0 ? `Zone ${selectedBatchZones.join(" + ")}` : "Mixed Zones"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Truck className="w-3.5 h-3.5" />
                          {selectedBatch.length} orders · {selectedBatch.reduce((s, o) => s + o.lineCount, 0)} lines
                        </div>
                      </div>

                      {/* Visual route diagram */}
                      <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Optimized Pick Path
                        </p>
                        <div className="flex items-center gap-1.5">
                          {/* Start node */}
                          <span className="w-7 h-7 rounded-full bg-[#0F2540] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            S
                          </span>
                          <div className="flex-1 h-0.5 bg-muted-foreground/20 relative">
                            <div className="absolute inset-y-0 left-0 bg-[#E8622A] w-0" />
                          </div>
                          {/* Zone nodes */}
                          {selectedBatchZones.map((zone, idx) => (
                            <span key={zone} className="flex items-center gap-1.5">
                              <div className="flex-1 h-0.5 bg-muted-foreground/20 relative">
                                <div
                                  className="absolute inset-y-0 left-0 bg-[#E8622A] rounded-full"
                                  style={{ width: `${((idx + 1) / selectedBatchZones.length) * 100}%` }}
                                />
                              </div>
                              <span className="w-7 h-7 rounded-full bg-[#E8622A] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                {String.fromCharCode(65 + idx)}
                              </span>
                            </span>
                          ))}
                          {/* End node */}
                          {selectedBatchZones.length > 0 && (
                            <>
                              <div className="flex-1 h-0.5 bg-muted-foreground/20 relative">
                                <div className="absolute inset-y-0 left-0 bg-[#E8622A] w-full" />
                              </div>
                              <span className="w-7 h-7 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                P
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                          <span>Start</span>
                          {selectedBatchZones.map((zone, idx) => (
                            <span key={zone} className="font-medium">{String.fromCharCode(65 + idx)}: {zone}</span>
                          ))}
                          <span>Pack</span>
                        </div>
                      </div>

                      {/* Batch type badge */}
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {selectedBatchZones.length === 1 ? "Zone Pick" : selectedBatchZones.length > 1 ? "Multi-Zone Batch" : "Mixed"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {selectedBatch.length <= 3 ? "Express" : selectedBatch.length <= 8 ? "Standard" : "Bulk"}
                        </Badge>
                      </div>

                      {/* Stats */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Orders</span>
                          <span className="font-semibold">{selectedBatch.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total lines</span>
                          <span className="font-semibold">{selectedBatch.reduce((s, o) => s + o.lineCount, 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Zones</span>
                          <span className="font-semibold">{selectedBatchZones.length || "Mixed"}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/60 space-y-2">
                        <Button
                          size="sm"
                          className="w-full gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
                          onClick={() => {
                            const ids = selectedBatch.map((o) => o.id);
                            setSelectedOrderIds(ids);
                            createWaveMutation.mutate(ids);
                          }}
                          disabled={createWaveMutation.isPending}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Create Wave from Batch
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Route className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Select a batch to preview the optimized pick route
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Active waves summary */}
          {waves.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#E8622A]" />
                  Active Waves
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-1">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold pl-4">Wave #</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Status</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-center">Orders</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-center">Progress</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Created</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waves.map((w: any) => {
                      const pct = w.totalLines > 0 ? Math.round((w.pickedLines / w.totalLines) * 100) : 0;
                      return (
                        <TableRow key={w.id}>
                          <TableCell className="pl-4 font-mono font-medium text-sm">{w.waveNumber}</TableCell>
                          <td>
                            <Badge className={
                              w.status === "completed" ? "bg-green-100 text-green-700" :
                              w.status === "picking" ? "bg-amber-100 text-amber-700" :
                              w.status === "ready" ? "bg-blue-100 text-blue-700" :
                              "bg-gray-100 text-gray-700"
                            }>{w.status}</Badge>
                          </td>
                          <td className="text-center text-sm">{w.totalOrders}</td>
                          <td>
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{pct}%</span>
                            </div>
                          </td>
                          <td className="text-sm text-muted-foreground">{format(new Date(w.createdAt), "MMM d, HH:mm")}</td>
                          <td>
                            {(w.status === "ready" || w.status === "picking") && (
                              <Button size="sm" variant="outline" onClick={() => { setSelectedWaveId(w.id); setCurrentZoneIdx(0); setView("pick"); }}>
                                {w.status === "ready" ? "Start" : "Continue"}
                              </Button>
                            )}
                          </td>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Picking Tips */}
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#E8622A]" />
                Picking Optimization Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Batch by Zone</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Group orders that share the same storage zone to minimize travel time across the warehouse.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Prioritize Express</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Small batches (≤3 orders) with single-zone picks are fastest. Create express waves for urgent orders.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Follow Zone Order</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pick all items in one zone before moving to the next. The wave computes the optimal zone sequence.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VIEW: WAVES — Full wave list
  // ═══════════════════════════════════════════════════════════════════════

  if (view === "waves") {
    return (
      <Layout>
        <PageHeader
          title="Wave Picking"
          subtitle="All waves — create, track, and execute"
          action={
            <Button variant="outline" onClick={() => setView("plan")}>
              ← Back to Planning
            </Button>
          }
        />
        <div className="p-6 space-y-4 max-w-5xl">
          {waves.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No waves yet</p>
                <p className="text-sm mt-1">Go to Planning to create your first wave</p>
                <Button className="mt-4" onClick={() => setView("plan")}>
                  <Route className="w-4 h-4 mr-1.5" />
                  Go to Planning
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Wave #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead className="text-center">Lines</TableHead>
                    <TableHead className="text-center">Units</TableHead>
                    <TableHead className="text-center">Progress</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waves.map((w: any) => {
                    const pct = w.totalLines > 0 ? Math.round((w.pickedLines / w.totalLines) * 100) : 0;
                    return (
                      <TableRow key={w.id}>
                        <td className="font-mono font-medium">{w.waveNumber}</td>
                        <td>
                          <Badge className={
                            w.status === "completed" ? "bg-green-100 text-green-700" :
                            w.status === "picking" ? "bg-amber-100 text-amber-700" :
                            w.status === "ready" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-700"
                          }>{w.status}</Badge>
                        </td>
                        <td className="text-center">{w.totalOrders}</td>
                        <td className="text-center">{w.totalLines}</td>
                        <td className="text-center">{w.totalUnits}</td>
                        <td className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{pct}%</span>
                          </div>
                        </td>
                        <td className="text-sm text-muted-foreground">{format(new Date(w.createdAt), "MMM d, HH:mm")}</td>
                        <td>
                          {(w.status === "ready" || w.status === "picking") && (
                            <Button size="sm" variant="outline" onClick={() => { setSelectedWaveId(w.id); setCurrentZoneIdx(0); setView("pick"); }}>
                              {w.status === "ready" ? "Start" : "Continue"}
                            </Button>
                          )}
                        </td>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </Layout>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VIEW: PICK — Execute wave (zone-by-zone picking)
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <Layout>
      <PageHeader
        title={wave?.waveNumber || "Wave"}
        subtitle={`Wave picking — ${zoneStops.length} zones · ${allPickLines.length} lines · ${totalPicked}/${allPickLines.length} picked`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setView("plan"); setSelectedWaveId(""); }}>
              ← Back to Planning
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4 max-w-6xl">
        {/* Zone Progress */}
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-3 mb-3">
              <Navigation className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Pick Route — Zone Order</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {zoneStops.map((zs: any, idx: number) => {
                const zoneLines = linesByZone[zs.zoneName] || [];
                const zoneDone = zoneLines.length > 0 && zoneLines.every((l: any) => l.status === "picked");
                const isCurrent = idx === currentZoneIdx;
                return (
                  <div key={zs.id} className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentZoneIdx(idx)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isCurrent ? "bg-primary text-primary-foreground" :
                        zoneDone ? "bg-green-100 text-green-700" :
                        "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {zoneDone ? <CheckCircle className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                      {zs.zoneName}
                      <span className="text-[10px] opacity-70">({zs.linesCount})</span>
                    </button>
                    {idx < zoneStops.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-xl font-bold">{allPickLines.length}</div>
            <div className="text-xs text-muted-foreground">Total Lines</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-xl font-bold">{allPickLines.reduce((s: number, l: any) => s + (l.qtyToPick || 0), 0)}</div>
            <div className="text-xs text-muted-foreground">Units to Pick</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-xl font-bold text-green-700">{totalPicked}</div>
            <div className="text-xs text-muted-foreground">Lines Picked</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-xl font-bold text-amber-700">{allPickLines.length - totalPicked}</div>
            <div className="text-xs text-muted-foreground">Remaining</div>
          </CardContent></Card>
        </div>

        {/* Start */}
        {waveStatus === "ready" && (
          <div className="flex justify-end">
            <Button onClick={() => startWaveMutation.mutate()} disabled={startWaveMutation.isPending} className="gap-2">
              {startWaveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start Wave Picking
            </Button>
          </div>
        )}

        {/* Picking */}
        {waveStatus === "picking" && (
          <>
            {/* Scan Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Barcode className="w-5 h-5" />
                  Scan to Pick — All Zones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="wave-scan-input" className="text-xs text-muted-foreground">Scan bin code or SKU</Label>
                    <Input
                      id="wave-scan-input"
                      data-scan-input="true"
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleScan(); } }}
                      placeholder="Scan or type bin code / SKU..."
                      className="font-mono"
                      autoFocus
                    />
                  </div>
                  <Button onClick={handleScan} disabled={!scanInput.trim() || pickLineMutation.isPending} className="self-end">
                    <Barcode className="w-4 h-4 mr-1" />Confirm
                  </Button>
                  <Button variant="outline" className="self-end" onClick={() => setScanModalOpen(true)} title="Scan with camera">
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                <ScanModal
                  open={scanModalOpen}
                  onClose={() => setScanModalOpen(false)}
                  onScan={(value) => { setScanInput(value); setScanModalOpen(false); }}
                  title="Scan Pick Line"
                />
                {lastScan && (
                  <div className={`p-3 rounded-md text-sm ${
                    lastScan.type === "success" ? "bg-green-50 text-green-700 border border-green-200" :
                    lastScan.type === "error" ? "bg-red-50 text-red-700 border border-red-200" :
                    "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}>
                    {lastScan.type === "success" && <CheckCircle className="w-4 h-4 inline mr-1" />}
                    {lastScan.type === "error" && <XCircle className="w-4 h-4 inline mr-1" />}
                    {lastScan.message}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Zone Lines */}
            {currentZone && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Zone: {currentZone.zoneName}
                    <Badge variant="outline" className="ml-2">{currentZoneLines.length} lines</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">To Pick</TableHead>
                        <TableHead className="text-center">Picked</TableHead>
                        <TableHead>Bin</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentZoneLines.map((line: any, idx: number) => {
                        const isPicked = line.status === "picked";
                        return (
                          <TableRow key={line.id} className={isPicked ? "bg-green-50/50" : ""}>
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <td className="font-mono text-xs">{line.orderNumber || "—"}</td>
                            <td className="font-mono text-sm">{line.skuCode || "—"}</td>
                            <td className="font-medium text-sm">{line.productName || line.productId}</td>
                            <td className="text-center font-bold">{line.qtyToPick}</td>
                            <td className="text-center font-bold">{line.qtyPicked || 0}</td>
                            <td>
                              {isPicked ? (
                                <Badge variant="outline" className="font-mono text-xs">
                                  <MapPin className="w-3 h-3 mr-1" />{line.binCode || "—"}
                                </Badge>
                              ) : (
                                <span className="text-xs font-mono text-muted-foreground">{line.binCode || "—"}</span>
                              )}
                            </td>
                            <td>
                              <Badge className={
                                line.status === "picked" ? "bg-green-100 text-green-700" :
                                line.status === "picking" ? "bg-amber-100 text-amber-700" :
                                "bg-gray-100 text-gray-700"
                              }>{line.status}</Badge>
                            </td>
                            <td>
                              {!isPicked && line.binId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => pickLineMutation.mutate({ lineId: line.id, qtyPicked: line.qtyToPick, binId: line.binId })}
                                  disabled={pickLineMutation.isPending}
                                >
                                  <ArrowRight className="w-3 h-3" />Pick
                                </Button>
                              )}
                            </td>
                          </TableRow>
                        );
                      })}
                      {currentZoneLines.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-4 text-muted-foreground text-sm">No lines in this zone</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <div className="flex justify-between mt-4">
                    <Button variant="outline" size="sm" onClick={() => setCurrentZoneIdx(Math.max(0, currentZoneIdx - 1))} disabled={currentZoneIdx === 0}>
                      ← Previous Zone
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentZoneIdx(Math.min(zoneStops.length - 1, currentZoneIdx + 1))} disabled={currentZoneIdx >= zoneStops.length - 1}>
                      Next Zone →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {allPicked && (
              <div className="flex justify-end">
                <Button
                  onClick={() => completeWaveMutation.mutate()}
                  disabled={completeWaveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 gap-2"
                >
                  {completeWaveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Complete Wave
                </Button>
              </div>
            )}
          </>
        )}

        {waveStatus === "completed" && (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-green-600 mx-auto" />
              <p className="text-base font-semibold">Wave Completed</p>
              <p className="text-sm text-muted-foreground">All orders advanced to picking complete.</p>
              <Button variant="outline" onClick={() => { setView("plan"); setSelectedWaveId(""); }}>
                Back to Planning
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
