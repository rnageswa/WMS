import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetPurchaseOrder,
  useUpdatePurchaseOrderStatus,
  useUpdatePurchaseOrderDeliveryDate,
  useReceivePurchaseOrder,
  useSendPurchaseOrderEmail,
  useDuplicatePurchaseOrder,
  useListWarehouses,
  useListZones,
  useListBins,
  getGetPurchaseOrderQueryKey,
  getListPurchaseOrdersQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetLowStockAlertsQueryKey,
  getListZonesQueryKey,
  getListBinsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  PackagePlus,
  XCircle,
  Send,
  RotateCcw,
  TrendingUp,
  Mail,
  CalendarDays,
  Pencil,
  Copy,
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow, format, isPast, parseISO } from "date-fns";

type PoStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled";

const STATUS_META: Record<PoStatus, { label: string; cls: string }> = {
  draft:              { label: "Draft",              cls: "bg-muted text-muted-foreground border-border" },
  ordered:            { label: "Ordered",            cls: "bg-blue-50 text-blue-700 border-blue-200" },
  partially_received: { label: "Partially Received", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  received:           { label: "Received",           cls: "bg-green-50 text-green-700 border-green-200" },
  cancelled:          { label: "Cancelled",          cls: "bg-red-50 text-red-500 border-red-200" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as PoStatus] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge className={`${meta.cls} hover:${meta.cls} font-medium`}>{meta.label}</Badge>;
}

function LineStatusDot({ status }: { status: string }) {
  if (status === "received") return <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />;
  if (status === "partially_received") return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-muted-foreground/30 inline-block" />;
}

interface ReceiveLine {
  lineId: string;
  qty: number;
  warehouseId: string;
  zoneId: string;
  binId: string;
}

function BinSelector({
  lineId,
  entry,
  onChange,
}: {
  lineId: string;
  entry: ReceiveLine;
  onChange: (lineId: string, patch: Partial<ReceiveLine>) => void;
}) {
  const { data: warehouses = [] } = useListWarehouses();
  const { data: zones = [] } = useListZones(entry.warehouseId, {
    query: {
      enabled: !!entry.warehouseId,
      queryKey: getListZonesQueryKey(entry.warehouseId),
    },
  });
  const { data: bins = [] } = useListBins(entry.zoneId, {
    query: {
      enabled: !!entry.zoneId,
      queryKey: getListBinsQueryKey(entry.zoneId),
    },
  });

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Select
        value={entry.warehouseId}
        onValueChange={(v) => onChange(lineId, { warehouseId: v, zoneId: "", binId: "" })}
      >
        <SelectTrigger className="h-7 w-40 text-xs"><SelectValue placeholder="Warehouse" /></SelectTrigger>
        <SelectContent>
          {warehouses.filter((w) => w.isActive).map((w) => (
            <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={entry.zoneId}
        disabled={!entry.warehouseId}
        onValueChange={(v) => onChange(lineId, { zoneId: v, binId: "" })}
      >
        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Zone" /></SelectTrigger>
        <SelectContent>
          {zones.map((z) => (
            <SelectItem key={z.id} value={z.id} className="text-xs">{z.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={entry.binId}
        disabled={!entry.zoneId}
        onValueChange={(v) => onChange(lineId, { binId: v })}
      >
        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Bin" /></SelectTrigger>
        <SelectContent>
          {bins.filter((b) => b.isActive).map((b) => (
            <SelectItem key={b.id} value={b.id} className="text-xs">{b.code}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [receiving, setReceiving] = useState(false);
  const [receiveEntries, setReceiveEntries] = useState<Record<string, ReceiveLine>>({});

  // Email dialog state
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");

  // Delivery date inline edit state
  const [editingDate, setEditingDate] = useState(false);
  const [dateInput, setDateInput] = useState("");

  const { data: po, isLoading } = useGetPurchaseOrder(id!, {
    query: {
      queryKey: getGetPurchaseOrderQueryKey(id!),
      enabled: !!id,
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(id!) });
    qc.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    qc.invalidateQueries({ queryKey: getGetLowStockAlertsQueryKey() });
  };

  const { mutate: updateStatus, isPending: updatingStatus } = useUpdatePurchaseOrderStatus({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Status updated" }); },
      onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
    },
  });

  const { mutate: receivePo, isPending: receivingPo } = useReceivePurchaseOrder({
    mutation: {
      onSuccess: (data) => {
        invalidate();
        setReceiving(false);
        setReceiveEntries({});
        toast({ title: `Received — ${data.movementsCreated} movement${data.movementsCreated !== 1 ? "s" : ""} created` });
      },
      onError: () => toast({ title: "Failed to receive stock", variant: "destructive" }),
    },
  });

  const { mutate: updateDeliveryDate, isPending: updatingDate } = useUpdatePurchaseOrderDeliveryDate({
    mutation: {
      onSuccess: () => {
        invalidate();
        setEditingDate(false);
        toast({ title: "Delivery date updated" });
      },
      onError: () => toast({ title: "Failed to update delivery date", variant: "destructive" }),
    },
  });

  const { mutate: sendEmail, isPending: sendingEmail } = useSendPurchaseOrderEmail({
    mutation: {
      onSuccess: (data) => {
        setEmailOpen(false);
        setEmailTo("");
        toast({ title: `PO emailed to ${data.to}` });
      },
      onError: () => toast({ title: "Failed to send email", variant: "destructive" }),
    },
  });

  const { mutate: duplicatePo, isPending: duplicating } = useDuplicatePurchaseOrder({
    mutation: {
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });
        toast({ title: `Duplicated as ${(data as any).poNumber}` });
        navigate(`/purchase-orders/${(data as any).id}`);
      },
      onError: () => toast({ title: "Failed to duplicate PO", variant: "destructive" }),
    },
  });

  // Pre-fill email from supplier if available
  const openEmailDialog = () => {
    const supplierEmail = (po as any)?.supplierEmail ?? "";
    setEmailTo(supplierEmail);
    setEmailOpen(true);
  };

  const openReceive = () => {
    if (!po) return;
    const init: Record<string, ReceiveLine> = {};
    for (const line of (po as any).lines ?? []) {
      if (line.status !== "received") {
        init[line.id] = {
          lineId: line.id,
          qty: line.qtyOrdered - line.qtyReceived,
          warehouseId: "",
          zoneId: "",
          binId: "",
        };
      }
    }
    setReceiveEntries(init);
    setReceiving(true);
  };

  const updateEntry = (lineId: string, patch: Partial<ReceiveLine>) =>
    setReceiveEntries((prev) => ({ ...prev, [lineId]: { ...prev[lineId], ...patch } }));

  const submitReceive = () => {
    const lines = Object.values(receiveEntries).filter((e) => e.qty > 0 && e.binId);
    if (!lines.length) { toast({ title: "Select at least one bin and quantity", variant: "destructive" }); return; }
    receivePo({
      id: id!,
      data: { lines: lines.map(({ lineId, qty, binId }) => ({ lineId, qtyReceived: qty, binId })) },
    });
  };

  const canReceive = po && ["draft", "ordered", "partially_received"].includes(po.status);
  const canOrder  = po?.status === "draft";
  const canCancel = po && ["draft", "ordered"].includes(po.status);
  const canEmail  = po && po.status !== "cancelled";

  if (isLoading) {
    return (
      <Layout>
        <PageHeader title="Purchase Order" />
        <div className="p-6 space-y-4 max-w-4xl">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Layout>
    );
  }

  if (!po) {
    return (
      <Layout>
        <PageHeader title="Not Found" />
        <div className="p-6 text-center">
          <p className="text-muted-foreground text-sm">Purchase order not found.</p>
          <Button asChild variant="outline" size="sm" className="mt-3"><Link href="/purchase-orders">Back to list</Link></Button>
        </div>
      </Layout>
    );
  }

  const poLines = (po as any).lines ?? [];
  const pendingLines = poLines.filter((l: any) => l.status !== "received");

  return (
    <Layout>
      <PageHeader
        title={po.poNumber}
        subtitle={`${po.supplierName} · ${format(new Date(po.createdAt), "dd MMM yyyy")}`}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={po.status} />
            {canOrder && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 text-xs"
                disabled={updatingStatus}
                onClick={() => updateStatus({ id: id!, data: { status: "ordered" } })}
              >
                {updatingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Mark as Ordered
              </Button>
            )}
            {canEmail && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 text-xs"
                onClick={openEmailDialog}
              >
                <Mail className="w-3 h-3" /> Email PO
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs"
              disabled={duplicating}
              onClick={() => duplicatePo({ id: id! })}
            >
              {duplicating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
              Duplicate
            </Button>
            {canReceive && !receiving && (
              <Button size="sm" onClick={openReceive} className="gap-1.5 h-8 text-xs bg-[#E8622A] hover:bg-[#E8622A]/90 text-white">
                <PackagePlus className="w-3 h-3" /> Receive Stock
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={updatingStatus}
                onClick={() => updateStatus({ id: id!, data: { status: "cancelled" } })}
              >
                <XCircle className="w-3 h-3" /> Cancel PO
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 max-w-4xl space-y-5">

        {/* Delivery date + notes info bar */}
        {(po.notes || po.expectedDeliveryDate !== undefined) && (
          <div className="flex flex-wrap items-start gap-3">
            {/* Expected delivery date */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/30 text-sm">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {!editingDate ? (
                <>
                  <span className="text-muted-foreground text-xs">Expected delivery:</span>
                  {po.expectedDeliveryDate ? (
                    <span className={`font-medium text-xs ${
                      po.status !== "received" && po.status !== "cancelled" && isPast(parseISO(po.expectedDeliveryDate))
                        ? "text-red-600"
                        : "text-foreground"
                    }`}>
                      {format(parseISO(po.expectedDeliveryDate), "dd MMM yyyy")}
                      {po.status !== "received" && po.status !== "cancelled" && isPast(parseISO(po.expectedDeliveryDate)) && (
                        <span className="ml-1 text-red-500">(overdue)</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">Not set</span>
                  )}
                  {po.status !== "cancelled" && (
                    <button
                      onClick={() => { setDateInput(po.expectedDeliveryDate ?? ""); setEditingDate(true); }}
                      className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="h-6 text-xs w-36 py-0 px-1.5"
                  />
                  <Button
                    size="sm"
                    className="h-6 px-2 text-xs bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
                    disabled={updatingDate}
                    onClick={() => updateDeliveryDate({ id: id!, data: { expectedDeliveryDate: dateInput || null } })}
                  >
                    {updatingDate ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                  </Button>
                  <button onClick={() => setEditingDate(false)} className="text-muted-foreground hover:text-foreground">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            {/* Notes */}
            {po.notes && (
              <p className="flex-1 text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-2.5 border border-border/40">
                {po.notes}
              </p>
            )}
          </div>
        )}
        {/* Show delivery date picker even when there are no notes */}
        {!po.notes && po.expectedDeliveryDate === null && po.status !== "cancelled" && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/30 text-sm w-fit">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {!editingDate ? (
              <>
                <span className="text-muted-foreground text-xs">Expected delivery:</span>
                <span className="text-muted-foreground text-xs italic">Not set</span>
                <button
                  onClick={() => { setDateInput(""); setEditingDate(true); }}
                  className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="h-6 text-xs w-36 py-0 px-1.5"
                />
                <Button
                  size="sm"
                  className="h-6 px-2 text-xs bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
                  disabled={updatingDate}
                  onClick={() => updateDeliveryDate({ id: id!, data: { expectedDeliveryDate: dateInput || null } })}
                >
                  {updatingDate ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                </Button>
                <button onClick={() => setEditingDate(false)} className="text-muted-foreground hover:text-foreground">
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Line Items */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Line Items</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[11px]">{poLines.length} lines</Badge>
              <Badge variant="outline" className="text-[11px]">{po.totalQtyOrdered} units ordered</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 pb-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">SKU</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Product</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Ordered</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Received</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Unit Cost</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poLines.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{line.skuCode ?? "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{line.productName ?? line.productId}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{line.qtyOrdered}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-bold">
                      <span className={line.qtyReceived > 0 ? "text-green-700" : "text-muted-foreground"}>
                        {line.qtyReceived}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                      {line.unitCost != null ? `$${Number(line.unitCost).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        <LineStatusDot status={line.status} />
                        <span className="text-xs text-muted-foreground capitalize">{line.status.replace("_", " ")}</span>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Receive form */}
        {receiving && pendingLines.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/20">
            <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                Receive Stock — assign bin locations
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setReceiving(false)}>
                <RotateCcw className="w-3 h-3 mr-1" /> Cancel
              </Button>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              {pendingLines.map((line: any) => {
                const entry = receiveEntries[line.id];
                if (!entry) return null;
                const remaining = line.qtyOrdered - line.qtyReceived;
                return (
                  <div key={line.id} className="grid grid-cols-[1fr_auto] gap-4 items-start py-2 border-b border-amber-100 last:border-0">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-muted-foreground">{line.skuCode}</code>
                        <span className="text-sm font-medium">{line.productName}</span>
                        <span className="text-xs text-muted-foreground">({remaining} remaining)</span>
                      </div>
                      <BinSelector lineId={line.id} entry={entry} onChange={updateEntry} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground text-right">Qty to receive</p>
                      <Input
                        type="number"
                        min={1}
                        max={remaining}
                        value={entry.qty}
                        onChange={(e) => updateEntry(line.id, { qty: Math.min(remaining, Math.max(1, parseInt(e.target.value) || 1)) })}
                        className="w-20 h-8 text-right font-mono text-sm ml-auto"
                      />
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={submitReceive}
                  disabled={receivingPo}
                  className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
                >
                  {receivingPo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {receivingPo ? "Processing…" : "Confirm Receipt"}
                </Button>
                <Button variant="ghost" onClick={() => setReceiving(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {po.status === "received" && (
          <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            All lines fully received. Updated {formatDistanceToNow(new Date(po.updatedAt), { addSuffix: true })}.
          </div>
        )}

        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
          <Link href="/purchase-orders"><ArrowLeft className="w-3.5 h-3.5" /> Back to Purchase Orders</Link>
        </Button>
      </div>

      {/* Email dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Email Purchase Order
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              A formatted PDF-style email for <span className="font-medium text-foreground">{po?.poNumber}</span> will be sent to the address below.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Recipient email *</Label>
              <Input
                autoFocus
                type="email"
                placeholder="supplier@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEmailOpen(false)}>Cancel</Button>
            <Button
              disabled={!emailTo.trim() || sendingEmail}
              onClick={() => sendEmail({ id: id!, data: { to: emailTo.trim() } })}
              className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
            >
              {sendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              {sendingEmail ? "Sending…" : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
