import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  purchaseOrdersTable,
  poLandedCostsTable,
  purchaseOrderLinesTable,
  productCostHistoryTable,
  salesOrdersTable,
  salesOrderLinesTable,
  marginAlertsTable,
  priceListsTable,
  priceListItemsTable,
} from "@workspace/db/schema";
import { financeAuditLogTable } from "@workspace/db/schema";
import { eq, and, sql, desc, gte, lte, inArray, count, like } from "drizzle-orm";
import { z } from "zod";
import {
  addLandedCosts,
  getLandedCosts,
  effectiveUnitCost,
  recordCostHistory,
  copyLandedCostsFromPO,
} from "../services/costing.service";
import {
  simulatePricing,
  createPricingRule,
  getActivePricingRules,
  updatePricingRule,
  deletePricingRule,
  PricingRuleInput,
  simulateBulkPricing,
  testPricingRule,
  saveSimulationAsPriceList,
} from "../services/pricing.service";
import {
  getFinanceDashboard,
  getProductCostBreakdown,
  getProductProfitability,
  getActiveMarginAlerts,
  acknowledgeAlert,
  getProductCostingList,
  calculateOrderMargin,
  getEnrichedAlertWithActions,
  getRelatedAlertsForOrder,
} from "../services/margin.service";

// ── Audit Helpers ─────────────────────────────────────────────────────────────

async function recordAudit(req: any, action: "create" | "update" | "delete" | "acknowledge" | "bulk_update", objectType: "product" | "pricing_rule" | "price_list" | "landed_cost", objectId: string, changes?: Record<string, unknown>, reason?: string) {
  const userId = req.auth?.userId ?? "system";
  const ipAddress = req.ip ?? req.headers?.["x-forwarded-for"] ?? "";
  await db.insert(financeAuditLogTable).values({
    userId,
    action,
    objectType,
    objectId,
    changes: (changes ? changes : null) as any,
    reason: reason ?? null,
    ipAddress: typeof ipAddress === "string" ? ipAddress : "",
  });
}

const router: IRouter = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCE DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/finance/dashboard", async (req, res) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  try {
    const dashboard = await getFinanceDashboard(startDate, endDate);
    res.json(dashboard);
  } catch (err: any) {
    console.error("Finance dashboard error:", err);
    res.status(500).json({ error: "Failed to load finance dashboard" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/finance/audit-log", async (req, res) => {
  const { objectType, objectId, limit: limitStr } = req.query as {
    objectType?: string;
    objectId?: string;
    limit?: string;
  };
  const maxLimit = parseInt(limitStr ?? "50", 10);
  try {
    const conditions = [];
    if (objectType) conditions.push(eq(financeAuditLogTable.objectType, objectType as any));
    if (objectId) conditions.push(eq(financeAuditLogTable.objectId, objectId));

    const logs = await db
      .select()
      .from(financeAuditLogTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(financeAuditLogTable.createdAt))
      .limit(Math.min(maxLimit, 200));
    res.json(logs);
  } catch (err: any) {
    console.error("Audit log error:", err);
    res.status(500).json({ error: "Failed to load audit log" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COSTING
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/finance/costing", async (req, res) => {
  try {
    const list = await getProductCostingList();
    res.json(list);
  } catch (err: any) {
    console.error("Costing list error:", err);
    res.status(500).json({ error: "Failed to load costing list" });
  }
});

router.get("/finance/costing/:productId", async (req, res) => {
  try {
    const breakdown = await getProductCostBreakdown(req.params.productId);
    if (!breakdown) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(breakdown);
  } catch (err: any) {
    console.error("Costing detail error:", err);
    res.status(500).json({ error: "Failed to load cost breakdown" });
  }
});

// PUT /finance/costing/:productId — Update cost fields with mandatory reason
const UpdateCostingZ = z.object({
  standardCost: z.number().min(0).optional(),
  markupTarget: z.number().min(0).optional(),
  marginFloor: z.number().min(0).max(100).optional(),
  reason: z.string().min(1, "Reason is required for cost changes").max(500),
});

router.put("/finance/costing/:productId", async (req: any, res) => {
  const body = UpdateCostingZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, req.params.productId))
    .limit(1);
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const updateFields: Record<string, unknown> = { updatedAt: new Date() };
  const changes: Record<string, unknown> = {};
  if (body.data.standardCost !== undefined) {
    updateFields.standardCost = String(body.data.standardCost);
    changes.standardCost = { from: product.standardCost, to: String(body.data.standardCost) };
  }
  if (body.data.markupTarget !== undefined) {
    updateFields.markupTarget = String(body.data.markupTarget);
    changes.markupTarget = { from: product.markupTarget, to: String(body.data.markupTarget) };
  }
  if (body.data.marginFloor !== undefined) {
    updateFields.marginFloor = String(body.data.marginFloor);
    changes.marginFloor = { from: product.marginFloor, to: String(body.data.marginFloor) };
  }

  const [updated] = await db
    .update(productsTable)
    .set(updateFields)
    .where(eq(productsTable.id, req.params.productId))
    .returning();

  // Record cost history for manual updates
  if (body.data.standardCost !== undefined) {
    await recordCostHistory(req.params.productId, body.data.standardCost, 0, "manual", undefined, body.data.standardCost);
  }

  // Audit trail
  await recordAudit(req, "update", "product", req.params.productId, changes, body.data.reason);

  res.json({
    ...updated,
    unitPrice: updated.unitPrice ? parseFloat(updated.unitPrice) : null,
    standardCost: updated.standardCost ? parseFloat(updated.standardCost) : null,
    markupTarget: updated.markupTarget ? parseFloat(updated.markupTarget) : null,
    marginFloor: updated.marginFloor ? parseFloat(updated.marginFloor) : null,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LANDED COSTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/finance/landed-costs/:poId", async (req, res) => {
  try {
    const costs = await getLandedCosts(req.params.poId);
    res.json({ landedCosts: costs, total: costs.reduce((s, c) => s + c.amount, 0) });
  } catch (err: any) {
    console.error("Get landed costs error:", err);
    res.status(500).json({ error: "Failed to load landed costs" });
  }
});

// POST /finance/landed-costs/:poId — Add landed costs
const AddLandedCostZ = z.object({
  costs: z.array(z.object({
    costType: z.enum(["freight", "insurance", "duties", "handling", "overhead"]),
    amount: z.number().positive(),
    allocationMethod: z.enum(["value", "weight", "quantity", "equal"]).optional(),
    currency: z.string().optional(),
  })).min(1),
});

router.post("/finance/landed-costs/:poId", async (req: any, res) => {
  const body = AddLandedCostZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  const [po] = await db
    .select()
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.id, req.params.poId))
    .limit(1);
  if (!po) { res.status(404).json({ error: "PO not found" }); return; }

  try {
    await addLandedCosts(req.params.poId, body.data.costs);
    const updatedCosts = await getLandedCosts(req.params.poId);
    // Audit
    await recordAudit(req, "create", "landed_cost", req.params.poId, {
      costs: body.data.costs,
    });
    res.json({ landedCosts: updatedCosts, total: updatedCosts.reduce((s, c) => s + c.amount, 0) });
  } catch (err: any) {
    console.error("Add landed costs error:", err);
    res.status(500).json({ error: "Failed to add landed costs" });
  }
});

// PUT /finance/landed-costs/:poId/draft — Draft save landed costs (no allocation yet)
router.put("/finance/landed-costs/:poId/draft", async (req: any, res) => {
  const [po] = await db
    .select()
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.id, req.params.poId))
    .limit(1);
  if (!po) { res.status(404).json({ error: "PO not found" }); return; }

  const draftSchema = z.object({
    costs: z.array(z.object({
      costType: z.enum(["freight", "insurance", "duties", "handling", "overhead"]),
      amount: z.number().min(0),
      allocationMethod: z.enum(["value", "weight", "quantity", "equal"]).optional().default("value"),
    })),
  });

  const body = draftSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  try {
    // Delete existing draft costs for this PO
    await db.delete(poLandedCostsTable).where(eq(poLandedCostsTable.poId, req.params.poId));
    // Insert new draft costs
    for (const cost of body.data.costs) {
      if (cost.amount > 0) {
        await db.insert(poLandedCostsTable).values({
          poId: req.params.poId,
          costType: cost.costType,
          amount: String(cost.amount),
          allocationMethod: cost.allocationMethod ?? "value",
        });
      }
    }
    const updatedCosts = await getLandedCosts(req.params.poId);
    res.json({ landedCosts: updatedCosts, total: updatedCosts.reduce((s, c) => s + c.amount, 0) });
  } catch (err: any) {
    console.error("Draft save landed costs error:", err);
    res.status(500).json({ error: "Failed to save draft landed costs" });
  }
});

// POST /finance/landed-costs/:poId/copy — Copy landed costs from another PO
router.post("/finance/landed-costs/:poId/copy", async (req: any, res) => {
  const copySchema = z.object({ fromPoId: z.string().uuid() });
  const body = copySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  try {
    const copied = await copyLandedCostsFromPO(body.data.fromPoId, req.params.poId);
    if (copied === 0) {
      res.status(404).json({ error: "No landed costs found on source PO" });
      return;
    }
    // Audit
    await recordAudit(req, "create", "landed_cost", req.params.poId, {
      copiedFrom: body.data.fromPoId,
      count: copied,
    });
    const updatedCosts = await getLandedCosts(req.params.poId);
    res.json({ landedCosts: updatedCosts, total: updatedCosts.reduce((s, c) => s + c.amount, 0), copied });
  } catch (err: any) {
    console.error("Copy landed costs error:", err);
    res.status(500).json({ error: "Failed to copy landed costs" });
  }
});

// POST /finance/landed-costs/:poId/allocate — Re-allocate manually (per-line override)
router.post("/finance/landed-costs/:poId/allocate", async (req: any, res) => {
  const allocateSchema = z.object({
    lineAllocations: z.array(z.object({
      lineId: z.string().uuid(),
      allocatedLandedCost: z.number().min(0),
    })).min(1),
  });

  const body = allocateSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  try {
    for (const alloc of body.data.lineAllocations) {
      await db
        .update(purchaseOrderLinesTable)
        .set({ allocatedLandedCost: String(alloc.allocatedLandedCost) })
        .where(eq(purchaseOrderLinesTable.id, alloc.lineId));
    }
    await recordAudit(req, "update", "landed_cost", req.params.poId, { lineAllocations: body.data.lineAllocations });
    res.json({ success: true });
  } catch (err: any) {
    console.error("Allocate landed costs error:", err);
    res.status(500).json({ error: "Failed to allocate landed costs" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING
// ═══════════════════════════════════════════════════════════════════════════════

// GET /finance/pricing/simulate
const SimulateQueryZ = z.object({
  productId: z.string().uuid(),
  cost: z.coerce.number().min(0).default(0),
  proposedPrice: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().int().min(1).optional(),
});

router.get("/finance/pricing/simulate", async (req, res) => {
  const query = SimulateQueryZ.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Validation error", details: query.error.flatten() });
    return;
  }
  try {
    const result = await simulatePricing(query.data);
    if (!result) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(result);
  } catch (err: any) {
    console.error("Pricing simulation error:", err);
    res.status(500).json({ error: "Failed to simulate pricing" });
  }
});

// POST /finance/pricing/simulate
const SimulateBodyZ = z.object({
  productId: z.string().uuid(),
  cost: z.number().min(0),
  proposedPrice: z.number().min(0).optional(),
  quantity: z.number().int().min(1).optional(),
});

router.post("/finance/pricing/simulate", async (req, res) => {
  const body = SimulateBodyZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }
  try {
    const result = await simulatePricing(body.data);
    if (!result) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(result);
  } catch (err: any) {
    console.error("Pricing simulation error:", err);
    res.status(500).json({ error: "Failed to simulate pricing" });
  }
});

// POST /finance/pricing/simulate/bulk — Multi-product bulk simulation
const BulkSimulateBodyZ = z.object({
  products: z.array(z.object({
    productId: z.string().uuid(),
    cost: z.number().min(0),
  })).min(1).max(50),
  proposedPrice: z.number().min(0).optional(),
  markupPct: z.number().min(0).optional(),
  quantity: z.number().int().min(1).optional(),
});

router.post("/finance/pricing/simulate/bulk", async (req, res) => {
  const body = BulkSimulateBodyZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }
  try {
    const result = await simulateBulkPricing(body.data);
    res.json(result);
  } catch (err: any) {
    console.error("Bulk simulation error:", err);
    res.status(500).json({ error: "Failed to run bulk simulation" });
  }
});

// POST /finance/pricing/test — Test a pricing rule against products
const TestRuleBodyZ = z.object({
  name: z.string().min(1),
  ruleType: z.enum(["margin_floor", "markup_target", "competitive_match", "volume_discount"]),
  scope: z.enum(["global", "category", "product"]).optional(),
  scopeId: z.string().optional(),
  actionJson: z.record(z.unknown()),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

router.post("/finance/pricing/test", async (req, res) => {
  const body = TestRuleBodyZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }
  try {
    const result = await testPricingRule(body.data, body.data.limit);
    res.json(result);
  } catch (err: any) {
    console.error("Test rule error:", err);
    res.status(500).json({ error: "Failed to test pricing rule" });
  }
});

// POST /finance/pricing/save-price-list — Save simulation results as price list
const SavePriceListBodyZ = z.object({
  priceListId: z.string().uuid(),
  prices: z.array(z.object({
    productId: z.string().uuid(),
    unitPrice: z.number().min(0),
  })).min(1).max(100),
});

router.post("/finance/pricing/save-price-list", async (req: any, res) => {
  const body = SavePriceListBodyZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }
  try {
    const result = await saveSimulationAsPriceList(body.data.priceListId, body.data.prices);
    await recordAudit(req, "bulk_update", "price_list", body.data.priceListId, {
      count: body.data.prices.length,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Save price list error:", err);
    res.status(500).json({ error: "Failed to save price list" });
  }
});

// ── Pricing Rules CRUD ─────────────────────────────────────────────────────────

router.get("/finance/pricing/rules", async (req, res) => {
  try {
    const rules = await getActivePricingRules();
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load pricing rules" });
  }
});

// GET /finance/pricing/rules/preview — Preview affected product count for a rule
const RulePreviewQueryZ = z.object({
  scope: z.enum(["global", "category", "product"]).optional().default("global"),
  scopeId: z.string().optional(),
  actionJson: z.string().optional(), // JSON string of action
});

router.get("/finance/pricing/rules/preview", async (req, res) => {
  const query = RulePreviewQueryZ.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Validation error", details: query.error.flatten() });
    return;
  }

  try {
    const activeProducts = await db
      .select({ id: productsTable.id, skuCode: productsTable.skuCode, name: productsTable.name, category: productsTable.category })
      .from(productsTable)
      .where(eq(productsTable.isActive, true));

    let matched = activeProducts;
    if (query.data.scope === "category" && query.data.scopeId) {
      matched = activeProducts.filter((p) => p.category === query.data.scopeId);
    } else if (query.data.scope === "product" && query.data.scopeId) {
      matched = activeProducts.filter((p) => p.id === query.data.scopeId);
    }

    const count_products = matched.length;

    res.json({
      totalActiveProducts: activeProducts.length,
      affectedProductCount: count_products,
      sampleProducts: matched.slice(0, 5).map((p) => ({
        productId: p.id,
        skuCode: p.skuCode,
        name: p.name,
      })),
      scope: query.data.scope,
      scopeId: query.data.scopeId ?? null,
    });
  } catch (err: any) {
    console.error("Rule preview error:", err);
    res.status(500).json({ error: "Failed to preview rule" });
  }
});

const CreateRuleZ = z.object({
  name: z.string().min(1),
  ruleType: z.enum(["margin_floor", "markup_target", "competitive_match", "volume_discount"]),
  scope: z.enum(["global", "category", "product"]).optional(),
  scopeId: z.string().uuid().optional(),
  conditionJson: z.record(z.unknown()).optional(),
  actionJson: z.record(z.unknown()),
  priority: z.number().int().optional(),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.post("/finance/pricing/rules", async (req: any, res) => {
  const body = CreateRuleZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }
  try {
    const rule = await createPricingRule(body.data as PricingRuleInput);
    await recordAudit(req, "create", "pricing_rule", rule.id, { rule: body.data });
    res.status(201).json(rule);
  } catch (err: any) {
    console.error("Create pricing rule error:", err);
    res.status(500).json({ error: "Failed to create pricing rule" });
  }
});

router.put("/finance/pricing/rules/:id", async (req: any, res) => {
  const body = CreateRuleZ.partial().safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }
  try {
    const rule = await updatePricingRule(req.params.id, body.data);
    if (!rule) { res.status(404).json({ error: "Rule not found" }); return; }
    await recordAudit(req, "update", "pricing_rule", req.params.id, { changes: body.data });
    res.json(rule);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update pricing rule" });
  }
});

router.delete("/finance/pricing/rules/:id", async (req: any, res) => {
  try {
    await deletePricingRule(req.params.id);
    await recordAudit(req, "delete", "pricing_rule", req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete pricing rule" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MARGIN ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/finance/margin/alerts/order/:orderId", async (req, res) => {
  try {
    const analysis = await calculateOrderMargin(req.params.orderId);
    if (!analysis) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({
      id: analysis.orderId,
      orderNumber: analysis.orderNumber,
      customerName: "",
      status: "",
      createdAt: "",
      shippedAt: null,
      totalRevenue: analysis.revenue,
      totalCogs: analysis.cogs,
      lines: analysis.lineMargins,
    });
  } catch (err: any) {
    console.error("Margin order detail error:", err);
    res.status(500).json({ error: "Failed to load order margin detail" });
  }
});

router.get("/finance/margin/alerts", async (req, res) => {
  try {
    const { acknowledged } = req.query as { acknowledged?: string };
    if (acknowledged === "true") {
      const alerts = await db
        .select({
          id: marginAlertsTable.id,
          orderId: marginAlertsTable.orderId,
          alertType: marginAlertsTable.alertType,
          severity: marginAlertsTable.severity,
          expectedMargin: marginAlertsTable.expectedMargin,
          actualMargin: marginAlertsTable.actualMargin,
          acknowledged: marginAlertsTable.acknowledged,
          acknowledgedBy: marginAlertsTable.acknowledgedBy,
          acknowledgedAt: marginAlertsTable.acknowledgedAt,
          createdAt: marginAlertsTable.createdAt,
        })
        .from(marginAlertsTable)
        .orderBy(desc(marginAlertsTable.createdAt))
        .limit(100);
      res.json(alerts);
    } else {
      const alerts = await getActiveMarginAlerts();
      res.json(alerts);
    }
  } catch (err: any) {
    console.error("Get margin alerts error:", err);
    res.status(500).json({ error: "Failed to load margin alerts" });
  }
});

// GET /finance/margin/alerts/:id/enriched — Enriched alert with root cause + actions
router.get("/finance/margin/alerts/:id/enriched", async (req, res) => {
  try {
    const enriched = await getEnrichedAlertWithActions(req.params.id);
    if (!enriched) { res.status(404).json({ error: "Alert not found" }); return; }
    res.json(enriched);
  } catch (err: any) {
    console.error("Enriched alert error:", err);
    res.status(500).json({ error: "Failed to load enriched alert" });
  }
});

// GET /finance/margin/alerts/:id/related — Related alerts for same order
router.get("/finance/margin/alerts/:id/related", async (req, res) => {
  try {
    const related = await getRelatedAlertsForOrder(req.params.id);
    res.json(related);
  } catch (err: any) {
    console.error("Related alerts error:", err);
    res.status(500).json({ error: "Failed to load related alerts" });
  }
});

router.post("/finance/margin/alerts/:id/acknowledge", async (req: any, res) => {
  const userId = req.auth?.userId ?? "system";
  try {
    const ok = await acknowledgeAlert(req.params.id, userId);
    if (!ok) { res.status(404).json({ error: "Alert not found" }); return; }
    await recordAudit(req, "acknowledge", "pricing_rule", req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Acknowledge alert error:", err);
    res.status(500).json({ error: "Failed to acknowledge alert" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/finance/reports/profitability", async (req, res) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  try {
    const report = await getProductProfitability(startDate, endDate);
    res.json(report);
  } catch (err: any) {
    console.error("Profitability report error:", err);
    res.status(500).json({ error: "Failed to load profitability report" });
  }
});

router.get("/finance/reports/cost-trend/:productId", async (req, res) => {
  const { months } = req.query as { months?: string };
  const monthsBack = parseInt(months ?? "12", 10);
  const since = new Date(Date.now() - monthsBack * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  try {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, req.params.productId))
      .limit(1);
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }

    const history = await db
      .select()
      .from(productCostHistoryTable)
      .where(and(
        eq(productCostHistoryTable.productId, req.params.productId),
        gte(productCostHistoryTable.createdAt, new Date(since))
      ))
      .orderBy(desc(productCostHistoryTable.createdAt));

    res.json({
      productId: product.id,
      skuCode: product.skuCode,
      name: product.name,
      currentAvgCost: product.standardCost ? parseFloat(product.standardCost) : null,
      trend: history.map((h) => ({
        date: h.createdAt.toISOString().slice(0, 10),
        avgCost: parseFloat(h.avgCost),
        standardCost: h.standardCost ? parseFloat(h.standardCost) : null,
        totalQty: h.totalQty,
        sourceType: h.sourceType,
      })),
    });
  } catch (err: any) {
    console.error("Cost trend error:", err);
    res.status(500).json({ error: "Failed to load cost trend" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BULK COSTING UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

// POST /finance/costing/bulk-update — Bulk update with mandatory reason
const BulkUpdateCostingZ = z.object({
  updates: z.array(z.object({
    productId: z.string().uuid(),
    standardCost: z.number().min(0).optional(),
    markupTarget: z.number().min(0).optional(),
    marginFloor: z.number().min(0).max(100).optional(),
  })).min(1).max(100),
  reason: z.string().min(1, "Reason is required for bulk updates").max(500),
});

router.post("/finance/costing/bulk-update", async (req: any, res) => {
  const body = BulkUpdateCostingZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  const results: { productId: string; success: boolean; error?: string }[] = [];
  for (const update of body.data.updates) {
    try {
      const [product] = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, update.productId))
        .limit(1);
      if (!product) {
        results.push({ productId: update.productId, success: false, error: "Not found" });
        continue;
      }

      const updateFields: Record<string, unknown> = { updatedAt: new Date() };
      if (update.standardCost !== undefined) updateFields.standardCost = String(update.standardCost);
      if (update.markupTarget !== undefined) updateFields.markupTarget = String(update.markupTarget);
      if (update.marginFloor !== undefined) updateFields.marginFloor = String(update.marginFloor);

      await db
        .update(productsTable)
        .set(updateFields)
        .where(eq(productsTable.id, update.productId));

      results.push({ productId: update.productId, success: true });
    } catch (err: any) {
      results.push({ productId: update.productId, success: false, error: err.message });
    }
  }

  // Single audit log for the bulk operation
  await recordAudit(req, "bulk_update", "product", "bulk", {
    count: body.data.updates.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  }, body.data.reason);

  res.json({ results, total: body.data.updates.length, succeeded: results.filter((r) => r.success).length, failed: results.filter((r) => !r.success).length });
});

// GET /finance/reports/price-effectiveness
router.get("/finance/reports/price-effectiveness", async (req, res) => {
  try {
    const shippedOrders = await db
      .select()
      .from(salesOrdersTable)
      .where(sql`${salesOrdersTable.status} IN ('shipped', 'delivered')`);

    let totalRevenue = 0;
    let totalCogs = 0;
    const productRevenue = new Map<string, number>();

    for (const order of shippedOrders) {
      totalRevenue += parseFloat(order.totalRevenue ?? "0");
      totalCogs += parseFloat(order.totalCogs ?? "0");
      const lines = await db
        .select()
        .from(salesOrderLinesTable)
        .where(eq(salesOrderLinesTable.orderId, order.id));
      for (const l of lines) {
        const rev = l.qtyShipped * (l.unitPrice ? parseFloat(l.unitPrice) : 0);
        productRevenue.set(l.productId, (productRevenue.get(l.productId) ?? 0) + rev);
      }
    }

    const activeProducts = await db
      .select()
      .from(productsTable)
    .where(eq(productsTable.isActive, true));

    const totalProducts = activeProducts.length;
    const productsWithPrice = activeProducts.filter((p) => p.unitPrice && parseFloat(p.unitPrice) > 0).length;

    res.json({
      totalOrders: shippedOrders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCogs: Math.round(totalCogs * 100) / 100,
      grossMarginPct: totalRevenue > 0 ? Math.round(((totalRevenue - totalCogs) / totalRevenue) * 10000) / 100 : 0,
      totalProducts,
      productsWithPrice,
      priceCoveragePct: totalProducts > 0 ? Math.round((productsWithPrice / totalProducts) * 10000) / 100 : 0,
    });
  } catch (err: any) {
    console.error("Price effectiveness error:", err);
    res.status(500).json({ error: "Failed to load price effectiveness" });
  }
});

export { router as financeRouter };
