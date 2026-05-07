import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetSupplier,
  useUpdateSupplier,
  getGetSupplierQueryKey,
  getListSuppliersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Clock,
  Edit3,
  Save,
  X,
  ShoppingCart,
  Loader2,
  Truck,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

type PoStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled";

const PO_STATUS_META: Record<PoStatus, { label: string; cls: string }> = {
  draft:              { label: "Draft",          cls: "bg-muted text-muted-foreground border-border" },
  ordered:            { label: "Ordered",        cls: "bg-blue-50 text-blue-700 border-blue-200" },
  partially_received: { label: "Part. Received", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  received:           { label: "Received",       cls: "bg-green-50 text-green-700 border-green-200" },
  cancelled:          { label: "Cancelled",      cls: "bg-red-50 text-red-500 border-red-200" },
};

function PoStatusBadge({ status }: { status: string }) {
  const meta = PO_STATUS_META[status as PoStatus] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge className={`${meta.cls} hover:${meta.cls} text-[11px] font-medium`}>{meta.label}</Badge>;
}

interface FormState {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  leadTimeDays: string;
  notes: string;
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  const { data: supplier, isLoading } = useGetSupplier(id!, {
    query: {
      queryKey: getGetSupplierQueryKey(id!),
      enabled: !!id,
    },
  });

  const { mutate: updateSupplier, isPending: saving } = useUpdateSupplier({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSupplierQueryKey(id!) });
        qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
        setEditing(false);
        toast({ title: "Supplier updated" });
      },
      onError: () => toast({ title: "Failed to save changes", variant: "destructive" }),
    },
  });

  const startEdit = () => {
    if (!supplier) return;
    setForm({
      name: supplier.name,
      contactName: supplier.contactName ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
      leadTimeDays: supplier.leadTimeDays != null ? String(supplier.leadTimeDays) : "",
      notes: supplier.notes ?? "",
    });
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setForm(null); };

  const save = () => {
    if (!form) return;
    updateSupplier({
      id: id!,
      data: {
        name: form.name.trim() || undefined,
        contactName: form.contactName.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        leadTimeDays: form.leadTimeDays ? parseInt(form.leadTimeDays) : null,
        notes: form.notes.trim() || null,
      },
    });
  };

  const update = (k: keyof FormState, v: string) => setForm((p) => p ? { ...p, [k]: v } : p);

  const deactivate = () => {
    if (!supplier) return;
    updateSupplier({
      id: id!,
      data: { isActive: !supplier.isActive },
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <PageHeader title="Supplier" />
        <div className="p-6 space-y-4 max-w-3xl">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Layout>
    );
  }

  if (!supplier) {
    return (
      <Layout>
        <PageHeader title="Not Found" />
        <div className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Supplier not found.</p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/suppliers">Back to suppliers</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const pos = (supplier as any).purchaseOrders ?? [];

  return (
    <Layout>
      <PageHeader
        title={supplier.name}
        subtitle={`Added ${formatDistanceToNow(new Date(supplier.createdAt), { addSuffix: true })}`}
        action={
          <div className="flex items-center gap-2">
            {supplier.isActive ? (
              <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">Active</Badge>
            ) : (
              <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted">Inactive</Badge>
            )}
            {!editing && (
              <Button size="sm" variant="outline" onClick={startEdit} className="gap-1.5 h-8 text-xs">
                <Edit3 className="w-3 h-3" /> Edit
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={deactivate}
              disabled={saving}
              className={`h-8 text-xs ${supplier.isActive ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-green-700 hover:bg-green-50"}`}
            >
              {supplier.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-3xl space-y-5">

        {/* Detail card */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Truck className="w-4 h-4 text-muted-foreground" /> Supplier Details
            </CardTitle>
            {editing && (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 gap-1 text-xs">
                  <X className="w-3 h-3" /> Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={save}
                  disabled={saving || !form?.name.trim()}
                  className="h-7 gap-1 text-xs bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {editing && form ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Supplier Name *</Label>
                  <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Contact Person</Label>
                    <Input value={form.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="—" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Lead Time (days)</Label>
                    <Input type="number" min={0} value={form.leadTimeDays} onChange={(e) => update("leadTimeDays", e.target.value)} placeholder="—" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="—" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="—" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Address</Label>
                  <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="—" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <Textarea rows={2} className="resize-none" value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="—" />
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                {supplier.contactName && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Contact</dt>
                    <dd className="text-sm font-medium mt-0.5">{supplier.contactName}</dd>
                  </div>
                )}
                {supplier.email && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Email</dt>
                    <dd className="text-sm mt-0.5 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <a href={`mailto:${supplier.email}`} className="text-blue-600 hover:underline">{supplier.email}</a>
                    </dd>
                  </div>
                )}
                {supplier.phone && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Phone</dt>
                    <dd className="text-sm mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-muted-foreground" /> {supplier.phone}
                    </dd>
                  </div>
                )}
                {supplier.leadTimeDays != null && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Lead Time</dt>
                    <dd className="text-sm mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" /> {supplier.leadTimeDays} days
                    </dd>
                  </div>
                )}
                {supplier.address && (
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Address</dt>
                    <dd className="text-sm mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground shrink-0" /> {supplier.address}
                    </dd>
                  </div>
                )}
                {supplier.notes && (
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Notes</dt>
                    <dd className="text-sm mt-0.5 text-muted-foreground">{supplier.notes}</dd>
                  </div>
                )}
                {!supplier.contactName && !supplier.email && !supplier.phone && !supplier.leadTimeDays && !supplier.address && !supplier.notes && (
                  <div className="col-span-2 text-sm text-muted-foreground/60 italic">No additional details — click Edit to add contact info.</div>
                )}
              </dl>
            )}
          </CardContent>
        </Card>

        {/* PO History */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-muted-foreground" /> Purchase Order History
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[11px]">{pos.length} orders</Badge>
              <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                <Link href="/purchase-orders/new">
                  <ShoppingCart className="w-3 h-3" /> New PO
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 pb-1">
            {pos.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No purchase orders yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">PO Number</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Status</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Created</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Updated</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pos.map((po: any) => (
                    <TableRow
                      key={po.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setLocation(`/purchase-orders/${po.id}`)}
                    >
                      <TableCell className="font-mono text-sm font-semibold">{po.poNumber}</TableCell>
                      <TableCell><PoStatusBadge status={po.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(po.createdAt), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(po.updatedAt), { addSuffix: true })}</TableCell>
                      <TableCell className="w-6">
                        <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
          <Link href="/suppliers"><ArrowLeft className="w-3.5 h-3.5" /> Back to Suppliers</Link>
        </Button>
      </div>
    </Layout>
  );
}
