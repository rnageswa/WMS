import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  purchaseOrdersTable,
  purchaseOrderLinesTable,
  productsTable,
  inventoryItemsTable,
  inventoryMovementsTable,
  binsTable,
  zonesTable,
  warehousesTable,
  suppliersTable,
  poTemplatesTable,
  poTemplateLinesTable,
  poStatusHistoryTable,
} from "@workspace/db/schema";
import { eq, inArray, sql, ne, and, or, ilike, desc } from "drizzle-orm";
import { z } from "zod";
import { sendPoEmail } from "../lib/email";

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
    expectedDeliveryDate: po.expectedDeliveryDate ?? null,
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

// ── GET /po-templates ─────────────────────────────────────────────────────────

router.get("/po-templates", async (_req, res) => {
  const templates = await db.select().from(poTemplatesTable).orderBy(desc(poTemplatesTable.createdAt));
  if (templates.length === 0) { res.json([]); return; }

  const tplIds = templates.map((t) => t.id);
  const lineCounts = await db
    .select({
      templateId: poTemplateLinesTable.templateId,
      count: sql<number>`count(*)`,
    })
    .from(poTemplateLinesTable)
    .where(inArray(poTemplateLinesTable.templateId, tplIds))
    .groupBy(poTemplateLinesTable.templateId);

  const countMap = new Map(lineCounts.map((r) => [r.templateId, Number(r.count)]));
  res.json(templates.map((t) => ({ ...t, lineCount: countMap.get(t.id) ?? 0 })));
});

// ── POST /po-templates ────────────────────────────────────────────────────────

const CreatePoTemplateLineZ = z.object({
  productId: z.string().uuid(),
  defaultQty: z.number().int().min(1),
  defaultUnitCost: z.number().positive().optional().nullable(),
});

const CreatePoTemplateBodyZ = z.object({
  name: z.string().min(1),
  supplierId: z.string().uuid().optional().nullable(),
  supplierName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(CreatePoTemplateLineZ).min(1),
});

async function upsertTemplateLines(
  templateId: string,
  lines: z.infer<typeof CreatePoTemplateLineZ>[]
) {
  await db.delete(poTemplateLinesTable).where(eq(poTemplateLinesTable.templateId, templateId));
  const inserted = await db
    .insert(poTemplateLinesTable)
    .values(
      lines.map((l) => ({
        templateId,
        productId: l.productId,
        defaultQty: l.defaultQty,
        defaultUnitCost: l.defaultUnitCost != null ? String(l.defaultUnitCost) : null,
      }))
    )
    .returning();
  return inserted;
}

async function enrichTemplateLines(templateId: string) {
  return db
    .select({
      id: poTemplateLinesTable.id,
      templateId: poTemplateLinesTable.templateId,
      productId: poTemplateLinesTable.productId,
      defaultQty: poTemplateLinesTable.defaultQty,
      defaultUnitCost: poTemplateLinesTable.defaultUnitCost,
      skuCode: productsTable.skuCode,
      productName: productsTable.name,
    })
    .from(poTemplateLinesTable)
    .leftJoin(productsTable, eq(poTemplateLinesTable.productId, productsTable.id))
    .where(eq(poTemplateLinesTable.templateId, templateId));
}

router.post("/po-templates", async (req, res) => {
  const body = CreatePoTemplateBodyZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  let resolvedSupplierId = body.data.supplierId ?? null;
  let resolvedSupplierName = body.data.supplierName ?? null;

  if (resolvedSupplierId) {
    const supplier = await db.query.suppliersTable.findFirst({ where: eq(suppliersTable.id, resolvedSupplierId) });
    if (!supplier) { res.status(400).json({ error: "Supplier not found" }); return; }
    resolvedSupplierName = supplier.name;
  }

  const [template] = await db
    .insert(poTemplatesTable)
    .values({ name: body.data.name, supplierId: resolvedSupplierId, supplierName: resolvedSupplierName, notes: body.data.notes ?? null })
    .returning();

  const lines = await upsertTemplateLines(template.id, body.data.lines);
  const enriched = await enrichTemplateLines(template.id);

  res.status(201).json({
    ...template,
    lineCount: lines.length,
    lines: enriched.map((l) => ({
      ...l,
      defaultUnitCost: l.defaultUnitCost ? parseFloat(l.defaultUnitCost) : null,
    })),
  });
});

// ── GET /po-templates/:id ─────────────────────────────────────────────────────

router.get("/po-templates/:id", async (req, res) => {
  const template = await db.query.poTemplatesTable.findFirst({
    where: eq(poTemplatesTable.id, req.params.id),
  });
  if (!template) { res.status(404).json({ error: "Not found" }); return; }

  const enriched = await enrichTemplateLines(template.id);
  res.json({
    ...template,
    lineCount: enriched.length,
    lines: enriched.map((l) => ({
      ...l,
      defaultUnitCost: l.defaultUnitCost ? parseFloat(l.defaultUnitCost) : null,
    })),
  });
});

// ── PUT /po-templates/:id ─────────────────────────────────────────────────────

router.put("/po-templates/:id", async (req, res) => {
  const body = CreatePoTemplateBodyZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  const existing = await db.query.poTemplatesTable.findFirst({ where: eq(poTemplatesTable.id, req.params.id) });
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  let resolvedSupplierId = body.data.supplierId ?? null;
  let resolvedSupplierName = body.data.supplierName ?? null;

  if (resolvedSupplierId) {
    const supplier = await db.query.suppliersTable.findFirst({ where: eq(suppliersTable.id, resolvedSupplierId) });
    if (!supplier) { res.status(400).json({ error: "Supplier not found" }); return; }
    resolvedSupplierName = supplier.name;
  }

  const [updated] = await db
    .update(poTemplatesTable)
    .set({ name: body.data.name, supplierId: resolvedSupplierId, supplierName: resolvedSupplierName, notes: body.data.notes ?? null, updatedAt: new Date() })
    .where(eq(poTemplatesTable.id, req.params.id))
    .returning();

  await upsertTemplateLines(updated.id, body.data.lines);
  const enriched = await enrichTemplateLines(updated.id);

  res.json({
    ...updated,
    lineCount: enriched.length,
    lines: enriched.map((l) => ({
      ...l,
      defaultUnitCost: l.defaultUnitCost ? parseFloat(l.defaultUnitCost) : null,
    })),
  });
});

// ── DELETE /po-templates/:id ──────────────────────────────────────────────────

router.delete("/po-templates/:id", async (req, res) => {
  const existing = await db.query.poTemplatesTable.findFirst({ where: eq(poTemplatesTable.id, req.params.id) });
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(poTemplatesTable).where(eq(poTemplatesTable.id, req.params.id));
  res.status(204).send();
});

// ── POST /po-templates/:id/create-po ─────────────────────────────────────────

const CreatePoFromTemplateZ = z.object({
  expectedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  lineOverrides: z
    .array(
      z.object({
        lineId: z.string().uuid(),
        qty: z.number().int().min(1),
        unitCost: z.number().positive().optional().nullable(),
      })
    )
    .optional(),
});

router.post("/po-templates/:id/create-po", async (req, res) => {
  const body = CreatePoFromTemplateZ.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  const template = await db.query.poTemplatesTable.findFirst({ where: eq(poTemplatesTable.id, req.params.id) });
  if (!template) { res.status(404).json({ error: "Template not found" }); return; }

  const tplLines = await db.select().from(poTemplateLinesTable).where(eq(poTemplateLinesTable.templateId, template.id));
  if (tplLines.length === 0) {
    res.status(400).json({ error: "Template has no lines" });
    return;
  }

  const overrideMap = new Map((body.data.lineOverrides ?? []).map((o) => [o.lineId, o]));

  let resolvedSupplierName = template.supplierName ?? "";
  if (template.supplierId) {
    const supplier = await db.query.suppliersTable.findFirst({ where: eq(suppliersTable.id, template.supplierId) });
    if (supplier) resolvedSupplierName = supplier.name;
  }
  if (!resolvedSupplierName) {
    res.status(400).json({ error: "Template has no supplier set" });
    return;
  }

  const poNumber = generatePoNumber();
  const [po] = await db
    .insert(purchaseOrdersTable)
    .values({
      poNumber,
      supplierId: template.supplierId,
      supplierName: resolvedSupplierName,
      notes: template.notes,
      expectedDeliveryDate: body.data.expectedDeliveryDate ?? null,
    })
    .returning();

  const lineValues = tplLines.map((l) => {
    const override = overrideMap.get(l.id);
    const qty = override?.qty ?? l.defaultQty;
    const cost = override?.unitCost !== undefined
      ? (override.unitCost != null ? String(override.unitCost) : null)
      : l.defaultUnitCost ?? null;
    return { poId: po.id, productId: l.productId, qtyOrdered: qty, unitCost: cost };
  });

  await db.insert(purchaseOrderLinesTable).values(lineValues);

  const fullPo = await db.query.purchaseOrdersTable.findFirst({ where: eq(purchaseOrdersTable.id, po.id) });
  res.status(201).json(fullPo);
});

// ── GET /reorder-suggestions ──────────────────────────────────────────────────

router.get("/reorder-suggestions", async (_req, res) => {
  // 1. All active products with reorder thresholds
  const products = await db
    .select({
      id: productsTable.id,
      skuCode: productsTable.skuCode,
      name: productsTable.name,
      category: productsTable.category,
      reorderThreshold: productsTable.reorderThreshold,
    })
    .from(productsTable)
    .where(eq(productsTable.isActive, true));

  if (products.length === 0) {
    res.json({ generatedAt: new Date().toISOString(), totalItems: 0, groups: [] });
    return;
  }

  // 2. Current inventory totals per product
  const invRows = await db
    .select({
      productId: inventoryItemsTable.productId,
      totalQty: sql<number>`coalesce(sum(${inventoryItemsTable.qtyOnHand}), 0)`,
    })
    .from(inventoryItemsTable)
    .groupBy(inventoryItemsTable.productId);

  const qtyMap = new Map(invRows.map((r) => [r.productId, Number(r.totalQty)]));

  // 3. Filter to products that are below threshold
  const lowStock = products.filter((p) => (qtyMap.get(p.id) ?? 0) < p.reorderThreshold);

  if (lowStock.length === 0) {
    res.json({ generatedAt: new Date().toISOString(), totalItems: 0, groups: [] });
    return;
  }

  // 4. Find the most-recent non-cancelled PO line per product for supplier + unit cost
  const lowStockIds = lowStock.map((p) => p.id);

  const allRecentLines = await db
    .select({
      productId: purchaseOrderLinesTable.productId,
      unitCost: purchaseOrderLinesTable.unitCost,
      supplierId: purchaseOrdersTable.supplierId,
      supplierName: purchaseOrdersTable.supplierName,
      poCreatedAt: purchaseOrdersTable.createdAt,
    })
    .from(purchaseOrderLinesTable)
    .innerJoin(purchaseOrdersTable, eq(purchaseOrderLinesTable.poId, purchaseOrdersTable.id))
    .where(
      and(
        inArray(purchaseOrderLinesTable.productId, lowStockIds),
        ne(purchaseOrdersTable.status, "cancelled")
      )
    )
    .orderBy(desc(purchaseOrdersTable.createdAt));

  // Keep only the most-recent PO line per product
  const latestByProduct = new Map<string, typeof allRecentLines[0]>();
  for (const line of allRecentLines) {
    if (!latestByProduct.has(line.productId)) {
      latestByProduct.set(line.productId, line);
    }
  }

  // 5. Build groups keyed by supplier
  type SuggestionItem = {
    productId: string;
    skuCode: string;
    name: string;
    category: string | null;
    currentQty: number;
    reorderThreshold: number;
    deficit: number;
    suggestedQty: number;
    lastUnitCost: number | null;
    lastPoDate: string | null;
  };

  const groups = new Map<string, {
    supplierId: string | null;
    supplierName: string | null;
    lastPoDate: string | null;
    items: SuggestionItem[];
  }>();

  for (const p of lowStock) {
    const currentQty = qtyMap.get(p.id) ?? 0;
    const deficit = p.reorderThreshold - currentQty;
    const suggestedQty = Math.max(1, p.reorderThreshold * 2 - currentQty);

    const last = latestByProduct.get(p.id);
    const key = last?.supplierId ?? (last?.supplierName ? `__name__${last.supplierName}` : "__none__");

    if (!groups.has(key)) {
      groups.set(key, {
        supplierId: last?.supplierId ?? null,
        supplierName: last?.supplierName ?? null,
        lastPoDate: last?.poCreatedAt?.toISOString().slice(0, 10) ?? null,
        items: [],
      });
    }

    groups.get(key)!.items.push({
      productId: p.id,
      skuCode: p.skuCode,
      name: p.name,
      category: p.category,
      currentQty,
      reorderThreshold: p.reorderThreshold,
      deficit,
      suggestedQty,
      lastUnitCost: last?.unitCost ? parseFloat(last.unitCost) : null,
      lastPoDate: last?.poCreatedAt?.toISOString().slice(0, 10) ?? null,
    });
  }

  // Known suppliers first, then name-only, then unknown
  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    if (a.supplierId && !b.supplierId) return -1;
    if (!a.supplierId && b.supplierId) return 1;
    if (a.supplierName && !b.supplierName) return -1;
    if (!a.supplierName && b.supplierName) return 1;
    return 0;
  });

  res.json({
    generatedAt: new Date().toISOString(),
    totalItems: lowStock.length,
    groups: sortedGroups,
  });
});

// ── GET /purchase-orders/aging ────────────────────────────────────────────────

router.get("/purchase-orders/aging", async (_req, res) => {
  const openStatuses = ["draft", "ordered", "partially_received"] as const;

  const openPos = await db.query.purchaseOrdersTable.findMany({
    where: inArray(purchaseOrdersTable.status, openStatuses as any),
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  let overdue = 0, dueThisWeek = 0, upcoming = 0, noDate = 0;
  const overdueItems: {
    id: string; poNumber: string; supplierName: string; status: string;
    expectedDeliveryDate: string | null; daysOverdue: number | null;
  }[] = [];

  for (const po of openPos) {
    if (!po.expectedDeliveryDate) {
      noDate++;
    } else {
      const d = new Date(po.expectedDeliveryDate);
      d.setHours(0, 0, 0, 0);
      const msPerDay = 86_400_000;
      if (d < today) {
        overdue++;
        const daysOverdue = Math.round((today.getTime() - d.getTime()) / msPerDay);
        overdueItems.push({
          id: po.id,
          poNumber: po.poNumber,
          supplierName: po.supplierName,
          status: po.status,
          expectedDeliveryDate: po.expectedDeliveryDate,
          daysOverdue,
        });
      } else if (d <= weekFromNow) {
        dueThisWeek++;
      } else {
        upcoming++;
      }
    }
  }

  overdueItems.sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));

  res.json({
    totalOpen: openPos.length,
    overdue,
    dueThisWeek,
    upcoming,
    noDate,
    overdueItems,
  });
});

// ── GET /reports/supplier-performance ────────────────────────────────────────

router.get("/reports/supplier-performance", async (_req, res) => {
  const allPos = await db.query.purchaseOrdersTable.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  if (allPos.length === 0) {
    res.json({ generatedAt: new Date().toISOString(), suppliers: [] });
    return;
  }

  const poIds = allPos.map((p) => p.id);
  const lines = await db
    .select({
      poId: purchaseOrderLinesTable.poId,
      qtyOrdered: purchaseOrderLinesTable.qtyOrdered,
      qtyReceived: purchaseOrderLinesTable.qtyReceived,
      unitCost: purchaseOrderLinesTable.unitCost,
      lineStatus: purchaseOrderLinesTable.status,
    })
    .from(purchaseOrderLinesTable)
    .where(inArray(purchaseOrderLinesTable.poId, poIds));

  const linesByPo = new Map<string, typeof lines>();
  for (const l of lines) {
    const arr = linesByPo.get(l.poId) ?? [];
    arr.push(l);
    linesByPo.set(l.poId, arr);
  }

  // Group POs by supplier (prefer supplierId key if available, else supplierName)
  const supplierMap = new Map<string, {
    supplierId: string | null;
    supplierName: string;
    orders: typeof allPos;
  }>();

  for (const po of allPos) {
    const key = po.supplierId ?? `__name__${po.supplierName}`;
    if (!supplierMap.has(key)) {
      supplierMap.set(key, { supplierId: po.supplierId, supplierName: po.supplierName, orders: [] });
    }
    supplierMap.get(key)!.orders.push(po);
  }

  const msPerDay = 86_400_000;

  const result = Array.from(supplierMap.values()).map(({ supplierId, supplierName, orders }) => {
    const totalOrders = orders.length;
    const receivedOrders = orders.filter((p) => p.status === "received");
    const cancelledCount = orders.filter((p) => p.status === "cancelled").length;
    const openCount = totalOrders - receivedOrders.length - cancelledCount;

    // On-time delivery: received POs where updatedAt date ≤ expectedDeliveryDate
    const receivedWithDate = receivedOrders.filter((p) => !!p.expectedDeliveryDate);
    const onTimeCount = receivedWithDate.filter((p) => {
      const recvDay = new Date(p.updatedAt); recvDay.setHours(0, 0, 0, 0);
      const expDay = new Date(p.expectedDeliveryDate!); expDay.setHours(0, 0, 0, 0);
      return recvDay <= expDay;
    }).length;
    const onTimeRate = receivedWithDate.length > 0
      ? Math.round((onTimeCount / receivedWithDate.length) * 100)
      : null;

    // Avg lead time (createdAt → updatedAt for received POs)
    let avgLeadTimeDays: number | null = null;
    if (receivedOrders.length > 0) {
      const totalDays = receivedOrders.reduce(
        (s, p) => s + (p.updatedAt.getTime() - p.createdAt.getTime()) / msPerDay, 0
      );
      avgLeadTimeDays = Math.round(totalDays / receivedOrders.length);
    }

    // Fill rate: across non-cancelled POs
    const nonCancelledLines = orders
      .filter((p) => p.status !== "cancelled")
      .flatMap((p) => linesByPo.get(p.id) ?? []);
    const totalItemsOrdered = nonCancelledLines.reduce((s, l) => s + l.qtyOrdered, 0);
    const totalItemsReceived = nonCancelledLines.reduce((s, l) => s + l.qtyReceived, 0);
    const fillRate = totalItemsOrdered > 0
      ? Math.round((totalItemsReceived / totalItemsOrdered) * 100)
      : null;

    // Total spend (unit_cost × qty_ordered)
    const totalSpendRaw = nonCancelledLines.reduce((s, l) => {
      return l.unitCost ? s + parseFloat(l.unitCost) * l.qtyOrdered : s;
    }, 0);
    const totalSpend = totalSpendRaw > 0 ? totalSpendRaw : null;

    // Last order date
    const lastOrderDate = orders.reduce((latest, p) => {
      const d = p.createdAt.toISOString().slice(0, 10);
      return d > (latest ?? "") ? d : latest;
    }, null as string | null);

    return {
      supplierId,
      supplierName,
      totalOrders,
      receivedOrders: receivedOrders.length,
      cancelledOrders: cancelledCount,
      openOrders: openCount,
      onTimeOrders: onTimeCount,
      ordersWithDate: receivedWithDate.length,
      onTimeRate,
      avgLeadTimeDays,
      totalItemsOrdered,
      totalItemsReceived,
      fillRate,
      totalSpend,
      lastOrderDate,
    };
  });

  result.sort((a, b) => b.totalOrders - a.totalOrders);
  res.json({ generatedAt: new Date().toISOString(), suppliers: result });
});

// ── GET /purchase-orders/export ───────────────────────────────────────────────

function csvEscape(val: unknown): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(fields: unknown[]): string {
  return fields.map(csvEscape).join(",");
}

router.get("/purchase-orders/export", async (req, res) => {
  const { status, q } = req.query as { status?: string; q?: string };

  let skuMatchPoIds: string[] = [];
  if (q && q.trim().length > 0) {
    const term = `%${q.trim()}%`;
    const matches = await db
      .selectDistinct({ poId: purchaseOrderLinesTable.poId })
      .from(purchaseOrderLinesTable)
      .leftJoin(productsTable, eq(purchaseOrderLinesTable.productId, productsTable.id))
      .where(or(ilike(productsTable.skuCode, term), ilike(productsTable.name, term)));
    skuMatchPoIds = matches.map((r) => r.poId);
  }

  const buildWhere = () => {
    const conditions: ReturnType<typeof eq>[] = [];
    if (status) conditions.push(eq(purchaseOrdersTable.status, status as any));
    if (q && q.trim().length > 0) {
      const term = `%${q.trim()}%`;
      const searchOr = or(
        ilike(purchaseOrdersTable.poNumber, term),
        ilike(purchaseOrdersTable.supplierName, term),
        ...(skuMatchPoIds.length > 0 ? [inArray(purchaseOrdersTable.id, skuMatchPoIds)] : [])
      );
      conditions.push(searchOr as any);
    }
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return and(...conditions);
  };

  const pos = await db.query.purchaseOrdersTable.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    where: buildWhere(),
  });

  const lines = pos.length > 0
    ? await db
        .select({
          poId: purchaseOrderLinesTable.poId,
          skuCode: productsTable.skuCode,
          productName: productsTable.name,
          qtyOrdered: purchaseOrderLinesTable.qtyOrdered,
          qtyReceived: purchaseOrderLinesTable.qtyReceived,
          unitCost: purchaseOrderLinesTable.unitCost,
          lineStatus: purchaseOrderLinesTable.status,
        })
        .from(purchaseOrderLinesTable)
        .leftJoin(productsTable, eq(purchaseOrderLinesTable.productId, productsTable.id))
        .where(inArray(purchaseOrderLinesTable.poId, pos.map((p) => p.id)))
    : [];

  const linesByPo = new Map<string, typeof lines>();
  for (const l of lines) {
    const arr = linesByPo.get(l.poId) ?? [];
    arr.push(l);
    linesByPo.set(l.poId, arr);
  }

  const date = new Date().toISOString().slice(0, 10);
  const filename = `purchase-orders-${date}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const header = csvRow([
    "PO Number", "Supplier", "PO Status", "Created At", "Expected Delivery",
    "Notes", "SKU", "Product", "Qty Ordered", "Qty Received", "Unit Cost",
    "Line Total", "Line Status",
  ]);
  res.write(header + "\n");

  for (const po of pos) {
    const poLines = linesByPo.get(po.id) ?? [];
    if (poLines.length === 0) {
      res.write(csvRow([
        po.poNumber, po.supplierName, po.status,
        po.createdAt.toISOString(), po.expectedDeliveryDate ?? "",
        po.notes ?? "", "", "", "", "", "", "", "",
      ]) + "\n");
    } else {
      for (const l of poLines) {
        const unitCost = l.unitCost != null ? Number(l.unitCost) : null;
        const lineTotal = unitCost != null ? (unitCost * l.qtyOrdered).toFixed(2) : "";
        res.write(csvRow([
          po.poNumber, po.supplierName, po.status,
          po.createdAt.toISOString(), po.expectedDeliveryDate ?? "",
          po.notes ?? "",
          l.skuCode ?? "", l.productName ?? "",
          l.qtyOrdered, l.qtyReceived,
          unitCost != null ? unitCost.toFixed(4) : "",
          lineTotal, l.lineStatus,
        ]) + "\n");
      }
    }
  }

  res.end();
});

// ── GET /purchase-orders ──────────────────────────────────────────────────────

router.get("/purchase-orders", async (req, res) => {
  const { status, q } = req.query as { status?: string; q?: string };

  // When a search term is present, find PO IDs whose lines match by SKU / product name
  let skuMatchPoIds: string[] = [];
  if (q && q.trim().length > 0) {
    const term = `%${q.trim()}%`;
    const matches = await db
      .selectDistinct({ poId: purchaseOrderLinesTable.poId })
      .from(purchaseOrderLinesTable)
      .leftJoin(productsTable, eq(purchaseOrderLinesTable.productId, productsTable.id))
      .where(
        or(
          ilike(productsTable.skuCode, term),
          ilike(productsTable.name, term)
        )
      );
    skuMatchPoIds = matches.map((r) => r.poId);
  }

  const buildWhere = () => {
    const conditions: ReturnType<typeof eq>[] = [];
    if (status) conditions.push(eq(purchaseOrdersTable.status, status as any));
    if (q && q.trim().length > 0) {
      const term = `%${q.trim()}%`;
      const searchOr = or(
        ilike(purchaseOrdersTable.poNumber, term),
        ilike(purchaseOrdersTable.supplierName, term),
        ...(skuMatchPoIds.length > 0 ? [inArray(purchaseOrdersTable.id, skuMatchPoIds)] : [])
      );
      conditions.push(searchOr as any);
    }
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return and(...conditions);
  };

  const pos = await db.query.purchaseOrdersTable.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    where: buildWhere(),
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
  expectedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
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
      .values({
        poNumber,
        supplierId: resolvedSupplierId,
        supplierName: resolvedSupplierName,
        notes: body.data.notes,
        expectedDeliveryDate: body.data.expectedDeliveryDate ?? null,
      })
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

    await db.insert(poStatusHistoryTable).values({
      poId: po.id,
      event: "created",
      note: "Purchase order created",
    });

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

// ── POST /purchase-orders/bulk-cancel ────────────────────────────────────────

const BulkIdsZ = z.object({ ids: z.array(z.string().uuid()).min(1) });

router.post("/purchase-orders/bulk-cancel", async (req, res) => {
  const body = BulkIdsZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  const result = await db
    .update(purchaseOrdersTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        inArray(purchaseOrdersTable.id, body.data.ids),
        ne(purchaseOrdersTable.status, "cancelled"),
        ne(purchaseOrdersTable.status, "received")
      )
    )
    .returning({ id: purchaseOrdersTable.id });

  if (result.length > 0) {
    await db.insert(poStatusHistoryTable).values(
      result.map((r) => ({
        poId: r.id,
        event: "cancelled" as const,
        note: "Cancelled via bulk action",
      }))
    );
  }

  res.json({ cancelled: result.length });
});

// ── DELETE /purchase-orders/bulk-delete ───────────────────────────────────────

router.delete("/purchase-orders/bulk-delete", async (req, res) => {
  const body = BulkIdsZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  const result = await db
    .delete(purchaseOrdersTable)
    .where(
      and(
        inArray(purchaseOrdersTable.id, body.data.ids),
        eq(purchaseOrdersTable.status, "draft")
      )
    )
    .returning({ id: purchaseOrdersTable.id });

  res.json({ deleted: result.length });
});

// ── POST /purchase-orders/:id/duplicate ──────────────────────────────────────

router.post("/purchase-orders/:id/duplicate", async (req, res) => {
  const original = await db.query.purchaseOrdersTable.findFirst({
    where: eq(purchaseOrdersTable.id, req.params.id),
  });
  if (!original) { res.status(404).json({ error: "Not found" }); return; }

  const originalLines = await db
    .select()
    .from(purchaseOrderLinesTable)
    .where(eq(purchaseOrderLinesTable.poId, original.id));

  const poNumber = generatePoNumber();
  const [newPo] = await db
    .insert(purchaseOrdersTable)
    .values({
      poNumber,
      supplierId: original.supplierId,
      supplierName: original.supplierName,
      notes: original.notes,
      // delivery date intentionally omitted — user should set a fresh one
    })
    .returning();

  if (originalLines.length > 0) {
    await db.insert(purchaseOrderLinesTable).values(
      originalLines.map((l) => ({
        poId: newPo.id,
        productId: l.productId,
        qtyOrdered: l.qtyOrdered,
        unitCost: l.unitCost,
      }))
    );
  }

  await db.insert(poStatusHistoryTable).values({
    poId: newPo.id,
    event: "duplicated_from",
    note: `Duplicated from ${original.poNumber}`,
  });

  res.status(201).json(newPo);
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

// ── GET /purchase-orders/:id/history ─────────────────────────────────────────

router.get("/purchase-orders/:id/history", async (req, res) => {
  const po = await db.query.purchaseOrdersTable.findFirst({
    where: eq(purchaseOrdersTable.id, req.params.id),
  });
  if (!po) { res.status(404).json({ error: "Not found" }); return; }

  const history = await db
    .select()
    .from(poStatusHistoryTable)
    .where(eq(poStatusHistoryTable.poId, po.id))
    .orderBy(poStatusHistoryTable.createdAt);

  res.json(history);
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

  const statusLabel: Record<string, string> = {
    ordered: "Marked as ordered",
    cancelled: "Purchase order cancelled",
  };
  await db.insert(poStatusHistoryTable).values({
    poId: updated.id,
    event: body.data.status,
    note: statusLabel[body.data.status] ?? body.data.status,
  });

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

  // Record receive history
  const updatedPoStatus = updatedPo!.status;
  const receiveHistoryEvent =
    updatedPoStatus === "received"
      ? "received"
      : "partially_received";
  await db.insert(poStatusHistoryTable).values({
    poId: po.id,
    event: receiveHistoryEvent,
    note:
      receiveHistoryEvent === "received"
        ? `All items fully received (${movementsCreated} line${movementsCreated !== 1 ? "s" : ""})`
        : `Partially received (${movementsCreated} line${movementsCreated !== 1 ? "s" : ""})`,
  });

  res.json({
    po: await formatPo(updatedPo!, updatedLines as any),
    movementsCreated,
  });
});

// ── PATCH /purchase-orders/:id/delivery-date ─────────────────────────────────

const UpdateDeliveryDateZ = z.object({
  expectedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

router.patch("/purchase-orders/:id/delivery-date", async (req, res) => {
  const body = UpdateDeliveryDateZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }
  const po = await db.query.purchaseOrdersTable.findFirst({
    where: eq(purchaseOrdersTable.id, req.params.id),
  });
  if (!po) { res.status(404).json({ error: "Not found" }); return; }

  const [updated] = await db
    .update(purchaseOrdersTable)
    .set({ expectedDeliveryDate: body.data.expectedDeliveryDate, updatedAt: new Date() })
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

// ── POST /purchase-orders/:id/email ──────────────────────────────────────────

const SendPoEmailZ = z.object({
  to: z.string().email(),
});

router.post("/purchase-orders/:id/email", async (req, res) => {
  const body = SendPoEmailZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  const po = await db.query.purchaseOrdersTable.findFirst({
    where: eq(purchaseOrdersTable.id, req.params.id),
  });
  if (!po) { res.status(404).json({ error: "Not found" }); return; }
  if (po.status === "cancelled") {
    res.status(400).json({ error: "Cannot email a cancelled PO" });
    return;
  }

  const lines = await db
    .select({
      skuCode: productsTable.skuCode,
      productName: productsTable.name,
      qtyOrdered: purchaseOrderLinesTable.qtyOrdered,
      unitCost: purchaseOrderLinesTable.unitCost,
    })
    .from(purchaseOrderLinesTable)
    .leftJoin(productsTable, eq(purchaseOrderLinesTable.productId, productsTable.id))
    .where(eq(purchaseOrderLinesTable.poId, po.id));

  const result = await sendPoEmail({
    to: body.data.to,
    poNumber: po.poNumber,
    supplierName: po.supplierName,
    notes: po.notes,
    lines: lines.map((l) => ({
      skuCode: l.skuCode ?? null,
      productName: l.productName ?? null,
      qtyOrdered: l.qtyOrdered,
      unitCost: l.unitCost ? parseFloat(l.unitCost) : null,
    })),
  });

  res.json({ emailId: result.id, to: body.data.to, poNumber: po.poNumber });
});

// ── GET /purchase-orders/:id/grn ─────────────────────────────────────────────

router.get("/purchase-orders/:id/grn", async (req, res) => {
  const po = await db.query.purchaseOrdersTable.findFirst({
    where: eq(purchaseOrdersTable.id, req.params.id),
  });
  if (!po) { res.status(404).json({ error: "Not found" }); return; }

  const [lines, receiptEvents, movements] = await Promise.all([
    db
      .select({
        id: purchaseOrderLinesTable.id,
        productId: purchaseOrderLinesTable.productId,
        productName: productsTable.name,
        skuCode: productsTable.skuCode,
        qtyOrdered: purchaseOrderLinesTable.qtyOrdered,
        qtyReceived: purchaseOrderLinesTable.qtyReceived,
        unitCost: purchaseOrderLinesTable.unitCost,
      })
      .from(purchaseOrderLinesTable)
      .leftJoin(productsTable, eq(purchaseOrderLinesTable.productId, productsTable.id))
      .where(eq(purchaseOrderLinesTable.poId, po.id)),

    db
      .select()
      .from(poStatusHistoryTable)
      .where(
        and(
          eq(poStatusHistoryTable.poId, po.id),
          sql`${poStatusHistoryTable.event} IN ('received', 'partially_received')`,
        ),
      )
      .orderBy(poStatusHistoryTable.createdAt),

    db
      .select({
        id: inventoryMovementsTable.id,
        productId: inventoryMovementsTable.productId,
        productName: productsTable.name,
        skuCode: productsTable.skuCode,
        binCode: binsTable.code,
        binName: binsTable.name,
        zoneName: zonesTable.name,
        warehouseName: warehousesTable.name,
        quantity: inventoryMovementsTable.quantity,
        createdAt: inventoryMovementsTable.createdAt,
      })
      .from(inventoryMovementsTable)
      .innerJoin(productsTable, eq(inventoryMovementsTable.productId, productsTable.id))
      .innerJoin(binsTable, eq(inventoryMovementsTable.binId, binsTable.id))
      .innerJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
      .innerJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
      .where(
        and(
          eq(inventoryMovementsTable.referenceId, po.id),
          eq(inventoryMovementsTable.movementType, "inbound"),
        ),
      )
      .orderBy(inventoryMovementsTable.createdAt),
  ]);

  res.json({
    poId: po.id,
    poNumber: po.poNumber,
    supplierName: po.supplierName,
    supplierId: po.supplierId ?? null,
    status: po.status,
    notes: po.notes ?? null,
    createdAt: po.createdAt,
    expectedDeliveryDate: po.expectedDeliveryDate ?? null,
    lines: lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: l.productName ?? "",
      skuCode: l.skuCode ?? "",
      qtyOrdered: l.qtyOrdered,
      qtyReceived: l.qtyReceived,
      unitCost: l.unitCost ?? null,
    })),
    receiptEvents,
    movements: movements.map((m) => ({
      id: m.id,
      productId: m.productId,
      productName: m.productName ?? "",
      skuCode: m.skuCode ?? "",
      binCode: m.binCode,
      binName: m.binName ?? null,
      zoneName: m.zoneName,
      warehouseName: m.warehouseName,
      quantity: m.quantity,
      createdAt: m.createdAt,
    })),
  });
});

export { router as purchasingRouter };
