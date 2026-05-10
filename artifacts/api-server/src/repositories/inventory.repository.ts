// ── Inventory Repository ────────────────────────────────────────────────────────

import { db } from "@workspace/db";
import {
  inventoryItemsTable,
  inventoryMovementsTable,
  productsTable,
  binsTable,
  zonesTable,
  warehousesTable,
} from "@workspace/db/schema";
import { eq, and, sql, gte, lte, desc, type SQL } from "drizzle-orm";

export interface InventoryFilters {
  productId?: string;
  binId?: string;
  warehouseId?: string;
  lowStock?: boolean;
}

export interface MovementFilters {
  productId?: string;
  binId?: string;
  movementType?: string;
  fromDate?: Date;
  toDate?: Date;
}

export const inventoryRepository = {
  // ── Inventory Items ───────────────────────────────────────────────────────

  findAll(filters?: InventoryFilters) {
    const conditions: (SQL | undefined)[] = [];
    if (filters?.productId) {
      conditions.push(eq(inventoryItemsTable.productId, filters.productId));
    }
    if (filters?.binId) {
      conditions.push(eq(inventoryItemsTable.binId, filters.binId));
    }
    if (filters?.warehouseId) {
      // Join through bins → zones → warehouses
      conditions.push(eq(warehousesTable.id, filters.warehouseId));
    }
    const where = conditions.length > 0 ? and(...conditions.filter(Boolean) as SQL[]) : undefined;

    return db
      .select({
        id: inventoryItemsTable.id,
        productId: inventoryItemsTable.productId,
        productName: productsTable.name,
        skuCode: productsTable.skuCode,
        binId: inventoryItemsTable.binId,
        binCode: binsTable.code,
        zoneName: zonesTable.name,
        warehouseName: warehousesTable.name,
        qtyOnHand: inventoryItemsTable.qtyOnHand,
        avgCost: inventoryItemsTable.avgCost,
        inventoryValue: inventoryItemsTable.inventoryValue,
        updatedAt: inventoryItemsTable.updatedAt,
      })
      .from(inventoryItemsTable)
      .leftJoin(productsTable, eq(inventoryItemsTable.productId, productsTable.id))
      .leftJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
      .leftJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
      .leftJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
      .where(where);
  },

  findById(id: string) {
    return db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, id)).limit(1);
  },

  findByProductAndBin(productId: string, binId: string) {
    return db
      .select()
      .from(inventoryItemsTable)
      .where(and(eq(inventoryItemsTable.productId, productId), eq(inventoryItemsTable.binId, binId)))
      .limit(1);
  },

  async getTotalStockForProduct(productId: string): Promise<number> {
    const rows = await db
      .select({ total: sql<number>`coalesce(sum(${inventoryItemsTable.qtyOnHand}), 0)::int` })
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.productId, productId));
    return rows[0]?.total ?? 0;
  },

  async getStockByWarehouse(productId: string): Promise<{ warehouseId: string; warehouseName: string; total: number }[]> {
    const rows = await db
      .select({
        warehouseId: warehousesTable.id,
        warehouseName: warehousesTable.name,
        total: sql<number>`coalesce(sum(${inventoryItemsTable.qtyOnHand}), 0)::int`,
      })
      .from(inventoryItemsTable)
      .leftJoin(binsTable, eq(inventoryItemsTable.binId, binsTable.id))
      .leftJoin(zonesTable, eq(binsTable.zoneId, zonesTable.id))
      .leftJoin(warehousesTable, eq(zonesTable.warehouseId, warehousesTable.id))
      .where(eq(inventoryItemsTable.productId, productId))
      .groupBy(warehousesTable.id, warehousesTable.name);
    return rows.map(r => ({ warehouseId: r.warehouseId || "", warehouseName: r.warehouseName || "", total: r.total }));
  },

  create(data: typeof inventoryItemsTable.$inferInsert) {
    return db.insert(inventoryItemsTable).values(data).returning();
  },

  update(id: string, data: Partial<typeof inventoryItemsTable.$inferInsert>) {
    return db
      .update(inventoryItemsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(inventoryItemsTable.id, id))
      .returning();
  },

  updateQty(id: string, qtyChange: number) {
    return db
      .update(inventoryItemsTable)
      .set({
        qtyOnHand: sql`qty_on_hand + ${qtyChange}`,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItemsTable.id, id))
      .returning();
  },

  // ── Movements ────────────────────────────────────────────────────────────

  findMovements(filters?: MovementFilters) {
    const conditions: (SQL | undefined)[] = [];
    if (filters?.productId) {
      conditions.push(eq(inventoryMovementsTable.productId, filters.productId));
    }
    if (filters?.binId) {
      conditions.push(eq(inventoryMovementsTable.binId, filters.binId));
    }
    if (filters?.movementType) {
      conditions.push(eq(inventoryMovementsTable.movementType, filters.movementType as any));
    }
    if (filters?.fromDate) {
      conditions.push(gte(inventoryMovementsTable.createdAt, filters.fromDate));
    }
    if (filters?.toDate) {
      conditions.push(lte(inventoryMovementsTable.createdAt, filters.toDate));
    }
    const where = conditions.length > 0 ? and(...conditions.filter(Boolean) as SQL[]) : undefined;

    return db
      .select()
      .from(inventoryMovementsTable)
      .where(where)
      .orderBy(desc(inventoryMovementsTable.createdAt));
  },

  createMovement(data: typeof inventoryMovementsTable.$inferInsert) {
    return db.insert(inventoryMovementsTable).values(data).returning();
  },

  // ── Outbound demand analysis ─────────────────────────────────────────────

  async getDailyOutbound(productId: string, days: number): Promise<{ date: string; quantity: number }[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return db
      .select({
        date: sql<string>`DATE(${inventoryMovementsTable.createdAt})`,
        quantity: sql<number>`coalesce(sum(abs(${inventoryMovementsTable.quantity})), 0)::int`,
      })
      .from(inventoryMovementsTable)
      .where(
        and(
          eq(inventoryMovementsTable.productId, productId),
          eq(inventoryMovementsTable.movementType, "outbound"),
          gte(inventoryMovementsTable.createdAt, since)
        )
      )
      .groupBy(sql`DATE(${inventoryMovementsTable.createdAt})`)
      .orderBy(sql`DATE(${inventoryMovementsTable.createdAt})`);
  },

  async getTotalOutbound(productId: string, days: number): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({ total: sql<number>`coalesce(sum(abs(${inventoryMovementsTable.quantity})), 0)::int` })
      .from(inventoryMovementsTable)
      .where(
        and(
          eq(inventoryMovementsTable.productId, productId),
          eq(inventoryMovementsTable.movementType, "outbound"),
          gte(inventoryMovementsTable.createdAt, since)
        )
      );
    return rows[0]?.total ?? 0;
  },
};
