// Test utilities for common testing patterns

export const mockProduct = {
  id: 'test-product-id',
  skuCode: 'TEST-001',
  name: 'Test Product',
  category: 'Electronics',
  unitOfMeasure: 'each',
  unitPrice: 25.99,
  reorderThreshold: 10,
  isActive: true
};

export const mockSupplier = {
  id: 'test-supplier-id',
  name: 'Test Supplier',
  contactName: 'John Supplier',
  email: 'john@supplier.com',
  phone: '555-1234',
  address: '123 Test St',
  leadTimeDays: 5,
  isActive: true
};

export const mockPurchaseOrder = {
  id: 'test-po-id',
  poNumber: 'PO-TEST-001',
  supplierName: 'Test Supplier',
  status: 'draft',
  notes: 'Test PO'
};

export const mockInventoryItem = {
  id: 'test-inventory-id',
  productId: 'test-product-id',
  binId: 'test-bin-id',
  qtyOnHand: 100
};

// Mock API responses
export const mockApiResponse = {
  success: true,
  data: {},
  message: 'Success'
};

// Common test data
export const testUsers = {
  admin: {
    id: 'admin-user-id',
    email: 'admin@test.com',
    role: 'admin'
  },
  operator: {
    id: 'operator-user-id',
    email: 'operator@test.com',
    role: 'operator'
  }
};

// Common test helpers
export const waitForElement = async (selector: string) => {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
      }
    }, 100);
  });
};

export const mockApiCall = <T>(data: T, delay = 0): Promise<T> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, delay);
  });
};