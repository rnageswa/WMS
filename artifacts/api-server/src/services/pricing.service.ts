import { db } from "@workspace/db";
import { priceListsTable, priceListItemsTable } from "@workspace/db/schema";
import { eq, and, sql, lte, gte } from "drizzle-orm";

export interface DefaultPriceResult {
  unitPrice: number;
  currency: string;
  priceListId: string;
  priceListName: string;
}

/**
 * Get the default price for a product from the default price list.
 * Checks date validity (validFrom <= today, validTo >= today or null).
 * Returns null if no price found.
 */
export async function getDefaultPrice(productId: string): Promise<DefaultPriceResult | null> {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Find the default price list
  const [defaultList] = await db
    .select()
    .from(priceListsTable)
    .where(and(
      eq(priceListsTable.isDefault, true),
      eq(priceListsTable.isActive, true),
      lte(priceListsTable.validFrom, today),
      sql`(${priceListsTable.validTo} IS NULL OR ${priceListsTable.validTo} >= ${today})`
    ))
    .limit(1);

  if (!defaultList) return null;

  // Find the price list item for this product
  const [item] = await db
    .select()
    .from(priceListItemsTable)
    .where(and(
      eq(priceListItemsTable.priceListId, defaultList.id),
      eq(priceListItemsTable.productId, productId),
      lte(priceListItemsTable.validFrom, today),
      sql`(${priceListItemsTable.validTo} IS NULL OR ${priceListItemsTable.validTo} >= ${today})`
    ))
    .limit(1);

  if (!item) return null;

  return {
    unitPrice: parseFloat(item.unitPrice),
    currency: item.currency,
    priceListId: defaultList.id,
    priceListName: defaultList.name,
  };
}
