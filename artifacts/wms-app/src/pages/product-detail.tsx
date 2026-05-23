import { useState } from "react";
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
import { ArrowLeft, AlertTriangle, Printer, Tag, QrCode } from "lucide-react";
import LabelPrint from "@/components/label-print";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { useBaseCurrency } from "@/hooks/use-base-currency";
import { formatCurrency } from "@/lib/utils";

interface Props {
  params: { id: string };
}

export default function ProductDetail({ params }: Props) {
  const { id } = params;
  const [printOpen, setPrintOpen] = useState(false);
  const baseCurrency = useBaseCurrency();

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
          <div className="flex items-center gap-2">
            {product && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs"
                onClick={() => setPrintOpen(true)}
              >
                <Printer className="w-3.5 h-3.5" />
                Print Labels
              </Button>
            )}
            <Link href="/products">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Products
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-4xl">
        <div className="grid grid-cols-2 gap-6">
          {/* Product Info */}
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
                    [
                      "Unit Price",
                      product?.unitPrice ? formatCurrency(product.unitPrice, baseCurrency) : "—",
                    ],
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

          {/* Stock Summary */}
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

        {/* Label preview card */}
        {product && (
          <Card className="border-border/60">
            <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                Product Label
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setPrintOpen(true)}
              >
                <Printer className="w-3 h-3" /> Print Labels
              </Button>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex items-center gap-8">
                {/* Label visual preview */}
                <div
                  className="border border-dashed border-border/70 rounded-lg bg-white p-3 shrink-0"
                  style={{ width: 260 }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold leading-snug text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-[9px] text-gray-500 mt-0.5">
                        {[product.category, product.unitOfMeasure].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <QRCodeSVG value={product.skuCode} size={42} level="M" className="shrink-0" />
                  </div>
                  {/* Barcode */}
                  <div className="flex justify-center mt-1">
                    <Barcode
                      value={product.skuCode}
                      width={1.1}
                      height={28}
                      fontSize={7}
                      margin={0}
                      displayValue={true}
                      background="transparent"
                      lineColor="#000"
                    />
                  </div>
                  {/* Footer */}
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[7px] text-gray-300 uppercase tracking-widest">WareIQ</span>
                    <span className="text-[7px] text-gray-300 font-mono">{id.slice(0, 8).toUpperCase()}</span>
                  </div>
                </div>

                {/* Info panel */}
                <div className="space-y-3 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground text-xs">QR code encodes</span>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{product.skuCode}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground text-xs">Code 128 barcode</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                    Scan with any barcode reader or mobile scanner. Compatible with standard label printers (100×50mm, Zebra, DYMO, and others).
                  </p>
                  <Button
                    onClick={() => setPrintOpen(true)}
                    className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white text-xs h-8"
                    size="sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Labels…
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Positions */}
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

      {/* Label print dialog */}
      {product && (
        <LabelPrint
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          label={{
            productId: product.id,
            skuCode: product.skuCode,
            productName: product.name,
            category: product.category,
            unitOfMeasure: product.unitOfMeasure,
          }}
        />
      )}
    </Layout>
  );
}
