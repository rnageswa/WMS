import { describe, it, expect } from 'vitest';
import {
  calculateNewAvgCost,
  calculateCOGS,
} from '../../../artifacts/api-server/src/services/costing.service';

describe('Costing Service - COGS Integration Scenarios', () => {
  describe('Scenario 1: Receiving stock with no existing inventory', () => {
    it('should set avg cost to unit cost on first receipt', () => {
      const newAvgCost = calculateNewAvgCost(0, null, 100, 10.00);
      expect(newAvgCost).toBe(10.00);
    });
  });

  describe('Scenario 2: Receiving stock with different unit cost', () => {
    it('should blend average cost correctly', () => {
      // Existing: 100 @ $10.00
      // New: 50 @ $12.00
      // Expected: (100 * 10 + 50 * 12) / 150 = 10.6667
      const newAvgCost = calculateNewAvgCost(100, 10.00, 50, 12.00);
      expect(newAvgCost).toBe(10.6667);
    });

    it('should calculate COGS for outbound using new avg cost', () => {
      const cogs = calculateCOGS(10, 10.6667);
      expect(cogs).toBe(106.67);
    });
  });

  describe('Scenario 3: Zero quantity edge cases', () => {
    it('should return 0 when both old and received qty are 0', () => {
      const newAvgCost = calculateNewAvgCost(0, null, 0, 10.00);
      expect(newAvgCost).toBe(0);
    });

    it('should handle negative zero case gracefully', () => {
      // If oldAvgCost is null and receivedQty is 0, totalQty is 0
      const newAvgCost = calculateNewAvgCost(0, null, 0, 10.00);
      expect(newAvgCost).toBe(0);
    });
  });

  describe('Scenario 4: Precision test for financial accuracy', () => {
    it('should maintain 4 decimal precision in MAC calculation', () => {
      // 3 items @ $1.3333 + 2 items @ $1.5555 = 5 items expected at $1.4222
      const result = calculateNewAvgCost(3, 1.3333, 2, 1.5555);
      expect(result).toBe(1.4222);
    });

    it('should round COGS correctly for financial reporting', () => {
      // 1000 units @ $0.1234 each = $123.40
      const cogs = calculateCOGS(1000, 0.1234);
      expect(cogs).toBe(123.4);
    });
  });

  describe('Scenario 5: High-value transactions', () => {
    it('should handle large quantities without precision loss', () => {
      // 1,000,000 units @ $1000
      const cogs = calculateCOGS(1000000, 1000.00);
      expect(cogs).toBe(1000000000);
    });

    it('should handle fractional costs correctly', () => {
      // $99.99 per unit, very common in retail pricing
      const cogs = calculateCOGS(100, 99.99);
      expect(cogs).toBe(9999);
    });
  });
});

describe('Moving Average Cost Business Rules', () => {
  const testCases = [
    {
      desc: 'Initial receipt at $10.00 per unit',
      oldQty: 0,
      oldAvgCost: null as number | null,
      receivedQty: 100,
      unitCost: 10.00,
      expected: 10.00,
    },
    {
      desc: 'Second receipt with price increase to $12.00',
      oldQty: 100,
      oldAvgCost: 10.00,
      receivedQty: 50,
      unitCost: 12.00,
      expected: 10.6667,
    },
    {
      desc: 'Third receipt with price decrease to $9.00',
      oldQty: 150,
      oldAvgCost: 10.6667,
      receivedQty: 100,
      unitCost: 9.00,
      expected: 9.9667,
    },
    {
      desc: 'Large price adjustment (emergency procurement)',
      oldQty: 250,
      oldAvgCost: 9.9667,
      receivedQty: 50,
      unitCost: 20.00,
      expected: 11.6389,
    },
    {
      desc: 'Minimal receipt to test rounding',
      oldQty: 300,
      oldAvgCost: 11.6389,
      receivedQty: 1,
      unitCost: 15.00,
      expected: 11.6493,
    },
  ];

  testCases.forEach(({ desc, oldQty, oldAvgCost, receivedQty, unitCost, expected }) => {
    it(desc, () => {
      const result = calculateNewAvgCost(oldQty, oldAvgCost, receivedQty, unitCost);
      expect(result).toBe(expected);
    });
  });
});

describe('COGS Business Scenarios', () => {
  const cogsTestCases = [
    { qty: 100, avgCost: 10.00, expected: 1000.00 },
    { qty: 50, avgCost: 10.6667, expected: 533.34 },
    { qty: 25, avgCost: 9.50, expected: 237.50 },
    { qty: 1000, avgCost: 0.99, expected: 990.00 },
    { qty: 1, avgCost: 999.99, expected: 999.99 },
  ];

  cogsTestCases.forEach(({ qty, avgCost, expected }) => {
    it(`COGS for ${qty} units @ $${avgCost} = $${expected}`, () => {
      const result = calculateCOGS(qty, avgCost);
      expect(result).toBe(expected);
    });
  });
});
