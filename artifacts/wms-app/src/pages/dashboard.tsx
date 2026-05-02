import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  Boxes,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function movementIcon(type: string) {
  if (type === "inbound") return <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />;
  if (type === "outbound") return <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />;
  return <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />;
}

function movementBadge(type: string) {
  if (type === "inbound")
    return <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">inbound</Badge>;
  if (type === "outbound")
    return <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">outbound</Badge>;
  return <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">adjustment</Badge>;
}

export default function Dashboard() {
  const { data, isLoading } = useGetDashboardSummary();

  const kpis = [
    {
      label: "Total SKUs",
      value: data?.totalProducts ?? 0,
      sub: `${data?.activeProducts ?? 0} active`,
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/8",
    },
    {
      label: "Total Bins",
      value: data?.totalBins ?? 0,
      sub: "across all warehouses",
      icon: Boxes,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Low Stock Alerts",
      value: data?.lowStockCount ?? 0,
      sub: "items below threshold",
      icon: AlertTriangle,
      color: data?.lowStockCount ? "text-amber-600" : "text-muted-foreground",
      bg: data?.lowStockCount ? "bg-amber-50" : "bg-muted",
    },
    {
      label: "Movements Today",
      value: data?.totalMovementsToday ?? 0,
      sub: "adjustments, in & out",
      icon: Activity,
      color: "text-accent",
      bg: "bg-accent/10",
    },
  ];

  return (
    <Layout>
      <PageHeader
        title="Dashboard"
        subtitle="Warehouse operations at a glance"
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="border-border/60" data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardContent className="pt-5 pb-4 px-5">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        {kpi.label}
                      </p>
                      <p className="text-3xl font-bold mt-1 text-foreground tabular-nums">
                        {kpi.value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                      <kpi.icon className={`w-4.5 h-4.5 ${kpi.color}`} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/60">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Recent Movements
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {isLoading ? (
              <div className="px-5 space-y-3 pb-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : !data?.recentMovements?.length ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No movements recorded yet
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {data.recentMovements.map((m) => (
                  <div
                    key={m.id}
                    data-testid={`movement-row-${m.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {movementIcon(m.movementType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {(m as any).product?.name ?? "Unknown product"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(m as any).bin?.zone?.warehouse?.name} &rsaquo;{" "}
                        {(m as any).bin?.zone?.name} &rsaquo;{" "}
                        {(m as any).bin?.code}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {movementBadge(m.movementType)}
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          m.quantity > 0 ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {m.quantity > 0 ? "+" : ""}
                        {m.quantity}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground shrink-0 w-24 text-right">
                      {formatDistanceToNow(new Date(m.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
