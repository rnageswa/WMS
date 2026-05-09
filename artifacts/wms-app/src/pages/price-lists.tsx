import { useLocation } from "wouter";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ArrowLeft, Edit2, Trash2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGetPriceLists, useDeletePriceList } from "@workspace/api-client-react";

export default function PriceListsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: lists, isLoading } = useGetPriceLists();
  const deletePriceList = useDeletePriceList();

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this price list?")) return;
    try {
      await deletePriceList.mutateAsync({ pathParams: { id } });
      toast({ title: "Price list deactivated" });
    } catch {
      toast({ title: "Failed to deactivate", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Price Lists"
        subtitle="Manage product pricing tiers"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/products")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button onClick={() => setLocation("/price-lists/new")}>
              <Plus className="w-4 h-4 mr-1" />
              New Price List
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>All Price Lists</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !lists || lists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No price lists yet</p>
                <p className="text-sm">Create one to manage product pricing</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valid From</TableHead>
                    <TableHead>Valid To</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lists.map((list) => (
                    <TableRow key={list.id} className={!list.isActive ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{list.name}</TableCell>
                      <TableCell>{list.currency}</TableCell>
                      <TableCell>
                        {list.isDefault && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                      </TableCell>
                      <TableCell>
                        <Badge variant={list.isActive ? "default" : "secondary"}>
                          {list.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{list.validFrom}</TableCell>
                      <TableCell>{list.validTo || "∞"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setLocation(`/price-lists/${list.id}`)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          {list.isActive && (
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(list.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
