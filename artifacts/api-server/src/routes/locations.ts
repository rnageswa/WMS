import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { warehousesTable, zonesTable, binsTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  CreateWarehouseBody,
  UpdateWarehouseBody,
  CreateZoneBody,
  CreateBinBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

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
