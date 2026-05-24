import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@workspace/api-client-react";
import type { Product } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Percent,
  ArrowRight,
  Layers,
  FileSpreadsheet,
  Search,
  X,
} from "lucide-react";
import { RoleGate } from "@/components/role-gate";
import { useBaseCurrency } from "@/hooks/use-base-currency";

import { formatCurrency } from "@/lib/utils";
import { BulkSimulator } from "@/components/finance/bulk-simulator";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SimulatorResult {
  productId: string;
  skuCode: string;
  name: string;
  currentCost: number;
  currentPrice: number | null;
  proposedPrice: number;
  currentMarginPct: number | null;
  proposedMarginPct: number;
  markupPct: number;
  rulesApplied: { ruleName: string; ruleType: string; action: string }[];
  warnings: string[];
  suggestions: { label: string; price: number; marginPct: number }[];
}

async function simulatePrice(productId: string, cost: number, proposedPrice?: number, quantity?: number): Promise<SimulatorResult> {
  const body = { productId, cost, proposedPrice, quantity };
  const res = await fetch("/api/finance/pricing/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Simulation failed");
  return res.json();
}

function FinancePricingSimulatorPage() {
  const currency = useBaseCurrency();
  const { toast } = useToast();
  const [productId, setProductId] = useState("");
  const [cost, setCost] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [runSim, setRunSim] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [savePriceListOpen, setSavePriceListOpen] = useState(false);
  const [priceListId, setPriceListId] = useState("");
  const [saving, setSaving] = useState(false);

  // Product search state
  const [productSearch, setProductSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedProductLabel, setSelectedProductLabel] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounce product search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(productSearch), 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  // Close search results on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch products matching search (only when 3+ chars typed)
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["products-search", debouncedSearch],
    queryFn: () => listProducts({ search: debouncedSearch }),
    enabled: debouncedSearch.length >= 3,
  });

  const selectProduct = (product: Product) => {
    setProductId(product.id);
    setSelectedProductLabel(`${product.skuCode} — ${product.name}`);
    setProductSearch("");
    setShowResults(false);
    setRunSim(false);
    // Auto-fetch costing data to pre-fill the cost field
    fetch(`/api/finance/costing/${product.id}`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data && data.currentAvgCost > 0) {
          setCost(data.currentAvgCost.toString());
        }
      })
      .catch(() => {});
  };

  const clearSelection = () => {
    setProductId("");
    setSelectedProductLabel("");
    setCost("");
    setProposedPrice("");
    setQuantity("");
    setRunSim(false);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["pricing-sim", productId, cost, proposedPrice, quantity],
    queryFn: () => simulatePrice(productId, parseFloat(cost), proposedPrice ? parseFloat(proposedPrice) : undefined, quantity ? parseInt(quantity) : undefined),
    enabled: runSim && !!productId && !!cost,
  });

  const handleSimulate = () => setRunSim(true);
  const handleReset = () => { setRunSim(false); clearSelection(); };

  const formatMoney = (val: number) => formatCurrency(val, currency);
  const formatPct = (val: number) => `${val.toFixed(1)}%`;

  const handleSaveAsPriceList = async () => {
    if (!data || !priceListId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/finance/pricing/save-price-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          priceListId,
          prices: [{ productId: data.productId, unitPrice: data.proposedPrice }],
        }),
      });
      if (!res.ok) throw new Error("Failed to save price list");
      toast({ title: "Price saved to price list" });
      setSavePriceListOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Handle testRule query param — show a toast when testing a rule
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const testRuleId = params.get("testRule");
    if (testRuleId) {
      toast({ 
        title: "Testing Pricing Rule", 
        description: "Search and select a product, then click Simulate to see how this rule affects pricing" 
      });
    }
  }, []);

  // Suggestions for product search
  const matchCount = searchResults?.length ?? 0;

  return (
    <Layout>
      <PageHeader
        title="Pricing Simulator"
        description="What-if pricing analysis with margin rules and markup targets"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowBulk(!showBulk)}>
              <Layers className="w-4 h-4 mr-1" />
              {showBulk ? "Single Simulator" : "Bulk Simulator"}
            </Button>
          </div>
        }
      />

      {/* Bulk simulator section */}
      <BulkSimulator open={showBulk} onOpenChange={setShowBulk} />

      {/* Save as Price List Dialog */}
      <Dialog open={savePriceListOpen} onOpenChange={setSavePriceListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Simulation as Price List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Price List ID</Label>
              <Input value={priceListId} onChange={(e) => setPriceListId(e.target.value)} placeholder="UUID of target price list" />
              <p className="text-xs text-muted-foreground mt-1">
                Save the proposed price (${data?.proposedPrice.toFixed(2)}) to a price list for this product
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSavePriceListOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveAsPriceList} disabled={saving || !priceListId}>
                {saving ? "Saving..." : "Save to Price List"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="p-6 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Simulation Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Search Field */}
            <div ref={searchRef} className="relative">
              <Label>Product</Label>
              {selectedProductLabel ? (
                <div className="flex items-center gap-2 mt-1 p-2 rounded-md border bg-primary/5 border-primary/20">
                  <span className="flex-1 text-sm font-medium truncate">{selectedProductLabel}</span>
                  <button
                    onClick={clearSelection}
                    className="p-0.5 rounded hover:bg-muted transition-colors"
                    title="Clear selection"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      if (e.target.value.length >= 3) setShowResults(true);
                    }}
                    onFocus={() => {
                      if (productSearch.length >= 3 && searchResults?.length) setShowResults(true);
                    }}
                    placeholder="Search by name or SKU (min 3 chars)..."
                    className="pl-9"
                  />
                </div>
              )}

              {/* Search Results Dropdown */}
              {showResults && debouncedSearch.length >= 3 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {searchLoading ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">Searching...</div>
                  ) : searchResults && searchResults.length > 0 ? (
                    <div>
                      <p className="px-3 py-1.5 text-xs text-muted-foreground border-b">
                        {matchCount} product{matchCount !== 1 ? "s" : ""} found
                      </p>
                      {searchResults.slice(0, 20).map((product) => (
                        <button
                          key={product.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 border-b last:border-0"
                          onClick={() => selectProduct(product)}
                          type="button"
                        >
                          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">{product.skuCode}</span>
                            <span className="text-muted-foreground ml-2">{product.name}</span>
                          </div>
                          {product.category && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">{product.category}</Badge>
                          )}
                        </button>
                      ))}
                      {searchResults.length > 20 && (
                        <p className="px-3 py-2 text-xs text-muted-foreground text-center">
                          ...and {searchResults.length - 20} more results
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground text-center">No products found</div>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>Unit Cost ({currency})</Label>
              <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
              {!productId && !selectedProductLabel && (
                <p className="text-xs text-muted-foreground mt-1">Select a product above, or enter manually</p>
              )}
            </div>
            <div>
              <Label>Proposed Price ({currency}) — optional</Label>
              <Input type="number" step="0.01" value={proposedPrice} onChange={(e) => setProposedPrice(e.target.value)} placeholder="Leave blank for auto-suggest" />
            </div>
            <div>
              <Label>Quantity — optional</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSimulate} className="flex-1" disabled={!productId || !cost}>
                <DollarSign className="w-4 h-4 mr-1" />
                Simulate
              </Button>
              <Button variant="outline" onClick={handleReset}>Reset</Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {isLoading && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Running pricing simulation...</p>
              </CardContent>
            </Card>
          )}

          {data && !isLoading && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Product</p>
                    <p className="font-bold text-sm">{data.skuCode}</p>
                    <p className="text-xs text-muted-foreground truncate">{data.name}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Current Price</p>
                    <p className="text-lg font-bold">{data.currentPrice ? formatMoney(data.currentPrice) : "—"}</p>
                    {data.currentMarginPct != null && (
                      <p className={`text-xs ${data.currentMarginPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatPct(data.currentMarginPct)} margin
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Proposed Price</p>
                    <p className="text-lg font-bold text-blue-600">{formatMoney(data.proposedPrice)}</p>
                    <p className={`text-xs ${data.proposedMarginPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatPct(data.proposedMarginPct)} margin
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Markup</p>
                    <p className="text-lg font-bold text-purple-600">{formatPct(data.markupPct)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Warnings */}
              {/* Save as Price List action */}
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setSavePriceListOpen(true)}>
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
                  Save as Price List
                </Button>
              </div>

              {data.warnings.length > 0 && (
                <Card className="border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="w-4 h-4" />
                      Warnings ({data.warnings.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {data.warnings.map((w, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Rules Applied */}
              {data.rulesApplied.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Pricing Rules Applied
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {data.rulesApplied.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">{r.ruleType}</Badge>
                          <span>{r.ruleName}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{r.action}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Suggestions */}
              {data.suggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      Price Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {data.suggestions.map((s) => (
                        <div key={s.label} className="p-3 rounded-lg border bg-card hover:bg-accent transition-colors">
                          <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                          <p className="font-bold">{formatMoney(s.price)}</p>
                          <p className={`text-xs ${s.marginPct >= 20 ? "text-green-600" : s.marginPct >= 10 ? "text-amber-600" : "text-red-600"}`}>
                            {formatPct(s.marginPct)} margin
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!data && !isLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground">Select a product, enter cost, then click Simulate</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </Layout>
  );
}

export default function FinancePricingSimulatorPageWithGate() {
  return (
    <RoleGate roles={["admin", "operator"]}>
      <FinancePricingSimulatorPage />
    </RoleGate>
  );
}
