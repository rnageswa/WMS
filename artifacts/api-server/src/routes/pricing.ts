import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { priceListsTable, priceListItemsTable, productsTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { getDefaultPrice } from "../services/pricing.service";

const router: IRouter = Router();

// ── GET /price-lists — list all price lists ─────────────────────────────────────

router.get("/price-lists", requireAuth, async (req, res) => {
  const { isActive } = req.query as { isActive?: string };
  const conditions = [];
  if (isActive !== undefined) conditions.push(eq(priceListsTable.isActive, isActive === "true"));

  const lists = await db
    .select()
    .from(priceListsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(priceListsTable.name);

  res.json(lists);
});

// ── POST /price-lists — create price list (admin) ─────────────────────────────

const CreatePriceListZ = z.object({
  name: z.string().min(1),
  currency: z.string().min(2).max(5).optional().default("USD"),
  isDefault: z.boolean().optional().default(false),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

router.post("/price-lists", requireAuth, requireRole("admin"), async (req, res) => {
  const body = CreatePriceListZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  try {
    const [list] = await db.insert(priceListsTable).values(body.data).returning();
    res.status(201).json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /price-lists/:id — get single price list ──────────────────────────────

router.get("/price-lists/:id", requireAuth, async (req, res) => {
  const [list] = await db.select().from(priceListsTable).where(eq(priceListsTable.id, req.params.id)).limit(1);
  if (!list) {
    res.status(404).json({ error: "Price list not found" });
    return;
  }
  res.json(list);
});

// ── PUT /price-lists/:id — update price list (admin) ──────────────────────────

const UpdatePriceListZ = z.object({
  name: z.string().min(1).optional(),
  currency: z.string().min(2).max(5).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

router.put("/price-lists/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const body = UpdatePriceListZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  const [existing] = await db.select().from(priceListsTable).where(eq(priceListsTable.id, req.params.id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Price list not found" });
    return;
  }

  // If setting as default, clear previous default
  if (body.data.isDefault === true) {
    await db
      .update(priceListsTable)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(and(eq(priceListsTable.isDefault, true), sql`${priceListsTable.id} != ${req.params.id}`));
  }

  const [updated] = await db
    .update(priceListsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(priceListsTable.id, req.params.id))
    .returning();

  res.json(updated);
});

// ── DELETE /price-lists/:id — soft delete (admin) ─────────────────────────────

router.delete("/price-lists/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const [existing] = await db.select().from(priceListsTable).where(eq(priceListsTable.id, req.params.id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Price list not found" });
    return;
  }

  const [updated] = await db
    .update(priceListsTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(priceListsTable.id, req.params.id))
    .returning();

  res.json(updated);
});

// ── GET /price-lists/:id/items — list items in a price list ───────────────────

router.get("/price-lists/:id/items", requireAuth, async (req, res) => {
  const listId = req.params.id;

  const [list] = await db.select().from(priceListsTable).where(eq(priceListsTable.id, listId)).limit(1);
  if (!list) {
    res.status(404).json({ error: "Price list not found" });
    return;
  }

  const items = await db
    .select({
      id: priceListItemsTable.id,
      priceListId: priceListItemsTable.priceListId,
      productId: priceListItemsTable.productId,
      skuCode: productsTable.skuCode,
      productName: productsTable.name,
      unitPrice: priceListItemsTable.unitPrice,
      minQty: priceListItemsTable.minQty,
      maxQty: priceListItemsTable.maxQty,
      currency: priceListItemsTable.currency,
      validFrom: priceListItemsTable.validFrom,
      validTo: priceListItemsTable.validTo,
      createdAt: priceListItemsTable.createdAt,
    })
    .from(priceListItemsTable)
    .leftJoin(productsTable, eq(priceListItemsTable.productId, productsTable.id))
    .where(eq(priceListItemsTable.priceListId, listId))
    .orderBy(productsTable.skuCode);

  res.json(items);
});

// ── POST /price-lists/:id/items — add item (admin) ────────────────────────────

const CreatePriceListItemZ = z.object({
  productId: z.string().uuid(),
  unitPrice: z.number().positive(),
  minQty: z.number().int().positive().optional().default(1),
  maxQty: z.number().int().positive().nullable().optional(),
  currency: z.string().min(2).max(5).optional(),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

router.post("/price-lists/:id/items", requireAuth, requireRole("admin"), async (req, res) => {
  const listId = req.params.id;

  const [list] = await db.select().from(priceListsTable).where(eq(priceListsTable.id, listId)).limit(1);
  if (!list) {
    res.status(404).json({ error: "Price list not found" });
    return;
  }

  const body = CreatePriceListItemZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  // Inherit currency from parent price list if not provided
  const itemCurrency = body.data.currency ?? list.currency;

  try {
    const [item] = await db
      .insert(priceListItemsTable)
      .values({ ...body.data, priceListId: listId, unitPrice: String(body.data.unitPrice), currency: itemCurrency })
      .returning();
    res.status(201).json(item);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Price tier already exists for this product and quantity" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// ── PUT /price-lists/:id/items/:itemId — update item (admin) ──────────────────

const UpdatePriceListItemZ = z.object({
  unitPrice: z.number().positive().optional(),
  minQty: z.number().int().positive().optional(),
  maxQty: z.number().int().positive().nullable().optional(),
  currency: z.string().min(2).max(5).optional(),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

router.put("/price-lists/:id/items/:itemId", requireAuth, requireRole("admin"), async (req, res) => {
  const { id, itemId } = req.params;

  const body = UpdatePriceListItemZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  const [existing] = await db
    .select()
    .from(priceListItemsTable)
    .where(and(eq(priceListItemsTable.id, itemId), eq(priceListItemsTable.priceListId, id)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Price list item not found" });
    return;
  }

  const updateData: any = { ...body.data, updatedAt: new Date() };
  if (body.data.unitPrice != null) updateData.unitPrice = String(body.data.unitPrice);

  const [updated] = await db
    .update(priceListItemsTable)
    .set(updateData)
    .where(and(eq(priceListItemsTable.id, itemId), eq(priceListItemsTable.priceListId, id)))
    .returning();

  res.json(updated);
});

// ── DELETE /price-lists/:id/items/:itemId — remove item (admin) ────────────────

router.delete("/price-lists/:id/items/:itemId", requireAuth, requireRole("admin"), async (req, res) => {
  const { id, itemId } = req.params;

  const [existing] = await db
    .select()
    .from(priceListItemsTable)
    .where(and(eq(priceListItemsTable.id, itemId), eq(priceListItemsTable.priceListId, id)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Price list item not found" });
    return;
  }

  await db
    .delete(priceListItemsTable)
    .where(and(eq(priceListItemsTable.id, itemId), eq(priceListItemsTable.priceListId, id)));

  res.status(204).send();
});

// ── GET /price-lists/default/:productId — get default price for a product ─────

router.get("/price-lists/default/:productId", requireAuth, async (req, res) => {
  const { productId } = req.params;

  const price = await getDefaultPrice(productId);
  if (!price) {
    res.status(404).json({ error: "No default price found for this product" });
    return;
  }

  res.json(price);
});

export { router as pricingRouter };
