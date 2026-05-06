# Warehouse Management System Test Automation Framework

## Overview

This document outlines the test automation framework for the Warehouse Management System using:
- **Vitest/Jest** with **React Testing Library** for component/unit testing
- **Playwright** for end-to-end testing

## Project Structure for Test Automation

```
WMS/
├── __tests__/
│   ├── unit/
│   │   ├── components/
│   │   ├── api/
│   │   └── utils/
│   ├── integration/
│   └── e2e/
│       ├── flows/
│       ├── pages/
│       └── utils/
├── playwright.config.ts
└── vitest.config.ts
```

## 1. Component Testing with React Testing Library

### Test Setup

First, let's create the testing configuration files:

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    include: ['**/__tests__/unit/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

### Playwright Configuration

### playwright.config.ts
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## 2. Component Test Examples

### Product Form Component Test

```typescript
// __tests__/unit/components/ProductForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductForm } from '../../../src/components/products/ProductForm';
import { describe, it, expect, vi } from 'vitest';

// Mock the API client
vi.mock('../../../src/lib/api', () => ({
  api: {
    products: {
      create: vi.fn().mockResolvedValue({ id: 'test-id' }),
      update: vi.fn().mockResolvedValue({ success: true }),
    }
  }
}));

describe('ProductForm', () => {
  const mockOnSubmit = vi.fn();

  it('renders product form correctly', () => {
    render(<ProductForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByText('Create Product')).toBeInTheDocument();
    expect(screen.getByLabelText('SKU Code')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<ProductForm onSubmit={mockOnSubmit} />);
    
    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);
    
    expect(await screen.findByText('SKU Code is required')).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<ProductForm onSubmit={mockOnSubmit} />);
    
    await user.type(screen.getByLabelText('SKU Code'), 'TEST-SKU-001');
    await user.type(screen.getByLabelText('Name'), 'Test Product');
    await user.type(screen.getByLabelText('Category'), 'Electronics');
    
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    
    expect(mockOnSubmit).toHaveBeenCalled();
  });
});
```

### Inventory Adjustment Form Test

```typescript
// __tests__/unit/components/InventoryAdjustmentForm.test.tsx
import { render, screen } from '@testing-library/react';
import { InventoryAdjustmentForm } from '../../../src/components/inventory/InventoryAdjustmentForm';
import { describe, it } from 'vitest';

describe('InventoryAdjustmentForm', () => {
  it('renders inventory adjustment form', () => {
    render(<InventoryAdjustmentForm />);
    expect(screen.getByText('Adjust Inventory')).toBeInTheDocument();
  });
});
```

## 3. API Service Tests

```typescript
// __tests__/unit/api/products.test.ts
import { describe, it, expect } from 'vitest';
import { api } from '../../src/lib/api';

describe('Product API', () => {
  it('should create a product', async () => {
    const productData = {
      skuCode: 'TEST-001',
      name: 'Test Product',
      category: 'Electronics'
    };
    
    const result = await api.products.create(productData);
    expect(result).toHaveProperty('id');
    expect(result.skuCode).toBe('TEST-001');
  });
});
```

## 4. End-to-End Tests with Playwright

### Playwright Test Structure

```typescript
// __tests__/e2e/specs/product-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Product Management', () => {
  test('should create a new product', async ({ page }) => {
    await page.goto('/products');
    
    // Login
    await page.getByRole('link', { name: 'Products' }).click();
    await page.getByRole('button', { name: 'Create New Product' }).click();
    
    // Fill in form
    await page.getByLabel('SKU Code').fill('TEST-SKU-001');
    await page.getByLabel('Name').fill('Test Product');
    await page.getByLabel('Category').fill('Electronics');
    
    // Submit form
    await page.getByRole('button', { name: 'Save' }).click();
    
    // Verify product appears in list
    await expect(page.getByText('Test Product')).toBeVisible();
  });
  
  test('should display product in search results', async ({ page }) => {
    await page.goto('/products');
    await page.getByPlaceholder('Search products...').fill('Test');
    await expect(page.getByText('Test Product')).toBeVisible();
  });
});
```

### Authentication Tests

```typescript
// __tests__/e2e/specs/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should prevent access to protected pages without authentication', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*login/);
  });
});
```

## 5. Integration Test Examples

### Purchase Order Integration Tests

```typescript
// __tests__/integration/purchase-orders.test.ts
import { describe, it, expect } from 'vitest';

describe('Purchase Order Integration', () => {
  it('should create PO and receive goods', async () => {
    // Create supplier
    const supplier = await createSupplier({ name: 'Test Supplier' });
    expect(supplier).toHaveProperty('id');
    
    // Create PO
    const po = await createPurchaseOrder({
      supplierId: supplier.id,
      poNumber: 'PO-TEST-001'
    });
    
    // Receive goods
    const received = await receiveGoods(po.id, [
      { productId: 'test-product', quantity: 10 }
    ]);
    
    expect(received).toBeTruthy();
  });
});
```

## 6. Test Data Factories

```typescript
// __tests__/factories/product.ts
export const productFactory = {
  create: (overrides = {}) => ({
    skuCode: 'TEST-SKU-001',
    name: 'Test Product',
    category: 'Electronics',
    unitOfMeasure: 'each',
    unitPrice: 25.99,
    reorderThreshold: 10,
    isActive: true,
    ...overrides
  })
};

// __tests__/factories/supplier.ts
export const supplierFactory = {
  create: (overrides = {}) => ({
    name: 'Test Supplier',
    contactName: 'Test Contact',
    email: 'test@supplier.com',
    phone: '555-1234',
    address: '123 Test St',
    leadTimeDays: 5,
    isActive: true,
    ...overrides
  })
};
```

## 7. Test Commands

Add these scripts to package.json:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:e2e": "npx playwright test",
    "test:e2e:ui": "npx playwright test --headed",
    "test:coverage": "vitest run --coverage"
  }
}
```

## 8. Continuous Integration Configuration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:run
      - run: npx playwright install
      - run: npm run test:e2e
```

## 9. Test Environment Setup

### Environment Variables

Create a `.env.test` file:
```
NODE_ENV=test
DATABASE_URL=postgresql://localhost:5432/wms_test
API_BASE_URL=http://localhost:3000
```

## 10. Test Execution

### Component Tests
```bash
npm run test:run
```

### E2E Tests
```bash
npm run test:e2e
```

## 11. Test Reporting

The testing framework will generate reports in the following locations:
- Vitest/Jest: `coverage/` directory
- Playwright: `test-results/` and `playwright-report/` directories

## 12. Mock Data Generation

```typescript
// __tests__/utils/generate-test-data.ts
export const generateProductData = () => ({
  id: crypto.randomUUID(),
  skuCode: `TEST-${Math.random().toString(36).substring(0, 9)}`,
  name: 'Test Product',
  category: 'Electronics',
  unitOfMeasure: 'each',
  unitPrice: 25.99,
  reorderThreshold: 10,
  isActive: true
});

export const generateSupplierData = () => ({
  id: crypto.randomUUID(),
  name: 'Test Supplier',
  contactName: 'Test Contact',
  email: 'test@supplier.com',
  phone: '555-1234',
  address: '123 Test St',
  leadTimeDays: 5,
  isActive: true
});
```

This framework provides a comprehensive approach to automating all test cases for the Warehouse Management System using Vitest/Jest for component testing and Playwright for end-to-end flows. The structure supports both unit testing of individual components and full end-to-end testing of business workflows.