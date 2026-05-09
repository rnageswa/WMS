import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useGetPoTemplate,
  useUpdatePoTemplate,
  useDeletePoTemplate,
  useCreatePoFromTemplate,
  useSendPurchaseOrderEmail,
  useListSuppliers,
  useListInventory,
  getGetPoTemplateQueryKey,
  getListPoTemplatesQueryKey,
  getListInventoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Copy,
  Truck,
  Plus,
  Trash2,
  Pencil,
  ShoppingCart,
  Loader2,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Mail,
  MailCheck,
  ArrowRight,
  HelpCircle,
  Save,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useBaseCurrency } from "@/hooks/use-base-currency";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TemplateLine {
  id: string;
  templateId: string;
  productId: string;
  skuCode: string | null;
  productName: string | null;
  defaultQty: number;
  defaultUnitCost: number | null;
}

interface EditLineForm {
  key: number;
  lineId: string | null;
  productId: string;
  defaultQty: number;
  defaultUnitCost: string;
}

interface CreatedPoInfo {
  id: string;
  poNumber: string;
  supplierName: string | null;
  supplierId: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let lineKey = 0;
const FREE_TEXT = "__free_text__";

// ── Email dialog (reused from reorder page pattern) ───────────────────────────

function EmailPoDialog({
  info,
  defaultEmail,
  onSend,
  onSkip,
  sending,
}: {
  info: CreatedPoInfo;
  defaultEmail: string;
  onSend: (email: string) => void;
  onSkip: () => void;
  sending: boolean;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !sending) onSkip(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Draft PO Created</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">{info.poNumber}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-sm text-muted-foreground">
            Would you like to email this purchase order to{" "}
            <span className="font-medium text-foreground">
              {info.supplierName ?? "the supplier"}
            </span>{" "}
            right now?
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Supplier email</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="email"
                placeholder="supplier@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-8 h-9 text-sm"
                disabled={sending}
                autoFocus
              />
            </div>
            {!defaultEmail && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                No email on file for this supplier — enter one manually.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 flex-row justify-end">
          <Button variant="ghost" size="sm" onClick={onSkip} disabled={sending} className="text-xs h-8">
            Skip — View PO <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
          <Button
            size="sm"
            disabled={!valid || sending}
            onClick={() => onSend(email.trim())}
            className="bg-[#E8622A] hover:bg-[#E8622A]/90 text-white h-8 text-xs gap-1.5"
          >
            {sending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
            ) : (
              <><MailCheck className="w-3.5 h-3.5" /> Send Email &amp; View PO</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PoTemplateDetailPage() {
  const baseCurrency = useBaseCurrency();
  const fmtCurrency = (n: number) => formatCurrency(n, baseCurrency);

  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSupplierId, setEditSupplierId] = useState("");
  const [editSupplierFreeText, setEditSupplierFreeText] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLines, setEditLines] = useState<EditLineForm[]>([]);

  // Create PO dialog state
  const [createPoOpen, setCreatePoOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [lineOverrides, setLineOverrides] = useState<Map<string, number>>(new Map());

  // Post-creation email dialog state
  const [createdPoInfo, setCreatedPoInfo] = useState<CreatedPoInfo | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: rawTemplate, isLoading } = useGetPoTemplate(id!, {
    query: {
      queryKey: getGetPoTemplateQueryKey(id!),
      enabled: !!id,
    },
  });

  const template = rawTemplate as (typeof rawTemplate & { lines: TemplateLine[] }) | undefined;
  const lines: TemplateLine[] = (template as any)?.lines ?? [];

  const { data: suppliers = [] } = useListSuppliers({ isActive: undefined });
  const { data: inventoryItems = [] } = useListInventory(
    { productId: undefined, binId: undefined, warehouseId: undefined, lowStock: false },
    { query: { queryKey: getListInventoryQueryKey() } }
  );

  const productOptions = (() => {
    const seen = new Map<string, { id: string; skuCode: string; name: string }>();
    for (const item of inventoryItems) {
      if (!seen.has(item.productId)) {
        seen.set(item.productId, {
          id: item.productId,
          skuCode: (item as any).product?.skuCode ?? "",
          name: (item as any).product?.name ?? "",
        });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.skuCode.localeCompare(b.skuCode));
  })();

  const { mutate: updateTemplate, isPending: updating } = useUpdatePoTemplate({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetPoTemplateQueryKey(id!) });
        qc.invalidateQueries({ queryKey: getListPoTemplatesQueryKey() });
        toast({ title: "Template saved" });
        setEditing(false);
      },
      onError: () => toast({ title: "Failed to save template", variant: "destructive" }),
    },
  });

  const { mutate: deleteTemplate, isPending: deleting } = useDeletePoTemplate({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPoTemplatesQueryKey() });
        toast({ title: "Template deleted" });
        navigate("/purchase-orders/templates");
      },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  const { mutate: createPoFromTemplate, isPending: creatingPo } = useCreatePoFromTemplate({
    mutation: {
      onSuccess: (data) => {
        setCreatePoOpen(false);
        setCreatedPoInfo({
          id: (data as any).id,
          poNumber: (data as any).poNumber,
          supplierName: (data as any).supplierName ?? null,
          supplierId: (data as any).supplierId ?? null,
        });
      },
      onError: () => toast({ title: "Failed to create PO", variant: "destructive" }),
    },
  });

  const { mutate: sendEmail } = useSendPurchaseOrderEmail({
    mutation: {
      onSuccess: (result) => {
        setSendingEmail(false);
        toast({ title: `PO emailed to ${result.to}` });
        const poId = createdPoInfo?.id;
        setCreatedPoInfo(null);
        if (poId) navigate(`/purchase-orders/${poId}`);
      },
      onError: () => {
        setSendingEmail(false);
        toast({ title: "Email failed — check the address", variant: "destructive" });
      },
    },
  });

  const getSupplierEmail = (supplierId: string | null): string => {
    if (!supplierId) return "";
    return (suppliers.find((s) => s.id === supplierId) as any)?.email ?? "";
  };

  // ── Edit mode ──────────────────────────────────────────────────────────────

  const enterEditMode = () => {
    if (!template) return;
    setEditName(template.name);
    const matchedSupplier = suppliers.find((s) => s.id === template.supplierId);
    if (matchedSupplier) {
      setEditSupplierId(matchedSupplier.id);
    } else if (template.supplierName) {
      setEditSupplierId(FREE_TEXT);
      setEditSupplierFreeText(template.supplierName);
    } else {
      setEditSupplierId("");
    }
    setEditNotes(template.notes ?? "");
    setEditLines(
      lines.map((l) => ({
        key: lineKey++,
        lineId: l.id,
        productId: l.productId,
        defaultQty: l.defaultQty,
        defaultUnitCost: l.defaultUnitCost != null ? String(l.defaultUnitCost) : "",
      }))
    );
    setEditing(true);
  };

  const addEditLine = () =>
    setEditLines((prev) => [
      ...prev,
      { key: lineKey++, lineId: null, productId: "", defaultQty: 1, defaultUnitCost: "" },
    ]);
  const removeEditLine = (key: number) =>
    setEditLines((prev) => prev.filter((l) => l.key !== key));
  const updateEditLine = (key: number, patch: Partial<EditLineForm>) =>
    setEditLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const editSupplierId_resolved =
    editSupplierId && editSupplierId !== FREE_TEXT ? editSupplierId : null;
  const editSupplierName_resolved =
    editSupplierId === FREE_TEXT ? editSupplierFreeText.trim() : "";
  const editSelectedSupplier = suppliers.find((s) => s.id === editSupplierId);
  const editCanSave =
    editName.trim().length > 0 &&
    editLines.every((l) => l.productId && l.defaultQty >= 1);

  const handleSave = () => {
    if (!editCanSave) return;
    updateTemplate({
      id: id!,
      data: {
        name: editName.trim(),
        supplierId: editSupplierId_resolved ?? undefined,
        supplierName: editSupplierName_resolved || undefined,
        notes: editNotes.trim() || undefined,
        lines: editLines.map((l) => ({
          productId: l.productId,
          defaultQty: l.defaultQty,
          defaultUnitCost: l.defaultUnitCost ? parseFloat(l.defaultUnitCost) : undefined,
        })),
      },
    });
  };

  // ── Create PO ──────────────────────────────────────────────────────────────

  const handleCreatePo = () => {
    const overridesArr = Array.from(lineOverrides.entries()).map(([lineId, qty]) => ({
      lineId,
      qty,
    }));
    createPoFromTemplate({
      id: id!,
      data: {
        expectedDeliveryDate: deliveryDate || undefined,
        lineOverrides: overridesArr.length > 0 ? overridesArr : undefined,
      },
    });
  };

  const getLineQty = (lineId: string, defaultQty: number) =>
    lineOverrides.get(lineId) ?? defaultQty;

  // ── Loading state ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Layout>
        <PageHeader title="PO Template" />
        <div className="p-6 space-y-4 max-w-3xl">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      </Layout>
    );
  }

  if (!template) {
    return (
      <Layout>
        <PageHeader title="Template not found" />
        <div className="p-6">
          <Button variant="outline" asChild size="sm">
            <Link href="/purchase-orders/templates">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Templates
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={editing ? "Edit Template" : template.name}
        subtitle={
          !editing
            ? template.supplierName
              ? `Supplier: ${template.supplierName} · ${lines.length} line${lines.length !== 1 ? "s" : ""}`
              : `${lines.length} line${lines.length !== 1 ? "s" : ""} · No supplier set`
            : "Make changes and save"
        }
        action={
          <div className="flex items-center gap-2">
            {!editing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={enterEditMode}
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
                  onClick={() => {
                    setLineOverrides(new Map());
                    setDeliveryDate("");
                    setCreatePoOpen(true);
                  }}
                  disabled={!template.supplierName && !template.supplierId}
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Create PO
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/purchase-orders/templates">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Templates
              </Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-3xl space-y-5">
        {!editing ? (
          <>
            {/* Read-only view */}
            {(template.notes || template.supplierId) && (
              <Card className="border-border/60">
                <CardContent className="px-5 py-4 space-y-3">
                  {template.supplierId && (
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Link href={`/suppliers/${template.supplierId}`} className="font-medium hover:text-[#E8622A]">
                        {template.supplierName}
                      </Link>
                    </div>
                  )}
                  {template.notes && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{template.notes}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground/60">
                    Created {formatDistanceToNow(new Date(template.createdAt), { addSuffix: true })}
                    {template.updatedAt !== template.createdAt &&
                      ` · Updated ${formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}`}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Lines table */}
            <Card className="border-border/60">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Default Line Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-1">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold pl-5">Product</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Default Qty</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right pr-5">Default Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.id} className="hover:bg-muted/20">
                        <TableCell className="pl-5">
                          <div>
                            <Link href={`/products/${line.productId}`}>
                              <span className="text-sm font-medium hover:text-[#E8622A] cursor-pointer">
                                {line.productName ?? "Unknown Product"}
                              </span>
                            </Link>
                            {line.skuCode && (
                              <code className="block text-[10px] text-muted-foreground font-mono mt-0.5">
                                {line.skuCode}
                              </code>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-semibold">
                          {line.defaultQty}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-muted-foreground pr-5">
                          {line.defaultUnitCost != null ? fmtCurrency(line.defaultUnitCost) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Danger zone */}
            <div className="flex justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Template
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Edit mode */}
            <Card className="border-border/60">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                  Template Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Template Name *</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Supplier</Label>
                  <Select
                    value={editSupplierId}
                    onValueChange={(v) => { setEditSupplierId(v); setEditSupplierFreeText(""); }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select a supplier (optional)…" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <Truck className="w-3 h-3 text-muted-foreground shrink-0" />
                            {s.name}
                          </span>
                        </SelectItem>
                      ))}
                      <SelectItem value={FREE_TEXT}>
                        <span className="text-muted-foreground italic">+ Enter name manually…</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {editSupplierId === FREE_TEXT && (
                    <Input
                      placeholder="Supplier name"
                      value={editSupplierFreeText}
                      onChange={(e) => setEditSupplierFreeText(e.target.value)}
                      className="h-9 text-sm"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="text-sm min-h-[72px] resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  Line Items
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={addEditLine} className="gap-1 text-xs h-7">
                  <Plus className="w-3 h-3" /> Add Line
                </Button>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                {editLines.map((line, idx) => (
                  <div key={line.key} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1.5">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Product *</Label>}
                      <Select value={line.productId} onValueChange={(v) => updateEditLine(line.key, { productId: v })}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select product…" />
                        </SelectTrigger>
                        <SelectContent>
                          {productOptions.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="flex items-center gap-2 font-mono text-xs">
                                {p.skuCode}
                                <span className="font-sans text-sm">{p.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24 space-y-1.5 shrink-0">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Default Qty *</Label>}
                      <Input
                        type="number"
                        min={1}
                        value={line.defaultQty}
                        onChange={(e) => updateEditLine(line.key, { defaultQty: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="h-9 text-sm text-right"
                      />
                    </div>
                    <div className="w-28 space-y-1.5 shrink-0">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Unit Cost</Label>}
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          value={line.defaultUnitCost}
                          onChange={(e) => updateEditLine(line.key, { defaultUnitCost: e.target.value })}
                          className="h-9 text-sm pl-5"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-red-600 hover:bg-red-50 shrink-0"
                      disabled={editLines.length === 1}
                      onClick={() => removeEditLine(line.key)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!editCanSave || updating}
                onClick={handleSave}
                className="bg-[#E8622A] hover:bg-[#E8622A]/90 text-white gap-1.5"
              >
                {updating ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                ) : (
                  <><Save className="w-3.5 h-3.5" /> Save Changes</>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Create PO dialog */}
      <Dialog open={createPoOpen} onOpenChange={setCreatePoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#E8622A]" />
              Create PO from "{template.name}"
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Delivery date */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Expected Delivery Date (optional)
              </Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Lines with editable qty override */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Order Quantities (adjust if needed)</Label>
              <div className="border border-border/60 rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold pl-4">Product</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right pr-4 w-28">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.id} className="hover:bg-muted/10">
                        <TableCell className="pl-4 py-2">
                          <p className="text-sm font-medium">{line.productName ?? "Unknown"}</p>
                          {line.skuCode && <code className="text-[10px] text-muted-foreground font-mono">{line.skuCode}</code>}
                        </TableCell>
                        <TableCell className="pr-4 py-2 text-right">
                          <Input
                            type="number"
                            min={1}
                            value={getLineQty(line.id, line.defaultQty)}
                            onChange={(e) => {
                              const qty = Math.max(1, parseInt(e.target.value) || 1);
                              setLineOverrides((prev) => new Map(prev).set(line.id, qty));
                            }}
                            className="h-7 w-20 text-xs text-right ml-auto"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-row justify-end">
            <Button variant="ghost" size="sm" onClick={() => setCreatePoOpen(false)} disabled={creatingPo} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreatePo}
              disabled={creatingPo}
              className="bg-[#E8622A] hover:bg-[#E8622A]/90 text-white h-8 text-xs gap-1.5"
            >
              {creatingPo ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</>
              ) : (
                <><ShoppingCart className="w-3.5 h-3.5" /> Create Draft PO</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{template.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This template will be permanently removed. Existing purchase orders created from it are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteTemplate({ id: id! })}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete Template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Post-creation email dialog */}
      {createdPoInfo && (
        <EmailPoDialog
          info={createdPoInfo}
          defaultEmail={getSupplierEmail(createdPoInfo.supplierId)}
          sending={sendingEmail}
          onSend={(email) => {
            setSendingEmail(true);
            sendEmail({ id: createdPoInfo.id, data: { to: email } });
          }}
          onSkip={() => {
            const poId = createdPoInfo.id;
            setCreatedPoInfo(null);
            navigate(`/purchase-orders/${poId}`);
          }}
        />
      )}
    </Layout>
  );
}
