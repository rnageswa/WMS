import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  returnAuthorizationsTable,
  returnLinesTable,
  salesOrdersTable,
  productsTable,
} from "@workspace/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// Helper: generate RMA number
function generateRmaNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RMA-${yy}${mm}-${rand}`;
}

// ── GET /returns ───────────────────────────────────────────────────────────────

router.get("/returns", async (req, res) => {
  const statusFilter = req.query.status as string | undefined;
  const conditions = statusFilter
    ? eq(returnAuthorizationsTable.status, statusFilter as "requested" | "approved" | "received" | "inspected" | "restocked" | "quarantined" | "refunded" | "rejected")
    : undefined;

  const rows = await db
    .select({
      rma: returnAuthorizationsTable,
      orderNumber: salesOrdersTable.orderNumber,
    })
    .from(returnAuthorizationsTable)
    .leftJoin(salesOrdersTable, eq(returnAuthorizationsTable.orderId, salesOrdersTable.id))
    .where(conditions)
    .orderBy(desc(returnAuthorizationsTable.createdAt))
    .limit(50);

  res.json({ returns: rows });
});

// ── GET /returns/:id ───────────────────────────────────────────────────────────

router.get("/returns/:id", async (req, res) => {
  const [rma] = await db
    .select()
    .from(returnAuthorizationsTable)
    .where(eq(returnAuthorizationsTable.id, req.params.id))
    .limit(1);

  if (!rma) {
    res.status(404).json({ message: "RMA not found" });
    return;
  }

  const lines = await db
    .select({
      line: returnLinesTable,
      product: productsTable,
    })
    .from(returnLinesTable)
    .leftJoin(productsTable, eq(returnLinesTable.productId, productsTable.id))
    .where(eq(returnLinesTable.rmaId, rma.id))
    .orderBy(desc(returnLinesTable.createdAt));

  res.json({ rma, lines });
});

// ── POST /returns ───────────────────────────────────────────────────────────────

const createRmaSchema = z.object({
  orderId: z.string().uuid().optional(),
  customerName: z.string().min(1),
  reason: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    productId: z.string().uuid(),
    qtyReturned: z.number().int().min(1),
    condition: z.enum(["new", "good", "fair", "damaged", "defective"]).optional(),
    notes: z.string().optional(),
  })).min(1),
});

router.post("/returns", async (req, res) => {
  const parsed = createRmaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
    return;
  }

  const { orderId, customerName, reason, notes, lines } = parsed.data;

  // If orderId provided, fetch customer name from order
  let finalCustomerName = customerName;
  if (orderId && !customerName) {
    const [order] = await db
      .select({ customerName: salesOrdersTable.customerName })
      .from(salesOrdersTable)
      .where(eq(salesOrdersTable.id, orderId))
      .limit(1);
    if (order) finalCustomerName = order.customerName;
  }

  const rmaNumber = generateRmaNumber();

  const [rma] = await db
    .insert(returnAuthorizationsTable)
    .values({
      rmaNumber,
      orderId: orderId ?? null,
      customerName: finalCustomerName,
      reason: reason ?? null,
      notes: notes ?? null,
      status: "requested",
    })
    .returning();

  // Insert lines
  const lineRecords = await db
    .insert(returnLinesTable)
    .values(
      lines.map((l) => ({
        rmaId: rma.id,
        productId: l.productId,
        qtyReturned: l.qtyReturned,
        condition: l.condition ?? "good",
        disposition: "quarantine" as const,
        notes: l.notes ?? null,
      }))
    )
    .returning();

  res.status(201).json({ rma, lines: lineRecords });
});

// ── PUT /returns/:id/status ────────────────────────────────────────────────────

const statusSchema = z.object({
  status: z.enum(["requested", "approved", "received", "inspected", "restocked", "quarantined", "refunded", "rejected"]),
  notes: z.string().optional(),
});

router.put("/returns/:id/status", async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid status", errors: parsed.error.flatten() });
    return;
  }

  const [existing] = await db
    .select()
    .from(returnAuthorizationsTable)
    .where(eq(returnAuthorizationsTable.id, req.params.id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ message: "RMA not found" });
    return;
  }

  const updateData: Record<string, unknown> = {
    status: parsed.data.status,
    updatedAt: new Date(),
  };

  // Set timestamp fields based on status
  if (parsed.data.status === "received") {
    updateData.receivedAt = new Date();
  } else if (parsed.data.status === "inspected") {
    updateData.inspectedAt = new Date();
  } else if (["restocked", "quarantined", "refunded", "rejected"].includes(parsed.data.status)) {
    updateData.resolvedAt = new Date();
  }

  if (parsed.data.notes) {
    updateData.notes = existing.notes ? `${existing.notes}\n${parsed.data.notes}` : parsed.data.notes;
  }

  const [updated] = await db
    .update(returnAuthorizationsTable)
    .set(updateData)
    .where(eq(returnAuthorizationsTable.id, req.params.id))
    .returning();

  res.json(updated);
});

// ── PUT /returns/:id/lines/:lineId ─────────────────────────────────────────────

const updateLineSchema = z.object({
  qtyReceived: z.number().int().min(0).optional(),
  condition: z.enum(["new", "good", "fair", "damaged", "defective"]).optional(),
  disposition: z.enum(["restock", "quarantine", "dispose", "return_to_supplier"]).optional(),
  notes: z.string().optional(),
});

router.put("/returns/:id/lines/:lineId", async (req, res) => {
  const parsed = updateLineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
    return;
  }

  const [updated] = await db
    .update(returnLinesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(
      eq(returnLinesTable.id, req.params.lineId),
      eq(returnLinesTable.rmaId, req.params.id)
    ))
    .returning();

  if (!updated) {
    res.status(404).json({ message: "Return line not found" });
    return;
  }

  res.json(updated);
});

// ── DELETE /returns/:id ────────────────────────────────────────────────────────

router.delete("/returns/:id", async (req, res) => {
  const [existing] = await db
    .select()
    .from(returnAuthorizationsTable)
    .where(eq(returnAuthorizationsTable.id, req.params.id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ message: "RMA not found" });
    return;
  }

  // Cascade delete lines first
  await db.delete(returnLinesTable).where(eq(returnLinesTable.rmaId, req.params.id));
  await db.delete(returnAuthorizationsTable).where(eq(returnAuthorizationsTable.id, req.params.id));

  res.json({ message: "RMA deleted" });
});

export default router;
