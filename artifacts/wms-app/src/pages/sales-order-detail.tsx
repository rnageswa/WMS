import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetSalesOrder,
  useConfirmSalesOrder,
  useStartPickingSalesOrder,
  useCompletePickingSalesOrder,
  usePackSalesOrder,
  useShipSalesOrder,
  useDeliverSalesOrder,
  useCancelSalesOrder,
  useUpdateSalesOrderLinePick,
} from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, Truck, CheckCircle, XCircle, Box, ShoppingCart, Send, FileText, ClipboardList, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency, getCurrencySymbol } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  picking: "bg-amber-100 text-amber-700",
  picking_complete: "bg-amber-200 text-amber-800",
  packed: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  picking: "Picking",
  picking_complete: "Picking Complete",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const stageAbbr: Record<string, string> = {
  draft: "Dr",
  confirmed: "Co",
  picking: "Pi",
  picking_complete: "PC",
  packed: "Pa",
  shipped: "Sh",
  delivered: "De",
};

export default function SalesOrderDetailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const orderId = window.location.pathname.split("/").pop() || "";

  const { data: order, isLoading, refetch } = useGetSalesOrder({ pathParams: { id: orderId } });

  const confirmMutation = useConfirmSalesOrder();
  const startPickingMutation = useStartPickingSalesOrder();
  const completePickingMutation = useCompletePickingSalesOrder();
  const packMutation = usePackSalesOrder();
  const shipMutation = useShipSalesOrder();
  const deliverMutation = useDeliverSalesOrder();
  const cancelMutation = useCancelSalesOrder();
  const updatePickMutation = useUpdateSalesOrderLinePick();

  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 text-center text-muted-foreground">Loading...</div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <PageHeader
          title="Order Not Found"
          action={
            <Button variant="outline" onClick={() => setLocation("/sales-orders")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          }
        />
      </Layout>
    );
  }

  const canConfirm = order.status === "draft";
  const canStartPicking = order.status === "confirmed";
  const canCompletePicking = order.status === "picking";
  const canPack = order.status === "picking_complete";
  const canShip = order.status === "packed";
  const canDeliver = order.status === "shipped";
  const canCancel = ["draft", "confirmed", "picking", "picking_complete", "packed"].includes(order.status);

  const handleConfirm = async () => {
    await confirmMutation.mutateAsync({ pathParams: { id: orderId } });
    toast({ title: "Order confirmed" });
    refetch();
  };

  const handleStartPicking = async () => {
    await startPickingMutation.mutateAsync({ pathParams: { id: orderId } });
    toast({ title: "Picking started" });
    // Navigate to picker view with order ID
    setLocation(`/picker?orderId=${orderId}`);
  };

  const handleCompletePicking = async () => {
    await completePickingMutation.mutateAsync({ pathParams: { id: orderId } });
    toast({ title: "Picking complete" });
    refetch();
  };

  const handlePack = async () => {
    await packMutation.mutateAsync({ pathParams: { id: orderId } });
    toast({ title: "Order packed" });
    refetch();
  };

  const handleShip = async () => {
    await shipMutation.mutateAsync({
      pathParams: { id: orderId },
      body: { trackingNumber: trackingNumber || undefined, carrier: carrier || undefined }
    });
    toast({
      title: "Order shipped",
      description: "Packing slip generated.",
      action: (
        <a href={`/sales-orders/${orderId}/packing-slip`} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline">View Packing Slip</Button>
        </a>
      ),
    });
    setTrackingNumber("");
    refetch();
  };

  const handleDeliver = async () => {
    await deliverMutation.mutateAsync({ pathParams: { id: orderId } });
    toast({ title: "Order delivered" });
    refetch();
  };

  const handleCancel = () => {
    toast({
      title: "Cancel Order",
      description: "Are you sure you want to cancel this order?",
      action: (
        <Button size="sm" variant="destructive" onClick={async () => {
          await cancelMutation.mutateAsync({ pathParams: { id: orderId } });
          refetch();
        }}>
          Cancel Order
        </Button>
      ),
      duration: 10000,
    });
  };

  const handlePickChange = async (lineId: string, qtyPicked: number) => {
    await updatePickMutation.mutateAsync({
      pathParams: { id: orderId, lineId },
      body: { qtyPicked }
    });
    refetch();
  };

  return (
    <Layout>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        helpKey="/sales-orders"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/sales-orders")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            {order.status === "picking" && (
              <Button variant="outline" onClick={() => setLocation(`/picker?orderId=${orderId}`)}>
                <ClipboardList className="w-4 h-4 mr-1" />
                Pick List
              </Button>
            )}
            {(order.status === "picking_complete" || order.status === "packed" || order.status === "shipped" || order.status === "delivered") && (
              <Button variant="outline" onClick={() => setLocation(`/sales-orders/${orderId}/packing-slip`)}>
                <FileText className="w-4 h-4 mr-1" />
                Packing Slip
              </Button>
            )}
            {(order.status === "shipped" || order.status === "delivered") && (
              <Button variant="outline" onClick={() => setLocation(`/sales-orders/${orderId}/shipping-label`)}>
                <Truck className="w-4 h-4 mr-1" />
                Print Shipping Label
              </Button>
            )}
            {canCancel && (
              <Button variant="outline" className="text-red-600" onClick={handleCancel}>
                Cancel Order
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Status Banner & Actions */}
        <Card className={order.status === "cancelled" ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge className={`${statusColors[order.status]} text-sm px-3 py-1`}>
                  {statusLabel[order.status]}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  Customer: <span className="font-medium text-foreground">{order.customerName}</span>
                  {order.customerEmail && <span> · {order.customerEmail}</span>}
                </div>
              </div>

              {/* Workflow Actions */}
              <div className="flex gap-2">
                {canConfirm && (
                  <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Confirm Order
                  </Button>
                )}
                {canStartPicking && (
                  <Button onClick={handleStartPicking} className="bg-amber-600 hover:bg-amber-700">
                    <Package className="w-4 h-4 mr-1" />
                    Start Picking
                  </Button>
                )}
                {canCompletePicking && (
                  <Button onClick={() => setLocation(`/picker?orderId=${orderId}`)} className="bg-amber-600 hover:bg-amber-700">
                    <Package className="w-4 h-4 mr-1" />
                    Go to Picker View
                  </Button>
                )}
                {canPack && (
                  <Button onClick={handlePack} className="bg-purple-600 hover:bg-purple-700">
                    <Box className="w-4 h-4 mr-1" />
                    Mark Packed
                  </Button>
                )}
                {canShip && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tracking #"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-32"
                    />
                    <Select value={carrier} onValueChange={setCarrier}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Carrier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FedEx">FedEx</SelectItem>
                        <SelectItem value="UPS">UPS</SelectItem>
                        <SelectItem value="DHL">DHL</SelectItem>
                        <SelectItem value="USPS">USPS</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleShip} className="bg-indigo-600 hover:bg-indigo-700">
                      <Truck className="w-4 h-4 mr-1" />
                      Ship
                    </Button>
                  </div>
                )}
                {canDeliver && (
                  <Button onClick={handleDeliver} className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Mark Delivered
                  </Button>
                )}
              </div>
            </div>

            {/* Progress Steps */}
            <div className="mt-6 flex items-center gap-2">
              {["draft", "confirmed", "picking", "picking_complete", "packed", "shipped", "delivered"].map((step, idx) => {
                const isActive = ["draft", "confirmed", "picking", "picking_complete", "packed", "shipped", "delivered"].indexOf(order.status) >= idx;
                const isCurrent = order.status === step;
                return (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        isCurrent ? "bg-primary text-white" : isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                      title={statusLabel[step]}
                    >
                      {stageAbbr[step]}
                    </div>
                    {idx < 6 && <div className={`w-8 h-0.5 ${isActive ? "bg-primary" : "bg-muted"}`} />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <div className="grid grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Customer Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {order.customerName}</div>
              {order.customerEmail && <div><span className="text-muted-foreground">Email:</span> {order.customerEmail}</div>}
              {order.customerPhone && <div><span className="text-muted-foreground">Phone:</span> {order.customerPhone}</div>}
              {order.shippingAddress && <div><span className="text-muted-foreground">Address:</span> {order.shippingAddress}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Order Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Created:</span> {format(new Date(order.createdAt), "MMM d, yyyy")}</div>
              {order.expectedShipDate && <div><span className="text-muted-foreground">Expected:</span> {format(new Date(order.expectedShipDate), "MMM d, yyyy")}</div>}
              {order.shippedAt && <div><span className="text-muted-foreground">Shipped:</span> {format(new Date(order.shippedAt), "MMM d, yyyy")}</div>}
              {order.deliveredAt && <div><span className="text-muted-foreground">Delivered:</span> {format(new Date(order.deliveredAt), "MMM d, yyyy")}</div>}
              <div className="pt-1 border-t mt-2"><span className="text-muted-foreground">Currency:</span> <span className="font-medium">{getCurrencySymbol(order.currency)} {order.currency}</span>{order.exchangeRate && <span className="text-muted-foreground ml-1">(rate: {parseFloat(order.exchangeRate).toFixed(6)})</span>}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {order.notes || "No notes"}
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead>Picked</TableHead>
                  <TableHead>Packed</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(order as any).lines?.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.productName || line.productId}</TableCell>
                    <TableCell><Badge variant="outline">{line.skuCode || "—"}</Badge></TableCell>
                    <TableCell>{line.qtyOrdered}</TableCell>
                    <TableCell>
                      {["picking", "picking_complete"].includes(order.status) ? (
                        <Input
                          type="number"
                          className="w-20"
                          value={line.qtyPicked}
                          onChange={(e) => handlePickChange(line.id, parseInt(e.target.value) || 0)}
                          min={0}
                          max={line.qtyOrdered}
                        />
                      ) : (
                        line.qtyPicked
                      )}
                    </TableCell>
                    <TableCell>{line.qtyPacked || "—"}</TableCell>
                    <TableCell>{formatCurrency(line.unitPrice, order.currency)}</TableCell>
                    <TableCell>{formatCurrency(line.costAtTime, order.currency)}</TableCell>
                    <TableCell>
                      {line.unitPrice && line.costAtTime ? (() => {
                        const price = parseFloat(line.unitPrice);
                        const cost = parseFloat(line.costAtTime);
                        const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
                        const isNeg = margin < 0;
                        return (
                          <span className={`font-medium ${isNeg ? "text-red-600" : "text-emerald-600"}`}>
                            {isNeg ? "" : "+"}{margin.toFixed(1)}%
                          </span>
                        );
                      })() : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{line.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Margin Summary */}
        {(order as any).lines?.some((l: any) => l.unitPrice && l.costAtTime && l.qtyOrdered) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Margin Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const linesWithMargin = (order as any).lines.filter((l: any) => l.unitPrice && l.costAtTime && l.qtyOrdered);
                const totalRevenue = linesWithMargin.reduce((s: number, l: any) => s + parseFloat(l.unitPrice) * l.qtyOrdered, 0);
                const totalCost = linesWithMargin.reduce((s: number, l: any) => s + parseFloat(l.costAtTime) * l.qtyOrdered, 0);
                const totalMargin = totalRevenue - totalCost;
                const marginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
                const cur = getCurrencySymbol(order.currency);
                return (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                      <div className="text-lg font-semibold">{formatCurrency(totalRevenue, order.currency)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Cost</div>
                      <div className="text-lg font-semibold">{formatCurrency(totalCost, order.currency)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Margin</div>
                      <div className={`text-lg font-semibold ${totalMargin < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {formatCurrency(totalMargin, order.currency)} ({marginPct.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Activity History */}
        {(order as any).history?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(order as any).history.map((event: any, idx: number) => (
                  <div key={idx} className="flex gap-3 text-sm">
                    <div className="text-muted-foreground w-32">
                      {format(new Date(event.createdAt), "MMM d, HH:mm")}
                    </div>
                    <Badge variant="outline">{event.event}</Badge>
                    {event.note && <span className="text-muted-foreground">{event.note}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}