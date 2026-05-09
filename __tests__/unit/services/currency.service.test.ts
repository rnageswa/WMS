import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRate,
  convertCurrency,
} from '../../../artifacts/api-server/src/services/currency.service';
import { db } from '@workspace/db';

// Mock the database
vi.mock('@workspace/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  }
}));

describe('Currency Service', () => {
  const mockDb = db as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRate', () => {
    it('should return 1 for same currency conversion', async () => {
      const result = await getRate('USD', 'USD');
      expect(result).toBe(1);
    });

    it('should return exchange rate when found', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce([{ rate: '83.120000' }]);

      const result = await getRate('USD', 'INR');
      expect(result).toBe(83.12);
    });

    it('should return null when no rate found', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await getRate('USD', 'XYZ');
      expect(result).toBeNull();
    });

    it('should use provided date for historical rates', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce([{ rate: '82.500000' }]);

      const result = await getRate('USD', 'INR', '2025-01-01');
      expect(result).toBe(82.5);
    });
  });

  describe('convertCurrency', () => {
    it('should return same amount for same currency', async () => {
      const result = await convertCurrency(100, 'USD', 'USD');
      expect(result).toEqual({ convertedAmount: 100, rate: 1 });
    });

    it('should convert using exchange rate', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce([{ rate: '83.120000' }]);

      const result = await convertCurrency(100, 'USD', 'INR');
      expect(result.rate).toBe(83.12);
      expect(result.convertedAmount).toBe(8312);
    });

    it('should throw error when no rate exists', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(convertCurrency(100, 'USD', 'XYZ')).rejects.toThrow('No exchange rate found for USD -> XYZ');
    });

    it('should round to 2 decimal places', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce([{ rate: '83.123456' }]);

      const result = await convertCurrency(100, 'USD', 'INR');
      expect(result.convertedAmount).toBe(8312.35); // 100 * 83.123456 = 8312.3456 → rounded to 8312.35
    });
  });
});
