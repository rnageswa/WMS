import { useState } from "react";
import { useLocation } from "wouter";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreatePriceList } from "@workspace/api-client-react";

export default function NewPriceListPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createPriceList = useCreatePriceList();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isDefault, setIsDefault] = useState(false);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split("T")[0]);
  const [validTo, setValidTo] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    try {
      const data = await createPriceList.mutateAsync({
        body: {
          name: name.trim(),
          currency,
          isDefault,
          validFrom,
          validTo: validTo || null,
        },
      });
      toast({ title: "Price list created" });
      setLocation(`/price-lists/${data.id}`);
    } catch (err: any) {
      toast({ title: "Failed to create price list", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Layout>
      <PageHeader
        title="New Price List"
        subtitle="Create a new pricing tier"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/price-lists")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={createPriceList.isPending}>
              {createPriceList.isPending ? "Creating..." : "Create Price List"}
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Price List Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Standard, Wholesale, VIP" />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={5} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} id="isDefault" />
              <Label htmlFor="isDefault">Set as default price list</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valid From *</Label>
                <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Valid To</Label>
                <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
