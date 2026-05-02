import { Link } from "wouter";
import {
  useGetProduct,
  useListInventory,
  getGetProductQueryKey,
  getListInventoryQueryKey,
} from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, AlertTriangle } from "lucide-react";

interface Props {
  params: { id: string };
}

export default function ProductDetail({ params }: Props) {
  const { id } = params;

  const { data: product, isLoading: loadingProduct } = useGetProduct(id, {
    query: { enabled: !!id, queryKey: getGetProductQueryKey(id) },
  });

  const { data: inventory, isLoading: loadingInventory } = useListInventory(
    { productId: id },
    {
      query: {
        enabled: !!id,
        queryKey: getListInventoryQueryKey({ productId: id }),
      },
    }
  );

  const totalQty = inventory?.reduce((sum, i) => sum + i.qtyOnHand, 0) ?? 0;
  const isLowStock = product && totalQty <= product.reorderThreshold;

  return (
    <Layout>
      <PageHeader
        title={product?.name ?? "Product Detail"}
        subtitle={product?.skuCode}
        action={
          <Link href="/products">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Products
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-6 max-w-4xl">
        <div className="grid grid-cols-2 gap-6">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Product Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingProduct ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))}
                </div>
              ) : (
                <dl className="space-y-2.5">
                  {[
                    ["SKU Code", <span className="font-mono text-xs">{product?.skuCode}</span>],
                    ["Category", product?.category ?? "—"],
                    ["Unit of Measure", product?.unitOfMeasure],
                    ["Unit Price", product?.unitPrice ? `$${product.unitPrice}` : "—"],
                    ["Reorder Threshold", product?.reorderThreshold],
                    ["Status", product?.isActive ? (
                      <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                    )],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground">{value as React.ReactNode}</span>
                    </div>
                  ))}
                </dl>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Stock Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingInventory || loadingProduct ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="text-center py-4">
                  <p className="text-5xl font-bold tabular-nums text-foreground">{totalQty}</p>
                  <p className="text-sm text-muted-foreground mt-1">total units on hand</p>
                  {isLowStock && (
                    <div className="mt-3 flex items-center justify-center gap-1.5 text-amber-600 text-xs font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Below reorder threshold ({product?.reorderThreshold})
                    </div>
                  )}
                  <Link href={`/inventory/adjust?productId=${id}`}>
                    <Button size="sm" variant="outline" className="mt-4">
                      Adjust Stock
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Inventory Positions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Warehouse</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Zone</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Bin</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Qty on Hand</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingInventory ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(4)].map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !inventory?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                      No inventory positions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map((item) => (
                    <TableRow key={item.id} data-testid={`inv-row-${item.id}`}>
                      <TableCell className="text-sm">{(item as any).bin?.zone?.warehouse?.name}</TableCell>
                      <TableCell className="text-sm">{(item as any).bin?.zone?.name}</TableCell>
                      <TableCell className="font-mono text-xs">{(item as any).bin?.code}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{item.qtyOnHand}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
