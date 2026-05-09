import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Currency formatting ─────────────────────────────────────────────────────────

const currencySymbols: Record<string, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF",
  CNY: "¥",
  KRW: "₩",
  SGD: "S$",
  AED: "د.إ",
  SAR: "﷼",
}

/** Get the symbol for a currency code (e.g. "USD" → "$") */
export function getCurrencySymbol(code: string): string {
  return currencySymbols[code] ?? code
}

/**
 * Format a number as currency.
 * @param amount - The numeric amount
 * @param currency - ISO currency code (e.g. "USD", "INR", "EUR")
 * @param options - Intl.NumberFormatOptions overrides
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = "USD",
  options?: Intl.NumberFormatOptions
): string {
  if (amount == null || amount === "") return "—"
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  if (isNaN(num)) return "—"
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(num)
  } catch {
    // Fallback for unsupported currency codes
    const sym = getCurrencySymbol(currency)
    return `${sym}${num.toFixed(2)}`
  }
}

/**
 * Format a compact currency value (e.g. 1.2K, 3.5M) for dashboards.
 */
export function formatCurrencyCompact(
  amount: number | string | null | undefined,
  currency: string = "USD"
): string {
  if (amount == null || amount === "") return "—"
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  if (isNaN(num)) return "—"
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(num)
  } catch {
    const sym = getCurrencySymbol(currency)
    return `${sym}${num.toFixed(0)}`
  }
}
