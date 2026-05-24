import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useBaseCurrency } from "@/hooks/use-base-currency";
import { formatCurrency } from "@/lib/utils";
import {
  Upload,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  FileSpreadsheet,
} from "lucide-react";

interface BulkSimulatorResult {
  results: {
    productId: string;
    skuCode: string;
    name: string;
    currentPrice: number | null;
    proposedPrice: number;
    currentMarginPct: number | null;
    proposedMarginPct: number;
    markupPct: number;
    warnings: string[];
  }[];
  summary: {
    totalProducts: number;
    avgCurrentMargin: number;
    avgProposedMargin: number;
    avgMarkup: number;
    belowFloorCount: number;
  };
}

interface ParsedCSVRow {
  productId: string;
  cost: number;
}

function parseCSV(text: string): ParsedCSVRow[] {
  const lines = text.trim().split("\n");
  const results: ParsedCSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length >= 2) {
      const productId = cols[0].trim();
      const cost = parseFloat(cols[1].trim());
      if (productId && !isNaN(cost)) {
        results.push({ productId, cost });
      }
    }
  }
  return results;
}

interface BulkSimulatorProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function BulkSimulator({ open, onOpenChange }: BulkSimulatorProps) {
  const { toast } = useToast();
  const currency = useBaseCurrency();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<ParsedCSVRow[]>([]);
  const [method, setMethod] = useState<"csv" | "uniform">("uniform");
  const [markupPct, setMarkupPct] = useState("25");
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<BulkSimulatorResult | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast({ title: "No valid rows found", description: "Expected format: productId,cost per row", variant: "destructive" });
        return;
      }
      setProducts(parsed);
      toast({ title: `Parsed ${parsed.length} products from CSV` });
    };
    reader.readAsText(file);
  };

  const handleSimulate = async () => {
    if (method === "csv" && products.length === 0) {
      toast({ title: "Upload a CSV first", variant: "destructive" });
      return;
    }
    setSimulating(true);
    setResult(null);

    try {
      const body: Record<string, any> = {
        products: method === "csv" ? products : [],
        markupPct: parseFloat(markupPct),
      };

      // For uniform mode, we need product IDs — use a simple approach
      if (method === "uniform") {
        // Just simulate the markup percentage at the category level
        const res = await fetch(`/api/finance/pricing/simulate?productId=${products[0]?.productId ?? ""}&cost=0&markupPct=${markupPct}`, {
          credentials: "include",
        });
        // Fallback: if no products specified, show a message
        if (products.length === 0) {
          toast({ title: "Upload a CSV or specify products via CSV upload first to run bulk simulation" });
          setSimulating(false);
          return;
        }
      }

      const res = await fetch("/api/finance/pricing/simulate/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Bulk simulation failed");
      const data = await res.json();
      setResult(data);
      toast({ title: `Simulated ${data.summary.totalProducts} products` });
    } catch (err: any) {
      toast({ title: "Bulk simulation error", description: err.message, variant: "destructive" });
    } finally {
      setSimulating(false);
    }
  };

  const formatPct = (val: number) => `${val.toFixed(1)}%`;
  const formatMoney = (val: number) => formatCurrency(val, currency);

  const summary = result?.summary;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Bulk Pricing Simulator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Method Selection */}
          <div className="flex gap-2">
            <Button
              variant={method === "uniform" ? "default" : "outline"}
              size="sm"
              onClick={() => setMethod("uniform")}
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              Uniform Markup %
            </Button>
            <Button
              variant={method === "csv" ? "default" : "outline"}
              size="sm"
              onClick={() => setMethod("csv")}
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              Upload CSV
            </Button>
          </div>

          {method === "uniform" ? (
            <div>
              <Label>Markup Percentage</Label>
              <Input
                type="number"
                step="0.1"
                value={markupPct}
                onChange={(e) => setMarkupPct(e.target.value)}
                placeholder="25"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Applies this markup % to all uploaded products from CSV
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  Choose CSV File
                </Button>
                <span className="text-xs text-muted-foreground">
                  {products.length > 0 ? `${products.length} products loaded` : "CSV format: productId,cost"}
                </span>
              </div>
            </div>
          )}

          {/* Simulate Button */}
          <Button
            onClick={handleSimulate}
            disabled={simulating || (method === "csv" && products.length === 0)}
            className="w-full"
          >
            {simulating ? "Simulating..." : "Run Bulk Simulation"}
          </Button>

          {/* Results */}
          {summary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground">Products</p>
                    <p className="text-lg font-bold">{summary.totalProducts}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground">Avg Current Margin</p>
                    <p className="text-lg font-bold">{formatPct(summary.avgCurrentMargin)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground">Avg Proposed Margin</p>
                    <p className="text-lg font-bold text-green-600">{formatPct(summary.avgProposedMargin)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground">Below Floor</p>
                    <p className="text-lg font-bold text-red-600">{summary.belowFloorCount}</p>
                  </CardContent>
                </Card>
              </div>

              {summary.belowFloorCount > 0 && (
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-800">
                      {summary.belowFloorCount} product{summary.belowFloorCount !== 1 ? "s" : ""} would be below margin floor
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Results Table */}
              {result.results.length > 0 && (
                <div className="overflow-x-auto rounded border max-h-48">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-1.5 px-2">SKU</th>
                        <th className="text-right py-1.5 px-2">Current Price</th>
                        <th className="text-right py-1.5 px-2">Proposed</th>
                        <th className="text-right py-1.5 px-2">Current Margin</th>
                        <th className="text-right py-1.5 px-2">New Margin</th>
                        <th className="text-center py-1.5 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.results.map((r) => (
                        <tr key={r.productId} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="py-1.5 px-2 font-mono">{r.skuCode}</td>
                          <td className="py-1.5 px-2 text-right">{r.currentPrice ? formatMoney(r.currentPrice) : "—"}</td>
                          <td className="py-1.5 px-2 text-right font-medium">{formatMoney(r.proposedPrice)}</td>
                          <td className={`py-1.5 px-2 text-right ${(r.currentMarginPct ?? 0) < 0 ? "text-red-600" : ""}`}>
                            {r.currentMarginPct != null ? formatPct(r.currentMarginPct) : "—"}
                          </td>
                          <td className={`py-1.5 px-2 text-right font-medium ${r.proposedMarginPct < 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatPct(r.proposedMarginPct)}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {r.warnings.length > 0 ? (
                              <AlertTriangle className="w-3 h-3 text-amber-500 inline" />
                            ) : (
                              <TrendingUp className="w-3 h-3 text-green-500 inline" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
