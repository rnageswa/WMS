import { useState } from "react";
import {
  useListMovements,
  useListProducts,
} from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

function TypeBadge({ type }: { type: string }) {
  if (type === "inbound")
    return <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1"><ArrowDownRight className="w-3 h-3" />inbound</Badge>;
  if (type === "outbound")
    return <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 gap-1"><ArrowUpRight className="w-3 h-3" />outbound</Badge>;
  return <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 gap-1"><SlidersHorizontal className="w-3 h-3" />adjustment</Badge>;
}

export default function Movements() {
  const [productId, setProductId] = useState("");
  const [movementType, setMovementType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: products } = useListProducts();

  const params: Record<string, string | number> = { limit: 100 };
  if (productId && productId !== "all") params.productId = productId;
  if (movementType && movementType !== "all") params.movementType = movementType;
  if (from) params.from = from;
  if (to) params.to = to;

  const { data: movements, isLoading } = useListMovements(
    Object.keys(params).length > 1 ? params : { limit: 100 }
  );

  const hasFilters = (productId && productId !== "all") || (movementType && movementType !== "all") || from || to;

  const clearFilters = () => {
    setProductId("");
    setMovementType("");
    setFrom("");
    setTo("");
  };

  return (
    <Layout>
      <PageHeader
        title="Movements"
        subtitle="Complete inventory audit trail"
      />

      <div className="p-6 space-y-4">
        <div className="flex gap-3 flex-wrap items-end">
          <Select
            value={productId || "all"}
            onValueChange={(v) => setProductId(v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-52" data-testid="select-product">
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {products?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.skuCode} — {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={movementType || "all"}
            onValueChange={(v) => setMovementType(v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-36" data-testid="select-type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">From</p>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-36"
              data-testid="input-from"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">To</p>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-36"
              data-testid="input-to"
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear">
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="border border-border/60 rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Type</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Product</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Location</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">Quantity</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Reason</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !movements?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No movements found.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => {
                  const product = (m as any).product;
                  const bin = (m as any).bin;
                  return (
                    <TableRow key={m.id} data-testid={`movement-row-${m.id}`} className="hover:bg-muted/30">
                      <TableCell><TypeBadge type={m.movementType} /></TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{product?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{product?.skuCode}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {bin?.zone?.warehouse?.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {bin?.zone?.code} / {bin?.code}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`tabular-nums font-semibold text-sm ${m.quantity > 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {m.quantity > 0 ? "+" : ""}{m.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {m.reasonCode ?? "—"}
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(m.createdAt), "MMM d, yyyy HH:mm")}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {movements && (
          <p className="text-xs text-muted-foreground text-right">
            {movements.length} record{movements.length !== 1 ? "s" : ""} shown
          </p>
        )}
      </div>
    </Layout>
  );
}
