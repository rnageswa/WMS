import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateProduct,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";

const schema = z.object({
  skuCode: z.string().min(1, "SKU code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  barcode: z.string().optional(),
  unitOfMeasure: z.string().min(1, "Unit of measure is required"),
  unitPrice: z.string().optional(),
  reorderThreshold: z.coerce.number().int().min(0).default(0),
});

type FormData = z.infer<typeof schema>;

export default function ProductNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      skuCode: "",
      name: "",
      description: "",
      category: "",
      barcode: "",
      unitOfMeasure: "each",
      unitPrice: "",
      reorderThreshold: 0,
    },
  });

  const createProduct = useCreateProduct({
    mutation: {
      onSuccess: (product) => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        toast({ title: "Product created", description: product.skuCode });
        setLocation(`/products/${product.id}`);
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message ?? "Failed to create product";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  const onSubmit = (data: FormData) => {
    createProduct.mutate({
      data: {
        skuCode: data.skuCode,
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        barcode: data.barcode || null,
        unitOfMeasure: data.unitOfMeasure,
        unitPrice: data.unitPrice || null,
        reorderThreshold: data.reorderThreshold,
      },
    });
  };

  return (
    <Layout>
      <PageHeader
        title="New Product"
        subtitle="Add a new SKU to the catalog"
        action={
          <Link href="/products">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
          </Link>
        }
      />
      <div className="p-6 max-w-2xl">
        <Card className="border-border/60">
          <CardContent className="pt-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="skuCode">SKU Code *</Label>
                  <Input
                    id="skuCode"
                    {...form.register("skuCode")}
                    placeholder="e.g. SKU-2001"
                    data-testid="input-skuCode"
                    className="font-mono"
                  />
                  {form.formState.errors.skuCode && (
                    <p className="text-xs text-destructive">{form.formState.errors.skuCode.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    {...form.register("barcode")}
                    placeholder="EAN / UPC"
                    data-testid="input-barcode"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="e.g. Industrial Wrench Set"
                  data-testid="input-name"
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Optional product description"
                  rows={3}
                  data-testid="input-description"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    {...form.register("category")}
                    placeholder="e.g. Tools"
                    data-testid="input-category"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unitOfMeasure">Unit of Measure *</Label>
                  <Input
                    id="unitOfMeasure"
                    {...form.register("unitOfMeasure")}
                    placeholder="each / kg / roll"
                    data-testid="input-unitOfMeasure"
                  />
                  {form.formState.errors.unitOfMeasure && (
                    <p className="text-xs text-destructive">{form.formState.errors.unitOfMeasure.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unitPrice">Unit Price</Label>
                  <Input
                    id="unitPrice"
                    {...form.register("unitPrice")}
                    placeholder="0.00"
                    data-testid="input-unitPrice"
                  />
                </div>
              </div>

              <div className="space-y-1.5 max-w-xs">
                <Label htmlFor="reorderThreshold">Reorder Threshold</Label>
                <Input
                  id="reorderThreshold"
                  type="number"
                  min={0}
                  {...form.register("reorderThreshold")}
                  placeholder="0"
                  data-testid="input-reorderThreshold"
                />
                <p className="text-xs text-muted-foreground">
                  Alert when stock falls at or below this quantity
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={createProduct.isPending}
                  data-testid="button-submit"
                >
                  {createProduct.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create Product
                </Button>
                <Link href="/products">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
