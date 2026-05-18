import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  pickWavesTable,
  pickWaveOrdersTable,
  pickWaveZoneStopsTable,
} from "@workspace/db/schema";
import {
  pickingTasksTable,
  pickingLinesTable,
  salesOrdersTable,
  salesOrderLinesTable,
  productsTable,
  binsTable,
  zonesTable,
  inventoryItemsTable,
} from "@workspace/db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// ── Helper: generate wave number ──────────────────────────────────────────────

function generateWaveNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `WAVE-${yy}${mm}${dd}-${rand}`;
}

// ── GET /picking/waves — list waves ────────────────────────────────────────────

router.get("/picking/waves", async (req, res) => {
  const statusFilter = req.query.status as string | undefined;
  const conditions = statusFilter
    ? eq(pickWavesTable.status, statusFilter)
    : undefined;

  const waves = await db
    .select()
    .from(pickWavesTable)
    .where(conditions)
    .orderBy(desc(pickWavesTable.createdAt))
    .limit(50);

  res.json({ waves });
});

// ── GET /picking/waves/suggest — suggest orders to group into a wave ───────────

router.get("/picking/waves/suggest", async (_req, res) => {
  // Find all orders in "picking" status that don't have an active wave assignment
  const activeWaveOrderIds = db
    .select({ orderId: pickWaveOrdersTable.orderId })
    .from(pickWaveOrdersTable)
    .innerJoin(pickWavesTable, eq(pickWaveOrdersTable.waveId, pickWavesTable.id))
    .where(
      sql`${pickWavesTable.status} IN ('draft','ready','picking')`
    );

  const availableOrders = await db
    .select({
      id: salesOrdersTable.id,
      orderNumber: salesOrdersTable.orderNumber,
      customerName: salesOrdersTable.customerName,
      createdAt: salesOrdersTable.createdAt,
    })
    .from(salesOrdersTable)
    .where(
      and(
        eq(salesOrdersTable.status, "picking"),
        sql`${salesOrdersTable.id} NOT IN (${activeWaveOrderIds})`
      )
    )
    .orderBy(salesOrdersTable.createdAt)
    .limit(20);

  // For each order, get zone distribution
  const ordersWithZones = await Promise.all(
    availableOrders.map(async (order) => {
      const lines = await db
        .select({
          productId: salesOrderLinesTable.productId,
        })
        .from(salesOrderLinesTable)
        .where(eq(salesOrderLinesTable.orderId, order.id));

      const productIds = lines.map((l) => l.productId);
      const zones = new Set<string>();

      if (productIds.length > 0) {
        const invItems = await db
          .select({ zoneId: zonesTable.id, zoneName: zonesTable.name })
          .from(inventoryItemsTable)
          .innerJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
          .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
          .where(
            and(
              inArray(inventoryItemsTable.productId, productIds),
              sql`${inventoryItemsTable.qtyOnHand} > 0`
            )
          );

        invItems.forEach((i) => zones.add(i.zoneName));
      }

      return {
        ...order,
        lineCount: lines.length,
        zones: Array.from(zones),
      };
    })
  );

  res.json({ orders: ordersWithZones });
});

// ── POST /picking/waves — create a wave from selected orders ───────────────────

const createWaveSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1),
});

router.post("/picking/waves", async (req, res) => {
  const parsed = createWaveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
    return;
  }

  const { orderIds } = parsed.data;

  // Verify all orders exist and are in picking state
  const orders = await db
    .select()
    .from(salesOrdersTable)
    .where(inArray(salesOrdersTable.id, orderIds));

  if (orders.length !== orderIds.length) {
    res.status(400).json({ message: "One or more orders not found" });
    return;
  }

  const invalidOrders = orders.filter((o) => !["confirmed", "picking"].includes(o.status));
  if (invalidOrders.length > 0) {
    res.status(400).json({
      message: `Orders must be confirmed or in picking: ${invalidOrders.map((o) => o.orderNumber).join(", ")}`,
    });
    return;
  }

  const waveNumber = generateWaveNumber();

  // Create wave
  const [wave] = await db
    .insert(pickWavesTable)
    .values({
      waveNumber,
      status: "ready",
      totalOrders: orders.length,
    })
    .returning();

  // Create wave orders + picking tasks + compute zone stops
  let totalLines = 0;
  let totalUnits = 0;
  const zoneStopMap: Record<string, { zoneId: string; zoneName: string; lines: number; units: number }> = {};

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];

    // Create wave order link
    await db.insert(pickWaveOrdersTable).values({
      waveId: wave.id,
      orderId: order.id,
      sortOrder: i,
    });

    // Create picking task if order is confirmed
    if (order.status === "confirmed") {
      await db
        .update(salesOrdersTable)
        .set({ status: "picking", updatedAt: new Date() })
        .where(eq(salesOrdersTable.id, order.id));
    }

    // Find or create picking task
    const [existingTask] = await db
      .select()
      .from(pickingTasksTable)
      .where(
        and(
          eq(pickingTasksTable.orderId, order.id),
          sql`${pickingTasksTable.status} NOT IN ('completed','cancelled')`
        )
      )
      .limit(1);

    let taskId = existingTask?.id;
    if (!taskId) {
      const [newTask] = await db
        .insert(pickingTasksTable)
        .values({ orderId: order.id, status: "pending" })
        .returning();
      taskId = newTask.id;
    }

    // Update wave order with task id
    await db
      .update(pickWaveOrdersTable)
      .set({ taskId })
      .where(
        and(
          eq(pickWaveOrdersTable.waveId, wave.id),
          eq(pickWaveOrdersTable.orderId, order.id)
        )
      );

    // Get order lines
    const lines = await db
      .select()
      .from(salesOrderLinesTable)
      .where(eq(salesOrderLinesTable.orderId, order.id));

    totalLines += lines.length;

    // Create picking lines with zone-aware bin selection
    for (const line of lines) {
      const qtyToPick = line.qtyOrdered - (line.qtyPicked || 0);
      totalUnits += qtyToPick;

      // Find best bin with inventory
      const [inv] = await db
        .select({
          binId: inventoryItemsTable.binId,
          qtyOnHand: inventoryItemsTable.qtyOnHand,
          zoneId: zonesTable.id,
          zoneName: zonesTable.name,
        })
        .from(inventoryItemsTable)
        .innerJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
        .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
        .where(
          and(
            eq(inventoryItemsTable.productId, line.productId),
            sql`${inventoryItemsTable.qtyOnHand} > 0`
          )
        )
        .orderBy(sql`${inventoryItemsTable.qtyOnHand} DESC`)
        .limit(1);

      if (inv) {
        const zoneKey = inv.zoneId;
        if (!zoneStopMap[zoneKey]) {
          zoneStopMap[zoneKey] = { zoneId: inv.zoneId, zoneName: inv.zoneName, lines: 0, units: 0 };
        }
        zoneStopMap[zoneKey].lines += 1;
        zoneStopMap[zoneKey].units += qtyToPick;
      }

      // Check if picking line already exists
      const [existingLine] = await db
        .select()
        .from(pickingLinesTable)
        .where(
          and(
            eq(pickingLinesTable.taskId, taskId!),
            eq(pickingLinesTable.orderLineId, line.id)
          )
        )
        .limit(1);

      if (!existingLine) {
        await db.insert(pickingLinesTable).values({
          taskId: taskId!,
          orderLineId: line.id,
          productId: line.productId,
          binId: inv?.binId || null,
          qtyToPick,
          qtyPicked: 0,
          status: "pending",
        });
      }
    }
  }

  // Create zone stops sorted by stop order
  const zoneStops = Object.values(zoneStopMap)
    .sort((a, b) => a.zoneName.localeCompare(b.zoneName));

  for (let i = 0; i < zoneStops.length; i++) {
    await db.insert(pickWaveZoneStopsTable).values({
      waveId: wave.id,
      zoneId: zoneStops[i].zoneId,
      stopOrder: i,
      linesCount: zoneStops[i].lines,
      unitsCount: zoneStops[i].units,
    });
  }

  // Update wave totals
  await db
    .update(pickWavesTable)
    .set({ totalLines, totalUnits, updatedAt: new Date() })
    .where(eq(pickWavesTable.id, wave.id));

  // Return wave with details
  const waveOrders = await db
    .select({
      orderId: pickWaveOrdersTable.orderId,
      sortOrder: pickWaveOrdersTable.sortOrder,
      orderNumber: salesOrdersTable.orderNumber,
      customerName: salesOrdersTable.customerName,
    })
    .from(pickWaveOrdersTable)
    .innerJoin(salesOrdersTable, eq(pickWaveOrdersTable.orderId, salesOrdersTable.id))
    .where(eq(pickWaveOrdersTable.waveId, wave.id))
    .orderBy(pickWaveOrdersTable.sortOrder);

  res.status(201).json({
    wave: { ...wave, totalLines, totalUnits },
    orders: waveOrders,
    zoneStops,
  });
});

// ── GET /picking/waves/:id — wave detail with optimized pick path ──────────────

router.get("/picking/waves/:id", async (req, res) => {
  const { id } = req.params;

  const [wave] = await db
    .select()
    .from(pickWavesTable)
    .where(eq(pickWavesTable.id, id))
    .limit(1);

  if (!wave) {
    res.status(404).json({ message: "Wave not found" });
    return;
  }

  // Get zone stops
  const zoneStops = await db
    .select({
      id: pickWaveZoneStopsTable.id,
      zoneId: pickWaveZoneStopsTable.zoneId,
      zoneName: zonesTable.name,
      stopOrder: pickWaveZoneStopsTable.stopOrder,
      linesCount: pickWaveZoneStopsTable.linesCount,
      unitsCount: pickWaveZoneStopsTable.unitsCount,
    })
    .from(pickWaveZoneStopsTable)
    .innerJoin(zonesTable, eq(pickWaveZoneStopsTable.zoneId, zonesTable.id))
    .where(eq(pickWaveZoneStopsTable.waveId, id))
    .orderBy(pickWaveZoneStopsTable.stopOrder);

  // Get all picking lines across all tasks in this wave, grouped by zone
  const waveTasks = await db
    .select({ taskId: pickWaveOrdersTable.taskId })
    .from(pickWaveOrdersTable)
    .where(eq(pickWaveOrdersTable.waveId, id));

  const taskIds = waveTasks.map((t) => t.taskId).filter((t): t is string => !!t);

  let pickLines: any[] = [];
  if (taskIds.length > 0) {
    pickLines = await db
      .select({
        id: pickingLinesTable.id,
        taskId: pickingLinesTable.taskId,
        orderLineId: pickingLinesTable.orderLineId,
        productId: pickingLinesTable.productId,
        binId: pickingLinesTable.binId,
        qtyToPick: pickingLinesTable.qtyToPick,
        qtyPicked: pickingLinesTable.qtyPicked,
        status: pickingLinesTable.status,
        pickedAt: pickingLinesTable.pickedAt,
        skuCode: productsTable.skuCode,
        productName: productsTable.name,
        binCode: binsTable.code,
        zoneId: zonesTable.id,
        zoneName: zonesTable.name,
        zoneCode: zonesTable.code,
        orderId: salesOrdersTable.id,
        orderNumber: salesOrdersTable.orderNumber,
      })
      .from(pickingLinesTable)
      .innerJoin(productsTable, eq(pickingLinesTable.productId, productsTable.id))
      .leftJoin(binsTable, eq(pickingLinesTable.binId, binsTable.id))
      .leftJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
      .leftJoin(pickWaveOrdersTable, eq(pickingLinesTable.taskId, pickWaveOrdersTable.taskId))
      .leftJoin(salesOrdersTable, eq(pickWaveOrdersTable.orderId, salesOrdersTable.id))
      .where(
        and(
          inArray(pickingLinesTable.taskId, taskIds),
          sql`${pickingLinesTable.status} IN ('pending','picking')`
        )
      )
      .orderBy(zonesTable.name, binsTable.code);
  }

  // Group lines by zone for optimized path
  const linesByZone: Record<string, any[]> = {};
  for (const line of pickLines) {
    const zoneKey = line.zoneName || "Unknown";
    if (!linesByZone[zoneKey]) linesByZone[zoneKey] = [];
    linesByZone[zoneKey].push(line);
  }

  res.json({
    wave,
    zoneStops,
    pickLines,
    linesByZone,
  });
});

// ── PUT /picking/waves/:id/start — start wave ──────────────────────────────────

router.put("/picking/waves/:id/start", async (req, res) => {
  const { id } = req.params;

  const [wave] = await db
    .select()
    .from(pickWavesTable)
    .where(eq(pickWavesTable.id, id))
    .limit(1);

  if (!wave) {
    res.status(404).json({ message: "Wave not found" });
    return;
  }

  if (wave.status !== "ready") {
    res.status(400).json({ message: `Wave cannot be started (status: ${wave.status})` });
    return;
  }

  // Start all tasks in wave
  const waveTasks = await db
    .select({ taskId: pickWaveOrdersTable.taskId })
    .from(pickWaveOrdersTable)
    .where(eq(pickWaveOrdersTable.waveId, id));

  const taskIds = waveTasks.map((t) => t.taskId).filter((t): t is string => !!t);

  if (taskIds.length > 0) {
    await db
      .update(pickingTasksTable)
      .set({ status: "in_progress", startedAt: new Date(), updatedAt: new Date() })
      .where(and(inArray(pickingTasksTable.id, taskIds), sql`${pickingTasksTable.status} IN ('pending','assigned')`));

    await db
      .update(pickingLinesTable)
      .set({ status: "picking" })
      .where(and(inArray(pickingLinesTable.taskId, taskIds), eq(pickingLinesTable.status, "pending")));
  }

  const [updated] = await db
    .update(pickWavesTable)
    .set({ status: "picking", startedAt: new Date(), updatedAt: new Date() })
    .where(eq(pickWavesTable.id, id))
    .returning();

  res.json(updated);
});

// ── PUT /picking/waves/:id/pick-line — pick a line within a wave ────────────────

const pickLineSchema = z.object({
  lineId: z.string().uuid(),
  qtyPicked: z.number().int().min(0),
  binId: z.string().uuid().optional(),
});

router.put("/picking/waves/:id/pick-line", async (req, res) => {
  const { id: waveId } = req.params;
  const parsed = pickLineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
    return;
  }

  const { lineId, qtyPicked, binId } = parsed.data;

  // Get the picking line
  const [line] = await db
    .select()
    .from(pickingLinesTable)
    .where(eq(pickingLinesTable.id, lineId))
    .limit(1);

  if (!line) {
    res.status(404).json({ message: "Pick line not found" });
    return;
  }

  // Verify line belongs to this wave
  const [waveOrder] = await db
    .select()
    .from(pickWaveOrdersTable)
    .where(
      and(
        eq(pickWaveOrdersTable.waveId, waveId),
        eq(pickWaveOrdersTable.taskId, line.taskId)
      )
    )
    .limit(1);

  if (!waveOrder) {
    res.status(400).json({ message: "Line does not belong to this wave" });
    return;
  }

  if (qtyPicked > line.qtyToPick) {
    res.status(400).json({ message: "Cannot pick more than required" });
    return;
  }

  // Update picking line
  const [updatedLine] = await db
    .update(pickingLinesTable)
    .set({
      qtyPicked,
      binId: binId || line.binId,
      status: qtyPicked >= line.qtyToPick ? "picked" : "picking",
      pickedAt: qtyPicked > 0 ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(pickingLinesTable.id, lineId))
    .returning();

  // Update sales order line
  await db
    .update(salesOrderLinesTable)
    .set({
      qtyPicked: sql`qty_picked + ${qtyPicked - line.qtyPicked}`,
      status: qtyPicked >= line.qtyToPick ? "picked" : "picking",
    })
    .where(eq(salesOrderLinesTable.id, line.orderLineId));

  // Update wave progress
  if (qtyPicked >= line.qtyToPick && line.status !== "picked") {
    await db
      .update(pickWavesTable)
      .set({
        pickedLines: sql`picked_lines + 1`,
        pickedUnits: sql`picked_units + ${qtyPicked}`,
        updatedAt: new Date(),
      })
      .where(eq(pickWavesTable.id, waveId));
  } else {
    await db
      .update(pickWavesTable)
      .set({
        pickedUnits: sql`picked_units + ${qtyPicked - line.qtyPicked}`,
        updatedAt: new Date(),
      })
      .where(eq(pickWavesTable.id, waveId));
  }

  res.json(updatedLine);
});

// ── PUT /picking/waves/:id/complete — complete wave ────────────────────────────

router.put("/picking/waves/:id/complete", async (req, res) => {
  const { id } = req.params;

  const [wave] = await db
    .select()
    .from(pickWavesTable)
    .where(eq(pickWavesTable.id, id))
    .limit(1);

  if (!wave) {
    res.status(404).json({ message: "Wave not found" });
    return;
  }

  if (wave.status !== "picking") {
    res.status(400).json({ message: `Wave cannot be completed (status: ${wave.status})` });
    return;
  }

  // Get all tasks
  const waveTasks = await db
    .select({ taskId: pickWaveOrdersTable.taskId, orderId: pickWaveOrdersTable.orderId })
    .from(pickWaveOrdersTable)
    .where(eq(pickWaveOrdersTable.waveId, id));

  const taskIds = waveTasks.map((t) => t.taskId).filter((t): t is string => !!t);

  // Check all lines picked
  if (taskIds.length > 0) {
    const incomplete = await db
      .select()
      .from(pickingLinesTable)
      .where(
        and(
          inArray(pickingLinesTable.taskId, taskIds),
          sql`${pickingLinesTable.status} IN ('pending','picking')`
        )
      );

    if (incomplete.length > 0) {
      res.status(400).json({
        message: "Not all lines are picked",
        incompleteLines: incomplete.length,
      });
      return;
    }

    // Complete all tasks
    await db
      .update(pickingTasksTable)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(inArray(pickingTasksTable.id, taskIds));

    // Update all orders to picking_complete
    const orderIds = waveTasks.map((t) => t.orderId);
    if (orderIds.length > 0) {
      await db
        .update(salesOrdersTable)
        .set({ status: "picking_complete", updatedAt: new Date() })
        .where(inArray(salesOrdersTable.id, orderIds));
    }
  }

  const [updated] = await db
    .update(pickWavesTable)
    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(pickWavesTable.id, id))
    .returning();

  res.json(updated);
});

export default router;
