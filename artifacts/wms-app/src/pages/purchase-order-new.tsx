import { useState } from "react";
import {
  useCreatePurchaseOrder,
  useListInventory,
  useListSuppliers,
  getListInventoryQueryKey,
} from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Plus, Trash2, Loader2, ShoppingCart, Truck, ExternalLink } from "lucide-react";

interface LineForm {
  key: number;
  productId: string;
  qtyOrdered: number;
  unitCost: string;
}

let lineKey = 0;

const FREE_TEXT = "__free_text__";

export default function PurchaseOrderNewPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Supplier selection — either pick from list or type free text
  const [supplierId, setSupplierId] = useState("");
  const [supplierFreeText, setSupplierFreeText] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [lines, setLines] = useState<LineForm[]>([{ key: lineKey++, productId: "", qtyOrdered: 1, unitCost: "" }]);

  const { data: suppliers = [] } = useListSuppliers({ isActive: true });
  const { data: inventoryItems = [] } = useListInventory(
    { productId: undefined, binId: undefined, warehouseId: undefined, lowStock: false },
    { query: { queryKey: getListInventoryQueryKey() } }
  );

  // Deduplicate products from inventory
  const productOptions = (() => {
    const seen = new Map<string, { id: string; skuCode: string; name: string }>();
    for (const item of inventoryItems) {
      if (!seen.has(item.productId)) {
        seen.set(item.productId, {
          id: item.productId,
          skuCode: (item as any).product?.skuCode ?? "",
          name: (item as any).product?.name ?? "",
        });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.skuCode.localeCompare(b.skuCode));
  })();

  const { mutate: createPo, isPending } = useCreatePurchaseOrder({
    mutation: {
      onSuccess: (data) => {
        toast({ title: `PO ${data.poNumber} created` });
        navigate(`/purchase-orders/${data.id}`);
      },
      onError: () => {
        toast({ title: "Failed to create PO", variant: "destructive" });
      },
    },
  });

  const addLine = () => setLines((prev) => [...prev, { key: lineKey++, productId: "", qtyOrdered: 1, unitCost: "" }]);
  const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key));
  const updateLine = (key: number, patch: Partial<LineForm>) =>
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, ...patch } : l));

  const resolvedSupplierId = supplierId && supplierId !== FREE_TEXT ? supplierId : null;
  const resolvedSupplierName = supplierId === FREE_TEXT ? supplierFreeText.trim() : "";
  const supplierOk = resolvedSupplierId || resolvedSupplierName.length > 0;
  const canSubmit = supplierOk && lines.every((l) => l.productId && l.qtyOrdered >= 1);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const handleSubmit = () => {
    if (!canSubmit) return;
    createPo({
      data: {
        supplierId: resolvedSupplierId,
        supplierName: resolvedSupplierName || undefined,
        notes: notes.trim() || undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        lines: lines.map((l) => ({
          productId: l.productId,
          qtyOrdered: l.qtyOrdered,
          unitCost: l.unitCost ? parseFloat(l.unitCost) : undefined,
        })),
      },
    });
  };

  return (
    <Layout>
      <PageHeader title="New Purchase Order" subtitle="Create a draft PO to order stock from a supplier" />
      <div className="p-6 max-w-3xl space-y-5">

        {/* Header fields */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">

            {/* Supplier selector */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Supplier *</Label>
              <Select value={supplierId} onValueChange={(v) => { setSupplierId(v); setSupplierFreeText(""); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select a supplier or type a name…" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.length > 0 && (
                    <>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <Truck className="w-3 h-3 text-muted-foreground shrink-0" />
                            {s.name}
                            {s.leadTimeDays != null && (
                              <span className="text-[10px] text-muted-foreground">({s.leadTimeDays}d lead)</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                      <SelectItem value={FREE_TEXT}>
                        <span className="text-muted-foreground italic">+ Enter name manually…</span>
                      </SelectItem>
                    </>
                  )}
                  {suppliers.length === 0 && (
                    <SelectItem value={FREE_TEXT}>
                      <span className="text-muted-foreground italic">Enter supplier name manually</span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Supplier quick-info strip */}
              {selectedSupplier && (
                <div className="flex items-center gap-3 px-3 py-2 bg-muted/40 rounded-md text-xs text-muted-foreground border border-border/40">
                  {selectedSupplier.email && <span>{selectedSupplier.email}</span>}
                  {selectedSupplier.phone && <span>{selectedSupplier.phone}</span>}
                  {selectedSupplier.leadTimeDays != null && <span>Lead: {selectedSupplier.leadTimeDays}d</span>}
                  <Link href={`/suppliers/${selectedSupplier.id}`} className="ml-auto flex items-center gap-1 text-blue-600 hover:underline">
                    View <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                </div>
              )}

              {/* Free text fallback */}
              {supplierId === FREE_TEXT && (
                <Input
                  autoFocus
                  value={supplierFreeText}
                  onChange={(e) => setSupplierFreeText(e.target.value)}
                  placeholder="Supplier name (e.g. Acme Supply Co.)"
                  className="h-8 text-sm"
                />
              )}

              {/* Prompt to create a supplier */}
              {!supplierId && (
                <p className="text-[11px] text-muted-foreground">
                  No supplier yet?{" "}
                  <Link href="/suppliers" className="text-blue-600 hover:underline">Create one in Suppliers</Link>, or pick "Enter name manually" above.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Expected Delivery Date (optional)</Label>
                <Input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="h-9 text-sm"
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery instructions, terms, etc."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Line Items</CardTitle>
            <Button variant="outline" size="sm" onClick={addLine} className="h-7 gap-1 text-xs">
              <Plus className="w-3 h-3" /> Add Line
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            <div className="grid grid-cols-[1fr_100px_110px_28px] gap-2 px-0.5">
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Product</span>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Qty</span>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Unit Cost</span>
              <span />
            </div>

            {lines.map((line) => (
              <div key={line.key} className="grid grid-cols-[1fr_100px_110px_28px] gap-2 items-center">
                <Select value={line.productId} onValueChange={(v) => updateLine(line.key, { productId: v })}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {productOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="font-mono text-xs text-muted-foreground mr-2">{p.skuCode}</span>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={line.qtyOrdered}
                  onChange={(e) => updateLine(line.key, { qtyOrdered: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="h-8 text-sm text-right font-mono"
                />
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={line.unitCost}
                    onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                    placeholder="0.00"
                    className="h-8 text-sm text-right font-mono pl-5"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={lines.length === 1}
                  onClick={() => removeLine(line.key)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingCart className="w-3.5 h-3.5" />}
            {isPending ? "Creating…" : "Create Purchase Order"}
          </Button>
          <Button variant="ghost" onClick={() => navigate("/purchase-orders")}>Cancel</Button>
        </div>
      </div>
    </Layout>
  );
}
