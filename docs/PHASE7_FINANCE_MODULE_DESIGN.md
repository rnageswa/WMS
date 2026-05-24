# Phase 7: Finance Module - Full Screen Design & Sprint Planning

**Last Updated:** 2026-05-24
**Version:** Draft

---

## 1. Overview

Phase 7 completes the Finance Module UI by building all management screens to replace manual API interactions. The existing backend routes (Sprint 7) are complete; this phase focuses on user-facing screens.

### Screens to Build

| # | Screen | Route | Priority |
|---|--------|-------|----------|
| 1 | Landed Costs Manager | `/finance/landed-costs/:poId` | P1 |
| 2 | Product Costing List | `/finance/costing` | P1 |
| 3 | Product Costing Detail | `/finance/costing/:productId` | P1 |
| 4 | Pricing Rules Manager | `/finance/pricing/rules` | P1 |
| 5 | Pricing Simulator | `/finance/pricing/simulator` | P1 |
| 6 | Margin Alerts Center | `/finance/margin/alerts` | P2 |
| 7 | Finance Reports | `/finance/reports` (enhancement) | P2 |

---

## 2. Screen Designs

---

### Screen 1: Landed Costs Manager

**Route:** `/finance/landed-costs/:poId`
**Access:** Admin, Operator
**Purpose:** Manage landed costs (freight, insurance, duties, handling, overhead) for a purchase order

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ [← Back to PO]  Landed Costs: PO-2605-0001          [Print] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PO Summary Card (grayed background)                  │   │
│  │ Supplier: Acme Corp  |  Ordered: 2026-05-20           │   │
│  │ Total PO Value: $12,450.00  |  Status: Ordered       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ COST INPUT SECTION                                   │   │
│  │                                                       │   │
│  │  ┌──────────────┐  ┌──────────────┐                 │   │
│  │  │ Freight      │  │ Insurance    │                 │   │
│  │  │ $ [_____]    │  │ $ [_____]    │                 │   │
│  │  └──────────────┘  └──────────────┘                 │   │
│  │                                                       │   │
│  │  ┌──────────────┐  ┌──────────────┐                 │   │
│  │  │ Duties/Tariffs│  │ Handling     │                 │   │
│  │  │ $ [_____]    │  │ $ [_____]    │                 │   │
│  │  └──────────────┘  └──────────────┘                 │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │ Overhead Allocation Method: [Dropdown ▼]      │   │
│  │  │  ○ By Line Value  ○ By Line Quantity          │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │                                                       │   │
│  │  [ Recalculate ]  [ Save All Costs ]                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ COST ALLOCATION TABLE                                │   │
│  │                                                       │   │
│  │ Product          │ Qty  │ Unit Cost │ Landed Cost   │   │
│  │ ─────────────────────────────────────────────────────│   │
│  │ Widget A (SKU-001)│ 100  │ $10.00    │ $10.85       │   │
│  │ Widget B (SKU-002)│  50  │ $15.00    │ $16.27       │   │
│  │ Widget C (SKU-003)│ 200  │ $5.00     │ $5.43        │   │
│  │                                                       │   │
│  │ TOTAL           │ 350  │           │ $3,047.50    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SUMMARY                                              │   │
│  │  Product Cost Total:        $2,500.00                │   │
│  │  Landed Cost Total:         $3,047.50                │   │
│  │  Effective Unit Cost:      +$1.56 avg per unit      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Components
- **PO Summary Card:** Read-only info from PO (supplier, date, total value, status)
- **Cost Input Card:** 5 currency inputs (freight, insurance, duties, handling, overhead)
- **Allocation Method Toggle:** Radio group (by value / by quantity)
- **Cost Allocation Table:** Auto-calculated table with editable line items
- **Summary Card:** Totals with effective cost calculation

#### Data Requirements
- `GET /api/finance/landed-costs/:poId` - load existing costs
- `POST /api/finance/landed-costs/:poId` - save costs
- `GET /api/purchase-orders/:poId` - PO details

#### User Interactions
1. Enter costs in input fields
2. Select allocation method
3. Click "Recalculate" to preview allocation
4. Click "Save All Costs" to persist
5. Click "Print" for cost summary report

#### States
- **Empty:** All cost fields at $0.00
- **Loading:** Skeleton cards
- **Editing:** Input fields enabled, Save button active
- **Saved:** Toast notification, fields show saved values
- **Error:** Red border on invalid fields, error message

---

### Screen 2: Product Costing List

**Route:** `/finance/costing`
**Access:** Admin, Operator
**Purpose:** View and manage cost fields across all products

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Product Costing                              [+ Add Filter] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Products │  │ Avg MAC  │  │ Below    │  │ Avg      │   │
│  │   247    │  │  $12.45  │  │ Floor: 5 │  │ Markup:  │
│  │          │  │          │  │          │  │  23.4%   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Search: [________________]  Category: [All ▼]         │   │
│  │         [Export Excel]                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Product Name    │ SKU      │ Std Cost │ Target │Floor│   │
│  │ ─────────────────────────────────────────────────────│   │
│  │ Widget A        │ SKU-001  │ $10.00  │  25%  │ 10% │ •  │
│  │ Widget B        │ SKU-002  │ $15.00  │  20%  │  8% │ •  │
│  │ Gadget X        │ SKU-010  │ $45.00  │  30%  │ 15% │ •  │
│  │ ...             │          │         │       │     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Components
- **Summary Cards:** Total products, average MAC, products below floor, average markup
- **Search & Filter Bar:** Search by name/SKU, category filter dropdown
- **Data Table:** Sortable columns, row click navigates to detail
- **Warning Indicator:** Red dot if product below floor margin
- **Export Button:** Excel export of cost data

#### Data Requirements
- `GET /api/products` with cost fields (standardCost, markupTarget, marginFloor)
- Filter by category, search by name/SKU

#### User Interactions
1. Search/filter products
2. Click column header to sort
3. Click row to navigate to detail
4. Export to Excel

#### States
- **Empty:** "No products found" with icon
- **Loading:** Skeleton rows
- **Filtered:** Show filter badge, clear filter link

---

### Screen 3: Product Costing Detail

**Route:** `/finance/costing/:productId`
**Access:** Admin, Operator
**Purpose:** Manage individual product cost fields and view cost history

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ [← Back]  Costing: Widget A (SKU-001)              [Print] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────┐  ┌───────────────────────────┐ │
│  │ COST SETTINGS          │  │ COST HISTORY CHART        │ │
│  │                        │  │                           │ │
│  │ Standard Cost          │  │ [Line chart: MAC over    │ │
│  │ $ [__________]         │  │  time with cost points]   │ │
│  │                        │  │                           │ │
│  │ Markup Target %        │  │  ● $10.50 (May 20)        │ │
│  │ [__________]           │  │  ● $10.25 (May 15)        │ │
│  │                        │  │  ● $10.00 (May 10)        │ │
│  │ Margin Floor %         │  │                           │ │
│  │ [__________]           │  │  [Timeline: 30/60/90 days]│ │
│  │                        │  │                           │ │
│  │ Suggested Price        │  └───────────────────────────┘ │
│  │ $XX.XX (25% markup)    │                                │
│  │                        │                                │
│  │ [ Save Changes ]       │                                │
│  └───────────────────────┘                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ COST SNAPSHOTS TABLE                                 │   │
│  │ Date         │ MAC       │ Source    │ Change        │   │
│  │ ─────────────────────────────────────────────────────│   │
│  │ 2026-05-20   │ $10.50   │ PO-0001   │ +$0.50 (+5%)  │   │
│  │ 2026-05-15   │ $10.00   │ Adj.     │ -$0.25 (-2%)  │   │
│  │ 2026-05-10   │ $10.25   │ PO-0002   │ +$0.25 (+3%)  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PRICING RULES APPLICABLE                             │   │
│  │ ✓ Category Rule: Electronics (Margin Floor: 12%)    │   │
│  │ ✓ Product Rule: Widget A (Margin Floor: 10%)        │   │
│  │ ⚠ Highest priority rule applies: 10% floor         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Components
- **Cost Settings Card:** Editable fields for standard cost, markup target, margin floor
- **Suggested Price Display:** Auto-calculated based on markup
- **Cost History Chart:** Line chart showing MAC over time
- **Cost Snapshots Table:** Historical cost changes with source reference
- **Applicable Rules Card:** Shows which pricing rules affect this product

#### Data Requirements
- `GET /api/finance/costing/:productId` - cost data + history
- `PUT /api/finance/costing/:productId` - update cost fields
- `GET /api/finance/reports/cost-trend/:productId` - chart data
- `GET /api/finance/pricing/rules` - applicable rules

#### User Interactions
1. Edit cost fields
2. See suggested price auto-update
3. View cost history chart (toggle 30/60/90 days)
4. Save changes
5. Print cost report

---

### Screen 4: Pricing Rules Manager

**Route:** `/finance/pricing/rules`
**Access:** Admin only
**Purpose:** CRUD operations for pricing rules (global/category/product scope)

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Pricing Rules                            [+ New Rule]        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Scope Filter: [All ▼] [Active ▼] [Priority ▼]        │   │
│  │                                                       │   │
│  │ [Export Excel]                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Rule Name       │ Scope      │ Priority │ Margin │ Act │   │
│  │ ─────────────────────────────────────────────────────│   │
│  │ Global Retail   │ 🌐 Global  │   10    │  15%  │ ✓  │ •  │
│  │ Electronics MVP │ 📦 Category│   20    │  12%  │ ✓  │ •  │
│  │ Premium Product │ 📦 Category│   25    │  20%  │ ✓  │ •  │
│  │ Widget A Deal   │ 📋 Product │   30    │  10%  │ ✗  │ •  │
│  │ ...             │            │         │       │    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [PAGINATION: 1 2 3 ... 10]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Components
- **Header Bar:** Title + "New Rule" button (admin only)
- **Filter Bar:** Scope dropdown, active status, priority sort
- **Data Table:** Sortable, with action buttons per row
- **Active Badge:** Green checkmark if rule is active
- **Scope Icon:** Globe (global), Box (category), Tag (product)
- **Pagination:** Standard pagination controls

#### Data Requirements
- `GET /api/finance/pricing/rules` - list all rules
- `POST /api/finance/pricing/rules` - create rule
- `PUT /api/finance/pricing/rules/:id` - update rule
- `DELETE /api/finance/pricing/rules/:id` - delete rule

#### User Interactions
1. Filter by scope/status
2. Sort by priority
3. Click "New Rule" → modal form
4. Click row action → Edit/Delete/Duplicate
5. Toggle active status inline

#### States
- **Empty:** "No pricing rules yet" + CTA to create
- **Loading:** Skeleton rows
- **Modal Form:** Create/Edit rule with validation

---

### Screen 4b: Pricing Rules Form (Modal)

**Route:** `/finance/pricing/rules` (modal)
**Purpose:** Create or edit a pricing rule

#### Form Layout
```
┌─────────────────────────────────────────────┐
│ [X]  New Pricing Rule                       │
├─────────────────────────────────────────────┤
│                                             │
│  Rule Name: [____________________]          │
│                                             │
│  Scope:    ○ Global                         │
│            ○ Category  [Electronics ▼]      │
│            ○ Product   [Select Product ▼]   │
│                                             │
│  Priority: [___] (1 = highest)              │
│                                             │
│  ─── Pricing Constraints ───                │
│                                             │
│  Margin Floor %:    [________]               │
│  Markup Target %:  [________]               │
│                                             │
│  ─── Additional Options ───                  │
│                                             │
│  ☑ Competitive Match Enabled                │
│  ☑ Volume Discount Enabled                  │
│                                             │
│  Volume Tiers:                              │
│  ┌──────────────┬──────────────┐            │
│  │ Min Qty     │ Discount %   │            │
│  ├──────────────┼──────────────┤            │
│  │ 10          │ 5%          │            │
│  │ 50          │ 10%         │            │
│  │ 100         │ 15%         │            │
│  │ [+ Add Tier]                        │            │
│  └──────────────┴──────────────┘            │
│                                             │
│  ☑ Rule Active                              │
│                                             │
│           [Cancel]  [Save Rule]             │
│                                             │
└─────────────────────────────────────────────┘
```

#### Form Validation
- Rule name: required, max 100 chars
- Scope: required selection
- Priority: required, 1-100
- Margin floor: required, 0-100%
- Markup target: optional, 0-500%
- Volume tiers: qty > 0, discount 0-100%

---

### Screen 5: Pricing Simulator

**Route:** `/finance/pricing/simulator`
**Access:** Admin, Operator
**Purpose:** What-if calculator for pricing scenarios

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Pricing Simulator                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────┐  ┌───────────────────────────┐ │
│  │ INPUT                 │  │ SIMULATION RESULTS         │ │
│  │                       │  │                           │ │
│  │ Product:              │  │ ┌───────────────────────┐ │ │
│  │ [Widget A (SKU-001)▼]│  │ │ CURRENT vs PROPOSED  │ │ │
│  │                       │  │ │                       │ │ │
│  │ Cost Basis:           │  │ │ Current    Proposed   │ │ │
│  │ $10.00 (MAC)          │  │ │ Price: $12.50  $13.00 │ │ │
│  │                       │  │ │ Margin: 20%   23.1%   │ │ │
│  │ Proposed Price:       │  │ │ Markup: 25%   30%     │ │ │
│  │ $[________]           │  │ │                       │ │ │
│  │                       │  │ └───────────────────────┘ │ │
│  │ Quantity:             │  │                           │ │
│  │ [________]            │  │ ┌───────────────────────┐ │ │
│  │                       │  │ │ RULES APPLIED          │ │ │
│  │ [Simulate]            │  │ │ ✓ Global Retail (15%)  │ │ │
│  │                       │  │ │ ⚠ Below floor: -2%    │ │ │
│  │                       │  │ │ ⚠ Margin OK: 23.1%    │ │ │
│  │                       │  │ └───────────────────────┘ │ │
│  └───────────────────────┘  │                           │ │
│                              │ ┌───────────────────────┐ │ │
│  ┌───────────────────────┐  │ │ SUGGESTED PRICES      │ │ │
│  │ QUICK TIERS           │  │ │                       │ │ │
│  │                       │  │ │ 15% markup:  $11.50  │ │ │
│  │ [15%] [20%] [25%]     │  │ │ 20% markup:  $12.00  │ │ │
│  │ [30%] [40%] [50%]     │  │ │ 25% markup:  $12.50  │ │ │
│  │                       │  │ │ 30% markup:  $13.00  │ │ │
│  │ Click to simulate     │  │ │ 40% markup:  $14.00  │ │ │
│  │ at these markups       │  │ │ 50% markup:  $15.00  │ │ │
│  └───────────────────────┘  │ └───────────────────────┘ │ │
│                              └───────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Components
- **Input Card:** Product selector, cost basis display, price input, quantity
- **Quick Tier Buttons:** Pre-set markup percentages for quick simulation
- **Results Panel:**
  - Current vs Proposed comparison card
  - Rules Applied list with warnings
  - Suggested Prices grid at various markup tiers
- **Visual Indicators:** Green (good margin), Amber (near floor), Red (below floor)

#### Data Requirements
- `GET /api/products/:id` - product cost data
- `GET /api/finance/pricing/simulate` - simulation result
- `POST /api/finance/pricing/simulate` - run simulation
- `GET /api/finance/pricing/rules` - applicable rules

#### User Interactions
1. Select product from dropdown
2. Enter proposed price (or click quick tier)
3. Click "Simulate"
4. View comparison, warnings, suggestions
5. Reset to try another scenario

---

### Screen 6: Margin Alerts Center

**Route:** `/finance/margin/alerts`
**Access:** Admin, Operator
**Purpose:** View and acknowledge margin alerts

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Margin Alerts                    [Export] [Refresh]         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Active   │  │ Critical │  │ Warning  │  │ Info     │     │
│  │   12     │  │    3    │  │    7    │  │    2    │     │
│  │          │  │          │  │          │  │          │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Filter: [All Status ▼]  [All Severity ▼]  [All Type]│   │
│  │         [____________________] (search)              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Type        │ Severity │ Order/Product │ Margin │ Act │   │
│  │ ─────────────────────────────────────────────────────│   │
│  │ ⚠ negative │ 🔴 Crit  │ SO-2605-0003  │ -5.2%  │ ✓  │   │
│  │ ⚠ below_floor│ 🟡 Warn │ Widget A     │  8.1%  │ ✓  │   │
│  │ ⚡ price_anm │ ⚪ Info  │ SKU-010      │  2.3%  │ ✓  │   │
│  │ ⚠ negative │ 🔴 Crit  │ SO-2605-0001  │ -2.1%  │ ✓  │   │
│  │ ...         │         │              │        │    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [PAGINATION]                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Alert Type Icons
- **negative_margin:** ⚠ (negative percentage)
- **below_floor:** ⚠ (margin below floor)
- **price_anomaly:** ⚡ (lightning bolt)

#### Severity Colors
- **Critical:** Red badge (`bg-red-100 text-red-800`)
- **Warning:** Amber badge (`bg-amber-100 text-amber-800`)
- **Info:** Gray badge (`bg-gray-100 text-gray-800`)

#### Components
- **Summary Cards:** Counts by status and severity
- **Filter Bar:** Status, severity, type, search
- **Data Table:** Sortable, with acknowledge action
- **Acknowledge Button:** Marks alert as handled (triggers API call)

#### Data Requirements
- `GET /api/finance/margin/alerts` - list alerts
- `POST /api/finance/margin/alerts/:id/acknowledge` - acknowledge alert

#### User Interactions
1. Filter by status/severity/type
2. Search by order/product
3. Click "Acknowledge" to mark as handled
4. Export alerts to Excel
5. Refresh for latest alerts

---

### Screen 6b: Alert Detail (Expandable Row)

**Route:** `/finance/margin/alerts` (expanded row)
**Purpose:** View alert details without leaving page

#### Expanded Row Layout
```
│ ⚠ negative │ 🔴 Crit  │ SO-2605-0003  │ -5.2%  │ ✓  │
│ ─────────────────────────────────────────────────────────│
│  DETAILS                                                          │
│  Order: SO-2605-0003 (Customer: Acme Corp)                       │
│  Created: 2026-05-23 14:32                                       │
│  Products: Widget A ($8.50 cost, $8.00 sell = -5.9% margin)      │
│                                                               │
│  Actions Taken: None                                            │
│  [Acknowledge Alert]                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

### Screen 7: Finance Reports (Enhancement)

**Route:** `/finance/reports`
**Purpose:** Consolidated view of all finance reports

#### Tab Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Finance Reports                                               │
├─────────────────────────────────────────────────────────────┤
│  [Profitability] [Cost Trend] [Price Effectiveness]          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Profitability Tab ─────────────────────────────────────┐ │
│  │ [Profitability Analysis]                                 │ │
│  │                                                          │ │
│  │ Filters: [Category ▼] [Date Range ▼] [Export Excel]    │ │
│  │                                                          │ │
│  │ Product    │ Revenue │ COGS  │ Margin │ Margin % │ Class │ │
│  │ ─────────────────────────────────────────────────────────│ │
│  │ Widget A   │ $50,000 │$38,000│ $12,000│  24.0%  │  A    │ │
│  │ Gadget X   │ $30,000 │$24,000│  $6,000│  20.0%  │  B    │ │
│  │ ...        │         │       │        │         │       │ │
│  │                                                          │ │
│  │ [Summary] Total Revenue: $80,000 | Avg Margin: 22.5%   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Cost Trend Tab ────────────────────────────────────────┐ │
│  │ [MAC History Chart + Snapshots Table]                   │ │
│  │ Product: [Widget A ▼] | Period: [30 ▼] days            │ │
│  │                                                          │ │
│  │ [Line chart with cost snapshots]                        │ │
│  │                                                          │ │
│  │ Date       │ Cost    │ Source    │ Change               │ │
│  │ ─────────────────────────────────────────────────────────│ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Price Effectiveness Tab ─────────────────────────────┐ │
│  │ [Price List Coverage Metrics]                          │ │
│  │                                                          │ │
│  │ Total Products: 247 | With Price Lists: 198 | Gap: 49  │ │
│  │                                                          │ │
│  │ Product     │ SKU      │ Has List │ List Price │ Floor │ │
│  │ ─────────────────────────────────────────────────────────│ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Components
- **Tab Navigation:** 3 tabs (Profitability, Cost Trend, Price Effectiveness)
- **Filters:** Category, date range, product selector per tab
- **Charts:** Bar/Line charts using CSS/DIV (existing pattern)
- **Export Button:** Excel export per tab

#### Data Requirements
- `GET /api/finance/reports/profitability`
- `GET /api/finance/reports/cost-trend/:productId`
- `GET /api/finance/reports/price-effectiveness`

---

## 3. Component Library

### New Components to Create

| Component | Purpose |
|-----------|---------|
| `finance/costing-table.tsx` | Reusable cost data table |
| `finance/cost-input-card.tsx` | Card with currency inputs for landed costs |
| `finance/allocation-table.tsx` | Cost allocation breakdown table |
| `finance/pricing-rule-form.tsx` | Modal form for create/edit rules |
| `finance/pricing-rule-table.tsx` | Table with scope icons, priority badges |
| `finance/simulator-input.tsx` | Product selector + price input |
| `finance/simulator-results.tsx` | Comparison card + suggestions grid |
| `finance/margin-alert-row.tsx` | Alert row with severity icons |
| `finance/alert-summary-cards.tsx` | Summary count cards |
| `finance/cost-history-chart.tsx` | CSS-based line chart |
| `shared/currency-input.tsx` | Currency-formatted number input |
| `shared/percent-input.tsx` | Percentage input with % suffix |

---

## 4. Sprint Planning

### Sprint 1: Costing & Landed Costs
**Duration:** 5 days
**Goal:** Complete costing screens and landed costs manager

| Task | Type | Effort | Dependencies |
|------|------|--------|--------------|
| Product Costing List page (`/finance/costing`) | New | 2 days | Backend API ready |
| Product Costing Detail page (`/finance/costing/:id`) | New | 2 days | List page done |
| Landed Costs Manager (`/finance/landed-costs/:poId`) | New | 2 days | PO detail page reference |
| Shared: Currency input, percent input components | New | 0.5 day | Reusable |
| Cost history chart component | New | 0.5 day | Mock data first |
| Integration with backend APIs | Testing | 1 day | Backend complete |
| Help text for all screens | Docs | 0.5 day | Screens done |

**Deliverables:** Screens 1, 2, 3 + shared components

---

### Sprint 2: Pricing Rules & Simulator
**Duration:** 4 days
**Goal:** Complete pricing rules manager and simulator

| Task | Type | Effort | Dependencies |
|------|------|--------|--------------|
| Pricing Rules List page (`/finance/pricing/rules`) | New | 1.5 days | Backend API ready |
| Pricing Rule Form modal (create/edit) | New | 1 day | List page done |
| Pricing Rules delete + duplicate | Feature | 0.5 day | Form done |
| Pricing Simulator page (`/finance/pricing/simulator`) | New | 2 days | Rules API done |
| Quick tier buttons component | New | 0.5 day | Simulator page |
| Help text | Docs | 0.5 day | Screens done |

**Deliverables:** Screens 4, 4b, 5 + components

---

### Sprint 3: Margin Alerts & Reports Enhancement
**Duration:** 4 days
**Goal:** Complete margin alerts and enhance finance reports

| Task | Type | Effort | Dependencies |
|------|------|--------|--------------|
| Margin Alerts Center (`/finance/margin/alerts`) | New | 1.5 days | Backend API ready |
| Alert acknowledge functionality | Feature | 0.5 day | Alerts page done |
| Alert detail expandable row | Feature | 0.5 day | Alerts page done |
| Finance Reports tabs enhancement | Enhancement | 1 day | Existing reports page |
| Cost Trend chart on reports | Enhancement | 0.5 day | Chart component |
| Export functionality for all finance pages | Feature | 1 day | Per-screen |
| Help text | Docs | 0.5 day | Screens done |

**Deliverables:** Screens 6, 6b, 7 (enhanced) + export

---

### Sprint 4: Integration, Polish & Documentation
**Duration:** 3 days
**Goal:** Final integration, cross-page testing, documentation

| Task | Type | Effort | Dependencies |
|------|------|--------|--------------|
| Cross-page integration testing | Testing | 1 day | All screens done |
| Sidebar navigation for finance module | Enhancement | 0.5 day | Screens done |
| Finance dashboard quick links | Enhancement | 0.5 day | Finance module |
| Offline mode support for finance pages | Feature | 1 day | Offline framework exists |
| Final polish + responsive design | Polish | 0.5 day | All pages |
| Update APPLICATION_CONTEXT.md | Docs | 0.5 day | Phase complete |

**Deliverables:** Phase 7 complete

---

## 5. Sprint Summary

| Sprint | Duration | Deliverables |
|--------|----------|--------------|
| Sprint 1 | 5 days | Costing List, Costing Detail, Landed Costs Manager |
| Sprint 2 | 4 days | Pricing Rules (list + form), Pricing Simulator |
| Sprint 3 | 4 days | Margin Alerts Center, Finance Reports Enhancement |
| Sprint 4 | 3 days | Integration, Polish, Documentation |
| **Total** | **16 days** | **Phase 7 Complete** |

---

## 6. Technical Notes

### API Integration
- All screens use existing backend from Sprint 7
- Use `useBaseCurrency()` hook for all currency formatting
- Standard error handling with toast notifications
- Loading skeletons on all data-fetching screens

### Routing Structure
```
/finance                    → Finance Dashboard (existing)
/finance/costing            → Product Costing List (NEW)
/finance/costing/:productId → Product Costing Detail (NEW)
/finance/landed-costs/:poId → Landed Costs Manager (NEW)
/finance/pricing/rules      → Pricing Rules Manager (NEW)
/finance/pricing/simulator → Pricing Simulator (NEW)
/finance/margin/alerts     → Margin Alerts Center (NEW)
/finance/reports            → Finance Reports (enhanced)
```

### Naming Conventions
- All finance components in `artifacts/wms-app/src/pages/finance-*`
- Reusable finance components in `artifacts/wms-app/src/components/finance/`
- Consistent use of orange accent `#E8622A` for CTAs
- Finance-specific badges: green (healthy margin), amber (warning), red (critical)

### Dependencies
- Phase 5: Costing service, pricing service (existing)
- Phase 5: Currency service, margin service (existing)
- Sprint 7: Finance backend routes (existing)
- Sprint 6: Offline mode framework (existing)

---

## 7. Review Recommendations

The following enhancements were identified during design review. All items have been incorporated into the design and sprint planning below.

---

### R1: Audit Trail & Change History

**Problem:** No visibility into who changed costs/prices and why.

**Solution:** Add an Audit Log section to Product Costing Detail and Pricing Rules pages:

- On cost field save → record: `{timestamp, userId, productId, field, oldValue, newValue, reason}`
- Display in a collapsible "Change History" card below the main form
- Include a mandatory "Reason for change" text field when editing cost/price
- Add "Export Audit Log" button for compliance

**Implementation:**
- New table: `finance_audit_log` (id, userId, action, objectType, objectId, changes JSONB, timestamp, ipAddress)
- API: `GET /api/finance/audit?objectType=product&objectId=:id`

**Added to:**
- Screen 3 (Product Costing Detail) - Change History card below main form
- Screen 4b (Pricing Rules Form) - mandatory "Reason" textarea before save

---

### R2: Enhanced Margin Alert Detail

**Problem:** Current alert design shows basic details only.

**Enhancement:** Expand Screen 6b (Alert Detail) with:

- Order line items (show which product(s) caused the alert)
- Root cause analysis: "Margin -5.2% because: price $10.00 < standardCost $10.50 (floor 10%)"
- Quick action buttons:
  - "Edit order prices" → navigates to order detail with lines in edit mode
  - "Request price increase" → creates a pricing rule task for the product
- Related alerts link: "3 other orders with same product have same issue"

---

### R3: Bulk Operations on Costing List

**Problem:** Only row-by-row edits supported on Product Costing List.

**Solution (Screen 2 Enhancement):**

- Checkbox column for bulk selection
- Floating action bar (bottom) when items selected:
  - "Update selected" → modal to set new standardCost, markupTarget, or marginFloor for all selected
  - "Apply price list" → assign selected to a price list
- Quick filter: "Below Floor" button (red) to instantly show products needing attention
- API: `POST /api/finance/costing/bulk-update` with array of productIds and fields to update

---

### R4: Pricing Rules — Preview Impact Before Activation

**Problem:** Admins may create rules with unintended consequences.

**Solution (Screen 4b Enhancement):**

When creating/editing a rule, show impact preview section:

```
┌─────────────────────────────────────────────────┐
│ IMPACT PREVIEW                                   │
│                                                  │
│  This rule will affect: 142 products            │
│  Category: Electronics                           │
│                                                  │
│  Estimated avg margin change: +2.3%             │
│                                                  │
│  ⚠ Products that will violate constraints: 3  │
│    [Show list ↓]                                │
│                                                  │
│  TOP 5 AFFECTED PRODUCTS:                        │
│  Product       │ Current  │ New    │ Margin Δ   │
│  ──────────────────────────────────────────────│
│  Widget A      │ $12.50   │ $13.00 │ +4.0%      │
│  Gadget X      │ $45.00   │ $48.00 │ +6.7%      │
│  ...           │          │        │            │
└─────────────────────────────────────────────────┘
```

- Backend: `POST /api/finance/pricing/rules/preview` with rule payload, returns affected product count and sample
- Must show preview before rule can be saved
- Blocks save if >10 products violate constraints (requires confirmation)

---

### R5: Landed Costs Manager Enhancements

**Problem:** Limited allocation methods; no draft save.

**Enhancements (Screen 1):**

1. **Additional allocation methods (future):**
   - By Weight (if product weight stored)
   - By Volume (if cubic dimensions exist)
   - Custom formula (advanced)

   > **Note:** Document as future enhancement if attributes don't exist yet.

2. **Draft save capability:**
   - Auto-save on field change (debounced 2s) with "Unsaved changes" indicator
   - "Save Draft" button to persist without triggering recalculation
   - "Finalize" button when ready to apply costs to PO lines

3. **Quick actions:**
   - "Copy from previous PO" button (same supplier)
   - Allocation math preview before save
   - Manual per-line override after allocation

---

### R6: Finance Reports — Export & Scheduled Delivery

**Enhancements (Screen 7):**

1. **Export filtered view:**
   - Export button exports current date range, category filter, search results
   - Include filter parameters in exported filename (e.g., `profitability_2026-05_acme.csv`)

2. **Schedule report email:**
   - "Email this report" → dropdown: Daily / Weekly / Monthly
   - Admin configures recipients
   - Uses BullMQ scheduler (leverages existing Phase 6.1 infrastructure)
   - API: `POST /api/finance/reports/schedule` with frequency + recipients

3. **Drill-through:**
   - Click product row → opens Product Costing Detail with that product pre-loaded
   - Click order row → opens Sales Order Detail

---

### R7: Pricing Simulator — Bulk Scenarios

**Problem:** Current simulator is single-product only.

**Solution (Screen 5 Enhancement):**

Add bulk simulation mode:

```
┌─────────────────────────────────────────────────────────────┐
│ Simulation Mode:  ○ Single Product  ● Bulk (CSV Upload)    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Upload CSV:                                           │   │
│  │ [Choose file] or drag here                           │   │
│  │                                                       │   │
│  │ Format: productId, proposedPrice OR productId, markup%│   │
│  │                                                       │   │
│  │ OR:                                                    │   │
│  │ Category: [Electronics ▼]                             │   │
│  │ Apply uniform markup: [________] %                   │   │
│  │                                                       │   │
│  │ [Run Bulk Simulation]                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ RESULTS TABLE (all affected products)                │   │
│  │                                                       │   │
│  │ Product    │ Current │ Proposed │ Margin Δ │ Valid  │   │
│  │ ─────────────────────────────────────────────────────│   │
│  │ Widget A   │ $12.50  │ $13.00   │ +4.0%    │ ✓      │   │
│  │ Gadget X   │ $45.00  │ $48.00   │ +6.7%    │ ✓      │   │
│  │ ...        │         │          │          │        │   │
│  │                                                       │   │
│  │ Showing 142 products | 3 invalid (below floor)       │   │
│  │                                                       │   │
│  │ [Export Results]  [Create Price List from Results]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- API: `POST /api/finance/pricing/simulate/bulk` with array of `{productId, proposedPrice}` or `{categoryId, uniformMarkup}`
- "Create Price List from Results" → creates price list with all simulated products

---

### R8: Navigation & Access Control

**Enhancement:**

1. **Sidebar structure:**
   ```
   Finance (DollarSign icon)
   ├── Dashboard
   ├── Product Costing
   ├── Landed Costs
   ├── Pricing Rules
   ├── Pricing Simulator
   ├── Margin Alerts
   └── Reports
   ```

2. **Role-based access:**
   | Role | Costing | Pricing Rules | Simulator | Alerts | Reports |
   |------|---------|--------------|-----------|--------|---------|
   | Admin | Full | Full (create/delete) | Full | Full | Full |
   | Operator | Edit | Edit only | Full | View/Ack | View/Export |
   | Viewer | View | View only | View | View | View/Export |

3. **Implementation:**
   - Route guards check `user.role` before rendering
   - Buttons conditionally render: `{user.role !== 'viewer' && <EditButton />}`
   - API already protected by Clerk middleware

---

### R9: Mobile/Tablet Responsiveness

**Enhancements:**

| Screen | Desktop | Mobile |
|--------|---------|--------|
| Landed Costs | 2-column grid for cost inputs | Single column stack |
| Pricing Simulator | Side-by-side layout | Stacked (input above results) |
| All Tables | Full table | Horizontal scroll or card view |
| Charts | Full width | Scale to container |

**Implementation:**
- Use Tailwind responsive classes (`grid-cols-1 md:grid-cols-2`)
- Tables: `overflow-x-auto` wrapper with min-width
- Charts: CSS/DIV-based, naturally responsive

---

### R10: Offline Mode Considerations

**Enhancement:**

For finance pages (back-office), offline support adds resilience:

| Screen | Offline Read | Offline Edit |
|--------|--------------|--------------|
| Costing List/Detail | Cache product cost data | Queue edits, sync on reconnect |
| Pricing Rules | Read-only cache | Queue, sync on reconnect |
| Simulator | Works if cost data cached | N/A (no persistence) |
| Margin Alerts | Read-only cache | N/A |

**Implementation:**
- Leverage existing TanStack Query persistence + MutationQueue (Sprint 5)
- Finance-specific: cache `products` query with cost fields
- Show sync status indicator on finance pages (use existing `OfflineBanner`)

---

### R11: Validation & Error Handling

**Enhancements:**

| Field | Validation Rule | Error Display |
|-------|----------------|---------------|
| Standard Cost | Must be ≥ 0; warn if > 10× current price | Inline red text + field border |
| Markup Target | 0% to 500% | Inline validation |
| Margin Floor | Must be < markup target | Inline: "Floor must be less than markup target" |
| Landed Costs | Cannot exceed PO value by >100% | Configurable threshold; inline warning |

**Implementation:**
- Use Zod schemas (already in `lib/api-zod`)
- Inline errors under each field (not just toast on save)
- `react-hook-form` with `setError` for field-level errors

---

### R12: Performance for Large Catalogs

**Enhancements:**

If catalog has >1000 products:

1. **Virtual scrolling:** Use `@tanstack/react-virtual` for Costing List and Rules List
2. **Server-side pagination:** API endpoints already support `page`, `limit`, `search` params
3. **Debounced search:** 300ms debounce on search input to avoid excessive API calls
4. **Query caching:** Finance data cached with longer `staleTime` (5 min vs default 30s)

**Implementation:**
- `useProducts({ query: { page, limit, search } })` pattern
- TanStack Query `useVirtualizer` for table virtualization
- `useDebounce` hook on search input

---

### R13: Internationalization & Currency Formatting

**Enhancements:**

1. **Multi-currency display:**
   - Show base currency primary: `$10.00`
   - Show original if different: `( INR 832.50)` in smaller text

2. **Number formatting:**
   - Use `Intl.NumberFormat` with user's browser locale
   - Consistent decimal places per currency (configurable)

3. **Date formatting:**
   - Follow app-wide convention (check existing pattern)
   - Show timezone for timestamps

**Implementation:**
- Extend `formatCurrency()` to accept optional `showOriginal: boolean`
- `useLocale()` hook for formatting preferences

---

### R14: Test Data & Seeding

**Enhancement:**

Add finance-specific seed data to `POST /api/seed`:

| Data | Details |
|------|---------|
| Product costs | Set `standardCost`, `markupTarget`, `marginFloor` on seed products |
| Price lists | Retail (default), Wholesale |
| Pricing rules | Global 20% markup, Electronics 15% floor, 1 product-specific |
| Margin alerts | 5 sample alerts (2 critical, 2 warning, 1 info) |
| Landed costs | 2 POs with landed cost data |
| Cost history | 10 cost snapshots across products |

**Purpose:** Demo and testing much smoother; new developers can test finance features immediately.

---

### R15: Documentation & Training

**Enhancements:**

1. **Help text (per screen):**
   - How margin is calculated: `(price - cost) / price × 100`
   - When MAC updates: on PO receipt
   - Rule priority resolution: lowest priority number wins
   - How to handle negative margin orders: step-by-step workflow

2. **Tooltips:**
   - "Allocation Method: By Value distributes costs proportionally to each line's value; By Quantity distributes by units"
   - "Margin Floor: Minimum acceptable margin. Prices below this trigger alerts."
   - "MAC (Moving Average Cost): Recalculated on each inbound receipt"

3. **Future:**
   - Video walkthroughs for finance module
   - Interactive demo with seed data

---

### R16: Screen-by-Screen Quick Wins

| Screen | Quick Improvement |
|--------|-------------------|
| Landed Costs Manager | "Copy from previous PO" button for same supplier; auto-save with "Unsaved changes" warning |
| Product Costing List | Add "Price List" column showing default list; quick "Create Price List" button |
| Product Costing Detail | "Edit in bulk" → returns to list with this product pre-selected |
| Pricing Rules Manager | "Test Rule" action → opens simulator with rule applied to sample product |
| Pricing Simulator | "Save as Price List" button to commit results directly |
| Margin Alerts Center | "Auto-acknowledge below floor" toggle for known strategic low-margin products |
| Finance Reports | "Compare periods" toggle (this month vs. last month) |

---

### R17: Potential Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bulk price changes cause revenue drop | High | Require double-confirm for >10% decreases; require "reason"; preview delta revenue |
| Landed cost allocation errors | Medium | Show allocation math before save; allow manual per-line override |
| Rule conflicts (same priority) | Medium | Show conflict warnings in Rules Manager; require priority uniqueness per scope |
| Performance on large datasets | Medium | Server-side pagination + filtering from day one |
| Finance data sync conflicts | Low | Last-write-wins with timestamp; log conflicts for manual review |

---

### R18: Sprint Planning Adjustments (Revised)

Sprint durations adjusted to incorporate review recommendations:

| Sprint | Original | Adjusted | Changes |
|--------|----------|----------|---------|
| Sprint 1 | 5 days | 5.5 days | +0.5 day: Audit Log component |
| Sprint 2 | 4 days | 4.5 days | +0.5 day: Bulk simulator (CSV upload) |
| Sprint 3 | 4 days | 5 days | +1 day: Bulk operations on Costing List |
| Sprint 4 | 3 days | 3.5 days | +0.5 day: Finance sidebar nav + RBAC |
| **Total** | **16 days** | **18.5 days** | **+2.5 days** |

**Alternative:** Move lower-priority items (bulk simulator, audit log) to Phase 8 if timeline constrained.

---

### R19: Missing Metrics & Reports (Future)

Not in current scope, but valuable future additions:

- **Price elasticity report:** How quantity sold changes with price changes
- **Customer margin analysis:** Which customers are most profitable
- **Supplier cost trend:** Standard cost changes per supplier over time
- **Rule effectiveness:** How often pricing rules fired and impact on margin
- **Finance dashboard heatmap:** Products with margin < floor in red, above in green

---

### R20: Final Checklist Before Implementation

- [ ] Confirm all backend endpoints (`/api/finance/*`) documented with request/response schemas
- [ ] Ensure `useBaseCurrency()` hook exists and works for all pages
- [ ] Create shared finance component folder structure (`components/finance/`)
- [ ] Set up ESLint/Prettier rules for consistent code style
- [ ] Define TypeScript interfaces for all new data structures
- [ ] Add unit tests for utility functions (cost allocation, margin calculation, rule evaluation)
- [ ] Plan E2E tests for critical flows (create rule → simulator → apply to product)
- [ ] Create finance feature flag for gradual rollout (optional)

---

## 8. Revised Sprint Planning

### Sprint 1: Costing & Landed Costs (5.5 days)

| Task | Type | Effort | Dependencies |
|------|------|--------|--------------|
| Product Costing List page (`/finance/costing`) | New | 2 days | Backend API ready |
| Product Costing Detail page (`/finance/costing/:id`) | New | 2 days | List page done |
| Audit Log component (change history) | New | 0.5 day | Product Costing Detail |
| Landed Costs Manager (`/finance/landed-costs/:poId`) | New | 2 days | PO detail page reference |
| Shared: Currency input, percent input components | New | 0.5 day | Reusable |
| Cost history chart component | New | 0.5 day | Mock data first |
| Integration with backend APIs | Testing | 1 day | Backend complete |
| Help text for all screens | Docs | 0.5 day | Screens done |

**Deliverables:** Screens 1, 2, 3 (with audit trail) + shared components

---

### Sprint 2: Pricing Rules & Simulator (4.5 days)

| Task | Type | Effort | Dependencies |
|------|------|--------|--------------|
| Pricing Rules List page (`/finance/pricing/rules`) | New | 1.5 days | Backend API ready |
| Pricing Rule Form modal with Impact Preview | New | 1.5 days | List page done |
| Pricing Rules delete + duplicate | Feature | 0.5 day | Form done |
| Pricing Simulator page (`/finance/pricing/simulator`) | New | 1.5 days | Rules API done |
| Bulk Simulator (CSV upload + category uniform) | New | 0.5 day | Simulator page |
| Quick tier buttons component | New | 0.5 day | Simulator page |
| Help text | Docs | 0.5 day | Screens done |

**Deliverables:** Screens 4, 4b, 5 + bulk simulator + components

---

### Sprint 3: Margin Alerts & Reports Enhancement (5 days)

| Task | Type | Effort | Dependencies |
|------|------|--------|--------------|
| Margin Alerts Center (`/finance/margin/alerts`) | New | 1.5 days | Backend API ready |
| Enhanced Alert Detail (order lines, root cause, actions) | Enhancement | 1 day | Alerts page done |
| Alert acknowledge + auto-acknowledge toggle | Feature | 0.5 day | Alerts page done |
| Bulk Operations on Costing List (checkboxes + floating bar) | New | 1 day | Costing list done |
| Finance Reports tabs enhancement | Enhancement | 1 day | Existing reports page |
| Scheduled report email (BullMQ) | New | 0.5 day | Reports enhancement |
| Export functionality all finance pages | Feature | 0.5 day | Per-screen |
| Help text | Docs | 0.5 day | Screens done |

**Deliverables:** Screens 6, 6b, 7 (enhanced) + bulk operations + scheduled reports

---

### Sprint 4: Integration, Polish & Documentation (3.5 days)

| Task | Type | Effort | Dependencies |
|------|------|--------|--------------|
| Cross-page integration testing | Testing | 1 day | All screens done |
| Finance sidebar navigation + RBAC | Enhancement | 1 day | Screens done |
| Finance dashboard quick links | Enhancement | 0.5 day | Finance module |
| Offline mode support for finance pages | Feature | 0.5 day | Offline framework exists |
| Final polish + responsive design | Polish | 0.5 day | All pages |
| Add finance seed data to seed endpoint | Enhancement | 0.5 day | New in Sprint 1 |
| Update APPLICATION_CONTEXT.md | Docs | 0.5 day | Phase complete |

**Deliverables:** Phase 7 complete

---

## 9. Revised Sprint Summary

| Sprint | Duration | Deliverables |
|--------|----------|--------------|
| Sprint 1 | 5.5 days | Costing List, Costing Detail (w/ Audit), Landed Costs Manager |
| Sprint 2 | 4.5 days | Pricing Rules (w/ Impact Preview), Pricing Simulator (w/ Bulk) |
| Sprint 3 | 5 days | Margin Alerts Center (enhanced), Costing Bulk Ops, Reports Enhancement |
| Sprint 4 | 3.5 days | Integration, Sidebar Nav, RBAC, Polish, Documentation |
| **Total** | **18.5 days** | **Phase 7 Complete** |

---

## 10. Out of Scope

- Multi-currency landed cost entry (future enhancement)
- Automated pricing rule suggestions via AI
- Profit/loss forecasting
- Invoice generation
- AP/AR management
- Price elasticity report (future)
- Customer margin analysis (future)
- Supplier cost trend report (future)

---

## 11. Appendix: Recommended File Structure

```
artifacts/wms-app/src/
├── components/
│   └── finance/
│       ├── costing-table.tsx
│       ├── cost-input-card.tsx
│       ├── allocation-table.tsx
│       ├── cost-history-chart.tsx
│       ├── change-history-card.tsx
│       ├── pricing-rule-form.tsx
│       ├── pricing-rule-table.tsx
│       ├── rule-impact-preview.tsx
│       ├── simulator-input.tsx
│       ├── simulator-results.tsx
│       ├── bulk-simulator.tsx
│       ├── margin-alert-row.tsx
│       ├── alert-summary-cards.tsx
│       └── shared/
│           ├── currency-input.tsx
│           └── percent-input.tsx
├── pages/
│   ├── finance-costing.tsx
│   ├── finance-costing-detail.tsx
│   ├── finance-landed-costs.tsx
│   ├── finance-pricing-rules.tsx
│   ├── finance-pricing-simulator.tsx
│   ├── finance-margin-alerts.tsx
│   └── finance-reports.tsx
├── hooks/
│   ├── use-finance-audit.ts
│   └── use-cost-allocation.ts
└── lib/
    └── finance/
        └── allocation.ts (utility functions)
```