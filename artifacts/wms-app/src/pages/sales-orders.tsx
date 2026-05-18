import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetSalesOrders, useDeleteSalesOrder } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreHorizontal, Plus, Search, X, Package, Download, FileSpreadsheet, CheckSquare, Truck } from "lucide-react";
import { format } from "date-fns";
import { getCurrencySymbol } from "@/lib/utils";
import { exportToExcel } from "@/lib/export-excel";
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

const STAGE_KEYS = ["draft", "confirmed", "picking", "picking_complete", "packed", "shipped", "delivered"];
function getStageIndex(status: string): number {
  if (status === "cancelled") return -1;
  return STAGE_KEYS.indexOf(status);
}

export default function SalesOrdersPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkShipOpen, setBulkShipOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: orders, isLoading } = useGetSalesOrders({
    q: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const deleteMutation = useDeleteSalesOrder();

  const handleDelete = async (id: string) => {
    toast({
      title: "Delete Order",
      description: "Are you sure you want to delete this order?",
      action: (
        <Button size="sm" variant="destructive" onClick={async () => {
          await deleteMutation.mutateAsync({ pathParams: { id } });
        }}>
          Delete
        </Button>
      ),
      duration: 10000,
    });
  };

  // Selection helpers
  const selectableIds = orders?.map((o) => o.id) ?? [];
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(selectableIds));
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const shippableOrders = orders?.filter((o) => selected.has(o.id) && o.status === "packed") ?? [];

  const handleBulkShip = async () => {
    if (!shippableOrders.length) return;
    try {
      const res = await fetch("/api/sales-orders/bulk-ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: shippableOrders.map((o) => o.id) }),
      });
      const data = await res.json();
      if (data.shipped > 0) {
        toast({ title: `Shipped ${data.shipped} order${data.shipped !== 1 ? "s" : ""}` });
      }
      if (data.errors?.length > 0) {
        toast({ title: `${data.errors.length} order${data.errors.length !== 1 ? "s" : ""} failed`, variant: "destructive" });
      }
      qc.invalidateQueries({ queryKey: ["sales-orders"] });
      setSelected(new Set());
    } catch {
      toast({ title: "Failed to ship orders", variant: "destructive" });
    }
    setBulkShipOpen(false);
  };

  return (
    <Layout>
      <PageHeader
        title="Sales Orders"
        subtitle="Manage customer orders and fulfillment"
        helpKey="/sales-orders"
        action={
          <Link href="/sales-orders/new">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-1.5" />
              New Order
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="picking">Picking</SelectItem>
              <SelectItem value="picking_complete">Picking Complete</SelectItem>
              <SelectItem value="packed">Packed</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              disabled={!orders?.length || isLoading}
              onClick={() => {
                if (!orders?.length) return;
                const rows = orders.map((so) => ({
                  "Order #": so.orderNumber,
                  Customer: so.customerName,
                  Status: so.status,
                  Currency: so.currency ?? "USD",
                  "Total Value": (so as any).totalValue ?? "",
                  "Expected Ship": so.expectedShipDate ?? "",
                  Created: so.createdAt ? format(new Date(so.createdAt), "yyyy-MM-dd") : "",
                }));
                exportToExcel(rows, "sales-orders");
              }}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Total Qty</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : orders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No orders found</p>
                    <p className="text-sm">Create your first sales order to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                orders?.map((order) => {
                  const isSelected = selected.has(order.id);
                  return (
                  <TableRow
                    key={order.id}
                    className={`cursor-pointer ${isSelected ? "bg-orange-50/60" : ""}`}
                    onClick={() => {
                      if (order.status === "picking") {
                        setLocation(`/picker?orderId=${order.id}`);
                      } else {
                        setLocation(`/sales-orders/${order.id}`);
                      }
                    }}
                  >
                    <TableCell className="pl-4 w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(order.id)}
                        aria-label={`Select ${order.orderNumber}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.orderNumber}</div>
                      {order.status === "cancelled" && (
                        <div className="text-[10px] text-red-500 mt-0.5">Cancelled</div>
                      )}
                    </TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status]}>
                        {statusLabel[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.lineCount || 0}</TableCell>
                    <TableCell>{order.totalQty || 0}</TableCell>
                    <TableCell><Badge variant="outline">{getCurrencySymbol(order.currency ?? "USD")} {order.currency ?? "USD"}</Badge></TableCell>
                    <TableCell>{format(new Date(order.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/sales-orders/${order.id}`}>View Details</Link>
                          </DropdownMenuItem>
                          {order.status === "draft" && (
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDelete(order.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-gray-900 text-white rounded-xl shadow-2xl border border-white/10">
          <div className="flex items-center gap-2 pr-3 border-r border-white/20">
            <CheckSquare className="w-4 h-4 text-white/70" />
            <span className="text-sm font-medium">{selected.size} selected</span>
          </div>

          {shippableOrders.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-indigo-300 hover:text-indigo-200 hover:bg-white/10 text-xs"
              onClick={() => setBulkShipOpen(true)}
            >
              <Truck className="w-3.5 h-3.5" />
              Ship {shippableOrders.length > 1 ? `${shippableOrders.length} orders` : "order"}
            </Button>
          )}

          <button
            onClick={() => setSelected(new Set())}
            className="ml-1 text-white/50 hover:text-white transition-colors"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bulk ship confirmation */}
      <AlertDialog open={bulkShipOpen} onOpenChange={setBulkShipOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ship {shippableOrders.length} Order{shippableOrders.length !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {shippableOrders.length} packed order{shippableOrders.length !== 1 ? "s" : ""} as shipped and create outbound inventory movements.
              <br /><br />
              <span className="font-medium text-foreground">This cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleBulkShip}
            >
              Ship {shippableOrders.length} Order{shippableOrders.length !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}