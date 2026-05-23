import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useAdjustInventory,
  useListProducts,
  useListWarehouses,
  useListZones,
  useListBins,
  getListInventoryQueryKey,
  getGetDashboardSummaryQueryKey,
  getListZonesQueryKey,
  getListBinsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { ArrowLeft, Loader2, CheckCircle, WifiOff, Users } from "lucide-react";
import { Link } from "wouter";

const schema = z.object({
  productId: z.string().min(1, "Select a product"),
  warehouseId: z.string().min(1, "Select a warehouse"),
  zoneId: z.string().min(1, "Select a zone"),
  binId: z.string().min(1, "Select a bin"),
  newQty: z.coerce.number().int().min(0, "Quantity must be 0 or more"),
  reasonCode: z.string().min(1, "Reason code is required"),
});

type FormData = z.infer<typeof schema>;

const REASON_CODES = [
  "CYCLE-COUNT",
  "RECEIVING",
  "DAMAGED",
  "LOST",
  "FOUND",
  "TRANSFER",
  "CORRECTION",
  "OTHER",
];

export default function InventoryAdjust() {
  const searchStr = useSearch();
  const searchParams = new URLSearchParams(searchStr);
  const prefilledProductId = searchParams.get("productId") ?? "";

  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();
  const [success, setSuccess] = useState(false);
  const [selectedLaborEntryId, setSelectedLaborEntryId] = useState("");

  // Labor entries for worker assignment
  const { data: laborEntries = [] } = useQuery({
    queryKey: ["labor", "entries"],
    queryFn: async () => {
      const res = await fetch("/api/labor/entries", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: prefilledProductId,
      warehouseId: "",
      zoneId: "",
      binId: "",
      newQty: 0,
      reasonCode: "",
    },
  });

  const warehouseId = form.watch("warehouseId");
  const zoneId = form.watch("zoneId");

  const { data: products } = useListProducts({ isActive: true });
  const { data: warehouses } = useListWarehouses();
  const { data: zones } = useListZones(warehouseId, {
    query: { enabled: !!warehouseId && warehouseId !== "", queryKey: getListZonesQueryKey(warehouseId) },
  });
  const { data: bins } = useListBins(zoneId, {
    query: { enabled: !!zoneId && zoneId !== "", queryKey: getListBinsQueryKey(zoneId) },
  });

  useEffect(() => {
    form.setValue("zoneId", "");
    form.setValue("binId", "");
  }, [warehouseId]);

  useEffect(() => {
    form.setValue("binId", "");
  }, [zoneId]);

  const baseAdjust = useAdjustInventory();

  const adjust = useOfflineMutation({
    mutationFn: (vars: { data: { productId: string; binId: string; newQty: number; reasonCode: string } }) =>
      baseAdjust.mutateAsync(vars),
    url: "/api/inventory/adjust",
    entityType: "inventory-adjust",
    entityIdExtractor: (vars) => vars.data.productId,
    invalidateKeys: ["inventory", "dashboard-summary"],
    successMessage: "Stock adjusted",
  }, {
    onSuccess: (data) => {
      if (!(data as any)?.queued) {
        queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({
          title: "Stock adjusted",
          description: `New quantity: ${(data as any).qtyOnHand}`,
        });
        setSuccess(true);
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? "Adjustment failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
    adjust.mutate({
      data: {
        productId: data.productId,
        binId: data.binId,
        newQty: data.newQty,
        reasonCode: data.reasonCode,
        laborEntryId: selectedLaborEntryId || undefined,
      } as any,
    });
  };

  if (success) {
    return (
      <Layout>
        <PageHeader title="Adjust Stock" />
        <div className="p-6 max-w-lg">
          <Card className="border-border/60">
            <CardContent className="pt-10 pb-10 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold">Adjustment recorded</h2>
              <p className="text-sm text-muted-foreground mt-1">
                The movement has been logged to the audit trail.
              </p>
              <div className="flex gap-3 justify-center mt-6">
                <Button onClick={() => { setSuccess(false); form.reset({ productId: "", warehouseId: "", zoneId: "", binId: "", newQty: 0, reasonCode: "" }); }}>
                  New Adjustment
                </Button>
                <Link href="/movements">
                  <Button variant="outline">View Audit Trail</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Adjust Stock"
        subtitle="Manual inventory adjustment with audit trail"
        action={
          <Link href="/inventory">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
          </Link>
        }
      />
      <div className="p-6 max-w-lg">
        <Card className="border-border/60">
          <CardContent className="pt-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label>Product *</Label>
                <Select
                  value={form.watch("productId")}
                  onValueChange={(v) => form.setValue("productId", v, { shouldValidate: true })}
                >
                  <SelectTrigger data-testid="select-product">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.skuCode} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.productId && (
                  <p className="text-xs text-destructive">{form.formState.errors.productId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Warehouse *</Label>
                <Select
                  value={form.watch("warehouseId")}
                  onValueChange={(v) => form.setValue("warehouseId", v, { shouldValidate: true })}
                >
                  <SelectTrigger data-testid="select-warehouse">
                    <SelectValue placeholder="Select a warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.warehouseId && (
                  <p className="text-xs text-destructive">{form.formState.errors.warehouseId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Zone *</Label>
                <Select
                  value={form.watch("zoneId")}
                  onValueChange={(v) => form.setValue("zoneId", v, { shouldValidate: true })}
                  disabled={!warehouseId}
                >
                  <SelectTrigger data-testid="select-zone">
                    <SelectValue placeholder={warehouseId ? "Select a zone" : "Select warehouse first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {zones?.map((z) => (
                      <SelectItem key={z.id} value={z.id}>{z.name} ({z.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.zoneId && (
                  <p className="text-xs text-destructive">{form.formState.errors.zoneId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Bin *</Label>
                <Select
                  value={form.watch("binId")}
                  onValueChange={(v) => form.setValue("binId", v, { shouldValidate: true })}
                  disabled={!zoneId}
                >
                  <SelectTrigger data-testid="select-bin">
                    <SelectValue placeholder={zoneId ? "Select a bin" : "Select zone first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {bins?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.code}{b.name ? ` — ${b.name}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.binId && (
                  <p className="text-xs text-destructive">{form.formState.errors.binId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newQty">New Quantity *</Label>
                <Input
                  id="newQty"
                  type="number"
                  min={0}
                  {...form.register("newQty")}
                  data-testid="input-newQty"
                />
                <p className="text-xs text-muted-foreground">
                  Set the actual count — the delta is calculated automatically.
                </p>
                {form.formState.errors.newQty && (
                  <p className="text-xs text-destructive">{form.formState.errors.newQty.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Assign Worker (optional)</Label>
                <Select
                  value={selectedLaborEntryId}
                  onValueChange={setSelectedLaborEntryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select worker…" />
                  </SelectTrigger>
                  <SelectContent>
                    {laborEntries.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.workerId} — {e.shiftDate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Reason Code *</Label>
                <Select
                  value={form.watch("reasonCode")}
                  onValueChange={(v) => form.setValue("reasonCode", v, { shouldValidate: true })}
                >
                  <SelectTrigger data-testid="select-reason">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASON_CODES.map((code) => (
                      <SelectItem key={code} value={code}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.reasonCode && (
                  <p className="text-xs text-destructive">{form.formState.errors.reasonCode.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2 items-center">
                <Button
                  type="submit"
                  disabled={adjust.isPending}
                  data-testid="button-submit"
                >
                  {adjust.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Record Adjustment
                </Button>
                <Link href="/inventory">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                {!isOnline && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1">
                    <WifiOff className="w-3.5 h-3.5" />
                    Will sync when online
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
