import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { HelpTooltip } from "@/components/help-tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, User, ChevronDown, Settings, DollarSign, Star, StarOff, Check, Plus, Loader2, Users, Coins, Tags, Percent, Receipt, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { getCurrencySymbol, formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { HelpContent } from "@/lib/help-content";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRole = {
  id: string;
  clerkUserId: string;
  role: string;
  displayName: string | null;
  email: string | null;
  createdAt: string;
};

type Me = { userId: string; role: string };

interface Currency {
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
}

const ROLES = ["admin", "operator", "viewer"] as const;
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-orange-50 text-orange-700 border-orange-200",
  operator: "bg-blue-50 text-blue-700 border-blue-200",
  viewer: "bg-gray-50 text-gray-600 border-gray-200",
};

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function fetchCurrencies(): Promise<Currency[]> {
  const res = await fetch("/api/currencies");
  if (!res.ok) throw new Error("Failed to fetch currencies");
  return res.json();
}

async function fetchBaseCurrency(): Promise<string> {
  const res = await fetch("/api/currencies/base");
  if (!res.ok) throw new Error("Failed to fetch base currency");
  const data = await res.json();
  return data.code;
}

async function setBaseCurrency(code: string): Promise<string> {
  const res = await fetch("/api/currencies/base", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to set base currency");
  }
  const data = await res.json();
  return data.code;
}

async function addCurrency(currency: { code: string; name: string; symbol: string }): Promise<Currency> {
  const res = await fetch("/api/currencies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(currency),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to add currency");
  }
  return res.json();
}

async function deleteCurrency(code: string): Promise<void> {
  const res = await fetch(`/api/currencies/${code}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete currency");
  }
}

// ─── Help Content ─────────────────────────────────────────────────────────────

const currencyHelpContent: HelpContent = {
  title: "Currency Settings",
  description: "Configure base currency and manage available currencies for the system.",
  sections: [
    {
      title: "Base Currency",
      content: [
        "The base currency is the default for all new orders, price lists, and financial reports.",
        "All monetary values across the app display in this currency.",
        "Exchange rates are relative to the base currency.",
      ],
    },
    {
      title: "Exchange Rates",
      content: [
        "Rates are locked at transaction time (SO confirm / PO order).",
        "Historical transactions are never recalculated when rates change.",
        "Set exchange rates at Admin Console → Currency Settings → Exchange Rates.",
      ],
    },
    {
      title: "Adding & Removing Currencies",
      content: [
        "Add currencies with a unique code (e.g., GBP), name, and symbol.",
        "The base currency cannot be deleted — change base first.",
        "Currencies used in existing orders or price lists should not be deleted.",
      ],
    },
  ],
};

const pricingHelpContent: HelpContent = {
  title: "Pricing & Costing",
  description: "How pricing, costing, and margins work in WareIQ.",
  sections: [
    {
      title: "Price Lists",
      content: [
        "Create multiple pricing tiers (Retail, Wholesale, VIP).",
        "Each price list has its own currency.",
        "Default price list auto-applies on Sales Order creation.",
        "Prices locked at order confirm time (costAtTime).",
      ],
    },
    {
      title: "Costing (MAC)",
      content: [
        "Moving Average Cost recalculated on each inbound receipt.",
        "COGS computed on outbound (dispatch/ship).",
        "Valuation log tracks every cost change.",
        "See Reports → COGS tab for details.",
      ],
    },
    {
      title: "Margin Tracking",
      content: "Margin = Revenue − COGS per order. costAtTime locked at confirm prevents drift. See Reports → Margin tab for aggregate data.",
    },
  ],
};

// ─── User Management Tab ──────────────────────────────────────────────────────

function UserManagementTab() {
  const qc = useQueryClient();

  const { data: me } = useQuery<Me>({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch("/api/auth/me"),
  });

  const { data: users = [], isLoading } = useQuery<UserRole[]>({
    queryKey: ["auth", "users"],
    queryFn: () => apiFetch("/api/auth/users"),
    enabled: me?.role === "admin",
  });

  const updateRole = useMutation({
    mutationFn: ({ clerkUserId, role }: { clerkUserId: string; role: string }) =>
      apiFetch(`/api/auth/users/${clerkUserId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auth", "users"] }),
  });

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  if (me?.role !== "admin") {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-3 text-center">
        <Shield className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          You need admin privileges to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role reference */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { role: "admin", desc: "Full access — settings, alerts, reports, user management." },
          { role: "operator", desc: "Warehouse ops — receive, dispatch, transfer, cycle count." },
          { role: "viewer", desc: "Read-only access to inventory and reports." },
        ].map(({ role, desc }) => (
          <Card key={role} className="border border-border">
            <CardContent className="pt-4 pb-3 px-4">
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full border capitalize mb-2 inline-block",
                  ROLE_COLORS[role]
                )}
              >
                {role}
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Users
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">
              {users.length}
            </span>
          </CardTitle>
          <CardDescription>
            Every user who has signed in to WareIQ. The first user is automatically admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 bg-muted/40 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No users yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {users.map((u) => {
                const isMe = u.clerkUserId === me?.userId;
                const isOpen = openDropdown === u.clerkUserId;

                return (
                  <div key={u.id} className="flex items-center gap-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {(u.displayName ?? u.email ?? u.clerkUserId).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {u.displayName ?? u.email ?? u.clerkUserId}
                        {isMe && (
                          <span className="ml-2 text-xs text-muted-foreground font-normal">(you)</span>
                        )}
                      </p>
                      {u.email && u.displayName && (
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      )}
                    </div>
                    <div className="relative shrink-0">
                      <button
                        disabled={isMe || updateRole.isPending}
                        onClick={() => setOpenDropdown(isOpen ? null : u.clerkUserId)}
                        className={cn(
                          "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border capitalize transition-colors",
                          ROLE_COLORS[u.role] ?? ROLE_COLORS.operator,
                          isMe ? "opacity-60 cursor-not-allowed" : "hover:opacity-80 cursor-pointer"
                        )}
                      >
                        {u.role}
                        {!isMe && <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />}
                      </button>
                      {isOpen && !isMe && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                          {ROLES.map((role) => (
                            <button
                              key={role}
                              className={cn(
                                "w-full text-left px-3 py-2 text-xs capitalize hover:bg-muted/60 transition-colors",
                                role === u.role && "font-semibold text-primary"
                              )}
                              onClick={async () => {
                                setOpenDropdown(null);
                                if (role !== u.role) {
                                  await updateRole.mutateAsync({ clerkUserId: u.clerkUserId, role });
                                }
                              }}
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Currency Settings Tab ────────────────────────────────────────────────────

function CurrencySettingsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: currencies = [], isLoading: loadingCurrencies } = useQuery({
    queryKey: ["currencies"],
    queryFn: fetchCurrencies,
  });

  const { data: baseCurrency, isLoading: loadingBase } = useQuery({
    queryKey: ["baseCurrency"],
    queryFn: fetchBaseCurrency,
  });

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [adding, setAdding] = useState(false);

  const handleSetBase = async (code: string) => {
    try {
      await setBaseCurrency(code);
      qc.invalidateQueries({ queryKey: ["baseCurrency"] });
      qc.invalidateQueries({ queryKey: ["currencies"] });
      toast({ title: `Base currency set to ${code}` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleAddCurrency = async () => {
    if (!newCode.trim() || !newName.trim() || !newSymbol.trim()) {
      toast({ title: "All fields required", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      await addCurrency({ code: newCode.toUpperCase(), name: newName, symbol: newSymbol });
      qc.invalidateQueries({ queryKey: ["currencies"] });
      setNewCode("");
      setNewName("");
      setNewSymbol("");
      toast({ title: `Currency ${newCode.toUpperCase()} added` });
    } catch (err: any) {
      toast({ title: "Failed to add currency", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDeleteCurrency = async (code: string, isBase: boolean) => {
    if (isBase) {
      toast({ title: "Cannot delete base currency", description: "Change base currency first.", variant: "destructive" });
      return;
    }
    setDeleteTarget(code);
  };

  const confirmDelete = async () => {
    const code = deleteTarget;
    if (!code) return;
    setDeleteTarget(null);
    try {
      await deleteCurrency(code);
      qc.invalidateQueries({ queryKey: ["currencies"] });
      toast({ title: `Currency ${code} deleted` });
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with help */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Currency Settings</h3>
        <HelpTooltip content={currencyHelpContent} />
      </div>

      {/* Base Currency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#E8622A]" />
            Base Currency
          </CardTitle>
          <CardDescription>
            The base currency is used as the default for all new orders, price lists, and financial reports.
            Exchange rates are relative to this currency.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingBase ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Current base:</span>
              <Badge className="text-base px-3 py-1 bg-[#E8622A]/10 text-[#E8622A] border-[#E8622A]/20">
                {getCurrencySymbol(baseCurrency || "USD")} {baseCurrency}
              </Badge>
            </div>
          )}

          {loadingCurrencies ? (
            <div className="text-sm text-muted-foreground">Loading currencies...</div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Select base currency</Label>
              <div className="flex flex-wrap gap-2">
                {currencies.map((c) => (
                  <Button
                    key={c.code}
                    variant={c.isBase ? "default" : "outline"}
                    size="sm"
                    className={c.isBase ? "bg-[#E8622A] hover:bg-[#E8622A]/90 text-white" : ""}
                    onClick={() => !c.isBase && handleSetBase(c.code)}
                    disabled={c.isBase}
                  >
                    {c.isBase ? <Check className="w-3.5 h-3.5 mr-1" /> : <StarOff className="w-3.5 h-3.5 mr-1 opacity-40" />}
                    {c.symbol} {c.code}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Currency List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            Currencies
          </CardTitle>
          <CardDescription>
            Manage available currencies. Add new currencies and set exchange rates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currencies.map((c) => (
                <TableRow key={c.code}>
                  <TableCell className="font-mono font-medium">{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell className="text-lg">{c.symbol}</TableCell>
                  <TableCell>
                    {c.isBase ? (
                      <Badge className="bg-[#E8622A]/10 text-[#E8622A] border-[#E8622A]/20">
                        <Star className="w-3 h-3 mr-1" /> Base
                      </Badge>
                    ) : (
                      <Badge variant="outline">Secondary</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteCurrency(c.code, c.isBase)}
                      title={c.isBase ? "Cannot delete base currency" : `Delete ${c.code}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Add Currency Form */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Add Currency</h4>
            <div className="grid grid-cols-[80px_1fr_80px_auto] gap-3 items-end">
              <div>
                <Label className="text-xs text-muted-foreground">Code</Label>
                <Input placeholder="GBP" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} maxLength={5} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input placeholder="British Pound" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Symbol</Label>
                <Input placeholder="£" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} maxLength={5} />
              </div>
              <Button onClick={handleAddCurrency} disabled={adding} className="bg-[#E8622A] hover:bg-[#E8622A]/90 text-white">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Currency Confirmation Dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Currency</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget}</strong>? This action cannot be undone.
              Make sure this currency is not used in any active orders or price lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Pricing & Costing Tab ────────────────────────────────────────────────────

function PricingCostingTab() {
  return (
    <div className="space-y-6">
      {/* Header with help */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pricing & Costing</h3>
        <HelpTooltip content={pricingHelpContent} />
      </div>

      {/* Price Lists - primary action */}
      <Link href="/price-lists">
        <Card className="border border-border hover:border-[#E8622A]/40 transition-colors cursor-pointer">
          <CardContent className="pt-5 pb-5 px-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-[#E8622A]/10 flex items-center justify-center shrink-0">
              <Tags className="w-5 h-5 text-[#E8622A]" />
            </div>
            <div>
              <div className="font-semibold text-sm">Price Lists</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Create and manage product pricing tiers (Retail, Wholesale, VIP). Default prices auto-apply on Sales Order creation.
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Secondary links */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/reports?tab=cogs">
          <Card className="border border-border hover:border-[#E8622A]/40 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-sm">COGS Report</span>
              </div>
              <p className="text-xs text-muted-foreground">Cost of Goods Sold via MAC. Reports → COGS tab.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/reports?tab=margin">
          <Card className="border border-border hover:border-[#E8622A]/40 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-sm">Margin Report</span>
              </div>
              <p className="text-xs text-muted-foreground">Revenue vs cost. Reports → Margin tab.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/settings">
          <Card className="border border-border hover:border-[#E8622A]/40 transition-colors cursor-pointer h-full">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-sm">Exchange Rates</span>
              </div>
              <p className="text-xs text-muted-foreground">Currency conversion rates. Currency Settings tab.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

// ─── Main Admin Console Page ──────────────────────────────────────────────────

export default function AdminPage() {
  const { data: me } = useQuery<Me>({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch("/api/auth/me"),
  });

  if (me?.role !== "admin") {
    return (
      <Layout>
        <PageHeader title="Admin Console" subtitle="System administration" />
        <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-3 text-center">
          <Shield className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            You need admin privileges to access this page.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Admin Console"
        subtitle="Manage users, currencies, pricing, and system settings"
      />
      <div className="p-6 max-w-5xl">
        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="currency" className="gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              Currency Settings
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-1.5">
              <Tags className="w-3.5 h-3.5" />
              Pricing & Costing
            </TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <UserManagementTab />
          </TabsContent>
          <TabsContent value="currency">
            <CurrencySettingsTab />
          </TabsContent>
          <TabsContent value="pricing">
            <PricingCostingTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
