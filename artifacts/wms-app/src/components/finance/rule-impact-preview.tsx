import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle, Package, Globe, Layers, Tag } from "lucide-react";

interface RulePreviewResult {
  totalActiveProducts: number;
  affectedProductCount: number;
  sampleProducts: { productId: string; skuCode: string; name: string }[];
  scope: string;
  scopeId: string | null;
}

async function fetchRulePreview(scope: string, scopeId?: string): Promise<RulePreviewResult> {
  const params = new URLSearchParams({ scope });
  if (scopeId) params.set("scopeId", scopeId);
  const res = await fetch(`/api/finance/pricing/rules/preview?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load rule preview");
  return res.json();
}

interface RuleImpactPreviewProps {
  scope: string;
  scopeId?: string;
  enabled?: boolean;
}

const scopeIcons: Record<string, React.ElementType> = {
  global: Globe,
  category: Layers,
  product: Tag,
};

export function RuleImpactPreview({ scope, scopeId, enabled = true }: RuleImpactPreviewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["rule-preview", scope, scopeId],
    queryFn: () => fetchRulePreview(scope, scopeId),
    enabled: enabled && !!scope,
  });

  if (!enabled) return null;

  const ScopeIcon = scopeIcons[scope] ?? Package;

  if (isLoading) {
    return (
      <Card className="bg-muted/20 border-dashed">
        <CardContent className="p-3">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-48" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-xs text-red-700">Could not load preview</span>
        </CardContent>
      </Card>
    );
  }

  const coveragePct = data.totalActiveProducts > 0
    ? Math.round((data.affectedProductCount / data.totalActiveProducts) * 100)
    : 0;

  const isHighImpact = coveragePct > 50;
  const isMediumImpact = coveragePct > 20;

  return (
    <Card className={`border-dashed ${isHighImpact ? "bg-amber-50 border-amber-300" : isMediumImpact ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ScopeIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">Scope: {scope}</span>
            {scopeId && <span className="text-[10px] text-muted-foreground">({scopeId.slice(0, 8)}...)</span>}
          </div>
          <Badge variant={isHighImpact ? "destructive" : isMediumImpact ? "secondary" : "outline"}>
            {coveragePct}% coverage
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="text-lg font-bold">{data.affectedProductCount}</span>
          <span className="text-xs text-muted-foreground">
            of {data.totalActiveProducts} active products affected
          </span>
        </div>

        {isHighImpact && (
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[10px] text-amber-800">
              This rule will affect a large portion of your catalog. Consider narrowing the scope.
            </p>
          </div>
        )}

        {data.sampleProducts.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Sample affected products:</p>
            <div className="flex flex-wrap gap-1">
              {data.sampleProducts.map((p) => (
                <Badge key={p.productId} variant="secondary" className="text-[10px]">
                  {p.skuCode}
                </Badge>
              ))}
              {data.affectedProductCount > data.sampleProducts.length && (
                <span className="text-[10px] text-muted-foreground">
                  +{data.affectedProductCount - data.sampleProducts.length} more
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
