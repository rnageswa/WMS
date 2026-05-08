import { pgTable, uuid, text, numeric, boolean, timestamp, date, index } from "drizzle-orm/pg-core";

// ── Currencies ─────────────────────────────────────────────────────────────────

export const currenciesTable = pgTable(
  "currencies",
  {
    code: text("code").primaryKey(), // USD, INR, EUR
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    isBase: boolean("is_base").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("currencies_base_idx").on(t.isBase)]
);

// ── Exchange Rates ──────────────────────────────────────────────────────────────

export const exchangeRatesTable = pgTable(
  "exchange_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromCurrency: text("from_currency").notNull(),
    toCurrency: text("to_currency").notNull(),
    rate: numeric("rate", { precision: 12, scale: 6 }).notNull(),
    effectiveDate: date("effective_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("exchange_rates_from_to_idx").on(t.fromCurrency, t.toCurrency),
    index("exchange_rates_effective_idx").on(t.effectiveDate),
  ]
);

// ── Types ────────────────────────────────────────────────────────────────────────

export type Currency = typeof currenciesTable.$inferSelect;
export type ExchangeRate = typeof exchangeRatesTable.$inferSelect;
