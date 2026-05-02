import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateWarehouse,
  getListWarehousesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";

const schema = z.object({
  name: z.string().min(1, "Warehouse name is required"),
  address: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function LocationNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", address: "" },
  });

  const createWarehouse = useCreateWarehouse({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWarehousesQueryKey() });
        toast({ title: "Warehouse created" });
        setLocation("/locations");
      },
      onError: (err: any) => {
        toast({
          title: "Error",
          description: err?.response?.data?.message ?? "Failed",
          variant: "destructive",
        });
      },
    },
  });

  const onSubmit = (data: FormData) => {
    createWarehouse.mutate({
      data: {
        name: data.name,
        address: data.address || null,
      },
    });
  };

  return (
    <Layout>
      <PageHeader
        title="New Warehouse"
        subtitle="Add a warehouse to the location hierarchy"
        action={
          <Link href="/locations">
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
                <Label htmlFor="name">Warehouse Name *</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="e.g. East Coast Distribution Center"
                  data-testid="input-name"
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  {...form.register("address")}
                  placeholder="e.g. 1200 Industrial Blvd, Chicago, IL"
                  data-testid="input-address"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={createWarehouse.isPending}
                  data-testid="button-submit"
                >
                  {createWarehouse.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create Warehouse
                </Button>
                <Link href="/locations">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
