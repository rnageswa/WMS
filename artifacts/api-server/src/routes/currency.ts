import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { currenciesTable, exchangeRatesTable } from "@workspace/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { z } from "zod";
import { convertCurrency, getRate, getBaseCurrency, setBaseCurrency } from "../services/currency.service";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

// ── GET /currencies — list all currencies (public) ─────────────────────────────

router.get("/currencies", async (_req, res) => {
  const currencies = await db
    .select()
    .from(currenciesTable)
    .orderBy(currenciesTable.code);
  res.json(currencies);
});

// ── GET /currencies/base — get base currency (public) ──────────────────────────

router.get("/currencies/base", async (_req, res) => {
  try {
    const code = await getBaseCurrency();
    res.json({ code });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /currencies/base — set base currency (admin) ───────────────────────────

router.put("/currencies/base", requireAuth, requireRole("admin"), async (req, res) => {
  const body = z.object({ code: z.string().min(2).max(5) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }
  try {
    const code = await setBaseCurrency(body.data.code);
    res.json({ code });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── POST /currencies — add a currency (admin) ─────────────────────────────────

const CreateCurrencyZ = z.object({
  code: z.string().min(2).max(5).toUpperCase(),
  name: z.string().min(1),
  symbol: z.string().min(1).max(5),
  isBase: z.boolean().optional().default(false),
});

router.post("/currencies", requireAuth, requireRole("admin"), async (req, res) => {
  const body = CreateCurrencyZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  try {
    const [currency] = await db.insert(currenciesTable).values(body.data).returning();
    res.status(201).json(currency);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Currency already exists" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// ── DELETE /currencies/:code — delete a currency (admin) ──────────────────────

router.delete("/currencies/:code", requireAuth, requireRole("admin"), async (req, res) => {
  const { code } = req.params;

  const [existing] = await db.select().from(currenciesTable).where(eq(currenciesTable.code, code.toUpperCase())).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Currency not found" });
    return;
  }

  if (existing.isBase) {
    res.status(400).json({ error: "Cannot delete base currency. Change base first." });
    return;
  }

  await db.delete(currenciesTable).where(eq(currenciesTable.code, code.toUpperCase()));
  res.status(204).send();
});

// ── GET /exchange-rates — list rates (public) ──────────────────────────────────

router.get("/exchange-rates", async (req, res) => {
  const { from, to, fromDate } = req.query as { from?: string; to?: string; fromDate?: string };

  const conditions = [];
  if (from) conditions.push(eq(exchangeRatesTable.fromCurrency, from));
  if (to) conditions.push(eq(exchangeRatesTable.toCurrency, to));
  if (fromDate) conditions.push(gte(exchangeRatesTable.effectiveDate, fromDate));

  const rates = await db
    .select()
    .from(exchangeRatesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(exchangeRatesTable.effectiveDate));

  res.json(rates);
});

// ── POST /exchange-rates — add/update rate (admin) ─────────────────────────────

const CreateRateZ = z.object({
  fromCurrency: z.string().min(2).max(5).toUpperCase(),
  toCurrency: z.string().min(2).max(5).toUpperCase(),
  rate: z.number().positive(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.post("/exchange-rates", requireAuth, requireRole("admin"), async (req, res) => {
  const body = CreateRateZ.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  const { fromCurrency, toCurrency, rate, effectiveDate } = body.data;

  if (fromCurrency === toCurrency) {
    res.status(400).json({ error: "from and to currency must differ" });
    return;
  }

  try {
    const [record] = await db
      .insert(exchangeRatesTable)
      .values({
        fromCurrency,
        toCurrency,
        rate: String(rate),
        effectiveDate,
      })
      .returning();
    res.status(201).json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /convert — convert amount between currencies (public) ──────────────────

router.get("/convert", async (req, res) => {
  const { from, to, amount } = req.query as { from?: string; to?: string; amount?: string };

  if (!from || !to || !amount) {
    res.status(400).json({ error: "from, to, and amount are required" });
    return;
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    res.status(400).json({ error: "amount must be a positive number" });
    return;
  }

  try {
    const result = await convertCurrency(parsedAmount, from.toUpperCase(), to.toUpperCase());
    res.json({
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      originalAmount: parsedAmount,
      convertedAmount: result.convertedAmount,
      rate: result.rate,
    });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export { router as currencyRouter };
