// ── Supplier Repository ─────────────────────────────────────────────────────────

import { db } from "@workspace/db";
import { suppliersTable, purchaseOrdersTable, purchaseOrderLinesTable } from "@workspace/db/schema";
import { eq, and, like, desc, sql, gte, type SQL } from "drizzle-orm";

export const supplierRepository = {
  findAll(search?: string) {
    const conditions: (SQL | undefined)[] = [eq(suppliersTable.isActive, true)];
    if (search) {
      conditions.push(sql`(${suppliersTable.name} ILIKE ${`%${search}%`} OR ${suppliersTable.contactName} ILIKE ${`%${search}%`})`);
    }
    return db
      .select()
      .from(suppliersTable)
      .where(and(...conditions))
      .orderBy(suppliersTable.name);
  },

  findById(id: string) {
    return db.select().from(suppliersTable).where(eq(suppliersTable.id, id)).limit(1);
  },

  create(data: typeof suppliersTable.$inferInsert) {
    return db.insert(suppliersTable).values(data).returning();
  },

  update(id: string, data: Partial<typeof suppliersTable.$inferInsert>) {
    return db.update(suppliersTable).set({ ...data, updatedAt: new Date() }).where(eq(suppliersTable.id, id)).returning();
  },

  delete(id: string) {
    return db.update(suppliersTable).set({ isActive: false, updatedAt: new Date() }).where(eq(suppliersTable.id, id)).returning();
  },

  // ── Supplier Performance Metrics ──────────────────────────────────────────

  async getPerformanceMetrics(supplierId: string) {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // last 90 days

    const deliveries = await db
      .select({
        poId: purchaseOrdersTable.id,
        orderedAt: purchaseOrdersTable.createdAt,
        expectedDelivery: purchaseOrdersTable.expectedDeliveryDate,
        status: purchaseOrdersTable.status,
        totalOrdered: sql<number>`coalesce(sum(${purchaseOrderLinesTable.qtyOrdered}), 0)::int`,
        totalReceived: sql<number>`coalesce(sum(${purchaseOrderLinesTable.qtyReceived}), 0)::int`,
      })
      .from(purchaseOrdersTable)
      .leftJoin(purchaseOrderLinesTable, eq(purchaseOrdersTable.id, purchaseOrderLinesTable.poId))
      .where(and(eq(purchaseOrdersTable.supplierId, supplierId), gte(purchaseOrdersTable.createdAt, since)))
      .groupBy(purchaseOrdersTable.id)
      .orderBy(desc(purchaseOrdersTable.createdAt));

    const totalDeliveries = deliveries.length;
    const onTimeDeliveries = deliveries.filter(d => {
      if (!d.expectedDelivery || !d.orderedAt) return true;
      return new Date(d.orderedAt) <= new Date(d.expectedDelivery);
    }).length;
    const totalOrdered = deliveries.reduce((s, d) => s + d.totalOrdered, 0);
    const totalReceived = deliveries.reduce((s, d) => s + d.totalReceived, 0);

    return {
      supplierId,
      totalDeliveries,
      onTimeRate: totalDeliveries > 0 ? Math.round((onTimeDeliveries / totalDeliveries) * 100) : 0,
      fillRate: totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0,
      totalOrdered,
      totalReceived,
      deliveries,
    };
  },
};
