import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useCommitReceipt,
  useGetPurchaseOrder,
  useListProducts,
  useListPurchaseOrders,
  useListWarehouses,
  useListZones,
  useListBins,
  getListInventoryQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetPurchaseOrderQueryKey,
  getListZonesQueryKey,
  getListBinsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { useNetworkStatus } from "@/hooks/use-network-status";
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  PackagePlus,
  ArrowLeft,
  ArrowRight,
  Truck,
  Camera,
  ScanLine,
  MapPin,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { ScanModal } from "@/components/scan-modal";
import { Link } from "wouter";

interface ReceiptLine {
  id: string;
  productId: string;
  warehouseId: string;
  zoneId: string;
  binId: string;
  qty: number;
}

type Step = "reference" | "lines" | "review" | "done";

let lineCounter = 0;
const newLine = (): ReceiptLine => ({
  id: String(++lineCounter),
  productId: "",
  warehouseId: "",
  zoneId: "",
  binId: "",
  qty: 1,
});

function LineZonesSelect({
  warehouseId,
  value,
  onChange,
}: {
  warehouseId: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { data: zones = [] } = useListZones(warehouseId, {
    query: { enabled: !!warehouseId, queryKey: getListZonesQueryKey(warehouseId) },
  });
  return (
    <Select value={value} onValueChange={onChange} disabled={!warehouseId}>
      <SelectTrigger>
        <SelectValue placeholder="Zone" />
      </SelectTrigger>
      <SelectContent>
        {zones.map((z) => (
          <SelectItem key={z.id} value={z.id}>
            {z.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LineBinsSelect({
  zoneId,
  value,
  onChange,
}: {
  zoneId: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { data: bins = [] } = useListBins(zoneId, {
    query: { enabled: !!zoneId, queryKey: getListBinsQueryKey(zoneId) },
  });
  return (
    <Select value={value} onValueChange={onChange} disabled={!zoneId}>
      <SelectTrigger>
        <SelectValue placeholder="Bin" />
      </SelectTrigger>
      <SelectContent>
        {bins.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.code}{b.name ? ` — ${b.name}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function ReceivingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { isOnline } = useNetworkStatus();

  const [step, setStep] = useState<Step>("reference");
  const [reference, setReference] = useState("");
  const [selectedPoId, setSelectedPoId] = useState<string>("");
  const [lines, setLines] = useState<ReceiptLine[]>([newLine()]);
  const [result, setResult] = useState<{ linesCommitted: number; reference: string | null } | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanTargetLineId, setScanTargetLineId] = useState<string | null>(null);

  // Fetch PO list for selection (only ordered/partially_received)
  const { data: poListData } = useListPurchaseOrders({ status: "ordered" });
  const { data: poListPartiallyData } = useListPurchaseOrders({ status: "partially_received" });
  const availablePOs = [...(poListData ?? []), ...(poListPartiallyData ?? [])];

  // All products (when no PO selected)
  const { data: products = [] } = useListProducts();
  const { data: warehouses = [] } = useListWarehouses();

  // Fetch selected PO detail (with lines)
  const { data: selectedPo } = useGetPurchaseOrder(selectedPoId, {
    query: {
      queryKey: getGetPurchaseOrderQueryKey(selectedPoId),
      enabled: !!selectedPoId,
    },
  });

  // Products from the selected PO's lines
  const poProductIds = selectedPo?.lines?.map((l: any) => l.productId) ?? [];
  const poProducts = products.filter((p) => poProductIds.includes(p.id));

  // Which products to show in dropdown
  const selectableProducts = selectedPoId ? poProducts : products;

  // Putaway suggestions: keyed by line id
  const [suggestions, setSuggestions] = useState<Record<string, any>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<Record<string, boolean>>({});

  // Fetch putaway suggestion for a line
  const fetchSuggestion = async (lineId: string, productId: string, qty: number, warehouseId: string) => {
    if (!productId) return;
    setLoadingSuggestions((prev) => ({ ...prev, [lineId]: true }));
    try {
      const qs = new URLSearchParams({ productId, qty: String(qty) });
      if (warehouseId) qs.set("warehouseId", warehouseId);
      const res = await fetch(`/api/locations/putaway-suggest?${qs}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSuggestions((prev) => ({ ...prev, [lineId]: data }));
      }
    } catch {
      // silently fail
    } finally {
      setLoadingSuggestions((prev) => ({ ...prev, [lineId]: false }));
    }
  };

  // Accept a suggestion — fill zone + bin
  const acceptSuggestion = (lineId: string, suggestion: any) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    updateLine(lineId, {
      warehouseId: suggestion.warehouseId,
      zoneId: suggestion.zoneId,
      binId: suggestion.binId,
    });
    // Remove suggestion after accepting
    setSuggestions((prev) => {
      const next = { ...prev };
      delete next[lineId];
      return next;
    });
  };

  const baseCommitReceipt = useCommitReceipt();

  // @ts-ignore
  const { mutate: commit, isPending } = useOfflineMutation({
    mutationFn: (vars: { data: { reference?: string; lines: { productId: string; binId: string; qty: number }[] } }) =>
      baseCommitReceipt.mutateAsync(vars),
    url: "/api/receiving/commit",
    entityType: "receipt",
    entityIdExtractor: (vars) => vars.data.reference || "receipt",
    invalidateKeys: ["inventory", "dashboard-summary", "purchase-orders"],
    successMessage: "Receipt committed",
  }, {
    onSuccess: (data) => {
      if (!(data as any)?.queued) {
        setResult({ linesCommitted: (data as any).linesCommitted, reference: (data as any).reference ?? null });
        setStep("done");
        qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    },
    onError: () => {
      toast({ title: "Commit failed", description: "Please check the form and try again.", variant: "destructive" });
    },
  });

  const updateLine = (id: string, patch: Partial<ReceiptLine>) =>
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, ...patch };
        if (patch.warehouseId) { updated.zoneId = ""; updated.binId = ""; }
        if (patch.zoneId) { updated.binId = ""; }
        return updated;
      })
    );

  const removeLine = (id: string) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));

  // Auto-fetch putaway suggestions when product or qty changes
  useEffect(() => {
    for (const line of lines) {
      if (line.productId && line.qty >= 1) {
        // Debounce: only fetch if we don't already have a suggestion for this line
        if (!suggestions[line.id] && !loadingSuggestions[line.id]) {
          fetchSuggestion(line.id, line.productId, line.qty, line.warehouseId);
        }
      }
    }
  }, [lines.map((l) => `${l.id}:${l.productId}:${l.qty}:${l.warehouseId}`).join(",")]);

  const linesValid = lines.every((l) => l.productId && l.binId && l.qty >= 1);
  const totalUnits = lines.reduce((s, l) => s + l.qty, 0);

  const getProductName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";
  const getProductSku = (id: string) => products.find((p) => p.id === id)?.skuCode ?? "—";
  const getWarehouseName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? "—";

  const handleCommit = () => {
    commit({
      data: {
        reference: reference.trim() || undefined,
        lines: lines.map(({ productId, binId, qty }) => ({ productId, binId, qty })),
      },
    });
  };

  return (
    <Layout>
      <PageHeader
        title="Receive Inventory"
        subtitle="Log an incoming shipment and update bin stock"
      />

      <div className="p-6 max-w-4xl space-y-6">

        {/* Step indicator */}
        {step !== "done" && (
          <div className="flex items-center gap-2 text-sm">
            {(["reference", "lines", "review"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px bg-border" />}
                <button
                  onClick={() => {
                    if (s === "reference") setStep("reference");
                    if (s === "lines" && step === "review") setStep("lines");
                  }}
                  className={`flex items-center gap-1.5 font-medium transition-colors ${
                    step === s
                      ? "text-primary"
                      : s === "lines" && step === "review"
                      ? "text-muted-foreground hover:text-foreground cursor-pointer"
                      : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-bold ${
                      step === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {s === "reference" ? "Reference" : s === "lines" ? "Line Items" : "Review"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Step 1: Reference + PO Selection ─────────────────────────────── */}
        {step === "reference" && (
          <Card className="border-border/60">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Truck className="w-4 h-4 text-muted-foreground" />
                Link to Purchase Order
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Select a PO to receive against (optional)</Label>
                <Select
                  value={selectedPoId}
                  onValueChange={(v) => {
                    const poId = v === "__none__" ? "" : v;
                    setSelectedPoId(poId);
                    setReference(poId ? "" : reference);
                    setLines([newLine()]);
                  }}
                >
                  <SelectTrigger className="max-w-sm">
                    <SelectValue placeholder="Select purchase order…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— No PO (manual entry)</SelectItem>
                    {availablePOs.map((po: any) => (
                      <SelectItem key={po.id} value={po.id}>
                        <span className="font-mono text-xs text-muted-foreground mr-2">{po.poNumber}</span>
                        {po.supplierName}
                        <span className="text-muted-foreground ml-1">· {po.status}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPo && (
                  <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px]">{selectedPo.status}</Badge>
                      <span className="text-muted-foreground">Supplier:</span>
                      <span className="font-medium">{selectedPo.supplierName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{selectedPo.lineCount} line(s)</span>
                      <span>·</span>
                      <span>{selectedPo.totalQtyOrdered} units ordered</span>
                      {selectedPo.expectedDeliveryDate && (
                        <>
                          <span>·</span>
                          <span>Expected: {selectedPo.expectedDeliveryDate}</span>
                        </>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Product dropdown will be filtered to only this PO's line items.
                    </p>
                  </div>
                )}
              </div>

              {!selectedPoId && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Or enter a manual reference</Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setStep("lines")}
                    placeholder="e.g. DN-2026-0042"
                    className="font-mono max-w-sm"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => setStep("lines")} className="gap-1.5">
                  Continue
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Line items ───────────────────────────────────────────── */}
        {step === "lines" && (
          <div className="space-y-4">
            {selectedPo && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="w-3.5 h-3.5" />
                <span>PO:</span>
                <code className="font-mono text-foreground text-xs bg-muted px-1.5 py-0.5 rounded">{selectedPo.poNumber}</code>
                <span>· {selectedPo.supplierName}</span>
              </div>
            )}
            {reference && !selectedPo && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="w-3.5 h-3.5" />
                <span>Ref:</span>
                <code className="font-mono text-foreground text-xs bg-muted px-1.5 py-0.5 rounded">{reference}</code>
              </div>
            )}

            <div className="space-y-3">
              {lines.map((line, idx) => (
                <Card key={line.id} className="border-border/60">
                  <CardContent className="px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Line {idx + 1}
                      </span>
                      <button
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length === 1}
                        className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Product */}
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Product</Label>
                        <Select
                          value={line.productId}
                          onValueChange={(v) => updateLine(line.id, { productId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectableProducts.filter((p) => p.isActive).map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <span className="font-mono text-xs text-muted-foreground mr-2">{p.skuCode}</span>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Putaway Suggestion */}
                      {line.productId && suggestions[line.id]?.suggestions?.length > 0 && (
                        <div className="col-span-2">
                          <div className="bg-blue-50/60 border border-blue-200/60 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
                              <Sparkles className="w-3.5 h-3.5" />
                              Suggested Putaway
                            </div>
                            {suggestions[line.id].suggestions.slice(0, 3).map((s: any, si: number) => (
                              <div key={si} className={`flex items-center justify-between gap-3 p-2 rounded-md text-xs ${
                                si === 0 ? "bg-blue-100/60 border border-blue-200" : "bg-white/60"
                              }`}>
                                <div className="flex items-center gap-2">
                                  {si === 0 && <Badge className="bg-blue-600 text-white text-[10px] h-4 px-1.5">Best</Badge>}
                                  <MapPin className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-mono font-medium">{s.binCode}</span>
                                  <span className="text-muted-foreground">· {s.zoneName}</span>
                                  {s.existingQty > 0 && (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                                      {s.existingQty} existing
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant={si === 0 ? "default" : "outline"}
                                  className="h-6 text-[10px] px-2"
                                  onClick={() => acceptSuggestion(line.id, s)}
                                  disabled={line.binId === s.binId}
                                >
                                  {line.binId === s.binId ? "Accepted" : "Accept"}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warehouse */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Warehouse</Label>
                        <Select
                          value={line.warehouseId}
                          onValueChange={(v) => updateLine(line.id, { warehouseId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Warehouse" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.filter((w) => w.isActive).map((w) => (
                              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Qty */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <Input
                          type="number"
                          min={1}
                          value={line.qty}
                          onChange={(e) =>
                            updateLine(line.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })
                          }
                          className="font-mono"
                        />
                      </div>

                      {/* Zone */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Zone</Label>
                        <LineZonesSelect
                          warehouseId={line.warehouseId}
                          value={line.zoneId}
                          onChange={(v) => updateLine(line.id, { zoneId: v })}
                        />
                      </div>

                      {/* Bin */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Destination Bin</Label>
                        <LineBinsSelect
                          zoneId={line.zoneId}
                          value={line.binId}
                          onChange={(v) => updateLine(line.id, { binId: v })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLines((prev) => [...prev, newLine()])}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Line
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setScanTargetLineId(null); setScanModalOpen(true); }}
                className="gap-1.5"
                title="Scan product barcode"
              >
                <Camera className="w-3.5 h-3.5" />
                Scan Product
              </Button>
            </div>
            <ScanModal
              open={scanModalOpen}
              onClose={() => setScanModalOpen(false)}
              onScan={(value) => {
                setScanModalOpen(false);
                // Try to find product by SKU or barcode
                const matched = products.find(
                  (p) => p.skuCode === value || p.barcode === value
                );
                if (matched) {
                  if (scanTargetLineId) {
                    updateLine(scanTargetLineId, { productId: matched.id });
                  } else {
                    setLines((prev) => [...prev, { ...newLine(), productId: matched.id }]);
                  }
                } else {
                  toast({ title: "Product not found", description: `No product matches "${value}"`, variant: "destructive" });
                }
              }}
              title="Scan Product Barcode"
            />

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("reference")} className="gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </Button>
              <Button
                onClick={() => setStep("review")}
                disabled={!linesValid}
                className="gap-1.5"
              >
                Review Receipt
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review ───────────────────────────────────────────────── */}
        {step === "review" && (
          <div className="space-y-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold">Receipt Summary</CardTitle>
                <div className="flex gap-2">
                  {selectedPo && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {selectedPo.poNumber}
                    </Badge>
                  )}
                  {reference && !selectedPo && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {reference}
                    </Badge>
                  )}
                  <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                    {lines.length} {lines.length === 1 ? "line" : "lines"} · {totalUnits} units
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-1">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">SKU</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Product</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Warehouse</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Bin</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{getProductSku(line.productId)}</TableCell>
                        <TableCell className="text-sm font-medium">{getProductName(line.productId)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{getWarehouseName(line.warehouseId)}</TableCell>
                        <TableCell>
                          <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{line.binId ? "···" : "—"}</code>
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">+{line.qty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex gap-2 items-center">
              <Button variant="ghost" onClick={() => setStep("lines")} className="gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                Edit
              </Button>
              <Button
                onClick={handleCommit}
                disabled={isPending}
                className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PackagePlus className="w-3.5 h-3.5" />
                )}
                {isPending ? "Committing…" : "Commit Receipt"}
              </Button>
              {!isOnline && (
                <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1">
                  <WifiOff className="w-3.5 h-3.5" />
                  Will sync when online
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Done ─────────────────────────────────────────────────────────── */}
        {step === "done" && result && (
          <Card className="border-border/60">
            <CardContent className="py-14 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">
                  Receipt committed successfully
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.linesCommitted} {result.linesCommitted === 1 ? "line" : "lines"} processed
                  {result.reference ? (
                    <> — ref <code className="font-mono text-foreground">{result.reference}</code></>
                  ) : null}
                </p>
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("reference");
                    setReference("");
                    setLines([newLine()]);
                    setResult(null);
                  }}
                >
                  Receive Another
                </Button>
                <Button asChild>
                  <Link href="/movements">View Movements</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
