import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  warehousesTable,
  zonesTable,
  binsTable,
  inventoryMovementsTable,
} from "@workspace/db/schema";
import { eq, inArray, and, count, max, gte, sql } from "drizzle-orm";
import {
  CreateWarehouseBody,
  UpdateWarehouseBody,
  CreateZoneBody,
  CreateBinBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

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

export default router;
