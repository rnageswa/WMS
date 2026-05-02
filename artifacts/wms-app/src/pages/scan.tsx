import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useScanLookup, getScanLookupQueryKey } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Input } from "@/components/ui/input";
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
import {
  Scan,
  Package,
  Grid3X3,
  AlertTriangle,
  SearchX,
  Keyboard,
} from "lucide-react";

export default function ScanPage() {
  const [query, setQuery] = useState("");
  const [committed, setCommitted] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focus on "/" key press anywhere on the page
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { data, isLoading, isFetching } = useScanLookup(
    { q: committed },
    {
      query: {
        enabled: committed.length > 0,
        queryKey: getScanLookupQueryKey({ q: committed }),
      },
    }
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      setCommitted(query.trim());
    }
  };

  const totalQty =
    data?.matchType === "product"
      ? data.inventory.reduce((s, i) => s + i.qtyOnHand, 0)
      : data?.matchType === "bin"
      ? data.bins.flatMap((b) => b.inventory).reduce((s, i) => s + i.qtyOnHand, 0)
      : 0;

  const isLow =
    data?.matchType === "product" &&
    data.product &&
    totalQty <= data.product.reorderThreshold;

  return (
    <Layout>
      <PageHeader
        title="Scan Lookup"
        subtitle="Resolve a bin code, SKU, or barcode to live inventory"
      />

      <div className="p-6 max-w-3xl space-y-6">
        {/* Input */}
        <div className="relative">
          <Scan className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter bin code (B-01), SKU (SKU-1001), or barcode — press Enter"
            className="pl-11 pr-24 h-12 text-base font-mono"
            data-testid="input-scan"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Keyboard className="w-2.5 h-2.5" />
              Enter
            </kbd>
          </div>
        </div>

        <p className="text-xs text-muted-foreground -mt-2">
          Press <kbd className="px-1 py-0.5 rounded border border-border bg-muted text-[10px]">/</kbd> anywhere to focus the search bar.
        </p>

        {/* Loading */}
        {(isLoading || isFetching) && committed && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {/* No match */}
        {data?.matchType === "none" && !isFetching && (
          <Card className="border-border/60">
            <CardContent className="py-12 text-center">
              <SearchX className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">No match found</p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-mono">{data.query}</span> did not match any bin code, SKU, or barcode.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Product match */}
        {data?.matchType === "product" && data.product && !isFetching && (
          <div className="space-y-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {data.product.name}
                    </CardTitle>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      {data.product.skuCode}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold tabular-nums text-foreground">{totalQty}</p>
                  <p className="text-xs text-muted-foreground">total on hand</p>
                  {isLow && (
                    <div className="flex items-center gap-1 justify-end mt-1 text-amber-600 text-[11px] font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      Below reorder ({data.product.reorderThreshold})
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{data.product.category ?? "—"}</span>
                  <span>·</span>
                  <span>{data.product.unitOfMeasure}</span>
                  {data.product.unitPrice && (
                    <>
                      <span>·</span>
                      <span>${data.product.unitPrice}</span>
                    </>
                  )}
                  <span>·</span>
                  <Link href={`/products/${data.product.id}`} className="text-primary hover:underline">
                    View product
                  </Link>
                </div>
              </CardContent>
            </Card>

            {data.inventory.length > 0 && (
              <Card className="border-border/60">
                <CardHeader className="pb-3 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold">Inventory Positions</CardTitle>
                </CardHeader>
                <CardContent className="p-0 pb-1">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Warehouse</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Zone</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Bin</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.inventory.map((item) => (
                        <TableRow key={item.id} data-testid={`scan-inv-${item.id}`}>
                          <TableCell className="text-sm">{(item as any).bin?.zone?.warehouse?.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(item as any).bin?.zone?.name}</TableCell>
                          <TableCell className="font-mono text-xs">{(item as any).bin?.code}</TableCell>
                          <TableCell className="text-right font-bold tabular-nums">{item.qtyOnHand}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {data.inventory.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-4">
                No inventory positions for this product.
              </p>
            )}
          </div>
        )}

        {/* Bin match */}
        {data?.matchType === "bin" && data.bins.length > 0 && !isFetching && (
          <div className="space-y-4">
            {data.bins.map((bin) => (
              <Card key={bin.id} className="border-border/60">
                <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-center gap-2.5 space-y-0">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Grid3X3 className="w-4.5 h-4.5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold font-mono">{bin.code}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(bin as any).zone?.warehouse?.name} &rsaquo; {(bin as any).zone?.name}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-2xl font-bold tabular-nums">
                      {bin.inventory.reduce((s, i) => s + i.qtyOnHand, 0)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">total units</p>
                  </div>
                </CardHeader>
                <CardContent className="p-0 pb-1">
                  {bin.inventory.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-muted-foreground">Bin is empty</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">SKU</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Product</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Qty</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Alert</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bin.inventory.map((item) => {
                          const low = item.qtyOnHand <= (item.product as any).reorderThreshold;
                          return (
                            <TableRow key={item.id} data-testid={`scan-bin-inv-${item.id}`}>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {(item as any).product?.skuCode}
                              </TableCell>
                              <TableCell className="text-sm">
                                <Link href={`/products/${(item as any).product?.id}`} className="hover:underline font-medium">
                                  {(item as any).product?.name}
                                </Link>
                              </TableCell>
                              <TableCell className="text-right font-bold tabular-nums">{item.qtyOnHand}</TableCell>
                              <TableCell>
                                {low && (
                                  <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
                                    Low
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state when nothing committed yet */}
        {!committed && (
          <div className="text-center py-12 text-muted-foreground">
            <Scan className="w-12 h-12 mx-auto opacity-20 mb-4" />
            <p className="text-sm">
              Type a bin code, SKU, or product barcode above and press Enter.
            </p>
            <p className="text-xs mt-2 opacity-70">
              Works with handheld barcode scanners — just point and scan.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
