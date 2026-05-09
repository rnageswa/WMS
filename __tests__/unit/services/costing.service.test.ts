import { describe, it, expect, vi } from 'vitest';
import {
  calculateNewAvgCost,
  calculateCOGS,
  recordValuation,
} from '../../../artifacts/api-server/src/services/costing.service';
import { db } from '@workspace/db';

// Mock the database
vi.mock('@workspace/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }
}));

describe('Costing Service', () => {
  describe('calculateNewAvgCost', () => {
    it('should calculate new MAC correctly with existing inventory', () => {
      // (oldQty * oldAvgCost + receivedQty * unitCost) / (oldQty + receivedQty)
      // (100 * 10.00 + 50 * 12.00) / 150 = (1000 + 600) / 150 = 1600/150 = 10.6667
      const result = calculateNewAvgCost(100, 10.00, 50, 12.00);
      expect(result).toBe(10.6667);
    });

    it('should return unit cost when no existing inventory', () => {
      const result = calculateNewAvgCost(0, null, 50, 15.00);
      expect(result).toBe(15.00);
    });

    it('should return 0 when total quantity is 0', () => {
      const result = calculateNewAvgCost(0, null, 0, 15.00);
      expect(result).toBe(0);
    });

    it('should handle null oldAvgCost as 0', () => {
      const result = calculateNewAvgCost(50, null, 50, 20.00);
      // (50 * 0 + 50 * 20) / 100 = 1000/100 = 10.0
      expect(result).toBe(10.0);
    });

    it('should round to 4 decimal places', () => {
      const result = calculateNewAvgCost(3, 1.3333, 2, 1.5555);
      // (3 * 1.3333 + 2 * 1.5555) / 5 = (3.9999 + 3.111) / 5 = 7.1109 / 5 = 1.4222
      expect(result).toBe(1.4222);
    });

    it('should calculate MAC for large quantities', () => {
      const result = calculateNewAvgCost(10000, 5.50, 5000, 6.00);
      // (10000 * 5.50 + 5000 * 6.00) / 15000 = (55000 + 30000) / 15000 = 85000/15000 = 5.6667
      expect(result).toBe(5.6667);
    });
  });

  describe('calculateCOGS', () => {
    it('should calculate COGS correctly with avg cost', () => {
      const result = calculateCOGS(10, 15.50);
      expect(result).toBe(155.00);
    });

    it('should return 0 when avg cost is null', () => {
      const result = calculateCOGS(10, null);
      expect(result).toBe(0);
    });

    it('should handle 0 quantity', () => {
      const result = calculateCOGS(0, 25.00);
      expect(result).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const result = calculateCOGS(3, 1.3333);
      // 3 * 1.3333 = 3.9999 → rounded to 4.00
      expect(result).toBe(4.00);
    });

    it('should handle large quantities', () => {
      const result = calculateCOGS(5000, 12.3456);
      // 5000 * 12.3456 = 61728
      expect(result).toBe(61728);
    });
  });

  describe('recordValuation', () => {
    it('should insert valuation log entry', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockValues = vi.fn().mockResolvedValueOnce([{ id: 'test-id' }]);

      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

      await recordValuation('product-id', 'movement-id', 10, 25.50);

      expect(db.insert).toHaveBeenCalled();
    });

    it('should handle negative quantity for outbound', async () => {
      const mockValues = vi.fn().mockResolvedValueOnce([{ id: 'test-id' }]);

      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

      await recordValuation('product-id', 'movement-id', -5, 20.00);

      expect(db.insert).toHaveBeenCalled();
    });
  });
});
