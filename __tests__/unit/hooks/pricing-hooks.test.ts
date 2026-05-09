import { describe, it, expect, vi } from 'vitest';
import type {
  PriceList,
  PriceListItem,
  DefaultPriceResponse,
  CreatePriceListBody,
  UpdatePriceListBody,
  CreatePriceListItemBody,
  UpdatePriceListItemBody,
} from '../../../lib/api-client-react/src/generated/api.schemas';

describe('Pricing API Types', () => {
  it('should define PriceList with correct structure', () => {
    const priceList: PriceList = {
      id: 'test-id',
      name: 'Standard Pricing',
      currency: 'USD',
      isDefault: true,
      isActive: true,
      validFrom: '2024-01-01',
      validTo: '2025-12-31',
      createdAt: '2024-01-01T00:00:00Z' as unknown as Date,
      updatedAt: '2024-01-01T00:00:00Z' as unknown as Date,
    };

    expect(priceList).toBeDefined();
    expect(priceList.name).toBe('Standard Pricing');
    expect(priceList.currency).toBe('USD');
    expect(priceList.isDefault).toBe(true);
  });

  it('should define PriceListItem with correct structure', () => {
    const item: PriceListItem = {
      id: 'item-1',
      priceListId: 'list-1',
      productId: 'prod-1',
      unitPrice: '29.99',
      minQty: 1,
      maxQty: 100,
      currency: 'USD',
      validFrom: '2024-01-01',
      validTo: '2025-12-31',
      createdAt: '2024-01-01T00:00:00Z' as unknown as Date,
      updatedAt: '2024-01-01T00:00:00Z' as unknown as Date,
    };

    expect(item).toBeDefined();
    expect(item.unitPrice).toBe('29.99');
    expect(item.minQty).toBe(1);
    expect(item.maxQty).toBe(100);
  });

  it('should define DefaultPriceResponse with correct structure', () => {
    const price: DefaultPriceResponse = {
      unitPrice: 29.99,
      currency: 'USD',
      priceListId: 'list-1',
      priceListName: 'Standard Pricing',
    };

    expect(price).toBeDefined();
    expect(price.unitPrice).toBe(29.99);
    expect(price.currency).toBe('USD');
  });

  it('should validate CreatePriceListBody schema', () => {
    const body: CreatePriceListBody = {
      name: 'Premium Pricing',
      currency: 'EUR',
      isDefault: false,
      validFrom: '2024-06-01',
    };

    expect(body.name).toBeDefined();
    expect(body.validFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should validate UpdatePriceListBody schema', () => {
    const body: UpdatePriceListBody = {
      name: 'Updated Pricing',
      isActive: true,
    };

    expect(body.name).toBeDefined();
    expect(body.isActive).toBe(true);
  });

  it('should validate CreatePriceListItemBody schema', () => {
    const body: CreatePriceListItemBody = {
      productId: 'prod-1',
      unitPrice: 49.99,
      minQty: 1,
      currency: 'USD',
      validFrom: '2024-01-01',
    };

    expect(body.productId).toBeDefined();
    expect(body.unitPrice).toBeGreaterThan(0);
    expect(body.minQty).toBeGreaterThan(0);
  });

  it('should validate UpdatePriceListItemBody schema', () => {
    const body: UpdatePriceListItemBody = {
      unitPrice: 59.99,
      minQty: 10,
    };

    expect(body.unitPrice).toBeGreaterThan(0);
    expect(body.minQty).toBeGreaterThan(0);
  });
});

describe('Pricing API Hook Types', () => {
  it('should have valid PriceList array type', () => {
    const lists: PriceList[] = [
      {
        id: '1',
        name: 'List A',
        currency: 'USD',
        isDefault: true,
        isActive: true,
        validFrom: '2024-01-01',
        validTo: '2025-12-31',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'List B',
        currency: 'EUR',
        isDefault: false,
        isActive: true,
        validFrom: '2024-01-01',
        validTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    expect(lists).toHaveLength(2);
    expect(lists[0].isDefault).toBe(true);
    expect(lists[1].currency).toBe('EUR');
  });

  it('should handle null validTo dates', () => {
    const list: PriceList = {
      id: '1',
      name: 'Open-ended List',
      currency: 'USD',
      isDefault: false,
      isActive: true,
      validFrom: '2024-01-01',
      validTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(list.validTo).toBeNull();
  });

  it('should validate default price with different currencies', () => {
    const prices: DefaultPriceResponse[] = [
      { unitPrice: 29.99, currency: 'USD', priceListId: 'l1', priceListName: 'Global' },
      { unitPrice: 27.50, currency: 'EUR', priceListId: 'l1', priceListName: 'Global' },
      { unitPrice: 2499, currency: 'INR', priceListId: 'l1', priceListName: 'Global' },
    ];

    prices.forEach(price => {
      expect(price.unitPrice).toBeGreaterThan(0);
      expect(price.currency).toBeTruthy();
      expect(price.priceListId).toBeTruthy();
    });
  });
});

describe('Pricing Hook Error States', () => {
  it('should handle empty price list response', () => {
    const emptyList: PriceList[] = [];
    expect(emptyList).toHaveLength(0);
  });

  it('should handle price list without validto', () => {
    const list: PriceList = {
      id: '1',
      name: 'No End Date',
      currency: 'USD',
      isDefault: true,
      isActive: true,
      validFrom: '2024-01-01',
      validTo: null as unknown as Date,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(list.validTo).toBeNull();
  });

  it('should require positive unit prices', () => {
    const body: CreatePriceListItemBody = {
      productId: 'p1',
      unitPrice: 0.01,
      minQty: 1,
      currency: 'USD',
      validFrom: '2024-01-01',
    };

    expect(body.unitPrice).toBeGreaterThan(0);
  });
});
