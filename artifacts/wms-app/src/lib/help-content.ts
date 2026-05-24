export interface HelpContent {
  title: string;
  description: string;
  sections: HelpSection[];
}

export interface HelpSection {
  title: string;
  content: string | string[];
}

export const helpContent: Record<string, HelpContent> = {
  "/dashboard": {
    title: "Dashboard",
    description: "Real-time overview of warehouse operations with live KPIs, financial metrics, stockout predictions, and alerts. All data auto-refreshes automatically.",
    sections: [
      {
        title: "Key Metrics (Auto-Refresh 30s)",
        content: [
          "Total SKUs: Number of active products in your catalog",
          "Total Bins: Number of storage locations across all warehouses",
          "Low Stock: Products that have fallen below their reorder threshold",
          "Today's Movements: Number of inventory transactions today",
          "KPI tiles auto-refresh every 30 seconds. Live indicator shows last update time."
        ]
      },
      {
        title: "Financial KPIs (Auto-Refresh 120s)",
        content: [
          "Total Inventory Value: Sum of all stock × unit price across all warehouses",
          "COGS: Cost of goods sold on shipped/delivered orders for selected date range",
          "Avg Margin: Average profit margin percentage across all fulfilled orders",
          "Low Stock Value: Total value of items below reorder threshold",
          "Date range presets: This Month, Last 7/30/90 Days, This Year, or Custom Range.",
          "Charts: Inventory value by warehouse (bar) and COGS trend (line)."
        ]
      },
      {
        title: "Stockout Risk Predictions (Auto-Refresh 60s)",
        content: "Predictive alerts showing products at risk of stocking out based on 30-day demand velocity. Severity tiers: Critical (≤3 days), Warning (≤7 days), Watch (≤14 days). Each row shows current stock, daily demand rate, days remaining, and estimated stockout date. Data refreshes every 60 seconds."
      },
      {
        title: "Low Stock Alerts (Auto-Refresh 30s)",
        content: "Shows products below their reorder threshold. Each alert displays the product name, current quantity, reorder threshold, and the quantity needed to restore stock. Click 'View all' to see the full inventory filtered by low stock items. Click 'Reorder' to jump to reorder suggestions."
      },
      {
        title: "Recent Activity Feed (Auto-Refresh 30s)",
        content: "Live stream of warehouse events including inbound receipts, outbound dispatches, adjustments, order status changes, and shipments. Color-coded icons indicate event type. Timestamps show time ago. Data refreshes every 30 seconds."
      },
      {
        title: "Offline Mode",
        content: "Dashboard KPIs, stockout predictions, and activity feed are cached locally. When offline, the last cached data is displayed with a timestamp. Data auto-syncs when connectivity returns."
      },
      {
        title: "PO Aging Widget",
        content: "Shows purchase orders grouped by delivery status: Overdue (past expected date), Due This Week, Upcoming, and No Date Set. Click any PO to navigate directly to its detail page."
      },
      {
        title: "Recent Movements",
        content: "Feed of all inventory transactions including inbound receipts, outbound dispatches, and adjustments. Color-coded badges indicate movement type. Click any item to view the full movements log."
      }
    ]
  },
  "/products": {
    title: "Products",
    description: "Manage your product catalog with SKUs, barcodes, and pricing.",
    sections: [
      {
        title: "Product List",
        content: [
          "Search: Filter products by SKU, name, or barcode",
          "Category: Filter by product category",
          "Status: Toggle between active and inactive products",
          "Click any product to view its detail page"
        ]
      },
      {
        title: "Creating Products",
        content: "Click 'Add Product' to create a new SKU. Required fields: SKU Code, Name, Category. Optional: Description, Barcode, Unit of Measure, Unit Price, Reorder Threshold."
      },
      {
        title: "Product Labels",
        content: "Each product has a 'Product Label' section showing a QR code and barcode. Use the 'Print Labels' dialog to print labels in various sizes (shipping, shelf edge, or small tag)."
      }
    ]
  },
  "/inventory": {
    title: "Inventory",
    description: "View and manage stock at the bin level across all warehouses.",
    sections: [
      {
        title: "Bin-Level Stock",
        content: "Shows every product's position across warehouses → zones → bins → quantities. Use warehouse filter to narrow down to a specific location."
      },
      {
        title: "Low Stock Filter",
        content: "Toggle 'Show low stock only' to see products below their reorder threshold. The filter shows products that need restocking."
      },
      {
        title: "Inventory Adjustments",
        content: "Click 'Adjust' to make inventory corrections. Select warehouse → zone → bin → product, enter the new quantity, and select a reason code. All adjustments create an audit trail."
      },
      {
        title: "Offline Mode",
        content: "Inventory data cached locally — bin-level stock positions available offline. Single and bulk adjustments queued when offline, synced automatically when connectivity returns."
      }
    ]
  },
  "/locations": {
    title: "Locations",
    description: "Manage warehouses, zones, and bins for inventory storage.",
    sections: [
      {
        title: "Warehouse Tree",
        content: "Expandable tree showing Warehouse → Zone → Bin hierarchy. Click zones to expand bins. Use inline dialogs to add new zones and bins."
      },
      {
        title: "Activity Heatmap",
        content: "Visual grid showing zone activity based on movement frequency. Click any zone to see bin-level drill-down with move counts. Toggle between 7d, 30d, and 90d views."
      },
      {
        title: "Printing Labels",
        content: "Click 'Print Labels' to navigate to the label printing page. Select warehouse/zone, choose label size (Avery 5160, 5163, or thermal), select bins to print, then click Print."
      },
      {
        title: "Quick Transfer",
        content: "Hover over any bin to see a 'Transfer' button. Click to open a pre-filled transfer dialog where you can move stock to another bin."
      }
    ]
  },
  "/movements": {
    title: "Movements",
    description: "Complete audit trail of all inventory transactions.",
    sections: [
      {
        title: "Movement Types",
        content: [
          "IN (Inbound): Stock received from purchase orders",
          "OUT (Outbound): Stock shipped for orders",
          "ADJUST: Manual corrections to inventory"
        ]
      },
      {
        title: "Filters",
        content: "Filter by date range and product. Each movement shows the type badge (color-coded), quantity with +/- sign, reason code, and timestamp."
      },
      {
        title: "Reason Codes",
        content: "Movements are stamped with reason codes: RECEIPT:<ref>, DISPATCH:<ref>, TRANSFER:<ref>, ADJUSTMENT:<ref>, CYCLE_COUNT:<ref>"
      }
    ]
  },
  "/scan": {
    title: "Scan",
    description: "Quick lookup for bins, products, purchase orders, and GRNs.",
    sections: [
      {
        title: "Input Methods",
        content: [
          "Type/Scan: Keyboard input (works with USB/Bluetooth scanners)",
          "Camera: Use device camera for QR code scanning"
        ]
      },
      {
        title: "Scan Types",
        content: [
          "Bin Code (e.g., B-01): Shows bin contents",
          "SKU/Barcode: Shows product with all bin positions",
          "PO Number: Shows PO card, auto-navigates to detail",
          "GRN Reference: Shows GRN card, auto-navigates to GRN page"
        ]
      },
      {
        title: "Auto-Navigation",
        content: "When scanning a PO or GRN, the page automatically redirects to the detail page after 1.8 seconds."
      },
      {
        title: "Offline Mode",
        content: "Scan lookup requires connectivity. When offline, a notice is shown. Use the picker or receiving pages for offline-scannable actions."
      }
    ]
  },
  "/purchase-orders": {
    title: "Purchase Orders",
    description: "Create and manage purchase orders for stock replenishment.",
    sections: [
      {
        title: "PO Statuses",
        content: [
          "Draft: Initial state, editable",
          "Ordered: Sent to supplier, waiting for delivery",
          "Partially Received: Some items received",
          "Received: All items received, complete",
          "Cancelled: Order cancelled"
        ]
      },
      {
        title: "Creating POs",
        content: "Click 'New PO' to create a purchase order. Add line items with product, quantity, and optional unit cost. Set optional delivery date. Save as draft or mark as ordered."
      },
      {
        title: "Receiving Stock",
        content: "On PO detail page, use the 'Receive Stock' form to record received items. Select warehouse → zone → bin for each line item. The transaction atomically updates inventory and creates movement records."
      },
      {
        title: "Templates",
        content: "Use PO Templates to save frequently ordered product sets. Click 'Templates' to manage templates. Templates can be applied when creating new POs or save current PO as a template."
      },
      {
        title: "Bulk Actions",
        content: "Select multiple POs using checkboxes to bulk cancel or delete drafts. The bulk action bar appears at the bottom when items are selected."
      },
      {
        title: "Export",
        content: "Click 'Export CSV' to download a spreadsheet of all purchase orders with line item details."
      }
    ]
  },
  "/purchase-orders/reorder": {
    title: "Reorder Suggestions",
    description: "Auto-generated purchase order suggestions based on low stock levels.",
    sections: [
      {
        title: "How It Works",
        content: "System automatically identifies products below their reorder threshold and groups them by supplier. Suggested quantity = (Reorder Threshold × 2) - Current Stock."
      },
      {
        title: "Creating POs",
        content: "Check items to include, adjust quantities if needed, then click 'Create Draft PO'. For multiple suppliers, use 'Create All Draft POs' to create all at once."
      },
      {
        title: "Sending Alerts",
        content: "Click 'Send Reorder Alert' to email the low stock report to a recipient. Enter email address in the dialog and click Send."
      }
    ]
  },
  "/suppliers": {
    title: "Suppliers",
    description: "Manage vendor/supplier records for purchasing.",
    sections: [
      {
        title: "Supplier List",
        content: "Searchable table showing supplier name, contact info, lead time (days), and PO count. Use the search box to find suppliers by name."
      },
      {
        title: "Creating Suppliers",
        content: "Click 'Add Supplier' to create a new vendor record. Fill in name (required), contact name, email, phone, address, and lead time."
      },
      {
        title: "Supplier Detail",
        content: "View and edit all supplier fields inline. See full PO history with links to each order. Deactivate/reactivate suppliers using the status toggle."
      }
    ]
  },
  "/suppliers/performance": {
    title: "Supplier Performance",
    description: "Track supplier metrics including on-time delivery and fill rates.",
    sections: [
      {
        title: "Key Metrics",
        content: [
          "On-Time Rate: % of POs delivered on/before expected date",
          "Fill Rate: Quantity received vs. quantity ordered",
          "Avg Lead Time: Average days from PO creation to receipt",
          "Total Spend: Sum of all order values"
        ]
      },
      {
        title: "Color Coding",
        content: "Metrics are color-coded: Green (≥90%), Amber (≥70%), Red (<70%) to quickly identify problem suppliers."
      }
    ]
  },
  "/receiving": {
    title: "Receiving",
    description: "3-step guided workflow for receiving inbound stock.",
    sections: [
      {
        title: "Step 1: Reference",
        content: "Enter a PO number, delivery note, or any reference ID. This is stamped as RECEIPT:<ref> on all movements. Optional - can skip."
      },
      {
        title: "Step 2: Line Items",
        content: "Add product lines with cascading warehouse → zone → bin selectors and quantity. Add or remove lines as needed."
      },
      {
        title: "Step 3: Review",
        content: "Review summary table with SKU, product name, warehouse, bin, and quantity. Click 'Commit Receipt' to atomically update inventory and create movement records."
      },
      {
        title: "Offline Mode",
        content: "Receipt commits are queued when offline and synced automatically when connectivity returns. PO and product data cached locally for offline form filling."
      }
    ]
  },
  "/dispatch": {
    title: "Dispatch",
    description: "3-step guided workflow for outbound dispatch.",
    sections: [
      {
        title: "Step 1: Reference",
        content: "Enter order number or reference (optional). This is stamped as DISPATCH:<ref> on movements."
      },
      {
        title: "Step 2: Pick Lines",
        content: "Select product and bin for each line. Bin dropdown shows live available stock with color-coded indicators (green/amber/red)."
      },
      {
        title: "Step 3: Review",
        content: "Review quantities (shown in orange with minus sign). Click 'Commit Dispatch' - server runs stock validation before writing."
      },
      {
        title: "Offline Mode",
        content: "Dispatch commits are queued when offline and synced automatically when connectivity returns. Product and bin data cached locally for offline form filling."
      }
    ]
  },
  "/transfer": {
    title: "Stock Transfer",
    description: "Move inventory between bins within the warehouse.",
    sections: [
      {
        title: "Creating Transfers",
        content: "Add transfer lines with product, quantity, source bin (FROM), and destination bin (TO). Both source and destination cascade through warehouse → zone → bin."
      },
      {
        title: "Validation",
        content: "System prevents same-bin transfers and validates source bin has sufficient stock. Pre-flight check runs on the server before any movements are written."
      },
      {
        title: "Audit Trail",
        content: "Each transfer line creates two movements: one outbound from source, one inbound to destination, both stamped with TRANSFER:<ref>."
      }
    ]
  },
  "/cycle-count": {
    title: "Cycle Count",
    description: "Periodic inventory verification process.",
    sections: [
      {
        title: "Step 1: Scope",
        content: "Enter a reference code (e.g., CC-2026-Q2), select warehouse, optionally narrow to zone, then click 'Load Items'."
      },
      {
        title: "Step 2: Count",
        content: "Enter physical counts for each bin × product. Rows with discrepancies highlight in amber showing variance (↑ or ↓)."
      },
      {
        title: "Step 3: Submit",
        content: "Review KPI tiles (items counted, discrepancies, net variance). Submitting runs an atomic transaction updating all quantities and creating ADJUSTMENT movements."
      }
    ]
  },
  "/reports": {
    title: "Reports",
    description: "Analytics and reporting for inventory, suppliers, ABC classification, COGS, and margins.",
    sections: [
      {
        title: "Stock Value Report",
        content: "Category-by-category stock value breakdown with bar chart. Sortable table shows products, units, value, and % of total. Export to CSV."
      },
      {
        title: "Supplier Performance",
        content: "Track supplier metrics including on-time delivery rate, fill rate, average lead time, and total spend. Metrics are color-coded: Green (≥90%), Amber (≥70%), Red (<70%). Export to CSV."
      },
      {
        title: "Stock Velocity",
        content: "Analyze inventory movement speed. Shows fast/medium/slow/idle SKUs based on throughput. Days Left column shows estimated stock runway."
      },
      {
        title: "Velocity Alerts",
        content: "Configure automated email alerts for SKUs running low based on velocity. Set threshold (days), lookback window, and recipient email. Use SKU overrides to always/never include specific products."
      },
      {
        title: "ABC Analysis",
        content: [
          "Pareto classification of products by revenue and pick velocity using 12 months of sales data.",
          "Revenue Class: A = top 80% cumulative revenue, B = next 15%, C = bottom 5%.",
          "Velocity Class: same Pareto split but by pick frequency instead of revenue.",
          "Combined Class: two-letter code (e.g., AA, BC) showing revenue + velocity class.",
          "Cumulative Revenue chart (Pareto curve) visualizes the distribution.",
          "Filter table by class (A/B/C) and export full breakdown to CSV."
        ]
      },
      {
        title: "COGS Report",
        content: "Cost of goods sold analysis by date range. Shows total COGS, order count, average margin percentage, and a daily COGS trend line chart. Filter by preset ranges (7d, 30d, 90d, this month, this year) or custom date range."
      },
      {
        title: "Margin Report",
        content: "Order-level and product-level margin analysis. Summary cards show total revenue, total cost, gross margin, and average margin %. Filterable table with order details including customer, shipped date, revenue, cost, and margin %. Export to CSV."
      }
    ]
  },
  "/admin": {
    title: "User Management",
    description: "Manage user roles and access control.",
    sections: [
      {
        title: "Roles",
        content: [
          "Admin: Full access to all features and settings",
          "Operator: Can perform inventory operations",
          "Viewer: Read-only access"
        ]
      },
      {
        title: "First User Rule",
        content: "The first user to sign up is automatically assigned Admin role. Subsequent users start as Operators."
      }
    ]
  },
  "/receiving-schedule": {
    title: "Receiving Schedule",
    description: "View and track expected deliveries.",
    sections: [
      {
        title: "Scheduled Deliveries",
        content: "Shows purchase orders with expected delivery dates. Overdue deliveries are highlighted in red with days overdue."
      }
    ]
  },
  "/po-templates": {
    title: "PO Templates",
    description: "Manage reusable purchase order templates.",
    sections: [
      {
        title: "Creating Templates",
        content: "Create templates with supplier, notes, and line items (product, default quantity, default cost). Templates can be applied when creating new POs."
      },
      {
        title: "Using Templates",
        content: "On new PO form, select 'Pick a template...' from the dropdown to pre-fill supplier and line items. Also 'Save as Template' button saves current PO as a template."
      }
    ]
  },
  "/sales-orders": {
    title: "Sales Orders",
    description: "Manage customer orders and fulfillment.",
    sections: [
      {
        title: "Order Statuses",
        content: [
          "Draft: Initial state, editable",
          "Confirmed: Order confirmed, ready for picking",
          "Picking: Items being picked from bins",
          "Picking Complete: All items picked",
          "Packed: Order packed and ready to ship",
          "Shipped: Order dispatched to customer",
          "Delivered: Order received by customer",
          "Cancelled: Order cancelled"
        ]
      },
      {
        title: "Creating Orders",
        content: "Click 'New Order' to create a sales order. Add customer details and line items with product, quantity, and price."
      },
      {
        title: "Fulfillment Flow",
        content: "Orders progress through: Confirm → Start Picking → Complete Picking → Pack → Ship → Deliver. Each status transition updates inventory."
      },
      {
        title: "Inventory Impact",
        content: "When an order is shipped, inventory is automatically reduced and outbound movements are recorded in the audit trail."
      }
    ]
  },
  "/picker": {
    title: "Picker View",
    description: "Scan bin codes or SKUs to confirm picks for orders.",
    sections: [
      {
        title: "Order Selection",
        content: "Select an order from the list of orders in 'picking' status. Only confirmed orders that have started picking appear here."
      },
      {
        title: "Scanning Items",
        content: [
          "Bin Code (e.g., B-01): Scan the bin location to confirm pick location",
          "SKU Code (e.g., SKU-1001): Scan product barcode/SKU to confirm item",
          "Type or scan in the input field and press Enter to confirm"
        ]
      },
      {
        title: "Pick Confirmation",
        content: "Each scan increments the picked quantity by 1. The row highlights in green when fully picked. All lines must be picked before the task can complete."
      },
      {
        title: "Scanner Support",
        content: "Compatible with USB and Bluetooth barcode scanners. The input field auto-focuses after each scan for rapid picking."
      },
      {
        title: "Offline Mode",
        content: "Pick confirmations, task starts, and task completions are queued when offline. Actions sync automatically when connectivity returns. Cached task data and bin/product info remain available offline."
      }
    ]
  },
  "/returns": {
    title: "Returns (RMA)",
    description: "Manage customer return authorizations and reverse logistics.",
    sections: [
      {
        title: "RMA Lifecycle",
        content: [
          "Requested: Return request created, awaiting approval",
          "Approved: Return authorized, customer can ship items back",
          "Received: Items received at warehouse, pending inspection",
          "Inspected: Items inspected, condition and disposition recorded",
          "Restocked: Items returned to sellable inventory",
          "Quarantined: Items held for further review or disposal",
          "Refunded: Customer refund processed",
          "Rejected: Return request denied"
        ]
      },
      {
        title: "Creating an RMA",
        content: "Click 'New Return' to create an RMA. Enter customer name (required), optional reason and notes, then add one or more return lines with product, quantity, and condition."
      },
      {
        title: "Inspecting Returns",
        content: "On the RMA detail page, when status is 'Inspected' or 'Restocked', each line shows editable Condition and Disposition dropdowns. Set disposition to Restock, Quarantine, Dispose, or Return to Supplier."
      },
      {
        title: "Status Transitions",
        content: "Use the status dropdown on the RMA detail page to advance the return through its lifecycle. The progress bar shows current position in the flow: Requested → Approved → Received → Inspected → Resolved."
      }
    ]
  },
  "/smart-replenishment": {
    title: "Smart Replenishment",
    description: "AI-driven reorder suggestions based on demand, stock levels, and lead times.",
    sections: [
      {
        title: "Recommendations",
        content: [
          "Severity: Critical (red) = out of stock or zero; Warning (amber) = below reorder point",
          "Current Stock: total on-hand across all bins",
          "Reorder Point: automatically calculated as (avg daily demand × lead time) + safety stock",
          "Shortfall: how many units are needed to reach the reorder point",
          "Suggested Qty: recommended purchase quantity based on 2× reorder point cover"
        ]
      },
      {
        title: "Filters",
        content: "Use the search box to filter by product name or SKU. Use the severity dropdown to show only Critical or Warning items. Click 'Clear filters' to reset."
      },
      {
        title: "Actions",
        content: "Click 'Create PO' next to a recommendation to start a purchase order with the suggested quantity pre-filled. Use 'Generate PRs' to batch-create draft purchase requisitions for all recommendations."
      },
      {
        title: "Refreshing Data",
        content: "Click the 'Refresh' button to re-run the demand calculations. Recommendations update every time the page reloads or when 'Generate PRs' is clicked."
      }
    ]
  },
  "/smart-picking": {
    title: "Wave Picking",
    description: "Plan pick waves by zone proximity, preview optimized routes, then execute zone-by-zone picking. Combines smart batch planning with wave execution in one flow.",
    sections: [
      {
        title: "Plan View — Batch Suggestions",
        content: [
          "Orders in 'picking' status are automatically grouped by shared zones. Each group becomes a suggested batch.",
          "Zone batches: orders sharing the same zone(s) are grouped together to minimize travel distance.",
          "Batch types: Express (≤3 orders), Standard (≤8 orders), Bulk (8+ orders).",
          "Click any batch to preview its optimized pick path in the Route Optimization panel.",
          "Use checkboxes to select individual orders, or click 'Create Wave' on a batch to wave all its orders."
        ]
      },
      {
        title: "Route Optimization Preview",
        content: [
          "Visual path: S (Start) → A (Zone 1) → B (Zone 2) → P (Pack) with progress bars showing zone sequence.",
          "Batch stats: order count, total lines, number of zones.",
          "Batch type badge: Zone Pick (single zone), Multi-Zone Batch, or Mixed.",
          "'Create Wave from Batch' button creates the wave and opens the Pick view immediately."
        ]
      },
      {
        title: "Waves View — Active Wave List",
        content: "Shows all waves with status (ready/picking/completed), progress bars, and order/line/unit counts. Click 'Start' on a ready wave or 'Continue' on an active wave to jump into picking. Access via the 'Active Waves' button in the header."
      },
      {
        title: "Pick View — Zone-by-Zone Execution",
        content: [
          "Zone progress bar: shows all zones in pick order. Green = completed, orange = current, gray = pending.",
          "Scan to pick: scan any SKU or bin code to auto-match and pick the line. Works across all zones.",
          "Current zone lines: table shows order, SKU, product, qty to pick, suggested bin, and Pick button.",
          "Navigate between zones with Previous/Next Zone buttons. Complete all lines in one zone before moving on.",
          "Stats bar: total lines, units to pick, lines picked, remaining.",
          "'Complete Wave' button appears when all lines are picked. Advances all orders to 'picking_complete'."
        ]
      },
      {
        title: "Wave Lifecycle",
        content: "Create Wave → Status: ready → Start Wave → Status: picking → Pick all lines → Complete Wave → Status: completed. Each wave auto-creates picking tasks and lines, assigns optimal bins (highest stock), and computes the zone stop sequence."
      },
      {
        title: "Optimization Tips",
        content: [
          "Batch by Zone: orders sharing zones are grouped automatically. Single-zone batches are fastest.",
          "Express waves: create small waves (≤3 orders) for urgent orders to get them out quickly.",
          "Follow zone order: pick all items in one zone before moving to the next. The wave computes the optimal sequence.",
          "Use scan-to-pick: scanning is faster than clicking Pick buttons. Works with barcode scanners and mobile camera."
        ]
      }
    ]
  },
  "/labor-tracking": {
    title: "Labor Tracking",
    description: "Monitor worker productivity, accuracy, and efficiency metrics across the warehouse.",
    sections: [
      {
        title: "Summary Cards",
        content: [
          "Total Workers: number of workers with recorded performance data",
          "Avg Productivity: mean units picked per hour across all workers",
          "Avg Accuracy: mean pick accuracy rate (correct picks / total picks)",
          "Total Units Picked: sum of all units picked in the current period"
        ]
      },
      {
        title: "Worker Detail",
        content: "Select a worker from the dropdown to view their individual metrics: Productivity Score (units/hour), Accuracy Rate (percentage of correct picks), and Efficiency Score (composite 0-100 score based on tasks completed). Click any row in the table to select that worker."
      },
      {
        title: "Performance Table",
        content: "All workers with recorded data. Columns: Worker name/ID, Tasks Completed, Lines Picked, Units Picked, Hours Worked, Productivity (units/hr), Accuracy (%), Efficiency Score (color-coded badge: green ≥80, amber ≥50, gray <50). Click a row to view detail."
      },
      {
        title: "Filters",
        content: "Search by worker name or ID. Results update as you type. Use 'Clear filters' to reset."
      },
      {
        title: "Creating Labor Entries",
        content: "Click 'New Entry' to record a worker shift. Enter Worker ID, shift date, hours worked, tasks completed, and optional notes. Entries are unique per worker per day — submitting again for the same date updates the existing entry."
      },
      {
        title: "Data Source",
        content: "Metrics are upserted via POST /api/labor/workers. Productivity = units picked / hours worked. Accuracy = submitted by the caller (0–1 scale). Efficiency = composite score (0-100) based on tasks completed vs. expected throughput. Worker performance records created from labor entries or uploaded via the API."
      }
    ]
  },
  "/transfer-optimization": {
    title: "Transfer Optimization",
    description: "Analyze inventory imbalances across warehouses and generate inter-warehouse transfer suggestions.",
    sections: [
      {
        title: "Summary Cards",
        content: [
          "Recommended: transfers suggested by the engine, pending review",
          "Approved: transfers approved, ready to schedule",
          "Scheduled: transfers with a scheduled execution date"
        ]
      },
      {
        title: "Running Optimization",
        content: "Click 'Run Optimization' to analyze inventory levels across all warehouses. The engine identifies products with excess stock at one warehouse and stockout risk at another, then generates transfer suggestions with recommended quantities and confidence scores."
      },
      {
        title: "Transfer Suggestions Table",
        content: "Each row shows: Product name, source warehouse (From), destination warehouse (To), recommended quantity, Confidence Score (0-100%), Reason (Stockout Risk, Excess Stock, or Demand Spike), and current Status."
      },
      {
        title: "Status Flow",
        content: "Recommended → Approved → Scheduled → Completed. Click 'Approve' on a recommended transfer to mark it approved. Click 'Schedule' on an approved transfer to move it to scheduled. The transfer is completed when stock is physically moved."
      },
      {
        title: "Filters",
        content: "Search by product name. Filter by status (Recommended, Approved, Scheduled, Completed). Use 'Clear filters' to reset."
      },
      {
        title: "Confidence Score",
        content: "Indicates how confident the engine is that this transfer is beneficial. High confidence (≥80%) means strong imbalance detected. Low confidence (<50%) means marginal benefit — review manually before approving."
      }
    ]
  },
  "/slotting": {
    title: "Slotting",
    description: "Manage bin assignments and product placement optimization scores.",
    sections: [
      {
        title: "Summary Cards",
        content: [
          "Total Assignments: all product-to-bin assignments in the system",
          "Confirmed: assignments that have been validated (manually or by rule)",
          "Avg Score: mean optimization score across all assignments (0-100)"
        ]
      },
      {
        title: "Slotting Assignments Table",
        content: "Each row shows: Product name, SKU code, assigned Bin, Zone, optimization Score (color-coded badge), Reason for assignment, and confirmation status."
      },
      {
        title: "Score Interpretation",
        content: [
          "Green (≥80): optimal placement — product is in the best bin for its velocity and co-pick patterns",
          "Amber (50-79): acceptable placement — could be improved but not critical",
          "Gray (<50): suboptimal — consider reassigning to a better bin"
        ]
      },
      {
        title: "Assignment Reasons",
        content: [
          "Velocity: assigned based on pick frequency (fast-movers near dispatch)",
          "Co-Pick: assigned near products frequently ordered together",
          "Temperature: assigned to a temperature-controlled zone",
          "Manual: manually assigned by a user"
        ]
      },
      {
        title: "Confirming Assignments",
        content: "Pending assignments show a 'Confirm' button. Click to validate the assignment and mark it as confirmed. Confirmed assignments are considered valid and won't be moved by the auto-slotting engine."
      },
      {
        title: "Filters",
        content: "Search by product name, SKU, or bin code. Filter by status (All, Confirmed, Pending). Use 'Clear filters' to reset."
      }
    ]
  },
  "/demand-forecast": {
    title: "Demand Forecast",
    description: "Predict future demand using historical data and moving averages.",
    sections: [
      {
        title: "Product Selection",
        content: "Select a product from the dropdown to load its demand forecast. The selector shows SKU code and product name. All forecasts are calculated from outbound inventory movements over the last 30 days."
      },
      {
        title: "Summary Cards",
        content: [
          "30-Day Average: mean daily outbound demand over the last 30 days",
          "Suggested Reorder Point: calculated to cover ~2 weeks of demand at current velocity",
          "Suggested Order Qty: calculated to cover ~4 weeks of demand"
        ]
      },
      {
        title: "Charts",
        content: [
          "Historical Demand (Blue): Actual units consumed per day over the last 30 days",
          "7-Day Moving Average (Green): Smoothed demand to remove daily noise",
          "Predicted Demand (Orange): Forward-looking 30-day forecast based on current velocity"
        ]
      },
      {
        title: "Reading the Forecast",
        content: "If predicted demand is consistently above average, expect a demand spike and consider increasing stock. If below average, demand may be slowing and overstock risk increases. The predicted chart uses a flat 30-day average model; advanced ML forecasting is on the roadmap for Phase 6.3."
      }
    ]
  },
  "/finance": {
    title: "Finance Dashboard",
    description: "Central financial overview: gross margin, revenue, COGS, markup, and margin alerts across all shipped orders.",
    sections: [
      {
        title: "KPI Cards (Auto-Refresh 120s)",
        content: [
          "Gross Margin %: (Revenue - COGS) / Revenue × 100. Green if ≥30%, amber if ≥15%, red if <15%.",
          "Total Revenue: Sum of all shipped/delivered order line revenue in selected period.",
          "Total COGS: Cost of goods sold via MAC at time of shipment.",
          "Avg Markup: Average (Price - Cost) / Cost × 100 across all active products.",
          "Negative Margin Orders: Count of shipped orders where margin is below zero.",
          "Products Below Floor: Active products priced below their configured margin floor."
        ]
      },
      {
        title: "Revenue by Category Chart",
        content: "Stacked bar chart showing total revenue and estimated margin per product category. Helps identify which categories drive the most profit."
      },
      {
        title: "Margin Trend Chart",
        content: "Line chart showing daily margin percentage over the selected period. Use to spot margin erosion or improvement trends."
      },
      {
        title: "Alert Banners",
        content: "Red banner appears when negative margin orders exist. Amber banner appears when products are priced below their margin floor. Click to navigate to the Margin Alert Center or Pricing Simulator."
      },
      {
        title: "Quick Links",
        content: "Four shortcut cards at the bottom: Profitability Report (per-product margin), Pricing Simulator (what-if analysis), Margin Alerts (active alerts), and Price Effectiveness (price list coverage)."
      }
    ]
  },
  "/finance/costing/:id": {
    title: "Product Cost Detail",
    description: "Per-product cost breakdown: current MAC, standard cost, cost variance, inventory value, and pricing targets.",
    sections: [
      {
        title: "Cost Summary Cards",
        content: [
          "Current Avg Cost (MAC): Moving Average Cost calculated from all receipts.",
          "Standard Cost: Manually-set reference cost for variance comparison.",
          "Cost Variance: (MAC - Standard) / Standard × 100. Red if >5% over, green if under.",
          "Total Inventory Value: Sum of qty × avgCost across all bins.",
          "Suggested Price: Auto-calculated from cost + markup target."
        ]
      },
      {
        title: "Pricing Targets",
        content: "Markup Target: desired % above cost. Margin Floor: minimum acceptable margin %. Edit via the Edit button to update standard cost, markup target, and margin floor."
      },
      {
        title: "Cost History Chart",
        content: "Line chart showing MAC over the last 30 snapshots. Each receipt, adjustment, or manual update creates a snapshot. Use to track cost trends and identify price volatility."
      },
      {
        title: "Cost History Log",
        content: "Table of all cost snapshots: date, avg cost, total quantity, and source type (receipt, adjustment, manual, standard)."
      }
    ]
  },
  "/finance/pricing/simulator": {
    title: "Pricing Simulator",
    description: "What-if pricing tool: enter a product, cost, and proposed price to see margin analysis, rule checks, and price suggestions.",
    sections: [
      {
        title: "How to Use",
        content: "1) Enter the product UUID (from product detail page URL). 2) Enter the unit cost. 3) Optionally enter a proposed price and quantity. 4) Click Simulate."
      },
      {
        title: "Results",
        content: [
          "Current Price vs Proposed: Shows existing price and margin alongside the simulated price.",
          "Warnings: Alerts if proposed price violates margin floors or pricing rules.",
          "Rules Applied: Lists any active pricing rules that affected the simulation (margin floor, markup target, volume discount).",
          "Suggestions: Grid of pre-calculated prices at 15%, 20%, 25%, 30%, 40%, 50% markup with their resulting margins."
        ]
      },
      {
        title: "Pricing Rules",
        content: "Rules are configured via API. Types: margin_floor (prevents pricing below minimum margin), markup_target (suggests target markup), volume_discount (price breaks at quantity thresholds), competitive_match (match competitor pricing)."
      }
    ]
  },
  "/finance/costing": {
    title: "Product Costing List",
    description: "View all products with cost metrics: MAC, standard cost, variance, and pricing targets in a single table.",
    sections: [
      {
        title: "Summary Cards",
        content: [
          "Products: total number of active products with cost data",
          "Inventory Value: sum of qty × avgCost across all product-bin combinations",
          "Cost >5% Over Std: count of products where MAC exceeds standard cost by more than 5%",
          "With Cost Data: products that have non-zero average cost"
        ]
      },
      {
        title: "Table Columns",
        content: [
          "Product: SKU code, name, and category badge. Click to navigate to Cost Detail.",
          "Avg Cost (MAC): Moving Average Cost from inventory receipts",
          "Std Cost: Manually-set reference cost for variance comparison",
          "Variance: (MAC - Standard) / Standard × 100. Red if >5% over, green if <5% under.",
          "Markup Target: Desired % above cost for pricing",
          "Margin Floor: Minimum acceptable margin %",
          "Qty On Hand: total stock across all bins",
          "Inventory Value: total value at current avgCost"
        ]
      },
      {
        title: "Filters",
        content: "Search by product name or SKU. Filter by category. Filter by variance type: Cost Over 5% Above Std, Cost Over 5% Below Std, or No Standard Cost."
      },
      {
        title: "Navigation",
        content: "Click any product row to navigate to its full cost detail page with cost history chart and pricing targets."
      }
    ]
  },
  "/finance/landed-costs": {
    title: "Landed Costs Manager",
    description: "Manage additional costs (freight, insurance, duties, handling, overhead) for purchase orders, allocated by value or quantity.",
    sections: [
      {
        title: "Cost Type Cards",
        content: "Five cards showing totals per cost type: Freight, Insurance, Duties, Handling, Overhead. A highlighted Total card shows the sum of all landed costs."
      },
      {
        title: "Adding Costs",
        content: "Click 'Add Landed Cost' to open the dialog. Select cost type, enter amount (in PO currency), and choose allocation method: By Line Value (proportional to line cost), By Quantity (proportional to line quantity), Equal Split (even across all lines), or By Weight."
      },
      {
        title: "How Allocation Works",
        content: "When landed costs are added, the total is automatically distributed across PO lines. For 'By Line Value' (default), each line gets a share proportional to (unit cost × quantity). The allocated amount is stored on each PO line and affects the effective unit cost used for MAC calculations when stock is received."
      },
      {
        title: "Impact on Costing",
        content: "The effective unit cost for each PO line = unit cost + (allocated landed cost / quantity). This combined cost is used when updating Moving Average Cost (MAC) during stock receipt."
      }
    ]
  },
  "/finance/pricing/rules": {
    title: "Pricing Rules",
    description: "Configure pricing rules for margin protection, markup targets, volume discounts, and competitive matching.",
    sections: [
      {
        title: "Rule Types",
        content: [
          "Margin Floor: Prevents pricing below a minimum margin %. Orders falling below will trigger alerts.",
          "Markup Target: Sets a target markup % above cost. Used to calculate suggested prices.",
          "Competitive Match: Sets price to match competitor pricing.",
          "Volume Discount: Price breaks based on quantity thresholds."
        ]
      },
      {
        title: "Scope",
        content: "Global: applies to all products. Category: applies to all products in a specific category. Product: applies to a single product."
      },
      {
        title: "Priority",
        content: "Rules are evaluated in priority order (higher = first). If multiple rules apply, the highest priority rule's effect takes precedence. Use priority to create override hierarchies (e.g., product-level overrides category-level)."
      },
      {
        title: "Actions",
        content: "Toggle active/inactive via switch. Edit rule parameters. Duplicate to create a copy with incremented priority. Delete with confirmation."
      }
    ]
  },
  "/finance/margin/alerts": {
    title: "Margin Alert Center",
    description: "Monitor and acknowledge margin alerts. Alerts fire when orders have negative margins or fall below configured floors.",
    sections: [
      {
        title: "Alert Summary",
        content: "Four cards: Active Alerts (unacknowledged count), Critical (negative margin), Warning (below floor), Acknowledged (resolved count)."
      },
      {
        title: "Alert Types",
        content: [
          "Negative Margin: Order or line has margin < 0%. Severity: critical.",
          "Below Floor: Margin is positive but below the product's configured floor. Severity: warning.",
          "Price Anomaly: Price deviates significantly from expected range. Severity: info."
        ]
      },
      {
        title: "Acknowledging Alerts",
        content: "Click Acknowledge on any active alert to mark it reviewed. Acknowledged alerts move to the 'All' view. Use the Active Only / All toggle to filter."
      },
      {
        title: "Auto-Refresh",
        content: "Alert list refreshes every 30 seconds. New alerts from recently confirmed/shipped orders appear automatically."
      }
    ]
  }
};

export function getHelpContent(pathname: string): HelpContent | undefined {
  // Try exact match first
  if (helpContent[pathname]) {
    return helpContent[pathname];
  }
  
  // For dynamic routes like /finance/costing/:id, try the pattern key
  // Match last segment (UUID) and try /:id pattern on parent path
  const dynamicMatch = pathname.match(/^(\/.+?)\/[^\/]+$/);
  if (dynamicMatch) {
    const parentPath = dynamicMatch[1];
    const patternKey = parentPath + "/:id";
    if (helpContent[patternKey]) {
      return helpContent[patternKey];
    }
    // Fallback to parent path (for routes like /purchase-orders/:id)
    if (helpContent[parentPath]) {
      return helpContent[parentPath];
    }
  }
  
  // Legacy prefix matching fallback
  for (const [key, content] of Object.entries(helpContent)) {
    if (pathname.startsWith(key)) {
      return content;
    }
  }
  
  return undefined;
}