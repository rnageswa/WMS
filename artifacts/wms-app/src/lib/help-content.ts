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
    description: "Overview of your warehouse operations with key metrics, financial KPIs, and alerts.",
    sections: [
      {
        title: "Key Metrics",
        content: [
          "Total SKUs: Number of active products in your catalog",
          "Total Bins: Number of storage locations across all warehouses",
          "Low Stock: Products that have fallen below their reorder threshold",
          "Today's Movements: Number of inventory transactions today"
        ]
      },
      {
        title: "Financial KPIs",
        content: [
          "Total Inventory Value: Sum of all stock × unit price across all warehouses",
          "COGS This Month: Cost of goods sold on shipped/delivered orders",
          "Avg Margin: Average profit margin percentage across all fulfilled orders",
          "Value by Warehouse: Bar chart showing inventory value distribution per warehouse"
        ]
      },
      {
        title: "Low Stock Alerts",
        content: "Shows products below their reorder threshold. Each alert displays the product name, current quantity, reorder threshold, and the quantity needed to restore stock. Click 'View all' to see the full inventory filtered by low stock items."
      },
      {
        title: "Recent Movements",
        content: "Live feed of all inventory transactions including inbound receipts, outbound dispatches, and adjustments. Color-coded badges indicate movement type. Click any item to view the full movements log."
      },
      {
        title: "PO Aging Widget",
        content: "Shows purchase orders grouped by delivery status: Overdue (past expected date), Due This Week, Upcoming, and No Date Set. Click any PO to navigate directly to its detail page."
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
    description: "Analytics and reporting for inventory and suppliers.",
    sections: [
      {
        title: "Inventory Report",
        content: "Category-by-category stock value breakdown with bar chart. Sortable table shows products, units, value, and % of total. Export to CSV."
      },
      {
        title: "Stock Velocity",
        content: "Analyze inventory movement speed. Shows fast/medium/slow/idle SKUs based on throughput. Days Left column shows estimated stock runway."
      },
      {
        title: "Velocity Alerts",
        content: "Configure automated email alerts for SKUs running low based on velocity. Set threshold (days), lookback window, and recipient email. Use SKU overrides to always/never include specific products."
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
    title: "Smart Picking",
    description: "Optimize pick routes, batch orders by zone, and minimize travel distance.",
    sections: [
      {
        title: "Pick Batches",
        content: [
          "Type: Batch (multiple orders), Zone (single zone), Single (express picks)",
          "Orders: number of sales orders included in the batch",
          "Items: total line items to be picked",
          "Est. Time: calculated based on walking distance and item count"
        ]
      },
      {
        title: "Route Optimization",
        content: "Click any batch row to view its optimized picking path. The visual shows steps from Start → Zone → Pack. Travel distance and estimated time are displayed. Click 'Start Picking' to launch the batch."
      },
      {
        title: "Optimization Tips",
        content: [
          "Batch by Zone: group orders sharing the same zones to minimize cross-warehouse walking",
          "Express Priority: fast-track critical or urgent orders first",
          "Fragile Handling: group fragile items separately for careful handling"
        ]
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
  }
};

export function getHelpContent(pathname: string): HelpContent | undefined {
  // Try exact match first
  if (helpContent[pathname]) {
    return helpContent[pathname];
  }
  
  // Try to match by prefix for dynamic routes
  for (const [key, content] of Object.entries(helpContent)) {
    if (pathname.startsWith(key)) {
      return content;
    }
  }
  
  return undefined;
}