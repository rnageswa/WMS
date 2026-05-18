import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  ArrowLeft,
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

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

const conditionLabel: Record<string, string> = {
  new: "New",
  good: "Good",
  fair: "Fair",
  damaged: "Damaged",
  defective: "Defective",
};

const dispositionLabel: Record<string, string> = {
  restock: "Restock",
  quarantine: "Quarantine",
  dispose: "Dispose",
  return_to_supplier: "Return to Supplier",
};

const statusFlow = ["requested", "approved", "received", "inspected", "restocked"];

export default function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["returns", id],
    queryFn: async () => {
      const res = await fetch(`/api/returns/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch RMA");
      return res.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/returns/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      setSelectedStatus("");
    },
  });

  const lineMutation = useMutation({
    mutationFn: async ({ lineId, data }: { lineId: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/returns/${id}/lines/${lineId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update line");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["returns"] }),
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!data?.rma) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-muted-foreground">RMA not found</p>
        </div>
      </Layout>
    );
  }

  const { rma, lines } = data;
  const totalLines = lines?.length ?? 0;
  const totalQty = lines?.reduce((sum: number, l: any) => sum + l.line.qtyReturned, 0) ?? 0;

  return (
    <Layout>
      <PageHeader
        title={`RMA: ${rma.rmaNumber}`}
        subtitle={`Return authorization for ${rma.customerName}`}
        helpKey="/returns"
        action={
          <Button variant="outline" size="sm" onClick={() => setLocation("/returns")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Returns
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Status flow */}
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-2 mb-4">
              <Badge className={statusColors[rma.status]}>
                {statusLabel[rma.status]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Created {format(new Date(rma.createdAt), "MMM d, yyyy h:mm a")}
              </span>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-1 mb-4">
              {statusFlow.map((s, i) => {
                const isActive = statusFlow.indexOf(rma.status) >= i;
                const isCurrent = rma.status === s;
                return (
                  <div key={s} className="flex items-center flex-1">
                    <div
                      className={`h-2 flex-1 rounded-full ${
                        isActive ? "bg-primary" : "bg-muted"
                      } ${isCurrent ? "ring-2 ring-primary ring-offset-1" : ""}`}
                    />
                    {i < statusFlow.length - 1 && (
                      <div className="w-1" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Requested</span>
              <span>Approved</span>
              <span>Received</span>
              <span>Inspected</span>
              <span>Resolved</span>
            </div>

            {/* Status actions */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/60">
              <span className="text-xs text-muted-foreground mr-1">Update status:</span>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value} disabled={value === rma.status}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={!selectedStatus || statusMutation.isPending}
                onClick={() => statusMutation.mutate(selectedStatus)}
              >
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4 px-5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Customer</p>
              <p className="text-sm font-medium mt-1">{rma.customerName}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 px-5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Lines</p>
              <p className="text-sm font-medium mt-1">{totalLines} line{totalLines !== 1 ? "s" : ""} · {totalQty} unit{totalQty !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 px-5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Reason</p>
              <p className="text-sm font-medium mt-1">{rma.reason || "—"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Return Lines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Return Lines</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {lines?.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No lines on this RMA
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty Returned</TableHead>
                    <TableHead className="text-right">Qty Received</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Disposition</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines?.map((item: any) => (
                    <tr key={item.line.id} className="border-b border-border/50">
                      <TableCell className="px-5 py-3">
                        <span className="text-sm font-medium">{item.product?.name ?? "Unknown"}</span>
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <span className="text-xs font-mono text-muted-foreground">{item.product?.skuCode}</span>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-right tabular-nums">
                        {item.line.qtyReturned}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-right">
                        {rma.status === "inspected" || rma.status === "restocked" || rma.status === "quarantined" ? (
                          <input
                            type="number"
                            min={0}
                            max={item.line.qtyReturned}
                            defaultValue={item.line.qtyReceived}
                            className="w-16 h-7 text-xs text-right border border-border rounded px-2"
                            onBlur={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              lineMutation.mutate({
                                lineId: item.line.id,
                                data: { qtyReceived: val },
                              });
                            }}
                          />
                        ) : (
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {item.line.qtyReceived}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        {(rma.status === "inspected" || rma.status === "restocked") ? (
                          <Select
                            defaultValue={item.line.condition}
                            onValueChange={(val) =>
                              lineMutation.mutate({
                                lineId: item.line.id,
                                data: { condition: val },
                              })
                            }
                          >
                            <SelectTrigger className="w-[120px] h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(conditionLabel).map(([v, l]) => (
                                <SelectItem key={v} value={v}>{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {conditionLabel[item.line.condition] ?? item.line.condition}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        {(rma.status === "inspected" || rma.status === "restocked") ? (
                          <Select
                            defaultValue={item.line.disposition}
                            onValueChange={(val) =>
                              lineMutation.mutate({
                                lineId: item.line.id,
                                data: { disposition: val },
                              })
                            }
                          >
                            <SelectTrigger className="w-[140px] h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(dispositionLabel).map(([v, l]) => (
                                <SelectItem key={v} value={v}>{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {dispositionLabel[item.line.disposition] ?? item.line.disposition}
                          </span>
                        )}
                      </TableCell>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {rma.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rma.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
