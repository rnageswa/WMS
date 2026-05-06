# Warehouse Management System Regression Test Suite

## Overview

This regression test suite is designed to ensure that all core functionalities of the Warehouse Management System continue to work correctly as new features are added. The suite covers all existing functionality and provides a foundation for future expansion.

## Test Suite Structure

The regression test suite is organized by functional modules, with each section containing test cases for both positive and negative scenarios.

## 1. Product Management Tests

### 1.1 Product CRUD Operations

**Test Case ID:** RT-PROD-001
**Title:** Create new product with valid data
**Steps:**
1. Navigate to product creation page
2. Enter valid product details (SKU, name, category, etc.)
3. Submit form
**Expected Result:** Product is created successfully and appears in product list

**Test Case ID:** RT-PROD-002
**Title:** Edit existing product
**Steps:**
1. Navigate to existing product detail page
2. Modify product information
3. Save changes
**Expected Result:** Product information is updated successfully

**Test Case ID:** RT-PROD-003
**Title:** Search products by name/category
**Steps:**
1. Navigate to products list
2. Enter search term in search box
3. Apply filters
**Expected Result:** Correct products are displayed based on search criteria

**Test Case ID:** RT-PROD-004
**Title:** Deactivate/activate product
**Steps:**
1. Select product from list
2. Toggle active status
**Expected Result:** Product status changes and is reflected in product listings

### 1.2 Product Validation Tests

**Test Case ID:** RT-PROD-005
**Title:** Attempt to create product with duplicate SKU
**Steps:**
1. Navigate to product creation page
2. Enter existing SKU code
3. Fill other required fields
4. Submit form
**Expected Result:** Error message displayed for duplicate SKU

**Test Case ID:** RT-PROD-006
**Title:** Attempt to create product with missing required fields
**Steps:**
1. Navigate to product creation page
2. Leave required fields empty
3. Submit form
**Expected Result:** Validation errors displayed for missing fields

## 2. Inventory Management Tests

### 2.1 Inventory Adjustment Tests

**Test Case ID:** RT-INV-001
**Title:** Adjust inventory quantity
**Steps:**
1. Navigate to inventory adjustment page
2. Select warehouse/zone/bin
3. Select product
4. Enter adjustment reason and quantity
5. Save adjustment
**Expected Result:** Inventory quantity updated and movement recorded in audit trail

**Test Case ID:** RT-INV-002
**Title:** Create inventory adjustment with negative quantity
**Steps:**
1. Navigate to inventory adjustment page
2. Enter negative quantity
3. Save adjustment
**Expected Result:** Inventory quantity decreases and movement recorded

### 2.2 Stock Transfer Tests

**Test Case ID:** RT-INV-003
**Title:** Transfer stock between bins
**Steps:**
1. Navigate to stock transfer page
2. Select source bin
3. Select product from available stock
4. Enter quantity to transfer
5. Select destination bin
6. Complete transfer
**Expected Result:** Stock transferred and two movements recorded (outbound from source, inbound to destination)

**Test Case ID:** RT-INV-004
**Title:** Attempt to transfer more stock than available
**Steps:**
1. Navigate to stock transfer page
2. Select source bin with limited stock
3. Enter quantity greater than available
4. Attempt transfer
**Expected Result:** Error message displayed for insufficient stock

### 2.3 Inventory Search and Filtering

**Test Case ID:** RT-INV-005
**Title:** Search inventory by product
**Steps:**
1. Navigate to inventory page
2. Enter product name in search
**Expected Result:** Inventory items for matching products displayed

**Test Case ID:** RT-INV-006
**Title:** Filter by low stock
**Steps:**
1. Navigate to inventory page
2. Toggle low stock filter
**Expected Result:** Only low stock items displayed

## 3. Purchase Order Tests

### 3.1 Purchase Order Lifecycle

**Test Case ID:** RT-PO-001
**Title:** Create new purchase order
**Steps:**
1. Navigate to Purchase Orders page
2. Click "New Purchase Order"
3. Select supplier
4. Add line items
5. Save PO
**Expected Result:** New PO created with "Draft" status

**Test Case ID:** RT-PO-002
**Title:** Update PO status to Ordered
**Steps:**
1. Navigate to PO detail page
2. Click "Mark as Ordered"
**Expected Result:** PO status updated to "Ordered"

**Test Case ID:** RT-PO-003
**Title:** Receive goods against PO
**Steps:**
1. Navigate to PO with "Ordered" status
2. Click "Receive Stock"
3. Follow 3-step receiving process
4. Assign items to bins
5. Click "Commit Receipt"
**Expected Result:** PO status updated and inventory increased

### 3.2 Purchase Order Validation

**Test Case ID:** RT-PO-004
**Title:** Attempt to create PO with invalid supplier
**Steps:**
1. Navigate to New PO page
2. Enter invalid supplier information
3. Attempt to save
**Expected Result:** Error message for invalid supplier

**Test Case ID:** RT-PO-005
**Title:** Attempt to receive more items than ordered
**Steps:**
1. Navigate to PO detail
2. Click "Receive Stock"
3. Attempt to receive more than ordered quantity
**Expected Result:** Error message for over-receipt prevention

## 4. Sales Order Tests

### 4.1 Sales Order Lifecycle

**Test Case ID:** RT-SO-001
**Title:** Create new sales order
**Steps:**
1. Navigate to Sales Orders page
2. Click "New Sales Order"
3. Fill customer details
4. Add line items
5. Save order
**Expected Result:** New sales order created with "Draft" status

**Test Case ID:** RT-SO-002
**Title:** Complete sales order picking
**Steps:**
1. Navigate to sales order
2. Click "Start Picking"
3. Complete picking workflow
4. Click "Complete Picking"
**Expected Result:** Picking task completed and status updated

**Test Case ID:** RT-SO-003
**Title:** Ship sales order
**Steps:**
1. Navigate to picked order
2. Click "Pack & Ship"
3. Enter tracking information
4. Confirm shipment
**Expected Result:** Order marked as shipped with tracking info

## 5. Supplier Management Tests

### 5.1 Supplier CRUD Operations

**Test Case ID:** RT-SUP-001
**Title:** Create new supplier
**Steps:**
1. Navigate to Suppliers page
2. Click "New Supplier"
3. Fill supplier details
4. Save supplier
**Expected Result:** New supplier appears in suppliers list

**Test Case ID:** RT-SUP-002
**Title:** Update supplier information
**Steps:**
1. Navigate to existing supplier
2. Click edit
3. Update details
4. Save changes
**Expected Result:** Supplier information updated successfully

### 5.2 Supplier Validation

**Test Case ID:** RT-SUP-003
**Title:** Attempt to create supplier with invalid email
**Steps:**
1. Navigate to New Supplier page
2. Enter invalid email format
3. Attempt to save
**Expected Result:** Error message for invalid email format

## 6. Location Management Tests

### 6.1 Zone and Bin Management

**Test Case ID:** RT-LOC-001
**Title:** Create new zone
**Steps:**
1. Navigate to Locations page
2. Expand warehouse in tree view
3. Click "Add Zone"
4. Enter zone details
5. Save zone
**Expected Result:** New zone created under warehouse

**Test Case ID:** RT-LOC-002
**Title:** Create new bin
**Steps:**
1. Navigate to zone
2. Click "Add Bin"
3. Enter bin details
4. Save bin
**Expected Result:** New bin created in zone

## 7. Reporting Tests

### 7.1 Dashboard Tests

**Test Case ID:** RT-REP-001
**Title:** Verify dashboard KPI tiles
**Steps:**
1. Navigate to dashboard
2. Verify KPI tiles display:
   - Total stock value
   - Total units
   - Category count
   - Low stock alerts
**Expected Result:** All KPI values are accurate and up to date

### 7.2 Export Tests

**Test Case ID:** RT-REP-002
**Title:** Export inventory to CSV
**Steps:**
1. Navigate to Reports page
2. Click "Export CSV"
**Expected Result:** CSV file downloaded with correct inventory data

## 8. Scanning Tests

### 8.1 Scan Lookup Tests

**Test Case ID:** RT-SCAN-001
**Title:** Scan product barcode
**Steps:**
1. Navigate to Scan page
2. Scan product barcode
**Expected Result:** Product details displayed

**Test Case ID:** RT-SCAN-002
**Title:** Scan PO number
**Steps:**
1. Navigate to Scan page
2. Scan PO number
**Expected Result:** Redirect to PO detail page

## 9. Authentication Tests

### 9.1 Login Tests

**Test Case ID:** RT-AUTH-001
**Title:** User login with valid credentials
**Steps:**
1. Navigate to login page
2. Enter valid credentials
3. Click "Sign In"
**Expected Result:** User redirected to dashboard

### 9.2 Authorization Tests

**Test Case ID:** RT-AUTH-002
**Title:** Access restricted page without admin authorization
**Steps:**
1. Login as operator user
2. Navigate to admin-only page
**Expected Result:** Access denied message displayed

## 10. API Tests

### 10.1 Products API

**Test Case ID:** RT-API-001
**Title:** GET /api/products returns list
**Steps:**
1. Send GET request to /api/products
**Expected Result:** Returns list of products in JSON format

### 10.2 Inventory API

**Test Case ID:** RT-API-002
**Title:** POST /api/inventory/adjustments
**Steps:**
1. Send POST request to /api/inventory/adjustments with adjustment data
**Expected Result:** Inventory updated and returns success response

## 11. Integration Flow Tests

### 11.1 End-to-End Procurement Workflow

**Test Case ID:** RT-E2E-001
**Title:** Complete procurement workflow
**Steps:**
1. Create supplier
2. Create PO
3. Receive goods
**Expected Result:** All steps complete successfully with correct inventory adjustments

### 11.2 End-to-End Sales Workflow

**Test Case ID:** RT-E2E-002
**Title:** Complete sales order workflow
**Steps:**
1. Create sales order
2. Complete picking process
3. Pack and ship order
**Expected Result:** All steps complete with correct inventory adjustments

## 12. Negative Tests

### 12.1 Form Validation Tests

**Test Case ID:** RT-NEG-001
**Title:** Product creation form validation
**Steps:**
1. Try to submit empty product form
2. Try to submit form with invalid data
**Expected Result:** Appropriate validation messages displayed

### 12.2 Inventory Error Tests

**Test Case ID:** RT-NEG-002
**Title:** Attempt to transfer more stock than available
**Steps:**
1. Try to transfer quantity greater than available
**Expected Result:** Error message displayed for insufficient stock

## 13. UI/UX Tests

### 13.1 Form Validation

**Test Case ID:** RT-UI-001
**Title:** Form validation across all modules
**Steps:**
1. Attempt to submit empty forms
2. Attempt submission with invalid data
**Expected Result:** Appropriate validation messages displayed

### 13.2 Responsive Design Tests

**Test Case ID:** RT-UI-002
**Title:** UI elements responsive on different screen sizes
**Steps:**
1. Resize browser window to different sizes
2. Observe layout changes
**Expected Result:** UI adapts to different screen sizes appropriately

## 14. Performance Tests

### 14.1 Load Testing

**Test Case ID:** RT-PERF-001
**Title:** Load products list with large dataset
**Steps:**
1. Navigate to products list
2. Measure page load time
**Expected Result:** Page loads within acceptable time limits

### 14.2 API Response Time

**Test Case ID:** RT-PERF-002
**Title:** API response time testing
**Steps:**
1. Send multiple API requests
2. Measure response times
**Expected Result:** API responses within acceptable time limits

## 15. Security Tests

### 15.1 Authentication Testing

**Test Case ID:** RT-SEC-001
**Title:** Access protected resources without authentication
**Steps:**
1. Attempt to access protected API endpoints directly
**Expected Result:** Access denied with proper HTTP status code

### 15.2 Authorization Testing

**Test Case ID:** RT-SEC-002
**Title:** Access admin functions with operator role
**Steps:**
1. Login with operator role
2. Attempt to access admin-only functions
**Expected Result:** Access denied to restricted functions

## Test Execution Guidelines

### Setup
1. Ensure application is running locally
2. Ensure test database has sample data
3. Have test user credentials ready

### Execution
1. Execute tests in numerical order as listed above
2. Document any failures with:
   - Test case ID
   - Steps to reproduce
   - Expected vs actual results
   - Screenshots if applicable
3. Run both positive and negative test cases
4. Validate all API endpoints
5. Test end-to-end workflows

### Reporting
1. Log all test results
2. Create bug reports for any failures
3. Verify fixes for identified issues
4. Re-run failed tests after fixes are implemented

This regression test suite provides comprehensive coverage of all existing Warehouse Management System functionality and serves as a foundation for future feature additions.