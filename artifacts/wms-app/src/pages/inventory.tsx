import { useState } from "react";
import { Link } from "wouter";
import {
  useListInventory,
  useListWarehouses,
} from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { SlidersHorizontal, AlertTriangle } from "lucide-react";

export default function Inventory() {
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [lowStock, setLowStock] = useState(false);
  const [search, setSearch] = useState("");

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
        </div>

        <div className="border border-border/60 rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
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
                    {[...Array(8)].map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !filtered?.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No inventory records found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const product = (item as any).product;
                  const bin = (item as any).bin;
                  const isLow = item.qtyOnHand <= product?.reorderThreshold;
                  return (
                    <TableRow key={item.id} data-testid={`inv-row-${item.id}`}>
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
    </Layout>
  );
}
