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