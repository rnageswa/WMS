import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  inventoryItemsTable,
  inventoryMovementsTable,
  productsTable,
  binsTable,
  zonesTable,
  warehousesTable,
  purchaseOrdersTable,
} from "@workspace/db/schema";
import { eq, and, sql, gte, lte, count, max, type SQL } from "drizzle-orm";
import { AdjustInventoryBody } from "@workspace/api-zod";
import { z } from "zod";

const router: IRouter = Router();

const binWithLocationQuery = () =>
  db
    .select({
      bin: binsTable,
      zone: {
        id: zonesTable.id,
        name: zonesTable.name,
        code: zonesTable.code,
      },
      warehouse: {
        id: warehousesTable.id,
        name: warehousesTable.name,
      },
    })
    .from(binsTable)
    .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
    .innerJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id));

// ── GET /inventory ───────────────────────────────────────────────────────────

router.get("/inventory", async (req, res) => {
  const querySchema = z.object({
    productId: z.string().uuid().optional(),
    binId: z.string().uuid().optional(),
    warehouseId: z.string().uuid().optional(),
    lowStock: z
      .string()
      .transform((v) => v === "true")
      .optional(),
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid query" });
    return;
  }
  const { productId, binId, warehouseId, lowStock } = parsed.data;

  const conditions: SQL[] = [];
  if (productId) conditions.push(eq(inventoryItemsTable.productId, productId));
  if (binId) conditions.push(eq(inventoryItemsTable.binId, binId));

  const rows = await db
    .select({
      item: inventoryItemsTable,
      product: productsTable,
      bin: binsTable,
      zone: {
        id: zonesTable.id,
        name: zonesTable.name,
        code: zonesTable.code,
      },
      warehouse: {
        id: warehousesTable.id,
        name: warehousesTable.name,
      },
    })
    .from(inventoryItemsTable)
    .innerJoin(productsTable, eq(inventoryItemsTable.productId, productsTable.id))
    .innerJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
    .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
    .innerJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(productsTable.name);

  let result = rows.map((r) => ({
    ...r.item,
    product: r.product,
    bin: { ...r.bin, zone: { ...r.zone, warehouse: r.warehouse } },
  }));

  if (warehouseId) {
    result = result.filter((r) => r.bin.zone.warehouse.id === warehouseId);
  }

  if (lowStock) {
    result = result.filter((r) => r.qtyOnHand <= r.product.reorderThreshold);
  }

  res.json(result);
});

// ── POST /inventory/adjust ───────────────────────────────────────────────────

router.post("/inventory/adjust", async (req, res) => {
  const body = AdjustInventoryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.message });
    return;
  }
  const { productId, binId, newQty, reasonCode } = body.data;

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, productId));
  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  const [bin] = await db.select().from(binsTable).where(eq(binsTable.id, binId));
  if (!bin) {
    res.status(404).json({ message: "Bin not found" });
    return;
  }

  const existingRows = await db
    .select()
    .from(inventoryItemsTable)
    .where(and(eq(inventoryItemsTable.productId, productId), eq(inventoryItemsTable.binId, binId)));

  const existing = existingRows[0];
  const oldQty = existing?.qtyOnHand ?? 0;
  const delta = newQty - oldQty;

  let updatedItem: typeof inventoryItemsTable.$inferSelect;

  if (existing) {
    const [updated] = await db
      .update(inventoryItemsTable)
      .set({ qtyOnHand: newQty, updatedAt: new Date() })
      .where(eq(inventoryItemsTable.id, existing.id))
      .returning();
    updatedItem = updated!;
  } else {
    const [created] = await db
      .insert(inventoryItemsTable)
      .values({ productId, binId, qtyOnHand: newQty })
      .returning();
    updatedItem = created!;
  }

  await db.insert(inventoryMovementsTable).values({
    productId,
    binId,
    movementType: "adjustment",
    quantity: delta,
    reasonCode,
  });

  const [row] = await db
    .select({
      item: inventoryItemsTable,
      product: productsTable,
      bin: binsTable,
      zone: { id: zonesTable.id, name: zonesTable.name, code: zonesTable.code },
      warehouse: { id: warehousesTable.id, name: warehousesTable.name },
    })
    .from(inventoryItemsTable)
    .innerJoin(productsTable, eq(inventoryItemsTable.productId, productsTable.id))
    .innerJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
    .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
    .innerJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
    .where(eq(inventoryItemsTable.id, updatedItem.id));

  if (!row) {
    res.status(500).json({ message: "Failed to fetch updated item" });
    return;
  }

  res.json({
    ...row.item,
    product: row.product,
    bin: { ...row.bin, zone: { ...row.zone, warehouse: row.warehouse } },
  });
});

// ── GET /movements ────────────────────────────────────────────────────────────

router.get("/movements", async (req, res) => {
  const querySchema = z.object({
    productId: z.string().uuid().optional(),
    binId: z.string().uuid().optional(),
    movementType: z.enum(["adjustment", "inbound", "outbound"]).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid query" });
    return;
  }
  const { productId, binId, movementType, from, to, limit } = parsed.data;

  const conditions: SQL[] = [];
  if (productId) conditions.push(eq(inventoryMovementsTable.productId, productId));
  if (binId) conditions.push(eq(inventoryMovementsTable.binId, binId));
  if (movementType) conditions.push(eq(inventoryMovementsTable.movementType, movementType));
  if (from) conditions.push(gte(inventoryMovementsTable.createdAt, new Date(from)));
  if (to) {
    const toDate = new Date(to);
    toDate.setDate(toDate.getDate() + 1);
    conditions.push(lte(inventoryMovementsTable.createdAt, toDate));
  }

  const rows = await db
    .select({
      movement: inventoryMovementsTable,
      product: productsTable,
      bin: binsTable,
      zone: { id: zonesTable.id, name: zonesTable.name, code: zonesTable.code },
      warehouse: { id: warehousesTable.id, name: warehousesTable.name },
    })
    .from(inventoryMovementsTable)
    .innerJoin(productsTable, eq(inventoryMovementsTable.productId, productsTable.id))
    .innerJoin(binsTable, eq(inventoryMovementsTable.binId, binsTable.id))
    .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
    .innerJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${inventoryMovementsTable.createdAt} DESC`)
    .limit(limit);

  res.json(
    rows.map((r) => ({
      ...r.movement,
      product: r.product,
      bin: { ...r.bin, zone: { ...r.zone, warehouse: r.warehouse } },
    })),
  );
});

// ── GET /alerts/low-stock ─────────────────────────────────────────────────────

router.get("/alerts/low-stock", async (_req, res) => {
  // Aggregate total qty per product + per-warehouse breakdown
  const rows = await db
    .select({
      productId: productsTable.id,
      skuCode: productsTable.skuCode,
      name: productsTable.name,
      category: productsTable.category,
      reorderThreshold: productsTable.reorderThreshold,
      warehouseName: warehousesTable.name,
      warehouseQty: sql<number>`coalesce(sum(${inventoryItemsTable.qtyOnHand}), 0)::int`,
    })
    .from(productsTable)
    .leftJoin(inventoryItemsTable, eq(inventoryItemsTable.productId, productsTable.id))
    .leftJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
    .leftJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
    .leftJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
    .where(eq(productsTable.isActive, true))
    .groupBy(
      productsTable.id,
      productsTable.skuCode,
      productsTable.name,
      productsTable.category,
      productsTable.reorderThreshold,
      warehousesTable.name,
    );

  // Aggregate by product
  const productMap = new Map<string, {
    productId: string;
    skuCode: string;
    name: string;
    category: string | null;
    reorderThreshold: number;
    totalQty: number;
    warehouseBreakdown: Map<string, number>;
  }>();

  for (const row of rows) {
    const existing = productMap.get(row.productId) ?? {
      productId: row.productId,
      skuCode: row.skuCode,
      name: row.name,
      category: row.category,
      reorderThreshold: row.reorderThreshold,
      totalQty: 0,
      warehouseBreakdown: new Map(),
    };
    existing.totalQty += row.warehouseQty;
    if (row.warehouseName) {
      existing.warehouseBreakdown.set(
        row.warehouseName,
        (existing.warehouseBreakdown.get(row.warehouseName) ?? 0) + row.warehouseQty,
      );
    }
    productMap.set(row.productId, existing);
  }

  // Filter to low-stock only and build result
  const alerts = Array.from(productMap.values())
    .filter((p) => p.totalQty <= p.reorderThreshold)
    .map((p) => ({
      productId: p.productId,
      skuCode: p.skuCode,
      name: p.name,
      category: p.category,
      reorderThreshold: p.reorderThreshold,
      totalQty: p.totalQty,
      shortfall: p.reorderThreshold - p.totalQty,
      // critical = zero stock; warning = at or below threshold but >0
      severity: p.totalQty === 0 ? "critical" : "warning",
      warehouseSummary: Array.from(p.warehouseBreakdown.entries()).map(([warehouseName, qty]) => ({ warehouseName, qty })),
    }))
    .sort((a, b) => b.shortfall - a.shortfall);

  res.json({
    generatedAt: new Date().toISOString(),
    totalAlerts: alerts.length,
    criticalCount: alerts.filter((a) => a.severity === "critical").length,
    warningCount: alerts.filter((a) => a.severity === "warning").length,
    alerts,
  });
});

// ── POST /cycle-counts/submit ─────────────────────────────────────────────────

const CycleCountLineZ = z.object({
  inventoryItemId: z.string().uuid(),
  physicalQty: z.number().int().min(0),
});

const SubmitCycleCountBodyZ = z.object({
  reference: z.string().optional().nullable(),
  lines: z.array(CycleCountLineZ).min(1),
});

router.post("/cycle-counts/submit", async (req, res) => {
  const body = SubmitCycleCountBodyZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }
  const { reference, lines } = body.data;

  // Fetch current inventory items + their product/bin info
  const itemIds = lines.map((l) => l.inventoryItemId);
  const items = await db
    .select({
      id: inventoryItemsTable.id,
      productId: inventoryItemsTable.productId,
      binId: inventoryItemsTable.binId,
      qtyOnHand: inventoryItemsTable.qtyOnHand,
      productName: productsTable.name,
      skuCode: productsTable.skuCode,
      binCode: binsTable.code,
    })
    .from(inventoryItemsTable)
    .innerJoin(productsTable, eq(inventoryItemsTable.productId, productsTable.id))
    .innerJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
    .where(sql`${inventoryItemsTable.id} = ANY(${sql`ARRAY[${sql.raw(itemIds.map((id) => `'${id}'::uuid`).join(","))}]`})`);

  const itemMap = new Map(items.map((i) => [i.id, i]));

  // Build discrepancies
  const discrepancies: {
    inventoryItemId: string;
    productId: string;
    binId: string;
    productName: string | null;
    skuCode: string | null;
    binCode: string | null;
    systemQty: number;
    physicalQty: number;
    variance: number;
  }[] = [];

  for (const line of lines) {
    const item = itemMap.get(line.inventoryItemId);
    if (!item) continue;
    if (item.qtyOnHand !== line.physicalQty) {
      discrepancies.push({
        inventoryItemId: item.id,
        productId: item.productId,
        binId: item.binId,
        productName: item.productName,
        skuCode: item.skuCode,
        binCode: item.binCode,
        systemQty: item.qtyOnHand,
        physicalQty: line.physicalQty,
        variance: line.physicalQty - item.qtyOnHand,
      });
    }
  }

  // Apply adjustments in a transaction
  const createdMovements: unknown[] = [];

  if (discrepancies.length > 0) {
    await db.transaction(async (tx) => {
      for (const d of discrepancies) {
        // Update inventory
        await tx
          .update(inventoryItemsTable)
          .set({ qtyOnHand: d.physicalQty, updatedAt: new Date() })
          .where(eq(inventoryItemsTable.id, d.inventoryItemId));

        // Record movement
        const [movement] = await tx
          .insert(inventoryMovementsTable)
          .values({
            movementType: "adjustment",
            productId: d.productId,
            binId: d.binId,
            quantity: d.variance,
            reasonCode: reference ? `CYCLE-COUNT ${reference}` : "CYCLE-COUNT",
          })
          .returning();
        createdMovements.push(movement);
      }
    });
  }

  res.json({
    reference: reference ?? null,
    linesScanned: lines.length,
    adjustmentCount: discrepancies.length,
    discrepancies,
    movements: createdMovements,
  });
});

// ── GET /reports/stock-value ──────────────────────────────────────────────────

router.get("/reports/stock-value", async (_req, res) => {
  // Aggregate total units per product across all bins
  const rows = await db
    .select({
      productId: productsTable.id,
      skuCode: productsTable.skuCode,
      name: productsTable.name,
      category: productsTable.category,
      unitPrice: productsTable.unitPrice,
      reorderThreshold: productsTable.reorderThreshold,
      totalUnits: sql<number>`coalesce(sum(${inventoryItemsTable.qtyOnHand}), 0)::int`,
    })
    .from(productsTable)
    .leftJoin(inventoryItemsTable, eq(inventoryItemsTable.productId, productsTable.id))
    .where(eq(productsTable.isActive, true))
    .groupBy(
      productsTable.id,
      productsTable.skuCode,
      productsTable.name,
      productsTable.category,
      productsTable.unitPrice,
      productsTable.reorderThreshold,
    );

  const products = rows.map((r) => {
    const price = r.unitPrice ? parseFloat(r.unitPrice) : 0;
    return {
      productId: r.productId,
      skuCode: r.skuCode,
      name: r.name,
      category: r.category ?? "Uncategorized",
      totalUnits: r.totalUnits,
      unitPrice: r.unitPrice ? price : null,
      totalValue: price * r.totalUnits,
      reorderThreshold: r.reorderThreshold,
      isLow: r.totalUnits <= r.reorderThreshold,
    };
  });

  // Group by category
  const catMap = new Map<string, { totalValue: number; totalUnits: number; productCount: number; lowStockCount: number }>();
  for (const p of products) {
    const cur = catMap.get(p.category) ?? { totalValue: 0, totalUnits: 0, productCount: 0, lowStockCount: 0 };
    cur.totalValue += p.totalValue;
    cur.totalUnits += p.totalUnits;
    cur.productCount += 1;
    if (p.isLow) cur.lowStockCount += 1;
    catMap.set(p.category, cur);
  }

  const categories = Array.from(catMap.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.totalValue - a.totalValue);

  const totalStockValue = products.reduce((s, p) => s + p.totalValue, 0);
  const totalUnits = products.reduce((s, p) => s + p.totalUnits, 0);

  res.json({
    generatedAt: new Date().toISOString(),
    totalStockValue,
    totalUnits,
    categories,
    products: products.sort((a, b) => b.totalValue - a.totalValue),
  });
});

// ── GET /reports/stock-velocity ───────────────────────────────────────────────

router.get("/reports/stock-velocity", async (req, res) => {
  const days = Math.min(Math.max(parseInt((req.query.days as string) ?? "30", 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Movement aggregates per product in the window
  const movementRows = await db
    .select({
      productId: inventoryMovementsTable.productId,
      totalMoves: count(inventoryMovementsTable.id),
      unitsIn: sql<number>`coalesce(sum(case when ${inventoryMovementsTable.movementType} = 'inbound' then abs(${inventoryMovementsTable.quantity}) else 0 end), 0)::int`,
      unitsOut: sql<number>`coalesce(sum(case when ${inventoryMovementsTable.movementType} = 'outbound' then abs(${inventoryMovementsTable.quantity}) else 0 end), 0)::int`,
      lastMovementAt: max(inventoryMovementsTable.createdAt),
    })
    .from(inventoryMovementsTable)
    .where(gte(inventoryMovementsTable.createdAt, since))
    .groupBy(inventoryMovementsTable.productId);

  // Current stock per product
  const stockRows = await db
    .select({
      productId: inventoryItemsTable.productId,
      currentStock: sql<number>`coalesce(sum(${inventoryItemsTable.qtyOnHand}), 0)::int`,
    })
    .from(inventoryItemsTable)
    .groupBy(inventoryItemsTable.productId);

  // All active products (base list so zero-velocity products appear)
  const products = await db
    .select({
      id: productsTable.id,
      skuCode: productsTable.skuCode,
      name: productsTable.name,
      category: productsTable.category,
      reorderThreshold: productsTable.reorderThreshold,
    })
    .from(productsTable)
    .where(eq(productsTable.isActive, true))
    .orderBy(productsTable.name);

  const movMap = new Map(movementRows.map((r) => [r.productId, r]));
  const stockMap = new Map(stockRows.map((r) => [r.productId, r.currentStock]));

  const rows = products.map((p) => {
    const m = movMap.get(p.id);
    const totalMoves = m ? Number(m.totalMoves) : 0;
    const unitsIn = m ? Number(m.unitsIn) : 0;
    const unitsOut = m ? Number(m.unitsOut) : 0;
    const totalUnitsMoved = unitsIn + unitsOut;
    const velocityPerDay = days > 0 ? Math.round((totalUnitsMoved / days) * 100) / 100 : 0;
    const currentStock = stockMap.get(p.id) ? Number(stockMap.get(p.id)) : 0;
    return {
      productId: p.id,
      skuCode: p.skuCode,
      name: p.name,
      category: p.category ?? "Uncategorized",
      totalMoves,
      unitsIn,
      unitsOut,
      totalUnitsMoved,
      velocityPerDay,
      currentStock,
      reorderThreshold: p.reorderThreshold,
      reorderRisk: currentStock <= p.reorderThreshold,
      lastMovementAt: m?.lastMovementAt ? (m.lastMovementAt as Date).toISOString() : null,
    };
  });

  // Sort by totalUnitsMoved desc, then alpha
  rows.sort((a, b) => b.totalUnitsMoved - a.totalUnitsMoved || a.name.localeCompare(b.name));

  res.json({ generatedAt: new Date().toISOString(), days, rows });
});

// ── GET /reports/inventory-csv ────────────────────────────────────────────────

router.get("/reports/inventory-csv", async (_req, res) => {
  const rows = await db
    .select({
      skuCode: productsTable.skuCode,
      productName: productsTable.name,
      category: productsTable.category,
      unitOfMeasure: productsTable.unitOfMeasure,
      unitPrice: productsTable.unitPrice,
      reorderThreshold: productsTable.reorderThreshold,
      warehouseName: warehousesTable.name,
      zoneName: zonesTable.name,
      zoneCode: zonesTable.code,
      binCode: binsTable.code,
      binName: binsTable.name,
      qtyOnHand: inventoryItemsTable.qtyOnHand,
      updatedAt: inventoryItemsTable.updatedAt,
    })
    .from(inventoryItemsTable)
    .innerJoin(productsTable, eq(inventoryItemsTable.productId, productsTable.id))
    .innerJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
    .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
    .innerJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
    .orderBy(productsTable.skuCode, warehousesTable.name, zonesTable.name, binsTable.code);

  const escape = (v: string | null | undefined) => {
    const s = v ?? "";
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const headers = [
    "SKU", "Product", "Category", "UoM", "Unit Price",
    "Reorder Threshold", "Warehouse", "Zone", "Zone Code",
    "Bin Code", "Bin Name", "Qty On Hand", "Last Updated",
  ];

  const csvLines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        escape(r.skuCode),
        escape(r.productName),
        escape(r.category),
        escape(r.unitOfMeasure),
        escape(r.unitPrice),
        String(r.reorderThreshold),
        escape(r.warehouseName),
        escape(r.zoneName),
        escape(r.zoneCode),
        escape(r.binCode),
        escape(r.binName),
        String(r.qtyOnHand),
        new Date(r.updatedAt).toISOString(),
      ].join(",")
    ),
  ];

  const date = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="wareiq-inventory-${date}.csv"`);
  res.send(csvLines.join("\n"));
});

// ── GET /dashboard/summary ────────────────────────────────────────────────────

router.get("/dashboard/summary", async (_req, res) => {
  const [totalProducts] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable);
  const [activeProducts] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(eq(productsTable.isActive, true));
  const [totalBins] = await db.select({ count: sql<number>`count(*)::int` }).from(binsTable);

  const allInventory = await db
    .select({
      qtyOnHand: inventoryItemsTable.qtyOnHand,
      reorderThreshold: productsTable.reorderThreshold,
    })
    .from(inventoryItemsTable)
    .innerJoin(productsTable, eq(inventoryItemsTable.productId, productsTable.id));

  const lowStockCount = allInventory.filter(
    (i) => i.qtyOnHand <= i.reorderThreshold,
  ).length;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [todayMovements] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventoryMovementsTable)
    .where(gte(inventoryMovementsTable.createdAt, todayStart));

  const recentRows = await db
    .select({
      movement: inventoryMovementsTable,
      product: productsTable,
      bin: binsTable,
      zone: { id: zonesTable.id, name: zonesTable.name, code: zonesTable.code },
      warehouse: { id: warehousesTable.id, name: warehousesTable.name },
    })
    .from(inventoryMovementsTable)
    .innerJoin(productsTable, eq(inventoryMovementsTable.productId, productsTable.id))
    .innerJoin(binsTable, eq(inventoryMovementsTable.binId, binsTable.id))
    .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
    .innerJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
    .orderBy(sql`${inventoryMovementsTable.createdAt} DESC`)
    .limit(5);

  res.json({
    totalProducts: totalProducts?.count ?? 0,
    activeProducts: activeProducts?.count ?? 0,
    totalBins: totalBins?.count ?? 0,
    lowStockCount,
    totalMovementsToday: todayMovements?.count ?? 0,
    recentMovements: recentRows.map((r) => ({
      ...r.movement,
      product: r.product,
      bin: { ...r.bin, zone: { ...r.zone, warehouse: r.warehouse } },
    })),
  });
});

// ── POST /transfer/commit ─────────────────────────────────────────────────────

router.post("/transfer/commit", async (req, res) => {
  const bodySchema = z.object({
    reference: z.string().nullable().optional(),
    lines: z
      .array(
        z.object({
          productId: z.string().uuid(),
          fromBinId: z.string().uuid(),
          toBinId: z.string().uuid(),
          qty: z.number().int().min(1),
        })
      )
      .min(1),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const { reference, lines } = parsed.data;

  // Validate same-bin transfers and stock levels upfront before touching anything
  const stockErrors: object[] = [];
  for (const line of lines) {
    if (line.fromBinId === line.toBinId) {
      res.status(400).json({ message: "Source and destination bin must be different" });
      return;
    }
    const [inv] = await db
      .select({ qty: inventoryItemsTable.qtyOnHand, productName: productsTable.name, binCode: binsTable.code })
      .from(inventoryItemsTable)
      .innerJoin(productsTable, eq(inventoryItemsTable.productId, productsTable.id))
      .innerJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
      .where(and(eq(inventoryItemsTable.productId, line.productId), eq(inventoryItemsTable.binId, line.fromBinId)));

    const available = inv?.qty ?? 0;
    if (available < line.qty) {
      stockErrors.push({
        productId: line.productId,
        fromBinId: line.fromBinId,
        requested: line.qty,
        available,
        productName: inv?.productName ?? "Unknown",
        binCode: inv?.binCode ?? "Unknown",
      });
    }
  }

  if (stockErrors.length > 0) {
    res.status(400).json({ message: `Insufficient stock for ${stockErrors.length} line(s)`, stockErrors });
    return;
  }

  const reasonCode = reference ? `TRANSFER:${reference}` : "TRANSFER";
  const committedMovements: object[] = [];

  const enrichMovement = async (movementId: string) => {
    const [row] = await db
      .select({
        movement: inventoryMovementsTable,
        product: productsTable,
        bin: binsTable,
        zone: { id: zonesTable.id, name: zonesTable.name, code: zonesTable.code },
        warehouse: { id: warehousesTable.id, name: warehousesTable.name },
      })
      .from(inventoryMovementsTable)
      .innerJoin(productsTable, eq(inventoryMovementsTable.productId, productsTable.id))
      .innerJoin(binsTable, eq(inventoryMovementsTable.binId, binsTable.id))
      .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
      .innerJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
      .where(eq(inventoryMovementsTable.id, movementId));
    if (!row) return null;
    return { ...row.movement, product: row.product, bin: { ...row.bin, zone: { ...row.zone, warehouse: row.warehouse } } };
  };

  for (const line of lines) {
    const { productId, fromBinId, toBinId, qty } = line;

    // Decrement source
    const [fromInv] = await db
      .select()
      .from(inventoryItemsTable)
      .where(and(eq(inventoryItemsTable.productId, productId), eq(inventoryItemsTable.binId, fromBinId)));
    await db
      .update(inventoryItemsTable)
      .set({ qtyOnHand: fromInv.qtyOnHand - qty, updatedAt: new Date() })
      .where(and(eq(inventoryItemsTable.productId, productId), eq(inventoryItemsTable.binId, fromBinId)));

    // Upsert destination
    const [toInv] = await db
      .select()
      .from(inventoryItemsTable)
      .where(and(eq(inventoryItemsTable.productId, productId), eq(inventoryItemsTable.binId, toBinId)));
    if (toInv) {
      await db
        .update(inventoryItemsTable)
        .set({ qtyOnHand: toInv.qtyOnHand + qty, updatedAt: new Date() })
        .where(and(eq(inventoryItemsTable.productId, productId), eq(inventoryItemsTable.binId, toBinId)));
    } else {
      await db.insert(inventoryItemsTable).values({ productId, binId: toBinId, qtyOnHand: qty });
    }

    // Two movements: outbound from source, inbound to destination
    const [outMovement] = await db
      .insert(inventoryMovementsTable)
      .values({ productId, binId: fromBinId, movementType: "outbound", quantity: -qty, reasonCode })
      .returning();
    const [inMovement] = await db
      .insert(inventoryMovementsTable)
      .values({ productId, binId: toBinId, movementType: "inbound", quantity: qty, reasonCode })
      .returning();

    const [outEnriched, inEnriched] = await Promise.all([
      enrichMovement(outMovement.id),
      enrichMovement(inMovement.id),
    ]);
    if (outEnriched) committedMovements.push(outEnriched);
    if (inEnriched) committedMovements.push(inEnriched);
  }

  res.json({
    reference: reference ?? null,
    linesCommitted: lines.length,
    movements: committedMovements,
  });
});

// ── POST /dispatch/commit ─────────────────────────────────────────────────────

router.post("/dispatch/commit", async (req, res) => {
  const bodySchema = z.object({
    reference: z.string().nullable().optional(),
    lines: z
      .array(
        z.object({
          productId: z.string().uuid(),
          binId: z.string().uuid(),
          qty: z.number().int().min(1),
        })
      )
      .min(1),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const { reference, lines } = parsed.data;

  // ── Pre-flight: validate all bin stock levels before touching anything ──────
  const stockErrors: object[] = [];
  for (const line of lines) {
    const { productId, binId, qty } = line;
    const [inv] = await db
      .select({
        qty: inventoryItemsTable.qtyOnHand,
        productName: productsTable.name,
        binCode: binsTable.code,
      })
      .from(inventoryItemsTable)
      .innerJoin(productsTable, eq(inventoryItemsTable.productId, productsTable.id))
      .innerJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
      .where(and(eq(inventoryItemsTable.productId, productId), eq(inventoryItemsTable.binId, binId)));

    const available = inv?.qty ?? 0;
    if (available < qty) {
      stockErrors.push({
        productId,
        binId,
        requested: qty,
        available,
        productName: inv?.productName ?? "Unknown",
        binCode: inv?.binCode ?? "Unknown",
      });
    }
  }

  if (stockErrors.length > 0) {
    res.status(400).json({
      message: `Insufficient stock for ${stockErrors.length} line(s)`,
      stockErrors,
    });
    return;
  }

  // ── Commit: decrement inventory and record outbound movements ───────────────
  const reasonCode = reference ? `DISPATCH:${reference}` : "DISPATCH";
  const committedMovements: object[] = [];

  for (const line of lines) {
    const { productId, binId, qty } = line;

    const [existing] = await db
      .select()
      .from(inventoryItemsTable)
      .where(and(eq(inventoryItemsTable.productId, productId), eq(inventoryItemsTable.binId, binId)));

    await db
      .update(inventoryItemsTable)
      .set({ qtyOnHand: existing.qtyOnHand - qty, updatedAt: new Date() })
      .where(and(eq(inventoryItemsTable.productId, productId), eq(inventoryItemsTable.binId, binId)));

    const [movement] = await db
      .insert(inventoryMovementsTable)
      .values({ productId, binId, movementType: "outbound", quantity: -qty, reasonCode })
      .returning();

    const [enriched] = await db
      .select({
        movement: inventoryMovementsTable,
        product: productsTable,
        bin: binsTable,
        zone: { id: zonesTable.id, name: zonesTable.name, code: zonesTable.code },
        warehouse: { id: warehousesTable.id, name: warehousesTable.name },
      })
      .from(inventoryMovementsTable)
      .innerJoin(productsTable, eq(inventoryMovementsTable.productId, productsTable.id))
      .innerJoin(binsTable, eq(inventoryMovementsTable.binId, binsTable.id))
      .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
      .innerJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
      .where(eq(inventoryMovementsTable.id, movement.id));

    if (enriched) {
      committedMovements.push({
        ...enriched.movement,
        product: enriched.product,
        bin: { ...enriched.bin, zone: { ...enriched.zone, warehouse: enriched.warehouse } },
      });
    }
  }

  res.json({
    reference: reference ?? null,
    linesCommitted: committedMovements.length,
    movements: committedMovements,
  });
});

// ── POST /receiving/commit ────────────────────────────────────────────────────

router.post("/receiving/commit", async (req, res) => {
  const bodySchema = z.object({
    reference: z.string().nullable().optional(),
    lines: z
      .array(
        z.object({
          productId: z.string().uuid(),
          binId: z.string().uuid(),
          qty: z.number().int().min(1),
        })
      )
      .min(1),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const { reference, lines } = parsed.data;
  const reasonCode = reference ? `RECEIPT:${reference}` : "RECEIPT";

  const committedMovements: object[] = [];

  for (const line of lines) {
    const { productId, binId, qty } = line;

    // Upsert inventory
    const existing = await db
      .select()
      .from(inventoryItemsTable)
      .where(and(eq(inventoryItemsTable.productId, productId), eq(inventoryItemsTable.binId, binId)));

    if (existing.length > 0) {
      await db
        .update(inventoryItemsTable)
        .set({ qtyOnHand: existing[0].qtyOnHand + qty, updatedAt: new Date() })
        .where(and(eq(inventoryItemsTable.productId, productId), eq(inventoryItemsTable.binId, binId)));
    } else {
      await db.insert(inventoryItemsTable).values({ productId, binId, qtyOnHand: qty });
    }

    // Record inbound movement
    const [movement] = await db
      .insert(inventoryMovementsTable)
      .values({ productId, binId, movementType: "inbound", quantity: qty, reasonCode })
      .returning();

    // Fetch enriched movement for response
    const [enriched] = await db
      .select({
        movement: inventoryMovementsTable,
        product: productsTable,
        bin: binsTable,
        zone: { id: zonesTable.id, name: zonesTable.name, code: zonesTable.code },
        warehouse: { id: warehousesTable.id, name: warehousesTable.name },
      })
      .from(inventoryMovementsTable)
      .innerJoin(productsTable, eq(inventoryMovementsTable.productId, productsTable.id))
      .innerJoin(binsTable, eq(inventoryMovementsTable.binId, binsTable.id))
      .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
      .innerJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
      .where(eq(inventoryMovementsTable.id, movement.id));

    if (enriched) {
      committedMovements.push({
        ...enriched.movement,
        product: enriched.product,
        bin: { ...enriched.bin, zone: { ...enriched.zone, warehouse: enriched.warehouse } },
      });
    }
  }

  res.json({
    reference: reference ?? null,
    linesCommitted: committedMovements.length,
    movements: committedMovements,
  });
});

// ── GET /scan ─────────────────────────────────────────────────────────────────

router.get("/scan", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) {
    res.status(400).json({ message: "Query parameter 'q' is required" });
    return;
  }

  const inventorySelect = {
    item: inventoryItemsTable,
    product: productsTable,
    bin: binsTable,
    zone: { id: zonesTable.id, name: zonesTable.name, code: zonesTable.code },
    warehouse: { id: warehousesTable.id, name: warehousesTable.name },
  };

  const buildInventoryItem = (r: {
    item: typeof inventoryItemsTable.$inferSelect;
    product: typeof productsTable.$inferSelect;
    bin: typeof binsTable.$inferSelect;
    zone: { id: string; name: string; code: string };
    warehouse: { id: string; name: string };
  }) => ({
    ...r.item,
    product: r.product,
    bin: { ...r.bin, zone: { ...r.zone, warehouse: r.warehouse } },
  });

  // 1. Try matching bins by code (case-insensitive)
  const matchingBins = await db
    .select({
      bin: binsTable,
      zone: { id: zonesTable.id, name: zonesTable.name, code: zonesTable.code },
      warehouse: { id: warehousesTable.id, name: warehousesTable.name },
    })
    .from(binsTable)
    .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
    .innerJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
    .where(sql`lower(${binsTable.code}) = lower(${q})`);

  if (matchingBins.length > 0) {
    const binsWithInventory = await Promise.all(
      matchingBins.map(async (mb) => {
        const invRows = await db
          .select(inventorySelect)
          .from(inventoryItemsTable)
          .innerJoin(productsTable, eq(inventoryItemsTable.productId, productsTable.id))
          .innerJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
          .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
          .innerJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
          .where(eq(inventoryItemsTable.binId, mb.bin.id));
        return {
          ...mb.bin,
          zone: { ...mb.zone, warehouse: mb.warehouse },
          inventory: invRows.map(buildInventoryItem),
        };
      })
    );

    res.json({
      query: q,
      matchType: "bin",
      bins: binsWithInventory,
      inventory: [],
    });
    return;
  }

  // 2. Try matching a product by SKU code or barcode
  const [matchedProduct] = await db
    .select()
    .from(productsTable)
    .where(sql`lower(${productsTable.skuCode}) = lower(${q}) OR lower(coalesce(${productsTable.barcode}, '')) = lower(${q})`);

  if (matchedProduct) {
    const invRows = await db
      .select(inventorySelect)
      .from(inventoryItemsTable)
      .innerJoin(productsTable, eq(inventoryItemsTable.productId, productsTable.id))
      .innerJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
      .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
      .innerJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
      .where(eq(inventoryItemsTable.productId, matchedProduct.id));

    res.json({
      query: q,
      matchType: "product",
      bins: [],
      product: matchedProduct,
      inventory: invRows.map(buildInventoryItem),
    });
    return;
  }

  // 3. Try matching a PO number (direct) or a GRN reference (GRN-{PONUMBER}-{YYYYMMDD})
  const grnPrefix = "GRN-";
  let poNumberToFind: string | null = null;
  let grnRef: string | null = null;

  if (q.toUpperCase().startsWith(grnPrefix)) {
    // Extract PO number: GRN-{PONUMBER}-{YYYYMMDD} → strip last "-YYYYMMDD" (8 digits)
    const withoutGrn = q.slice(grnPrefix.length); // e.g. "PO-26-0001-20260502"
    const match = withoutGrn.match(/^(.+)-\d{8}$/);
    poNumberToFind = match ? match[1] : withoutGrn;
    grnRef = q.toUpperCase();
  } else {
    poNumberToFind = q;
  }

  const [matchedPo] = await db
    .select()
    .from(purchaseOrdersTable)
    .where(sql`lower(${purchaseOrdersTable.poNumber}) = lower(${poNumberToFind})`);

  if (matchedPo) {
    const matchType = grnRef ? "grn" : "purchase_order";
    res.json({
      query: q,
      matchType,
      bins: [],
      inventory: [],
      purchaseOrder: {
        poId: matchedPo.id,
        poNumber: matchedPo.poNumber,
        supplierName: matchedPo.supplierName,
        supplierId: matchedPo.supplierId ?? null,
        status: matchedPo.status,
      },
      grnRef: grnRef ?? null,
    });
    return;
  }

  // 4. No match
  res.json({ query: q, matchType: "none", bins: [], inventory: [] });
});

export default router;
