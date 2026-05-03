import { useMemo } from "react";
import { Link } from "wouter";
import { useListPurchaseOrders } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Truck,
  CalendarDays,
  AlertTriangle,
  Clock,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  Package,
  ArrowLeft,
} from "lucide-react";
import {
  isPast,
  isToday,
  isThisWeek,
  parseISO,
  format,
  differenceInCalendarDays,
  startOfToday,
} from "date-fns";

type PoStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled";

const STATUS_META: Record<PoStatus, { label: string; cls: string }> = {
  draft:              { label: "Draft",           cls: "bg-muted text-muted-foreground border-border" },
  ordered:            { label: "Ordered",         cls: "bg-blue-50 text-blue-700 border-blue-200" },
  partially_received: { label: "Part. Received",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  received:           { label: "Received",        cls: "bg-green-50 text-green-700 border-green-200" },
  cancelled:          { label: "Cancelled",       cls: "bg-red-50 text-red-500 border-red-200" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as PoStatus] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <Badge className={`${meta.cls} hover:${meta.cls} text-[11px] font-medium border`}>
      {meta.label}
    </Badge>
  );
}

interface Po {
  id: string;
  poNumber: string;
  supplierName: string;
  status: string;
  lineCount: number;
  totalQtyOrdered: number;
  expectedDeliveryDate?: string | null;
  createdAt: string;
}

type Group = "overdue" | "today" | "this_week" | "later" | "no_date";

interface GroupedPo {
  po: Po;
  group: Group;
  daysUntil: number | null;
  daysOverdue: number | null;
}

function classifyPo(po: Po): GroupedPo | null {
  const active = po.status === "ordered" || po.status === "partially_received";
  if (!active) return null;

  const { expectedDeliveryDate: raw } = po;
  if (!raw) {
    return { po, group: "no_date", daysUntil: null, daysOverdue: null };
  }

  const date = parseISO(raw);
  const today = startOfToday();

  if (isPast(date) && !isToday(date)) {
    const daysOverdue = differenceInCalendarDays(today, date);
    return { po, group: "overdue", daysUntil: null, daysOverdue };
  }
  if (isToday(date)) {
    return { po, group: "today", daysUntil: 0, daysOverdue: null };
  }
  if (isThisWeek(date, { weekStartsOn: 1 })) {
    const daysUntil = differenceInCalendarDays(date, today);
    return { po, group: "this_week", daysUntil, daysOverdue: null };
  }
  const daysUntil = differenceInCalendarDays(date, today);
  return { po, group: "later", daysUntil, daysOverdue: null };
}

const GROUP_ORDER: Group[] = ["overdue", "today", "this_week", "later", "no_date"];

const GROUP_META: Record<Group, {
  label: string;
  icon: React.ElementType;
  emptyMsg: string;
  headerCls: string;
  dotCls: string;
}> = {
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    emptyMsg: "No overdue deliveries",
    headerCls: "text-red-700 bg-red-50 border-red-200",
    dotCls: "bg-red-500",
  },
  today: {
    label: "Due Today",
    icon: Truck,
    emptyMsg: "Nothing due today",
    headerCls: "text-orange-700 bg-orange-50 border-orange-200",
    dotCls: "bg-[#E8622A]",
  },
  this_week: {
    label: "This Week",
    icon: CalendarDays,
    emptyMsg: "Nothing due this week",
    headerCls: "text-blue-700 bg-blue-50 border-blue-200",
    dotCls: "bg-blue-500",
  },
  later: {
    label: "Upcoming",
    icon: Clock,
    emptyMsg: "No upcoming deliveries",
    headerCls: "text-muted-foreground bg-muted/40 border-border",
    dotCls: "bg-muted-foreground",
  },
  no_date: {
    label: "No Date Set",
    icon: HelpCircle,
    emptyMsg: "All orders have delivery dates",
    headerCls: "text-muted-foreground bg-muted/20 border-border",
    dotCls: "bg-muted-foreground/40",
  },
};

function PoCard({ item }: { item: GroupedPo }) {
  const { po, group, daysUntil, daysOverdue } = item;
  const raw = po.expectedDeliveryDate;

  return (
    <Link href={`/purchase-orders/${po.id}`}>
      <div className="group flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/30 hover:border-border/80 transition-all cursor-pointer">
        {/* Date bubble */}
        <div className={`shrink-0 w-14 text-center rounded-lg px-1 py-2 border ${
          group === "overdue"
            ? "bg-red-50 border-red-200"
            : group === "today"
            ? "bg-orange-50 border-orange-200"
            : group === "this_week"
            ? "bg-blue-50 border-blue-200"
            : "bg-muted/40 border-border"
        }`}>
          {raw ? (
            <>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${
                group === "overdue" ? "text-red-500"
                : group === "today" ? "text-[#E8622A]"
                : group === "this_week" ? "text-blue-500"
                : "text-muted-foreground"
              }`}>
                {format(parseISO(raw), "MMM")}
              </p>
              <p className={`text-xl font-bold leading-tight ${
                group === "overdue" ? "text-red-700"
                : group === "today" ? "text-[#E8622A]"
                : group === "this_week" ? "text-blue-700"
                : "text-foreground"
              }`}>
                {format(parseISO(raw), "d")}
              </p>
              <p className={`text-[10px] ${
                group === "overdue" ? "text-red-400"
                : group === "today" ? "text-orange-400"
                : "text-muted-foreground"
              }`}>
                {format(parseISO(raw), "EEE")}
              </p>
            </>
          ) : (
            <HelpCircle className="w-5 h-5 text-muted-foreground/40 mx-auto my-1" />
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-bold text-foreground">{po.poNumber}</span>
            <StatusBadge status={po.status} />
            {group === "overdue" && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-0 leading-5">
                <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                {daysOverdue}d overdue
              </span>
            )}
            {group === "today" && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#E8622A] bg-orange-50 border border-orange-200 rounded-full px-1.5 py-0 leading-5">
                Arriving today
              </span>
            )}
            {group === "this_week" && daysUntil !== null && daysUntil > 0 && (
              <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0 leading-5">
                in {daysUntil}d
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{po.supplierName}</p>
        </div>

        {/* Stats */}
        <div className="shrink-0 flex items-center gap-4 text-right">
          <div className="hidden sm:block">
            <p className="text-xs text-muted-foreground">Lines</p>
            <p className="text-sm font-semibold tabular-nums">{po.lineCount}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-muted-foreground">Units</p>
            <p className="text-sm font-semibold tabular-nums">{po.totalQtyOrdered}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({ group, count }: { group: Group; count: number }) {
  const meta = GROUP_META[group];
  const Icon = meta.icon;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold mb-2 ${meta.headerCls}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dotCls}`} />
      <Icon className="w-4 h-4 shrink-0" />
      <span>{meta.label}</span>
      <Badge variant="secondary" className="ml-auto text-xs font-semibold">{count}</Badge>
    </div>
  );
}

export default function ReceivingSchedulePage() {
  const { data = [], isLoading } = useListPurchaseOrders({});

  const grouped = useMemo(() => {
    const map: Record<Group, GroupedPo[]> = {
      overdue: [], today: [], this_week: [], later: [], no_date: [],
    };

    for (const rawPo of data) {
      const po = rawPo as Po;
      const classified = classifyPo(po);
      if (classified) {
        map[classified.group].push(classified);
      }
    }

    // Sort within each group
    map.overdue.sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));
    map.today.sort((a, b) => a.po.supplierName.localeCompare(b.po.supplierName));
    map.this_week.sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0));
    map.later.sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0));
    map.no_date.sort((a, b) => a.po.supplierName.localeCompare(b.po.supplierName));

    return map;
  }, [data]);

  const totalActive = GROUP_ORDER.reduce((s, g) => s + grouped[g].length, 0);
  const overdueCount = grouped.overdue.length;
  const todayCount = grouped.today.length;

  const subtitle = isLoading
    ? "Loading schedule…"
    : totalActive === 0
    ? "No open orders to track"
    : [
        `${totalActive} open order${totalActive !== 1 ? "s" : ""}`,
        overdueCount > 0 ? `${overdueCount} overdue` : null,
        todayCount > 0 ? `${todayCount} arriving today` : null,
      ]
        .filter(Boolean)
        .join(" · ");

  return (
    <Layout>
      <PageHeader
        title="Receiving Schedule"
        subtitle={subtitle}
        action={
          <Link href="/purchase-orders">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              All Orders
            </Button>
          </Link>
        }
      />

      {/* Summary strip */}
      {!isLoading && totalActive > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(["overdue", "today", "this_week", "later"] as Group[]).map((g) => {
            const meta = GROUP_META[g];
            const Icon = meta.icon;
            const n = grouped[g].length;
            return (
              <div
                key={g}
                className={`rounded-lg border p-3 flex items-center gap-2.5 ${
                  n > 0 ? meta.headerCls : "bg-muted/20 border-border text-muted-foreground"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div>
                  <p className="text-xl font-bold leading-tight">{n}</p>
                  <p className="text-xs opacity-80">{meta.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-9 w-36 rounded-lg" />
              {[0, 1].map((j) => (
                <Skeleton key={j} className="h-[72px] w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && totalActive === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">All caught up</p>
            <p className="text-sm text-muted-foreground mt-1">
              No open orders to track. Create a purchase order to get started.
            </p>
          </div>
          <Link href="/purchase-orders/new">
            <Button size="sm" className="gap-1.5">
              <Package className="w-4 h-4" />
              New Purchase Order
            </Button>
          </Link>
        </div>
      )}

      {/* Grouped sections */}
      {!isLoading && totalActive > 0 && (
        <div className="space-y-8">
          {GROUP_ORDER.map((group) => {
            const items = grouped[group];
            if (items.length === 0) return null;
            return (
              <section key={group}>
                <SectionHeader group={group} count={items.length} />
                <div className="space-y-2">
                  {items.map((item) => (
                    <PoCard key={item.po.id} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
