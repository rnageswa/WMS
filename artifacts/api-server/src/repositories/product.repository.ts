// ── Product Repository ──────────────────────────────────────────────────────────

import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq, and, like, sql, type SQL } from "drizzle-orm";

export interface ProductFilters {
  isActive?: boolean;
  category?: string;
  search?: string; // matches skuCode or name
}

export const productRepository = {
  findAll(filters?: ProductFilters) {
    const conditions: (SQL | undefined)[] = [];
    if (filters?.isActive !== undefined) {
      conditions.push(eq(productsTable.isActive, filters.isActive));
    }
    if (filters?.category) {
      conditions.push(eq(productsTable.category, filters.category));
    }
    if (filters?.search) {
      const s = `%${filters.search}%`;
      conditions.push(sql`(${productsTable.skuCode} ILIKE ${s} OR ${productsTable.name} ILIKE ${s})`);
    }
    const where = conditions.length > 0 ? and(...conditions.filter(Boolean) as SQL[]) : undefined;
    return db.select().from(productsTable).where(where);
  },

  findById(id: string) {
    return db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  },

  findBySku(skuCode: string) {
    return db.select().from(productsTable).where(eq(productsTable.skuCode, skuCode)).limit(1);
  },

  async findWithStock(id: string) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!product) return null;
    const { inventoryItemsTable } = await import("@workspace/db/schema");
    const stock = await db
      .select({ total: sql<number>`coalesce(sum(${inventoryItemsTable.qtyOnHand}), 0)::int` })
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.productId, id));
    return { ...product, totalStock: stock[0]?.total ?? 0 };
  },

  create(data: typeof productsTable.$inferInsert) {
    return db.insert(productsTable).values(data).returning();
  },

  update(id: string, data: Partial<typeof productsTable.$inferInsert>) {
    return db.update(productsTable).set({ ...data, updatedAt: new Date() }).where(eq(productsTable.id, id)).returning();
  },

  delete(id: string) {
    return db.delete(productsTable).where(eq(productsTable.id, id));
  },
};
