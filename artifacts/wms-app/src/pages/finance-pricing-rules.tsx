import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Plus,
  Trash2,
  Copy,
  Edit,
  Tag,
  GripVertical,
  AlertTriangle,
  CheckCircle,
  Globe,
  Layers,
  Package,
  Calendar,
  Beaker,
} from "lucide-react";
import { RoleGate } from "@/components/role-gate";
import { useToast } from "@/hooks/use-toast";
import { RuleImpactPreview } from "@/components/finance/rule-impact-preview";


interface PricingRule {
  id: string;
  name: string;
  ruleType: string;
  scope: string;
  scopeId: string | null;
  conditionJson: Record<string, unknown> | null;
  actionJson: Record<string, unknown>;
  priority: number;
  isActive: boolean;
  validFrom: string | null;
  validTo: string | null;
  createdAt: string;
  updatedAt: string;
}

const RULE_TYPES = [
  { value: "margin_floor", label: "Margin Floor", icon: "🛡️", color: "text-red-600 bg-red-50" },
  { value: "markup_target", label: "Markup Target", icon: "🎯", color: "text-blue-600 bg-blue-50" },
  { value: "competitive_match", label: "Competitive Match", icon: "🏆", color: "text-purple-600 bg-purple-50" },
  { value: "volume_discount", label: "Volume Discount", icon: "📊", color: "text-green-600 bg-green-50" },
];

const SCOPE_OPTIONS = [
  { value: "global", label: "Global", icon: Globe },
  { value: "category", label: "Category", icon: Layers },
  { value: "product", label: "Product", icon: Package },
];

async function fetchPricingRules(): Promise<PricingRule[]> {
  const res = await fetch("/api/finance/pricing/rules", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load pricing rules");
  return res.json();
}

async function deleteRule(id: string): Promise<void> {
  const res = await fetch(`/api/finance/pricing/rules/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete rule");
}

async function createRule(data: Record<string, unknown>): Promise<PricingRule> {
  const res = await fetch("/api/finance/pricing/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to create rule");
  }
  return res.json();
}

async function updateRule(id: string, data: Record<string, unknown>): Promise<PricingRule> {
  const res = await fetch(`/api/finance/pricing/rules/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update rule");
  return res.json();
}

interface RuleFormData {
  name: string;
  ruleType: string;
  scope: string;
  scopeId: string;
  priority: string;
  actionValue: string;
  validFrom: string;
  validTo: string;
}

const defaultFormData: RuleFormData = {
  name: "",
  ruleType: "margin_floor",
  scope: "global",
  scopeId: "",
  priority: "0",
  actionValue: "",
  validFrom: "",
  validTo: "",
};

function RuleFormDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialData?: RuleFormData;
  onSave: (data: RuleFormData) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<RuleFormData>(initialData ?? defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when opening
  const handleOpenChange = (v: boolean) => {
    if (v) setForm(initialData ?? defaultFormData);
    setErrors({});
    onOpenChange(v);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Rule name is required";
    else if (form.name.length > 100) errs.name = "Max 100 characters";
    if (!form.actionValue) errs.actionValue = "Value is required";
    else {
      const v = parseFloat(form.actionValue);
      if (isNaN(v) || v < 0) errs.actionValue = "Must be a positive number";
      if (form.ruleType === "margin_floor" && v > 100) errs.actionValue = "Margin floor must be 0-100%";
      if (form.ruleType === "markup_target" && v > 500) errs.actionValue = "Markup target max 500%";
    }
    const priority = parseInt(form.priority);
    if (isNaN(priority) || priority < 0 || priority > 999) errs.priority = "Priority must be 0-999";
    if (form.scope === "category" && !form.scopeId.trim()) errs.scopeId = "Category is required";
    if (form.scope === "product" && !form.scopeId.trim()) errs.scopeId = "Product ID is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
  };

  const ruleTypeInfo = RULE_TYPES.find((r) => r.value === form.ruleType);
  const actionLabel =
    form.ruleType === "margin_floor" ? "Minimum Margin (%)" :
    form.ruleType === "markup_target" ? "Target Markup (%)" :
    form.ruleType === "volume_discount" ? "Discounted Price" :
    form.ruleType === "competitive_match" ? "Match Price" :
    "Action Value";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Pricing Rule" : "Create Pricing Rule"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Rule Name <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={(e) => setForm((d) => ({ ...d, name: e.target.value }))} placeholder="e.g. Standard margin floor" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Rule Type <span className="text-red-500">*</span></Label>
              <Select value={form.ruleType} onValueChange={(v) => setForm((d) => ({ ...d, ruleType: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_TYPES.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scope <span className="text-red-500">*</span></Label>
              <Select value={form.scope} onValueChange={(v) => setForm((d) => ({ ...d, scope: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map((so) => (
                    <SelectItem key={so.value} value={so.value}>{so.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.scope === "category" && (
            <div>
              <Label>Category ID <span className="text-red-500">*</span></Label>
              <Input value={form.scopeId} onChange={(e) => setForm((d) => ({ ...d, scopeId: e.target.value }))} placeholder="Category name or ID" />
              {errors.scopeId && <p className="text-xs text-red-500 mt-1">{errors.scopeId}</p>}
            </div>
          )}
          {form.scope === "product" && (
            <div>
              <Label>Product ID <span className="text-red-500">*</span></Label>
              <Input value={form.scopeId} onChange={(e) => setForm((d) => ({ ...d, scopeId: e.target.value }))} placeholder="UUID from product detail" />
              {errors.scopeId && <p className="text-xs text-red-500 mt-1">{errors.scopeId}</p>}
            </div>
          )}
          <div>
            <Label>{actionLabel} <span className="text-red-500">*</span></Label>
            <Input type="number" step="0.1" value={form.actionValue} onChange={(e) => setForm((d) => ({ ...d, actionValue: e.target.value }))} placeholder="0" />
            {errors.actionValue && <p className="text-xs text-red-500 mt-1">{errors.actionValue}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              {form.ruleType === "margin_floor" ? "Orders below this margin % will trigger alerts" :
               form.ruleType === "markup_target" ? "Suggested markup % above cost" :
               form.ruleType === "volume_discount" ? "Final price per unit at specified quantity" :
               "Competitor price to match"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Input type="number" value={form.priority} onChange={(e) => setForm((d) => ({ ...d, priority: e.target.value }))} placeholder="0" />
              {errors.priority && <p className="text-xs text-red-500 mt-1">{errors.priority}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mt-8">
                Higher priority = evaluated first
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valid From (optional)</Label>
              <Input type="date" value={form.validFrom} onChange={(e) => setForm((d) => ({ ...d, validFrom: e.target.value }))} />
            </div>
            <div>
              <Label>Valid To (optional)</Label>
              <Input type="date" value={form.validTo} onChange={(e) => setForm((d) => ({ ...d, validTo: e.target.value }))} />
            </div>
          </div>

          {/* Impact Preview */}
          <RuleImpactPreview
            scope={form.scope}
            scopeId={form.scopeId}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.actionValue}>
              {saving ? "Saving..." : initialData ? "Update Rule" : "Create Rule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FinancePricingRulesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: rules, isLoading, refetch } = useQuery({
    queryKey: ["pricing-rules"],
    queryFn: fetchPricingRules,
    refetchInterval: 30_000,
  });

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<{ id: string; formData: RuleFormData } | null>(null);

  // Delete confirm state
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleCreate = async (form: RuleFormData) => {
    setSaving(true);
    try {
      const actionType = form.ruleType === "margin_floor" ? "set_margin" :
        form.ruleType === "markup_target" ? "set_markup" :
        form.ruleType === "volume_discount" ? "set_price" : "set_price";

      await createRule({
        name: form.name,
        ruleType: form.ruleType,
        scope: form.scope,
        scopeId: form.scope && form.scope !== "global" ? form.scopeId || null : null,
        actionJson: { type: actionType, value: parseFloat(form.actionValue) },
        priority: parseInt(form.priority || "0"),
        ...(form.validFrom ? { validFrom: form.validFrom } : {}),
        ...(form.validTo ? { validTo: form.validTo } : {}),
      });
      toast({ title: "Pricing rule created" });
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (rule: PricingRule) => {
    const action = rule.actionJson as Record<string, unknown>;
    setEditingRule({
      id: rule.id,
      formData: {
        name: rule.name,
        ruleType: rule.ruleType,
        scope: rule.scope,
        scopeId: rule.scopeId ?? "",
        priority: rule.priority.toString(),
        actionValue: String(action.value ?? ""),
        validFrom: rule.validFrom ?? "",
        validTo: rule.validTo ?? "",
      },
    });
    setEditOpen(true);
  };

  const handleUpdate = async (form: RuleFormData) => {
    if (!editingRule) return;
    setSaving(true);
    try {
      const actionType = form.ruleType === "margin_floor" ? "set_margin" :
        form.ruleType === "markup_target" ? "set_markup" :
        form.ruleType === "volume_discount" ? "set_price" : "set_price";

      await updateRule(editingRule.id, {
        name: form.name,
        ruleType: form.ruleType,
        scope: form.scope,
        scopeId: form.scope && form.scope !== "global" ? form.scopeId || null : null,
        actionJson: { type: actionType, value: parseFloat(form.actionValue) },
        priority: parseInt(form.priority || "0"),
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
      });
      toast({ title: "Pricing rule updated" });
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRule(id);
      toast({ title: "Pricing rule deleted" });
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDeleting(null);
  };

  const handleDuplicate = async (rule: PricingRule) => {
    try {
      await createRule({
        name: `${rule.name} (Copy)`,
        ruleType: rule.ruleType,
        scope: rule.scope,
        scopeId: rule.scopeId,
        actionJson: rule.actionJson,
        priority: (rule.priority + 1),
        validFrom: rule.validFrom,
        validTo: rule.validTo,
      });
      toast({ title: "Rule duplicated" });
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (rule: PricingRule) => {
    try {
      await updateRule(rule.id, { isActive: !rule.isActive });
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
    } catch (err: any) {
      toast({ title: "Error toggling rule", variant: "destructive" });
    }
  };

  const ruleTypeMeta = (type: string) => RULE_TYPES.find((r) => r.value === type) ?? RULE_TYPES[0];
  const scopeMeta = (scope: string) => SCOPE_OPTIONS.find((s) => s.value === scope) ?? SCOPE_OPTIONS[0];

  return (
    <Layout>
      <PageHeader
        title="Pricing Rules"
        description="Configure pricing rules for margin protection, markup targets, volume discounts, and competitive matching"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Pricing Rules" },
        ]}
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New Rule
          </Button>
        }
      />

      <div className="p-6 max-w-6xl">

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Rules</p>
            <p className="text-xl font-bold">{isLoading ? <Skeleton className="h-6 w-8" /> : rules?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-xl font-bold text-green-600">{isLoading ? <Skeleton className="h-6 w-8" /> : rules?.filter((r) => r.isActive).length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Global</p>
            <p className="text-xl font-bold">{isLoading ? <Skeleton className="h-6 w-8" /> : rules?.filter((r) => r.scope === "global").length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Category/Product</p>
            <p className="text-xl font-bold">{isLoading ? <Skeleton className="h-6 w-8" /> : rules?.filter((r) => r.scope !== "global").length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Rules Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !rules?.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Tag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium">No pricing rules configured</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create rules for margin protection, markup targets, and volume discounts
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Create First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const rtm = ruleTypeMeta(rule.ruleType);
            const scm = scopeMeta(rule.scope);
            const ScopeIcon = scm.icon;
            const action = rule.actionJson as Record<string, unknown>;
            const actionDesc =
              rule.ruleType === "margin_floor" ? `Min margin: ${action.value}%` :
              rule.ruleType === "markup_target" ? `Target markup: ${action.value}%` :
              rule.ruleType === "volume_discount" ? `Price: $${action.value}` :
              `Match: $${action.value}`;

            return (
              <Card key={rule.id} className={!rule.isActive ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${rtm.color}`}>
                        <Tag className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{rule.name}</span>
                          <Badge variant="outline" className={rtm.color.split(" ")[0]}>{rtm.label}</Badge>
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <ScopeIcon className="w-3 h-3" />
                            {rule.scope}
                          </Badge>
                          {rule.scopeId && (
                            <span className="text-xs text-muted-foreground">({rule.scopeId.slice(0, 8)}...)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Priority: {rule.priority}</span>
                          <span>{actionDesc}</span>
                          {rule.validFrom && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {rule.validFrom} → {rule.validTo ?? "∞"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => handleToggleActive(rule)}
                        title={rule.isActive ? "Deactivate" : "Activate"}
                      />
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEdit(rule)} title="Edit">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleDuplicate(rule)} title="Duplicate">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8" title="Test Rule" onClick={() => setLocation(`/finance/pricing/simulator?testRule=${rule.id}`)}>
                        <Beaker className="w-3.5 h-3.5" />
                      </Button>
                      {deleting === rule.id ? (
                        <div className="flex items-center gap-1">
                          <Button variant="destructive" size="sm" className="h-8" onClick={() => handleDelete(rule.id)}>Confirm</Button>
                          <Button variant="outline" size="sm" className="h-8" onClick={() => setDeleting(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleting(rule.id)} title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      </div>

      {/* Create Dialog */}
      <RuleFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
        saving={saving}
      />

      {/* Edit Dialog */}
      {editingRule && (
        <RuleFormDialog
          open={editOpen}
          onOpenChange={(v) => { setEditOpen(v); if (!v) setEditingRule(null); }}
          initialData={editingRule.formData}
          onSave={handleUpdate}
          saving={saving}
        />
      )}
    </Layout>
  );
}

export default function FinancePricingRulesPageWithGate() {
  return (
    <RoleGate roles={["admin", "operator"]}>
      <FinancePricingRulesPage />
    </RoleGate>
  );
}
