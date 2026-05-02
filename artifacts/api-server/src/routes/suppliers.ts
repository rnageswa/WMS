import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  suppliersTable,
  purchaseOrdersTable,
} from "@workspace/db/schema";
import { eq, ilike, or, desc, count } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// ── GET /suppliers ─────────────────────────────────────────────────────────────

router.get("/suppliers", async (req, res) => {
  const { search, isActive } = req.query as { search?: string; isActive?: string };

  const rows = await db
    .select({
      id: suppliersTable.id,
      name: suppliersTable.name,
      contactName: suppliersTable.contactName,
      email: suppliersTable.email,
      phone: suppliersTable.phone,
      address: suppliersTable.address,
      leadTimeDays: suppliersTable.leadTimeDays,
      notes: suppliersTable.notes,
      isActive: suppliersTable.isActive,
      createdAt: suppliersTable.createdAt,
      updatedAt: suppliersTable.updatedAt,
      poCount: count(purchaseOrdersTable.id),
    })
    .from(suppliersTable)
    .leftJoin(purchaseOrdersTable, eq(purchaseOrdersTable.supplierId, suppliersTable.id))
    .where(
      isActive !== undefined
        ? eq(suppliersTable.isActive, isActive === "true")
        : undefined
    )
    .groupBy(suppliersTable.id)
    .orderBy(suppliersTable.name);

  const filtered = search
    ? rows.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (r.contactName ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  res.json(filtered);
});

// ── POST /suppliers ────────────────────────────────────────────────────────────

const CreateSupplierZ = z.object({
  name: z.string().min(1),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  leadTimeDays: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post("/suppliers", async (req, res) => {
  const body = CreateSupplierZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }
  const [supplier] = await db
    .insert(suppliersTable)
    .values(body.data)
    .returning();
  res.status(201).json({ ...supplier, poCount: 0 });
});

// ── GET /suppliers/:id ─────────────────────────────────────────────────────────

router.get("/suppliers/:id", async (req, res) => {
  const { id } = req.params;

  const [row] = await db
    .select({
      id: suppliersTable.id,
      name: suppliersTable.name,
      contactName: suppliersTable.contactName,
      email: suppliersTable.email,
      phone: suppliersTable.phone,
      address: suppliersTable.address,
      leadTimeDays: suppliersTable.leadTimeDays,
      notes: suppliersTable.notes,
      isActive: suppliersTable.isActive,
      createdAt: suppliersTable.createdAt,
      updatedAt: suppliersTable.updatedAt,
      poCount: count(purchaseOrdersTable.id),
    })
    .from(suppliersTable)
    .leftJoin(purchaseOrdersTable, eq(purchaseOrdersTable.supplierId, suppliersTable.id))
    .where(eq(suppliersTable.id, id))
    .groupBy(suppliersTable.id);

  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  // Load recent POs for this supplier
  const recentPos = await db
    .select({
      id: purchaseOrdersTable.id,
      poNumber: purchaseOrdersTable.poNumber,
      status: purchaseOrdersTable.status,
      createdAt: purchaseOrdersTable.createdAt,
      updatedAt: purchaseOrdersTable.updatedAt,
    })
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.supplierId, id))
    .orderBy(desc(purchaseOrdersTable.createdAt))
    .limit(20);

  res.json({ ...row, purchaseOrders: recentPos });
});

// ── PATCH /suppliers/:id ───────────────────────────────────────────────────────

const UpdateSupplierZ = z.object({
  name: z.string().min(1).optional(),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  leadTimeDays: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

router.patch("/suppliers/:id", async (req, res) => {
  const body = UpdateSupplierZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }
  const existing = await db.query.suppliersTable.findFirst({
    where: eq(suppliersTable.id, req.params.id),
  });
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const [updated] = await db
    .update(suppliersTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(suppliersTable.id, req.params.id))
    .returning();

  res.json(updated);
});

export { router as suppliersRouter };
