// ─── Query Cache ───────────────────────────────────────────────────────────────
// Caches API responses in IndexedDB with TTL for offline reads.
// Hydrates TanStack Query cache on page load.

import { getCache, setCache, invalidateCache } from "./db";

// TTL constants (ms)
export const TTL_PRODUCTS = 24 * 60 * 60 * 1000;       // 24h — rarely change
export const TTL_BINS = 24 * 60 * 60 * 1000;            // 24h — rarely change
export const TTL_INVENTORY = 5 * 60 * 1000;             // 5m — changes frequently
export const TTL_TASKS = 10 * 60 * 1000;                // 10m — moderate change
export const TTL_PURCHASE_ORDERS = 10 * 60 * 1000;      // 10m
export const TTL_SUPPLIERS = 60 * 60 * 1000;            // 1h
export const TTL_DEFAULT = 10 * 60 * 1000;              // 10m default

// Map URL patterns to TTLs
const TTL_MAP: Array<{ pattern: RegExp; ttl: number }> = [
  { pattern: /\/api\/products(\?|$)/, ttl: TTL_PRODUCTS },
  { pattern: /\/api\/bins(\?|$)/, ttl: TTL_BINS },
  { pattern: /\/api\/inventory(\?|$)/, ttl: TTL_INVENTORY },
  { pattern: /\/api\/picking-tasks(\?|$)/, ttl: TTL_TASKS },
  { pattern: /\/api\/purchase-orders(\?|$)/, ttl: TTL_PURCHASE_ORDERS },
  { pattern: /\/api\/suppliers(\?|$)/, ttl: TTL_SUPPLIERS },
  // Finance endpoints
  { pattern: /\/api\/finance\/dashboard/, ttl: 5 * 60 * 1000 },           // 5m — near real-time
  { pattern: /\/api\/finance\/costing/, ttl: 10 * 60 * 1000 },             // 10m — moderate change
  { pattern: /\/api\/finance\/reports/, ttl: 30 * 60 * 1000 },             // 30m — periodic reporting
  { pattern: /\/api\/finance\/pricing\/rules/, ttl: 60 * 60 * 1000 },      // 1h — rarely change
  { pattern: /\/api\/finance\/pricing\/simulate/, ttl: 5 * 60 * 1000 },   // 5m — transient
  { pattern: /\/api\/finance\/margin/, ttl: 5 * 60 * 1000 },               // 5m — near real-time
  { pattern: /\/api\/finance\/landed-costs/, ttl: 15 * 60 * 1000 },        // 15m — per PO
];

export function getTTLForUrl(url: string): number {
  for (const { pattern, ttl } of TTL_MAP) {
    if (pattern.test(url)) return ttl;
  }
  return TTL_DEFAULT;
}

export async function getCachedQuery<T>(key: string): Promise<T | null> {
  const entry = await getCache(key);
  if (entry) {
    return entry.data as T;
  }
  return null;
}

export async function setCachedQuery<T>(
  key: string,
  data: T,
  ttlMs?: number
): Promise<void> {
  const ttl = ttlMs ?? getTTLForUrl(key);
  await setCache(key, data, ttl);
}

export async function invalidateCachedQueries(pattern: string): Promise<void> {
  await invalidateCache(pattern);
}
