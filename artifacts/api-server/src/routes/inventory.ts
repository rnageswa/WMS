import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  inventoryItemsTable,
  inventoryMovementsTable,
  productsTable,
  binsTable,
  zonesTable,
  warehousesTable,
} from "@workspace/db/schema";
import { eq, and, sql, gte, lte, type SQL } from "drizzle-orm";
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

  // 3. No match
  res.json({ query: q, matchType: "none", bins: [], inventory: [] });
});

export default router;
