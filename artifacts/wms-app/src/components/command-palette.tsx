import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { Command } from "cmdk";
import {
  LayoutDashboard, Package, Boxes, MapPin, ClipboardList, Warehouse,
  ScanLine, PackagePlus, PackageMinus, ArrowLeftRight, BarChart3,
  ClipboardCheck, ShoppingCart, ShoppingBag, Truck, Zap, CalendarClock,
  Shield, RotateCcw, Layers, BrainCircuit, Navigation, BarChart4,
  Search, Command as CommandIcon,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Package, Boxes, MapPin, ClipboardList, Warehouse,
  ScanLine, PackagePlus, PackageMinus, ArrowLeftRight, BarChart3,
  ClipboardCheck, ShoppingCart, ShoppingBag, Truck, Zap, CalendarClock,
  Shield, RotateCcw, Layers, BrainCircuit, Navigation, BarChart4,
};

interface PaletteItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  category: string;
  keywords: string[];
}

const navItems: PaletteItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard, category: "Main", keywords: ["home", "overview", "kpi"] },
  { id: "products", label: "Products", href: "/products", icon: Package, category: "Catalog", keywords: ["sku", "items", "catalog"] },
  { id: "inventory", label: "Inventory", href: "/inventory", icon: Boxes, category: "Stock", keywords: ["stock", "bins", "qty", "on hand"] },
  { id: "suppliers", label: "Suppliers", href: "/suppliers", icon: Truck, category: "Purchasing", keywords: ["vendors", "vendor"] },
  { id: "purchase-orders", label: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart, category: "Purchasing", keywords: ["po", "orders", "buying"] },
  { id: "schedule", label: "Schedule", href: "/purchase-orders/schedule", icon: CalendarClock, category: "Planning", keywords: ["calendar", "delivery"] },
  { id: "reorder", label: "Reorder", href: "/purchase-orders/reorder", icon: Zap, category: "Planning", keywords: ["replenish", "low stock", "suggestions"] },
  { id: "sales-orders", label: "Sales Orders", href: "/sales-orders", icon: ShoppingBag, category: "Sales", keywords: ["so", "customer orders", "outbound"] },
  { id: "picker", label: "Picker View", href: "/picker", icon: ClipboardList, category: "Operations", keywords: ["pick", "picking", "fulfillment"] },
  { id: "receiving", label: "Receiving", href: "/receiving", icon: PackagePlus, category: "Operations", keywords: ["receive", "inbound", "putaway"] },
  { id: "dispatch", label: "Dispatch", href: "/dispatch", icon: PackageMinus, category: "Operations", keywords: ["dispatch", "outbound", "ship"] },
  { id: "transfer", label: "Transfer", href: "/transfer", icon: ArrowLeftRight, category: "Operations", keywords: ["move", "relocate", "bin transfer"] },
  { id: "cycle-count", label: "Cycle Count", href: "/cycle-count", icon: ClipboardCheck, category: "Operations", keywords: ["count", "audit", "inventory count"] },
  { id: "scan", label: "Scan", href: "/scan", icon: ScanLine, category: "Tools", keywords: ["barcode", "qr", "lookup"] },
  { id: "locations", label: "Locations", href: "/locations", icon: MapPin, category: "Setup", keywords: ["warehouse", "zones", "bins"] },
  { id: "movements", label: "Movements", href: "/movements", icon: ClipboardList, category: "Stock", keywords: ["transactions", "history", "audit trail"] },
  { id: "reports", label: "Reports", href: "/reports", icon: BarChart3, category: "Analytics", keywords: ["analytics", "charts", "export"] },
  { id: "returns", label: "Returns (RMA)", href: "/returns", icon: RotateCcw, category: "Operations", keywords: ["rma", "return", "reverse logistics"] },
  { id: "smart-replenishment", label: "Smart Replenishment", href: "/smart-replenishment", icon: BrainCircuit, category: "Intelligence", keywords: ["ai", "reorder suggestions", "auto"] },
  { id: "smart-picking", label: "Wave Picking", href: "/smart-picking", icon: Layers, category: "Intelligence", keywords: ["wave", "batch", "multi-order", "route optimization", "pick path"] },
  { id: "demand-forecast", label: "Demand Forecast", href: "/demand-forecast", icon: BarChart4, category: "Intelligence", keywords: ["forecast", "prediction", "demand"] },
  { id: "admin", label: "Admin Console", href: "/admin", icon: Shield, category: "Admin", keywords: ["users", "roles", "settings"] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

  // Track recent pages (stored in localStorage)
  const [recentPages, setRecentPages] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("recent-pages") || "[]");
    } catch {
      return [];
    }
  });

  const addRecentPage = useCallback((href: string) => {
    setRecentPages((prev) => {
      const next = [href, ...prev.filter((p) => p !== href)].slice(0, 5);
      localStorage.setItem("recent-pages", JSON.stringify(next));
      return next;
    });
  }, []);

  // Keyboard shortcut: Ctrl+K / Cmd+K / Alt+Q
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        ((e.metaKey || e.ctrlKey) && e.key === "k") ||
        (e.altKey && (e.key === "q" || e.key === "Q"))
      ) {
        e.preventDefault();
        setOpen((prev) => !prev);
        setSearch("");
      }
      // Escape closes
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return navItems;
    const q = search.toLowerCase();
    return navItems.filter((item) =>
      item.label.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q)) ||
      item.href.toLowerCase().includes(q)
    );
  }, [search]);

  // Recent items
  const recentItems = useMemo(() => {
    if (search.trim()) return [];
    return recentPages
      .map((href) => navItems.find((item) => item.href === href))
      .filter(Boolean) as PaletteItem[];
  }, [recentPages, search]);

  const handleSelect = useCallback((item: PaletteItem) => {
    setOpen(false);
    setSearch("");
    addRecentPage(item.href);
    setLocation(item.href);
  }, [setLocation, addRecentPage]);

  // Group filtered items by category
  const grouped = useMemo(() => {
    const groups: Record<string, PaletteItem[]> = {};
    for (const item of filteredItems) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredItems]);

  return (
    <>
      {/* Trigger button — always visible in header area */}
      <button
        onClick={() => { setOpen(true); setSearch(""); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground/60 text-xs hover:bg-sidebar-accent/70 hover:text-sidebar-foreground transition-colors"
        title="Command palette (Ctrl+K / Alt+Q)"
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left text-[11px]">Search pages…</span>
        <kbd className="shrink-0 text-[10px] font-mono bg-background/60 px-1.5 py-0.5 rounded border border-sidebar-border">
          ⌘K
        </kbd>
      </button>

      {/* Command palette dialog */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50" onClick={() => { setOpen(false); setSearch(""); }} />

          {/* Palette */}
          <div className="relative w-full max-w-lg bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
            <Command shouldFilter={false} loop>
              <div className="flex items-center border-b border-border px-3">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search pages, actions..."
                  className="flex-1 h-11 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                />
                <kbd className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">Esc</kbd>
              </div>

              <Command.List className="max-h-[50vh] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No pages found for "{search}"
                </Command.Empty>

                {/* Recent pages */}
                {recentItems.length > 0 && (
                  <Command.Group heading="Recent">
                    {recentItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Command.Item
                          key={`recent-${item.id}`}
                          value={`recent-${item.id}`}
                          onSelect={() => handleSelect(item)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                        >
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="flex-1">{item.label}</span>
                          <span className="text-xs text-muted-foreground">{item.href}</span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                )}

                {/* Grouped by category */}
                {Object.entries(grouped).map(([category, items]) => (
                  <Command.Group key={category} heading={category}>
                    {items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Command.Item
                          key={item.id}
                          value={`${item.label} ${item.category} ${item.keywords.join(" ")}`}
                          onSelect={() => handleSelect(item)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                        >
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="flex-1">{item.label}</span>
                          <span className="text-xs text-muted-foreground">{item.href}</span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ))}
              </Command.List>

              <div className="border-t border-border px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>Esc Close</span>
              </div>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}
