import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetReorderSuggestions,
  useCreatePurchaseOrder,
} from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  ArrowLeft,
  Truck,
  PackagePlus,
  Zap,
  CheckCircle,
  AlertTriangle,
  ShoppingCart,
  Clock,
  HelpCircle,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface SuggestionItem {
  productId: string;
  skuCode: string;
  name: string;
  category: string | null;
  currentQty: number;
  reorderThreshold: number;
  deficit: number;
  suggestedQty: number;
  lastUnitCost: number | null;
  lastPoDate: string | null;
}

interface SuggestionGroup {
  supplierId: string | null;
  supplierName: string | null;
  lastPoDate: string | null;
  items: SuggestionItem[];
}

// State per item: selected + editable qty
interface ItemState {
  selected: boolean;
  qty: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

function groupKey(g: SuggestionGroup) {
  return g.supplierId ?? g.supplierName ?? "__none__";
}

// ── Per-group card ────────────────────────────────────────────────────────────

function SupplierGroupCard({
  group,
  itemStates,
  onToggleItem,
  onToggleAll,
  onQtyChange,
  onCreatePo,
  creating,
}: {
  group: SuggestionGroup;
  itemStates: Map<string, ItemState>;
  onToggleItem: (productId: string) => void;
  onToggleAll: (selected: boolean) => void;
  onQtyChange: (productId: string, qty: number) => void;
  onCreatePo: () => void;
  creating: boolean;
}) {
  const selectedItems = group.items.filter((item) => itemStates.get(item.productId)?.selected);
  const allSelected = selectedItems.length === group.items.length;
  const someSelected = selectedItems.length > 0;
  const hasSupplier = !!(group.supplierId || group.supplierName);

  const totalEstCost = selectedItems.reduce((sum, item) => {
    const qty = itemStates.get(item.productId)?.qty ?? item.suggestedQty;
    const cost = item.lastUnitCost ?? 0;
    return sum + qty * cost;
  }, 0);

  const supplierLabel = group.supplierName ?? "Unknown Supplier";

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${hasSupplier ? "bg-[#E8622A]/10" : "bg-muted"}`}>
            {hasSupplier
              ? <Truck className="w-4 h-4 text-[#E8622A]" />
              : <HelpCircle className="w-4 h-4 text-muted-foreground" />
            }
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">
              {hasSupplier ? supplierLabel : "No supplier history"}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {group.items.length} item{group.items.length !== 1 ? "s" : ""} below threshold
              {group.lastPoDate && (
                <> · Last order {new Date(group.lastPoDate + "T00:00:00").toLocaleDateString()}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalEstCost > 0 && someSelected && (
            <span className="text-xs text-muted-foreground">
              Est. {fmtCurrency(totalEstCost)}
            </span>
          )}
          {hasSupplier ? (
            <Button
              size="sm"
              disabled={!someSelected || creating}
              onClick={onCreatePo}
              className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white h-8 text-xs"
            >
              {creating ? (
                <><Clock className="w-3.5 h-3.5 animate-spin" /> Creating…</>
              ) : (
                <><ShoppingCart className="w-3.5 h-3.5" /> Create Draft PO ({selectedItems.length})</>
              )}
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild className="h-8 text-xs gap-1.5">
              <Link href="/purchase-orders/new">
                <ShoppingCart className="w-3.5 h-3.5" />
                New PO manually
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 pb-1">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10 pl-5">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => onToggleAll(!!v)}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Product</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">In Stock</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Threshold</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Deficit</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right pr-5">Order Qty</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Last Cost</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right pr-5">Est. Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.items.map((item) => {
              const state = itemStates.get(item.productId) ?? { selected: true, qty: item.suggestedQty };
              const lineTotal = state.qty * (item.lastUnitCost ?? 0);
              return (
                <TableRow
                  key={item.productId}
                  className={`hover:bg-muted/20 ${!state.selected ? "opacity-50" : ""}`}
                >
                  <TableCell className="pl-5">
                    <Checkbox
                      checked={state.selected}
                      onCheckedChange={() => onToggleItem(item.productId)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <Link href={`/products/${item.productId}`}>
                        <span className="text-sm font-medium hover:text-[#E8622A] cursor-pointer">{item.name}</span>
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <code className="text-[10px] text-muted-foreground font-mono">{item.skuCode}</code>
                        {item.category && (
                          <span className="text-[10px] text-muted-foreground">· {item.category}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={`text-sm font-bold ${item.currentQty === 0 ? "text-red-600" : "text-amber-600"}`}>
                      {item.currentQty}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                    {item.reorderThreshold}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 text-[10px] font-bold">
                      -{item.deficit}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-5">
                    <Input
                      type="number"
                      min={1}
                      value={state.qty}
                      onChange={(e) => onQtyChange(item.productId, Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-7 w-20 text-xs text-right ml-auto"
                      disabled={!state.selected}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                    {item.lastUnitCost !== null ? fmtCurrency(item.lastUnitCost) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs font-medium pr-5">
                    {item.lastUnitCost !== null && state.qty > 0 ? fmtCurrency(lineTotal) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReorderSuggestionsPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data, isLoading } = useGetReorderSuggestions();
  const suggestions = data as { generatedAt: string; totalItems: number; groups: SuggestionGroup[] } | undefined;
  const groups = suggestions?.groups ?? [];

  // Per-group item state: Map<groupKey, Map<productId, ItemState>>
  const [groupStates, setGroupStates] = useState<Map<string, Map<string, ItemState>>>(new Map());
  const [creatingGroup, setCreatingGroup] = useState<string | null>(null);

  const { mutate: createPo } = useCreatePurchaseOrder({
    mutation: {
      onSuccess: (data, _, context: any) => {
        toast({ title: `Draft PO ${data.poNumber} created` });
        navigate(`/purchase-orders/${data.id}`);
      },
      onError: () => {
        setCreatingGroup(null);
        toast({ title: "Failed to create PO", variant: "destructive" });
      },
    },
  });

  // Initialise group state lazily
  function getGroupItemStates(group: SuggestionGroup): Map<string, ItemState> {
    const key = groupKey(group);
    if (!groupStates.has(key)) {
      const m = new Map<string, ItemState>();
      for (const item of group.items) {
        m.set(item.productId, { selected: true, qty: item.suggestedQty });
      }
      // Store lazily (will trigger re-render only when state is mutated via setGroupStates)
      return m;
    }
    return groupStates.get(key)!;
  }

  function mutateGroupState(
    group: SuggestionGroup,
    updater: (m: Map<string, ItemState>) => Map<string, ItemState>
  ) {
    const key = groupKey(group);
    setGroupStates((prev) => {
      const next = new Map(prev);
      const current = prev.get(key) ?? (() => {
        const m = new Map<string, ItemState>();
        for (const item of group.items) {
          m.set(item.productId, { selected: true, qty: item.suggestedQty });
        }
        return m;
      })();
      next.set(key, updater(new Map(current)));
      return next;
    });
  }

  function handleToggleItem(group: SuggestionGroup, productId: string) {
    mutateGroupState(group, (m) => {
      const cur = m.get(productId)!;
      m.set(productId, { ...cur, selected: !cur.selected });
      return m;
    });
  }

  function handleToggleAll(group: SuggestionGroup, selected: boolean) {
    mutateGroupState(group, (m) => {
      for (const item of group.items) {
        const cur = m.get(item.productId) ?? { selected: true, qty: item.suggestedQty };
        m.set(item.productId, { ...cur, selected });
      }
      return m;
    });
  }

  function handleQtyChange(group: SuggestionGroup, productId: string, qty: number) {
    mutateGroupState(group, (m) => {
      const cur = m.get(productId)!;
      m.set(productId, { ...cur, qty });
      return m;
    });
  }

  function handleCreatePo(group: SuggestionGroup) {
    const states = getGroupItemStates(group);
    const selectedItems = group.items.filter((item) => states.get(item.productId)?.selected !== false);
    if (selectedItems.length === 0) return;

    const key = groupKey(group);
    setCreatingGroup(key);

    createPo({
      data: {
        supplierId: group.supplierId ?? undefined,
        supplierName: group.supplierName && !group.supplierId ? group.supplierName : undefined,
        lines: selectedItems.map((item) => ({
          productId: item.productId,
          qtyOrdered: states.get(item.productId)?.qty ?? item.suggestedQty,
          unitCost: item.lastUnitCost ?? undefined,
        })),
      },
    });
  }

  const totalSelected = groups.reduce((sum, group) => {
    const states = getGroupItemStates(group);
    return sum + group.items.filter((item) => states.get(item.productId)?.selected !== false).length;
  }, 0);

  return (
    <Layout>
      <PageHeader
        title="Reorder Suggestions"
        subtitle={
          isLoading
            ? "Loading…"
            : suggestions?.totalItems
            ? `${suggestions.totalItems} item${suggestions.totalItems !== 1 ? "s" : ""} below reorder threshold`
            : "All stock levels are healthy"
        }
        action={
          <Link href="/purchase-orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Purchase Orders
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-5 max-w-5xl">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <Card className="border-border/60 border-emerald-200 bg-emerald-50/20">
            <CardContent className="px-5 py-12 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">All products are well-stocked</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                No products are currently below their reorder threshold.
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/purchase-orders/new">Create a PO manually</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary banner */}
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-amber-800 font-medium">
                {suggestions!.totalItems} item{suggestions!.totalItems !== 1 ? "s" : ""} need restocking
              </span>
              <span className="text-amber-700">·</span>
              <span className="text-amber-700 text-xs">
                Grouped by last-used supplier. Adjust quantities before creating POs.
              </span>
              <span className="ml-auto text-xs text-amber-700 font-medium">
                {totalSelected} item{totalSelected !== 1 ? "s" : ""} selected
              </span>
            </div>

            {/* Groups */}
            {groups.map((group) => {
              const key = groupKey(group);
              const states = getGroupItemStates(group);
              return (
                <SupplierGroupCard
                  key={key}
                  group={group}
                  itemStates={states}
                  onToggleItem={(productId) => handleToggleItem(group, productId)}
                  onToggleAll={(selected) => handleToggleAll(group, selected)}
                  onQtyChange={(productId, qty) => handleQtyChange(group, productId, qty)}
                  onCreatePo={() => handleCreatePo(group)}
                  creating={creatingGroup === key}
                />
              );
            })}

            {/* Help note */}
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 px-1">
              <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#E8622A]" />
              Suggested quantities are calculated as <strong>2× reorder threshold − current stock</strong> to build a healthy buffer.
              Unit costs are pre-filled from the most recent purchase order for each product.
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}
