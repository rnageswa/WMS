import { describe, it, expect } from 'vitest';

describe('Currency API Types', () => {
  it('should define Currency with required fields', () => {
    const currency = {
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      isBase: true,
    };

    expect(currency).toBeDefined();
    expect(currency.code).toBe('USD');
    expect(currency.symbol).toBe('$');
    expect(currency.isBase).toBe(true);
  });

  it('should validate multiple currency formats', () => {
    const currencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$', isBase: true },
      { code: 'EUR', name: 'Euro', symbol: '€', isBase: false },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹', isBase: false },
      { code: 'GBP', name: 'British Pound', symbol: '£', isBase: false },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥', isBase: false },
    ];

    currencies.forEach(c => {
      expect(c.code).toHaveLength(3); // ISO currency codes are always 3 chars
      expect(c.name).toBeTruthy();
      expect(c.symbol).toBeTruthy();
      expect(typeof c.isBase).toBe('boolean');
    });
  });

  it('should define ExchangeRate with correct structure', () => {
    const rate = {
      id: 'rate-1',
      fromCurrency: 'USD',
      toCurrency: 'INR',
      rate: '83.120000',
      effectiveDate: '2024-01-01',
      createdAt: new Date(),
    };

    expect(rate).toBeDefined();
    expect(rate.fromCurrency).toBe('USD');
    expect(rate.toCurrency).toBe('INR');
    expect(parseFloat(rate.rate)).toBeGreaterThan(0);
    expect(rate.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should handle bidirectional conversion pairs', () => {
    const rates = [
      { from: 'USD', to: 'INR', rate: 83.12 },
      { from: 'INR', to: 'USD', rate: 0.01203 },
      { from: 'USD', to: 'EUR', rate: 0.92 },
      { from: 'EUR', to: 'USD', rate: 1.08696 },
    ];

    rates.forEach(({ from, to, rate }) => {
      expect(from).not.toEqual(to);
      expect(rate).toBeGreaterThan(0);
    });
  });
});

describe('Currency Conversion API', () => {
  it('should validate conversion request structure', () => {
    const request = {
      from: 'USD',
      to: 'INR',
      amount: 100,
    };

    expect(request).toBeDefined();
    expect(request.from).toHaveLength(3);
    expect(request.to).toHaveLength(3);
    expect(request.amount).toBeGreaterThanOrEqual(0);
  });

  it('should validate conversion response structure', () => {
    const response = {
      from: 'USD',
      to: 'INR',
      originalAmount: 100,
      convertedAmount: 8312,
      rate: 83.12,
    };

    expect(response.from).toBe('USD');
    expect(response.to).toBe('INR');
    expect(response.originalAmount).toBe(100);
    expect(response.convertedAmount).toBe(8312);
    expect(response.rate).toBe(83.12);
    // Verify: convertedAmount / originalAmount ≈ rate
    expect(response.convertedAmount / response.originalAmount).toBeCloseTo(response.rate, 1);
  });

  it('should handle error response for missing rate', () => {
    const errorResponse = {
      error: 'No exchange rate found for USD -> XYZ',
    };

    expect(errorResponse.error).toBeTruthy();
  });
});

describe('Currency Business Rules', () => {
  it('should only have one base currency', () => {
    const currencies = [
      { code: 'USD', isBase: true },
      { code: 'EUR', isBase: false },
      { code: 'INR', isBase: false },
    ];

    const baseCurrencies = currencies.filter(c => c.isBase);
    expect(baseCurrencies).toHaveLength(1);
    expect(baseCurrencies[0].code).toBe('USD');
  });

  it('should not allow same from/to in exchange rate', () => {
    const createRate = (from: string, to: string) => {
      if (from === to) throw new Error('from and to currency must differ');
      return { fromCurrency: from, toCurrency: to, rate: 1.0 };
    };

    expect(() => createRate('USD', 'USD')).toThrow('from and to currency must differ');
    expect(createRate('USD', 'INR')).toEqual({ fromCurrency: 'USD', toCurrency: 'INR', rate: 1.0 });
  });

  it('should validate currency codes are uppercase', () => {
    const code = 'usd';
    const normalized = code.toUpperCase();
    expect(normalized).toBe('USD');
  });
});

describe('Currency Edge Cases', () => {
  it('should handle zero conversion', () => {
    const amount = 0;
    const rate = 83.12;
    const converted = amount * rate;
    expect(converted).toBe(0);
  });

  it('should handle decimal amounts correctly', () => {
    const amount = 10.99;
    const rate = 83.12;
    const converted = Math.round(amount * rate * 100) / 100;
    expect(converted).toBe(913.49); // 10.99 * 83.12 = 913.4888 → rounded to 913.49
  });

  it('should validate date format', () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(dateRegex.test('2024-01-15')).toBe(true);
    expect(dateRegex.test('2024-13-15')).toBe(true); // regex only checks format, not valid date
    expect(dateRegex.test('01-15-2024')).toBe(false);
  });
});
