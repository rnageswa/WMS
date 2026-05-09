import { useState } from "react";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Route,
  Truck,
  MapPin,
  Package,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface PickBatch {
  id: string;
  name: string;
  type: "batch" | "zone" | "single";
  orders: number;
  items: number;
  estimatedTime: string;
  distance: string;
  zones: string[];
  status: "pending" | "in_progress" | "completed";
}

const MOCK_BATCHES: PickBatch[] = [
  {
    id: "batch-001",
    name: "Batch A — Zone STG-A",
    type: "zone",
    orders: 12,
    items: 48,
    estimatedTime: "25 min",
    distance: "145 m",
    zones: ["STG-A", "STG-B"],
    status: "pending",
  },
  {
    id: "batch-002",
    name: "Batch B — Bulk Items",
    type: "batch",
    orders: 8,
    items: 32,
    estimatedTime: "18 min",
    distance: "98 m",
    zones: ["RCV", "STG-A"],
    status: "in_progress",
  },
  {
    id: "batch-003",
    name: "Express Picks",
    type: "single",
    orders: 5,
    items: 15,
    estimatedTime: "10 min",
    distance: "62 m",
    zones: ["STG-B"],
    status: "pending",
  },
  {
    id: "batch-004",
    name: "Batch C — Fragile",
    type: "batch",
    orders: 6,
    items: 24,
    estimatedTime: "22 min",
    distance: "120 m",
    zones: ["STG-A"],
    status: "completed",
  },
];

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  in_progress: {
    label: "In Progress",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Completed",
    cls: "bg-green-50 text-green-700 border-green-200",
  },
};

function StatusBadge({ status }: { status: string }) {
  const meta =
    STATUS_META[status] ?? {
      label: status,
      cls: "bg-muted text-muted-foreground",
    };
  return (
    <Badge className={`${meta.cls} hover:${meta.cls} text-[10px] font-bold`}>
      {meta.label}
    </Badge>
  );
}

export default function SmartPickingPage() {
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  const selected = MOCK_BATCHES.find((b) => b.id === selectedBatch);

  return (
    <Layout>
      <PageHeader
        title="Smart Picking"
        subtitle="Optimize pick routes, batch orders by zone, and minimize travel distance"
      />

      <div className="p-6 max-w-6xl space-y-4">
        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Pending Picks
              </p>
              <p className="text-2xl font-bold mt-1">
                {MOCK_BATCHES.filter((b) => b.status === "pending").length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Active Batches
              </p>
              <p className="text-2xl font-bold mt-1">
                {MOCK_BATCHES.filter((b) => b.status === "in_progress").length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Total Orders
              </p>
              <p className="text-2xl font-bold mt-1">
                {MOCK_BATCHES.reduce((s, b) => s + b.orders, 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Est. Total Distance
              </p>
              <p className="text-2xl font-bold mt-1">425 m</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Batch List */}
          <div className="col-span-2 space-y-4">
            <Card className="border-border/60">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#E8622A]" />
                  Pick Batches
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-1">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold pl-4">
                        Batch
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">
                        Orders
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">
                        Items
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-center">
                        Est. Time
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-center">
                        Distance
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                        Status
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold pr-4">
                        Zones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_BATCHES.map((batch) => (
                      <TableRow
                        key={batch.id}
                        className={`cursor-pointer hover:bg-muted/40 ${
                          selectedBatch === batch.id ? "bg-orange-50/60" : ""
                        }`}
                        onClick={() => setSelectedBatch(batch.id)}
                      >
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2">
                            <Route className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {batch.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {batch.orders}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {batch.items}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {batch.estimatedTime}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {batch.distance}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={batch.status} />
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex flex-wrap gap-1">
                            {batch.zones.map((z) => (
                              <Badge
                                key={z}
                                variant="outline"
                                className="text-[10px] font-medium"
                              >
                                {z}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Route Preview */}
          <div className="col-span-1">
            <Card className="border-border/60 h-full">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Route className="w-4 h-4 text-[#E8622A]" />
                  Route Optimization
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {selected ? (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">{selected.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Truck className="w-3.5 h-3.5" />
                        {selected.orders} orders · {selected.items} items
                      </div>
                    </div>

                    {/* Simple route visualization */}
                    <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Optimized Path
                      </p>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="w-6 h-6 rounded-full bg-[#E8622A] text-white text-[10px] font-bold flex items-center justify-center">
                          A
                        </span>
                        <div className="flex-1 h-0.5 bg-muted-foreground/20 relative">
                          <div className="absolute inset-y-0 left-0 bg-[#E8622A] w-1/3" />
                        </div>
                        <span className="w-6 h-6 rounded-full bg-[#E8622A] text-white text-[10px] font-bold flex items-center justify-center">
                          B
                        </span>
                        <div className="flex-1 h-0.5 bg-muted-foreground/20 relative">
                          <div className="absolute inset-y-0 left-0 bg-[#E8622A] w-2/3" />
                        </div>
                        <span className="w-6 h-6 rounded-full bg-[#E8622A] text-white text-[10px] font-bold flex items-center justify-center">
                          C
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                        <span>Start</span>
                        <span>Zone {selected.zones[0]}</span>
                        <span>Pack</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Est. time
                        </span>
                        <span className="font-semibold">
                          {selected.estimatedTime}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Travel distance
                        </span>
                        <span className="font-semibold">
                          {selected.distance}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/60 space-y-2">
                      <Button
                        size="sm"
                        className="w-full gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Start Picking
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        View Map
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Route className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Select a batch to view route optimization
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Picking Tips */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#E8622A]" />
              Picking Optimization Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Batch by Zone</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Group orders that share the same storage zone to minimize
                  travel time across the warehouse.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Prioritize Express</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Process express / priority orders first to ensure on-time
                  shipping and customer satisfaction.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Watch for Fragile</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Separate fragile items into dedicated batches with careful
                  handling instructions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
