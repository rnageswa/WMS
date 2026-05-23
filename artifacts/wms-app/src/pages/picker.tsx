import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useGetSalesOrders,
  useCreatePickingTask,
  useGetPickingTasks,
  useGetPickingTask,
  useStartPickingTask,
  usePickPickingLine,
  useCompletePickingTask,
  useListWarehouses,
  useListZones,
  useListBins,
  useListInventory,
  getListZonesQueryKey,
  getListBinsQueryKey,
  getListInventoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle, Package, Search, Barcode, XCircle, Printer,
  ClipboardList, Tag, Play, Warehouse, MapPin, Loader2,
  ArrowRight, Camera, WifiOff, Users,
} from "lucide-react";
import { ScanModal } from "@/components/scan-modal";
import { useToast } from "@/hooks/use-toast";
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { format } from "date-fns";
import LabelPrint from "@/components/label-print";
import type { LabelData } from "@/components/label-print";

const taskStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const lineStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  picking: "bg-amber-100 text-amber-700",
  picked: "bg-green-100 text-green-700",
  short: "bg-red-100 text-red-700",
};

// ── Inline location selectors for pick lines ───────────────────────────

function LineZoneSelect({ warehouseId, value, onChange }: { warehouseId: string; value: string; onChange: (v: string) => void }) {
  const { data: zones = [] } = useListZones(warehouseId, {
    query: { enabled: !!warehouseId, queryKey: getListZonesQueryKey(warehouseId) },
  });
  return (
    <Select value={value} onValueChange={onChange} disabled={!warehouseId}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Zone" /></SelectTrigger>
      <SelectContent>
        {zones.map((z: any) => (
          <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LineBinSelect({ zoneId, productId, value, onChange }: { zoneId: string; productId: string; value: string; onChange: (v: string) => void }) {
  const { data: bins = [] } = useListBins(zoneId, {
    query: { enabled: !!zoneId, queryKey: getListBinsQueryKey(zoneId) },
  });
  const { data: inventory = [] } = useListInventory(
    { productId: productId || undefined, binId: undefined, warehouseId: undefined, lowStock: false },
    { query: { enabled: !!productId, queryKey: getListInventoryQueryKey({ productId: productId || undefined, binId: undefined, warehouseId: undefined, lowStock: false }) } },
  );
  const stockByBin = Object.fromEntries(inventory.map((i: any) => [(i as any).bin?.id ?? "", i.qtyOnHand]));

  return (
    <Select value={value} onValueChange={onChange} disabled={!zoneId}>
      <SelectTrigger className="h-8 text-xs font-mono"><SelectValue placeholder="Bin" /></SelectTrigger>
      <SelectContent>
        {bins.map((b: any) => {
          const stock = stockByBin[b.id] ?? 0;
          return (
            <SelectItem key={b.id} value={b.id}>
              {b.code}{b.name ? ` — ${b.name}` : ""}
              <span className={`ml-2 text-xs ${stock === 0 ? "text-red-500" : "text-muted-foreground"}`}>
                ({stock})
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

// ── Main page ──────────────────────────────────────────────────────────

export default function PickerPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { isOnline } = useNetworkStatus();

  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [selectedLaborEntryId, setSelectedLaborEntryId] = useState<string>("");
  const [scanInput, setScanInput] = useState("");
  const [lastScan, setLastScan] = useState<{ type: string; message: string } | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [labelPrintOpen, setLabelPrintOpen] = useState(false);
  const [pendingComplete, setPendingComplete] = useState(false);

  // Per-line location overrides: keyed by line id → { warehouseId, zoneId, binId }
  const [lineLocations, setLineLocations] = useState<Record<string, { warehouseId: string; zoneId: string; binId: string }>>({});

  const getLineLocation = (lineId: string) => lineLocations[lineId] || { warehouseId: "", zoneId: "", binId: "" };
  const setLineWarehouse = (lineId: string, warehouseId: string) =>
    setLineLocations((prev) => ({ ...prev, [lineId]: { ...(prev[lineId] || { zoneId: "", binId: "" }), warehouseId, zoneId: "", binId: "" } }));
  const setLineZone = (lineId: string, zoneId: string) =>
    setLineLocations((prev) => ({ ...prev, [lineId]: { ...(prev[lineId] || { warehouseId: "", binId: "" }), zoneId, binId: "" } }));
  const setLineBin = (lineId: string, binId: string) =>
    setLineLocations((prev) => ({ ...prev, [lineId]: { ...(prev[lineId] || { warehouseId: "", zoneId: "" }), binId } }));

  // Fetch orders in picking status
  const { data: pickingOrders = [], isLoading: ordersLoading } = useGetSalesOrders({ status: "picking" });

  // Fetch all picking tasks
  const { data: allTasks = [] } = useGetPickingTasks();

  // Fetch selected task detail with lines
  const { data: task, refetch: refetchTask } = useGetPickingTask(
    { pathParams: { id: selectedTaskId } },
    { query: { enabled: !!selectedTaskId } }
  );

  // Warehouses for location selectors
  const { data: warehouses = [] } = useListWarehouses();

  // Labor entries for worker assignment
  const { data: laborEntries = [] } = useQuery({
    queryKey: ["labor", "entries"],
    queryFn: async () => {
      const res = await fetch("/api/labor/entries", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Base mutations (hooks must be called at top level)
  const baseCreateTask = useCreatePickingTask();
  const baseStartTask = useStartPickingTask();
  const basePickLine = usePickPickingLine();
  const baseCompleteTask = useCompletePickingTask();

  // Offline-aware wrappers
  const createTaskMutation = useOfflineMutation({
    mutationFn: (vars: { body: { orderId: string } }) => baseCreateTask.mutateAsync(vars),
    url: "/api/picking-tasks",
    entityType: "pick-task",
    entityIdExtractor: (vars) => vars.body.orderId,
    invalidateKeys: ["picking-tasks"],
    successMessage: "Picking task created",
  });

  const startMutation = useOfflineMutation({
    mutationFn: (vars: { pathParams: { id: string } }) => baseStartTask.mutateAsync(vars),
    url: (vars) => `/api/picking-tasks/${vars.pathParams.id}/start`,
    method: "PUT",
    entityType: "pick-task",
    entityIdExtractor: (vars) => vars.pathParams.id,
    invalidateKeys: ["picking-tasks"],
    successMessage: "Picking started",
  });

  const pickLineMutation = useOfflineMutation({
    mutationFn: (vars: { pathParams: { id: string; lineId: string }; body: { qtyPicked: number; binId?: string } }) =>
      basePickLine.mutateAsync(vars),
    url: (vars) => `/api/picking-tasks/${vars.pathParams.id}/lines/${vars.pathParams.lineId}/pick`,
    method: "PUT",
    entityType: "pick-line",
    entityIdExtractor: (vars) => vars.pathParams.lineId,
    invalidateKeys: ["picking-tasks"],
  });

  const completeMutation = useOfflineMutation({
    mutationFn: (vars: { pathParams: { id: string } }) => baseCompleteTask.mutateAsync(vars),
    url: (vars) => `/api/picking-tasks/${vars.pathParams.id}/complete`,
    method: "PUT",
    entityType: "pick-task",
    entityIdExtractor: (vars) => vars.pathParams.id,
    invalidateKeys: ["picking-tasks", "sales-orders"],
    successMessage: "Picking complete!",
  });

  const lines = (task as any)?.lines || [];
  const taskStatus = (task as any)?.status || "pending";
  const orderNumber = (task as any)?.orderNumber || "";
  const customerName = (task as any)?.customerName || "";

  const labelData: LabelData[] = lines.map((l: any) => ({
    productId: l.productId,
    skuCode: l.skuCode || "",
    productName: l.productName || "",
  }));

  // ── Select order → find or create task ───────────────────────────────
  const handleSelectOrder = useCallback(async (orderId: string) => {
    setSelectedOrderId(orderId);
    setLastScan(null);
    setScanInput("");

    const existingTask = allTasks.find((t: any) => t.orderId === orderId && !["completed", "cancelled"].includes(t.status));
    if (existingTask) {
      setSelectedTaskId(existingTask.id);
      return;
    }

    try {
      const newTask = await createTaskMutation.mutateAsync({
        body: {
          orderId,
          laborEntryId: selectedLaborEntryId || undefined,
        } as any,
      });
      setSelectedTaskId(newTask.id);
      toast({ title: "Picking task created", description: "Start picking when ready." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create picking task", variant: "destructive" });
    }
  }, [allTasks, createTaskMutation, toast]);

  // ── Pick a line (with optional bin override) ─────────────────────────
  const handlePickLine = useCallback(async (lineId: string, qtyPicked: number, binId?: string) => {
    if (!selectedTaskId) return;
    try {
      await pickLineMutation.mutateAsync({
        pathParams: { id: selectedTaskId, lineId },
        body: { qtyPicked, binId },
      });
      refetchTask();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }, [selectedTaskId, pickLineMutation, refetchTask, toast]);

  // ── Scan to pick a line ──────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    if (!scanInput.trim() || !selectedTaskId) return;
    const scanned = scanInput.trim();
    setScanInput("");

    const matchingLine = lines.find((l: any) => {
      const sku = (l.skuCode || "").toLowerCase();
      const binCode = (l.binCode || "").toLowerCase();
      return sku === scanned.toLowerCase() || binCode === scanned.toLowerCase();
    });

    if (!matchingLine) {
      setLastScan({ type: "error", message: `No match for: ${scanned}` });
      toast({ title: "No match", description: `No pick line matches "${scanned}"`, variant: "destructive" });
      return;
    }
    if (matchingLine.status === "picked") {
      setLastScan({ type: "info", message: `Already picked: ${matchingLine.skuCode}` });
      return;
    }

    await handlePickLine(matchingLine.id, matchingLine.qtyToPick);
    setLastScan({
      type: "success",
      message: `Picked: ${matchingLine.skuCode} (${matchingLine.qtyToPick}) from ${matchingLine.binCode || "—"}`,
    });
    toast({ title: "Pick confirmed", description: `${matchingLine.skuCode} picked.` });
  }, [scanInput, selectedTaskId, lines, handlePickLine, toast]);

  // Auto-focus scan input
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = document.querySelector('[data-scan-input="true"]') as HTMLInputElement;
      if (el) el.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [scanInput]);

  // ── Start picking ────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!selectedTaskId) return;
    try {
      await startMutation.mutateAsync({ pathParams: { id: selectedTaskId } });
      toast({ title: "Picking started" });
      refetchTask();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // ── Complete task → advances order to picking_complete ───────────────
  const allPicked = lines.length > 0 && lines.every((l: any) => l.status === "picked");

  const handleComplete = async () => {
    if (!selectedTaskId) return;
    setPendingComplete(true);
    try {
      await completeMutation.mutateAsync({ pathParams: { id: selectedTaskId } });
      toast({ title: "Picking complete!", description: "Order advanced to next step." });
      // Invalidate orders list so this order disappears from "picking"
      qc.invalidateQueries({ queryKey: ["sales-orders"] });
      // Clear selection so order drops from list
      setSelectedOrderId("");
      setSelectedTaskId("");
      setLastScan(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPendingComplete(false);
    }
  };

  // ── Print pick list ──────────────────────────────────────────────────
  const handlePrintPickList = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !task) return;
    const totalToPick = lines.reduce((sum: number, l: any) => sum + (l.qtyToPick || 0), 0);
    const totalPicked = lines.reduce((sum: number, l: any) => sum + (l.qtyPicked || 0), 0);
    const rows = lines.map((line: any, idx: number) => `
      <tr style="background: ${idx % 2 === 0 ? "#f9fafb" : "#ffffff"}">
        <td style="padding: 10px 12px; color: #9ca3af;">${idx + 1}</td>
        <td style="padding: 10px 12px; font-family: monospace; font-size: 12px; color: #6b7280;">${line.skuCode || "—"}</td>
        <td style="padding: 10px 12px; font-weight: 600; color: #111827;">${line.productName || line.productId}</td>
        <td style="padding: 10px 12px; text-align: center; font-weight: 600;">${line.qtyToPick}</td>
        <td style="padding: 10px 12px; text-align: center; font-weight: 600; color: ${line.qtyPicked > 0 ? "#15803d" : "#9ca3af"};">${line.qtyPicked || 0}</td>
        <td style="padding: 10px 12px; font-family: monospace; font-size: 12px; color: #6b7280;">${line.binCode || "—"}</td>
        <td style="padding: 10px 12px; text-align: center;">
          <span style="padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; background: ${line.status === "picked" ? "#dcfce7" : "#fef3c7"}; color: ${line.status === "picked" ? "#15803d" : "#92400e"};">${line.status}</span>
        </td>
      </tr>
    `).join("");
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Pick List - ${orderNumber}</title><style>body{font-family:system-ui,sans-serif;margin:0;padding:16mm 18mm}@page{margin:16mm 18mm;size:A4}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#0f2540;color:#fff;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px}</style></head><body>
      <div style="display:flex;justify-content:space-between;margin-bottom:24px"><div><div style="font-size:24px;font-weight:700;color:#0f2540"><span style="color:#E8622A">Ware</span>IQ</div><div style="font-size:11px;color:#6b7280">Pick List</div></div><div style="text-align:right"><div style="font-size:28px;font-weight:800;color:#0f2540">PICK LIST</div><div style="font-size:16px;font-family:monospace;font-weight:600;color:#E8622A">${orderNumber}</div><div style="margin-top:4px;display:inline-block;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:600;background:#fef3c7;color:#92400e">${taskStatus}</div></div></div>
      <div style="border-top:2px solid #0f2540;margin-bottom:20px"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px"><div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:6px">Customer</div><div style="font-weight:700;color:#0f2540">${customerName}</div></div><div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:6px">Details</div><div style="font-size:13px;display:flex;justify-content:space-between"><span style="color:#6b7280">Created</span><span style="font-weight:500">${format(new Date((task as any)?.createdAt || new Date()), "dd MMMM yyyy")}</span></div></div></div>
      <table><thead><tr><th>#</th><th>SKU</th><th>Product</th><th style="text-align:center">To Pick</th><th style="text-align:center">Picked</th><th>Bin</th><th style="text-align:center">Status</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:24px"><div style="padding:12px;background:#f9fafb;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700">${lines.length}</div><div style="font-size:12px;color:#6b7280">Total Lines</div></div><div style="padding:12px;background:#f9fafb;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700">${totalToPick}</div><div style="font-size:12px;color:#6b7280">Items to Pick</div></div><div style="padding:12px;background:#f9fafb;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#15803d">${totalPicked}</div><div style="font-size:12px;color:#6b7280">Items Picked</div></div></div>
      <div style="margin-top:24px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:11px;color:#d1d5db">Generated by WareIQ · ${format(new Date(), "dd MMMM yyyy, HH:mm")} · ${orderNumber}</div>
    </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <Layout>
      <PageHeader
        title="Picker View"
        subtitle="Select an order, choose pick locations, then scan or click to confirm each line"
        helpKey="/picker"
        action={
          <div className="flex gap-2">
            {selectedTaskId && task && (
              <>
                <Button variant="outline" onClick={handlePrintPickList}>
                  <Printer className="w-4 h-4 mr-1" />Print
                </Button>
                <Button variant="outline" onClick={() => setLabelPrintOpen(true)}>
                  <Tag className="w-4 h-4 mr-1" />SKU Labels
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-6xl mx-auto">

        {/* ── Orders Ready to Pick ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Orders Ready to Pick ({pickingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading && <div className="text-center py-4 text-muted-foreground">Loading...</div>}
            {!ordersLoading && pickingOrders.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No orders in picking status.</p>
                <p className="text-sm mt-1">Confirm an order and start picking from the sales order page.</p>
              </div>
            )}
            {!ordersLoading && pickingOrders.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pickingOrders.map((o: any) => (
                    <TableRow key={o.id} className={selectedOrderId === o.id ? "bg-muted/50" : ""}>
                      <TableCell className="font-mono">{o.orderNumber}</TableCell>
                      <TableCell>{o.customerName}</TableCell>
                      <TableCell><Badge>{o.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.createdAt ? format(new Date(o.createdAt), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant={selectedOrderId === o.id ? "default" : "outline"} onClick={() => handleSelectOrder(o.id)}>
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

        {/* ── Scan Section ─────────────────────────────────────────────── */}
        {selectedTaskId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Barcode className="w-5 h-5" />
                Scan to Pick Line
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg text-sm flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono font-medium">{orderNumber}</span>
                </div>
                <div className="text-muted-foreground">·</div>
                <div>{customerName}</div>
                {!isOnline && (
                  <>
                    <div className="text-muted-foreground">·</div>
                    <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                      <WifiOff className="w-3 h-3 mr-1" />Offline
                    </Badge>
                  </>
                )}
                <div className="ml-auto"><Badge className={taskStatusColors[taskStatus] || ""}>{taskStatus}</Badge></div>
              </div>

              {/* Worker assignment */}
              <div className="flex items-center gap-3 p-3 bg-blue-50/40 border border-blue-200/60 rounded-lg">
                <Users className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="flex-1 min-w-[200px] max-w-xs">
                  <Label className="text-xs text-blue-600 mb-1 block">Assign Worker (optional)</Label>
                  <Select value={selectedLaborEntryId} onValueChange={setSelectedLaborEntryId}>
                    <SelectTrigger className="h-8 text-sm bg-white">
                      <SelectValue placeholder="Select worker…" />
                    </SelectTrigger>
                    <SelectContent>
                      {laborEntries.map((e: any) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.workerId} — {e.shiftDate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedLaborEntryId && (
                  <button
                    onClick={() => setSelectedLaborEntryId("")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    Clear
                  </button>
                )}
              </div>

              {createTaskMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />Creating picking task...
                </div>
              )}

              {(taskStatus === "pending" || taskStatus === "assigned") && !createTaskMutation.isPending && (
                <Button onClick={handleStart} className="gap-2">
                  <Play className="w-4 h-4" />Start Picking
                </Button>
              )}

              {taskStatus === "in_progress" && (
                <>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="scan-input" className="text-xs text-muted-foreground">Scan bin code or SKU</Label>
                      <Input id="scan-input" data-scan-input="true" value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleScan(); } }}
                        placeholder="Scan or type bin code / SKU..." className="font-mono" autoFocus />
                    </div>
                    <Button onClick={handleScan} disabled={!scanInput.trim()} className="self-end">
                      <Search className="w-4 h-4 mr-1" />Confirm
                    </Button>
                    <Button variant="outline" className="self-end" onClick={() => setScanModalOpen(true)} title="Scan with camera">
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>
                  <ScanModal
                    open={scanModalOpen}
                    onClose={() => setScanModalOpen(false)}
                    onScan={(value) => { setScanInput(value); setScanModalOpen(false); }}
                    title="Scan Pick Line"
                  />
                  {lastScan && (
                    <div className={`p-3 rounded-md text-sm ${lastScan.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : lastScan.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                      {lastScan.type === "success" && <CheckCircle className="w-4 h-4 inline mr-1" />}
                      {lastScan.type === "error" && <XCircle className="w-4 h-4 inline mr-1" />}
                      {lastScan.message}
                    </div>
                  )}
                </>
              )}

              {taskStatus === "completed" && (
                <div className="p-3 rounded-md text-sm bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle className="w-4 h-4 inline mr-1" />Task completed. Order advanced.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Pick Lines with Location Selectors ────────────────────────── */}
        {selectedTaskId && lines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Pick Lines — {orderNumber}
                </span>
                <div className="flex items-center gap-2">
                  {allPicked && taskStatus === "in_progress" && (
                    <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />All Picked</Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={handlePrintPickList}>
                    <Printer className="w-4 h-4 mr-1" />Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLabelPrintOpen(true)}>
                    <Tag className="w-4 h-4 mr-1" />Labels
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-xl font-bold">{lines.length}</div>
                  <div className="text-xs text-muted-foreground">Total Lines</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-xl font-bold">{lines.reduce((s: number, l: any) => s + (l.qtyToPick || 0), 0)}</div>
                  <div className="text-xs text-muted-foreground">To Pick</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-xl font-bold text-green-700">{lines.reduce((s: number, l: any) => s + (l.qtyPicked || 0), 0)}</div>
                  <div className="text-xs text-muted-foreground">Picked</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-xl font-bold text-amber-700">{lines.filter((l: any) => l.status !== "picked").length}</div>
                  <div className="text-xs text-muted-foreground">Remaining</div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">To Pick</TableHead>
                    <TableHead className="text-center">Picked</TableHead>
                    <TableHead><div className="flex items-center gap-1"><Warehouse className="w-3 h-3" /> Warehouse</div></TableHead>
                    <TableHead><div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Zone</div></TableHead>
                    <TableHead><div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Bin</div></TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line: any, idx: number) => {
                    const isPicked = line.status === "picked";
                    const isInProgress = taskStatus === "in_progress";
                    const canPick = isInProgress && !isPicked;
                    const loc = getLineLocation(line.id);

                    // Use line's existing bin if present, otherwise user-selected bin
                    const effectiveBinId = line.binId || loc.binId;
                    const effectiveWarehouseId = loc.warehouseId;
                    const effectiveZoneId = loc.zoneId;
                    const effectiveUserBinId = loc.binId;

                    return (
                      <TableRow key={line.id} className={isPicked ? "bg-green-50/50" : ""}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{line.skuCode || "—"}</TableCell>
                        <TableCell className="font-medium text-sm">{line.productName || line.productId}</TableCell>
                        <TableCell className="text-center font-bold">{line.qtyToPick}</TableCell>
                        <TableCell className="text-center font-bold">{line.qtyPicked || 0}</TableCell>

                        {/* Warehouse */}
                        <TableCell>
                          {isPicked ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <Select value={effectiveWarehouseId} onValueChange={(v) => setLineWarehouse(line.id, v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Whs" /></SelectTrigger>
                              <SelectContent>
                                {warehouses.filter((w: any) => w.isActive).map((w: any) => (
                                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>

                        {/* Zone */}
                        <TableCell>
                          {isPicked ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <LineZoneSelect warehouseId={effectiveWarehouseId} value={effectiveZoneId} onChange={(v) => setLineZone(line.id, v)} />
                          )}
                        </TableCell>

                        {/* Bin */}
                        <TableCell>
                          {isPicked ? (
                            <Badge variant="outline" className="font-mono text-xs">
                              <MapPin className="w-3 h-3 mr-1" />{line.binCode || "—"}
                            </Badge>
                          ) : (
                            <LineBinSelect zoneId={effectiveZoneId} productId={line.productId} value={effectiveUserBinId} onChange={(v) => setLineBin(line.id, v)} />
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge className={lineStatusColors[line.status] || ""}>{line.status}</Badge>
                        </TableCell>

                        <TableCell>
                          {canPick && effectiveBinId && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                              onClick={() => handlePickLine(line.id, line.qtyToPick, effectiveBinId)}
                              disabled={pickLineMutation.isPending}>
                              <ArrowRight className="w-3 h-3" />Pick
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {allPicked && taskStatus === "in_progress" && (
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleComplete} disabled={pendingComplete} className="bg-green-600 hover:bg-green-700 gap-2">
                    {pendingComplete ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Complete Picking
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <LabelPrint open={labelPrintOpen} onClose={() => setLabelPrintOpen(false)} labels={labelData} />
    </Layout>
  );
}
