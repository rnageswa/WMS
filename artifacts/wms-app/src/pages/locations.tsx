import { useState } from "react";
import { Link } from "wouter";
import {
  useListWarehouses,
  useGetWarehouse,
  useCreateZone,
  useCreateBin,
  useListZones,
  useListBins,
  useGetZoneActivity,
  useGetBinActivity,
  getGetWarehouseQueryKey,
  getListWarehousesQueryKey,
  getListZonesQueryKey,
  getListBinsQueryKey,
  type ZoneActivityItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Warehouse,
  Layers,
  Grid3X3,
  Loader2,
  Tag,
  Flame,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";

// ── Zone Activity Heatmap ───────────────────────────────────────────────────

const DAYS_OPTIONS = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

function heatColor(count: number, max: number): string {
  if (max === 0 || count === 0) return "bg-muted/40 text-muted-foreground border-border/40";
  const ratio = count / max;
  if (ratio < 0.25) return "bg-orange-50 text-orange-700 border-orange-100";
  if (ratio < 0.55) return "bg-orange-100 text-orange-800 border-orange-200";
  if (ratio < 0.8) return "bg-orange-300 text-orange-900 border-orange-400";
  return "bg-[#E8622A] text-white border-[#c9521f]";
}

function BinDrillDown({ zone, days }: { zone: ZoneActivityItem; days: number }) {
  const { data: bins, isLoading } = useGetBinActivity({ zoneId: zone.zoneId, days });
  const maxBinCount = bins ? Math.max(...bins.map((b) => b.movementCount), 1) : 1;

  return (
    <div className="mt-3 border border-border/50 rounded-lg bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/40">
        <Grid3X3 className="w-3.5 h-3.5 text-primary/70" />
        <span className="text-xs font-semibold">
          {zone.zoneCode} · {zone.zoneName}
        </span>
        <span className="text-[10px] text-muted-foreground">{zone.warehouseName}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          last {days}d
        </span>
      </div>
      <div className="divide-y divide-border/30">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : !bins?.length ? (
          <p className="text-xs text-muted-foreground p-3">No bins in this zone.</p>
        ) : (
          bins.map((bin) => {
            const pct = maxBinCount > 0 ? Math.round((bin.movementCount / maxBinCount) * 100) : 0;
            const lastMoved = bin.lastMovementAt
              ? new Date(bin.lastMovementAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              : null;
            return (
              <div key={bin.binId} className="flex items-center gap-3 px-3 py-2">
                <span className="font-mono text-xs font-semibold w-12 shrink-0">{bin.binCode}</span>
                {bin.binName && (
                  <span className="text-[11px] text-muted-foreground w-28 truncate shrink-0">{bin.binName}</span>
                )}
                <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#E8622A] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums w-6 text-right shrink-0">
                  {bin.movementCount}
                </span>
                {lastMoved && (
                  <span className="text-[10px] text-muted-foreground w-14 text-right shrink-0">{lastMoved}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ActivityHeatmap() {
  const [days, setDays] = useState(30);
  const [collapsed, setCollapsed] = useState(false);
  const [selectedZone, setSelectedZone] = useState<ZoneActivityItem | null>(null);
  const { data, isLoading } = useGetZoneActivity({ days });

  const maxCount = data ? Math.max(...data.map((z) => z.movementCount), 0) : 0;

  const handleZoneClick = (zone: ZoneActivityItem) => {
    setSelectedZone((prev) => (prev?.zoneId === zone.zoneId ? null : zone));
  };

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-2 px-4 py-3 bg-card hover:bg-muted/20 cursor-pointer transition-colors select-none"
        onClick={() => setCollapsed((v) => !v)}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
        <Flame className="w-4 h-4 text-[#E8622A]" />
        <span className="font-semibold text-sm">Zone Activity Heatmap</span>
        <span className="text-xs text-muted-foreground ml-1">— click a zone to see bin breakdown</span>
        <div className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {DAYS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                days === opt.value
                  ? "bg-[#E8622A] text-white border-[#E8622A]"
                  : "bg-background text-muted-foreground border-border hover:border-[#E8622A] hover:text-[#E8622A]"
              }`}
              onClick={() => { setDays(opt.value); setSelectedZone(null); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 py-4 bg-muted/10">
          {isLoading ? (
            <div className="flex flex-wrap gap-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-36 rounded-lg" />
              ))}
            </div>
          ) : !data?.length ? (
            <p className="text-sm text-muted-foreground py-2">No zones found.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {data.map((zone) => (
                  <ZoneCell
                    key={zone.zoneId}
                    zone={zone}
                    maxCount={maxCount}
                    selected={selectedZone?.zoneId === zone.zoneId}
                    onClick={handleZoneClick}
                  />
                ))}
              </div>

              {selectedZone && (
                <div className="relative">
                  <button
                    className="absolute top-5 right-1 z-10 text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedZone(null)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <BinDrillDown zone={selectedZone} days={days} />
                </div>
              )}

              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/40">
                <span className="text-[11px] text-muted-foreground font-medium">Activity:</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { label: "None", cls: "bg-muted/40 border-border/40" },
                    { label: "Low", cls: "bg-orange-50 border-orange-100" },
                    { label: "Med", cls: "bg-orange-100 border-orange-200" },
                    { label: "High", cls: "bg-orange-300 border-orange-400" },
                    { label: "Peak", cls: "bg-[#E8622A] border-[#c9521f]" },
                  ].map(({ label, cls }) => (
                    <div key={label} className="flex items-center gap-1">
                      <div className={`w-3 h-3 rounded-sm border ${cls}`} />
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground ml-auto">
                  Last {days} days · {data.filter((z) => z.movementCount > 0).length} of {data.length} zones active
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ZoneCell({
  zone,
  maxCount,
  selected,
  onClick,
}: {
  zone: ZoneActivityItem;
  maxCount: number;
  selected: boolean;
  onClick: (zone: ZoneActivityItem) => void;
}) {
  const colorCls = heatColor(zone.movementCount, maxCount);
  const lastMoved = zone.lastMovementAt
    ? new Date(zone.lastMovementAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <div
      className={`border-2 rounded-lg px-3 py-2.5 w-36 flex-shrink-0 cursor-pointer transition-all hover:shadow-md ${colorCls} ${
        selected ? "ring-2 ring-offset-1 ring-foreground/30 scale-[1.03] shadow-md" : "hover:scale-[1.02]"
      }`}
      onClick={() => onClick(zone)}
      title={`Click to see bin breakdown`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-mono font-bold text-sm leading-tight">{zone.zoneCode}</span>
        <span className="text-xs font-semibold tabular-nums">{zone.movementCount}</span>
      </div>
      <p className="text-[11px] leading-snug mt-0.5 truncate opacity-80">{zone.zoneName}</p>
      <p className="text-[10px] leading-snug truncate opacity-60">{zone.warehouseName}</p>
      {lastMoved && (
        <p className="text-[9px] leading-snug mt-1 opacity-50">Last {lastMoved}</p>
      )}
    </div>
  );
}

function BinRow({ zoneId }: { zoneId: string }) {
  const { data: bins, isLoading } = useListBins(zoneId, {
    query: { enabled: !!zoneId, queryKey: getListBinsQueryKey(zoneId) },
  });
  if (isLoading) return <Skeleton className="h-4 w-40 ml-16 my-2" />;
  if (!bins?.length) return <p className="ml-16 py-2 text-xs text-muted-foreground">No bins yet</p>;
  return (
    <div className="ml-16 border-l border-border/40 pl-3 py-1 space-y-0.5">
      {bins.map((bin) => (
        <div key={bin.id} className="flex items-center gap-2 py-1 text-sm" data-testid={`bin-${bin.id}`}>
          <Grid3X3 className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="font-mono text-xs font-medium">{bin.code}</span>
          {bin.name && <span className="text-muted-foreground text-xs">{bin.name}</span>}
        </div>
      ))}
    </div>
  );
}

function ZoneRow({
  zone,
  onAddBin,
}: {
  zone: { id: string; name: string; code: string };
  onAddBin: (zoneId: string, zoneName: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div
        className="flex items-center gap-2 ml-8 px-3 py-2 hover:bg-muted/30 rounded cursor-pointer group transition-colors"
        onClick={() => setOpen((v) => !v)}
        data-testid={`zone-${zone.id}`}
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <Layers className="w-3.5 h-3.5 text-primary/70" />
        <span className="text-sm font-medium">{zone.name}</span>
        <span className="text-xs text-muted-foreground font-mono">({zone.code})</span>
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 ml-auto opacity-0 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onAddBin(zone.id, zone.name); }}
          data-testid={`add-bin-${zone.id}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {open && <BinRow zoneId={zone.id} />}
    </div>
  );
}

function WarehouseRow({
  warehouse,
  onAddZone,
  onAddBin,
}: {
  warehouse: { id: string; name: string; isActive: boolean };
  onAddZone: (warehouseId: string, warehouseName: string) => void;
  onAddBin: (zoneId: string, zoneName: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const { data: zones, isLoading } = useListZones(warehouse.id, {
    query: {
      enabled: open,
      queryKey: getListZonesQueryKey(warehouse.id),
    },
  });

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-2.5 px-4 py-3 bg-card hover:bg-muted/20 cursor-pointer transition-colors"
        onClick={() => setOpen((v) => !v)}
        data-testid={`warehouse-${warehouse.id}`}
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <Warehouse className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">{warehouse.name}</span>
        {warehouse.isActive ? (
          <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 ml-1">Active</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] ml-1">Inactive</Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto text-xs h-7"
          onClick={(e) => { e.stopPropagation(); onAddZone(warehouse.id, warehouse.name); }}
          data-testid={`add-zone-${warehouse.id}`}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Zone
        </Button>
      </div>
      {open && (
        <div className="py-1.5 bg-muted/10">
          {isLoading ? (
            <Skeleton className="h-4 w-40 ml-8 my-2" />
          ) : !zones?.length ? (
            <p className="ml-8 py-2 text-xs text-muted-foreground">No zones yet</p>
          ) : (
            zones.map((zone) => (
              <ZoneRow key={zone.id} zone={zone} onAddBin={onAddBin} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function Locations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [zoneDialog, setZoneDialog] = useState<{ warehouseId: string; warehouseName: string } | null>(null);
  const [binDialog, setBinDialog] = useState<{ zoneId: string; zoneName: string } | null>(null);

  const { data: warehouses, isLoading } = useListWarehouses();

  const zoneForm = useForm({ defaultValues: { name: "", code: "" } });
  const binForm = useForm({ defaultValues: { code: "", name: "" } });

  const createZone = useCreateZone({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListZonesQueryKey(zoneDialog?.warehouseId ?? "") });
        queryClient.invalidateQueries({ queryKey: getGetWarehouseQueryKey(zoneDialog?.warehouseId ?? "") });
        toast({ title: "Zone created" });
        setZoneDialog(null);
        zoneForm.reset();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.response?.data?.message ?? "Failed", variant: "destructive" });
      },
    },
  });

  const createBin = useCreateBin({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBinsQueryKey(binDialog?.zoneId ?? "") });
        toast({ title: "Bin created" });
        setBinDialog(null);
        binForm.reset();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.response?.data?.message ?? "Failed", variant: "destructive" });
      },
    },
  });

  return (
    <Layout>
      <PageHeader
        title="Locations"
        subtitle="Warehouse / Zone / Bin hierarchy"
        action={
          <div className="flex items-center gap-2">
            <Link href="/locations/labels">
              <Button size="sm" variant="outline">
                <Tag className="w-4 h-4 mr-1.5" />
                Print Labels
              </Button>
            </Link>
            <Link href="/locations/new">
              <Button size="sm" data-testid="button-new-warehouse">
                <Plus className="w-4 h-4 mr-1.5" />
                New Warehouse
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-3">
        <ActivityHeatmap />

        {isLoading ? (
          [...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))
        ) : !warehouses?.length ? (
          <Card className="border-border/60">
            <CardContent className="py-12 text-center">
              <Warehouse className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No warehouses yet.</p>
              <Link href="/locations/new">
                <Button size="sm" className="mt-3">Add your first warehouse</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          warehouses.map((warehouse) => (
            <WarehouseRow
              key={warehouse.id}
              warehouse={warehouse}
              onAddZone={(id, name) => setZoneDialog({ warehouseId: id, warehouseName: name })}
              onAddBin={(id, name) => setBinDialog({ zoneId: id, zoneName: name })}
            />
          ))
        )}
      </div>

      <Dialog open={!!zoneDialog} onOpenChange={(open) => !open && setZoneDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Zone to {zoneDialog?.warehouseName}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={zoneForm.handleSubmit((data) => {
              if (!zoneDialog) return;
              createZone.mutate({ id: zoneDialog.warehouseId, data });
            })}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label>Zone Name *</Label>
              <Input {...zoneForm.register("name", { required: true })} placeholder="e.g. Storage Aisle 3" data-testid="input-zone-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Zone Code *</Label>
              <Input {...zoneForm.register("code", { required: true })} placeholder="e.g. E" className="font-mono" data-testid="input-zone-code" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setZoneDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={createZone.isPending} data-testid="button-create-zone">
                {createZone.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Zone
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!binDialog} onOpenChange={(open) => !open && setBinDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bin to {binDialog?.zoneName}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={binForm.handleSubmit((data) => {
              if (!binDialog) return;
              createBin.mutate({ id: binDialog.zoneId, data });
            })}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label>Bin Code *</Label>
              <Input {...binForm.register("code", { required: true })} placeholder="e.g. E-01" className="font-mono" data-testid="input-bin-code" />
            </div>
            <div className="space-y-1.5">
              <Label>Bin Name</Label>
              <Input {...binForm.register("name")} placeholder="e.g. Rack 5 Bay 1" data-testid="input-bin-name" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBinDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={createBin.isPending} data-testid="button-create-bin">
                {createBin.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Bin
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
