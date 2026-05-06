import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetSalesOrders, useGetSalesOrder, useUpdateSalesOrderLinePick, useCompletePickingSalesOrder } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Truck, Package, Search, Barcode, XCircle, Printer, ClipboardList, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import LabelPrint from "@/components/label-print";
import type { LabelData } from "@/components/label-print";

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  picking: "bg-amber-100 text-amber-700",
  picked: "bg-blue-100 text-blue-700",
  packed: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
};

export default function PickerPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Read orderId from query string
  const params = new URLSearchParams(location.split("?")[1]);
  const urlOrderId = params.get("orderId") || "";

  const [selectedOrderId, setSelectedOrderId] = useState<string>(urlOrderId);
  const [scanInput, setScanInput] = useState("");
  const [qtyInput, setQtyInput] = useState("1");
  const [lastScan, setLastScan] = useState<{ type: string; message: string } | null>(null);
  const [labelPrintOpen, setLabelPrintOpen] = useState(false);

  const { data: pickingOrders = [], isLoading } = useGetSalesOrders({
    status: "picking",
  });

  const { data: order, refetch: refetchOrder } = useGetSalesOrder(
    { pathParams: { id: selectedOrderId } },
    { query: { enabled: !!selectedOrderId } }
  );

  const updatePickMutation = useUpdateSalesOrderLinePick();
  const completePickingMutation = useCompletePickingSalesOrder();

  const lines = (order as any)?.lines || [];

  const labelData: LabelData[] = lines.map((l: any) => ({
    productId: l.productId,
    skuCode: l.skuCode || "",
    productName: l.productName || "",
  }));

  // React to URL changes (back/forward, programmatic nav)
  useEffect(() => {
    if (urlOrderId && urlOrderId !== selectedOrderId) {
      setSelectedOrderId(urlOrderId);
      setLastScan(null);
    }
  }, [urlOrderId]);

  const handleScan = useCallback(async () => {
    if (!scanInput.trim() || !selectedOrderId) return;

    const scanned = scanInput.trim();
    setScanInput("");
    const qty = parseInt(qtyInput) || 1;

    // Find matching line by SKU code or bin code
    const matchingLine = lines.find((l: any) => {
      const sku = (l.skuCode || "").toLowerCase();
      const binCode = (l.binCode || "").toLowerCase();
      const input = scanned.toLowerCase();
      return sku === input || binCode === input;
    });

    if (!matchingLine) {
      setLastScan({ type: "error", message: `No match found for: ${scanned}` });
      toast({ title: "No match", description: `No pick line matches "${scanned}"`, variant: "destructive" });
      return;
    }

    if (matchingLine.status === "picked") {
      setLastScan({ type: "info", message: `Already picked: ${matchingLine.skuCode}` });
      toast({ title: "Already picked", description: `${matchingLine.skuCode} was already confirmed.` });
      return;
    }

    const newQty = Math.min(matchingLine.qtyPicked + qty, matchingLine.qtyOrdered);
    if (newQty <= matchingLine.qtyPicked) {
      setLastScan({ type: "info", message: `Qty already met for: ${matchingLine.skuCode}` });
      return;
    }

    try {
      await updatePickMutation.mutateAsync({
        pathParams: { id: selectedOrderId!, lineId: matchingLine.id },
        body: { qtyPicked: newQty },
      });
      const label = qty > 1 ? `${qty} units` : `1 unit`;
      setLastScan({ type: "success", message: `Picked: ${matchingLine.skuCode} (${newQty}/${matchingLine.qtyOrdered})` });
      toast({ title: "Pick confirmed", description: `${label} of ${matchingLine.skuCode} confirmed.` });
      refetchOrder();
    } catch (err: any) {
      setLastScan({ type: "error", message: `Failed: ${err.message}` });
    }
  }, [scanInput, qtyInput, selectedOrderId, lines, updatePickMutation, refetchOrder, toast]);

  // Auto-focus scan input on load and after scan
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = document.querySelector('[data-scan-input="true"]') as HTMLInputElement;
      if (el) el.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [scanInput]);

  // Check if all picked — enable Done button
  const allPicked = lines.length > 0 && lines.every((l: any) => l.status === "picked" || l.qtyPicked >= l.qtyOrdered);

  const handleDone = async () => {
    if (!selectedOrderId) return;
    try {
      await completePickingMutation.mutateAsync({ pathParams: { id: selectedOrderId! } });
      toast({ title: "Picking complete!", description: "Returning to order detail..." });
    } catch {
      toast({ title: "Picking done", description: "Returning to order detail...", variant: "default" });
    }
    setTimeout(() => {
      setLocation(`/sales-orders/${selectedOrderId}`);
    }, 1500);
  };

  const handlePrintPickList = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !order) return;

    const orderData = order as any;
    const totalOrdered = lines.reduce((sum: number, l: any) => sum + (l.qtyOrdered || 0), 0);
    const totalPicked = lines.reduce((sum: number, l: any) => sum + (l.qtyPicked || 0), 0);

    const rows = lines.map((line: any, idx: number) => `
      <tr style="background: ${idx % 2 === 0 ? "#f9fafb" : "#ffffff"}">
        <td style="padding: 10px 12px; color: #9ca3af;">${idx + 1}</td>
        <td style="padding: 10px 12px; font-family: monospace; font-size: 12px; color: #6b7280;">${line.skuCode || "—"}</td>
        <td style="padding: 10px 12px; font-weight: 600; color: #111827;">${line.productName || line.productId}</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 600;">${line.qtyOrdered}</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: ${line.qtyPicked > 0 ? "#15803d" : "#9ca3af"};">${line.qtyPicked || 0}</td>
        <td style="padding: 10px 12px; font-size: 11px; color: #6b7280;">${line.binCode || "—"}</td>
        <td style="padding: 10px 12px; text-align: center;">
          <span style="padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; background: ${line.status === "picked" ? "#dcfce7" : "#fef3c7"}; color: ${line.status === "picked" ? "#15803d" : "#92400e"};">${line.status}</span>
        </td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Pick List - ${orderData.orderNumber}</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 16mm 18mm; }
        @page { margin: 16mm 18mm; size: A4; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #0f2540; color: #fff; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
      </style></head><body>
        <div style="display: flex; justify-content: space-between; margin-bottom: 24px;">
          <div>
            <div style="font-size: 24px; font-weight: 700; color: #0f2540;"><span style="color: #E8622A;">Ware</span>IQ</div>
            <div style="font-size: 11px; color: #6b7280;">Pick List</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 28px; font-weight: 800; color: #0f2540;">PICK LIST</div>
            <div style="font-size: 16px; font-family: monospace; font-weight: 600; color: #E8622A;">${orderData.orderNumber}</div>
            <div style="margin-top: 4px; display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #fef3c7; color: #92400e;">${orderData.status}</div>
          </div>
        </div>
        <div style="border-top: 2px solid #0f2540; margin-bottom: 20px;"></div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
          <div>
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 6px;">Customer</div>
            <div style="font-weight: 700; color: #0f2540;">${orderData.customerName}</div>
            ${orderData.customerEmail ? `<div style="font-size: 13px; color: #6b7280;">${orderData.customerEmail}</div>` : ""}
            ${orderData.shippingAddress ? `<div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${orderData.shippingAddress}</div>` : ""}
          </div>
          <div>
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 6px;">Order Details</div>
            <div style="font-size: 13px; display: flex; justify-content: space-between;"><span style="color: #6b7280;">Created</span><span style="font-weight: 500;">${format(new Date(orderData.createdAt), "dd MMMM yyyy")}</span></div>
            ${orderData.expectedShipDate ? `<div style="font-size: 13px; display: flex; justify-content: space-between;"><span style="color: #6b7280;">Expected Ship</span><span style="font-weight: 500;">${format(new Date(orderData.expectedShipDate), "dd MMMM yyyy")}</span></div>` : ""}
          </div>
        </div>
        <table>
          <thead><tr>
            <th>#</th><th>SKU</th><th>Product</th>
            <th style="text-align: right;">Ordered</th><th style="text-align: right;">Picked</th>
            <th>Bin</th><th style="text-align: center;">Status</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 24px;">
          <div style="padding: 12px; background: #f9fafb; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: 700;">${lines.length}</div><div style="font-size: 12px; color: #6b7280;">Total Lines</div>
          </div>
          <div style="padding: 12px; background: #f9fafb; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: 700;">${totalOrdered}</div><div style="font-size: 12px; color: #6b7280;">Items Ordered</div>
          </div>
          <div style="padding: 12px; background: #f9fafb; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: 700; color: #15803d;">${totalPicked}</div><div style="font-size: 12px; color: #6b7280;">Items Picked</div>
          </div>
        </div>
        <div style="margin-top: 24px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #d1d5db;">
          Generated by WareIQ · ${format(new Date(), "dd MMMM yyyy, HH:mm")} · ${orderData.orderNumber}
        </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <Layout>
      <PageHeader
        title="Picker View"
        subtitle="Scan bin codes or SKUs to confirm picks"
        helpKey="/picker"
        action={
          <div className="flex gap-2">
            {selectedOrderId && order && (
              <>
                <Button variant="outline" onClick={handlePrintPickList}>
                  <Printer className="w-4 h-4 mr-1" />
                  Print Pick List
                </Button>
                <Button variant="outline" onClick={() => setLabelPrintOpen(true)}>
                  <Tag className="w-4 h-4 mr-1" />
                  Print SKU Labels
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setLocation("/sales-orders")}>
              <Truck className="w-4 h-4 mr-1" />
              Back to Orders
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Order Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Orders Ready to Pick ({pickingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <div className="text-center py-4 text-muted-foreground">Loading...</div>}
            {!isLoading && pickingOrders.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No orders in picking status.</p>
                <p className="text-sm mt-1">Orders must be confirmed and start picking first.</p>
              </div>
            )}
            {!isLoading && pickingOrders.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pickingOrders.map((o: any) => (
                    <TableRow
                      key={o.id}
                      className={selectedOrderId === o.id ? "bg-muted/50" : ""}
                    >
                      <TableCell className="font-mono">{o.orderNumber}</TableCell>
                      <TableCell>{o.customerName}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[o.status] || ""}>{o.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={selectedOrderId === o.id ? "default" : "outline"}
                          onClick={() => {
                            setSelectedOrderId(o.id);
                            setLastScan(null);
                          }}
                        >
                          {selectedOrderId === o.id ? "Selected" : "Select"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Scan Section */}
        {selectedOrderId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Barcode className="w-5 h-5" />
                Scan to Pick
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="w-24">
                  <Label htmlFor="qty-input" className="text-xs text-muted-foreground">
                    Qty
                  </Label>
                  <Input
                    id="qty-input"
                    type="number"
                    min={1}
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    className="font-mono text-center"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="scan-input" className="text-xs text-muted-foreground">
                    Scan bin code or SKU (e.g., B-01, SKU-1001)
                  </Label>
                  <Input
                    id="scan-input"
                    data-scan-input="true"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleScan();
                      }
                    }}
                    placeholder="Scan or type bin/SKU..."
                    className="font-mono"
                    autoFocus
                  />
                </div>
                <Button onClick={handleScan} disabled={!scanInput.trim()}>
                  <Search className="w-4 h-4 mr-1" />
                  Confirm
                </Button>
              </div>

              {/* Last Scan Result */}
              {lastScan && (
                <div className={`p-3 rounded-md text-sm ${
                  lastScan.type === "success" ? "bg-green-50 text-green-700 border border-green-200" :
                  lastScan.type === "error" ? "bg-red-50 text-red-700 border border-red-200" :
                  "bg-blue-50 text-blue-700 border border-blue-200"
                }`}>
                  {lastScan.type === "success" && <CheckCircle className="w-4 h-4 inline mr-1" />}
                  {lastScan.type === "error" && <XCircle className="w-4 h-4 inline mr-1" />}
                  {lastScan.message}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pick List for Selected Order */}
        {selectedOrderId && lines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Pick List — {(order as any)?.orderNumber}
                </span>
                <div className="flex items-center gap-2">
                  {allPicked && (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      All Picked
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={handlePrintPickList}>
                    <Printer className="w-4 h-4 mr-1" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLabelPrintOpen(true)}>
                    <Tag className="w-4 h-4 mr-1" />
                    SKU Labels
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Order summary */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-xl font-bold">{lines.length}</div>
                  <div className="text-xs text-muted-foreground">Total Lines</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-xl font-bold">{lines.reduce((sum: number, l: any) => sum + (l.qtyOrdered || 0), 0)}</div>
                  <div className="text-xs text-muted-foreground">Items Ordered</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-xl font-bold text-green-700">{lines.reduce((sum: number, l: any) => sum + (l.qtyPicked || 0), 0)}</div>
                  <div className="text-xs text-muted-foreground">Items Picked</div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Ordered</TableHead>
                    <TableHead className="text-center">Picked</TableHead>
                    <TableHead>Bin</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line: any, idx: number) => (
                    <TableRow key={line.id} className={line.status === "picked" ? "bg-green-50/50" : ""}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{line.skuCode || "—"}</TableCell>
                      <TableCell className="font-medium">{line.productName || line.productId}</TableCell>
                      <TableCell className="text-center">{line.qtyOrdered}</TableCell>
                      <TableCell className="text-center font-bold">{line.qtyPicked || 0}</TableCell>
                      <TableCell className="font-mono text-sm">{line.binCode || "—"}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[line.status] || ""}>{line.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {allPicked && (
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleDone} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Done
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <LabelPrint
        open={labelPrintOpen}
        onClose={() => setLabelPrintOpen(false)}
        labels={labelData}
      />
    </Layout>
  );
}
