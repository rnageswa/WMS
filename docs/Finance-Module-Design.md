# WareIQ WMS — Finance Module: End-to-End Design

## Executive Summary

Design and implementation plan for a comprehensive Finance module covering **costing**, **pricing**, and **margin management** — built on top of the existing Phase 5 foundation (currency, MAC costing, price lists, COGS/margin reports).

**Goal:** Maximize profitability through intelligent costing, dynamic pricing, and real-time margin visibility.

---

## 1. Current State Assessment

### What Exists (Phase 5 Foundation)
| Component | Status | Location |
|-----------|--------|----------|
| Currency management (multi-currency, exchange rates) | ✅ Built | `currency.ts`, `currency.service.ts` |
| Moving Average Cost (MAC) calculation | ✅ Built | `costing.service.ts` |
| Price lists (multi-tier, date validity) | ✅ Built | `pricing.ts`, `pricing.service.ts` |
| COGS tracking on outbound | ✅ Built | `costing.service.ts` → `recordOutboundCost()` |
| COGS report (basic) | ✅ Built | `reports.tsx` → COGSTab |
| Margin report (basic) | ✅ Built | `reports.tsx` → MarginTab |
| ABC analysis | ✅ Built | `reports.tsx` → ABCTab |
| Sales order costAtTime locking | ✅ Built | `orders.ts` confirm flow |
| Currency conversion on orders | ✅ Built | `orders.ts` |

### Gaps Identified
| Gap | Impact | Priority |
|-----|--------|----------|
| No per-product cost breakdown view | Can't audit MAC calculations | High |
| No pricing simulator/what-if | Can't preview margin before setting prices | High |
| Price lists lack volume/contract pricing | Can't model tiered discounts | High |
| No landed cost tracking (freight, duties, overhead) | Understates true cost → margin illusion | High |
| No supplier cost comparison | Can't optimize procurement costs | Medium |
| No margin alerts (negative margin detection) | Losing money silently on orders | High |
| No product profitability dashboard | Can't see which SKUs drive profit | High |
| Price list currency defaults to USD | Should inherit from base currency | Medium |
| No cost history/audit trail per product | Can't track cost trends over time | Medium |
| No markup/margin targets per product/category | No pricing guidance for operators | Medium |
| No customer-specific pricing (contract prices) | Key B2B requirement | Low (Phase 2) |
| No promotion/discount management | Can't run targeted pricing campaigns | Low (Phase 2) |

---

## 2. Recommended Costing Techniques

### 2.1 Moving Average Cost (MAC) — Enhance Current
**Current:** Already implemented. On each receipt: `newAvgCost = (oldQty × oldCost + receivedQty × unitCost) / (oldQty + receivedQty)`

**Enhancement — Weighted Moving Average (WMA):**
Give more weight to recent purchases. Better for inflationary environments.

```sql
-- Option A: Standard MAC (current)
new_avg_cost = (old_qty * old_avg_cost + recv_qty * unit_cost) / (old_qty + recv_qty)

-- Option B: Weighted configurable period (recommended)
-- Use last N receipts weighted by recency
```

**Recommendation:** Keep MAC as default. Add WMA as configurable alternative. This matches industry best practices (SAP, Oracle NetSuite both offer both).

### 2.2 Landed Cost Calculation
Extend unit cost beyond purchase price:

```
Landed Cost = Product Cost + Freight + Insurance + Customs/Duties + Handling + Overhead Allocation
```

**Implementation:**
- Add `landed_cost_components` JSONB field on `purchase_order_lines`
- Freight/duties at PO header level, allocated to lines by weight/value
- Overhead allocation: configurable % or fixed amount per category

### 2.3 Standard Cost (for Comparison)
Maintain a "standard cost" per product (updated quarterly). Compare against MAC to identify variances.

```
Cost Variance = Actual MAC - Standard Cost
Variance % = (MAC - Standard) / Standard × 100
```

### 2.4 FIFO Layer Tracking (Future)
For industries where MAC obscures cost trends. Track inventory in cost layers.

**Recommendation:** Defer to Phase 3. MAC + landed cost sufficient for now.

---

## 3. Recommended Pricing Techniques

### 3.1 Multi-Tier Price Lists (Enhance Current)
**Current:** Price lists with min qty, valid dates.

**Add:**
- **Volume pricing**: More tiers (1-99, 100-499, 500-999, 1000+)
- **Customer segment pricing**: Link price lists to customer segments (Retail, Wholesale, VIP)
- **Channel pricing**: Different prices for online vs. direct sales

### 3.2 Markup-Based Pricing
Allow price derivation from cost:

```
Price = Cost × (1 + Markup%)
Margin% = (Price - Cost) / Price × 100
```

**UI:** "Set markup of 40% above MAC" → auto-calculates price.

### 3.3 Competitive Price Indexing
Track competitor prices and maintain price index:

```
Price Index = Our Price / Market Average × 100
```

**Recommendation:** External data integration. Manual entry for MVP, API integration for Phase 2.

### 3.4 Dynamic Pricing Rules
Rule-based price adjustments:

```typescript
interface PricingRule {
  type: "margin_floor" | "markup_target" | "competitive_match" | "volume_discount";
  condition: { field: string; operator: string; value: number };
  action: { type: "set_price" | "set_markup" | "set_margin"; value: number };
  priority: number;
  validFrom: Date;
  validTo?: Date;
}
```

**Example rules:**
- "Never sell below 15% margin"
- "If MAC drops >10%, auto-adjust retail price to maintain 30% markup"
- "Match competitor X price within 5% for Class A items"

### 3.5 Price Elasticity Analysis (Future)
For mature products with sales history:

```
Elasticity = % Change in Quantity Demanded / % Change in Price
```

Use to find revenue-maximizing price points.

---

## 4. Architecture Design

### 4.1 Database Schema Extensions

```sql
-- ── Product Cost Extension ─────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS standard_cost numeric(12,4);
ALTER TABLE products ADD COLUMN IF NOT EXISTS markup_target numeric(5,2); -- e.g., 40.00 = 40%
ALTER TABLE products ADD COLUMN IF NOT EXISTS margin_floor numeric(5,2); -- e.g., 15.00 = 15% min margin

-- ── Landed Cost Components ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS po_landed_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  cost_type text NOT NULL, -- 'freight', 'insurance', 'duties', 'handling', 'overhead'
  amount numeric(14,2) NOT NULL,
  allocation_method text NOT NULL DEFAULT 'value', -- 'value', 'weight', 'quantity', 'equal'
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Allocated landed costs per PO line ─────────────────────────────────────────
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS allocated_landed_cost numeric(14,4) DEFAULT 0;

-- ── Product Cost History (MAC snapshots) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_cost_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  avg_cost numeric(12,4) NOT NULL,
  standard_cost numeric(12,4),
  total_qty integer NOT NULL,
  source_type text NOT NULL, -- 'receipt', 'adjustment', 'manual', 'standard'
  source_id uuid, -- PO ID or adjustment ID if applicable
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Pricing Rules ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rule_type text NOT NULL, -- 'margin_floor', 'markup_target', 'competitive_match'
  scope text NOT NULL DEFAULT 'global', -- 'global', 'category', 'product'
  scope_id uuid, -- category name or product_id if scoped
  condition_json jsonb,
  action_json jsonb NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  valid_from date,
  valid_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Margin Alerts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS margin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES sales_orders(id),
  alert_type text NOT NULL, -- 'negative_margin', 'below_floor', 'price_anomaly'
  severity text NOT NULL, -- 'critical', 'warning', 'info'
  expected_margin numeric(5,2),
  actual_margin numeric(5,2),
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by text,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 4.2 Service Layer Architecture

```
finance/
├── costing.service.ts      ← Enhanced: landed cost, standard cost, cost history
├── pricing.service.ts       ← Enhanced: pricing rules engine, markup calculator
├── margin.service.ts        ← NEW: margin calculation, alerts, analysis
└── reports.service.ts       ← NEW: finance-specific report generation
```

### 4.3 API Routes

```
GET    /api/finance/dashboard          ← Finance KPIs summary
GET    /api/finance/costing/:productId ← Product cost breakdown
PUT    /api/finance/costing/:productId ← Update standard cost / markup targets
GET    /api/finance/pricing/simulate   ← What-if pricing calculator
POST   /api/finance/pricing/simulate   ← Price recommendation engine
GET    /api/finance/margin/alerts      ← Active margin alerts
POST   /api/finance/margin/alerts/:id/acknowledge
GET    /api/finance/reports/profitability  ← Product profitability report
GET    /api/finance/reports/cost-trend     ← Cost trend analysis
GET    /api/finance/reports/price-effectiveness ← Price list performance
```

### 4.4 Frontend Pages

```
/finance                              ← New Finance Dashboard
/finance/costing/:productId           ← Product Cost Detail
/finance/pricing/simulator            ← Pricing What-If Tool
/finance/margin/alerts                ← Margin Alert Center
/finance/reports/profitability        ← Product Profitability Report
```

---

## 5. Finance Dashboard Design

### KPI Cards (Top Row)
| Metric | Formula | Visualization |
|--------|---------|---------------|
| Gross Margin % | (Revenue - COGS) / Revenue × 100 | Big number + trend |
| Total Revenue | SUM(SO line revenue) in period | Big number + sparkline |
| Total COGS | Sum of outbound MAC × qty | Big number + trend |
| Average Markup | AVG((Price - Cost) / Cost) × 100 | Big number + trend |
| Negative Margin Orders | count where margin < 0 | Alert badge (red) |
| Products Below Floor | count where margin < floor | Alert badge (amber) |

### Charts
1. **Margin Trend (Line)**: Daily/weekly gross margin % over time
2. **Cost vs. Price Scatter**: Each product as a dot, X=MAC, Y=Price, color=margins
3. **Profitability by Category (Bar)**: Total margin $ per category
4. **Top/Bottom 10 Products (Table)**: Ranked by margin $ contribution

### Tables
1. **Margin Alert Queue**: Orders with negative/below-floor margins, action buttons
2. **Cost Variance Report**: Products where MAC changed >10% in period
3. **Price Opportunity**: Products priced below target margin

---

## 6. Implementation Phases

### Phase 6.2A: Enhanced Costing (Week 1-2)
- [ ] Landed cost tracking on PO receipts
- [ ] Cost history snapshots (product_cost_history table)
- [ ] Standard cost + markup targets on products
- [ ] Allocated landed cost on PO lines
- [ ] Enhanced COGs calculation including landed costs
- [ ] API: GET/PUT /api/finance/costing/:productId
- [ ] Frontend: Product Cost Detail page

### Phase 6.2B: Pricing Intelligence (Week 3-4)
- [ ] Pricing rules engine (table + service)
- [ ] Markup-based price setter
- [ ] Pricing simulator/what-if tool (API + UI)
- [ ] Volume tier pricing UI enhancement
- [ ] Price list currency defaults to base currency (bug fix)
- [ ] API: POST /api/finance/pricing/simulate
- [ ] Frontend: Pricing Simulator page

### Phase 6.2C: Margin Protection (Week 5-6)
- [ ] Margin alert system (table + detection service)
- [ ] Automatic margin check on SO line add/update
- [ ] Margin alert center (UI)
- [ ] Acknowledge/resolve workflow
- [ ] API: GET /api/finance/margin/alerts, POST acknowledge
- [ ] Frontend: Margin Alert Center page

### Phase 6.2D: Finance Dashboard & Reports (Week 7-8)
- [ ] Finance Dashboard page with KPIs
- [ ] Product profitability report
- [ ] Cost trend analysis
- [ ] Price list effectiveness report
- [ ] API: GET /api/finance/dashboard, /api/finance/reports/*
- [ ] Navigation: Add Finance tab to main menu

---

## 7. Key Business Rules

### Costing
1. MAC recalculates on every PO receipt (current, keep)
2. Landed cost allocated to PO lines by value ratio
3. Standard cost updated quarterly manual entry
4. Cost history snapshot created on every MAC change ≥ 0.01%

### Pricing
1. Default price list inherits base currency (not hardcoded USD)
2. Margin floor check prevents pricing below minimum
3. Markup target auto-suggests price when cost changes
4. Volume tiers cascade (higher qty = lower unit price)

### Margin
1. Margin checked at SO line addition (warning if below floor)
2. Margin locked at SO confirm (costAtTime snapshot, current)
3. Negative margin orders require manager acknowledgment to ship
4. Alerts fire daily for any shipped order with margin < floor

---

## 8. KPIs to Track Post-Launch

| KPI | Target | Measurement |
|-----|--------|-------------|
| Gross Margin % | > 30% average | Weekly |
| Negative Margin Orders | < 2% of shipments | Monthly |
| Cost Accuracy | MAC within 5% of actual | Quarterly audit |
| Price List Coverage | > 80% of products in active price list | Monthly |
| Margin Alert Response | < 24h average | Weekly |

---

## 9. Files to Modify / Create

### Schema Changes
- `lib/db/src/schema/costing.ts` — add product_cost_history
- `lib/db/src/schema/products.ts` — add standard_cost, markup_target, margin_floor
- Add migration: `lib/db/drizzle/0002_finance_enhancements.sql`

### Backend (API + Services)
- `artifacts/api-server/src/services/costing.service.ts` — enhance with landed cost, history
- `artifacts/api-server/src/services/pricing.service.ts` — add rules engine
- `artifacts/api-server/src/services/margin.service.ts` — NEW
- `artifacts/api-server/src/routes/finance.ts` — NEW route file
- `artifacts/api-server/src/routes/index.ts` — register finance routes

### Frontend (Pages + Components)
- `artifacts/wms-app/src/pages/finance-dashboard.tsx` — NEW
- `artifacts/wms-app/src/pages/finance-costing-detail.tsx` — NEW
- `artifacts/wms-app/src/pages/finance-pricing-simulator.tsx` — NEW
- `artifacts/wms-app/src/pages/finance-margin-alerts.tsx` — NEW
- `artifacts/wms-app/src/pages/reports.tsx` — enhance MarginTab, COGSTab with landed cost data
- `artifacts/wms-app/src/components/navigation.tsx` — add Finance nav item

### Tests
- Unit tests for margin calculation, pricing rules
- Integration tests for landed cost allocation
- E2E tests for pricing simulator
