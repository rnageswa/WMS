import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ArrowLeft, Plus, Trash2, RotateCcw } from "lucide-react";

interface ReturnLineInput {
  productId: string;
  productName: string;
  maxQty: number;
  qtyReturned: number;
  condition: string;
  notes: string;
}

export default function ReturnNewPage() {
  const [, setLocation] = useLocation();

  // Extract orderId from query string: /returns/new?orderId=xxx
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId") || "";

  const [customerName, setCustomerName] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ReturnLineInput[]>([
    { productId: "", productName: "", maxQty: 0, qtyReturned: 1, condition: "good", notes: "" },
  ]);

  // Fetch sales order if orderId provided
  const { data: soData } = useQuery({
    queryKey: ["sales-order-for-return", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/sales-orders/${orderId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sales order");
      return res.json();
    },
    enabled: !!orderId,
  });

  // Fetch all products (for standalone RMA without SO)
  const { data: productsData } = useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => {
      const res = await fetch("/api/products?limit=100", { credentials: "include" });
      return res.json();
    },
    enabled: !orderId,
  });

  // When SO data arrives, auto-fill customer + lines
  useEffect(() => {
    if (soData) {
      setCustomerName(soData.customerName || "");
      if (soData.lines?.length > 0) {
        const soLines: ReturnLineInput[] = soData.lines.map((l: any) => ({
          productId: l.productId,
          productName: l.productName || l.productId,
          maxQty: l.qtyShipped || l.qtyOrdered || 1,
          qtyReturned: l.qtyShipped || l.qtyOrdered || 1,
          condition: "good",
          notes: "",
        }));
        setLines(soLines);
      }
    }
  }, [soData]);

  const products = productsData ?? [];
  const soLines = soData?.lines ?? [];
  const isFromSO = !!orderId;

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderId: orderId || undefined,
          customerName,
          reason: reason || undefined,
          notes: notes || undefined,
          lines: lines
            .filter((l) => l.productId)
            .map((l) => ({
              productId: l.productId,
              qtyReturned: l.qtyReturned,
              condition: l.condition,
              notes: l.notes || undefined,
            })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create RMA");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setLocation(`/returns/${data.rma.id}`);
    },
  });

  const addLine = () => {
    setLines([...lines, { productId: "", productName: "", maxQty: 0, qtyReturned: 1, condition: "good", notes: "" }]);
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof ReturnLineInput, value: string | number) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setLines(updated);
  };

  const canSubmit = customerName.trim() && lines.some((l) => l.productId);

  return (
    <Layout>
      <PageHeader
        title="New Return (RMA)"
        subtitle={isFromSO ? `Return for Sales Order ${soData?.orderNumber || orderId}` : "Create a new return authorization"}
        helpKey="/returns"
        action={
          <Button variant="outline" size="sm" onClick={() => setLocation("/returns")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Cancel
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Header info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Return Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Customer Name *</Label>
                {isFromSO ? (
                  <Input
                    value={customerName}
                    readOnly
                    className="mt-1 bg-muted cursor-not-allowed"
                  />
                ) : (
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="mt-1"
                  />
                )}
              </div>
              <div>
                <Label className="text-xs">Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="defective">Defective</SelectItem>
                    <SelectItem value="wrong_item">Wrong Item</SelectItem>
                    <SelectItem value="damaged_in_transit">Damaged in Transit</SelectItem>
                    <SelectItem value="customer_remorse">Customer Remorse</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isFromSO && soData?.orderNumber && (
              <div>
                <Label className="text-xs">Sales Order</Label>
                <div className="mt-1 text-sm font-medium">{soData.orderNumber}</div>
              </div>
            )}
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                className="mt-1"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Lines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Return Lines</CardTitle>
            {!isFromSO && (
              <Button variant="outline" size="sm" onClick={addLine} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" />
                Add Line
              </Button>
            )}
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Product *</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Notes</TableHead>
                  {!isFromSO && <TableHead className="w-[40px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="px-5 py-2">
                      {isFromSO ? (
                        <div className="text-xs">
                          <span className="font-medium">{line.productName || line.productId}</span>
                        </div>
                      ) : (
                        <Select
                          value={line.productId}
                          onValueChange={(v) => updateLine(idx, "productId", v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {products.length === 0 ? (
                              <SelectItem value="__none" disabled>
                                Loading products...
                              </SelectItem>
                            ) : (
                              products.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} ({p.skuCode})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-2">
                      {isFromSO ? (
                        <Input
                          type="number"
                          min={1}
                          max={line.maxQty}
                          value={line.qtyReturned}
                          onChange={(e) => updateLine(idx, "qtyReturned", Math.min(parseInt(e.target.value) || 1, line.maxQty))}
                          className="w-20 h-8 text-xs text-right"
                        />
                      ) : (
                        <Input
                          type="number"
                          min={1}
                          value={line.qtyReturned}
                          onChange={(e) => updateLine(idx, "qtyReturned", parseInt(e.target.value) || 1)}
                          className="w-20 h-8 text-xs text-right"
                        />
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-2">
                      <Select
                        value={line.condition}
                        onValueChange={(v) => updateLine(idx, "condition", v)}
                      >
                        <SelectTrigger className="h-8 text-xs w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                          <SelectItem value="defective">Defective</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="px-5 py-2">
                      <Input
                        value={line.notes}
                        onChange={(e) => updateLine(idx, "notes", e.target.value)}
                        placeholder="Optional notes"
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    {!isFromSO && (
                      <TableCell className="px-5 py-2">
                        {lines.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600"
                            onClick={() => removeLine(idx)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setLocation("/returns")}>
            Cancel
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!canSubmit || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            {createMutation.isPending ? "Creating..." : "Create RMA"}
          </Button>
        </div>

        {createMutation.isError && (
          <p className="text-sm text-red-500 text-right">
            {createMutation.error?.message ?? "Failed to create RMA"}
          </p>
        )}
      </div>
    </Layout>
  );
}
