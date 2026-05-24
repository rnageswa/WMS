import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Package,
  Percent,
  BarChart3,
  ExternalLink,
  CheckSquare,
  Square,
  X,
  Save,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { RoleGate } from "@/components/role-gate";
import { useBaseCurrency } from "@/hooks/use-base-currency";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/export-excel";

interface CostingListItem {
  productId: string;
  skuCode: string;
  name: string;
  category: string | null;
  currentAvgCost: number;
  standardCost: number | null;
  markupTarget: number | null;
  marginFloor: number | null;
  totalQty: number;
  totalInventoryValue: number;
  costVariancePct: number | null;
  isActive: boolean;
}

async function fetchCostingList(): Promise<CostingListItem[]> {
  const res = await fetch("/api/finance/costing", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load costing list");
  return res.json();
}

async function bulkUpdateCosting(updates: { productId: string; standardCost?: number; markupTarget?: number; marginFloor?: number }[]) {
  const res = await fetch("/api/finance/costing/bulk-update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) throw new Error("Bulk update failed");
  return res.json();
}

function FinanceCostingPage() {
  const currency = useBaseCurrency();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [varianceFilter, setVarianceFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkField, setBulkField] = useState<"standardCost" | "markupTarget" | "marginFloor">("standardCost");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["finance-costing-list"],
    queryFn: fetchCostingList,
    refetchInterval: 60_000,
  });

  const formatMoney = (val: number) => formatCurrency(val, currency);

  // Extract unique categories
  const categories = data ? [...new Set(data.filter((p) => p.category).map((p) => p.category!))].sort() : [];

  // Filter data
  const filtered = (data ?? []).filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.skuCode.toLowerCase().includes(q)) return false;
    }
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (varianceFilter === "over" && (p.costVariancePct == null || p.costVariancePct <= 5)) return false;
    if (varianceFilter === "under" && (p.costVariancePct == null || p.costVariancePct >= -5)) return false;
    if (varianceFilter === "no_std" && p.standardCost != null) return false;
    return true;
  });

  // Bulk operations
  const selectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.productId)));
    }
  }, [filtered, selectedIds.size]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedProducts = data?.filter((p) => selectedIds.has(p.productId)) ?? [];

  const handleBulkUpdate = async () => {
    if (!bulkValue || selectedProducts.length === 0) return;
    setBulkUpdating(true);
    const numVal = parseFloat(bulkValue);
    if (isNaN(numVal)) {
      toast({ title: "Invalid value", variant: "destructive" });
      setBulkUpdating(false);
      return;
    }

    const updates = selectedProducts.map((p) => ({
      productId: p.productId,
      [bulkField]: numVal,
    }));

    try {
      const result = await bulkUpdateCosting(updates);
      toast({
        title: `Updated ${result.succeeded} of ${result.total} products`,
        description: result.failed > 0 ? `${result.failed} failed` : undefined,
      });
      setBulkDialogOpen(false);
      setBulkValue("");
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["finance-costing-list"] });
    } catch {
      toast({ title: "Bulk update failed", variant: "destructive" });
    } finally {
      setBulkUpdating(false);
    }
  };

  // Summary stats
  const totalValue = filtered.reduce((s, p) => s + p.totalInventoryValue, 0);
  const avgMarginErosion = filtered.filter((p) => p.costVariancePct != null && p.costVariancePct > 5).length;
  const belowFloor = filtered.filter((p) => p.currentAvgCost > 0).length;

  const handleExportExcel = () => {
    const rows = filtered.map((p) => ({
      SKU: p.skuCode,
      Product: p.name,
      Category: p.category ?? "",
      "Avg Cost (MAC)": p.currentAvgCost.toFixed(4),
      "Std Cost": p.standardCost?.toFixed(2) ?? "",
      "Variance %": p.costVariancePct?.toFixed(1) ?? "",
      "Markup Target %": p.markupTarget ?? "",
      "Margin Floor %": p.marginFloor ?? "",
      "Qty On Hand": p.totalQty,
      "Inventory Value": p.totalInventoryValue.toFixed(2),
    }));
    exportToExcel(rows, "product-costing");
  };

  const bulkFieldLabels = {
    standardCost: "Standard Cost",
    markupTarget: "Markup Target (%)",
    marginFloor: "Margin Floor (%)",
  };

  return (
    <Layout>
      <PageHeader
        title="Product Costing"
        description="Cost analysis across all products — MAC, standard cost variance, and pricing targets"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Costing" },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/finance/reports">
                <BarChart3 className="w-4 h-4 mr-1" />
                Reports
              </Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-6xl">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Products</span>
            </div>
            <p className="text-xl font-bold">{isLoading ? <Skeleton className="h-6 w-12" /> : filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Inventory Value</span>
            </div>
            <p className="text-xl font-bold">{isLoading ? <Skeleton className="h-6 w-20" /> : formatMoney(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Cost &gt;5% Over Std</span>
            </div>
            <p className="text-xl font-bold text-red-600">{isLoading ? <Skeleton className="h-6 w-8" /> : avgMarginErosion}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">With Cost Data</span>
            </div>
            <p className="text-xl font-bold text-green-600">{isLoading ? <Skeleton className="h-6 w-8" /> : belowFloor}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={varianceFilter}
          onChange={(e) => setVarianceFilter(e.target.value)}
        >
          <option value="all">All Variance</option>
          <option value="over">Cost Over 5% Above Std</option>
          <option value="under">Cost Over 5% Below Std</option>
          <option value="no_std">No Standard Cost</option>
        </select>
        {(search || categoryFilter !== "all" || varianceFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCategoryFilter("all"); setVarianceFilter("all"); }}>
            Clear filters
          </Button>
        )}
        {selectedIds.size > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {selectedIds.size} selected
          </span>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No products match the current filters
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="w-10 py-3 px-4 text-center">
                  <Checkbox
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onCheckedChange={selectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium">Product</th>
                <th className="text-right py-3 px-4 font-medium">Avg Cost (MAC)</th>
                <th className="text-right py-3 px-4 font-medium">Std Cost</th>
                <th className="text-right py-3 px-4 font-medium">Variance</th>
                <th className="text-right py-3 px-4 font-medium">Markup Target</th>
                <th className="text-right py-3 px-4 font-medium">Margin Floor</th>
                <th className="text-right py-3 px-4 font-medium">Qty On Hand</th>
                <th className="text-right py-3 px-4 font-medium">Inventory Value</th>
                <th className="text-center py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const varianceColor =
                  p.costVariancePct != null
                    ? p.costVariancePct > 5
                      ? "text-red-600"
                      : p.costVariancePct < -5
                        ? "text-green-600"
                        : "text-muted-foreground"
                    : "text-muted-foreground";
                const isSelected = selectedIds.has(p.productId);

                return (
                  <tr
                    key={p.productId}
                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                  >
                    <td className="py-3 px-4 text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(p.productId)}
                        aria-label={`Select ${p.skuCode}`}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/finance/costing/${p.productId}`} className="hover:text-primary transition-colors">
                        <span className="font-medium">{p.skuCode}</span>
                        <span className="text-muted-foreground ml-2">{p.name}</span>
                      </Link>
                      {p.category && (
                        <Badge variant="secondary" className="ml-2 text-xs">{p.category}</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{formatMoney(p.currentAvgCost)}</td>
                    <td className="py-3 px-4 text-right">{p.standardCost ? formatMoney(p.standardCost) : <span className="text-muted-foreground">—</span>}</td>
                    <td className={`py-3 px-4 text-right font-medium ${varianceColor}`}>
                      {p.costVariancePct != null ? `${p.costVariancePct > 0 ? "+" : ""}${p.costVariancePct.toFixed(1)}%` : "—"}
                      {p.costVariancePct != null && p.costVariancePct > 5 && (
                        <TrendingUp className="w-3 h-3 inline ml-1 text-red-500" />
                      )}
                      {p.costVariancePct != null && p.costVariancePct < -5 && (
                        <TrendingDown className="w-3 h-3 inline ml-1 text-green-500" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">{p.markupTarget != null ? `${p.markupTarget}%` : <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-3 px-4 text-right">{p.marginFloor != null ? `${p.marginFloor}%` : <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-3 px-4 text-right">{p.totalQty.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{formatMoney(p.totalInventoryValue)}</td>
                    <td className="py-3 px-4 text-center">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/finance/costing/${p.productId}`}>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border border-border rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckSquare className="w-4 h-4 text-primary" />
            <span className="font-medium">{selectedIds.size}</span>
            <span className="text-muted-foreground">selected</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setBulkField("standardCost"); setBulkDialogOpen(true); }}
          >
            <DollarSign className="w-3.5 h-3.5 mr-1" />
            Set Std Cost
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setBulkField("markupTarget"); setBulkDialogOpen(true); }}
          >
            <Percent className="w-3.5 h-3.5 mr-1" />
            Set Markup %
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setBulkField("marginFloor"); setBulkDialogOpen(true); }}
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            Set Floor %
          </Button>
          <div className="h-6 w-px bg-border" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Bulk Update Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Update {bulkFieldLabels[bulkField]}</DialogTitle>
            <DialogDescription>
              Update {bulkFieldLabels[bulkField]} for {selectedProducts.length} selected product{selectedProducts.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-40 overflow-y-auto space-y-1">
              {selectedProducts.slice(0, 20).map((p) => (
                <div key={p.productId} className="flex items-center justify-between text-sm py-1">
                  <span className="font-medium">{p.skuCode}</span>
                  <span className="text-muted-foreground text-xs">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {bulkField === "standardCost" ? `current: ${formatMoney(p.currentAvgCost)}` : bulkField === "markupTarget" ? `current: ${p.markupTarget ?? "—"}%` : `current: ${p.marginFloor ?? "—"}%`}
                  </span>
                </div>
              ))}
              {selectedProducts.length > 20 && (
                <p className="text-xs text-muted-foreground text-center py-1">...and {selectedProducts.length - 20} more</p>
              )}
            </div>
            <div>
              <Label>{bulkFieldLabels[bulkField]}</Label>
              <Input
                type="number"
                step="0.01"
                placeholder={bulkField === "standardCost" ? "0.00" : "0"}
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkUpdate} disabled={!bulkValue || bulkUpdating}>
              {bulkUpdating ? (
                <>Updating...</>
              ) : (
                <><Save className="w-4 h-4 mr-1" /> Apply to {selectedProducts.length} Products</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

export default function FinanceCostingPageWithGate() {
  return (
    <RoleGate roles={["admin", "operator"]}>
      <FinanceCostingPage />
    </RoleGate>
  );
}
