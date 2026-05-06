# Warehouse Management System QA Test Plan

## 1. Product Management Testing

### 1.1 Create Product Tests

**Test Case ID:** TC-PROD-001
**Title:** Create a new product with valid data
**Preconditions:** User is logged in and on the product creation page
**Test Steps:**
1. Navigate to the product management section
2. Click on "Create New Product" button
3. Fill in all required fields:
   - SKU Code: "TEST-SKU-001"
   - Name: "Test Product"
   - Category: "Electronics"
   - Barcode: "123456789012"
   - Unit of Measure: "each"
   - Unit Price: 25.99
   - Reorder Threshold: 10
4. Click "Save" button
**Expected Result:** Product is created successfully and appears in the product list
**Post-conditions:** New product is available in the system

**Test Case ID:** TC-PROD-002
**Title:** Create product with duplicate SKU
**Preconditions:** A product with SKU "TEST-SKU-001" already exists
**Test Steps:**
1. Navigate to the product creation page
2. Enter "TEST-SKU-001" in the SKU field
3. Fill in other required fields
4. Click "Save" button
**Expected Result:** Error message displayed indicating duplicate SKU

### 1.2 Product Search and Filter Tests

**Test Case ID:** TC-PROD-003
**Title:** Search products by name
**Preconditions:** Multiple products exist in the system
**Test Steps:**
1. Navigate to the products list page
2. Enter a product name in the search box
3. Click "Search" or press Enter
**Expected Result:** Display only products matching the search term

**Test Case ID:** TC-PROD-004
**Title:** Filter products by category
**Preconditions:** Products with different categories exist
**Test Steps:**
1. Navigate to the products list page
2. Select a category from the filter dropdown
**Expected Result:** Display only products in the selected category

## 2. Inventory Management Testing

### 2.1 Inventory Adjustment Tests

**Test Case ID:** TC-INV-001
**Title:** Adjust inventory quantity
**Preconditions:** Product and bin exist
**Test Steps:**
1. Navigate to inventory adjustment page
2. Select warehouse, zone, and bin
3. Select product
4. Enter adjustment reason
5. Enter new quantity
6. Click "Save" button
**Expected Result:** Inventory quantity updated and movement recorded

### 2.2 Stock Transfer Tests

**Test Case ID:** TC-INV-002
**Title:** Transfer stock between bins
**Preconditions:** Product exists in source bin with sufficient quantity
**Test Steps:**
1. Navigate to stock transfer page
2. Select source bin
3. Select product from available stock list
4. Enter quantity to transfer
5. Select destination bin
6. Click "Transfer" button
**Expected Result:** Stock transferred and movement recorded in audit trail

## 3. Purchase Order Testing

### 3.1 Create Purchase Order Tests

**Test Case ID:** TC-PO-001
**Title:** Create new purchase order
**Preconditions:** Supplier exists in system
**Test Steps:**
1. Navigate to Purchase Orders page
2. Click "New Purchase Order"
3. Select supplier
4. Add line items
5. Click "Save" button
**Expected Result:** New PO created with "Draft" status

### 3.2 Receive Goods Tests

**Test Case ID:** TC-PO-002
**Title:** Receive items against PO
**Preconditions:** PO exists with "Ordered" status
**Test Steps:**
1. Navigate to PO detail page
2. Click "Receive Stock" button
3. Follow 3-step receiving process
4. Assign items to bins
5. Click "Commit Receipt" button
**Expected Result:** PO status updated and inventory increased

## 4. Sales Order Testing

### 4.1 Create Sales Order Tests

**Test Case ID:** TC-SO-001
**Title:** Create new sales order
**Preconditions:** Products exist in inventory
**Test Steps:**
1. Navigate to Sales Orders page
2. Click "New Sales Order"
3. Fill in customer details
4. Add line items
5. Click "Save" button
**Expected Result:** New sales order created with "Draft" status

### 4.2 Picking Process Tests

**Test Case ID:** TC-SO-002
**Title:** Complete picking process
**Preconditions:** Sales order exists with "Confirmed" status
**Test Steps:**
1. Navigate to sales order detail page
2. Click "Start Picking" button
3. Follow picking workflow
4. Scan/confirm items
5. Click "Complete Picking" button
**Expected Result:** Picking task completed and status updated

## 5. Reporting Tests

### 5.1 Dashboard Tests

**Test Case ID:** TC-REP-001
**Title:** Verify dashboard KPI tiles
**Preconditions:** System has data
**Test Steps:**
1. Navigate to dashboard
2. Observe KPI tiles
**Expected Result:** KPI tiles display correct values for:
- Total stock value
- Total units
- Category count
- Low stock alerts

### 5.2 Export Tests

**Test Case ID:** TC-REP-002
**Title:** Export inventory to CSV
**Preconditions:** Inventory data exists
**Test Steps:**
1. Navigate to Reports page
2. Click "Export CSV" button
**Expected Result:** CSV file downloaded with correct inventory data

## 6. Scanning Tests

### 6.1 Scan Lookup Tests

**Test Case ID:** TC-SCAN-001
**Title:** Scan product barcode
**Preconditions:** Scanner is functional and product exists
**Test Steps:**
1. Navigate to Scan page
2. Scan product barcode
3. Observe results
**Expected Result:** Product details displayed

**Test Case ID:** TC-SCAN-002
**Title:** Scan PO number
**Preconditions:** PO exists in system
**Test Steps:**
1. Navigate to Scan page
2. Scan PO number
**Expected Result:** Redirect to PO detail page

## 7. Supplier Management Tests

### 7.1 Supplier CRUD Tests

**Test Case ID:** TC-SUP-001
**Title:** Create new supplier
**Preconditions:** User has admin access
**Test Steps:**
1. Navigate to Suppliers page
2. Click "New Supplier" button
3. Fill in supplier details
4. Click "Save" button
**Expected Result:** New supplier created and appears in suppliers list

## 8. Location Management Tests

### 8.1 Zone and Bin Management Tests

**Test Case ID:** TC-LOC-001
**Title:** Create new zone
**Preconditions:** Warehouse exists
**Test Steps:**
1. Navigate to Locations page
2. Expand warehouse in tree view
3. Click "Add Zone" button
4. Enter zone details
5. Click "Save" button
**Expected Result:** New zone created under warehouse

## 9. Authentication Tests

### 9.1 Login Tests

**Test Case ID:** TC-AUTH-001
**Title:** User login
**Preconditions:** Valid user credentials exist
**Test Steps:**
1. Navigate to login page
2. Enter valid credentials
3. Click "Sign In" button
**Expected Result:** User redirected to dashboard

### 9.2 Authorization Tests

**Test Case ID:** TC-AUTH-002
**Title:** Access restricted page without authorization
**Preconditions:** User logged in with operator role
**Test Steps:**
1. Navigate to admin-only page
**Expected Result:** Access denied message displayed

## 10. Integration Flow Tests

### 10.1 End-to-End Tests

**Test Case ID:** TC-E2E-001
**Title:** Complete procurement to sales flow
**Preconditions:** System has minimal data
**Test Steps:**
1. Create supplier
2. Create PO
3. Receive goods
4. Create sales order
5. Pick items
6. Pack and ship
**Expected Result:** All steps complete successfully with correct inventory adjustments

## 11. Negative Testing

### 11.1 Error Handling Tests

**Test Case ID:** TC-NEG-001
**Title:** Attempt to create product with invalid data
**Preconditions:** User on product creation page
**Test Steps:**
1. Navigate to product creation page
2. Enter invalid data (negative price, empty name, etc.)
3. Click "Save" button
**Expected Result:** Appropriate error messages displayed

### 11.2 Inventory Error Tests

**Test Case ID:** TC-NEG-002
**Title:** Attempt to transfer more stock than available
**Preconditions:** Product exists with limited quantity in source bin
**Test Steps:**
1. Navigate to stock transfer page
2. Attempt to transfer quantity greater than available
**Expected Result:** Error message displayed indicating insufficient stock

## 12. API Endpoint Testing

### 12.1 Products API Tests

**Test Case ID:** TC-API-001
**Title:** GET /api/products
**Preconditions:** Products exist in database
**Test Steps:**
1. Send GET request to /api/products
**Expected Result:** Returns list of products in JSON format

### 12.2 Inventory API Tests

**Test Case ID:** TC-API-002
**Title:** POST /api/inventory/adjustments
**Preconditions:** Valid product and bin exist
**Test Steps:**
1. Send POST request to /api/inventory/adjustments with adjustment data
**Expected Result:** Inventory updated and returns success response

## 13. UI/UX Testing

### 13.1 Form Validation Tests

**Test Case ID:** TC-UI-001
**Title:** Product creation form validation
**Preconditions:** User on product creation page
**Test Steps:**
1. Try to submit empty form
2. Try to submit form with invalid data
**Expected Result:** Appropriate validation messages displayed

### 13.2 Responsive Design Tests

**Test Case ID:** TC-UI-002
**Title:** UI elements responsive on different screen sizes
**Preconditions:** Application running
**Test Steps:**
1. Resize browser window
2. Observe layout changes
**Expected Result:** UI adapts to different screen sizes appropriately

## 14. Performance Testing

### 14.1 Load Testing

**Test Case ID:** TC-PERF-001
**Title:** Load products list with large dataset
**Preconditions:** Large dataset of products exists
**Test Steps:**
1. Navigate to products list
2. Measure page load time
**Expected Result:** Page loads within acceptable time limits

## 15. Security Testing

### 15.1 Authentication Testing

**Test Case ID:** TC-SEC-001
**Title:** Access protected resources without authentication
**Preconditions:** User not logged in
**Test Steps:**
1. Attempt to access protected API endpoints directly
**Expected Result:** Access denied with proper HTTP status code

This test plan covers the key functional areas of the Warehouse Management System and provides a comprehensive set of test cases for the QA phase.