import { useState } from "react";
import { useListWarehouses, useListZones } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  Plus,
  Loader2,
  Play,
  Trash2,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";

interface Schedule {
  id: string;
  warehouseId: string;
  zoneId?: string | null;
  frequency: string;
  assignedTo?: string | null;
  isActive: boolean;
  lastRunAt?: string | null;
  createdAt: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export default function CycleCountSchedulePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [zoneId, setZoneId] = useState<string>("__all__");
  const [frequency, setFrequency] = useState("weekly");
  const [assignedTo, setAssignedTo] = useState("");

  const { data: warehouses = [] } = useListWarehouses();
  const { data: zones = [] } = useListZones(warehouseId, {
    query: { enabled: !!warehouseId, queryKey: ["zones", warehouseId] },
  });

  const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: ["cycle-counts", "schedules"],
    queryFn: async () => {
      const res = await fetch("/api/cycle-counts/schedules", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load schedules");
      return res.json();
    },
  });

  const handleCreate = async () => {
    if (!warehouseId) {
      toast({ title: "Warehouse required", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch("/api/cycle-counts/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          warehouseId,
          zoneId: zoneId === "__all__" ? null : zoneId,
          frequency,
          assignedTo: assignedTo.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create schedule");
      toast({ title: "Schedule created" });
      setShowForm(false);
      setWarehouseId("");
      setZoneId("__all__");
      setFrequency("weekly");
      setAssignedTo("");
      qc.invalidateQueries({ queryKey: ["cycle-counts", "schedules"] });
    } catch {
      toast({ title: "Failed to create schedule", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/cycle-counts/schedules/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Schedule removed" });
      qc.invalidateQueries({ queryKey: ["cycle-counts", "schedules"] });
    } catch {
      toast({ title: "Failed to delete schedule", variant: "destructive" });
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      const res = await fetch(`/api/cycle-counts/schedules/${id}/run`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to run");
      toast({ title: "Schedule marked as run" });
      qc.invalidateQueries({ queryKey: ["cycle-counts", "schedules"] });
    } catch {
      toast({ title: "Failed to update schedule", variant: "destructive" });
    }
  };

  const getWarehouseName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? id;
  const getZoneName = (id: string) => zones.find((z) => z.id === id)?.name;

  return (
    <Layout>
      <PageHeader
        title="Cycle Count Schedule"
        subtitle="Schedule recurring physical inventory counts by warehouse and zone"
        action={
          <Button onClick={() => setShowForm(!showForm)} className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white">
            <Plus className="w-4 h-4" />
            New Schedule
          </Button>
        }
      />

      <div className="p-6 max-w-5xl space-y-6">
        {/* Create form */}
        {showForm && (
          <Card className="border-border/60">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-muted-foreground" />
                New Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Warehouse *</Label>
                  <Select value={warehouseId} onValueChange={(v) => { setWarehouseId(v); setZoneId("__all__"); }}>
                    <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                    <SelectContent>
                      {warehouses.filter((w) => w.isActive).map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Zone (optional)</Label>
                  <Select value={zoneId} onValueChange={setZoneId} disabled={!warehouseId}>
                    <SelectTrigger><SelectValue placeholder="All zones" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All zones</SelectItem>
                      {zones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Assigned To (optional)</Label>
                  <Input
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    placeholder="Operator name"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleCreate} className="gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Create Schedule
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedules table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : schedules.length === 0 ? (
          <Card className="border-dashed border-border/60">
            <CardContent className="py-12 text-center">
              <CalendarClock className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">No schedules yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create a schedule to automate recurring cycle counts.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/60">
            <CardContent className="p-0 pb-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Scope</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Frequency</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Assigned To</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Last Run</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">
                        <span className="font-medium">{getWarehouseName(s.warehouseId)}</span>
                        {s.zoneId && (
                          <span className="text-muted-foreground"> › {getZoneName(s.zoneId) ?? s.zoneId}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px]">
                          {FREQUENCY_LABELS[s.frequency] ?? s.frequency}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.assignedTo ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.lastRunAt ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(s.lastRunAt), "MMM d, yyyy")}
                          </span>
                        ) : (
                          "Never"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleRunNow(s.id)} title="Mark as run now">
                            <Play className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => handleDelete(s.id)} title="Remove schedule">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
