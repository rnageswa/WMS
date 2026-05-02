import { useState } from "react";
import { Link } from "wouter";
import {
  useListPoTemplates,
  useDeletePoTemplate,
  getListPoTemplatesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Copy,
  ChevronRight,
  Trash2,
  Truck,
  HelpCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function PoTemplatesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data = [], isLoading } = useListPoTemplates();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { mutate: deleteTemplate, isPending: deleting } = useDeletePoTemplate({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPoTemplatesQueryKey() });
        toast({ title: "Template deleted" });
        setDeletingId(null);
      },
      onError: () => {
        toast({ title: "Failed to delete template", variant: "destructive" });
        setDeletingId(null);
      },
    },
  });

  const deletingTemplate = data.find((t) => t.id === deletingId);

  return (
    <Layout>
      <PageHeader
        title="PO Templates"
        subtitle="Save supplier + product lists for one-click repeat orders"
        action={
          <Button asChild size="sm" className="gap-1.5 bg-[#E8622A] hover:bg-[#E8622A]/90 text-white">
            <Link href="/purchase-orders/templates/new">
              <Plus className="w-3.5 h-3.5" /> New Template
            </Link>
          </Button>
        }
      />

      <div className="p-6 max-w-4xl space-y-4">
        <Card className="border-border/60">
          <CardContent className="p-0 pb-1">
            {isLoading ? (
              <div className="px-5 py-4 space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : data.length === 0 ? (
              <div className="py-16 text-center">
                <Copy className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No templates yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs mx-auto">
                  Templates let you save a supplier and product list so you can create a purchase order in one click.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4 gap-1">
                  <Link href="/purchase-orders/templates/new">
                    <Plus className="w-3 h-3" /> Create your first template
                  </Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold pl-5">Name</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Supplier</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold text-right">Products</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Created</TableHead>
                    <TableHead className="w-8" />
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((tpl) => (
                    <TableRow
                      key={tpl.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => window.location.assign(`/wms/purchase-orders/templates/${tpl.id}`)}
                    >
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-[#E8622A]/10 flex items-center justify-center shrink-0">
                            <Copy className="w-3.5 h-3.5 text-[#E8622A]" />
                          </div>
                          <span className="text-sm font-semibold">{tpl.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tpl.supplierName ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Truck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {tpl.supplierName}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                            No supplier set
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{tpl.lineCount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(tpl.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="w-8">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(tpl.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                      <TableCell className="w-8">
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

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deletingTemplate?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This template and all its lines will be permanently removed. Existing purchase orders created from it are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deletingId && deleteTemplate({ id: deletingId })}
              disabled={deleting}
            >
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
