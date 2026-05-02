import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  purchaseOrdersTable,
  purchaseOrderLinesTable,
  productsTable,
  inventoryItemsTable,
  inventoryMovementsTable,
  binsTable,
  suppliersTable,
} from "@workspace/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// ── helpers ───────────────────────────────────────────────────────────────────

function generatePoNumber() {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PO-${yy}${mm}-${rand}`;
}

async function formatPo(po: typeof purchaseOrdersTable.$inferSelect, lines: (typeof purchaseOrderLinesTable.$inferSelect & { skuCode: string | null; productName: string | null })[]) {
  return {
    id: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: po.supplierName,
    status: po.status,
    notes: po.notes,
    lineCount: lines.length,
    totalQtyOrdered: lines.reduce((s, l) => s + l.qtyOrdered, 0),
    createdAt: po.createdAt,
    updatedAt: po.updatedAt,
    lines: lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      skuCode: l.skuCode,
      productName: l.productName,
      qtyOrdered: l.qtyOrdered,
      qtyReceived: l.qtyReceived,
      unitCost: l.unitCost ? parseFloat(l.unitCost) : null,
      status: l.status,
    })),
  };
}

// ── GET /purchase-orders ──────────────────────────────────────────────────────

router.get("/purchase-orders", async (req, res) => {
  const { status } = req.query as { status?: string };

  const pos = await db.query.purchaseOrdersTable.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    where: status ? eq(purchaseOrdersTable.status, status as any) : undefined,
  });

  if (pos.length === 0) { res.json([]); return; }

  const poIds = pos.map((p) => p.id);
  const lines = await db
    .select({
      id: purchaseOrderLinesTable.id,
      poId: purchaseOrderLinesTable.poId,
      productId: purchaseOrderLinesTable.productId,
      qtyOrdered: purchaseOrderLinesTable.qtyOrdered,
      qtyReceived: purchaseOrderLinesTable.qtyReceived,
      unitCost: purchaseOrderLinesTable.unitCost,
      status: purchaseOrderLinesTable.status,
      skuCode: productsTable.skuCode,
      productName: productsTable.name,
    })
    .from(purchaseOrderLinesTable)
    .leftJoin(productsTable, eq(purchaseOrderLinesTable.productId, productsTable.id))
    .where(inArray(purchaseOrderLinesTable.poId, poIds));

  const linesByPo = new Map<string, typeof lines>();
  for (const l of lines) {
    const arr = linesByPo.get(l.poId) ?? [];
    arr.push(l);
    linesByPo.set(l.poId, arr);
  }

  const result = await Promise.all(
    pos.map((po) => formatPo(po, (linesByPo.get(po.id) ?? []) as any))
  );
  res.json(result);
});

// ── POST /purchase-orders ─────────────────────────────────────────────────────

const CreatePoLineZ = z.object({
  productId: z.string().uuid(),
  qtyOrdered: z.number().int().min(1),
  unitCost: z.number().positive().optional().nullable(),
});

const CreatePoBodyZ = z.object({
  supplierId: z.string().uuid().optional().nullable(),
  supplierName: z.string().min(1).optional(),
  notes: z.string().optional().nullable(),
  lines: z.array(CreatePoLineZ).min(1),
}).refine(
  (d) => d.supplierId || (d.supplierName && d.supplierName.trim().length > 0),
  { message: "Either supplierId or supplierName is required" }
);

router.post("/purchase-orders", async (req, res) => {
  const body = CreatePoBodyZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  // Resolve supplier name
  let resolvedSupplierName = body.data.supplierName ?? "";
  let resolvedSupplierId = body.data.supplierId ?? null;

  if (resolvedSupplierId) {
    const supplier = await db.query.suppliersTable.findFirst({
      where: eq(suppliersTable.id, resolvedSupplierId),
    });
    if (!supplier) {
      res.status(400).json({ error: "Supplier not found" });
      return;
    }
    resolvedSupplierName = supplier.name;
  }

  let poNumber = generatePoNumber();
  // Retry once on collision
  try {
    const [po] = await db
      .insert(purchaseOrdersTable)
      .values({ poNumber, supplierId: resolvedSupplierId, supplierName: resolvedSupplierName, notes: body.data.notes })
      .returning();

    const insertedLines = await db
      .insert(purchaseOrderLinesTable)
      .values(
        body.data.lines.map((l) => ({
          poId: po.id,
          productId: l.productId,
          qtyOrdered: l.qtyOrdered,
          unitCost: l.unitCost != null ? String(l.unitCost) : null,
        }))
      )
      .returning();

    // Join product info
    const productIds = insertedLines.map((l) => l.productId);
    const products = await db
      .select({ id: productsTable.id, skuCode: productsTable.skuCode, name: productsTable.name })
      .from(productsTable)
      .where(inArray(productsTable.id, productIds));
    const prodMap = new Map(products.map((p) => [p.id, p]));

    const linesWithInfo = insertedLines.map((l) => ({
      ...l,
      skuCode: prodMap.get(l.productId)?.skuCode ?? null,
      productName: prodMap.get(l.productId)?.name ?? null,
    }));

    res.status(201).json(await formatPo(po, linesWithInfo as any));
  } catch (err: any) {
    if (err?.code === "23505") {
      poNumber = generatePoNumber();
      res.status(500).json({ error: "PO number collision, please retry" });
    } else {
      throw err;
    }
  }
});

// ── GET /purchase-orders/:id ──────────────────────────────────────────────────

router.get("/purchase-orders/:id", async (req, res) => {
  const { id } = req.params;
  const po = await db.query.purchaseOrdersTable.findFirst({
    where: eq(purchaseOrdersTable.id, id),
  });
  if (!po) { res.status(404).json({ error: "Not found" }); return; }

  const lines = await db
    .select({
      id: purchaseOrderLinesTable.id,
      poId: purchaseOrderLinesTable.poId,
      productId: purchaseOrderLinesTable.productId,
      qtyOrdered: purchaseOrderLinesTable.qtyOrdered,
      qtyReceived: purchaseOrderLinesTable.qtyReceived,
      unitCost: purchaseOrderLinesTable.unitCost,
      status: purchaseOrderLinesTable.status,
      skuCode: productsTable.skuCode,
      productName: productsTable.name,
    })
    .from(purchaseOrderLinesTable)
    .leftJoin(productsTable, eq(purchaseOrderLinesTable.productId, productsTable.id))
    .where(eq(purchaseOrderLinesTable.poId, id));

  res.json(await formatPo(po, lines as any));
});

// ── PATCH /purchase-orders/:id/status ────────────────────────────────────────

const UpdateStatusZ = z.object({ status: z.enum(["ordered", "cancelled"]) });

router.patch("/purchase-orders/:id/status", async (req, res) => {
  const body = UpdateStatusZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }
  const po = await db.query.purchaseOrdersTable.findFirst({
    where: eq(purchaseOrdersTable.id, req.params.id),
  });
  if (!po) { res.status(404).json({ error: "Not found" }); return; }
  if (po.status === "received" || po.status === "cancelled") {
    res.status(400).json({ error: `Cannot update a ${po.status} PO` });
    return;
  }

  const [updated] = await db
    .update(purchaseOrdersTable)
    .set({ status: body.data.status, updatedAt: new Date() })
    .where(eq(purchaseOrdersTable.id, req.params.id))
    .returning();

  const lines = await db
    .select({
      id: purchaseOrderLinesTable.id,
      poId: purchaseOrderLinesTable.poId,
      productId: purchaseOrderLinesTable.productId,
      qtyOrdered: purchaseOrderLinesTable.qtyOrdered,
      qtyReceived: purchaseOrderLinesTable.qtyReceived,
      unitCost: purchaseOrderLinesTable.unitCost,
      status: purchaseOrderLinesTable.status,
      skuCode: productsTable.skuCode,
      productName: productsTable.name,
    })
    .from(purchaseOrderLinesTable)
    .leftJoin(productsTable, eq(purchaseOrderLinesTable.productId, productsTable.id))
    .where(eq(purchaseOrderLinesTable.poId, updated.id));

  res.json(await formatPo(updated, lines as any));
});

// ── POST /purchase-orders/:id/receive ────────────────────────────────────────

const ReceiveLineZ = z.object({
  lineId: z.string().uuid(),
  qtyReceived: z.number().int().min(1),
  binId: z.string().uuid(),
});
const ReceiveBodyZ = z.object({ lines: z.array(ReceiveLineZ).min(1) });

router.post("/purchase-orders/:id/receive", async (req, res) => {
  const body = ReceiveBodyZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  const po = await db.query.purchaseOrdersTable.findFirst({
    where: eq(purchaseOrdersTable.id, req.params.id),
  });
  if (!po) { res.status(404).json({ error: "Not found" }); return; }
  if (po.status === "cancelled") {
    res.status(400).json({ error: "Cannot receive a cancelled PO" });
    return;
  }

  // Load lines to validate
  const existingLines = await db
    .select()
    .from(purchaseOrderLinesTable)
    .where(eq(purchaseOrderLinesTable.poId, po.id));
  const lineMap = new Map(existingLines.map((l) => [l.id, l]));

  let movementsCreated = 0;

  await db.transaction(async (tx) => {
    for (const rl of body.data.lines) {
      const line = lineMap.get(rl.lineId);
      if (!line) continue;

      const remaining = line.qtyOrdered - line.qtyReceived;
      const actualQty = Math.min(rl.qtyReceived, remaining);
      if (actualQty <= 0) continue;

      // Upsert inventory item
      await tx
        .insert(inventoryItemsTable)
        .values({ productId: line.productId, binId: rl.binId, qtyOnHand: actualQty })
        .onConflictDoUpdate({
          target: [inventoryItemsTable.productId, inventoryItemsTable.binId],
          set: {
            qtyOnHand: sql`${inventoryItemsTable.qtyOnHand} + ${actualQty}`,
            updatedAt: new Date(),
          },
        });

      // Record movement
      await tx.insert(inventoryMovementsTable).values({
        productId: line.productId,
        binId: rl.binId,
        movementType: "inbound",
        quantity: actualQty,
        reasonCode: `PO-RECEIPT`,
        referenceType: "purchase_order",
        referenceId: po.id,
      });
      movementsCreated++;

      // Update line received qty and status
      const newReceived = line.qtyReceived + actualQty;
      const lineStatus =
        newReceived >= line.qtyOrdered ? "received" : "partially_received";
      await tx
        .update(purchaseOrderLinesTable)
        .set({ qtyReceived: newReceived, status: lineStatus })
        .where(eq(purchaseOrderLinesTable.id, line.id));
    }

    // Recompute PO status from all lines (reload after updates)
    const refreshedLines = await tx
      .select()
      .from(purchaseOrderLinesTable)
      .where(eq(purchaseOrderLinesTable.poId, po.id));

    const allReceived = refreshedLines.every((l) => l.status === "received");
    const anyReceived = refreshedLines.some((l) => l.qtyReceived > 0);
    const newPoStatus = allReceived
      ? "received"
      : anyReceived
        ? "partially_received"
        : po.status;

    await tx
      .update(purchaseOrdersTable)
      .set({ status: newPoStatus, updatedAt: new Date() })
      .where(eq(purchaseOrdersTable.id, po.id));
  });

  // Return updated PO
  const updatedPo = await db.query.purchaseOrdersTable.findFirst({
    where: eq(purchaseOrdersTable.id, po.id),
  });
  const updatedLines = await db
    .select({
      id: purchaseOrderLinesTable.id,
      poId: purchaseOrderLinesTable.poId,
      productId: purchaseOrderLinesTable.productId,
      qtyOrdered: purchaseOrderLinesTable.qtyOrdered,
      qtyReceived: purchaseOrderLinesTable.qtyReceived,
      unitCost: purchaseOrderLinesTable.unitCost,
      status: purchaseOrderLinesTable.status,
      skuCode: productsTable.skuCode,
      productName: productsTable.name,
    })
    .from(purchaseOrderLinesTable)
    .leftJoin(productsTable, eq(purchaseOrderLinesTable.productId, productsTable.id))
    .where(eq(purchaseOrderLinesTable.poId, po.id));

  res.json({
    po: await formatPo(updatedPo!, updatedLines as any),
    movementsCreated,
  });
});

export { router as purchasingRouter };
