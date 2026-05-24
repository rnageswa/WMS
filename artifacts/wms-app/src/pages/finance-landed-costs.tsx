import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Ship,
  Plus,
  Trash2,
  DollarSign,
  Calculator,
  ArrowLeft,
  Copy,
  Save,
  Pencil,
} from "lucide-react";
import { RoleGate } from "@/components/role-gate";
import { useBaseCurrency } from "@/hooks/use-base-currency";

import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface LandedCost {
  id: string;
  poId: string;
  costType: string;
  amount: number;
  allocationMethod: string;
  currency: string;
  createdAt: string;
}

interface LandedCostResponse {
  landedCosts: LandedCost[];
  total: number;
}

async function fetchLandedCosts(poId: string): Promise<LandedCostResponse> {
  const res = await fetch(`/api/finance/landed-costs/${poId}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load landed costs");
  return res.json();
}

const COST_TYPES = [
  { value: "freight", label: "Freight", icon: "🚢" },
  { value: "insurance", label: "Insurance", icon: "🛡️" },
  { value: "duties", label: "Duties / Customs", icon: "🏛️" },
  { value: "handling", label: "Handling", icon: "📦" },
  { value: "overhead", label: "Overhead", icon: "⚙️" },
];

const ALLOCATION_METHODS = [
  { value: "value", label: "By Line Value" },
  { value: "quantity", label: "By Quantity" },
  { value: "equal", label: "Equal Split" },
  { value: "weight", label: "By Weight" },
];

function FinanceLandedCostsPage() {
  const { poId } = useParams<{ poId: string }>();
  const currency = useBaseCurrency();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [newCost, setNewCost] = useState({
    costType: "freight",
    amount: "",
    allocationMethod: "value",
    currency: "USD",
  });
  const [adding, setAdding] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [sourcePoId, setSourcePoId] = useState("");
  const [copying, setCopying] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<number>(Date.now());
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["landed-costs", poId],
    queryFn: () => fetchLandedCosts(poId!),
    enabled: !!poId,
  });

  // Draft auto-save: auto-save costs every 30 seconds when there are changes
  const handleDraftSave = async () => {
    if (!data?.landedCosts.length) return;
    try {
      await fetch(`/api/finance/landed-costs/${poId}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          costs: data.landedCosts.map((lc) => ({
            costType: lc.costType,
            amount: lc.amount,
            allocationMethod: lc.allocationMethod,
          })),
        }),
      });
      setLastAutoSave(Date.now());
    } catch { /* silently fail for auto-save */ }
  };

  // Auto-save: trigger draft save whenever landed costs change (debounced 30s)
  useEffect(() => {
    if (!data?.landedCosts.length) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(handleDraftSave, 30000);
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
    };
  }, [data?.landedCosts]);

  const handleAdd = async () => {
    if (!poId || !newCost.amount || parseFloat(newCost.amount) <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/finance/landed-costs/${poId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          costs: [{
            costType: newCost.costType,
            amount: parseFloat(newCost.amount),
            allocationMethod: newCost.allocationMethod,
            currency: newCost.currency,
          }],
        }),
      });
      if (!res.ok) throw new Error("Failed to add landed cost");
      toast({ title: "Landed cost added and allocated to PO lines" });
      setAddOpen(false);
      setNewCost({ costType: "freight", amount: "", allocationMethod: "value", currency: "USD" });
      qc.invalidateQueries({ queryKey: ["landed-costs"] });
    } catch (err: any) {
      toast({ title: "Error adding landed cost", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const formatMoney = (val: number) => formatCurrency(val, currency);
  const costTypeIcon = (type: string) => {
    const ct = COST_TYPES.find((c) => c.value === type);
    return ct ? `${ct.icon} ${ct.label}` : type;
  };

  // Summarize by type
  const totalsByType = data?.landedCosts.reduce((acc, c) => {
    acc[c.costType] = (acc[c.costType] ?? 0) + c.amount;
    return acc;
  }, {} as Record<string, number>) ?? {};

  return (
    <Layout>
      <PageHeader
        title="Landed Costs Manager"
        description="Additional costs (freight, insurance, duties) allocated to purchase order lines"
        breadcrumbs={[
          { label: "Purchase Orders", href: "/purchase-orders" },
          { label: poId ?? "", href: `/purchase-orders/${poId}` },
          { label: "Landed Costs" },
        ]}
        action={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Landed Cost
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Landed Cost</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Cost Type</Label>
                  <Select value={newCost.costType} onValueChange={(v) => setNewCost((d) => ({ ...d, costType: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COST_TYPES.map((ct) => (
                        <SelectItem key={ct.value} value={ct.value}>{ct.icon} {ct.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount ({currency})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newCost.amount}
                    onChange={(e) => setNewCost((d) => ({ ...d, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Allocation Method</Label>
                  <Select value={newCost.allocationMethod} onValueChange={(v) => setNewCost((d) => ({ ...d, allocationMethod: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALLOCATION_METHODS.map((am) => (
                        <SelectItem key={am.value} value={am.value}>{am.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {newCost.allocationMethod === "value" ? "Distributed proportionally by line value" :
                     newCost.allocationMethod === "quantity" ? "Distributed proportionally by line quantity" :
                     newCost.allocationMethod === "equal" ? "Split evenly across all lines" :
                     "Distributed proportionally by weight"}
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button onClick={handleAdd} disabled={adding}>
                    {adding ? "Adding..." : "Add Cost"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Draft Save Indicator */}
      {data?.landedCosts.length ? (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Save className="w-3 h-3" />
            Auto-saved {new Date(lastAutoSave).toLocaleTimeString()}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleDraftSave}>
              <Save className="w-3 h-3 mr-1" />
              Save Draft
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCopyOpen(true)}>
              <Copy className="w-3 h-3 mr-1" />
              Copy from PO
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end mb-3">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCopyOpen(true)}>
            <Copy className="w-3 h-3 mr-1" />
            Copy from PO
          </Button>
        </div>
      )}

      {/* Copy from PO Dialog */}
      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Landed Costs from PO</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Copy all landed cost entries (freight, insurance, duties, etc.) from another purchase order and re-allocate to this PO's lines.
          </p>
          <div className="space-y-4">
            <div>
              <Label>Source Purchase Order ID</Label>
              <Input value={sourcePoId} onChange={(e) => setSourcePoId(e.target.value)} placeholder="UUID of source PO" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCopyOpen(false)}>Cancel</Button>
              <Button
                disabled={copying || !sourcePoId}
                onClick={async () => {
                  setCopying(true);
                  try {
                    const res = await fetch(`/api/finance/landed-costs/${poId}/copy`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ fromPoId: sourcePoId }),
                    });
                    if (!res.ok) throw new Error("Copy failed");
                    toast({ title: `Landed costs copied from source PO` });
                    setCopyOpen(false);
                    setSourcePoId("");
                    qc.invalidateQueries({ queryKey: ["landed-costs"] });
                  } catch (err: any) {
                    toast({ title: "Error", description: err.message, variant: "destructive" });
                  } finally {
                    setCopying(false);
                  }
                }}
              >
                {copying ? "Copying..." : "Copy Costs"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cost Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-6 w-14" /></CardContent></Card>
          ))
        ) : (
          <>
            {COST_TYPES.map((ct) => (
              <Card key={ct.value}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{ct.icon} {ct.label}</p>
                  <p className="text-lg font-bold">{formatMoney(totalsByType[ct.value] ?? 0)}</p>
                </CardContent>
              </Card>
            ))}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">💰 Total Landed Cost</p>
                <p className="text-lg font-bold text-primary">{data ? formatMoney(data.total) : "$0.00"}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Landed Costs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Ship className="w-4 h-4" />
            Landed Cost Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : data?.landedCosts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Type</th>
                    <th className="text-right py-2 px-3">Amount</th>
                    <th className="text-left py-2 px-3">Allocation</th>
                    <th className="text-left py-2 px-3">Currency</th>
                    <th className="text-left py-2 px-3">Date Added</th>
                  </tr>
                </thead>
                <tbody>
                  {data.landedCosts.map((lc) => (
                    <tr key={lc.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{costTypeIcon(lc.costType)}</td>
                      <td className="py-2 px-3 text-right font-bold">{formatMoney(lc.amount)}</td>
                      <td className="py-2 px-3">
                        <Badge variant="secondary" className="text-xs">
                          {ALLOCATION_METHODS.find((a) => a.value === lc.allocationMethod)?.label ?? lc.allocationMethod}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">{lc.currency}</td>
                      <td className="py-2 px-3 text-muted-foreground">{new Date(lc.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Calculator className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground mb-2">No landed costs recorded for this purchase order</p>
              <p className="text-xs text-muted-foreground">
                Add freight, insurance, duties, handling, or overhead costs to distribute across PO lines
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="mt-4 bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Calculator className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">How Landed Cost Allocation Works</p>
              <p className="text-xs text-muted-foreground">
                Landed costs are automatically distributed across PO lines based on the selected allocation method.
                The default is <strong>By Line Value</strong> — costs are split proportionally to each line's
                (unit cost × quantity). This affects the effective unit cost used for MAC (Moving Average Cost)
                calculations when stock is received.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}

export default function FinanceLandedCostsPageWithGate() {
  return (
    <RoleGate roles={["admin", "operator"]}>
      <FinanceLandedCostsPage />
    </RoleGate>
  );
}
