import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetReorderSuggestions,
  useCreatePurchaseOrder,
  useSendPurchaseOrderEmail,
  useListSuppliers,
  createPurchaseOrder,
  createPoTemplate,
} from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Truck,
  Zap,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  ShoppingCart,
  Clock,
  HelpCircle,
  Mail,
  MailCheck,
  ArrowRight,
  Loader2,
  BellRing,
  BookmarkPlus,
  Layers,
  ExternalLink,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useBaseCurrency } from "@/hooks/use-base-currency";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SuggestionItem {
  productId: string;
  skuCode: string;
  name: string;
  category: string | null;
  currentQty: number;
  reorderThreshold: number;
  deficit: number;
  suggestedQty: number;
  lastUnitCost: number | null;
  lastPoDate: string | null;
}

interface SuggestionGroup {
  supplierId: string | null;
  supplierName: string | null;
  lastPoDate: string | null;
  items: SuggestionItem[];
}

interface ItemState {
  selected: boolean;
  qty: number;
}

interface CreatedPoInfo {
  id: string;
  poNumber: string;
  supplierId: string | null;
  supplierName: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupKey(g: SuggestionGroup) {
  return g.supplierId ?? g.supplierName ?? "__none__";
}

// ── Post-creation email dialog ────────────────────────────────────────────────

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
            <span className="font-medium text-foreground">{info.supplierName ?? "the supplier"}</span>{" "}
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
            Skip — View PO
            <ArrowRight className="w-3 h-3 ml-1" />
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

// ── Save-as-template dialog ────────────────────────────────────────────────────

function SaveAsTemplateDialog({
  group,
  itemStates,
  onClose,
}: {
  group: SuggestionGroup;
  itemStates: Map<string, ItemState>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(
    group.supplierName ? `${group.supplierName} — Reorder Template` : "Reorder Template"
  );
  const [saving, setSaving] = useState(false);

  const selectedItems = group.items.filter(
    (item) => itemStates.get(item.productId)?.selected !== false
  );

  const handleSave = async () => {
    if (!name.trim() || selectedItems.length === 0) return;
    setSaving(true);
    try {
      await createPoTemplate({
        name: name.trim(),
        supplierId: group.supplierId ?? undefined,
        supplierName: !group.supplierId && group.supplierName ? group.supplierName : undefined,
        lines: selectedItems.map((item) => ({
          productId: item.productId,
          defaultQty: itemStates.get(item.productId)?.qty ?? item.suggestedQty,
          defaultUnitCost: item.lastUnitCost ?? undefined,
        })),
      });
      toast({ title: `Template "${name.trim()}" saved with ${selectedItems.length} item${selectedItems.length !== 1 ? "s" : ""}` });
      onClose();
    } catch {
      toast({ title: "Failed to save template", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-[#0F2540]/10 border border-[#0F2540]/20 flex items-center justify-center shrink-0">
              <BookmarkPlus className="w-5 h-5 text-[#0F2540]" />
            </div>
            <div>
              <DialogTitle className="text-base">Save as Template</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} · {group.supplierName ?? "No supplier"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-sm text-muted-foreground">
            Save the currently selected items and quantities as a reusable PO template for future orders.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Template name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim() && !saving) handleSave(); }}
              className="h-9 text-sm"
              disabled={saving}
              autoFocus
            />
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 space-y-1">
            {selectedItems.slice(0, 4).map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-xs">
                <span className="text-foreground truncate mr-2">{item.name}</span>
                <span className="text-muted-foreground shrink-0">qty {itemStates.get(item.productId)?.qty ?? item.suggestedQty}</span>
              </div>
            ))}
            {selectedItems.length > 4 && (
              <p className="text-[10px] text-muted-foreground">+{selectedItems.length - 4} more…</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 flex-row justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving} className="text-xs h-8">
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!name.trim() || saving || selectedItems.length === 0}
            onClick={handleSave}
            className="bg-[#0F2540] hover:bg-[#0F2540]/90 text-white h-8 text-xs gap-1.5"
          >
            {saving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
            ) : (
              <><BookmarkPlus className="w-3.5 h-3.5" /> Save Template</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk-create results dialog ─────────────────────────────────────────────────

interface BulkPoResult {
  supplierId: string | null;
  supplierName: string | null;
  poId?: string;
  poNumber?: string;
  lineCount?: number;
  error?: string;
}

function BulkResultsDialog({
  results,
  onClose,
}: {
  results: BulkPoResult[];
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const succeeded = results.filter((r) => r.poId);
  const failed = results.filter((r) => r.error);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              failed.length === 0 ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"
            }`}>
              {failed.length === 0
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                : <AlertTriangle className="w-5 h-5 text-amber-600" />
              }
            </div>
            <div>
              <DialogTitle className="text-base">
                {succeeded.length} Draft PO{succeeded.length !== 1 ? "s" : ""} Created
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {failed.length > 0 ? `${failed.length} failed — see below` : "All purchase orders created successfully"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 py-1 max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
                r.poId ? "border-border/60 bg-muted/20" : "border-red-200 bg-red-50/30"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {r.poId
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  : <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                }
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.supplierName ?? "Unknown Supplier"}</p>
                  {r.poNumber && (
                    <p className="text-[10px] font-mono text-muted-foreground">{r.poNumber} · {r.lineCount} line{r.lineCount !== 1 ? "s" : ""}</p>
                  )}
                  {r.error && <p className="text-[10px] text-red-600">{r.error}</p>}
                </div>
              </div>
              {r.poId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 shrink-0 ml-2"
                  onClick={() => { onClose(); navigate(`/purchase-orders/${r.poId}`); }}
                >
                  View <ExternalLink className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 flex-row justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-8">
            Close
          </Button>
          <Button
            size="sm"
            onClick={() => { onClose(); navigate("/purchase-orders"); }}
            className="bg-[#E8622A] hover:bg-[#E8622A]/90 text-white h-8 text-xs gap-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            View All POs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Per-supplier group card ───────────────────────────────────────────────────

function SupplierGroupCard({
  group,
  itemStates,
  onToggleItem,
  onToggleAll,
  onQtyChange,
  onCreatePo,
  creating,
  onSaveAsTemplate,
  baseCurrency,
}: {
  group: SuggestionGroup;
  itemStates: Map<string, ItemState>;
  onToggleItem: (productId: string) => void;
  onToggleAll: (selected: boolean) => void;
  onQtyChange: (productId: string, qty: number) => void;
  onCreatePo: () => void;
  creating: boolean;
  onSaveAsTemplate: () => void;
  baseCurrency: string;
}) {
  const fmtCurrency = (n: number) => formatCurrency(n, baseCurrency);
  const selectedItems = group.items.filter((item) => itemStates.get(item.productId)?.selected !== false);
  const allSelected = selectedItems.length === group.items.length;
  const someSelected = selectedItems.length > 0;
  const hasSupplier = !!(group.supplierId || group.supplierName);

  const totalEstCost = selectedItems.reduce((sum, item) => {
    const qty = itemStates.get(item.productId)?.qty ?? item.suggestedQty;
    return sum + qty * (item.lastUnitCost ?? 0);
  }, 0);

  const supplierLabel = group.supplierName ?? "Unknown Supplier";

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${hasSupplier ? "bg-[#E8622A]/10" : "bg-muted"}`}>
            {hasSupplier
              ? <Truck className="w-4 h-4 text-[#E8622A]" />
              : <HelpCircle className="w-4 h-4 text-muted-foreground" />
            }
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">
              {hasSupplier ? supplierLabel : "No supplier history"}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {group.items.length} item{group.items.length !== 1 ? "s" : ""} below threshold
              {group.lastPoDate && (
                <> · Last order {new Date(group.lastPoDate + "T00:00:00").toLocaleDateString()}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalEstCost > 0 && someSelected && (
            <span className="text-xs text-muted-foreground">
              Est. {fmtCurrency(totalEstCost)}
            </span>
          )}
          {someSelected && (
            <Button
              size="sm"
              variant="outline"
              disabled={creating}
              onClick={onSaveAsTemplate}
              className="h-8 text-xs gap-1.5 border-[#0F2540]/30 text-[#0F2540] hover:bg-[#0F2540]/5"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              Save as Template
            </Button>
          )}
          {hasSupplier ? (
            <Button
              size="sm"
              disabled={!someSelected || creating}
              onClick={onCreatePo}
              className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white h-8 text-xs"
            >
              {creating ? (
                <><Clock className="w-3.5 h-3.5 animate-spin" /> Creating…</>
              ) : (
                <><ShoppingCart className="w-3.5 h-3.5" /> Create Draft PO ({selectedItems.length})</>
              )}
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild className="h-8 text-xs gap-1.5">
              <Link href="/purchase-orders/new">
                <ShoppingCart className="w-3.5 h-3.5" />
                New PO manually
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 pb-1">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10 pl-5">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => onToggleAll(!!v)}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Product</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">In Stock</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Threshold</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Deficit</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right pr-5">Order Qty</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Last Cost</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right pr-5">Est. Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.items.map((item) => {
              const state = itemStates.get(item.productId) ?? { selected: true, qty: item.suggestedQty };
              const lineTotal = state.qty * (item.lastUnitCost ?? 0);
              return (
                <TableRow
                  key={item.productId}
                  className={`hover:bg-muted/20 ${!state.selected ? "opacity-50" : ""}`}
                >
                  <TableCell className="pl-5">
                    <Checkbox
                      checked={state.selected}
                      onCheckedChange={() => onToggleItem(item.productId)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <Link href={`/products/${item.productId}`}>
                        <span className="text-sm font-medium hover:text-[#E8622A] cursor-pointer">{item.name}</span>
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <code className="text-[10px] text-muted-foreground font-mono">{item.skuCode}</code>
                        {item.category && (
                          <span className="text-[10px] text-muted-foreground">· {item.category}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={`text-sm font-bold ${item.currentQty === 0 ? "text-red-600" : "text-amber-600"}`}>
                      {item.currentQty}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                    {item.reorderThreshold}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 text-[10px] font-bold">
                      -{item.deficit}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-5">
                    <Input
                      type="number"
                      min={1}
                      value={state.qty}
                      onChange={(e) => onQtyChange(item.productId, Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-7 w-20 text-xs text-right ml-auto"
                      disabled={!state.selected}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                    {item.lastUnitCost !== null ? fmtCurrency(item.lastUnitCost) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs font-medium pr-5">
                    {item.lastUnitCost !== null && state.qty > 0 ? fmtCurrency(lineTotal) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Reorder Alert Email Dialog ────────────────────────────────────────────────

function SendAlertDialog({
  itemCount,
  onClose,
}: {
  itemCount: number;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/notifications/reorder-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.sent) {
        throw new Error(json.error ?? "Unknown error");
      }
      toast({ title: `Reorder alert sent to ${email.trim()}` });
      onClose();
    } catch (err: any) {
      toast({ title: err?.message ?? "Failed to send alert", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !sending) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-[#E8622A]/10 border border-[#E8622A]/20 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 text-[#E8622A]" />
            </div>
            <div>
              <DialogTitle className="text-base">Send Reorder Alert</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {itemCount} item{itemCount !== 1 ? "s" : ""} below reorder threshold
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-sm text-muted-foreground">
            An email summary of all low-stock items will be sent to the address below.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Recipient email</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && valid && !sending) handleSend(); }}
                className="pl-8 h-9 text-sm"
                disabled={sending}
                autoFocus
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-row justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={sending} className="text-xs h-8">
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!valid || sending}
            onClick={handleSend}
            className="bg-[#E8622A] hover:bg-[#E8622A]/90 text-white h-8 text-xs gap-1.5"
          >
            {sending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
            ) : (
              <><MailCheck className="w-3.5 h-3.5" /> Send Alert</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReorderSuggestionsPage() {
  const baseCurrency = useBaseCurrency();

  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data, isLoading } = useGetReorderSuggestions();
  const suggestions = data as { generatedAt: string; totalItems: number; groups: SuggestionGroup[] } | undefined;
  const groups = suggestions?.groups ?? [];

  // Suppliers list — for email pre-fill
  const { data: suppliers = [] } = useListSuppliers({ isActive: undefined });

  // Per-group item state
  const [groupStates, setGroupStates] = useState<Map<string, Map<string, ItemState>>>(new Map());
  const [creatingGroup, setCreatingGroup] = useState<string | null>(null);

  // Alert email dialog state
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  // Post-creation email dialog state
  const [createdPoInfo, setCreatedPoInfo] = useState<CreatedPoInfo | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Bulk create state
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkPoResult[] | null>(null);

  // Save-as-template state
  const [saveTemplateGroup, setSaveTemplateGroup] = useState<SuggestionGroup | null>(null);

  const { mutate: sendEmail } = useSendPurchaseOrderEmail({
    mutation: {
      onSuccess: (result) => {
        setSendingEmail(false);
        toast({ title: `PO emailed to ${result.to}` });
        const id = createdPoInfo?.id;
        setCreatedPoInfo(null);
        if (id) navigate(`/purchase-orders/${id}`);
      },
      onError: () => {
        setSendingEmail(false);
        toast({ title: "Email failed — check the address and try again", variant: "destructive" });
      },
    },
  });

  const { mutate: createPo } = useCreatePurchaseOrder({
    mutation: {
      onSuccess: (data, variables) => {
        setCreatingGroup(null);
        // Find supplier email
        const supplierId = (variables.data as any).supplierId ?? null;
        const supplierName = (variables.data as any).supplierName ?? data.supplierName ?? null;
        setCreatedPoInfo({
          id: data.id,
          poNumber: data.poNumber,
          supplierId,
          supplierName,
        });
      },
      onError: () => {
        setCreatingGroup(null);
        toast({ title: "Failed to create PO", variant: "destructive" });
      },
    },
  });

  // Resolve supplier email from suppliers list
  const getSupplierEmail = (supplierId: string | null): string => {
    if (!supplierId) return "";
    const s = suppliers.find((s) => s.id === supplierId);
    return (s as any)?.email ?? "";
  };

  // Item state helpers
  function getGroupItemStates(group: SuggestionGroup): Map<string, ItemState> {
    const key = groupKey(group);
    if (!groupStates.has(key)) {
      const m = new Map<string, ItemState>();
      for (const item of group.items) {
        m.set(item.productId, { selected: true, qty: item.suggestedQty });
      }
      return m;
    }
    return groupStates.get(key)!;
  }

  function mutateGroupState(
    group: SuggestionGroup,
    updater: (m: Map<string, ItemState>) => Map<string, ItemState>
  ) {
    const key = groupKey(group);
    setGroupStates((prev) => {
      const next = new Map(prev);
      const current = prev.get(key) ?? (() => {
        const m = new Map<string, ItemState>();
        for (const item of group.items) {
          m.set(item.productId, { selected: true, qty: item.suggestedQty });
        }
        return m;
      })();
      next.set(key, updater(new Map(current)));
      return next;
    });
  }

  function handleToggleItem(group: SuggestionGroup, productId: string) {
    mutateGroupState(group, (m) => {
      const cur = m.get(productId)!;
      m.set(productId, { ...cur, selected: !cur.selected });
      return m;
    });
  }

  function handleToggleAll(group: SuggestionGroup, selected: boolean) {
    mutateGroupState(group, (m) => {
      for (const item of group.items) {
        const cur = m.get(item.productId) ?? { selected: true, qty: item.suggestedQty };
        m.set(item.productId, { ...cur, selected });
      }
      return m;
    });
  }

  function handleQtyChange(group: SuggestionGroup, productId: string, qty: number) {
    mutateGroupState(group, (m) => {
      const cur = m.get(productId)!;
      m.set(productId, { ...cur, qty });
      return m;
    });
  }

  function handleCreatePo(group: SuggestionGroup) {
    const states = getGroupItemStates(group);
    const selectedItems = group.items.filter((item) => states.get(item.productId)?.selected !== false);
    if (selectedItems.length === 0) return;

    const key = groupKey(group);
    setCreatingGroup(key);

    createPo({
      data: {
        supplierId: group.supplierId ?? undefined,
        supplierName: group.supplierName && !group.supplierId ? group.supplierName : undefined,
        lines: selectedItems.map((item) => ({
          productId: item.productId,
          qtyOrdered: states.get(item.productId)?.qty ?? item.suggestedQty,
          unitCost: item.lastUnitCost ?? undefined,
        })),
      },
    });
  }

  const totalSelected = groups.reduce((sum, group) => {
    const states = getGroupItemStates(group);
    return sum + group.items.filter((item) => states.get(item.productId)?.selected !== false).length;
  }, 0);

  // Groups that have a supplier + at least one selected item — eligible for bulk create
  const bulkEligibleGroups = groups.filter((group) => {
    if (!(group.supplierId || group.supplierName)) return false;
    const states = getGroupItemStates(group);
    return group.items.some((item) => states.get(item.productId)?.selected !== false);
  });

  async function handleBulkCreate() {
    if (bulkEligibleGroups.length === 0) return;
    setBulkCreating(true);
    const results = await Promise.allSettled(
      bulkEligibleGroups.map((group) => {
        const states = getGroupItemStates(group);
        const selectedItems = group.items.filter((item) => states.get(item.productId)?.selected !== false);
        return createPurchaseOrder({
          supplierId: group.supplierId ?? undefined,
          supplierName: group.supplierName && !group.supplierId ? group.supplierName : undefined,
          lines: selectedItems.map((item) => ({
            productId: item.productId,
            qtyOrdered: states.get(item.productId)?.qty ?? item.suggestedQty,
            unitCost: item.lastUnitCost ?? undefined,
          })),
        }).then((po) => ({ group, po }));
      })
    );
    setBulkCreating(false);
    setBulkResults(
      bulkEligibleGroups.map((group, i) => {
        const r = results[i];
        if (r.status === "fulfilled") {
          return {
            supplierId: group.supplierId,
            supplierName: group.supplierName,
            poId: r.value.po.id,
            poNumber: r.value.po.poNumber,
            lineCount: (r.value.po as any).lineCount ?? (r.value.po as any).lines?.length,
          };
        }
        return {
          supplierId: group.supplierId,
          supplierName: group.supplierName,
          error: "Failed to create",
        };
      })
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Reorder Suggestions"
        subtitle={
          isLoading
            ? "Loading…"
            : suggestions?.totalItems
            ? `${suggestions.totalItems} item${suggestions.totalItems !== 1 ? "s" : ""} below reorder threshold`
            : "All stock levels are healthy"
        }
        action={
          <div className="flex items-center gap-2">
            {!isLoading && bulkEligibleGroups.length > 1 && (
              <Button
                size="sm"
                disabled={bulkCreating}
                onClick={handleBulkCreate}
                className="gap-1.5 bg-[#0F2540] hover:bg-[#0F2540]/90 text-white h-8 text-xs"
              >
                {bulkCreating ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</>
                ) : (
                  <><Layers className="w-3.5 h-3.5" /> Create All {bulkEligibleGroups.length} Draft POs</>
                )}
              </Button>
            )}
            {!isLoading && (suggestions?.totalItems ?? 0) > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setAlertDialogOpen(true)}
              >
                <BellRing className="w-3.5 h-3.5" />
                Send Reorder Alert
              </Button>
            )}
            <Link href="/purchase-orders">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Purchase Orders
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-5 max-w-5xl">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <Card className="border-border/60 border-emerald-200 bg-emerald-50/20">
            <CardContent className="px-5 py-12 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">All products are well-stocked</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                No products are currently below their reorder threshold.
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/purchase-orders/new">Create a PO manually</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary banner */}
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-amber-800 font-medium">
                {suggestions!.totalItems} item{suggestions!.totalItems !== 1 ? "s" : ""} need restocking
              </span>
              <span className="text-amber-700">·</span>
              <span className="text-amber-700 text-xs">
                Grouped by last-used supplier. Adjust quantities, then create draft POs and optionally email them.
              </span>
              <span className="ml-auto text-xs text-amber-700 font-medium">
                {totalSelected} item{totalSelected !== 1 ? "s" : ""} selected
              </span>
            </div>

            {/* Groups */}
            {groups.map((group) => {
              const key = groupKey(group);
              const states = getGroupItemStates(group);
              return (
                <SupplierGroupCard
                  key={key}
                  group={group}
                  itemStates={states}
                  onToggleItem={(productId) => handleToggleItem(group, productId)}
                  onToggleAll={(selected) => handleToggleAll(group, selected)}
                  onQtyChange={(productId, qty) => handleQtyChange(group, productId, qty)}
                  onCreatePo={() => handleCreatePo(group)}
                  creating={creatingGroup === key}
                  onSaveAsTemplate={() => setSaveTemplateGroup(group)}
                  baseCurrency={baseCurrency}
                />
              );
            })}

            {/* Help note */}
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 px-1">
              <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#E8622A]" />
              Suggested quantities are calculated as{" "}
              <strong>2× reorder threshold − current stock</strong> to build a healthy buffer.
              Unit costs and supplier email are pre-filled from the most recent purchase order for each product.
            </p>
          </>
        )}
      </div>

      {/* Reorder alert email dialog */}
      {alertDialogOpen && (
        <SendAlertDialog
          itemCount={suggestions?.totalItems ?? 0}
          onClose={() => setAlertDialogOpen(false)}
        />
      )}

      {/* Post-creation: email dialog */}
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
            const id = createdPoInfo.id;
            setCreatedPoInfo(null);
            navigate(`/purchase-orders/${id}`);
          }}
        />
      )}

      {/* Bulk create results dialog */}
      {bulkResults && (
        <BulkResultsDialog
          results={bulkResults}
          onClose={() => setBulkResults(null)}
        />
      )}

      {/* Save as template dialog */}
      {saveTemplateGroup && (
        <SaveAsTemplateDialog
          group={saveTemplateGroup}
          itemStates={getGroupItemStates(saveTemplateGroup)}
          onClose={() => setSaveTemplateGroup(null)}
        />
      )}
    </Layout>
  );
}
