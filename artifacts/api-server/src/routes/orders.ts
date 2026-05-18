import { Router } from "express";
import { db } from "@workspace/db";
import {
  salesOrdersTable,
  salesOrderLinesTable,
  salesOrderHistoryTable,
  inventoryItemsTable,
  inventoryMovementsTable,
  binsTable,
  zonesTable,
  productsTable,
} from "@workspace/db/schema";
import { eq, desc, and, like, sql, or } from "drizzle-orm";
import { requireAuth, requireRole, type Role } from "../middlewares/auth";
import { z } from "zod";
import { getRate, convertCurrency, getBaseCurrency } from "../services/currency.service";
import { recordOutboundCost } from "../services/costing.service";
import { getDefaultPrice } from "../services/pricing.service";

const router = Router();

const soStatusEnum = ["draft", "confirmed", "picking", "picking_complete", "packed", "shipped", "delivered", "cancelled"] as const;
const soLineStatusEnum = ["pending", "picking", "picked", "packed", "shipped", "fulfilled"] as const;

// Helper to generate order number
function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `SO-${year}${month}-${random}`;
}

// Helper to add history event
async function addHistoryEvent(orderId: string, event: string, note?: string) {
  await db.insert(salesOrderHistoryTable).values({
    orderId,
    event: event as any,
    note,
  });
}

// ── Sales Orders CRUD ───────────────────────────────────────────────────────────

// GET /sales-orders — list all
router.get("/sales-orders", requireAuth, async (req: any, res) => {
  const { q, status, customer } = req.query as { q?: string; status?: string; customer?: string };
  
  const conditions = [];
  if (q) {
    conditions.push(
      or(
        like(salesOrdersTable.orderNumber, `%${q}%`),
        like(salesOrdersTable.customerName, `%${q}%`)
      )
    );
  }
  if (status) {
    conditions.push(eq(salesOrdersTable.status, status as typeof soStatusEnum[number]));
  }
  if (customer) {
    conditions.push(like(salesOrdersTable.customerName, `%${customer}%`));
  }

  const orders = await db
    .select()
    .from(salesOrdersTable)
    .where(and(...conditions))
    .orderBy(desc(salesOrdersTable.createdAt));

  // Get line counts for each order
  const ordersWithCounts = await Promise.all(
    orders.map(async (order) => {
      const lines = await db
        .select()
        .from(salesOrderLinesTable)
        .where(eq(salesOrderLinesTable.orderId, order.id));
      return { ...order, lineCount: lines.length, totalQty: lines.reduce((sum, l) => sum + l.qtyOrdered, 0) };
    })
  );

  res.json(ordersWithCounts);
});

// GET /sales-orders/:id — get detail with lines
router.get("/sales-orders/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const [order] = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, id))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const lines = await db
    .select({
      id: salesOrderLinesTable.id,
      productId: salesOrderLinesTable.productId,
      productName: productsTable.name,
      skuCode: productsTable.skuCode,
      qtyOrdered: salesOrderLinesTable.qtyOrdered,
      qtyPicked: salesOrderLinesTable.qtyPicked,
      qtyPacked: salesOrderLinesTable.qtyPacked,
      qtyShipped: salesOrderLinesTable.qtyShipped,
      unitPrice: salesOrderLinesTable.unitPrice,
      status: salesOrderLinesTable.status,
    })
    .from(salesOrderLinesTable)
    .leftJoin(productsTable, eq(salesOrderLinesTable.productId, productsTable.id))
    .where(eq(salesOrderLinesTable.orderId, id));

  const history = await db
    .select()
    .from(salesOrderHistoryTable)
    .where(eq(salesOrderHistoryTable.orderId, id))
    .orderBy(desc(salesOrderHistoryTable.createdAt));

  res.json({ ...order, lines, history });
});

// POST /sales-orders — create new order
router.post("/sales-orders", requireAuth, async (req: any, res) => {
  const schema = z.object({
    customerName: z.string().min(1),
    customerEmail: z.string().email().optional().or(z.literal("")),
    customerPhone: z.string().optional().or(z.literal("")),
    shippingAddress: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
    expectedShipDate: z.string().optional().or(z.literal("")),
    currency: z.string().min(2).max(5).optional().default("USD"),
    lines: z.array(z.object({
      productId: z.string().uuid(),
      qtyOrdered: z.number().int().positive(),
      unitPrice: z.number().nonnegative().optional(),
    })).min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors });
    return;
  }

  const { customerName, customerEmail, customerPhone, shippingAddress, notes, expectedShipDate, currency, lines } = parsed.data;
  const orderNumber = generateOrderNumber();

  try {
    const [order] = await db
      .insert(salesOrdersTable)
      .values({
        orderNumber,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        notes,
        expectedShipDate: expectedShipDate || null,
        currency,
        status: "draft",
      })
      .returning();

    // Insert lines — auto-fill unitPrice from default price list if missing
    const baseCurrency = await getBaseCurrency();
    const orderLines = await Promise.all(lines.map(async (line) => {
      let unitPrice = line.unitPrice;
      if (unitPrice == null) {
        const defaultPrice = await getDefaultPrice(line.productId);
        if (defaultPrice) unitPrice = defaultPrice.unitPrice;
      }
      // Convert price from base currency to order currency if different
      if (unitPrice != null && currency && currency !== baseCurrency) {
        const rate = await getRate(baseCurrency, currency);
        if (rate) unitPrice = Math.round(unitPrice * rate * 100) / 100;
      }
      return {
        orderId: order.id,
        productId: line.productId,
        qtyOrdered: line.qtyOrdered,
        unitPrice: unitPrice != null ? String(unitPrice) : null,
        status: "pending" as const,
      };
    }));
    
    await db.insert(salesOrderLinesTable).values(orderLines);
    await addHistoryEvent(order.id, "created", `Order created with ${lines.length} line(s)`);

    // Fetch the created order with lines
    const createdOrder = await db
      .select()
      .from(salesOrdersTable)
      .where(eq(salesOrdersTable.id, order.id))
      .limit(1);

    res.status(201).json(createdOrder[0]);
  } catch (err: any) {
    console.error("Create order error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /sales-orders/:id — update order
router.put("/sales-orders/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const schema = z.object({
    customerName: z.string().min(1).optional(),
    customerEmail: z.string().optional(),
    customerPhone: z.string().optional(),
    shippingAddress: z.string().optional(),
    notes: z.string().optional(),
    expectedShipDate: z.string().optional().or(z.null()),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors });
    return;
  }

  const [existing] = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (existing.status !== "draft") {
    res.status(400).json({ error: "Can only edit draft orders" });
    return;
  }

  const [updated] = await db
    .update(salesOrdersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(salesOrdersTable.id, id))
    .returning();

  res.json(updated);
});

// DELETE /sales-orders/:id — delete draft order
router.delete("/sales-orders/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const [existing] = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (existing.status !== "draft") {
    res.status(400).json({ error: "Can only delete draft orders" });
    return;
  }

  await db.delete(salesOrdersTable).where(eq(salesOrdersTable.id, id));
  res.status(204).send();
});

// ── Status Transitions ───────────────────────────────────────────────────────────

// POST /sales-orders/:id/confirm — confirm order (draft -> confirmed)
router.post("/sales-orders/:id/confirm", requireAuth, async (req, res) => {
  const { id } = req.params;

  const [order] = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, id))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.status !== "draft") {
    res.status(400).json({ error: "Can only confirm draft orders" });
    return;
  }

  // Lock exchange rate at confirmation time (not for base currency)
  const baseCurrency = await getBaseCurrency();
  let exchangeRate: number | null = null;
  if (order.currency && order.currency !== baseCurrency) {
    exchangeRate = await getRate(order.currency, baseCurrency);
    if (exchangeRate == null) {
      res.status(422).json({ error: `No exchange rate found for ${order.currency} -> ${baseCurrency}. Please add a rate before confirming.` });
      return;
    }
  }

  const [updated] = await db
    .update(salesOrdersTable)
    .set({
      status: "confirmed",
      exchangeRate: exchangeRate ? String(exchangeRate) : null,
      updatedAt: new Date(),
    })
    .where(eq(salesOrdersTable.id, id))
    .returning();

  // Lock costAtTime on each line (avgCost at confirmation time for margin calc)
  const orderLines = await db
    .select()
    .from(salesOrderLinesTable)
    .where(eq(salesOrderLinesTable.orderId, id));

  for (const ol of orderLines) {
    const [inv] = await db
      .select({ avgCost: inventoryItemsTable.avgCost })
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.productId, ol.productId))
      .limit(1);
    await db
      .update(salesOrderLinesTable)
      .set({ costAtTime: inv?.avgCost ? String(inv.avgCost) : null })
      .where(eq(salesOrderLinesTable.id, ol.id));
  }

  await addHistoryEvent(id, "confirmed", "Order confirmed and ready for picking");

  res.json(updated);
});

// POST /sales-orders/:id/start-picking — start picking (confirmed -> picking)
router.post("/sales-orders/:id/start-picking", requireAuth, async (req, res) => {
  const { id } = req.params;

  const [order] = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, id))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.status !== "confirmed") {
    res.status(400).json({ error: "Can only start picking on confirmed orders" });
    return;
  }

  const [updated] = await db
    .update(salesOrdersTable)
    .set({ status: "picking", updatedAt: new Date() })
    .where(eq(salesOrdersTable.id, id))
    .returning();

  // Update line statuses
  await db
    .update(salesOrderLinesTable)
    .set({ status: "picking" })
    .where(eq(salesOrderLinesTable.orderId, id));

  await addHistoryEvent(id, "picking_started", "Picking started");

  res.json(updated);
});

// POST /sales-orders/:id/complete-picking — complete picking (picking -> picking_complete)
router.post("/sales-orders/:id/complete-picking", requireAuth, async (req, res) => {
  const { id } = req.params;

  const [order] = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, id))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.status !== "picking") {
    res.status(400).json({ error: "Can only complete picking on orders in picking status" });
    return;
  }

  // Get lines and check picking status
  const lines = await db
    .select()
    .from(salesOrderLinesTable)
    .where(eq(salesOrderLinesTable.orderId, id));

  const incomplete = lines.filter(l => l.qtyPicked < l.qtyOrdered);
  
  // Allow completing picking even with incomplete lines (for partial fulfillment)
  if (incomplete.length > 0) {
    // Update qtyPacked to match qtyPicked so we can proceed
    for (const line of lines) {
      if (line.qtyPicked > 0) {
        await db
          .update(salesOrderLinesTable)
          .set({ qtyPacked: line.qtyPicked })
          .where(eq(salesOrderLinesTable.id, line.id));
      }
    }
    console.log(`Warning: Completing picking with ${incomplete.length} incomplete line(s)`);
  }

  const [updated] = await db
    .update(salesOrdersTable)
    .set({ status: "picking_complete", updatedAt: new Date() })
    .where(eq(salesOrdersTable.id, id))
    .returning();

  // Update line statuses
  await db
    .update(salesOrderLinesTable)
    .set({ status: "picked" })
    .where(eq(salesOrderLinesTable.orderId, id));

  await addHistoryEvent(id, "picking_complete", "All items picked");

  res.json(updated);
});

// POST /sales-orders/:id/pack — pack order (picking_complete -> packed)
router.post("/sales-orders/:id/pack", requireAuth, async (req, res) => {
  const { id } = req.params;

  const [order] = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, id))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.status !== "picking_complete") {
    res.status(400).json({ error: "Can only pack orders with picking complete" });
    return;
  }

  const [updated] = await db
    .update(salesOrdersTable)
    .set({ status: "packed", updatedAt: new Date() })
    .where(eq(salesOrdersTable.id, id))
    .returning();

  // Get lines and update qtyPacked from qtyPicked
  const lines = await db
    .select()
    .from(salesOrderLinesTable)
    .where(eq(salesOrderLinesTable.orderId, id));

  // Update line statuses to packed and set qtyPacked = qtyPicked
  for (const line of lines) {
    await db
      .update(salesOrderLinesTable)
      .set({ status: "packed", qtyPacked: line.qtyPicked || 0 })
      .where(eq(salesOrderLinesTable.id, line.id));
  }

  await addHistoryEvent(id, "packed", "Order packed and ready for shipment");

  res.json(updated);
});

// POST /sales-orders/:id/ship — ship order (packed -> shipped)
router.post("/sales-orders/:id/ship", requireAuth, async (req: any, res) => {
  const { id } = req.params;
  const { trackingNumber, carrier } = req.body as { trackingNumber?: string; carrier?: string };

  const [order] = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, id))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.status !== "packed") {
    res.status(400).json({ error: "Can only ship packed orders" });
    return;
  }

  // Create inventory movements (outbound) with COGS tracking
  const lines = await db
    .select()
    .from(salesOrderLinesTable)
    .where(eq(salesOrderLinesTable.orderId, id));

  let totalCOGS = 0;

  // Get bins for each product (simplified - just pick first available bin)
  for (const line of lines) {
    const [inventoryItem] = await db
      .select()
      .from(inventoryItemsTable)
      .where(and(
        eq(inventoryItemsTable.productId, line.productId),
        sql`qty_on_hand >= ${line.qtyPacked}`
      ))
      .limit(1);

    if (!inventoryItem) {
      res.status(422).json({ error: `Insufficient inventory for product ${line.productId}. Required qty: ${line.qtyPacked}` });
      return;
    }

    {
      // Create outbound movement with cost tracking
      const [movement] = await db.insert(inventoryMovementsTable).values({
        productId: line.productId,
        binId: inventoryItem.binId,
        movementType: "outbound",
        quantity: -line.qtyPacked,
        unitCost: inventoryItem.avgCost,
        totalCost: String(Math.round(parseFloat(inventoryItem.avgCost || "0") * line.qtyPacked * 100) / 100),
        reasonCode: `DISPATCH:${order.orderNumber}`,
        referenceId: order.id,
        referenceType: "sales_order",
        createdBy: req.userId,
      }).returning();

      // Record COGS in valuation log and update inventory value
      const cogs = await recordOutboundCost(line.productId, inventoryItem.binId, movement.id, line.qtyPacked);
      totalCOGS += cogs;

      // Update inventory qty
      await db
        .update(inventoryItemsTable)
        .set({ qtyOnHand: sql`qty_on_hand - ${line.qtyPacked}` })
        .where(eq(inventoryItemsTable.id, inventoryItem.id));
    }
  }

  const [updated] = await db
    .update(salesOrdersTable)
    .set({
      status: "shipped",
      totalCogs: String(Math.round(totalCOGS * 100) / 100),
      shippedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(salesOrdersTable.id, id))
    .returning();

  // Update line statuses to shipped
  await db
    .update(salesOrderLinesTable)
    .set({ status: "shipped", qtyShipped: sql`qty_packed` })
    .where(eq(salesOrderLinesTable.orderId, id));

  await addHistoryEvent(id, "shipped", trackingNumber ? `Shipped with tracking: ${trackingNumber}` : "Order shipped");

  res.json(updated);
});

// POST /sales-orders/bulk-ship — ship multiple packed orders at once
const BulkShipSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

router.post("/sales-orders/bulk-ship", requireAuth, async (req: any, res) => {
  const body = BulkShipSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const { ids } = body.data;

  const shipped = [];
  const errors = [];

  for (const id of ids) {
    try {
      const [order] = await db.select().from(salesOrdersTable).where(eq(salesOrdersTable.id, id)).limit(1);
      if (!order) { errors.push({ id, error: "Order not found" }); continue; }
      if (order.status !== "packed") { errors.push({ id, error: `Cannot ship order in status: ${order.status}` }); continue; }

      const lines = await db.select().from(salesOrderLinesTable).where(eq(salesOrderLinesTable.orderId, id));
      let totalCOGS = 0;

      for (const line of lines) {
        const [inventoryItem] = await db.select().from(inventoryItemsTable).where(and(eq(inventoryItemsTable.productId, line.productId), sql`qty_on_hand >= ${line.qtyPacked}`)).limit(1);
        if (!inventoryItem) { errors.push({ id, error: `Insufficient inventory for product ${line.productId}` }); continue; }

        const [movement] = await db.insert(inventoryMovementsTable).values({
          productId: line.productId, binId: inventoryItem.binId, movementType: "outbound",
          quantity: -line.qtyPacked, unitCost: inventoryItem.avgCost,
          totalCost: String(Math.round(parseFloat(inventoryItem.avgCost || "0") * line.qtyPacked * 100) / 100),
          reasonCode: `DISPATCH:${order.orderNumber}`, referenceId: order.id, referenceType: "sales_order", createdBy: req.userId,
        }).returning();

        const cogs = await recordOutboundCost(line.productId, inventoryItem.binId, movement.id, line.qtyPacked);
        totalCOGS += cogs;

        await db.update(inventoryItemsTable).set({ qtyOnHand: sql`qty_on_hand - ${line.qtyPacked}` }).where(eq(inventoryItemsTable.id, inventoryItem.id));
      }

      await db.update(salesOrdersTable).set({ status: "shipped", totalCogs: String(Math.round(totalCOGS * 100) / 100), shippedAt: new Date(), updatedAt: new Date() }).where(eq(salesOrdersTable.id, id));
      await db.update(salesOrderLinesTable).set({ status: "shipped", qtyShipped: sql`qty_packed` }).where(eq(salesOrderLinesTable.orderId, id));
      await addHistoryEvent(id, "shipped", "Bulk shipped");
      shipped.push(id);
    } catch (err: any) {
      errors.push({ id, error: err.message ?? "Unknown error" });
    }
  }

  res.json({ shipped: shipped.length, shippedIds: shipped, errors });
});

// POST /sales-orders/:id/delivered — mark as delivered (shipped -> delivered)
router.post("/sales-orders/:id/delivered", requireAuth, async (req, res) => {
  const { id } = req.params;

  const [order] = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, id))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.status !== "shipped") {
    res.status(400).json({ error: "Can only mark shipped orders as delivered" });
    return;
  }

  const [updated] = await db
    .update(salesOrdersTable)
    .set({ 
      status: "delivered", 
      deliveredAt: new Date(),
      updatedAt: new Date() 
    })
    .where(eq(salesOrdersTable.id, id))
    .returning();

  // Update line statuses
  await db
    .update(salesOrderLinesTable)
    .set({ status: "fulfilled" })
    .where(eq(salesOrderLinesTable.orderId, id));

  await addHistoryEvent(id, "delivered", "Order delivered to customer");

  res.json(updated);
});

// POST /sales-orders/:id/cancel — cancel order
router.post("/sales-orders/:id/cancel", requireAuth, async (req, res) => {
  const { id } = req.params;
  const reason = req.body ? (req.body as { reason?: string }).reason : undefined;

  const [order] = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, id))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (["shipped", "delivered"].includes(order.status)) {
    res.status(400).json({ error: "Cannot cancel shipped or delivered orders" });
    return;
  }

  const [updated] = await db
    .update(salesOrdersTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(salesOrdersTable.id, id))
    .returning();

  await addHistoryEvent(id, "cancelled", reason || "Order cancelled");

  res.json(updated);
});

// ── Picking: Update line pick quantities ────────────────────────────────────────

// PUT /sales-orders/:id/lines/:lineId/pick
router.put("/sales-orders/:id/lines/:lineId/pick", requireAuth, async (req, res) => {
  const { id, lineId } = req.params;
  const { qtyPicked, binId } = req.body as { qtyPicked: number; binId?: string };

  const [order] = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, id))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (!["picking", "picking_complete"].includes(order.status)) {
    res.status(400).json({ error: "Order is not in picking state" });
    return;
  }

  const [line] = await db
    .select()
    .from(salesOrderLinesTable)
    .where(and(eq(salesOrderLinesTable.id, lineId), eq(salesOrderLinesTable.orderId, id)))
    .limit(1);

  if (!line) {
    res.status(404).json({ error: "Line not found" });
    return;
  }

  if (qtyPicked > line.qtyOrdered) {
    res.status(400).json({ error: "Cannot pick more than ordered" });
    return;
  }

  const [updated] = await db
    .update(salesOrderLinesTable)
    .set({ qtyPicked, status: qtyPicked === line.qtyOrdered ? "picked" : "picking" })
    .where(eq(salesOrderLinesTable.id, lineId))
    .returning();

  res.json(updated);
});

// ── Pick List ─────────────────────────────────────────────────────────────────

router.get("/sales-orders/:id/pick-list", requireAuth, async (req, res) => {
  const { id } = req.params;

  const [order] = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, id))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const lines = await db
    .select({
      id: salesOrderLinesTable.id,
      productId: salesOrderLinesTable.productId,
      qtyOrdered: salesOrderLinesTable.qtyOrdered,
      qtyPicked: salesOrderLinesTable.qtyPicked,
      skuCode: productsTable.skuCode,
      productName: productsTable.name,
      binCode: binsTable.code,
      binName: binsTable.name,
      zoneName: zonesTable.name,
    })
    .from(salesOrderLinesTable)
    .leftJoin(productsTable, eq(salesOrderLinesTable.productId, productsTable.id))
    .where(eq(salesOrderLinesTable.orderId, id));

  // Get bin info for each line
  const linesWithBins = await Promise.all(
    lines.map(async (line) => {
      const inventoryItems = await db
        .select({
          binId: inventoryItemsTable.binId,
          qtyOnHand: inventoryItemsTable.qtyOnHand,
          binCode: binsTable.code,
          binName: binsTable.name,
          zoneName: zonesTable.name,
        })
        .from(inventoryItemsTable)
        .leftJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
        .leftJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
        .where(and(
          eq(inventoryItemsTable.productId, line.productId),
          sql`qty_on_hand > 0`
        ))
        .limit(5); // Get up to 5 bin locations

      return { ...line, locations: inventoryItems };
    })
  );

  res.json({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    status: order.status,
    generatedAt: new Date().toISOString(),
    lines: linesWithBins,
  });
});

// ── Packing Slip ───────────────────────────────────────────────────────────────

router.get("/sales-orders/:id/packing-slip", requireAuth, async (req, res) => {
  const { id } = req.params;

  const [order] = await db
    .select()
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, id))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const lines = await db
    .select({
      id: salesOrderLinesTable.id,
      productId: salesOrderLinesTable.productId,
      qtyOrdered: salesOrderLinesTable.qtyOrdered,
      qtyPicked: salesOrderLinesTable.qtyPicked,
      qtyPacked: salesOrderLinesTable.qtyPacked,
      skuCode: productsTable.skuCode,
      productName: productsTable.name,
      unitPrice: salesOrderLinesTable.unitPrice,
    })
    .from(salesOrderLinesTable)
    .leftJoin(productsTable, eq(salesOrderLinesTable.productId, productsTable.id))
    .where(eq(salesOrderLinesTable.orderId, id));

  const totalItems = lines.reduce((sum, l) => sum + (l.qtyPacked || l.qtyPicked || 0), 0);
  const totalValue = lines.reduce((sum, l) => sum + ((l.qtyPacked || l.qtyPicked || 0) * (parseFloat(l.unitPrice || "0") || 0)), 0);

  res.json({
    packingSlipNumber: `PS-${order.orderNumber}`,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    shippingAddress: order.shippingAddress,
    customerEmail: order.customerEmail,
    status: order.status,
    createdAt: new Date().toISOString(),
    lines: lines.map(l => ({
      sku: l.skuCode,
      product: l.productName,
      qtyPacked: l.qtyPacked || l.qtyPicked || 0,
      unitPrice: l.unitPrice,
      lineTotal: ((l.qtyPacked || l.qtyPicked || 0) * (parseFloat(l.unitPrice || "0") || 0)).toFixed(2),
    })),
    summary: {
      totalLines: lines.length,
      totalItems,
      totalValue: totalValue.toFixed(2),
    },
  });
});

// ── Export ─────────────────────────────────────────────────────────────────────

router.get("/sales-orders/export", requireAuth, async (req, res) => {
  const orders = await db
    .select()
    .from(salesOrdersTable)
    .orderBy(desc(salesOrdersTable.createdAt));

  const lines = await db.select().from(salesOrderLinesTable);
  const linesByOrder = lines.reduce((acc, line) => {
    if (!acc[line.orderId]) acc[line.orderId] = [];
    acc[line.orderId].push(line);
    return acc;
  }, {} as Record<string, typeof lines>);

  // Build CSV
  const headers = ["Order Number", "Customer", "Status", "Created At", "SKU", "Product", "Qty", "Unit Price"];
  const rows: string[][] = [];

  for (const order of orders) {
    const orderLines = linesByOrder[order.id] || [];
    if (orderLines.length === 0) {
      rows.push([order.orderNumber, order.customerName, order.status, String(order.createdAt), "", "", "", ""]);
    } else {
      for (const line of orderLines) {
        rows.push([
          order.orderNumber,
          order.customerName,
          order.status,
          String(order.createdAt),
          "", // SKU - would need join
          line.productId, // Would need join for name
          line.qtyOrdered.toString(),
          line.unitPrice || "",
        ]);
      }
    }
  }

  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="sales-orders-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
});

export default router;