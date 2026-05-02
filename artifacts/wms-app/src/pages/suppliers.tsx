import { useState } from "react";
import {
  useListSuppliers,
  useCreateSupplier,
  getListSuppliersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Link } from "wouter";
import {
  Plus,
  Search,
  Truck,
  ChevronRight,
  Mail,
  Phone,
  Clock,
  Loader2,
} from "lucide-react";

export default function SuppliersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data = [], isLoading } = useListSuppliers({ search: search || undefined });

  // New supplier form state
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    leadTimeDays: "",
    notes: "",
  });

  const { mutate: createSupplier, isPending } = useCreateSupplier({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
        setDialogOpen(false);
        setForm({ name: "", contactName: "", email: "", phone: "", address: "", leadTimeDays: "", notes: "" });
        toast({ title: "Supplier created" });
      },
      onError: () => toast({ title: "Failed to create supplier", variant: "destructive" }),
    },
  });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    createSupplier({
      data: {
        name: form.name.trim(),
        contactName: form.contactName.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        leadTimeDays: form.leadTimeDays ? parseInt(form.leadTimeDays) : undefined,
        notes: form.notes.trim() || undefined,
      },
    });
  };

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const active = data.filter((s) => s.isActive);
  const inactive = data.filter((s) => !s.isActive);

  return (
    <Layout>
      <PageHeader
        title="Suppliers"
        subtitle="Manage your supplier contacts and track their purchase orders"
        action={
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
          >
            <Plus className="w-3.5 h-3.5" /> New Supplier
          </Button>
        }
      />

      <div className="p-6 max-w-5xl space-y-4">
        {/* Search */}
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers…"
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Table */}
        <Card className="border-border/60">
          <CardContent className="p-0 pb-1">
            {isLoading ? (
              <div className="px-5 py-4 space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : data.length === 0 ? (
              <div className="py-16 text-center">
                <Truck className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No suppliers yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="w-3 h-3" /> Add your first supplier
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Supplier</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Contact</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Lead Time</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">POs</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...active, ...inactive].map((supplier) => (
                    <TableRow
                      key={supplier.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => window.location.assign(`/wms/suppliers/${supplier.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="text-sm font-semibold">{supplier.name}</p>
                          {supplier.email && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="w-2.5 h-2.5" /> {supplier.email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="space-y-0.5">
                          {supplier.contactName && <p>{supplier.contactName}</p>}
                          {supplier.phone && (
                            <p className="text-xs flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" /> {supplier.phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.leadTimeDays != null ? (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" /> {supplier.leadTimeDays}d
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">{supplier.poCount}</TableCell>
                      <TableCell>
                        {supplier.isActive ? (
                          <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50 text-[11px]">Active</Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted text-[11px]">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="w-6">
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Supplier Name *</Label>
              <Input autoFocus value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Acme Distribution" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Contact Person</Label>
                <Input value={form.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Lead Time (days)</Label>
                <Input type="number" min={0} value={form.leadTimeDays} onChange={(e) => update("leadTimeDays", e.target.value)} placeholder="7" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="orders@acme.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+1 555 0100" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Address</Label>
              <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Warehouse Blvd, City, State" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea rows={2} className="resize-none" value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Payment terms, special instructions…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!form.name.trim() || isPending}
              className="bg-[#E8622A] hover:bg-[#E8622A]/90 text-white"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              {isPending ? "Creating…" : "Create Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
