import { db } from "@workspace/db";
import { currenciesTable, exchangeRatesTable } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Get exchange rate from -> to on a given date (defaults to latest).
 * Returns rate as a number, or null if no rate found.
 */
export async function getRate(from: string, to: string, date?: string): Promise<number | null> {
  if (from === to) return 1;

  const effectiveDate = date || new Date().toISOString().split("T")[0];

  const [rate] = await db
    .select({ rate: exchangeRatesTable.rate })
    .from(exchangeRatesTable)
    .where(
      and(
        eq(exchangeRatesTable.fromCurrency, from),
        eq(exchangeRatesTable.toCurrency, to),
        sql`${exchangeRatesTable.effectiveDate} <= ${effectiveDate}`
      )
    )
    .orderBy(desc(exchangeRatesTable.effectiveDate))
    .limit(1);

  return rate ? parseFloat(rate.rate) : null;
}

/**
 * Convert amount from one currency to another.
 * Returns { convertedAmount, rate } or { convertedAmount: amount, rate: 1 } if same currency.
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
  date?: string
): Promise<{ convertedAmount: number; rate: number }> {
  if (from === to) return { convertedAmount: amount, rate: 1 };

  const rate = await getRate(from, to, date);
  if (!rate) {
    throw new Error(`No exchange rate found for ${from} -> ${to}`);
  }

  return {
    convertedAmount: Math.round(amount * rate * 100) / 100,
    rate,
  };
}

/**
 * Seed default currencies and exchange rates.
 */
export async function seedCurrencies() {
  const existing = await db.select().from(currenciesTable).limit(1);
  if (existing.length > 0) return; // Already seeded

  await db.insert(currenciesTable).values([
    { code: "USD", name: "US Dollar", symbol: "$", isBase: true },
    { code: "INR", name: "Indian Rupee", symbol: "₹", isBase: false },
    { code: "EUR", name: "Euro", symbol: "€", isBase: false },
  ]);

  const today = new Date().toISOString().split("T")[0];

  await db.insert(exchangeRatesTable).values([
    { fromCurrency: "USD", toCurrency: "INR", rate: "83.120000", effectiveDate: today },
    { fromCurrency: "USD", toCurrency: "EUR", rate: "0.920000", effectiveDate: today },
    { fromCurrency: "INR", toCurrency: "USD", rate: "0.012030", effectiveDate: today },
    { fromCurrency: "EUR", toCurrency: "USD", rate: "1.086960", effectiveDate: today },
    { fromCurrency: "INR", toCurrency: "EUR", rate: "0.011070", effectiveDate: today },
    { fromCurrency: "EUR", toCurrency: "INR", rate: "90.347830", effectiveDate: today },
  ]);
}
