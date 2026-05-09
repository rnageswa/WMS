import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetSalesOrders, useDeleteSalesOrder } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Search, X, Package } from "lucide-react";
import { format } from "date-fns";
import { getCurrencySymbol } from "@/lib/utils";

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
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : orders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No orders found</p>
                    <p className="text-sm">Create your first sales order to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                orders?.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer"
                    onClick={() => {
                      if (order.status === "picking") {
                        setLocation(`/picker?orderId=${order.id}`);
                      } else {
                        setLocation(`/sales-orders/${order.id}`);
                      }
                    }}
                  >
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
                    <TableCell><Badge variant="outline">{getCurrencySymbol(order.currency)} {order.currency}</Badge></TableCell>
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
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
}