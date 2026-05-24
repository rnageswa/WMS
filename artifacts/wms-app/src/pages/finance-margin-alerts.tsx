import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RoleGate } from "@/components/role-gate";
import {
  AlertTriangle,
  CheckCircle,
  Bell,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  DollarSign,
  TrendingDown,
  ShoppingCart,
  Eye,
  EyeOff,
  BarChart3,
  Lightbulb,
  Link,
  FileText,
} from "lucide-react";

interface MarginAlert {
  id: string;
  orderId: string | null;
  orderNumber: string | null;
  alertType: string;
  severity: string;
  expectedMargin: number | null;
  actualMargin: number | null;
  acknowledged: boolean;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  createdAt: string;
}

interface EnrichedAlert {
  id: string;
  orderId: string | null;
  orderNumber: string | null;
  alertType: string;
  severity: string;
  actualMargin: number | null;
  expectedMargin: number | null;
  acknowledged: boolean;
  createdAt: string;
  rootCause: string;
  suggestedActions: { label: string; url: string; type: string }[];
  lines: {
    productId: string;
    skuCode: string;
    productName: string;
    unitPrice: number;
    unitCost: number;
    marginPct: number;
  }[];
}

interface RelatedAlert {
  id: string;
  alertType: string;
  severity: string;
  createdAt: string;
  acknowledged: boolean;
}

async function fetchAlerts(showAll: boolean): Promise<MarginAlert[]> {
  const res = await fetch(`/api/finance/margin/alerts${showAll ? "?acknowledged=true" : ""}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load alerts");
  return res.json();
}

async function acknowledgeAlert(id: string): Promise<void> {
  const res = await fetch(`/api/finance/margin/alerts/${id}/acknowledge`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to acknowledge");
}

async function fetchEnrichedAlert(id: string): Promise<EnrichedAlert> {
  const res = await fetch(`/api/finance/margin/alerts/${id}/enriched`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load enriched alert");
  return res.json();
}

async function fetchRelatedAlerts(id: string): Promise<RelatedAlert[]> {
  const res = await fetch(`/api/finance/margin/alerts/${id}/related`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load related alerts");
  return res.json();
}

// Auto-acknowledge preferences stored in localStorage (per-user preference)
function getAutoAckProducts(): Set<string> {
  try {
    const stored = localStorage.getItem("finance-auto-ack-products");
    return new Set(stored ? JSON.parse(stored) : []);
  } catch { return new Set(); }
}

function setAutoAckProduct(productId: string, enabled: boolean) {
  const current = getAutoAckProducts();
  if (enabled) current.add(productId);
  else current.delete(productId);
  localStorage.setItem("finance-auto-ack-products", JSON.stringify([...current]));
}

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
};

const severityDotColors: Record<string, string> = {
  critical: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
};

const typeLabels: Record<string, string> = {
  negative_margin: "Negative Margin",
  below_floor: "Below Floor",
  price_anomaly: "Price Anomaly",
};

const typeIcons: Record<string, React.ElementType> = {
  negative_margin: TrendingDown,
  below_floor: AlertTriangle,
  price_anomaly: DollarSign,
};

function FinanceMarginAlertsPageContent() {
  const [, setLocation] = useLocation();
  const [showAll, setShowAll] = useState(false);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [autoAckProducts, setAutoAckProductsState] = useState<Set<string>>(getAutoAckProducts);
  const qc = useQueryClient();

  const { data: alerts, isLoading, refetch } = useQuery({
    queryKey: ["margin-alerts", showAll],
    queryFn: () => fetchAlerts(showAll),
    refetchInterval: 30_000,
  });

  const { data: enrichedAlert } = useQuery({
    queryKey: ["enriched-alert", expandedAlertId],
    queryFn: () => fetchEnrichedAlert(expandedAlertId!),
    enabled: !!expandedAlertId,
  });

  const { data: relatedAlerts } = useQuery({
    queryKey: ["related-alerts", expandedAlertId],
    queryFn: () => fetchRelatedAlerts(expandedAlertId!),
    enabled: !!expandedAlertId,
  });

  const handleAck = async (id: string) => {
    await acknowledgeAlert(id);
    qc.invalidateQueries({ queryKey: ["margin-alerts"] });
  };

  const handleAutoAckToggle = (alertId: string, productId: string, enabled: boolean) => {
    setAutoAckProduct(productId, enabled);
    setAutoAckProductsState(getAutoAckProducts());
    // Auto-acknowledge the alert if toggling on
    if (enabled) {
      handleAck(alertId);
    }
  };

  const toggleExpand = (alertId: string) => {
    setExpandedAlertId(expandedAlertId === alertId ? null : alertId);
  };

  const activeAlerts = alerts?.filter((a) => !a.acknowledged) ?? [];
  const acknowledgedAlerts = alerts?.filter((a) => a.acknowledged) ?? [];
  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = activeAlerts.filter((a) => a.severity === "warning").length;

  return (
    <Layout>
      <PageHeader
        title="Margin Alert Center"
        description="Monitor, acknowledge, and resolve margin alerts across sales orders"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Margin Alerts" },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation("/finance/reports")}>
              <BarChart3 className="w-4 h-4 mr-1" />
              Profitability Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-6xl">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Active Alerts</span>
            </div>
            <p className="text-2xl font-bold">{activeAlerts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Critical</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Warning</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{warningCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Acknowledged</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{acknowledgedAlerts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Button variant={!showAll ? "default" : "outline"} size="sm" onClick={() => setShowAll(false)}>
          Active Only ({activeAlerts.length})
        </Button>
        <Button variant={showAll ? "default" : "outline"} size="sm" onClick={() => setShowAll(true)}>
          All ({alerts?.length ?? 0})
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">
          {alerts && (
            <span>Auto-refreshes every 30s</span>
          )}
        </div>
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : alerts?.length ? (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const isExpanded = expandedAlertId === alert.id;
            const Icon = typeIcons[alert.alertType] ?? AlertTriangle;
            const isAutoAcked = alert.orderId && autoAckProducts.has(alert.orderId);

            return (
              <Card
                key={alert.id}
                className={`${alert.acknowledged ? "opacity-60" : ""} transition-all`}
              >
                <CardContent className="p-0">
                  {/* Main alert row */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded-lg shrink-0 bg-muted">
                          <Icon className={`w-4 h-4 ${alert.severity === "critical" ? "text-red-600" : alert.severity === "warning" ? "text-amber-600" : "text-blue-600"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${severityDotColors[alert.severity] ?? "bg-gray-400"}`} />
                              <Badge className={severityColors[alert.severity]} variant="outline">
                                {alert.severity}
                              </Badge>
                            </div>
                            <Badge variant="secondary">{typeLabels[alert.alertType] ?? alert.alertType}</Badge>
                            {alert.acknowledged && (
                              <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Acknowledged
                              </Badge>
                            )}
                            {isAutoAcked && (
                              <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">
                                <EyeOff className="w-3 h-3 mr-1" />
                                Auto-Ack
                              </Badge>
                            )}
                          </div>
                          {alert.orderNumber && (
                            <p className="text-sm font-medium">
                              Order: <a href={`/sales-orders/${alert.orderId}`} className="text-primary hover:underline">{alert.orderNumber}</a>
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                            {alert.actualMargin != null && (
                              <span>
                                Actual Margin:{" "}
                                <strong className={alert.actualMargin < 0 ? "text-red-600" : ""}>
                                  {alert.actualMargin.toFixed(1)}%
                                </strong>
                              </span>
                            )}
                            {alert.expectedMargin != null && (
                              <span>Expected: {alert.expectedMargin.toFixed(1)}%</span>
                            )}
                            <span className="text-xs">
                              {new Date(alert.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!alert.acknowledged && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAck(alert.id)}
                              className="whitespace-nowrap"
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Acknowledge
                            </Button>
                            {/* Quick actions based on severity */}
                            {alert.severity === "critical" && (
                              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" asChild>
                                <a href={`/finance/pricing/simulator`}>
                                  <DollarSign className="w-3.5 h-3.5" />
                                </a>
                              </Button>
                            )}
                          </>
                        )}
                        {alert.orderId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleExpand(alert.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-3 bg-muted/10 space-y-3">
                      {/* Auto-acknowledge toggle */}
                      {alert.orderId && (
                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                          <Switch
                            id={`auto-ack-${alert.id}`}
                            checked={autoAckProducts.has(alert.orderId)}
                            onCheckedChange={(checked) => handleAutoAckToggle(alert.id, alert.orderId!, checked)}
                          />
                          <Label htmlFor={`auto-ack-${alert.id}`} className="text-xs cursor-pointer">
                            Auto-acknowledge future alerts for this order
                          </Label>
                        </div>
                      )}

                      {/* Root Cause Analysis */}
                      {enrichedAlert && (
                        <div className={`p-3 rounded-lg border ${
                          enrichedAlert.severity === "critical" ? "bg-red-50 border-red-200" :
                          enrichedAlert.severity === "warning" ? "bg-amber-50 border-amber-200" :
                          "bg-blue-50 border-blue-200"
                        }`}>
                          <div className="flex items-start gap-2">
                            <Lightbulb className={`w-4 h-4 shrink-0 mt-0.5 ${
                              enrichedAlert.severity === "critical" ? "text-red-600" :
                              enrichedAlert.severity === "warning" ? "text-amber-600" :
                              "text-blue-600"
                            }`} />
                            <div>
                              <p className="text-xs font-medium mb-0.5">Root Cause Analysis</p>
                              <p className="text-xs">{enrichedAlert.rootCause}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Order detail lines */}
                      {enrichedAlert ? (
                        <div className="space-y-2">
                          {enrichedAlert.orderNumber && (
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {enrichedAlert.orderNumber}
                              </span>
                              <div className="flex items-center gap-2">
                                {alert.orderId && (
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                                    <a href={`/sales-orders/${alert.orderId}`}>
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      View Order
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                          {enrichedAlert.lines.length > 0 && (
                            <div className="overflow-x-auto rounded border">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-muted/50 border-b">
                                    <th className="text-left py-1.5 px-2 font-medium">SKU</th>
                                    <th className="text-left py-1.5 px-2 font-medium">Product</th>
                                    <th className="text-right py-1.5 px-2 font-medium">Unit Price</th>
                                    <th className="text-right py-1.5 px-2 font-medium">Unit Cost</th>
                                    <th className="text-right py-1.5 px-2 font-medium">Margin %</th>
                                    <th className="text-center py-1.5 px-2 font-medium">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {enrichedAlert.lines.map((line, li) => (
                                    <tr key={li} className="border-b last:border-0 hover:bg-muted/20">
                                      <td className="py-1.5 px-2 font-mono">{line.skuCode || line.productId.slice(0, 8)}</td>
                                      <td className="py-1.5 px-2">{line.productName || "—"}</td>
                                      <td className="py-1.5 px-2 text-right">${line.unitPrice.toFixed(2)}</td>
                                      <td className="py-1.5 px-2 text-right">${line.unitCost.toFixed(2)}</td>
                                      <td className={`py-1.5 px-2 text-right font-medium ${line.marginPct < 0 ? "text-red-600" : ""}`}>
                                        {line.marginPct.toFixed(1)}%
                                      </td>
                                      <td className="py-1.5 px-2 text-center">
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                                          <a href={`/finance/costing/${line.productId}`}>
                                            <DollarSign className="w-3 h-3" />
                                          </a>
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                          Loading root cause analysis...
                        </div>
                      )}

                      {/* Suggested Actions */}
                      {enrichedAlert && enrichedAlert.suggestedActions.length > 0 && (
                        <div className="pt-1">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Suggested Actions:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {enrichedAlert.suggestedActions.map((action, ai) => (
                              <Button key={ai} size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                                <a href={action.url}>
                                  {action.type === "pricing" && <DollarSign className="w-3 h-3" />}
                                  {action.type === "costing" && <BarChart3 className="w-3 h-3" />}
                                  {action.type === "rules" && <Eye className="w-3 h-3" />}
                                  {action.type === "simulator" && <TrendingDown className="w-3 h-3" />}
                                  {action.type === "reports" && <BarChart3 className="w-3 h-3" />}
                                  {action.label}
                                </a>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Related Alerts */}
                      {relatedAlerts && relatedAlerts.length > 0 && (
                        <div className="border-t border-border/50 pt-2">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <Link className="w-3 h-3" />
                            Related Alerts ({relatedAlerts.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {relatedAlerts.map((ra) => (
                              <Badge
                                key={ra.id}
                                variant="outline"
                                className={`text-[10px] cursor-pointer ${
                                  ra.severity === "critical" ? "border-red-300 text-red-700 bg-red-50" :
                                  ra.severity === "warning" ? "border-amber-300 text-amber-700 bg-amber-50" :
                                  "border-blue-300 text-blue-700 bg-blue-50"
                                }`}
                                onClick={() => setExpandedAlertId(ra.id)}
                              >
                                {ra.alertType.replace("_", " ")} — {new Date(ra.createdAt).toLocaleDateString()}
                                {ra.acknowledged && " (acknowledged)"}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p className="font-medium text-green-700">No active margin alerts</p>
            <p className="text-sm text-muted-foreground mt-1">All orders are within acceptable margin thresholds</p>
          </CardContent>
        </Card>
      )}
      </div>
    </Layout>
  );
}

export default function FinanceMarginAlertsPage() {
  return (
    <RoleGate roles={["admin", "operator"]}>
      <FinanceMarginAlertsPageContent />
    </RoleGate>
  );
}
