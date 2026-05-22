import { useState } from "react";
import {
  useCommitDispatch,
  useListProducts,
  useListWarehouses,
  useListZones,
  useListBins,
  useListInventory,
  getListInventoryQueryKey,
  getGetDashboardSummaryQueryKey,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { useNetworkStatus } from "@/hooks/use-network-status";
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  PackageMinus,
  ShoppingCart,
  AlertTriangle,
  TrendingDown,
  WifiOff,
} from "lucide-react";
import { Link } from "wouter";

interface DispatchLine {
  id: string;
  productId: string;
  warehouseId: string;
  zoneId: string;
  binId: string;
  qty: number;
}

interface StockError {
  productId: string;
  binId: string;
  requested: number;
  available: number;
  productName: string;
  binCode: string;
}

type Step = "reference" | "lines" | "review" | "done";

let lineCounter = 0;
const newLine = (): DispatchLine => ({
  id: String(++lineCounter),
  productId: "",
  warehouseId: "",
  zoneId: "",
  binId: "",
  qty: 1,
});

// Sub-component: zone selector per line
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

// Sub-component: bin selector per line — shows stock level inline
function LineBinsSelect({
  zoneId,
  productId,
  value,
  onChange,
}: {
  zoneId: string;
  productId: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { data: bins = [] } = useListBins(zoneId, {
    query: { enabled: !!zoneId, queryKey: getListBinsQueryKey(zoneId) },
  });
  const inventoryParams = { binId: undefined, productId: productId || undefined, warehouseId: undefined, lowStock: false } as const;
  const { data: inventory = [] } = useListInventory(
    inventoryParams,
    { query: { enabled: !!productId, queryKey: getListInventoryQueryKey(inventoryParams) } }
  );
  const stockByBin = Object.fromEntries(inventory.map((i) => [(i as any).bin?.id ?? "", i.qtyOnHand]));

  return (
    <Select value={value} onValueChange={onChange} disabled={!zoneId}>
      <SelectTrigger>
        <SelectValue placeholder="Bin" />
      </SelectTrigger>
      <SelectContent>
        {bins.map((b) => {
          const stock = stockByBin[b.id] ?? 0;
          return (
            <SelectItem key={b.id} value={b.id}>
              <span className="font-mono">{b.code}</span>
              {b.name ? <span className="text-muted-foreground"> — {b.name}</span> : null}
              <span className={`ml-2 text-xs ${stock === 0 ? "text-red-500" : stock < 5 ? "text-amber-600" : "text-muted-foreground"}`}>
                ({stock} avail)
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

// Available stock for a given product+bin
function useAvailableStock(productId: string, binId: string): number {
  const stockParams = { productId: productId || undefined, binId: undefined, warehouseId: undefined, lowStock: false } as const;
  const { data: inventory = [] } = useListInventory(
    stockParams,
    { query: { enabled: !!productId && !!binId, queryKey: getListInventoryQueryKey(stockParams) } }
  );
  const row = inventory.find((i) => (i as any).bin?.id === binId);
  return row?.qtyOnHand ?? 0;
}

function LineStockBadge({ productId, binId, qty }: { productId: string; binId: string; qty: number }) {
  const available = useAvailableStock(productId, binId);
  if (!productId || !binId) return null;
  const ok = available >= qty;
  return (
    <span className={`text-xs font-medium ${ok ? "text-green-700" : "text-red-600"}`}>
      {ok ? `✓ ${available} avail` : `✗ only ${available} avail`}
    </span>
  );
}

export default function DispatchPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { isOnline } = useNetworkStatus();

  const [step, setStep] = useState<Step>("reference");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<DispatchLine[]>([newLine()]);
  const [stockErrors, setStockErrors] = useState<StockError[]>([]);
  const [result, setResult] = useState<{ linesCommitted: number; reference: string | null } | null>(null);

  const { data: products = [] } = useListProducts();
  const { data: warehouses = [] } = useListWarehouses();

  const baseCommitDispatch = useCommitDispatch();

  // @ts-ignore
  const { mutate: commit, isPending } = useOfflineMutation({
    mutationFn: (vars: { data: { reference?: string; lines: { productId: string; binId: string; qty: number }[] } }) =>
      baseCommitDispatch.mutateAsync(vars),
    url: "/api/dispatch/commit",
    entityType: "dispatch",
    entityIdExtractor: (vars) => vars.data.reference || "dispatch",
    invalidateKeys: ["inventory", "dashboard-summary"],
    successMessage: "Dispatch committed",
  }, {
    onSuccess: (data) => {
      if (!(data as any)?.queued) {
        setResult({ linesCommitted: (data as any).linesCommitted, reference: (data as any).reference ?? null });
        setStep("done");
        setStockErrors([]);
        qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    },
    onError: (err: any) => {
      const errors: StockError[] = err?.response?.data?.stockErrors ?? [];
      if (errors.length > 0) {
        setStockErrors(errors);
        toast({
          title: "Insufficient stock",
          description: `${errors.length} line(s) cannot be fulfilled. Review below.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Dispatch failed", description: "Please check the form and try again.", variant: "destructive" });
      }
    },
  });

  const updateLine = (id: string, patch: Partial<DispatchLine>) =>
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

  const linesValid = lines.every((l) => l.productId && l.binId && l.qty >= 1);
  const totalUnits = lines.reduce((s, l) => s + l.qty, 0);

  const getProductName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";
  const getProductSku = (id: string) => products.find((p) => p.id === id)?.skuCode ?? "—";
  const getWarehouseName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? "—";

  const handleCommit = () => {
    setStockErrors([]);
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
        title="Dispatch Order"
        subtitle="Pick items from bins, decrement stock, and log outbound movements"
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
                      : (s === "lines" && step === "review")
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
                  {s === "reference" ? "Reference" : s === "lines" ? "Pick Lines" : "Review"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Step 1: Reference ────────────────────────────────────────────── */}
        {step === "reference" && (
          <Card className="border-border/60">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                Order Reference (optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Order number, shipment ID, or pick reference</Label>
                <Input
                  autoFocus
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setStep("lines")}
                  placeholder="e.g. ORD-2026-0099"
                  className="font-mono max-w-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setStep("lines")} className="gap-1.5">
                  {reference.trim() ? "Continue" : "Skip"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Pick lines ───────────────────────────────────────────── */}
        {step === "lines" && (
          <div className="space-y-4">
            {reference && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Order:</span>
                <code className="font-mono text-foreground text-xs bg-muted px-1.5 py-0.5 rounded">{reference}</code>
              </div>
            )}

            <div className="space-y-3">
              {lines.map((line, idx) => (
                <Card key={line.id} className="border-border/60">
                  <CardContent className="px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Pick Line {idx + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        {line.productId && line.binId && (
                          <LineStockBadge productId={line.productId} binId={line.binId} qty={line.qty} />
                        )}
                        <button
                          onClick={() => removeLine(line.id)}
                          disabled={lines.length === 1}
                          className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Product */}
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Product to pick</Label>
                        <Select
                          value={line.productId}
                          onValueChange={(v) => updateLine(line.id, { productId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.filter((p) => p.isActive).map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <span className="font-mono text-xs text-muted-foreground mr-2">{p.skuCode}</span>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

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
                        <Label className="text-xs text-muted-foreground">Quantity to pick</Label>
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
                        <Label className="text-xs text-muted-foreground">Source Bin</Label>
                        <LineBinsSelect
                          zoneId={line.zoneId}
                          productId={line.productId}
                          value={line.binId}
                          onChange={(v) => updateLine(line.id, { binId: v })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setLines((prev) => [...prev, newLine()])}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Pick Line
            </Button>

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
                Review Dispatch
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review ───────────────────────────────────────────────── */}
        {step === "review" && (
          <div className="space-y-4">

            {/* Stock error alerts (shown after a failed commit attempt) */}
            {stockErrors.length > 0 && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Insufficient stock — cannot dispatch</p>
                  <ul className="space-y-1 text-sm">
                    {stockErrors.map((e, i) => (
                      <li key={i}>
                        <span className="font-medium">{e.productName}</span> from bin{" "}
                        <code className="font-mono">{e.binCode}</code>: requested{" "}
                        <strong>{e.requested}</strong>, only{" "}
                        <strong className="text-red-700">{e.available}</strong> available.
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => { setStockErrors([]); setStep("lines"); }}>
                    Edit Lines
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <Card className="border-border/60">
              <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-muted-foreground" />
                  Dispatch Summary
                </CardTitle>
                <div className="flex gap-2">
                  {reference && (
                    <Badge variant="outline" className="font-mono text-xs">{reference}</Badge>
                  )}
                  <Badge className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50">
                    {lines.length} {lines.length === 1 ? "line" : "lines"} · -{totalUnits} units
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
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Source Bin</TableHead>
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
                          {line.binId
                            ? <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">···</code>
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums text-orange-700">−{line.qty}</TableCell>
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
                  <PackageMinus className="w-3.5 h-3.5" />
                )}
                {isPending ? "Dispatching…" : "Commit Dispatch"}
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
              <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-orange-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">
                  Dispatch committed successfully
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.linesCommitted} {result.linesCommitted === 1 ? "line" : "lines"} dispatched
                  {result.reference ? (
                    <> — order <code className="font-mono text-foreground">{result.reference}</code></>
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
                    setStockErrors([]);
                  }}
                >
                  Dispatch Another
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
