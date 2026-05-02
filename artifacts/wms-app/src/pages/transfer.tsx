import { useState } from "react";
import {
  useCommitTransfer,
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
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeftRight,
  AlertTriangle,
  MoveRight,
} from "lucide-react";
import { Link } from "wouter";

interface TransferLine {
  id: string;
  productId: string;
  fromWarehouseId: string;
  fromZoneId: string;
  fromBinId: string;
  toWarehouseId: string;
  toZoneId: string;
  toBinId: string;
  qty: number;
}

interface StockError {
  productId: string;
  fromBinId: string;
  requested: number;
  available: number;
  productName: string;
  binCode: string;
}

let lineCounter = 0;
const newLine = (): TransferLine => ({
  id: String(++lineCounter),
  productId: "",
  fromWarehouseId: "",
  fromZoneId: "",
  fromBinId: "",
  toWarehouseId: "",
  toZoneId: "",
  toBinId: "",
  qty: 1,
});

// ── Reusable zone/bin selectors ─────────────────────────────────────────────

function ZoneSelect({ warehouseId, value, onChange, placeholder = "Zone" }: {
  warehouseId: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const { data: zones = [] } = useListZones(warehouseId, {
    query: { enabled: !!warehouseId, queryKey: getListZonesQueryKey(warehouseId) },
  });
  return (
    <Select value={value} onValueChange={onChange} disabled={!warehouseId}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function BinSelect({ zoneId, value, onChange, productId = "", showStock = false, placeholder = "Bin" }: {
  zoneId: string; value: string; onChange: (v: string) => void;
  productId?: string; showStock?: boolean; placeholder?: string;
}) {
  const { data: bins = [] } = useListBins(zoneId, {
    query: { enabled: !!zoneId, queryKey: getListBinsQueryKey(zoneId) },
  });
  const { data: inventory = [] } = useListInventory(
    { productId: productId || undefined, binId: undefined, warehouseId: undefined, lowStockOnly: false },
    { query: { enabled: showStock && !!productId } }
  );
  const stockByBin = Object.fromEntries(inventory.map((i) => [(i as any).bin?.id ?? "", i.qtyOnHand]));

  return (
    <Select value={value} onValueChange={onChange} disabled={!zoneId}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {bins.map((b) => {
          const stock = stockByBin[b.id];
          return (
            <SelectItem key={b.id} value={b.id}>
              <span className="font-mono">{b.code}</span>
              {b.name ? <span className="text-muted-foreground"> — {b.name}</span> : null}
              {showStock && stock !== undefined && (
                <span className={`ml-2 text-xs ${stock === 0 ? "text-red-500" : stock < 5 ? "text-amber-600" : "text-muted-foreground"}`}>
                  ({stock} avail)
                </span>
              )}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

// ── Live available stock badge ───────────────────────────────────────────────

function AvailableBadge({ productId, binId, qty }: { productId: string; binId: string; qty: number }) {
  const { data: inventory = [] } = useListInventory(
    { productId: productId || undefined, binId: undefined, warehouseId: undefined, lowStockOnly: false },
    { query: { enabled: !!productId && !!binId } }
  );
  if (!productId || !binId) return null;
  const row = inventory.find((i) => (i as any).bin?.id === binId);
  const available = row?.qtyOnHand ?? 0;
  const ok = available >= qty;
  return (
    <span className={`text-xs font-semibold ${ok ? "text-green-700" : "text-red-600"}`}>
      {ok ? `✓ ${available} available` : `✗ only ${available} available`}
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function TransferPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [lines, setLines] = useState<TransferLine[]>([newLine()]);
  const [reference, setReference] = useState("");
  const [stockErrors, setStockErrors] = useState<StockError[]>([]);
  const [done, setDone] = useState<{ linesCommitted: number; reference: string | null } | null>(null);

  const { data: products = [] } = useListProducts();
  const { data: warehouses = [] } = useListWarehouses();

  const { mutate: commit, isPending } = useCommitTransfer({
    mutation: {
      onSuccess: (data) => {
        setDone({ linesCommitted: data.linesCommitted, reference: data.reference ?? null });
        setStockErrors([]);
        qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
      onError: (err: any) => {
        const errors: StockError[] = err?.response?.data?.stockErrors ?? [];
        if (errors.length > 0) {
          setStockErrors(errors);
          toast({ title: "Insufficient stock", description: `${errors.length} line(s) cannot be transferred.`, variant: "destructive" });
        } else {
          toast({ title: "Transfer failed", description: "Please check the form and try again.", variant: "destructive" });
        }
      },
    },
  });

  const updateLine = (id: string, patch: Partial<TransferLine>) =>
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const u = { ...l, ...patch };
      if (patch.fromWarehouseId) { u.fromZoneId = ""; u.fromBinId = ""; }
      if (patch.fromZoneId)      { u.fromBinId = ""; }
      if (patch.toWarehouseId)   { u.toZoneId = ""; u.toBinId = ""; }
      if (patch.toZoneId)        { u.toBinId = ""; }
      return u;
    }));

  const removeLine = (id: string) =>
    setLines((prev) => prev.length > 1 ? prev.filter((l) => l.id !== id) : prev);

  const linesValid = lines.every(
    (l) => l.productId && l.fromBinId && l.toBinId && l.fromBinId !== l.toBinId && l.qty >= 1
  );
  const totalUnits = lines.reduce((s, l) => s + l.qty, 0);

  const getProductName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";
  const getProductSku  = (id: string) => products.find((p) => p.id === id)?.skuCode ?? "—";
  const getWarehouseName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? "—";

  const handleCommit = () => {
    setStockErrors([]);
    commit({
      data: {
        reference: reference.trim() || undefined,
        lines: lines.map(({ productId, fromBinId, toBinId, qty }) => ({ productId, fromBinId, toBinId, qty })),
      },
    });
  };

  if (done) {
    return (
      <Layout>
        <PageHeader title="Stock Transfer" subtitle="Move inventory between bins" />
        <div className="p-6 max-w-2xl">
          <Card className="border-border/60">
            <CardContent className="py-14 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <p className="text-base font-semibold">Transfer committed successfully</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {done.linesCommitted} {done.linesCommitted === 1 ? "line" : "lines"} moved
                  {done.reference ? <> — ref <code className="font-mono text-foreground">{done.reference}</code></> : null}
                </p>
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <Button variant="outline" onClick={() => { setLines([newLine()]); setReference(""); setDone(null); }}>
                  Transfer Again
                </Button>
                <Button asChild><Link href="/inventory">View Inventory</Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader title="Stock Transfer" subtitle="Move inventory between bins atomically" />

      <div className="p-6 max-w-4xl space-y-5">

        {/* Optional reference */}
        <Card className="border-border/60">
          <CardContent className="px-5 py-4 flex items-center gap-4">
            <ArrowLeftRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 max-w-xs">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Reference (optional)</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. REORG-2026-05"
                className="font-mono h-8 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stock error panel */}
        {stockErrors.length > 0 && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Insufficient stock — transfer blocked</p>
              <ul className="space-y-1 text-sm">
                {stockErrors.map((e, i) => (
                  <li key={i}>
                    <span className="font-medium">{e.productName}</span> in bin{" "}
                    <code className="font-mono">{e.binCode}</code>: requested{" "}
                    <strong>{e.requested}</strong>, only{" "}
                    <strong className="text-red-700">{e.available}</strong> available.
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Transfer lines */}
        <div className="space-y-4">
          {lines.map((line, idx) => (
            <Card key={line.id} className="border-border/60 overflow-hidden">
              <CardHeader className="py-3 px-5 bg-muted/30 flex flex-row items-center justify-between space-y-0 border-b border-border/50">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Transfer Line {idx + 1}
                </span>
                <div className="flex items-center gap-3">
                  {line.productId && line.fromBinId && (
                    <AvailableBadge productId={line.productId} binId={line.fromBinId} qty={line.qty} />
                  )}
                  <button
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length === 1}
                    className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-8 gap-3 items-end">

                  {/* Product + qty — span 2 */}
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Product</Label>
                    <Select value={line.productId} onValueChange={(v) => updateLine(line.id, { productId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {products.filter((p) => p.isActive).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-mono text-xs text-muted-foreground mr-1.5">{p.skuCode}</span>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input
                      type="number" min={1}
                      value={line.qty}
                      onChange={(e) => updateLine(line.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="font-mono"
                    />
                  </div>

                  {/* FROM — span 2 */}
                  <div className="col-span-2 space-y-2 border border-border/60 rounded-lg p-3 bg-muted/20">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From</p>
                    <div className="space-y-2">
                      <Select value={line.fromWarehouseId} onValueChange={(v) => updateLine(line.id, { fromWarehouseId: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Warehouse" /></SelectTrigger>
                        <SelectContent>
                          {warehouses.filter((w) => w.isActive).map((w) => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <ZoneSelect warehouseId={line.fromWarehouseId} value={line.fromZoneId}
                        onChange={(v) => updateLine(line.id, { fromZoneId: v })} />
                      <BinSelect zoneId={line.fromZoneId} value={line.fromBinId} productId={line.productId}
                        showStock onChange={(v) => updateLine(line.id, { fromBinId: v })} />
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="col-span-1 flex justify-center pb-2">
                    <MoveRight className="w-5 h-5 text-muted-foreground/50" />
                  </div>

                  {/* TO — span 2 */}
                  <div className="col-span-2 space-y-2 border border-border/60 rounded-lg p-3 bg-blue-50/40">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">To</p>
                    <div className="space-y-2">
                      <Select value={line.toWarehouseId} onValueChange={(v) => updateLine(line.id, { toWarehouseId: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Warehouse" /></SelectTrigger>
                        <SelectContent>
                          {warehouses.filter((w) => w.isActive).map((w) => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <ZoneSelect warehouseId={line.toWarehouseId} value={line.toZoneId}
                        onChange={(v) => updateLine(line.id, { toZoneId: v })} placeholder="Zone" />
                      <BinSelect zoneId={line.toZoneId} value={line.toBinId}
                        onChange={(v) => updateLine(line.id, { toBinId: v })} placeholder="Bin" />
                    </div>
                  </div>

                </div>

                {/* Same-bin warning */}
                {line.fromBinId && line.toBinId && line.fromBinId === line.toBinId && (
                  <p className="mt-2 text-xs text-amber-700 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Source and destination bin must be different.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add line */}
        <Button variant="outline" size="sm" onClick={() => setLines((p) => [...p, newLine()])} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Transfer Line
        </Button>

        {/* Summary table when lines are filled */}
        {lines.some((l) => l.productId && l.fromBinId && l.toBinId) && (
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">Transfer Preview</CardTitle>
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
                {lines.filter((l) => l.productId && l.fromBinId && l.toBinId).length} line(s) · {totalUnits} units
              </Badge>
            </CardHeader>
            <CardContent className="p-0 pb-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">SKU</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Product</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">From Warehouse</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-center">→</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">To Warehouse</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.filter((l) => l.productId && l.fromBinId && l.toBinId).map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{getProductSku(line.productId)}</TableCell>
                      <TableCell className="text-sm font-medium">{getProductName(line.productId)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{getWarehouseName(line.fromWarehouseId)}</TableCell>
                      <TableCell className="text-center"><ArrowRight className="w-3 h-3 mx-auto text-muted-foreground" /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{getWarehouseName(line.toWarehouseId)}</TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-blue-700">{line.qty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Commit */}
        <div className="flex gap-2 pt-1">
          <Button variant="ghost" asChild><Link href="/">Cancel</Link></Button>
          <Button
            onClick={handleCommit}
            disabled={!linesValid || isPending}
            className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
            {isPending ? "Transferring…" : "Commit Transfer"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
