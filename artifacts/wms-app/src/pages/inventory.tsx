import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListInventory,
  useListWarehouses,
  getListInventoryQueryKey,
} from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SlidersHorizontal, AlertTriangle, FileSpreadsheet, CheckSquare, X, Trash2, WifiOff } from "lucide-react";
import { exportToExcel } from "@/lib/export-excel";
import { useToast } from "@/hooks/use-toast";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { offlineFetch } from "@/lib/offline";

export default function Inventory() {
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [lowStock, setLowStock] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAdjustOpen, setBulkAdjustOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();

  const { data: warehouses } = useListWarehouses();

  const params: Record<string, string | boolean> = {};
  if (warehouseId && warehouseId !== "all") params.warehouseId = warehouseId;
  if (lowStock) params.lowStock = true;

  const { data: inventory, isLoading } = useListInventory(
    Object.keys(params).length > 0 ? params : undefined
  );

  const filtered = inventory?.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = ((item as any).product?.name ?? "").toLowerCase();
    const sku = ((item as any).product?.skuCode ?? "").toLowerCase();
    return name.includes(q) || sku.includes(q);
  });

  // Selection helpers
  const selectableIds = filtered?.map((item) => item.id) ?? [];
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableIds));
    }
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAdjust = async () => {
    if (!bulkReason.trim()) return;
    const items = filtered
      ?.filter((item) => selected.has(item.id))
      .map((item) => ({
        productId: (item as any).product?.id ?? "",
        binId: (item as any).bin?.id ?? "",
        newQty: 0, // Set to zero as bulk action
      }))
      .filter((i) => i.productId && i.binId);

    if (!items?.length) return;

    try {
      const data = await offlineFetch<{ adjusted: number }>("/api/inventory/adjust/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, reasonCode: bulkReason }),
        entityType: "inventory-adjust",
        entityId: "bulk",
        invalidateKeys: ["inventory"],
      });
      if ((data as any)?.queued) {
        toast({ title: "Saved offline", description: "Bulk adjust will sync when connection is restored." });
      } else {
        toast({ title: `Adjusted ${data.adjusted} items to 0` });
      }
      qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
      setSelected(new Set());
      setBulkAdjustOpen(false);
      setBulkReason("");
    } catch {
      toast({ title: "Failed to adjust inventory", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Inventory"
        subtitle="Bin-level stock positions"
        helpKey="/inventory"
        action={
          <Link href="/inventory/adjust">
            <Button size="sm" data-testid="button-adjust">
              <SlidersHorizontal className="w-4 h-4 mr-1.5" />
              Adjust Stock
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Input
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <Select
            value={warehouseId || "all"}
            onValueChange={(v) => setWarehouseId(v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-48" data-testid="select-warehouse">
              <SelectValue placeholder="All warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {warehouses?.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={lowStock ? "default" : "outline"}
            size="sm"
            onClick={() => setLowStock((v) => !v)}
            data-testid="button-low-stock"
            className={lowStock ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
          >
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            Low Stock
          </Button>
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              disabled={!filtered?.length}
              onClick={() => {
                if (!filtered?.length) return;
                const rows = filtered.map((item) => ({
                  SKU: (item as any).product?.skuCode ?? "",
                  Product: (item as any).product?.name ?? "",
                  Warehouse: (item as any).bin?.zone?.warehouse?.name ?? "",
                  Zone: (item as any).bin?.zone?.name ?? "",
                  Bin: (item as any).bin?.code ?? "",
                  "Qty On Hand": item.qtyOnHand ?? 0,
                  "Reorder Threshold": (item as any).product?.reorderThreshold ?? 0,
                  "Avg Cost": (item as any).avgCost ?? "",
                }));
                exportToExcel(rows, "inventory");
              }}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel
            </Button>
          </div>
        </div>

        <div className="border border-border/60 rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">SKU</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Product</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Warehouse</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Zone</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Bin</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">Qty on Hand</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">Reorder At</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Alert</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(9)].map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !filtered?.length ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    No inventory records found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const product = (item as any).product;
                  const bin = (item as any).bin;
                  const isLow = item.qtyOnHand <= product?.reorderThreshold;
                  const isSelected = selected.has(item.id);
                  return (
                    <TableRow
                      key={item.id}
                      data-testid={`inv-row-${item.id}`}
                      className={isSelected ? "bg-orange-50/60" : ""}
                    >
                      <TableCell className="pl-4 w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRow(item.id)}
                          aria-label={`Select ${product?.skuCode}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {product?.skuCode}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        <Link href={`/products/${product?.id}`} className="hover:underline">
                          {product?.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {bin?.zone?.warehouse?.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {bin?.zone?.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{bin?.code}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-foreground">
                        {item.qtyOnHand}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground text-sm">
                        {product?.reorderThreshold}
                      </TableCell>
                      <TableCell>
                        {isLow && (
                          <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
                            Low
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-gray-900 text-white rounded-xl shadow-2xl border border-white/10">
          <div className="flex items-center gap-2 pr-3 border-r border-white/20">
            <CheckSquare className="w-4 h-4 text-white/70" />
            <span className="text-sm font-medium">{selected.size} selected</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-amber-300 hover:text-amber-200 hover:bg-white/10 text-xs"
            onClick={() => setBulkAdjustOpen(true)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Bulk Adjust to 0
          </Button>

          {!isOnline && (
            <span className="flex items-center gap-1 text-xs text-amber-300">
              <WifiOff className="w-3.5 h-3.5" />
              Queued for sync
            </span>
          )}

          <button
            onClick={() => setSelected(new Set())}
            className="ml-1 text-white/50 hover:text-white transition-colors"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bulk adjust confirmation */}
      <AlertDialog open={bulkAdjustOpen} onOpenChange={setBulkAdjustOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Adjust {selected.size} Items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the quantity of {selected.size} selected item{selected.size !== 1 ? "s" : ""} to 0.
              <div className="mt-3">
                <label className="text-xs font-medium text-foreground">Reason Code *</label>
                <Input
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="e.g., cycle_count_correction, damage_writeoff"
                  className="mt-1"
                />
              </div>
              <br />
              <span className="font-medium text-foreground">This creates adjustment movements for each item.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!bulkReason.trim()}
              onClick={handleBulkAdjust}
            >
              Adjust {selected.size} Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
