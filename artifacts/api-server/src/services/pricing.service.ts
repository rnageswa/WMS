import { db } from "@workspace/db";
import { priceListsTable, priceListItemsTable, pricingRulesTable, productsTable, inventoryItemsTable } from "@workspace/db/schema";
import { eq, and, sql, lte, gte, desc } from "drizzle-orm";

export interface DefaultPriceResult {
  unitPrice: number;
  currency: string;
  priceListId: string;
  priceListName: string;
}

/**
 * Get the default price for a product from the default price list.
 * Checks date validity (validFrom <= today, validTo >= today or null).
 * Returns null if no price found.
 */
export async function getDefaultPrice(productId: string): Promise<DefaultPriceResult | null> {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Find the default price list
  const [defaultList] = await db
    .select()
    .from(priceListsTable)
    .where(and(
      eq(priceListsTable.isDefault, true),
      eq(priceListsTable.isActive, true),
      lte(priceListsTable.validFrom, today),
      sql`(${priceListsTable.validTo} IS NULL OR ${priceListsTable.validTo} >= ${today})`
    ))
    .limit(1);

  if (!defaultList) return null;

  // Find the price list item for this product
  const [item] = await db
    .select()
    .from(priceListItemsTable)
    .where(and(
      eq(priceListItemsTable.priceListId, defaultList.id),
      eq(priceListItemsTable.productId, productId),
      lte(priceListItemsTable.validFrom, today),
      sql`(${priceListItemsTable.validTo} IS NULL OR ${priceListItemsTable.validTo} >= ${today})`
    ))
    .limit(1);

  if (!item) return null;

  return {
    unitPrice: parseFloat(item.unitPrice),
    currency: item.currency,
    priceListId: defaultList.id,
    priceListName: defaultList.name,
  };
}

// ── Pricing Rules Engine ───────────────────────────────────────────────────────

export interface PricingRuleInput {
  name: string;
  ruleType: "margin_floor" | "markup_target" | "competitive_match" | "volume_discount";
  scope?: "global" | "category" | "product";
  scopeId?: string;
  conditionJson?: Record<string, unknown>;
  actionJson: Record<string, unknown>;
  priority?: number;
  isActive?: boolean;
  validFrom?: string;
  validTo?: string;
}

export async function createPricingRule(input: PricingRuleInput) {
  const [rule] = await db
    .insert(pricingRulesTable)
    .values({
      name: input.name,
      ruleType: input.ruleType,
      scope: input.scope ?? "global",
      scopeId: input.scopeId ?? null,
      conditionJson: input.conditionJson ?? null,
      actionJson: input.actionJson,
      priority: input.priority ?? 0,
      validFrom: input.validFrom ?? null,
      validTo: input.validTo ?? null,
    })
    .returning();
  return rule;
}

export async function getActivePricingRules() {
  const today = new Date().toISOString().slice(0, 10);
  return db
    .select()
    .from(pricingRulesTable)
    .where(and(
      eq(pricingRulesTable.isActive, true),
      sql`(${pricingRulesTable.validFrom} IS NULL OR ${pricingRulesTable.validFrom} <= ${today})`,
      sql`(${pricingRulesTable.validTo} IS NULL OR ${pricingRulesTable.validTo} >= ${today})`
    ))
    .orderBy(desc(pricingRulesTable.priority));
}

export async function updatePricingRule(id: string, input: Partial<PricingRuleInput>) {
  const [updated] = await db
    .update(pricingRulesTable)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.ruleType !== undefined && { ruleType: input.ruleType }),
      ...(input.scope !== undefined && { scope: input.scope }),
      ...(input.scopeId !== undefined && { scopeId: input.scopeId }),
      ...(input.conditionJson !== undefined && { conditionJson: input.conditionJson }),
      ...(input.actionJson !== undefined && { actionJson: input.actionJson }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.validFrom !== undefined && { validFrom: input.validFrom }),
      ...(input.validTo !== undefined && { validTo: input.validTo }),
      updatedAt: new Date(),
    })
    .where(eq(pricingRulesTable.id, id))
    .returning();
  return updated;
}

export async function deletePricingRule(id: string) {
  await db.delete(pricingRulesTable).where(eq(pricingRulesTable.id, id));
}

// ── Pricing Simulator ──────────────────────────────────────────────────────────

export interface PricingSimulatorInput {
  productId: string;
  cost: number;
  proposedPrice?: number;
  quantity?: number;
}

export interface PricingSimulatorResult {
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

export async function simulatePricing(input: PricingSimulatorInput): Promise<PricingSimulatorResult | null> {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, input.productId))
    .limit(1);
  if (!product) return null;

  const currentPrice = product.unitPrice ? parseFloat(product.unitPrice) : null;
  const cost = input.cost;
  const proposedPrice = input.proposedPrice ?? currentPrice ?? 0;

  const currentMarginPct = currentPrice && currentPrice > 0
    ? Math.round(((currentPrice - cost) / currentPrice) * 10000) / 100
    : null;
  const proposedMarginPct = proposedPrice > 0
    ? Math.round(((proposedPrice - cost) / proposedPrice) * 10000) / 100
    : 0;
  const markupPct = cost > 0
    ? Math.round(((proposedPrice - cost) / cost) * 10000) / 100
    : 0;

  // Apply pricing rules
  const rules = await getActivePricingRules();
  const rulesApplied: { ruleName: string; ruleType: string; action: string }[] = [];
  const warnings: string[] = [];
  let adjustedPrice = proposedPrice;

  for (const rule of rules) {
    // Check scope match
    if (rule.scope === "product" && rule.scopeId !== input.productId) continue;
    if (rule.scope === "category" && rule.scopeId !== product.category) continue;

    const action = rule.actionJson as Record<string, unknown>;
    const actionType = action.type as string | undefined;
    const actionValue = Number(action.value ?? 0);

    if (rule.ruleType === "margin_floor" && actionType === "set_margin") {
      const minMargin = actionValue;
      if (proposedMarginPct < minMargin) {
        rulesApplied.push({ ruleName: rule.name, ruleType: rule.ruleType, action: `Min margin ${minMargin}%` });
        warnings.push(`Proposed margin ${proposedMarginPct.toFixed(1)}% is below floor of ${minMargin}%`);
        // Adjust price to meet floor: price = cost / (1 - margin/100)
        adjustedPrice = Math.max(adjustedPrice, Math.round(cost / (1 - minMargin / 100) * 100) / 100);
      }
    } else if (rule.ruleType === "markup_target" && actionType === "set_markup") {
      const targetMarkup = actionValue;
      const targetPrice = Math.round(cost * (1 + targetMarkup / 100) * 100) / 100;
      rulesApplied.push({ ruleName: rule.name, ruleType: rule.ruleType, action: `Target markup ${targetMarkup}%` });
      if (Math.abs(proposedPrice - targetPrice) > 0.01) {
        warnings.push(`Suggested price for ${targetMarkup}% markup: ${targetPrice}`);
      }
    } else if (rule.ruleType === "volume_discount" && actionType === "set_price" && input.quantity) {
      const condition = rule.conditionJson as Record<string, unknown> | null;
      const minQty = Number(condition?.minQty ?? 0);
      if (input.quantity >= minQty) {
        rulesApplied.push({ ruleName: rule.name, ruleType: rule.ruleType, action: `Volume price ${actionValue}` });
        adjustedPrice = actionValue;
      }
    }
  }

  // Product-level margin floor check
  if (product.marginFloor) {
    const floor = parseFloat(product.marginFloor);
    if (proposedMarginPct < floor) {
      warnings.push(`Product margin floor is ${floor}%. Current proposal: ${proposedMarginPct.toFixed(1)}%`);
    }
  }

  // Generate suggestions
  const suggestions: { label: string; price: number; marginPct: number }[] = [];
  if (cost > 0) {
    for (const pct of [15, 20, 25, 30, 40, 50]) {
      const price = Math.round(cost * (1 + pct / 100) * 100) / 100;
      const marginPct = Math.round(((price - cost) / price) * 10000) / 100;
      suggestions.push({ label: `${pct}% markup`, price, marginPct });
    }
  }

  return {
    productId: input.productId,
    skuCode: product.skuCode,
    name: product.name,
    currentCost: cost,
    currentPrice,
    proposedPrice: adjustedPrice,
    currentMarginPct,
    proposedMarginPct: adjustedPrice > 0 ? Math.round(((adjustedPrice - cost) / adjustedPrice) * 10000) / 100 : 0,
    markupPct: cost > 0 ? Math.round(((adjustedPrice - cost) / cost) * 10000) / 100 : 0,
    rulesApplied,
    warnings,
    suggestions,
  };
}

/**
 * Get price recommendation for a product based on rules.
 */
// ── Bulk Simulator ─────────────────────────────────────────────────────────

export interface BulkSimulatorInput {
  products: { productId: string; cost: number }[];
  proposedPrice?: number;
  markupPct?: number;
  quantity?: number;
}

export interface BulkSimulatorResult {
  results: PricingSimulatorResult[];
  summary: {
    totalProducts: number;
    avgCurrentMargin: number;
    avgProposedMargin: number;
    avgMarkup: number;
    belowFloorCount: number;
  };
}

export async function simulateBulkPricing(input: BulkSimulatorInput): Promise<BulkSimulatorResult> {
  const results: PricingSimulatorResult[] = [];
  for (const p of input.products) {
    const result = await simulatePricing({
      productId: p.productId,
      cost: p.cost,
      proposedPrice: input.markupPct !== undefined && input.markupPct !== null ? Math.round(p.cost * (1 + input.markupPct / 100) * 100) / 100 : input.proposedPrice,
      quantity: input.quantity,
    });
    if (result) results.push(result);
  }

  const avgCurrentMargin = results.length > 0 ? results.reduce((s, r) => s + (r.currentMarginPct ?? 0), 0) / results.length : 0;
  const avgProposedMargin = results.length > 0 ? results.reduce((s, r) => s + r.proposedMarginPct, 0) / results.length : 0;
  const avgMarkup = results.length > 0 ? results.reduce((s, r) => s + r.markupPct, 0) / results.length : 0;
  const belowFloorCount = results.filter((r) => r.warnings.some((w) => w.toLowerCase().includes("below floor"))).length;

  return {
    results,
    summary: {
      totalProducts: results.length,
      avgCurrentMargin: Math.round(avgCurrentMargin * 100) / 100,
      avgProposedMargin: Math.round(avgProposedMargin * 100) / 100,
      avgMarkup: Math.round(avgMarkup * 100) / 100,
      belowFloorCount,
    },
  };
}

// ── Test Pricing Rule ─────────────────────────────────────────────────────────

export interface TestRuleResult {
  ruleName: string;
  ruleType: string;
  affectedProducts: {
    productId: string;
    skuCode: string;
    name: string;
    currentPrice: number | null;
    currentMargin: number | null;
    recommendedPrice: number;
    recommendedMargin: number;
    impact: string;
  }[];
  totalAffected: number;
}

export async function testPricingRule(
  rule: { name: string; ruleType: string; scope?: string; scopeId?: string; actionJson: Record<string, unknown> },
  limitProducts: number = 10
): Promise<TestRuleResult> {
  // Find matching products based on scope
  let products = await db.select().from(productsTable).where(eq(productsTable.isActive, true)).limit(limitProducts);

  if (rule.scope === "category" && rule.scopeId) {
    products = products.filter((p) => p.category === rule.scopeId);
  } else if (rule.scope === "product" && rule.scopeId) {
    products = products.filter((p) => p.id === rule.scopeId);
  }

  const action = rule.actionJson;
  const actionValue = Number(action.value ?? 0);

  const affectedProducts: TestRuleResult["affectedProducts"] = [];
  for (const product of products) {
    const currentPrice = product.unitPrice ? parseFloat(product.unitPrice) : 0;
    const [inv] = await db
      .select({ avgCost: inventoryItemsTable.avgCost })
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.productId, product.id))
      .limit(1);
    const cost = inv?.avgCost ? parseFloat(inv.avgCost) : 0;
    const currentMargin = currentPrice > 0 ? ((currentPrice - cost) / currentPrice) * 100 : 0;

    let recommendedPrice = currentPrice;
    let recommendedMargin = currentMargin;
    let impact = "no change";

    if (rule.ruleType === "margin_floor") {
      const minMargin = actionValue;
      const neededPrice = cost > 0 ? Math.round(cost / (1 - minMargin / 100) * 100) / 100 : currentPrice;
      if (currentMargin < minMargin) {
        recommendedPrice = neededPrice;
        recommendedMargin = ((recommendedPrice - cost) / recommendedPrice) * 100;
        impact = `price increase of $${(recommendedPrice - currentPrice).toFixed(2)} needed`;
      } else {
        impact = "already meets floor";
      }
    } else if (rule.ruleType === "markup_target") {
      recommendedPrice = cost > 0 ? Math.round(cost * (1 + actionValue / 100) * 100) / 100 : currentPrice;
      recommendedMargin = recommendedPrice > 0 ? ((recommendedPrice - cost) / recommendedPrice) * 100 : 0;
      const change = recommendedPrice - currentPrice;
      impact = change > 0 ? `+$${change.toFixed(2)} increase` : change < 0 ? `-$${Math.abs(change).toFixed(2)} decrease` : "no change";
    }

    affectedProducts.push({
      productId: product.id,
      skuCode: product.skuCode,
      name: product.name,
      currentPrice: currentPrice > 0 ? currentPrice : null,
      currentMargin: Math.round(currentMargin * 100) / 100,
      recommendedPrice: Math.round(recommendedPrice * 100) / 100,
      recommendedMargin: Math.round(recommendedMargin * 100) / 100,
      impact,
    });
  }

  return {
    ruleName: rule.name,
    ruleType: rule.ruleType,
    affectedProducts,
    totalAffected: affectedProducts.length,
  };
}

// ── Save Simulation as Price List ─────────────────────────────────────────────

export async function saveSimulationAsPriceList(
  priceListId: string,
  prices: { productId: string; unitPrice: number }[]
): Promise<{ saved: number; failed: number }> {
  let saved = 0;
  let failed = 0;

  for (const p of prices) {
    try {
      // Upsert price list item
      const existing = await db
        .select()
        .from(priceListItemsTable)
        .where(and(eq(priceListItemsTable.priceListId, priceListId), eq(priceListItemsTable.productId, p.productId)))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(priceListItemsTable)
          .set({ unitPrice: String(p.unitPrice), updatedAt: new Date() })
          .where(eq(priceListItemsTable.id, existing[0].id));
      } else {
        const now = new Date().toISOString().slice(0, 10);
        await db.insert(priceListItemsTable).values({
          priceListId,
          productId: p.productId,
          unitPrice: String(p.unitPrice),
          validFrom: now,
        });
      }
      saved++;
    } catch {
      failed++;
    }
  }

  return { saved, failed };
}

export async function getPriceRecommendation(productId: string, cost: number): Promise<{ recommendedPrice: number; marginPct: number; markupPct: number } | null> {
  const result = await simulatePricing({ productId, cost });
  if (!result) return null;
  return {
    recommendedPrice: result.proposedPrice,
    marginPct: result.proposedMarginPct,
    markupPct: result.markupPct,
  };
}
