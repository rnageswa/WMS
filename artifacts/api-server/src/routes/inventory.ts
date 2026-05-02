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
