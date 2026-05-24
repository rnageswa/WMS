import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@workspace/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    desc: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    sql: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn().mockReturnValue('eq'),
  and: vi.fn().mockReturnValue('and'),
  desc: vi.fn().mockReturnValue('desc'),
  lte: vi.fn().mockReturnValue('lte'),
  gte: vi.fn().mockReturnValue('gte'),
  sql: vi.fn().mockReturnValue('sql'),
}));

import {
  simulatePricing,
  simulateBulkPricing,
  testPricingRule,
  getPriceRecommendation,
  createPricingRule,
  getActivePricingRules,
  updatePricingRule,
  deletePricingRule,
  getDefaultPrice,
} from '../../../../artifacts/api-server/src/services/pricing.service';

import { db } from '@workspace/db';

const mockDb = db as any;

describe('Pricing Service — Sprint 7 Extensions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('simulatePricing', () => {
    it('should return null when product not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);
      const result = await simulatePricing({ productId: 'nonexistent', cost: 10 });
      expect(result).toBeNull();
    });

    it('should calculate correct margins for valid product', async () => {
      const mockProduct = { id: 'prod-1', skuCode: 'SKU-001', name: 'Test', unitPrice: '50', category: 'Electronics', isActive: true, marginFloor: null };
      mockDb.limit.mockResolvedValueOnce([mockProduct]);

      // getActivePricingRules returns empty
      mockDb.orderBy.mockReturnThis();
      const whereChain = { ...mockDb, orderBy: vi.fn().mockReturnThis() };
      // Let the mock handle the rules query
      mockDb.limit.mockResolvedValue([]);

      const result = await simulatePricing({ productId: 'prod-1', cost: 10, proposedPrice: 50 });
      expect(result).not.toBeNull();
      expect(result!.skuCode).toBe('SKU-001');
      expect(result!.currentCost).toBe(10);
      expect(result!.currentPrice).toBe(50);
      // 50% markup: (50-10)/10 = 400%, margin: (50-10)/50 = 80%
      expect(result!.markupPct).toBe(400);
      expect(result!.proposedMarginPct).toBe(80);
    });

    it('should generate markup suggestions', async () => {
      const mockProduct = { id: 'prod-1', skuCode: 'SKU-001', name: 'Test', unitPrice: null, category: 'Electronics', isActive: true, marginFloor: null };
      mockDb.limit.mockResolvedValueOnce([mockProduct]);
      mockDb.orderBy.mockReturnThis();

      const result = await simulatePricing({ productId: 'prod-1', cost: 20 });
      expect(result).not.toBeNull();
      expect(result!.suggestions.length).toBeGreaterThan(0);
      // Should include 15%, 20%, 25%, 30%, 40%, 50% markup suggestions
      expect(result!.suggestions.some(s => s.label.includes('15%'))).toBe(true);
      expect(result!.suggestions.some(s => s.label.includes('50%'))).toBe(true);
    });

    it('should warn when margin is below product floor', async () => {
      const mockProduct = { id: 'prod-1', skuCode: 'SKU-001', name: 'Test', unitPrice: '30', category: 'Electronics', isActive: true, marginFloor: '20' };
      mockDb.limit.mockResolvedValueOnce([mockProduct]);
      mockDb.orderBy.mockReturnThis();

      // Cost=25, Price=30 → margin = (30-25)/30 = 16.67% < 20% floor
      const result = await simulatePricing({ productId: 'prod-1', cost: 25, proposedPrice: 30 });
      expect(result).not.toBeNull();
      expect(result!.warnings.length).toBeGreaterThan(0);
      expect(result!.warnings.some(w => w.includes('margin floor'))).toBe(true);
    });
  });

  describe('simulateBulkPricing', () => {
    it('should simulate pricing for multiple products', async () => {
      mockDb.orderBy.mockReturnThis();

      const result = await simulateBulkPricing({
        products: [
          { productId: 'prod-1', cost: 10 },
          { productId: 'prod-2', cost: 20 },
        ],
        markupPct: 50,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      // At 50% markup on cost=10: price=15, margin=(15-10)/15=33.33%
      expect(result[0].proposedPrice).toBe(15);
      expect(result[0].marginPct).toBeCloseTo(33.33, 1);
    });

    it('should handle 0% markup edge case', async () => {
      const result = await simulateBulkPricing({
        products: [{ productId: 'prod-1', cost: 10 }],
        markupPct: 0,
      });

      expect(result.length).toBe(1);
      expect(result[0].proposedPrice).toBe(10); // No markup — cost price
      expect(result[0].markupPct).toBe(0);
    });

    it('should use uniform proposedPrice when provided', async () => {
      const result = await simulateBulkPricing({
        products: [
          { productId: 'prod-1', cost: 10 },
          { productId: 'prod-2', cost: 20 },
        ],
        proposedPrice: 30,
      });

      expect(result.length).toBe(2);
      expect(result[0].proposedPrice).toBe(30);
      expect(result[1].proposedPrice).toBe(30);
    });
  });

  describe('testPricingRule', () => {
    it('should return results with affected product count', async () => {
      const result = await testPricingRule({
        name: 'Test Rule',
        ruleType: 'margin_floor',
        actionJson: { type: 'set_margin', value: 20 },
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(typeof result.affectedProducts).toBe('number');
      expect(Array.isArray(result.sampleProducts)).toBe(true);
      expect(typeof result.warnings).toBe('number');
    });
  });

  describe('getPriceRecommendation', () => {
    it('should return null for nonexistent product', async () => {
      mockDb.limit.mockResolvedValueOnce([]);
      const result = await getPriceRecommendation('nonexistent', 10);
      expect(result).toBeNull();
    });
  });

  describe('pricingRules CRUD', () => {
    it('should create a pricing rule', async () => {
      mockDb.returning?.mockResolvedValueOnce([{
        id: 'rule-1', name: 'Test Rule', ruleType: 'margin_floor',
        scope: 'global', isActive: true, priority: 0,
        actionJson: { type: 'set_margin', value: 20 },
      }]);

      const result = await createPricingRule({
        name: 'Test Rule',
        ruleType: 'margin_floor',
        actionJson: { type: 'set_margin', value: 20 },
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Rule');
    });

    it('should update a pricing rule', async () => {
      mockDb.returning?.mockResolvedValueOnce([{
        id: 'rule-1', name: 'Updated', ruleType: 'markup_target',
        isActive: true, priority: 5,
        actionJson: { type: 'set_markup', value: 30 },
      }]);

      const result = await updatePricingRule('rule-1', { name: 'Updated', priority: 5 });
      expect(result).toBeDefined();
      expect(result.name).toBe('Updated');
    });

    it('should delete a pricing rule without error', async () => {
      await expect(deletePricingRule('rule-1')).resolves.toBeUndefined();
    });
  });

  describe('getDefaultPrice', () => {
    it('should return null when no default price list', async () => {
      mockDb.limit.mockResolvedValueOnce([]);
      const result = await getDefaultPrice('prod-1');
      expect(result).toBeNull();
    });
  });
});
