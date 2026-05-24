import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  History,
  Save,
  ArrowLeft,
  AlertCircle,
  FileText,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { RoleGate } from "@/components/role-gate";
import { useBaseCurrency } from "@/hooks/use-base-currency";

import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ChangeHistoryCard } from "@/components/finance/change-history-card";

// Inline validation helper
function validateNumber(val: string, min: number, max: number, label: string): string | null {
  if (!val) return null; // optional fields
  const num = parseFloat(val);
  if (isNaN(num)) return `${label} must be a number`;
  if (num < min) return `${label} must be at least ${min}`;
  if (num > max) return `${label} must be at most ${max}`;
  return null;
}

interface CostBreakdown {
  productId: string;
  skuCode: string;
  name: string;
  currentAvgCost: number;
  standardCost: number | null;
  markupTarget: number | null;
  marginFloor: number | null;
  totalQty: number;
  totalValue: number;
  costHistory: { date: string; avgCost: number; totalQty: number; sourceType: string }[];
  suggestedPrice: number | null;
}

async function fetchCostBreakdown(productId: string): Promise<CostBreakdown> {
  const res = await fetch(`/api/finance/costing/${productId}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load cost breakdown");
  return res.json();
}

function FinanceCostingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currency = useBaseCurrency();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ standardCost: "", markupTarget: "", marginFloor: "" });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["finance-costing", id],
    queryFn: () => fetchCostBreakdown(id!),
    enabled: !!id,
  });

  const handleEdit = () => {
    if (!data) return;
    setEditData({
      standardCost: data.standardCost?.toString() ?? "",
      markupTarget: data.markupTarget?.toString() ?? "",
      marginFloor: data.marginFloor?.toString() ?? "",
    });
    setEditOpen(true);
  };

  const [editReason, setEditReason] = useState("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const validateEditForm = (): boolean => {
    const errs: Record<string, string> = {};
    const sc = validateNumber(editData.standardCost, 0, 999999, "Standard Cost");
    if (sc) errs.standardCost = sc;
    const mt = validateNumber(editData.markupTarget, 0, 500, "Markup Target");
    if (mt) errs.markupTarget = mt;
    const mf = validateNumber(editData.marginFloor, 0, 100, "Margin Floor");
    if (mf) errs.marginFloor = mf;
    if (!editReason.trim()) errs.reason = "Reason is required for cost changes";
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validateEditForm()) return;
    const body: Record<string, unknown> = { reason: editReason };
    if (editData.standardCost) body.standardCost = parseFloat(editData.standardCost);
    if (editData.markupTarget) body.markupTarget = parseFloat(editData.markupTarget);
    if (editData.marginFloor) body.marginFloor = parseFloat(editData.marginFloor);

    const res = await fetch(`/api/finance/costing/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast({ title: "Update failed", variant: "destructive" });
      return;
    }
    toast({ title: "Cost settings updated" });
    setEditOpen(false);
    setEditReason("");
    setEditErrors({});
    refetch();
  };

  const formatMoney = (val: number) => formatCurrency(val, currency);
  const formatPct = (val: number | null) => val != null ? `${val.toFixed(1)}%` : "—";

  const costVariance = data && data.standardCost
    ? ((data.currentAvgCost - data.standardCost) / data.standardCost) * 100
    : null;

  return (
    <Layout>
      <PageHeader
        title={isLoading ? "Loading..." : `${data?.skuCode} — ${data?.name}`}
        description="Product cost breakdown, MAC history, and margin settings"
        breadcrumbs={[
          { label: "Products", href: "/products" },
          { label: data?.skuCode ?? "", href: `/products/${id}` },
          { label: "Cost Detail" },
        ]}
      />

      <div className="p-6 max-w-6xl">

      {/* Cost Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-6 w-20" /></CardContent></Card>
          ))
        ) : data ? (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Current Avg Cost (MAC)</p>
                <p className="text-lg font-bold">{formatMoney(data.currentAvgCost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Standard Cost</p>
                <p className="text-lg font-bold">{data.standardCost ? formatMoney(data.standardCost) : "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Cost Variance</p>
                <p className={`text-lg font-bold ${costVariance != null && Math.abs(costVariance) > 5 ? (costVariance > 0 ? "text-red-600" : "text-green-600") : ""}`}>
                  {costVariance != null ? `${costVariance > 0 ? "+" : ""}${costVariance.toFixed(1)}%` : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Inventory Value</p>
                <p className="text-lg font-bold">{formatMoney(data.totalValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Suggested Price</p>
                <p className="text-lg font-bold text-green-600">{data.suggestedPrice ? formatMoney(data.suggestedPrice) : "—"}</p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Pricing Targets + Cost History Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Pricing Targets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pricing Targets</CardTitle>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Save className="w-3.5 h-3.5 mr-1" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : data ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Markup Target</span>
                  <Badge variant="outline">{formatPct(data.markupTarget)}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Margin Floor</span>
                  <Badge variant="outline">{formatPct(data.marginFloor)}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Qty</span>
                  <span className="text-sm font-medium">{data.totalQty.toLocaleString()}</span>
                </div>
                {data.suggestedPrice && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-700 mb-1">Suggested Price (at {data.markupTarget}% markup)</p>
                    <p className="text-lg font-bold text-green-800">{formatMoney(data.suggestedPrice)}</p>
                  </div>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Cost History Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              Cost History (30 snapshots)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : data?.costHistory?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={[...data.costHistory].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => currency + " " + v.toFixed(2)} />
                  <Tooltip formatter={(val: number) => formatMoney(val)} />
                  <Line type="monotone" dataKey="avgCost" stroke="#E8622A" strokeWidth={2} name="Avg Cost (MAC)" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No cost history available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost History Log</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : data?.costHistory?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Date</th>
                    <th className="text-right py-2 px-3">Avg Cost</th>
                    <th className="text-right py-2 px-3">Total Qty</th>
                    <th className="text-left py-2 px-3">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {data.costHistory.map((h, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 px-3">{h.date}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatMoney(h.avgCost)}</td>
                      <td className="py-2 px-3 text-right">{h.totalQty.toLocaleString()}</td>
                      <td className="py-2 px-3">
                        <Badge variant="secondary" className="text-xs">{h.sourceType}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">No cost history records</p>
          )}
        </CardContent>
      </Card>

      {/* Change History Card */}
      {data && (
        <ChangeHistoryCard objectType="product" objectId={data.productId} />
      )}

      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditErrors({}); setEditReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cost Settings — {data?.skuCode}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Standard Cost ({currency})</Label>
              <Input type="number" step="0.01" value={editData.standardCost} onChange={(e) => { setEditErrors((d) => ({ ...d, standardCost: "" })); setEditData((d) => ({ ...d, standardCost: e.target.value })); }} placeholder="0.00" />
              {editErrors.standardCost && <p className="text-xs text-red-500 mt-1">{editErrors.standardCost}</p>}
            </div>
            <div>
              <Label>Markup Target (%)</Label>
              <Input type="number" step="0.1" value={editData.markupTarget} onChange={(e) => { setEditErrors((d) => ({ ...d, markupTarget: "" })); setEditData((d) => ({ ...d, markupTarget: e.target.value })); }} placeholder="e.g. 40" />
              {editErrors.markupTarget && <p className="text-xs text-red-500 mt-1">{editErrors.markupTarget}</p>}
            </div>
            <div>
              <Label>Margin Floor (%)</Label>
              <Input type="number" step="0.1" value={editData.marginFloor} onChange={(e) => { setEditErrors((d) => ({ ...d, marginFloor: "" })); setEditData((d) => ({ ...d, marginFloor: e.target.value })); }} placeholder="e.g. 15" />
              {editErrors.marginFloor && <p className="text-xs text-red-500 mt-1">{editErrors.marginFloor}</p>}
            </div>
            <div className="border-t pt-3">
              <Label className="text-sm font-medium">
                Reason for Change <span className="text-red-500">*</span>
              </Label>
              <textarea
                className="w-full mt-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                rows={3}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Describe why this cost is being updated (required)..."
              />
              {editErrors.reason && <p className="text-xs text-red-500 mt-1">{editErrors.reason}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEditOpen(false); setEditErrors({}); setEditReason(""); }}>Cancel</Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

export default function FinanceCostingDetailPageWithGate() {
  return (
    <RoleGate roles={["admin", "operator"]}>
      <FinanceCostingDetailPage />
    </RoleGate>
  );
}
