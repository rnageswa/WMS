import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useCreatePoTemplate,
  useListSuppliers,
  useListInventory,
  getListInventoryQueryKey,
  getListPoTemplatesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  Plus,
  Trash2,
  Loader2,
  Copy,
  Truck,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

interface LineForm {
  key: number;
  productId: string;
  defaultQty: number;
  defaultUnitCost: string;
}

let lineKey = 0;
const FREE_TEXT = "__free_text__";

export default function PoTemplateNewPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierFreeText, setSupplierFreeText] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineForm[]>([
    { key: lineKey++, productId: "", defaultQty: 1, defaultUnitCost: "" },
  ]);

  const { data: suppliers = [] } = useListSuppliers({ isActive: true });
  const { data: inventoryItems = [] } = useListInventory(
    { productId: undefined, binId: undefined, warehouseId: undefined, lowStock: false },
    { query: { queryKey: getListInventoryQueryKey() } }
  );

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

  const { mutate: createTemplate, isPending } = useCreatePoTemplate({
    mutation: {
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: getListPoTemplatesQueryKey() });
        toast({ title: `Template "${data.name}" saved` });
        navigate(`/purchase-orders/templates/${data.id}`);
      },
      onError: () => {
        toast({ title: "Failed to save template", variant: "destructive" });
      },
    },
  });

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { key: lineKey++, productId: "", defaultQty: 1, defaultUnitCost: "" },
    ]);
  const removeLine = (key: number) =>
    setLines((prev) => prev.filter((l) => l.key !== key));
  const updateLine = (key: number, patch: Partial<LineForm>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const resolvedSupplierId =
    supplierId && supplierId !== FREE_TEXT ? supplierId : null;
  const resolvedSupplierName =
    supplierId === FREE_TEXT ? supplierFreeText.trim() : "";
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const canSubmit =
    name.trim().length > 0 &&
    lines.every((l) => l.productId && l.defaultQty >= 1);

  const handleSubmit = () => {
    if (!canSubmit) return;
    createTemplate({
      data: {
        name: name.trim(),
        supplierId: resolvedSupplierId ?? undefined,
        supplierName: resolvedSupplierName || undefined,
        notes: notes.trim() || undefined,
        lines: lines.map((l) => ({
          productId: l.productId,
          defaultQty: l.defaultQty,
          defaultUnitCost: l.defaultUnitCost
            ? parseFloat(l.defaultUnitCost)
            : undefined,
        })),
      },
    });
  };

  return (
    <Layout>
      <PageHeader
        title="New PO Template"
        subtitle="Save a supplier and product list to create repeat orders in one click"
        action={
          <Link href="/purchase-orders/templates">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Templates
            </Button>
          </Link>
        }
      />

      <div className="p-6 max-w-3xl space-y-5">
        {/* Header fields */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Copy className="w-4 h-4 text-muted-foreground" />
              Template Details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            {/* Template name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Template Name *
              </Label>
              <Input
                placeholder="e.g. Monthly Packaging Restock"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Supplier */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Supplier</Label>
              <Select
                value={supplierId}
                onValueChange={(v) => {
                  setSupplierId(v);
                  setSupplierFreeText("");
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select a supplier (optional)…" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <Truck className="w-3 h-3 text-muted-foreground shrink-0" />
                        {s.name}
                        {s.leadTimeDays != null && (
                          <span className="text-[10px] text-muted-foreground">
                            ({s.leadTimeDays}d lead)
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value={FREE_TEXT}>
                    <span className="text-muted-foreground italic">
                      + Enter name manually…
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {supplierId === FREE_TEXT && (
                <Input
                  placeholder="Supplier name"
                  value={supplierFreeText}
                  onChange={(e) => setSupplierFreeText(e.target.value)}
                  className="h-9 text-sm"
                />
              )}
              {selectedSupplier && (
                <div className="flex items-center gap-3 px-3 py-2 bg-muted/40 rounded-md text-xs text-muted-foreground border border-border/40">
                  {selectedSupplier.email && (
                    <span>{selectedSupplier.email}</span>
                  )}
                  {selectedSupplier.leadTimeDays != null && (
                    <span>Lead: {selectedSupplier.leadTimeDays}d</span>
                  )}
                  <Link
                    href={`/suppliers/${selectedSupplier.id}`}
                    className="ml-auto flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    View <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                placeholder="Standing instructions, delivery notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-sm min-h-[72px] resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Truck className="w-4 h-4 text-muted-foreground" />
              Default Line Items
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({lines.length})
              </span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={addLine} className="gap-1 text-xs h-7">
              <Plus className="w-3 h-3" /> Add Line
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            {lines.map((line, idx) => (
              <div key={line.key} className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  {idx === 0 && (
                    <Label className="text-xs text-muted-foreground">Product *</Label>
                  )}
                  <Select
                    value={line.productId}
                    onValueChange={(v) => updateLine(line.key, { productId: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select product…" />
                    </SelectTrigger>
                    <SelectContent>
                      {productOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2 font-mono text-xs">
                            {p.skuCode}
                            <span className="font-sans text-sm text-foreground">{p.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1.5 shrink-0">
                  {idx === 0 && (
                    <Label className="text-xs text-muted-foreground">Default Qty *</Label>
                  )}
                  <Input
                    type="number"
                    min={1}
                    value={line.defaultQty}
                    onChange={(e) =>
                      updateLine(line.key, {
                        defaultQty: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="h-9 text-sm text-right"
                  />
                </div>
                <div className="w-28 space-y-1.5 shrink-0">
                  {idx === 0 && (
                    <Label className="text-xs text-muted-foreground">
                      Unit Cost
                    </Label>
                  )}
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={line.defaultUnitCost}
                      onChange={(e) =>
                        updateLine(line.key, { defaultUnitCost: e.target.value })
                      }
                      className="h-9 text-sm pl-5"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-red-600 hover:bg-red-50 shrink-0"
                  disabled={lines.length === 1}
                  onClick={() => removeLine(line.key)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" asChild>
            <Link href="/purchase-orders/templates">Cancel</Link>
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit || isPending}
            onClick={handleSubmit}
            className="bg-[#E8622A] hover:bg-[#E8622A]/90 text-white gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Save Template
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
