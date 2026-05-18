import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  warehousesTable,
  zonesTable,
  binsTable,
  inventoryMovementsTable,
  inventoryItemsTable,
  productsTable,
} from "@workspace/db/schema";
import { eq, inArray, and, count, max, gte, sql, desc } from "drizzle-orm";
import {
  CreateWarehouseBody,
  UpdateWarehouseBody,
  CreateZoneBody,
  CreateBinBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── GET /locations/bin-activity — movement counts per bin within a zone ───

router.get("/locations/bin-activity", async (req, res) => {
  const zoneId = req.query.zoneId as string | undefined;
  if (!zoneId) {
    res.status(400).json({ message: "zoneId is required" });
    return;
  }
  const days = Math.min(Math.max(parseInt((req.query.days as string) ?? "30", 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      binId: binsTable.id,
      binCode: binsTable.code,
      binName: binsTable.name,
      movementCount: count(inventoryMovementsTable.id),
      lastMovementAt: max(inventoryMovementsTable.createdAt),
    })
    .from(binsTable)
    .leftJoin(
      inventoryMovementsTable,
      and(
        eq(inventoryMovementsTable.binId, binsTable.id),
        gte(inventoryMovementsTable.createdAt, since),
      ),
    )
    .where(eq(binsTable.zoneId, zoneId))
    .groupBy(binsTable.id, binsTable.code, binsTable.name)
    .orderBy(sql`count(${inventoryMovementsTable.id}) desc`, binsTable.code);

  res.json(
    rows.map((r) => ({
      ...r,
      movementCount: Number(r.movementCount),
      lastMovementAt: r.lastMovementAt ? (r.lastMovementAt as Date).toISOString() : null,
    })),
  );
});

// ── GET /locations/zone-activity — movement counts per zone ────────────────

router.get("/locations/zone-activity", async (req, res) => {
  const days = Math.min(Math.max(parseInt((req.query.days as string) ?? "30", 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      zoneId: zonesTable.id,
      zoneName: zonesTable.name,
      zoneCode: zonesTable.code,
      warehouseId: warehousesTable.id,
      warehouseName: warehousesTable.name,
      movementCount: count(inventoryMovementsTable.id),
      lastMovementAt: max(inventoryMovementsTable.createdAt),
    })
    .from(zonesTable)
    .innerJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
    .leftJoin(binsTable, eq(binsTable.zoneId, zonesTable.id))
    .leftJoin(
      inventoryMovementsTable,
      and(
        eq(inventoryMovementsTable.binId, binsTable.id),
        gte(inventoryMovementsTable.createdAt, since),
      ),
    )
    .groupBy(zonesTable.id, zonesTable.name, zonesTable.code, warehousesTable.id, warehousesTable.name)
    .orderBy(sql`count(${inventoryMovementsTable.id}) desc`);

  res.json(
    rows.map((r) => ({
      ...r,
      movementCount: Number(r.movementCount),
      lastMovementAt: r.lastMovementAt ? (r.lastMovementAt as Date).toISOString() : null,
    })),
  );
});

// ── GET /bins — all bins with zone+warehouse enrichment ────────────────────

router.get("/bins", async (req, res) => {
  const warehouseId = req.query.warehouseId as string | undefined;
  const zoneId = req.query.zoneId as string | undefined;

  const conditions = [];
  if (zoneId) conditions.push(eq(binsTable.zoneId, zoneId));
  if (warehouseId) conditions.push(eq(zonesTable.warehouseId, warehouseId));

  const rows = await db
    .select({
      bin: binsTable,
      zone: { id: zonesTable.id, name: zonesTable.name, code: zonesTable.code },
      warehouse: { id: warehousesTable.id, name: warehousesTable.name },
    })
    .from(binsTable)
    .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
    .innerJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(warehousesTable.name, zonesTable.code, binsTable.code);

  res.json(
    rows.map((r) => ({
      ...r.bin,
      zone: { ...r.zone, warehouse: r.warehouse },
    }))
  );
});

// ── Warehouses ──────────────────────────────────────────────────────────────

router.get("/warehouses", async (_req, res) => {
  const warehouses = await db.select().from(warehousesTable).orderBy(warehousesTable.name);
  res.json(warehouses);
});

router.post("/warehouses", async (req, res) => {
  const body = CreateWarehouseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.message });
    return;
  }
  const [warehouse] = await db.insert(warehousesTable).values(body.data).returning();
  res.status(201).json(warehouse);
});

router.get("/warehouses/:id", async (req, res) => {
  const [warehouse] = await db
    .select()
    .from(warehousesTable)
    .where(eq(warehousesTable.id, req.params.id));
  if (!warehouse) {
    res.status(404).json({ message: "Warehouse not found" });
    return;
  }

  const zones = await db
    .select()
    .from(zonesTable)
    .where(eq(zonesTable.warehouseId, req.params.id))
    .orderBy(zonesTable.code);

  const zoneIds = zones.map((z) => z.id);
  const allBins =
    zoneIds.length > 0
      ? await db
          .select()
          .from(binsTable)
          .where(
            zoneIds.length === 1
              ? eq(binsTable.zoneId, zoneIds[0]!)
              : inArray(binsTable.zoneId, zoneIds),
          )
          .orderBy(binsTable.code)
      : [];

  const zonesWithBins = zones.map((z) => ({
    ...z,
    bins: allBins.filter((b) => b.zoneId === z.id),
  }));

  res.json({ ...warehouse, zones: zonesWithBins });
});

router.patch("/warehouses/:id", async (req, res) => {
  const body = UpdateWarehouseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.message });
    return;
  }
  const [warehouse] = await db
    .update(warehousesTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(warehousesTable.id, req.params.id))
    .returning();
  if (!warehouse) {
    res.status(404).json({ message: "Warehouse not found" });
    return;
  }
  res.json(warehouse);
});

// ── Zones ────────────────────────────────────────────────────────────────────

router.get("/warehouses/:id/zones", async (req, res) => {
  const [warehouse] = await db
    .select()
    .from(warehousesTable)
    .where(eq(warehousesTable.id, req.params.id));
  if (!warehouse) {
    res.status(404).json({ message: "Warehouse not found" });
    return;
  }
  const zones = await db
    .select()
    .from(zonesTable)
    .where(eq(zonesTable.warehouseId, req.params.id))
    .orderBy(zonesTable.code);
  res.json(zones);
});

router.post("/warehouses/:id/zones", async (req, res) => {
  const [warehouse] = await db
    .select()
    .from(warehousesTable)
    .where(eq(warehousesTable.id, req.params.id));
  if (!warehouse) {
    res.status(404).json({ message: "Warehouse not found" });
    return;
  }
  const body = CreateZoneBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.message });
    return;
  }
  const [zone] = await db
    .insert(zonesTable)
    .values({ ...body.data, warehouseId: req.params.id })
    .returning();
  res.status(201).json(zone);
});

// ── Bins ─────────────────────────────────────────────────────────────────────

router.get("/zones/:id/bins", async (req, res) => {
  const [zone] = await db.select().from(zonesTable).where(eq(zonesTable.id, req.params.id));
  if (!zone) {
    res.status(404).json({ message: "Zone not found" });
    return;
  }
  const bins = await db
    .select()
    .from(binsTable)
    .where(eq(binsTable.zoneId, req.params.id))
    .orderBy(binsTable.code);
  res.json(bins);
});

router.post("/zones/:id/bins", async (req, res) => {
  const [zone] = await db.select().from(zonesTable).where(eq(zonesTable.id, req.params.id));
  if (!zone) {
    res.status(404).json({ message: "Zone not found" });
    return;
  }
  const body = CreateBinBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.message });
    return;
  }
  try {
    const [bin] = await db
      .insert(binsTable)
      .values({ ...body.data, zoneId: req.params.id })
      .returning();
    res.status(201).json(bin);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) {
      res.status(409).json({ message: "Bin code already exists in this zone" });
    } else {
      throw err;
    }
  }
});

// ── GET /locations/putaway-suggest — suggest optimal bin for inbound stock ────

router.get("/locations/putaway-suggest", async (req, res) => {
  const productId = req.query.productId as string | undefined;
  const qty = parseInt((req.query.qty as string) ?? "1", 10) || 1;
  const warehouseId = req.query.warehouseId as string | undefined;

  if (!productId) {
    res.status(400).json({ message: "productId is required" });
    return;
  }

  // Strategy: score bins by multiple factors
  // 1. Same product already in bin (co-location) — highest priority
  // 2. Zone activity (movement count) — prefer active zones
  // 3. Bin capacity (don't suggest full bins) — prefer bins with existing stock of other products
  // 4. Warehouse preference if specified

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get all active bins with their zone/warehouse info + current inventory
  const binCandidates = await db
    .select({
      binId: binsTable.id,
      binCode: binsTable.code,
      binName: binsTable.name,
      zoneId: zonesTable.id,
      zoneName: zonesTable.name,
      zoneCode: zonesTable.code,
      warehouseId: warehousesTable.id,
      warehouseName: warehousesTable.name,
      // Does this bin already have the same product?
      existingQty: sql<number>`COALESCE((
        SELECT qty_on_hand FROM ${inventoryItemsTable}
        WHERE ${inventoryItemsTable.binId} = ${binsTable.id}
        AND ${inventoryItemsTable.productId} = ${productId}
        LIMIT 1
      ), 0)`,
      // Total items in bin (for capacity check)
      totalItemsInBin: sql<number>`COALESCE((
        SELECT COUNT(*) FROM ${inventoryItemsTable}
        WHERE ${inventoryItemsTable.binId} = ${binsTable.id}
      ), 0)`,
      // Zone movement activity (30d)
      zoneActivity: sql<number>`COALESCE((
        SELECT COUNT(*) FROM ${inventoryMovementsTable}
        INNER JOIN ${inventoryItemsTable} AS inv ON inv.binId = ${inventoryMovementsTable.binId}
        WHERE inv.binId IN (
          SELECT b2.id FROM ${binsTable} AS b2 WHERE b2.zoneId = ${zonesTable.id}
        )
        AND ${inventoryMovementsTable.createdAt} >= ${since30d}
      ), 0)`,
    })
    .from(binsTable)
    .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
    .innerJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
    .where(
      and(
        eq(binsTable.isActive, true),
        warehouseId ? eq(warehousesTable.id, warehouseId) : undefined,
      )
    )
    .orderBy(warehousesTable.name, zonesTable.code, binsTable.code);

  if (binCandidates.length === 0) {
    res.json({ suggestions: [], message: "No available bins found" });
    return;
  }

  // Score each bin
  const scored = binCandidates.map((bin) => {
    let score = 0;
    const reasons: string[] = [];

    // +100 if same product already here (co-location bonus)
    if (bin.existingQty > 0) {
      score += 100;
      reasons.push(`Same product already here (${bin.existingQty} units)`);
    }

    // +1-50 for zone activity (normalized)
    const activityScore = Math.min(bin.zoneActivity / 10, 50);
    score += activityScore;
    if (activityScore > 10) {
      reasons.push(`Active zone (${bin.zoneActivity} movements in 30d)`);
    }

    // +5 if bin has some items but not too many (sweet spot: 1-5 different products)
    if (bin.totalItemsInBin > 0 && bin.totalItemsInBin <= 5) {
      score += 5;
      reasons.push(`Bin has ${bin.totalItemsInBin} product(s) — good capacity`);
    }

    // -20 if bin is empty (slight penalty — prefer some co-location)
    if (bin.totalItemsInBin === 0 && bin.existingQty === 0) {
      score -= 20;
      reasons.push("Empty bin");
    }

    // +10 if warehouse matches preferred
    if (warehouseId && bin.warehouseId === warehouseId) {
      score += 10;
      reasons.push("Preferred warehouse");
    }

    return {
      binId: bin.binId,
      binCode: bin.binCode,
      binName: bin.binName,
      zoneId: bin.zoneId,
      zoneName: bin.zoneName,
      zoneCode: bin.zoneCode,
      warehouseId: bin.warehouseId,
      warehouseName: bin.warehouseName,
      existingQty: bin.existingQty,
      score,
      reasons,
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return top 3 suggestions
  res.json({
    suggestions: scored.slice(0, 3),
    productId,
    qty,
  });
});

export default router;
