import { useState } from "react";
import { useLocation } from "wouter";
import { useGetProducts, useListInventory } from "@workspace/api-client-react";
import { useCreateSalesOrder } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Package, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CurrencySelector } from "@/components/currency-selector";
import { getCurrencySymbol } from "@/lib/utils";

function OrderLineItem({
  line,
  products,
  onUpdate,
  onRemove,
}: {
  line: OrderLine;
  products: any[];
  onUpdate: (id: string, field: string, value: any) => void;
  onRemove: (id: string) => void;
}) {
  const { data: invData } = useListInventory(
    line.productId ? { productId: line.productId } : { productId: "skip" },
    { query: { enabled: !!line.productId } }
  );
  const availableQty = (invData as any)?.reduce((sum: number, inv: any) => sum + (inv.qtyOnHand || 0), 0) ?? 0;

  return (
    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
      <div className="grid grid-cols-[1fr_100px_120px_auto_auto] gap-3 items-end">
        <div>
          <Label className="text-xs">Product</Label>
          <Select
            value={line.productId}
            onValueChange={(v) => onUpdate(line.id, "productId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {products?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.skuCode} - {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Qty</Label>
          <Input
            type="number"
            min={1}
            max={availableQty > 0 ? availableQty : undefined}
            value={line.qtyOrdered}
            onChange={(e) => onUpdate(line.id, "qtyOrdered", parseInt(e.target.value) || 1)}
          />
        </div>
        <div>
          <Label className="text-xs">Unit Price</Label>
          <Input
            type="number"
            step="0.01"
            value={line.unitPrice || ""}
            onChange={(e) => onUpdate(line.id, "unitPrice", parseFloat(e.target.value) || undefined)}
            placeholder={`${getCurrencySymbol(currency)} 0.00`}
          />
        </div>
        <div className="flex items-end pb-1">
          {line.skuCode && (
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              {line.skuCode}
            </Badge>
          )}
        </div>
        <div className="flex items-end pb-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-600 h-9 w-9"
            onClick={() => onRemove(line.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {line.productId && (
        <div className={`text-xs ${availableQty > 0 ? "text-green-600" : "text-red-500"}`}>
          Available: {availableQty} unit(s)
        </div>
      )}
    </div>
  );
}

interface OrderLine {
  id: string;
  productId: string;
  productName: string;
  skuCode: string;
  qtyOrdered: number;
  unitPrice?: number;
}

export default function NewSalesOrderPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: products } = useGetProducts({ isActive: true });
  const createMutation = useCreateSalesOrder();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [expectedShipDate, setExpectedShipDate] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([]);

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: Math.random().toString(36).substr(2, 9),
        productId: "",
        productName: "",
        skuCode: "",
        qtyOrdered: 1,
        unitPrice: undefined,
      },
    ]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, field: string, value: any) => {
    setLines(
      lines.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        if (field === "productId" && value) {
          const product = products?.find((p) => p.id === value);
          if (product) {
            updated.productName = product.name;
            updated.skuCode = product.skuCode;
            updated.unitPrice = product.unitPrice ? parseFloat(product.unitPrice) : undefined;
          }
        }
        return updated;
      })
    );
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (!customerName.trim()) {
      toast({ title: "Customer name is required", variant: "destructive" });
      return;
    }

    const validLines = lines.filter((l) => l.productId && l.qtyOrdered > 0);
    if (validLines.length === 0) {
      toast({ title: "At least one product line is required", variant: "destructive" });
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        body: {
          customerName,
          customerEmail: customerEmail || undefined,
          customerPhone: customerPhone || undefined,
          shippingAddress: shippingAddress || undefined,
          notes: notes || undefined,
          expectedShipDate: expectedShipDate || undefined,
          currency,
          lines: validLines.map((l) => ({
            productId: l.productId,
            qtyOrdered: l.qtyOrdered,
            unitPrice: l.unitPrice,
          })),
        },
      });

      toast({ title: `Order ${result.orderNumber} created` });
      setLocation(`/sales-orders/${result.id}`);
    } catch (err: any) {
      toast({ title: "Failed to create order", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Layout>
      <PageHeader
        title="New Sales Order"
        subtitle="Create a new customer order"
        helpKey="/sales-orders/new"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/sales-orders")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleSubmit(true)}
              disabled={createMutation.isPending}
            >
              Save as Draft
            </Button>
            <Button 
              onClick={() => handleSubmit(false)}
              disabled={createMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createMutation.isPending ? "Creating..." : "Confirm Order"}
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Customer Details */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="space-y-2">
                <Label>Expected Ship Date</Label>
                <Input
                  type="date"
                  value={expectedShipDate}
                  onChange={(e) => setExpectedShipDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <CurrencySelector value={currency} onValueChange={setCurrency} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Shipping Address</Label>
              <Textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Enter full shipping address"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Order notes..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Order Lines</CardTitle>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="w-4 h-4 mr-1" />
              Add Line
            </Button>
          </CardHeader>
          <CardContent>
            {lines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No line items yet</p>
                <p className="text-sm">Click "Add Line" to add products</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lines.map((line) => (
                  <OrderLineItem
                    key={line.id}
                    line={line}
                    products={products}
                    onUpdate={updateLine}
                    onRemove={removeLine}
                  />
                ))}
              </div>
            )}

            {lines.length > 0 && (
              <div className="mt-4 pt-4 border-t flex justify-between">
                <div className="text-sm text-muted-foreground">
                  {lines.length} line(s)
                </div>
                <div className="text-sm font-medium">
                  Total: {lines.reduce((sum, l) => sum + (l.qtyOrdered || 0), 0)} units · Est: {getCurrencySymbol(currency)}{lines.reduce((sum, l) => sum + (l.qtyOrdered || 0) * (l.unitPrice || 0), 0).toFixed(2)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}