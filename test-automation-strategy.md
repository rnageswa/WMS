# Warehouse Management System Test Automation Strategy

## Overview

This document outlines the test automation strategy for the Warehouse Management System using:
- **Vitest + React Testing Library** for 90% of test cases (Logic & Components)
- **Playwright** for 10% of test cases (Critical User Flows like Login or Checkout)

## Test Distribution Strategy

### 90% Coverage with Vitest + React Testing Library (Component & Unit Tests)

**Coverage Areas:**
1. All UI components
2. Business logic functions
3. Utility functions
4. API service functions
5. Form validation
6. Data transformation logic
7. State management
8. Helper functions
9. Utility functions

### 10% Coverage with Playwright (End-to-End Tests)

**Coverage Areas:**
1. Authentication flows (Login/Logout)
2. Critical user journeys
3. Cross-page navigation
4. External integrations
5. Complex workflows that require full browser testing

## 1. Component & Unit Test Structure (Vitest + React Testing Library)

### Project Structure

```
WMS/
├── __tests__/
│   ├── unit/
│   │   ├── components/
│   │   │   ├── products/
│   │   │   ├── inventory/
│   │   │   ├── purchasing/
│   │   │   ├── orders/
│   │   │   └── suppliers/
│   │   ├── services/
│   │   └── utils/
│   └── e2e/
│       └── critical-flows/
└── vitest.config.ts
```

## 2. Component Test Examples (90% Coverage)

### Product Form Component Test

```typescript
// __tests__/unit/components/products/ProductForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductForm } from '../../../src/components/products/ProductForm';
import { describe, it, expect, vi } from 'vitest';

// Mock API client
const mockCreateProduct = vi.fn();
const mockUpdateProduct = vi.fn();

vi.mock('../../../src/lib/api', () => ({
  api: {
    products: {
      create: mockCreateProduct,
      update: mockUpdateProduct
    }
  }
}));

describe('ProductForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders product creation form correctly', () => {
    render(<ProductForm mode="create" />);
    
    expect(screen.getByText('Create Product')).toBeInTheDocument();
    expect(screen.getByLabelText('SKU Code')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('validates required fields on submit', async () => {
    render(<ProductForm mode="create" />);
    
    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);
    
    expect(await screen.findByText('SKU Code is required')).toBeInTheDocument();
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
  });

  it('successfully submits valid product data', async () => {
    const mockOnSubmit = vi.fn();
    mockCreateProduct.mockResolvedValue({ id: 'test-id', success: true });
    
    render(<ProductForm mode="create" onSubmit={mockOnSubmit} />);
    
    // Simulate user input
    fireEvent.change(screen.getByLabelText('SKU Code'), {
      target: { value: 'TEST-SKU-001' }
    });
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Test Product' }
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'Electronics' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });
});
```

### Product List Component Test

```typescript
// __tests__/unit/components/products/ProductList.test.tsx
import { render, screen } from '@testing-library/react';
import { ProductList } from '../../../src/components/products/ProductList';
import { describe, it, expect, vi } from 'vitest';

// Mock the API hook
vi.mock('../../../src/hooks/useProducts', () => ({
  useProducts: vi.fn().mockReturnValue({
    data: [
      { id: '1', skuCode: 'TEST-001', name: 'Test Product 1', category: 'Electronics' },
      { id: '2', skuCode: 'TEST-002', name: 'Test Product 2', category: 'Hardware' }
    ],
    isLoading: false,
    error: null
  })
}));

describe('ProductList', () => {
  it('renders product list with items', () => {
    render(<ProductList />);
    
    expect(screen.getByText('Product List')).toBeInTheDocument();
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    expect(screen.getByText('Test Product 2')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    // Mock loading state
    vi.mock('../../../src/hooks/useProducts', () => ({
      useProducts: vi.fn().mockReturnValue({
        data: null,
        isLoading: true,
        error: null
      })
    }));
    
    render(<ProductList />);
    expect(screen.getByText('Loading products...')).toBeInTheDocument();
  });
});
```

### Inventory Adjustment Form Test

```typescript
// __tests__/unit/components/inventory/InventoryAdjustmentForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { InventoryAdjustmentForm } from '../../../src/components/inventory/InventoryAdjustmentForm';
import { describe, it, expect } from 'vitest';

describe('InventoryAdjustmentForm', () => {
  it('renders inventory adjustment form with all fields', () => {
    render(<InventoryAdjustmentForm />);
    
    expect(screen.getByText('Adjust Inventory')).toBeInTheDocument();
    expect(screen.getByLabelText('Product')).toBeInTheDocument();
    expect(screen.getByLabelText('Warehouse')).toBeInTheDocument();
    expect(screen.getByLabelText('Zone')).toBeInTheDocument();
    expect(screen.getByLabelText('Bin')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
    expect(screen.getByLabelText('Reason')).toBeInTheDocument();
  });
});
```

## 3. API Service Tests

```typescript
// __tests__/unit/services/api/products.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ProductService } from '../../../src/services/productService';

// Mock fetch
global.fetch = vi.fn();

describe('ProductService', () => {
  it('should fetch products successfully', async () => {
    // Mock API response
    (fetch as vi.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve([{ id: '1', name: 'Test Product' }])
    });
    
    const products = await ProductService.getProducts();
    expect(products).toEqual([{ id: '1', name: 'Test Product' }]);
  });

  it('should handle API errors gracefully', async () => {
    (fetch as vi.Mock).mockRejectedValue(new Error('Network Error'));
    
    await expect(ProductService.getProducts()).rejects.toThrow('Network Error');
  });
});
```

## 4. Utility Function Tests

```typescript
// __tests__/unit/utils/validation.test.ts
import { validateProductForm, validateEmail } from '../../../src/utils/validation';
import { describe, it, expect } from 'vitest';

describe('Validation Utilities', () => {
  it('should validate product form correctly', () => {
    const validData = {
      skuCode: 'TEST-001',
      name: 'Test Product',
      category: 'Electronics'
    };
    
    const result = validateProductForm(validData);
    expect(result.isValid).toBe(true);
  });

  it('should detect invalid product form data', () => {
    const invalidData = {
      skuCode: '', // Empty SKU
      name: '',
      category: 'Electronics'
    };
    
    const result = validateProductForm(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('SKU Code is required');
  });

  it('should validate email correctly', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

## 5. Critical User Flow Tests with Playwright (10% Coverage)

### Authentication Flow Tests

```typescript
// __tests__/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('user can login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText('Welcome')).toBeVisible();
  });

  test('shows error for invalid login', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByLabel('Email').fill('invalid@test.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});

test.describe('Navigation Flows', () => {
  test('user can navigate from dashboard to product management', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Navigate to products
    await page.getByRole('link', { name: 'Products' }).click();
    await expect(page).toHaveURL(/.*products/);
    
    // Create new product
    await page.getByRole('button', { name: 'Create New Product' }).click();
    await expect(page.getByText('Create Product')).toBeVisible();
  });
});
```

### Purchase Order End-to-End Flow

```typescript
// __tests__/e2e/purchase-order-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Purchase Order Flow', () => {
  test('end-to-end purchase order creation and receiving', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to Purchase Orders
    await page.click('[data-testid="purchase-orders-link"]');
    
    // Create new PO
    await page.click('[data-testid="create-po-button"]');
    await page.fill('[data-testid="supplier-name"]', 'Test Supplier');
    await page.fill('[data-testid="po-number"]', 'PO-TEST-001');
    await page.click('[data-testid="save-po-button"]');
    
    // Verify PO created
    await expect(page.getByText('PO-TEST-001')).toBeVisible();
    
    // Receive goods
    await page.click('[data-testid="receive-goods-button"]');
    await page.fill('[data-testid="quantity-input"]', '10');
    await page.click('[data-testid="commit-receipt-button"]');
    
    // Verify goods received
    await expect(page.getByText('Received: 10 items')).toBeVisible();
  });
});
```

## 6. Test Configuration

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
    }
  },
});
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

## 7. Test Execution Commands

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "npx playwright test",
    "test:e2e:ui": "npx playwright test --headed"
  }
}
```

## 8. Test Coverage Strategy

### 90% Component/Unit Tests (Vitest + React Testing Library)
- Product Management Components
- Inventory Management Components
- Purchase Order Components
- Supplier Management Components
- Dashboard Components
- Form Validation
- API Service Functions
- Utility Functions
- Data Transformation Logic

### 10% End-to-End Tests (Playwright)
- Authentication Flows
- Critical Business Workflows
- Cross-Page Navigation
- Complex User Journeys

## 9. Mock Data and Test Utilities

```typescript
// __tests__/factories/productFactory.ts
export const createProduct = (overrides = {}) => ({
  id: 'test-id-1',
  skuCode: 'TEST-SKU-001',
  name: 'Test Product',
  category: 'Electronics',
  unitOfMeasure: 'each',
  unitPrice: 25.99,
  reorderThreshold: 10,
  isActive: true,
  ...overrides
});

export const createSupplier = (overrides = {}) => ({
  id: 'supplier-1',
  name: 'Test Supplier',
  contactName: 'John Supplier',
  email: 'john@supplier.com',
  phone: '555-1234',
  address: '123 Test St',
  leadTimeDays: 5,
  isActive: true,
  ...overrides
});
```

## 10. Continuous Integration

This approach ensures that:
1. 90% of functionality is tested with fast, reliable component/unit tests
2. 10% of critical user flows are tested with full end-to-end tests
3. Fast feedback loop for development
4. Comprehensive coverage of business logic
5. Reliable and maintainable test suite

The strategy focuses on testing the logic and components where most issues typically occur, while using the more expensive end-to-end tests only for critical user flows that require full system validation.