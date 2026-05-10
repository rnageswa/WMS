// ── Sales Order Repository ──────────────────────────────────────────────────────

import { db } from "@workspace/db";
import {
  salesOrdersTable,
  salesOrderLinesTable,
  salesOrderHistoryTable,
  productsTable,
} from "@workspace/db/schema";
import { eq, and, desc, like, sql, or, type SQL } from "drizzle-orm";

export interface OrderFilters {
  q?: string;
  status?: string;
  customer?: string;
}

export const orderRepository = {
  findAll(filters?: OrderFilters) {
    const conditions: (SQL | undefined)[] = [];
    if (filters?.q) {
      conditions.push(
        or(
          like(salesOrdersTable.orderNumber, `%${filters.q}%`),
          like(salesOrdersTable.customerName, `%${filters.q}%`)
        )
      );
    }
    if (filters?.status) {
      conditions.push(eq(salesOrdersTable.status, filters.status as any));
    }
    if (filters?.customer) {
      conditions.push(like(salesOrdersTable.customerName, `%${filters.customer}%`));
    }
    const where = conditions.length > 0 ? and(...conditions.filter(Boolean) as SQL[]) : undefined;

    return db
      .select()
      .from(salesOrdersTable)
      .where(where)
      .orderBy(desc(salesOrdersTable.createdAt));
  },

  findById(id: string) {
    return db.select().from(salesOrdersTable).where(eq(salesOrdersTable.id, id)).limit(1);
  },

  async findWithLines(id: string) {
    const [order] = await db.select().from(salesOrdersTable).where(eq(salesOrdersTable.id, id)).limit(1);
    if (!order) return null;

    const lines = await db
      .select({
        id: salesOrderLinesTable.id,
        productId: salesOrderLinesTable.productId,
        productName: productsTable.name,
        skuCode: productsTable.skuCode,
        qtyOrdered: salesOrderLinesTable.qtyOrdered,
        qtyPicked: salesOrderLinesTable.qtyPicked,
        qtyPacked: salesOrderLinesTable.qtyPacked,
        qtyShipped: salesOrderLinesTable.qtyShipped,
        unitPrice: salesOrderLinesTable.unitPrice,
        costAtTime: salesOrderLinesTable.costAtTime,
        status: salesOrderLinesTable.status,
      })
      .from(salesOrderLinesTable)
      .leftJoin(productsTable, eq(salesOrderLinesTable.productId, productsTable.id))
      .where(eq(salesOrderLinesTable.orderId, id));

    const history = await db
      .select()
      .from(salesOrderHistoryTable)
      .where(eq(salesOrderHistoryTable.orderId, id))
      .orderBy(desc(salesOrderHistoryTable.createdAt));

    return { ...order, lines, history };
  },

  create(data: typeof salesOrdersTable.$inferInsert) {
    return db.insert(salesOrdersTable).values(data).returning();
  },

  update(id: string, data: Partial<typeof salesOrdersTable.$inferInsert>) {
    return db
      .update(salesOrdersTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(salesOrdersTable.id, id))
      .returning();
  },

  delete(id: string) {
    return db.delete(salesOrdersTable).where(eq(salesOrdersTable.id, id));
  },

  // ── Lines ─────────────────────────────────────────────────────────────────

  createLines(lines: (typeof salesOrderLinesTable.$inferInsert)[]) {
    return db.insert(salesOrderLinesTable).values(lines).returning();
  },

  updateLine(lineId: string, data: Partial<typeof salesOrderLinesTable.$inferInsert>) {
    return db
      .update(salesOrderLinesTable)
      .set(data)
      .where(eq(salesOrderLinesTable.id, lineId))
      .returning();
  },

  // ── History ───────────────────────────────────────────────────────────────

  addHistory(orderId: string, event: string, note?: string) {
    return db.insert(salesOrderHistoryTable).values({ orderId, event: event as any, note });
  },
};
