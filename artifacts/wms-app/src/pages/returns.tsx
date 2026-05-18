import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Plus,
  Search,
  X,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  requested: "bg-blue-100 text-blue-700",
  approved: "bg-indigo-100 text-indigo-700",
  received: "bg-amber-100 text-amber-700",
  inspected: "bg-purple-100 text-purple-700",
  restocked: "bg-emerald-100 text-emerald-700",
  quarantined: "bg-orange-100 text-orange-700",
  refunded: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const statusLabel: Record<string, string> = {
  requested: "Requested",
  approved: "Approved",
  received: "Received",
  inspected: "Inspected",
  restocked: "Restocked",
  quarantined: "Quarantined",
  refunded: "Refunded",
  rejected: "Rejected",
};

interface RmaItem {
  rma: {
    id: string;
    rmaNumber: string;
    customerName: string;
    status: string;
    reason: string | null;
    createdAt: string;
    updatedAt: string;
  };
  orderNumber: string | null;
}

export default function ReturnsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["returns", statusFilter],
    queryFn: async () => {
      const qs = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/returns${qs}`, { credentials: "include" });
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/returns/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["returns"] }),
  });

  const returns: RmaItem[] = data?.returns ?? [];

  const filtered = returns.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.rma.rmaNumber.toLowerCase().includes(q) ||
      item.rma.customerName.toLowerCase().includes(q) ||
      (item.orderNumber?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <Layout>
      <PageHeader
        title="Returns (RMA)"
        subtitle="Manage customer return authorizations"
        helpKey="/returns"
        action={
          <Link href="/returns/new">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-1.5" />
              New Return
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
              placeholder="Search RMA #, customer, order..."
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
              <SelectItem value="requested">Requested</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="inspected">Inspected</SelectItem>
              <SelectItem value="restocked">Restocked</SelectItem>
              <SelectItem value="quarantined">Quarantined</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RMA #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No returns found</p>
                    <p className="text-sm">Create your first RMA to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow
                    key={item.rma.id}
                    className="cursor-pointer"
                    onClick={() => setLocation(`/returns/${item.rma.id}`)}
                  >
                    <TableCell className="font-medium">{item.rma.rmaNumber}</TableCell>
                    <TableCell>{item.rma.customerName}</TableCell>
                    <TableCell>
                      {item.orderNumber ? (
                        <Link
                          href={`/sales-orders/${item.rma.id}`}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.orderNumber}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[item.rma.status]}>
                        {statusLabel[item.rma.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {item.rma.reason || "—"}
                    </TableCell>
                    <TableCell>{format(new Date(item.rma.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/returns/${item.rma.id}`}>View Details</Link>
                          </DropdownMenuItem>
                          {item.rma.status === "requested" && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => deleteMutation.mutate(item.rma.id)}
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
