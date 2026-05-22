import { QueryClient } from "@tanstack/react-query";
import { getCache, setCache } from "@/lib/offline/db";
import { getTTLForUrl } from "@/lib/offline/query-cache";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

// ─── IndexedDB Persistence ────────────────────────────────────────────────────
// Hydrate from cache on startup, persist successful queries to IndexedDB.

const STORAGE_KEY = "wareiq-query-cache";

// Hydrate from IndexedDB on startup
export async function hydrateQueryClient(): Promise<void> {
  try {
    const cacheStr = localStorage.getItem(STORAGE_KEY);
    if (!cacheStr) return;
    const cache = JSON.parse(cacheStr) as Record<string, { data: unknown; expiresAt: number }>;
    const now = Date.now();
    for (const [key, entry] of Object.entries(cache)) {
      if (entry.expiresAt > now) {
        try {
          queryClient.setQueryData(JSON.parse(key), entry.data);
        } catch {
          // skip invalid keys
        }
      }
    }
  } catch {
    // ignore hydration errors
  }
}

// Persist query data to IndexedDB after successful fetch
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.action?.type === "success") {
    const query = event.query;
    const key = JSON.stringify(query.queryKey);
    const ttl = getTTLForUrl(key);
    setCache(key, query.state.data, ttl).catch(() => {});
    // Also keep a lightweight copy in localStorage for fast hydration
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      existing[key] = { data: query.state.data, expiresAt: Date.now() + ttl };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // quota exceeded — ignore
    }
  }
});
