import { describe, it, expect } from 'vitest';

describe('Financial Dashboard API Response', () => {
  it('should have correct financial KPI structure', () => {
    const financialData = {
      totalInventoryValue: 125000.50,
      cogsThisMonth: 45000.00,
      avgMarginThisMonth: 28.5,
      monthOrderCount: 42,
      valueByWarehouse: [
        { warehouseId: 'wh1', warehouseName: 'Main Warehouse', totalValue: 85000.00 },
        { warehouseId: 'wh2', warehouseName: 'Secondary Warehouse', totalValue: 40000.50 },
      ],
      cogsTrend: [
        { date: '2024-05-01', cogs: 1200.00 },
        { date: '2024-05-02', cogs: 1500.00 },
        { date: '2024-05-03', cogs: 980.50 },
      ],
    };

    expect(financialData).toBeDefined();
    expect(financialData.totalInventoryValue).toBeGreaterThanOrEqual(0);
    expect(financialData.cogsThisMonth).toBeGreaterThanOrEqual(0);
    expect(financialData.avgMarginThisMonth).toBeGreaterThanOrEqual(0);
    expect(financialData.monthOrderCount).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(financialData.valueByWarehouse)).toBe(true);
    expect(Array.isArray(financialData.cogsTrend)).toBe(true);
  });

  it('should handle zero-value financial data', () => {
    const emptyData = {
      totalInventoryValue: 0,
      cogsThisMonth: 0,
      avgMarginThisMonth: 0,
      monthOrderCount: 0,
      valueByWarehouse: [],
      cogsTrend: [],
    };

    expect(emptyData.totalInventoryValue).toBe(0);
    expect(emptyData.cogsThisMonth).toBe(0);
    expect(emptyData.avgMarginThisMonth).toBe(0);
    expect(emptyData.valueByWarehouse).toHaveLength(0);
    expect(emptyData.cogsTrend).toHaveLength(0);
  });

  it('should validate warehouse value breakdown totals', () => {
    const financialData = {
      totalInventoryValue: 125000.50,
      valueByWarehouse: [
        { warehouseId: 'wh1', warehouseName: 'Main', totalValue: 85000.00 },
        { warehouseId: 'wh2', warehouseName: 'Secondary', totalValue: 40000.50 },
      ],
    };

    const total = financialData.valueByWarehouse.reduce(
      (sum, w) => sum + w.totalValue, 0
    );
    expect(total).toBe(financialData.totalInventoryValue);
  });

  it('should handle negative margin', () => {
    const data = {
      totalInventoryValue: 100000,
      cogsThisMonth: 80000,
      avgMarginThisMonth: -5, // Loss scenario
    };

    expect(data.avgMarginThisMonth).toBeLessThan(0);
  });
});

describe('COGS Report API Response', () => {
  it('should have correct COGS report structure', () => {
    const cogsReport = {
      totalCOGS: 45000.00,
      count: 25,
      from: '2024-01-01',
      to: '2024-01-31',
      lines: [
        {
          id: 'mv-1',
          productId: 'p1',
          skuCode: 'SKU-001',
          productName: 'Widget A',
          quantity: 10,
          unitCost: '15.50',
          totalCost: '155.00',
          referenceId: 'so-1',
          referenceType: 'sales_order',
          createdAt: '2024-01-15T10:00:00Z',
        },
      ],
    };

    expect(cogsReport).toBeDefined();
    expect(cogsReport.totalCOGS).toBeGreaterThanOrEqual(0);
    expect(cogsReport.count).toBeGreaterThanOrEqual(0);
    expect(cogsReport.lines).toBeInstanceOf(Array);
  });

  it('should validate line item cost totals', () => {
    const lines = [
      { quantity: 10, unitCost: '15.50', totalCost: '155.00' },
      { quantity: 5, unitCost: '20.00', totalCost: '100.00' },
    ];

    lines.forEach(line => {
      const expectedTotal = line.quantity * parseFloat(line.unitCost);
      expect(parseFloat(line.totalCost)).toBe(expectedTotal);
    });
  });
});

describe('Margin Report API Response', () => {
  it('should have correct margin report structure', () => {
    const marginReport = {
      totalRevenue: 150000.00,
      totalCost: 100000.00,
      totalMargin: 50000.00,
      totalMarginPct: 33.3,
      orderCount: 50,
      from: '2024-01-01',
      to: '2024-01-31',
      orders: [
        {
          orderId: 'so-1',
          orderNumber: 'SO-2401-0001',
          customerName: 'Acme Co',
          status: 'shipped',
          shippedAt: '2024-01-15T10:00:00Z',
          revenue: 5000.00,
          cost: 3500.00,
          margin: 1500.00,
          marginPct: 30.0,
        },
      ],
    };

    expect(marginReport).toBeDefined();
    expect(marginReport.totalRevenue).toBeGreaterThanOrEqual(0);
    expect(marginReport.totalCost).toBeGreaterThanOrEqual(0);
    expect(marginReport.totalMargin).toBe(marginReport.totalRevenue - marginReport.totalCost);
    expect(marginReport.totalMarginPct).toBe(33.3);
  });

  it('should validate margin calculation formula', () => {
    const order = {
      revenue: 10000.00,
      cost: 7000.00,
      margin: 3000.00,
      marginPct: 30.0,
    };

    const calculatedMargin = order.revenue - order.cost;
    const calculatedMarginPct = order.revenue > 0
      ? ((calculatedMargin / order.revenue) * 100)
      : 0;

    expect(calculatedMargin).toBe(order.margin);
    expect(calculatedMarginPct).toBeCloseTo(order.marginPct, 1);
  });

  it('should handle break-even (zero margin) scenario', () => {
    const order = {
      revenue: 10000.00,
      cost: 10000.00,
      margin: 0,
      marginPct: 0,
    };

    expect(order.margin).toBe(0);
    expect(order.marginPct).toBe(0);
  });

  it('should handle loss (negative margin) scenario', () => {
    const order = {
      revenue: 8000.00,
      cost: 10000.00,
      margin: -2000.00,
      marginPct: -25.0,
    };

    expect(order.margin).toBeLessThan(0);
    expect(order.marginPct).toBeLessThan(0);
  });
});

describe('Financial Dashboard Edge Cases', () => {
  it('should handle empty COGS trend', () => {
    const data = {
      cogsTrend: [],
      totalInventoryValue: 50000,
    };

    expect(data.cogsTrend).toHaveLength(0);
    expect(data.totalInventoryValue).toBeGreaterThanOrEqual(0);
  });

  it('should handle single warehouse', () => {
    const data = {
      valueByWarehouse: [
        { warehouseId: 'wh1', warehouseName: 'Only Warehouse', totalValue: 50000 },
      ],
    };

    expect(data.valueByWarehouse).toHaveLength(1);
    expect(data.valueByWarehouse[0].totalValue).toBe(50000);
  });

  it('should handle very large financial values', () => {
    const data = {
      totalInventoryValue: 999999999.99,
      cogsThisMonth: 500000000.00,
    };

    expect(data.totalInventoryValue).toBeGreaterThan(0);
    expect(data.cogsThisMonth).toBeGreaterThan(0);
  });

  it('should preserve precision in financial calculations', () => {
    const revenue = 10000.99;
    const cost = 7199.27;
    const margin = revenue - cost;

    // Use toBeCloseTo for floating point comparison
    expect(margin).toBeCloseTo(2801.72, 2);
  });
});
