import { db } from "@workspace/db";
import {
  salesOrdersTable,
  salesOrderLinesTable,
  productsTable,
  marginAlertsTable,
  inventoryItemsTable,
  productCostHistoryTable,
  poLandedCostsTable,
} from "@workspace/db/schema";
import { eq, and, sql, isNull, ne, desc, gte, lte, inArray } from "drizzle-orm";

export interface MarginAnalysis {
  orderId: string;
  orderNumber: string;
  revenue: number;
  cogs: number;
  grossMargin: number;
  grossMarginPct: number;
  lineMargins: LineMargin[];
}

export interface LineMargin {
  lineId: string;
  productId: string;
  skuCode: string;
  productName: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
}

export interface MarginAlertEntry {
  id: string;
  orderId: string | null;
  orderNumber: string | null;
  alertType: string;
  severity: string;
  expectedMargin: number | null;
  actualMargin: number | null;
  acknowledged: boolean;
  createdAt: Date;
}

/**
 * Calculate margin for a sales order.
 * Revenue = SUM(line.qty * line.unitCost snapshot)
 * COGS stored on order as totalCogs
 */
export async function calculateOrderMargin(orderId: string): Promise<MarginAnalysis | null> {
  const [order] = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, orderId))
    .limit(1);
  if (!order) return null;

  const lines = await db
    .select()
    .from(salesOrderLinesTable)
    .where(eq(salesOrderLinesTable.orderId, orderId));

  const enrichedLines: LineMargin[] = lines.map((l: any) => {
    const unitPrice = l.unitPrice ? parseFloat(l.unitPrice) : 0;
    const unitCost = parseFloat(l.costAtTime ?? "0");
    const qty = l.qtyShipped > 0 ? l.qtyShipped : l.qtyOrdered;
    const revenue = qty * unitPrice;
    const cost = qty * unitCost;
    const margin = revenue - cost;
    const marginPct = revenue > 0 ? Math.round((margin / revenue) * 10000) / 100 : 0;

    return {
      lineId: l.id,
      productId: l.productId,
      skuCode: "",
      productName: "",
      qty,
      unitPrice,
      unitCost,
      revenue,
      cost,
      margin,
      marginPct,
    };
  });

  // Batch fetch product info
  const productIds = [...new Set(enrichedLines.map((l) => l.productId))];
  if (productIds.length > 0) {
    const productRows = await db
      .select({ id: productsTable.id, skuCode: productsTable.skuCode, name: productsTable.name })
      .from(productsTable)
      .where(inArray(productsTable.id, productIds));
    const productMap = new Map(productRows.map((p) => [p.id, p]));
    for (const line of enrichedLines) {
      const p = productMap.get(line.productId);
      if (p) {
        line.skuCode = p.skuCode;
        line.productName = p.name;
      }
    }
  }

  const revenue = enrichedLines.reduce((s, l) => s + l.revenue, 0);
  const cogs = enrichedLines.reduce((s, l) => s + l.cost, 0);
  const grossMargin = revenue - cogs;
  const grossMarginPct = revenue > 0 ? Math.round((grossMargin / revenue) * 10000) / 100 : 0;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    revenue,
    cogs,
    grossMargin,
    grossMarginPct,
    lineMargins: enrichedLines,
  };
}

/**
 * Check margin for an order and create alerts if needed.
 * Called at SO confirm time and at ship time.
 */
export async function checkAndCreateMarginAlerts(orderId: string): Promise<void> {
  const analysis = await calculateOrderMargin(orderId);
  if (!analysis) return;

  const [order] = await db
    .select({ marginFloor: productsTable.marginFloor })
    .from(productsTable)
    .limit(1);

  // Check overall margin
  if (analysis.grossMargin < 0) {
    await db.insert(marginAlertsTable).values({
      orderId,
      alertType: "negative_margin",
      severity: "critical",
      expectedMargin: null,
      actualMargin: String(analysis.grossMarginPct),
    });
  }

  // Check per-line margins against product margin floors
  for (const line of analysis.lineMargins) {
    if (line.marginPct < 0) {
      await db.insert(marginAlertsTable).values({
        orderId,
        alertType: "negative_margin",
        severity: "warning",
        expectedMargin: "0",
        actualMargin: String(line.marginPct),
      });
    }
  }
}

/**
 * Get all active (unacknowledged) margin alerts.
 */
export async function getActiveMarginAlerts(): Promise<MarginAlertEntry[]> {
  const alerts = await db
    .select({
      id: marginAlertsTable.id,
      orderId: marginAlertsTable.orderId,
      alertType: marginAlertsTable.alertType,
      severity: marginAlertsTable.severity,
      expectedMargin: marginAlertsTable.expectedMargin,
      actualMargin: marginAlertsTable.actualMargin,
      acknowledged: marginAlertsTable.acknowledged,
      createdAt: marginAlertsTable.createdAt,
    })
    .from(marginAlertsTable)
    .where(eq(marginAlertsTable.acknowledged, false))
    .orderBy(desc(marginAlertsTable.createdAt));

  // Enrich with order numbers
  const orderIds = [...new Set(alerts.map((a) => a.orderId).filter(Boolean))] as string[];
  const orderMap = new Map<string, string>();
  if (orderIds.length > 0) {
    const orders = await db
      .select({ id: salesOrdersTable.id, orderNumber: salesOrdersTable.orderNumber })
      .from(salesOrdersTable)
      .where(inArray(salesOrdersTable.id, orderIds));
    for (const o of orders) orderMap.set(o.id, o.orderNumber);
  }

  return alerts.map((a) => ({
    id: a.id,
    orderId: a.orderId,
    orderNumber: a.orderId ? orderMap.get(a.orderId) ?? null : null,
    alertType: a.alertType,
    severity: a.severity,
    expectedMargin: a.expectedMargin ? parseFloat(a.expectedMargin) : null,
    actualMargin: a.actualMargin ? parseFloat(a.actualMargin) : null,
    acknowledged: a.acknowledged,
    createdAt: a.createdAt,
  }));
}

/**
 * Acknowledge a margin alert.
 */
export async function acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(marginAlertsTable)
    .where(eq(marginAlertsTable.id, alertId))
    .limit(1);
  if (!existing) return false;

  await db
    .update(marginAlertsTable)
    .set({
      acknowledged: true,
      acknowledgedBy: userId,
      acknowledgedAt: new Date(),
    })
    .where(eq(marginAlertsTable.id, alertId));
  return true;
}

/**
 * Finance dashboard KPIs.
 */
export interface FinanceDashboard {
  grossMarginPct: number;
  totalRevenue: number;
  totalCogs: number;
  avgMarkup: number;
  negativeMarginOrders: number;
  productsBelowFloor: number;
  revenueByCategory: { category: string; revenue: number; margin: number }[];
  marginTrend: { date: string; marginPct: number }[];
}

export async function getFinanceDashboard(startDate?: string, endDate?: string): Promise<FinanceDashboard> {
  const start = startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const end = endDate ?? new Date().toISOString().slice(0, 10);

  const shippedOrders = await db
    .select()
    .from(salesOrdersTable)
    .where(and(
      sql`${salesOrdersTable.status} IN ('shipped', 'delivered')`,
      gte(salesOrdersTable.createdAt, new Date(start)),
      lte(salesOrdersTable.createdAt, new Date(end + "T23:59:59"))
    ));

  let totalRevenue = 0;
  let totalCogs = 0;
  let negativeMarginCount = 0;

  for (const order of shippedOrders) {
    const revenue = parseFloat(order.totalRevenue ?? "0");
    const cogs = parseFloat(order.totalCogs ?? "0");
    totalRevenue += revenue;
    totalCogs += cogs;
    if (revenue > 0 && (revenue - cogs) / revenue < 0) negativeMarginCount++;
  }

  const grossMarginPct = totalRevenue > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : 0;

  // Avg markup across products with avgCost
  const [markupResult] = await db
    .select({
      avgMarkup: sql<number>`AVG(CASE WHEN ${inventoryItemsTable.avgCost} > 0 THEN (CAST(${productsTable.unitPrice} AS NUMERIC) - CAST(${inventoryItemsTable.avgCost} AS NUMERIC)) / CAST(${inventoryItemsTable.avgCost} AS NUMERIC) * 100 ELSE 0 END)`,
    })
    .from(productsTable)
    .leftJoin(inventoryItemsTable, eq(productsTable.id, inventoryItemsTable.productId))
    .where(eq(productsTable.isActive, true));

  const avgMarkup = markupResult?.avgMarkup ?? 0;

  // Products below floor: active products where margin < margin_floor
  const activeProducts = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.isActive, true), sql`${productsTable.unitPrice} IS NOT NULL`));

  let belowFloor = 0;
  for (const p of activeProducts) {
    const price = p.unitPrice ? parseFloat(p.unitPrice) : 0;
    if (price <= 0) continue;
    const [inv] = await db
      .select({ avgCost: inventoryItemsTable.avgCost })
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.productId, p.id))
      .limit(1);
    const cost = inv?.avgCost ? parseFloat(inv.avgCost) : 0;
    if (cost <= 0) continue;
    const marginPct = ((price - cost) / price) * 100;
    const floor = p.marginFloor ? parseFloat(p.marginFloor) : 0;
    if (floor > 0 && marginPct < floor) belowFloor++;
  }

  // Revenue by category
  const categoryRev = new Map<string, number>();
  for (const order of shippedOrders) {
    const lines = await db
      .select({ productId: salesOrderLinesTable.productId, qty: salesOrderLinesTable.qtyShipped, unitPrice: salesOrderLinesTable.unitPrice })
      .from(salesOrderLinesTable)
      .where(eq(salesOrderLinesTable.orderId, order.id));
    for (const l of lines) {
      const [prod] = await db.select({ category: productsTable.category }).from(productsTable).where(eq(productsTable.id, l.productId)).limit(1);
      const cat = prod?.category ?? "Uncategorized";
      const lineRev = (l.qty > 0 ? l.qty : 0) * (l.unitPrice ? parseFloat(l.unitPrice) : 0);
      categoryRev.set(cat, (categoryRev.get(cat) ?? 0) + lineRev);
    }
  }

  const revenueByCategory = [...categoryRev.entries()].map(([category, revenue]) => ({
    category,
    revenue,
    margin: revenue - (revenue * 0.6), // estimated
  }));

  // Margin trend (daily for period)
  const marginTrend: { date: string; marginPct: number }[] = [];
  for (const order of shippedOrders) {
    const date = order.createdAt.toISOString().slice(0, 10);
    const revenue = parseFloat(order.totalRevenue ?? "0");
    const cogs = parseFloat(order.totalCogs ?? "0");
    const marginPct = revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0;
    marginTrend.push({ date, marginPct: Math.round(marginPct * 100) / 100 });
  }
  marginTrend.sort((a, b) => a.date.localeCompare(b.date));

  return {
    grossMarginPct: Math.round(grossMarginPct * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCogs: Math.round(totalCogs * 100) / 100,
    avgMarkup: Math.round(avgMarkup * 100) / 100,
    negativeMarginOrders: negativeMarginCount,
    productsBelowFloor: belowFloor,
    revenueByCategory,
    marginTrend,
  };
}

/**
 * Product cost breakdown for the costing detail page.
 */
export interface ProductCostBreakdown {
  productId: string;
  skuCode: string;
  name: string;
  currentAvgCost: number;
  standardCost: number | null;
  markupTarget: number | null;
  marginFloor: number | null;
  totalQty: number;
  totalValue: number;
  costHistory: { date: string; avgCost: number; totalQty: number; sourceType: string }[];
  suggestedPrice: number | null;
}

export async function getProductCostBreakdown(productId: string): Promise<ProductCostBreakdown | null> {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, productId))
    .limit(1);
  if (!product) return null;

  const invItems = await db
    .select()
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.productId, productId));

  let totalQty = 0;
  let totalValue = 0;
  let latestAvgCost = 0;
  for (const item of invItems) {
    totalQty += item.qtyOnHand;
    if (item.avgCost) {
      const cost = parseFloat(item.avgCost);
      latestAvgCost = cost;
      totalValue += item.qtyOnHand * cost;
    }
  }

  // Cost history
  const history = await db
    .select()
    .from(productCostHistoryTable)
    .where(and(eq(productCostHistoryTable.productId, productId)))
    .orderBy(desc(productCostHistoryTable.createdAt))
    .limit(30);

  const markupTarget = product.markupTarget ? parseFloat(product.markupTarget) : null;
  const suggestedPrice = latestAvgCost > 0 && markupTarget
    ? Math.round(latestAvgCost * (1 + markupTarget / 100) * 100) / 100
    : null;

  return {
    productId: product.id,
    skuCode: product.skuCode,
    name: product.name,
    currentAvgCost: latestAvgCost,
    standardCost: product.standardCost ? parseFloat(product.standardCost) : null,
    markupTarget,
    marginFloor: product.marginFloor ? parseFloat(product.marginFloor) : null,
    totalQty,
    totalValue: Math.round(totalValue * 100) / 100,
    costHistory: history.map((h) => ({
      date: h.createdAt.toISOString().slice(0, 10),
      avgCost: parseFloat(h.avgCost),
      totalQty: h.totalQty,
      sourceType: h.sourceType,
    })),
    suggestedPrice,
  };
}

/**
 * Product profitability report.
 */
export interface ProductProfitability {
  productId: string;
  skuCode: string;
  name: string;
  category: string | null;
  totalRevenue: number;
  totalCogs: number;
  grossMargin: number;
  marginPct: number;
  unitsSold: number;
}

export async function getProductProfitability(startDate?: string, endDate?: string): Promise<ProductProfitability[]> {
  const start = startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const end = endDate ?? new Date().toISOString();

  const lines = await db
    .select({
      productId: salesOrderLinesTable.productId,
      qtyShipped: salesOrderLinesTable.qtyShipped,
      unitPrice: salesOrderLinesTable.unitPrice,
      costAtTime: salesOrderLinesTable.costAtTime,
      orderCreatedAt: salesOrdersTable.createdAt,
    })
    .from(salesOrderLinesTable)
    .innerJoin(salesOrdersTable, eq(salesOrderLinesTable.orderId, salesOrdersTable.id))
    .where(and(
      sql`${salesOrdersTable.status} IN ('shipped', 'delivered')`,
      gte(salesOrdersTable.createdAt, new Date(start)),
      lte(salesOrdersTable.createdAt, new Date(end))
    ));

  const profitMap = new Map<string, { revenue: number; cogs: number; units: number }>();
  for (const l of lines) {
    const qty = l.qtyShipped;
    const price = l.unitPrice ? parseFloat(l.unitPrice) : 0;
    const cost = l.costAtTime ? parseFloat(l.costAtTime) : 0;
    const existing = profitMap.get(l.productId) ?? { revenue: 0, cogs: 0, units: 0 };
    existing.revenue += qty * price;
    existing.cogs += qty * cost;
    existing.units += qty;
    profitMap.set(l.productId, existing);
  }

  const productIds = [...profitMap.keys()];
  if (productIds.length === 0) return [];

  const products = await db
    .select({ id: productsTable.id, skuCode: productsTable.skuCode, name: productsTable.name, category: productsTable.category })
    .from(productsTable)            .where(inArray(productsTable.id, productIds));
  const productMap = new Map(products.map((p) => [p.id, p]));

  return productIds
    .map((pid) => {
      const p = productMap.get(pid);
      if (!p) return null;
      const data = profitMap.get(pid)!;
      const margin = data.revenue - data.cogs;
      const marginPct = data.revenue > 0 ? (margin / data.revenue) * 100 : 0;
      return {
        productId: pid,
        skuCode: p.skuCode,
        name: p.name,
        category: p.category,
        totalRevenue: Math.round(data.revenue * 100) / 100,
        totalCogs: Math.round(data.cogs * 100) / 100,
        grossMargin: Math.round(margin * 100) / 100,
        marginPct: Math.round(marginPct * 100) / 100,
        unitsSold: data.units,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.grossMargin - a!.grossMargin) as ProductProfitability[];
}

/**
 * Product costing list — returns all active products with cost info.
 */
export interface ProductCostingListItem {
  productId: string;
  skuCode: string;
  name: string;
  category: string | null;
  currentAvgCost: number;
  standardCost: number | null;
  markupTarget: number | null;
  marginFloor: number | null;
  totalQty: number;
  totalInventoryValue: number;
  costVariancePct: number | null;
  isActive: boolean;
}

export async function getProductCostingList(): Promise<ProductCostingListItem[]> {
  const products = await db
    .select()
    .from(productsTable)
    .orderBy(productsTable.name);

  // Batch fetch inventory data
  const productIds = products.map((p) => p.id);
  const invItems = productIds.length > 0
    ? await db
        .select()
        .from(inventoryItemsTable)
        .where(inArray(inventoryItemsTable.productId, productIds))
    : [];

  const invMap = new Map<string, { totalQty: number; totalValue: number; avgCost: number }>();
  for (const item of invItems) {
    const existing = invMap.get(item.productId) ?? { totalQty: 0, totalValue: 0, avgCost: 0 };
    existing.totalQty += item.qtyOnHand;
    if (item.avgCost) {
      const cost = parseFloat(item.avgCost);
      existing.avgCost = existing.avgCost > 0 ? (existing.avgCost + cost) / 2 : cost;
      existing.totalValue += item.qtyOnHand * cost;
    }
    invMap.set(item.productId, existing);
  }

  return products.map((p) => {
    const inv = invMap.get(p.id);
    const currentAvgCost = inv?.avgCost ?? 0;
    const standardCost = p.standardCost ? parseFloat(p.standardCost) : null;
    const costVariancePct = standardCost && currentAvgCost > 0
      ? Math.round(((currentAvgCost - standardCost) / standardCost) * 10000) / 100
      : null;

    return {
      productId: p.id,
      skuCode: p.skuCode,
      name: p.name,
      category: p.category,
      currentAvgCost,
      standardCost,
      markupTarget: p.markupTarget ? parseFloat(p.markupTarget) : null,
      marginFloor: p.marginFloor ? parseFloat(p.marginFloor) : null,
      totalQty: inv?.totalQty ?? 0,
      totalInventoryValue: Math.round((inv?.totalValue ?? 0) * 100) / 100,
      costVariancePct,
      isActive: p.isActive,
    };
  });
}

// ── Enhanced Alert Detail ────────────────────────────────────────────────────

/**
 * Get enriched margin alert with root cause analysis and suggested actions.
 */
export async function getEnrichedAlertWithActions(alertId: string): Promise<{
  id: string;
  orderId: string | null;
  orderNumber: string | null;
  alertType: string;
  severity: string;
  actualMargin: number | null;
  expectedMargin: number | null;
  acknowledged: boolean;
  createdAt: Date;
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
} | null> {
  const [alert] = await db
    .select()
    .from(marginAlertsTable)
    .where(eq(marginAlertsTable.id, alertId))
    .limit(1);
  if (!alert) return null;

  let orderNumber: string | null = null;
  let customerName = "";
  let lines: {
    productId: string;
    skuCode: string;
    productName: string;
    unitPrice: number;
    unitCost: number;
    marginPct: number;
  }[] = [];

  if (alert.orderId) {
    const [order] = await db
      .select()
      .from(salesOrdersTable)
      .where(eq(salesOrdersTable.id, alert.orderId))
      .limit(1);
    if (order) {
      orderNumber = order.orderNumber;

      const orderLines = await db
        .select()
        .from(salesOrderLinesTable)
        .where(eq(salesOrderLinesTable.orderId, alert.orderId));

      const productIds = [...new Set(orderLines.map((l) => l.productId))];
      const products = productIds.length > 0
        ? await db
            .select({ id: productsTable.id, skuCode: productsTable.skuCode, name: productsTable.name })
            .from(productsTable)
        .where(inArray(productsTable.id, productIds))
    : [];
      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const l of orderLines) {
        const unitPrice = l.unitPrice ? parseFloat(l.unitPrice) : 0;
        const unitCost = l.costAtTime ? parseFloat(l.costAtTime) : 0;
        const marginPct = unitPrice > 0 ? ((unitPrice - unitCost) / unitPrice) * 100 : 0;
        const prod = productMap.get(l.productId);
        lines.push({
          productId: l.productId,
          skuCode: prod?.skuCode ?? "",
          productName: prod?.name ?? "",
          unitPrice,
          unitCost,
          marginPct: Math.round(marginPct * 100) / 100,
        });
      }
    }
  }

  // Derive root cause
  const actualMargin = alert.actualMargin ? parseFloat(alert.actualMargin) : null;
  let rootCause = "";
  const suggestedActions: { label: string; url: string; type: string }[] = [];

  if (alert.alertType === "negative_margin") {
    const worstLine = lines.reduce((worst, l) =>
      l.marginPct < worst.marginPct ? l : worst, lines[0] ?? { marginPct: 0 } as any);
    if (worstLine && worstLine.marginPct < 0) {
      rootCause = `Critical: ${worstLine.productName} (${worstLine.skuCode}) is selling at $${worstLine.unitPrice.toFixed(2)} but costs $${worstLine.unitCost.toFixed(2)} — a ${Math.abs(worstLine.marginPct).toFixed(1)}% loss per unit.`;
    } else {
      rootCause = "Order total margin is negative — verify pricing and costs for all line items.";
    }
    suggestedActions.push(
      { label: "Adjust Pricing", url: "/finance/pricing/simulator", type: "pricing" },
      { label: "Review Costs", url: "/finance/costing", type: "costing" }
    );
  } else if (alert.alertType === "below_floor") {
    rootCause = `Margin of ${actualMargin?.toFixed(1) ?? "?"}% is below the configured floor minimum. Check pricing rules and product margin settings.`;
    suggestedActions.push(
      { label: "Review Pricing Rules", url: "/finance/pricing/rules", type: "rules" },
      { label: "Edit Product Costing", url: lines[0] ? `/finance/costing/${lines[0].productId}` : "/finance/costing", type: "costing" }
    );
  } else if (alert.alertType === "price_anomaly") {
    rootCause = "Price deviation detected — product price differs significantly from list price or category average.";
    suggestedActions.push(
      { label: "Check Price Lists", url: "/finance/reports", type: "reports" },
      { label: "Simulate Pricing", url: "/finance/pricing/simulator", type: "simulator" }
    );
  }

  return {
    id: alert.id,
    orderId: alert.orderId,
    orderNumber,
    alertType: alert.alertType,
    severity: alert.severity,
    actualMargin: actualMargin,
    expectedMargin: alert.expectedMargin ? parseFloat(alert.expectedMargin) : null,
    acknowledged: alert.acknowledged,
    createdAt: alert.createdAt,
    rootCause,
    suggestedActions,
    lines,
  };
}

/**
 * Get related margin alerts for the same order.
 */
export async function getRelatedAlertsForOrder(alertId: string): Promise<{
  id: string;
  alertType: string;
  severity: string;
  createdAt: Date;
  acknowledged: boolean;
}[]> {
  // Find the order for this alert
  const [alert] = await db
    .select({ orderId: marginAlertsTable.orderId })
    .from(marginAlertsTable)
    .where(eq(marginAlertsTable.id, alertId))
    .limit(1);
  if (!alert?.orderId) return [];

  const related = await db
    .select({
      id: marginAlertsTable.id,
      alertType: marginAlertsTable.alertType,
      severity: marginAlertsTable.severity,
      createdAt: marginAlertsTable.createdAt,
      acknowledged: marginAlertsTable.acknowledged,
    })
    .from(marginAlertsTable)
    .where(and(
      eq(marginAlertsTable.orderId, alert.orderId),
      ne(marginAlertsTable.id, alertId)
    ))
    .orderBy(desc(marginAlertsTable.createdAt))
    .limit(10);

  return related;
}

export { productCostHistoryTable, marginAlertsTable, poLandedCostsTable };
