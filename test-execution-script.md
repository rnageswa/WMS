# Test Execution Script

This script outlines how to execute the various tests for the Warehouse Management System.

## Prerequisites

1. Ensure the application is running locally
2. Make sure you have valid test data in the database
3. Have credentials for a test user account ready

## Test Execution Steps

### 1. Product Management Tests

1.1. Create a new product
- Navigate to Products section
- Click "Create New Product"
- Fill in product details:
  - SKU Code: TEST-SKU-001
  - Name: Test Product
  - Category: Electronics
  - Barcode: 123456789012
  - Unit Price: 25.99
  - Reorder Threshold: 10
- Click "Save"

1.2. Search for products
- Navigate to Products list page
- Enter product name in search box
- Verify search results

### 2. Inventory Management Tests

2.1. Adjust inventory
- Navigate to Inventory section
- Select warehouse/zone/bin
- Select product
- Enter adjustment reason and quantity
- Click "Save"
- Verify inventory updated and movement recorded

2.2. Transfer stock
- Navigate to Stock Transfer
- Select source bin
- Select product
- Enter quantity
- Select destination bin
- Click "Transfer"
- Verify movement recorded

### 3. Purchase Order Tests

3.1. Create purchase order
- Navigate to Purchase Orders
- Click "New Purchase Order"
- Select supplier
- Add line items
- Click "Save"
- Verify PO created with "Draft" status

3.2. Receive goods
- Navigate to PO detail
- Click "Receive Stock"
- Follow 3-step process
- Assign to bins
- Click "Commit Receipt"
- Verify PO status updated

### 4. Sales Order Tests

4.1. Create sales order
- Navigate to Sales Orders
- Click "New Sales Order"
- Fill customer details
- Add line items
- Click "Save"
- Verify "Draft" status

4.2. Picking process
- Navigate to sales order
- Click "Start Picking"
- Complete picking workflow
- Click "Complete Picking"
- Verify status updated

### 5. Reporting Tests

5.1. Dashboard verification
- Navigate to dashboard
- Verify KPI tiles show correct values

5.2. Export reports
- Navigate to Reports
- Click "Export CSV"
- Verify CSV downloads correctly

### 6. Scanning Tests

6.1. Scan product barcode
- Navigate to Scan page
- Scan product barcode
- Verify product details displayed

6.2. Scan PO number
- Scan PO number
- Verify redirect to PO detail page

### 7. Supplier Management Tests

7.1. Create new supplier
- Navigate to Suppliers
- Click "New Supplier"
- Fill supplier details
- Click "Save"
- Verify supplier appears in list

### 8. Location Management Tests

8.1. Create zone
- Navigate to Locations
- Expand warehouse
- Click "Add Zone"
- Enter details
- Click "Save"
- Verify zone created

### 9. API Tests

9.1. Test products API
- GET /api/products
- Verify returns product list

9.2. Test inventory adjustments API
- POST /api/inventory/adjustments
- Verify inventory updated

### 10. Negative Tests

10.1. Try to create product with invalid data
- Try submitting empty form
- Try invalid data
- Verify error messages

10.2. Try to transfer more stock than available
- Try to transfer more than available quantity
- Verify error message

## Test Data Cleanup

After running tests, you may want to clean up test data from the database. Use the following commands:

```sql
-- Delete test products (if needed)
DELETE FROM products WHERE sku_code LIKE 'TEST-SKU-%';

-- Reset test data
DELETE FROM inventory_movements WHERE reference_id IN (
  SELECT id FROM purchase_orders WHERE po_number LIKE 'TEST%'
);
```

## Running the Tests

1. Start the application:
   ```bash
   pnpm run dev
   ```

2. Execute tests in the order listed above

3. For API testing, use curl or Postman to test endpoints directly:
   ```bash
   curl -X GET http://localhost:5173/api/products
   ```

4. Verify all functionality works as expected

## Expected Results

All tests should pass without errors. If any test fails, document the issue with:
- Test case ID
- Steps to reproduce
- Expected vs actual results
- Screenshots if applicable

This script provides a systematic approach to testing the Warehouse Management System functionality.