import { useState, useMemo } from "react";
import {
  useSubmitCycleCount,
  useListWarehouses,
  useListZones,
  useListBins,
  useListInventory,
  getListInventoryQueryKey,
  getGetDashboardSummaryQueryKey,
  getListZonesQueryKey,
  getListBinsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ScanSearch,
  AlertTriangle,
  CheckCheck,
  TrendingUp,
  TrendingDown,
  History,
  ClipboardCheck,
  CalendarClock,
  Camera,
  Users,
} from "lucide-react";
import { ScanModal } from "@/components/scan-modal";
import { Link } from "wouter";
import { format } from "date-fns";

type Step = "scope" | "count" | "review" | "done";

interface CountEntry {
  inventoryItemId: string;
  productId: string;
  binId: string;
  skuCode: string;
  productName: string;
  warehouseName: string;
  zoneName: string;
  binCode: string;
  systemQty: number;
  physicalQty: number;   // what staff typed
}

interface DoneResult {
  linesScanned: number;
  adjustmentCount: number;
  reference: string | null;
  discrepancies: { variance: number }[];
}

export default function CycleCountPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"count" | "history">("count");
  const [step, setStep] = useState<Step>("scope");
  const [reference, setReference] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [zoneId, setZoneId] = useState<string>("__all__");
  const [selectedLaborEntryId, setSelectedLaborEntryId] = useState("");
  const [entries, setEntries] = useState<CountEntry[]>([]);
  const [done, setDone] = useState<DoneResult | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["cycle-counts", "history"],
    queryFn: async () => {
      const res = await fetch("/api/cycle-counts/history", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load history");
      return res.json();
    },
    enabled: activeTab === "history",
  });

  const { data: warehouses = [] } = useListWarehouses();
  const effectiveZoneId = zoneId === "__all__" ? "" : zoneId;

  // Labor entries for worker assignment
  const { data: laborEntries = [] } = useQuery({
    queryKey: ["labor", "entries"],
    queryFn: async () => {
      const res = await fetch("/api/labor/entries", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: zones = [] } = useListZones(warehouseId, {
    query: { enabled: !!warehouseId, queryKey: getListZonesQueryKey(warehouseId) },
  });

  // Load inventory for the selected scope
  const { data: inventory = [], isLoading: loadingInv } = useListInventory(
    { warehouseId: warehouseId || undefined, productId: undefined, lowStock: false },
    { query: { enabled: step === "count", queryKey: getListInventoryQueryKey({ warehouseId: warehouseId || undefined, productId: undefined, lowStock: false }) } }
  );

  const baseSubmit = useSubmitCycleCount({
    mutation: {
      onSuccess: (data) => {
        setDone({
          linesScanned: data.linesScanned,
          adjustmentCount: data.adjustmentCount,
          reference: data.reference ?? null,
          discrepancies: data.discrepancies,
        });
        setStep("done");
        qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
      onError: () => {
        toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" });
      },
    },
  });

  // Wrap to inject laborEntryId into the body
  const submit = (vars: { data: { reference?: string; lines: { inventoryItemId: string; physicalQty: number }[]; laborEntryId?: string } }) => {
    baseSubmit.mutate({
      data: {
        ...vars.data,
        laborEntryId: selectedLaborEntryId || undefined,
      } as any,
    });
  };
  const isPending = baseSubmit.isPending;

  // Build entries from inventory when transitioning to count step
  const handleLoadCount = () => {
    // Filter by zone if selected
    const scopedInventory = effectiveZoneId
      ? inventory.filter((i) => (i as any).bin?.zone?.id === effectiveZoneId)
      : inventory.filter((i) => (i as any).bin?.zone?.warehouse?.id === warehouseId);

    const built: CountEntry[] = scopedInventory.map((i) => ({
      inventoryItemId: i.id,
      productId: i.productId,
      binId: i.binId,
      skuCode: (i as any).product?.skuCode ?? "",
      productName: (i as any).product?.name ?? "",
      warehouseName: (i as any).bin?.zone?.warehouse?.name ?? "",
      zoneName: (i as any).bin?.zone?.name ?? "",
      binCode: (i as any).bin?.code ?? "",
      systemQty: i.qtyOnHand,
      physicalQty: i.qtyOnHand, // default to system — staff overrides discrepancies
    }));
    setEntries(built);
    setStep("count");
  };

  const updatePhysical = (id: string, val: number) =>
    setEntries((prev) => prev.map((e) => e.inventoryItemId === id ? { ...e, physicalQty: val } : e));

  const discrepancies = entries.filter((e) => e.physicalQty !== e.systemQty);
  const gains = discrepancies.filter((e) => e.physicalQty > e.systemQty).length;
  const losses = discrepancies.filter((e) => e.physicalQty < e.systemQty).length;

  const handleSubmit = () => {
    submit({
      data: {
        reference: reference.trim() || undefined,
        lines: entries.map(({ inventoryItemId, physicalQty }) => ({ inventoryItemId, physicalQty })),
      },
    });
  };

  const scopeLabel = useMemo(() => {
    const wh = warehouses.find((w) => w.id === warehouseId)?.name ?? "";
    const z = zones.find((z) => z.id === effectiveZoneId)?.name;
    return z ? `${wh} › ${z}` : wh;
  }, [warehouseId, effectiveZoneId, warehouses, zones]);

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === "done" && done) {
    const netVariance = done.discrepancies.reduce((s, d) => s + d.variance, 0);
    return (
      <Layout>
        <PageHeader title="Cycle Count" subtitle="Physical count with automatic adjustment" />
        <div className="p-6 max-w-2xl">
          <Card className="border-border/60">
            <CardContent className="py-14 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <p className="text-base font-semibold">Cycle count submitted</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {done.linesScanned} item{done.linesScanned !== 1 ? "s" : ""} scanned
                  {done.reference ? <> — ref <code className="font-mono text-foreground">{done.reference}</code></> : null}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto pt-2">
                <div className="text-center">
                  <p className="text-2xl font-bold tabular-nums">{done.linesScanned}</p>
                  <p className="text-xs text-muted-foreground">Lines</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold tabular-nums ${done.adjustmentCount > 0 ? "text-amber-700" : "text-green-700"}`}>
                    {done.adjustmentCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Adjustments</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold tabular-nums ${netVariance < 0 ? "text-red-600" : netVariance > 0 ? "text-green-700" : "text-foreground"}`}>
                    {netVariance > 0 ? "+" : ""}{netVariance}
                  </p>
                  <p className="text-xs text-muted-foreground">Net variance</p>
                </div>
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <Button variant="outline" onClick={() => { setStep("scope"); setEntries([]); setDone(null); setReference(""); setWarehouseId(""); setZoneId("__all__"); }}>
                  New Count
                </Button>
                <Button asChild><Link href="/movements">View Adjustments</Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Cycle Count"
        subtitle="Physical count with automatic discrepancy adjustment"
        action={
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/cycle-count/schedule">
              <CalendarClock className="w-3.5 h-3.5" />
              Schedule
            </Link>
          </Button>
        }
      />

      <div className="p-6 max-w-5xl space-y-6">

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("count")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              activeTab === "count" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            New Count
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              activeTab === "history" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            History
          </button>
        </div>

        {/* ── History Tab ──────────────────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <Card className="border-dashed border-border/60">
                <CardContent className="py-12 text-center">
                  <History className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium">No cycle count history yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Completed counts will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60">
                <CardContent className="p-0 pb-1">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Date</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Reference</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Items</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Discrepancies</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Net Variance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((h: any) => (
                        <TableRow key={h.id}>
                          <TableCell className="text-sm">{h.createdAt ? format(new Date(h.createdAt), "MMM d, yyyy h:mm a") : "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{h.reference ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{h.itemsCounted}</TableCell>
                          <TableCell className="text-right tabular-nums">{h.discrepancyCount}</TableCell>
                          <TableCell className="text-right tabular-nums font-bold">
                            <span className={h.netVariance > 0 ? "text-green-700" : h.netVariance < 0 ? "text-red-600" : ""}>
                              {h.netVariance > 0 ? "+" : ""}{h.netVariance}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── New Count Tab ─────────────────────────────────────────────────── */}
        {activeTab === "count" && (
        <>
        {/* Step indicator */}
        {step !== "done" && (
          <div className="flex items-center gap-2 text-sm">
            {(["scope", "count", "review"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px bg-border" />}
                <button
                  onClick={() => {
                    if (s === "scope") setStep("scope");
                    if (s === "count" && step === "review") setStep("count");
                  }}
                  className={`flex items-center gap-1.5 font-medium transition-colors ${
                    step === s ? "text-primary"
                    : (s === "count" && step === "review") ? "text-muted-foreground hover:text-foreground cursor-pointer"
                    : "text-muted-foreground"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-bold ${step === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  {s === "scope" ? "Scope" : s === "count" ? "Enter Counts" : "Review & Submit"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Step 1: Scope ─────────────────────────────────────────────────── */}
        {step === "scope" && (
          <Card className="border-border/60">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ScanSearch className="w-4 h-4 text-muted-foreground" />
                Count Scope
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Reference (optional)</Label>
                  <Input
                    autoFocus
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. CC-2026-Q2"
                    className="font-mono"
                  />
                </div>
                <div />
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Warehouse *</Label>
                  <Select value={warehouseId} onValueChange={(v) => { setWarehouseId(v); setZoneId("__all__"); }}>
                    <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                    <SelectContent>
                      {warehouses.filter((w) => w.isActive).map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Zone (optional — leave blank for all zones)</Label>
                  <Select value={zoneId} onValueChange={setZoneId} disabled={!warehouseId}>
                    <SelectTrigger><SelectValue placeholder="All zones" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All zones</SelectItem>
                      {zones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleLoadCount} disabled={!warehouseId || loadingInv} className="gap-1.5">
                  {loadingInv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  Load Items
                </Button>
                <Button variant="ghost" asChild><Link href="/">Cancel</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Count Entry ───────────────────────────────────────────── */}
        {step === "count" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ScanSearch className="w-3.5 h-3.5" />
                <span>{scopeLabel}</span>
                {reference && <code className="font-mono text-foreground text-xs bg-muted px-1.5 py-0.5 rounded ml-1">{reference}</code>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setScanModalOpen(true)}>
                  <Camera className="w-3.5 h-3.5" />
                  Scan
                </Button>
                <Badge variant="outline">{entries.length} items · {discrepancies.length} changes</Badge>
              </div>
            </div>
            <ScanModal
              open={scanModalOpen}
              onClose={() => setScanModalOpen(false)}
              onScan={(value) => {
                setScanModalOpen(false);
                // Find entry by SKU or product name
                const idx = entries.findIndex(
                  (e) => e.skuCode === value || e.productName?.toLowerCase() === value.toLowerCase()
                );
                if (idx >= 0) {
                  // Focus the physical count input for this entry
                  const el = document.querySelector(`[data-count-input="${entries[idx].inventoryItemId}"]`) as HTMLInputElement;
                  if (el) {
                    el.focus();
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                  toast({ title: "Item found", description: `Focused: ${entries[idx].skuCode} — ${entries[idx].productName}` });
                } else {
                  toast({ title: "Not in scope", description: `"${value}" not found in current count scope`, variant: "destructive" });
                }
              }}
              title="Scan to Find Item"
            />

            {entries.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">No inventory items found for this scope.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setStep("scope")}>Change Scope</Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60">
                <CardContent className="p-0 pb-1">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">SKU</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Product</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Location</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">System Qty</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Physical Count</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Variance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((e) => {
                        const variance = e.physicalQty - e.systemQty;
                        const changed = variance !== 0;
                        return (
                          <TableRow key={e.inventoryItemId} className={changed ? "bg-amber-50/60 hover:bg-amber-50" : ""}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{e.skuCode}</TableCell>
                            <TableCell className="text-sm font-medium">{e.productName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              <span>{e.zoneName}</span>
                              <span className="mx-1">›</span>
                              <code className="font-mono">{e.binCode}</code>
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium">{e.systemQty}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min={0}
                                value={e.physicalQty}
                                onChange={(ev) => updatePhysical(e.inventoryItemId, Math.max(0, parseInt(ev.target.value) || 0))}
                                className={`w-20 text-right font-mono ml-auto h-7 text-sm ${changed ? "border-amber-400 focus-visible:ring-amber-400" : ""}`}
                              />
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-bold text-sm">
                              {changed ? (
                                <span className={`flex items-center justify-end gap-1 ${variance > 0 ? "text-green-700" : "text-red-600"}`}>
                                  {variance > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {variance > 0 ? "+" : ""}{variance}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep("scope")} className="gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <Button onClick={() => setStep("review")} disabled={entries.length === 0} className="gap-1.5">
                Review {discrepancies.length > 0 ? `(${discrepancies.length} changes)` : "(no changes)"}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review & Submit ───────────────────────────────────────── */}
        {step === "review" && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Items counted", value: entries.length, color: "" },
                { label: "Discrepancies", value: discrepancies.length, color: discrepancies.length > 0 ? "text-amber-700" : "text-green-700" },
                { label: "Net variance", value: `${discrepancies.reduce((s, e) => s + (e.physicalQty - e.systemQty), 0) >= 0 ? "+" : ""}${discrepancies.reduce((s, e) => s + (e.physicalQty - e.systemQty), 0)}`, color: "" },
              ].map(({ label, value, color }) => (
                <Card key={label} className="border-border/60">
                  <CardContent className="px-4 py-3 text-center">
                    <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {discrepancies.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-10 text-center">
                  <CheckCheck className="w-9 h-9 mx-auto text-green-600 mb-2" />
                  <p className="text-sm font-medium">All counts match system quantities</p>
                  <p className="text-xs text-muted-foreground mt-1">No adjustments will be created.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60">
                <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">Discrepancies — Adjustments to Create</CardTitle>
                  <div className="flex gap-2">
                    {gains > 0 && <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50 gap-1 text-[11px]"><TrendingUp className="w-2.5 h-2.5" /> {gains} gain{gains !== 1 ? "s" : ""}</Badge>}
                    {losses > 0 && <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 gap-1 text-[11px]"><TrendingDown className="w-2.5 h-2.5" /> {losses} loss{losses !== 1 ? "es" : ""}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="p-0 pb-1">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">SKU</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Product</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Bin</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">System</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Physical</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Adjustment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {discrepancies.map((e) => {
                        const variance = e.physicalQty - e.systemQty;
                        return (
                          <TableRow key={e.inventoryItemId}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{e.skuCode}</TableCell>
                            <TableCell className="text-sm font-medium">{e.productName}</TableCell>
                            <TableCell><code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{e.binCode}</code></TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{e.systemQty}</TableCell>
                            <TableCell className="text-right tabular-nums font-bold text-sm">{e.physicalQty}</TableCell>
                            <TableCell className="text-right">
                              <span className={`flex items-center justify-end gap-1 font-bold tabular-nums text-sm ${variance > 0 ? "text-green-700" : "text-red-600"}`}>
                                {variance > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {variance > 0 ? "+" : ""}{variance}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Worker assignment */}
            <Card className="border-blue-200/60 bg-blue-50/20">
              <CardContent className="px-5 py-3 flex items-center gap-3">
                <Users className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="flex-1 min-w-[200px] max-w-xs">
                  <Label className="text-xs text-blue-600 mb-1 block">Assign Worker (optional)</Label>
                  <Select value={selectedLaborEntryId} onValueChange={setSelectedLaborEntryId}>
                    <SelectTrigger className="h-8 text-sm bg-white">
                      <SelectValue placeholder="Select worker…" />
                    </SelectTrigger>
                    <SelectContent>
                      {laborEntries.map((e: any) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.workerId} — {e.shiftDate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedLaborEntryId && (
                  <button
                    onClick={() => setSelectedLaborEntryId("")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    Clear
                  </button>
                )}
              </CardContent>
            </Card>

            {discrepancies.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <p>Each discrepancy will create a <strong>CYCLE-COUNT</strong> adjustment movement and update bin inventory to the physical count.</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep("count")} className="gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Edit Counts
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending}
                className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {isPending ? "Submitting…" : discrepancies.length > 0 ? `Submit & Apply ${discrepancies.length} Adjustments` : "Submit Count (no adjustments)"}
              </Button>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </Layout>
  );
}
