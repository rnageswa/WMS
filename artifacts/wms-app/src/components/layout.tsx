import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { getHelpContent } from "@/lib/help-content";
import { HelpTooltip } from "@/components/help-tooltip";
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
  ShoppingCart,
  ShoppingBag,
  Truck,
  Zap,
  CalendarClock,
  Shield,
  LogOut,
  User,
  BrainCircuit,
  BarChart4,
  Menu,
  X,
  RotateCcw,
  Layers,
} from "lucide-react";
import {
  useGetLowStockAlerts,
  getGetLowStockAlertsQueryKey,
} from "@workspace/api-client-react";
import { useClerk, useUser } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/use-user-role";
import { CommandPalette } from "@/components/command-palette";
import { OfflineBanner } from "@/components/offline-banner";
import { SyncIndicator } from "@/components/sync-indicator";

// Roles: admin (full access), operator (no admin/settings), viewer (read-only)
const WRITE_ROLES = ["admin", "operator"];
const ADMIN_ROLES = ["admin"];

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, alertBadge: true, roles: ["admin", "operator", "viewer"] },
  { href: "/products", label: "Products", icon: Package, roles: ["admin", "operator", "viewer"] },
  { href: "/inventory", label: "Inventory", icon: Boxes, roles: ["admin", "operator", "viewer"] },
  { href: "/suppliers", label: "Suppliers", icon: Truck, roles: ["admin", "operator"] },
  { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart, roles: ["admin", "operator"] },
  { href: "/purchase-orders/schedule", label: "Schedule", icon: CalendarClock, roles: ["admin", "operator"] },
  { href: "/purchase-orders/reorder", label: "Reorder", icon: Zap, alertBadge: true, roles: ["admin", "operator"] },
  { href: "/sales-orders", label: "Sales Orders", icon: ShoppingBag, roles: ["admin", "operator"] },
  { href: "/picker", label: "Picker View", icon: ClipboardList, roles: ["admin", "operator"] },
  { href: "/receiving", label: "Receiving", icon: PackagePlus, roles: ["admin", "operator"] },
  { href: "/dispatch", label: "Dispatch", icon: PackageMinus, roles: ["admin", "operator"] },
  { href: "/transfer", label: "Transfer", icon: ArrowLeftRight, roles: ["admin", "operator"] },
  { href: "/cycle-count", label: "Cycle Count", icon: ClipboardCheck, roles: ["admin", "operator"] },
  { href: "/cycle-count/schedule", label: "Count Schedule", icon: CalendarClock, roles: ["admin", "operator"] },
  { href: "/scan", label: "Scan", icon: ScanLine, roles: ["admin", "operator", "viewer"] },
  { href: "/locations", label: "Locations", icon: MapPin, roles: ["admin", "operator", "viewer"] },
  { href: "/movements", label: "Movements", icon: ClipboardList, roles: ["admin", "operator", "viewer"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["admin", "operator", "viewer"] },
  { href: "/returns", label: "Returns (RMA)", icon: RotateCcw, roles: ["admin", "operator"] },
];

const intelNavItems = [
  { href: "/smart-replenishment", label: "Smart Replenishment", icon: BrainCircuit, roles: ["admin", "operator"] },
  { href: "/smart-picking", label: "Wave Picking", icon: Layers, roles: ["admin", "operator"] },
  { href: "/demand-forecast", label: "Demand Forecast", icon: BarChart4, roles: ["admin", "operator"] },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-[#E8622A]/15 text-[#E8622A]",
  operator: "bg-sidebar-accent/80 text-sidebar-foreground/80",
  viewer: "bg-sidebar-accent/50 text-sidebar-foreground/60",
};

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
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  alertBadge?: boolean;
  alertCount?: number;
  hasCritical?: boolean;
  onClick?: () => void;
}) {
  const [location] = useLocation();
  const isActive =
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <Link
      href={href}
      data-testid={`nav-${label.toLowerCase()}`}
      onClick={onClick}
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

function UserFooter() {
  const { signOut } = useClerk();
  const { user } = useUser();

  const { data: me } = useQuery<{ userId: string; role: string }>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load user info");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const role = me?.role ?? "operator";
  const name = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "User";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="px-3 py-3 border-t border-sidebar-border space-y-2">
      {/* User profile row */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-sidebar-primary-foreground">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-sidebar-foreground truncate">{name}</p>
          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded capitalize inline-block mt-0.5",
              ROLE_COLORS[role] ?? ROLE_COLORS.operator
            )}
          >
            {role}
          </span>
        </div>
      </div>

      {/* Admin Console link (admin only) */}
      {role === "admin" && (
        <Link
          href="/admin"
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
        >
          <Shield className="w-3.5 h-3.5" />
          Admin Console
        </Link>
      )}

      {/* Sign out */}
      <button
        onClick={() => signOut()}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        Sign out
      </button>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: alertData } = useGetLowStockAlerts({
    query: {
      queryKey: getGetLowStockAlertsQueryKey(),
      refetchInterval: 60_000,
      staleTime: 30_000,
    },
  });
  const { data: userRole } = useUserRole();

  const alertCount = alertData?.totalAlerts ?? 0;
  const hasCritical = (alertData?.criticalCount ?? 0) > 0;
  const currentRole = userRole?.role ?? "operator";

  const visibleNav = navItems.filter((item) => !item.roles || item.roles.includes(currentRole));
  const visibleIntel = intelNavItems.filter((item) => !item.roles || item.roles.includes(currentRole));

  const closeSidebar = () => setSidebarOpen(false);

  const sidebarContent = (
    <>
      <div className="px-4 py-4 border-b border-sidebar-border space-y-3">
        {/* Branding row */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
            <Warehouse className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-sidebar-foreground tracking-tight">
              WareIQ
            </span>
            <p className="text-[10px] text-sidebar-foreground/40 leading-none mt-0.5">
              Warehouse OS
            </p>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={closeSidebar}
            className="md:hidden p-1 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Command palette — full width below branding */}
        <CommandPalette />
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {visibleNav.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            alertCount={item.alertBadge ? alertCount : 0}
            hasCritical={item.alertBadge ? hasCritical : false}
            onClick={closeSidebar}
          />
        ))}
        {visibleIntel.length > 0 && (
          <>
            <div className="pt-3 pb-1">
              <p className="px-3 text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-wider">
                Intelligence
              </p>
            </div>
            {visibleIntel.map((item) => (
              <NavItem key={item.href} {...item} onClick={closeSidebar} />
            ))}
          </>
        )}
      </nav>
      <UserFooter />
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <OfflineBanner />
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar — desktop: always visible; mobile: overlay slide-in */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-in-out",
          "md:static md:z-auto md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header bar with hamburger */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
              <Warehouse className="w-3.5 h-3.5 text-sidebar-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground tracking-tight">WareIQ</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <SyncIndicator />
            <CommandPalette />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  helpKey,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  helpKey?: string;
}) {
  const [location] = useLocation();
  const helpContent = helpKey ? getHelpContent(helpKey) : getHelpContent(location);
  
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card/50">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {helpContent && (
          <HelpTooltip content={helpContent} />
        )}
      </div>
      {subtitle && !helpContent && (
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
