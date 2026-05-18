import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  inventoryMovementsTable,
  salesOrderHistoryTable,
  purchaseOrdersTable,
  salesOrdersTable,
  poStatusHistoryTable,
  productsTable,
  binsTable,
  zonesTable,
  warehousesTable,
} from "@workspace/db/schema";
import { desc, eq, inArray } from "drizzle-orm";

const router: IRouter = Router();

// ── GET /activity/recent ─────────────────────────────────────────────────────

router.get("/activity/recent", async (_req, res) => {
  try {
    const limit = 25;

    // Fetch recent inventory movements with product + location info
    const movements = await db
      .select({
        id: inventoryMovementsTable.id,
        type: inventoryMovementsTable.movementType,
        quantity: inventoryMovementsTable.quantity,
        productName: productsTable.name,
        warehouseName: warehousesTable.name,
        createdAt: inventoryMovementsTable.createdAt,
        source: inventoryMovementsTable.referenceType,
        sourceId: inventoryMovementsTable.referenceId,
      })
      .from(inventoryMovementsTable)
      .leftJoin(productsTable, eq(inventoryMovementsTable.productId, productsTable.id))
      .leftJoin(binsTable, eq(inventoryMovementsTable.binId, binsTable.id))
      .leftJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
      .leftJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
      .orderBy(desc(inventoryMovementsTable.createdAt))
      .limit(limit);

    // Fetch sales order status changes
    const soEvents = await db
      .select({
        id: salesOrderHistoryTable.id,
        type: salesOrderHistoryTable.event,
        orderNumber: salesOrdersTable.orderNumber,
        createdAt: salesOrderHistoryTable.createdAt,
      })
      .from(salesOrderHistoryTable)
      .leftJoin(salesOrdersTable, eq(salesOrderHistoryTable.orderId, salesOrdersTable.id))
      .orderBy(desc(salesOrderHistoryTable.createdAt))
      .limit(limit);

    // Fetch PO status changes
    const poEvents = await db
      .select({
        id: poStatusHistoryTable.id,
        type: poStatusHistoryTable.event,
        poNumber: purchaseOrdersTable.poNumber,
        createdAt: poStatusHistoryTable.createdAt,
      })
      .from(poStatusHistoryTable)
      .leftJoin(purchaseOrdersTable, eq(poStatusHistoryTable.poId, purchaseOrdersTable.id))
      .orderBy(desc(poStatusHistoryTable.createdAt))
      .limit(limit);

    // Normalize and merge
    type ActivityItem = {
      id: string;
      kind: "movement" | "so_event" | "po_event";
      title: string;
      detail: string;
      timestamp: Date;
      icon: string;
      color: string;
    };

    const items: ActivityItem[] = [];

    for (const m of movements) {
      const isInbound = m.type === "inbound";
      const isOutbound = m.type === "outbound";
      items.push({
        id: `mov-${m.id}`,
        kind: "movement",
        title: `${isInbound ? "Received" : isOutbound ? "Shipped" : "Adjusted"} ${m.productName ?? "Unknown"}`,
        detail: `${isInbound ? "+" : isOutbound ? "" : "±"}${m.quantity} ${m.warehouseName ? `· ${m.warehouseName}` : ""}`,
        timestamp: m.createdAt,
        icon: isInbound ? "arrow-down-right" : isOutbound ? "arrow-up-right" : "sliders-horizontal",
        color: isInbound ? "emerald" : isOutbound ? "blue" : "amber",
      });
    }

    for (const e of soEvents) {
      const label =
        e.type === "created" ? "Order created" :
        e.type === "confirmed" ? "Order confirmed" :
        e.type === "picking_started" ? "Picking started" :
        e.type === "picking_complete" ? "Picking complete" :
        e.type === "packed" ? "Order packed" :
        e.type === "shipped" ? "Order shipped" :
        e.type === "delivered" ? "Order delivered" :
        e.type === "cancelled" ? "Order cancelled" :
        e.type;
      items.push({
        id: `so-${e.id}`,
        kind: "so_event",
        title: `${label}: ${e.orderNumber ?? "Unknown"}`,
        detail: "",
        timestamp: e.createdAt,
        icon: e.type === "shipped" ? "truck" :
             e.type === "delivered" ? "check-circle" :
             e.type === "cancelled" ? "x-circle" :
             e.type === "picking_started" ? "package" :
             "file-text",
        color: e.type === "shipped" ? "indigo" :
               e.type === "delivered" ? "emerald" :
               e.type === "cancelled" ? "red" :
               "blue",
      });
    }

    for (const e of poEvents) {
      const label =
        e.type === "created" ? "PO created" :
        e.type === "ordered" ? "PO sent" :
        e.type === "partially_received" ? "PO partially received" :
        e.type === "received" ? "PO fully received" :
        e.type === "cancelled" ? "PO cancelled" :
        e.type;
      items.push({
        id: `po-${e.id}`,
        kind: "po_event",
        title: `${label}: ${e.poNumber ?? "Unknown"}`,
        detail: "",
        timestamp: e.createdAt,
        icon: e.type === "received" ? "package-check" :
             e.type === "cancelled" ? "x-circle" :
             e.type === "ordered" ? "send" :
             "file-plus",
        color: e.type === "received" ? "emerald" :
               e.type === "cancelled" ? "red" :
               "purple",
      });
    }

    // Sort by timestamp descending, take top N
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const recent = items.slice(0, limit);

    res.json({ activities: recent });
  } catch (err) {
    console.error("Activity feed error:", err);
    res.status(500).json({ message: "Failed to fetch activity feed" });
  }
});

export default router;
