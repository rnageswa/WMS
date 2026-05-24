import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@workspace/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    desc: vi.fn().mockReturnThis(),
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
  sql: vi.fn().mockReturnValue('sql'),
}));

import {
  effectiveUnitCost,
  addLandedCosts,
  getLandedCosts,
  recordCostHistory,
  copyLandedCostsFromPO,
  calculateNewAvgCost,
  calculateCOGS,
  recordValuation,
  updateInventoryCostAfterReceipt,
  recordOutboundCost,
} from '../../../../artifacts/api-server/src/services/costing.service';

import { db } from '@workspace/db';

const mockDb = db as any;

describe('Costing Service — Sprint 7 Landed Cost & Cost History', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('effectiveUnitCost', () => {
    it('should return unitCost when qtyOrdered is 0', () => {
      const result = effectiveUnitCost(10.00, 50.00, 0);
      expect(result).toBe(10.00);
    });

    it('should add per-unit landed cost correctly', () => {
      // $500 total landed cost over 100 units = $5/unit
      // unitCost = $10 + $5 = $15
      const result = effectiveUnitCost(10.00, 500.00, 100);
      expect(result).toBe(15.00);
    });

    it('should handle zero landed cost', () => {
      const result = effectiveUnitCost(25.50, 0, 50);
      expect(result).toBe(25.50);
    });

    it('should round to 4 decimal places', () => {
      const result = effectiveUnitCost(10.3333, 1.00, 3);
      // 10.3333 + 0.3333 = 10.6666
      expect(result).toBe(10.6666);
    });

    it('should handle fractional unit landed costs', () => {
      // $75 landed over 100 units = $0.75/unit
      const result = effectiveUnitCost(12.50, 75.00, 100);
      expect(result).toBe(13.25);
    });

    it('should handle small fractional values', () => {
      // $0.01 landed over 1 unit = $0.01/unit
      const result = effectiveUnitCost(9.99, 0.01, 1);
      expect(result).toBe(10.00);
    });
  });

  describe('addLandedCosts', () => {
    it('should insert landed costs and allocate to lines', async () => {
      mockDb.returning?.mockResolvedValue([{ id: 'line-1', allocatedLandedCost: '0' }]);
      mockDb.limit.mockResolvedValueOnce([
        { id: 'line-1', poId: 'po-1', productId: 'prod-1', unitCost: '10', qtyOrdered: 100, allocatedLandedCost: '0' },
      ]);

      await expect(addLandedCosts('po-1', [
        { costType: 'freight', amount: 500 },
        { costType: 'insurance', amount: 100 },
      ])).resolves.toBeUndefined();
    });

    it('should not allocate when total is 0', async () => {
      await expect(addLandedCosts('po-1', [
        { costType: 'overhead', amount: 0 },
      ])).resolves.toBeUndefined();
    });
  });

  describe('getLandedCosts', () => {
    it('should return empty array when no costs', async () => {
      mockDb.limit.mockResolvedValue([]);
      const result = await getLandedCosts('po-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('recordCostHistory', () => {
    it('should insert cost history record', async () => {
      mockDb.returning?.mockResolvedValue([{ id: 'history-1' }]);

      await expect(recordCostHistory(
        'prod-1', 12.50, 100, 'receipt', 'po-1'
      )).resolves.toBeUndefined();
    });

    it('should accept optional standardCost', async () => {
      mockDb.returning?.mockResolvedValue([{ id: 'history-1' }]);

      await expect(recordCostHistory(
        'prod-1', 10.00, 50, 'manual', undefined, 15.00
      )).resolves.toBeUndefined();
    });
  });

  describe('copyLandedCostsFromPO', () => {
    it('should return 0 when source PO has no costs', async () => {
      mockDb.limit.mockResolvedValue([]);
      const result = await copyLandedCostsFromPO('source-po', 'target-po');
      expect(result).toBe(0);
    });
  });

  describe('calculateNewAvgCost (existing logic)', () => {
    it('should calculate MAC correctly', () => {
      const result = calculateNewAvgCost(100, 10.00, 50, 12.00);
      expect(result).toBe(10.6667);
    });

    it('should return unit cost when no existing inventory', () => {
      const result = calculateNewAvgCost(0, null, 50, 15.00);
      expect(result).toBe(15.00);
    });
  });

  describe('calculateCOGS', () => {
    it('should calculate COGS correctly', () => {
      const result = calculateCOGS(10, 15.50);
      expect(result).toBe(155.00);
    });

    it('should return 0 when avg cost is null', () => {
      const result = calculateCOGS(10, null);
      expect(result).toBe(0);
    });
  });

  describe('recordValuation', () => {
    it('should insert valuation log', async () => {
      mockDb.returning?.mockResolvedValue([{ id: 'val-1' }]);

      await expect(recordValuation('prod-1', null, 10, 25.50)).resolves.toBeUndefined();
    });
  });

  describe('recordOutboundCost', () => {
    it('should handle outbound cost recording', async () => {
      mockDb.limit.mockResolvedValue([]);
      mockDb.returning?.mockResolvedValue([{ id: 'mov-1' }]);

      const result = await recordOutboundCost('prod-1', 10, 'sales_order', 'so-1');
      expect(result).toBe(0); // No avg cost available
    });
  });
});
