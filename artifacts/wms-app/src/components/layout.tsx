import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Boxes,
  MapPin,
  ClipboardList,
  ChevronRight,
  Warehouse,
  ScanLine,
  PackagePlus,
  PackageMinus,
  ArrowLeftRight,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";
import {
  useGetLowStockAlerts,
  getGetLowStockAlertsQueryKey,
} from "@workspace/api-client-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, alertBadge: true },
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/receiving", label: "Receiving", icon: PackagePlus },
  { href: "/dispatch", label: "Dispatch", icon: PackageMinus },
  { href: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { href: "/cycle-count", label: "Cycle Count", icon: ClipboardCheck },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/movements", label: "Movements", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

function AlertDot({ count, hasCritical }: { count: number; hasCritical: boolean }) {
  if (count === 0) return null;
  return (
    <span
      className={cn(
        "ml-auto min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none",
        hasCritical
          ? "bg-red-500 text-white"
          : "bg-amber-400 text-amber-900"
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  alertBadge,
  alertCount,
  hasCritical,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  alertBadge?: boolean;
  alertCount?: number;
  hasCritical?: boolean;
}) {
  const [location] = useLocation();
  const isActive =
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <Link
      href={href}
      data-testid={`nav-${label.toLowerCase()}`}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {alertBadge && (alertCount ?? 0) > 0 ? (
        <AlertDot count={alertCount!} hasCritical={!!hasCritical} />
      ) : isActive ? (
        <ChevronRight className="w-3.5 h-3.5 text-sidebar-primary" />
      ) : null}
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: alertData } = useGetLowStockAlerts({
    query: {
      queryKey: getGetLowStockAlertsQueryKey(),
      refetchInterval: 60_000,
      staleTime: 30_000,
    },
  });

  const alertCount = alertData?.totalAlerts ?? 0;
  const hasCritical = (alertData?.criticalCount ?? 0) > 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-56 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
            <Warehouse className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div>
            <span className="text-sm font-bold text-sidebar-foreground tracking-tight">
              WareIQ
            </span>
            <p className="text-[10px] text-sidebar-foreground/40 leading-none mt-0.5">
              Warehouse OS
            </p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              alertCount={item.alertBadge ? alertCount : 0}
              hasCritical={item.alertBadge ? hasCritical : false}
            />
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-sidebar-border">
          <p className="text-[10px] text-sidebar-foreground/30 text-center tracking-wide uppercase">
            Phase 1 MVP
          </p>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card/50">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
