import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Settings, DollarSign, Check, Plus, Loader2, Star, StarOff } from "lucide-react";
import { getCurrencySymbol } from "@/lib/utils";

interface Currency {
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
}

async function fetchCurrencies(): Promise<Currency[]> {
  const res = await fetch("/api/currencies");
  if (!res.ok) throw new Error("Failed to fetch currencies");
  return res.json();
}

async function fetchBaseCurrency(): Promise<string> {
  const res = await fetch("/api/currencies/base");
  if (!res.ok) throw new Error("Failed to fetch base currency");
  const data = await res.json();
  return data.code;
}

async function setBaseCurrency(code: string): Promise<string> {
  const res = await fetch("/api/currencies/base", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to set base currency");
  }
  const data = await res.json();
  return data.code;
}

async function addCurrency(currency: { code: string; name: string; symbol: string }): Promise<Currency> {
  const res = await fetch("/api/currencies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(currency),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to add currency");
  }
  return res.json();
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: currencies = [], isLoading: loadingCurrencies } = useQuery({
    queryKey: ["currencies"],
    queryFn: fetchCurrencies,
  });

  const { data: baseCurrency, isLoading: loadingBase } = useQuery({
    queryKey: ["baseCurrency"],
    queryFn: fetchBaseCurrency,
  });

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [adding, setAdding] = useState(false);

  const handleSetBase = async (code: string) => {
    try {
      await setBaseCurrency(code);
      qc.invalidateQueries({ queryKey: ["baseCurrency"] });
      qc.invalidateQueries({ queryKey: ["currencies"] });
      toast({ title: `Base currency set to ${code}` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleAddCurrency = async () => {
    if (!newCode.trim() || !newName.trim() || !newSymbol.trim()) {
      toast({ title: "All fields required", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      await addCurrency({ code: newCode.toUpperCase(), name: newName, symbol: newSymbol });
      qc.invalidateQueries({ queryKey: ["currencies"] });
      setNewCode("");
      setNewName("");
      setNewSymbol("");
      toast({ title: `Currency ${newCode.toUpperCase()} added` });
    } catch (err: any) {
      toast({ title: "Failed to add currency", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Admin Settings"
        subtitle="Manage application-wide settings"
      />

      <div className="p-6 max-w-3xl space-y-6">
        {/* Base Currency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#E8622A]" />
              Base Currency
            </CardTitle>
            <CardDescription>
              The base currency is used as the default for all new orders, price lists, and financial reports.
              Exchange rates are relative to this currency.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingBase ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Current base:</span>
                <Badge className="text-base px-3 py-1 bg-[#E8622A]/10 text-[#E8622A] border-[#E8622A]/20">
                  {getCurrencySymbol(baseCurrency || "USD")} {baseCurrency}
                </Badge>
              </div>
            )}

            {loadingCurrencies ? (
              <div className="text-sm text-muted-foreground">Loading currencies...</div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Select base currency</Label>
                <div className="flex flex-wrap gap-2">
                  {currencies.map((c) => (
                    <Button
                      key={c.code}
                      variant={c.isBase ? "default" : "outline"}
                      size="sm"
                      className={c.isBase ? "bg-[#E8622A] hover:bg-[#E8622A]/90 text-white" : ""}
                      onClick={() => !c.isBase && handleSetBase(c.code)}
                      disabled={c.isBase}
                    >
                      {c.isBase ? <Check className="w-3.5 h-3.5 mr-1" /> : <StarOff className="w-3.5 h-3.5 mr-1 opacity-40" />}
                      {c.symbol} {c.code}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Currency List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-muted-foreground" />
              Currencies
            </CardTitle>
            <CardDescription>
              Manage available currencies. Add new currencies and set exchange rates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencies.map((c) => (
                  <TableRow key={c.code}>
                    <TableCell className="font-mono font-medium">{c.code}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-lg">{c.symbol}</TableCell>
                    <TableCell>
                      {c.isBase ? (
                        <Badge className="bg-[#E8622A]/10 text-[#E8622A] border-[#E8622A]/20">
                          <Star className="w-3 h-3 mr-1" /> Base
                        </Badge>
                      ) : (
                        <Badge variant="outline">Secondary</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Add Currency Form */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Add Currency</h4>
              <div className="grid grid-cols-[80px_1fr_80px_auto] gap-3 items-end">
                <div>
                  <Label className="text-xs text-muted-foreground">Code</Label>
                  <Input
                    placeholder="GBP"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    maxLength={5}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input
                    placeholder="British Pound"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Symbol</Label>
                  <Input
                    placeholder="£"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    maxLength={5}
                  />
                </div>
                <Button onClick={handleAddCurrency} disabled={adding} className="bg-[#E8622A] hover:bg-[#E8622A]/90 text-white">
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
