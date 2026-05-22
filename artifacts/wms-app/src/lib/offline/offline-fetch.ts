// ─── offlineFetch ──────────────────────────────────────────────────────────────
// Wraps customFetch with offline detection. On network error, queues the request
// for later replay instead of throwing.

import { customFetch } from "@workspace/api-client-react";
import { networkDetector } from "./network";
import { enqueueMutation } from "./db";
import { invalidateCachedQueries } from "./query-cache";

interface OfflineFetchOptions {
  /** Entity type for the mutation queue (e.g., "pick-line", "receipt", "dispatch") */
  entityType: string;
  /** Extract entity ID from the request body or URL */
  entityId?: string;
  /** Query cache keys to invalidate on success */
  invalidateKeys?: string[];
}

/**
 * Fetch with offline support.
 * - GET: if offline, throws (caller should use cached data from QueryClient)
 * - POST/PUT/DELETE: if offline, queues mutation and returns { queued: true }
 */
export async function offlineFetch<T>(
  url: string,
  options: RequestInit & OfflineFetchOptions
): Promise<T> {
  const { entityType, entityId, invalidateKeys, ...fetchOptions } = options;

  if (!networkDetector.isOnline) {
    // Only queue mutations (not reads)
    const method = (fetchOptions.method || "GET").toUpperCase();
    if (method !== "GET") {
      await enqueueMutation({
        url,
        method,
        body: fetchOptions.body ? String(fetchOptions.body) : "",
        headers: fetchOptions.headers
          ? Object.fromEntries(new Headers(fetchOptions.headers).entries())
          : { "Content-Type": "application/json" },
        entityType,
        entityId: entityId || "unknown",
        clientTimestamp: Date.now(),
      });
      return { queued: true, offline: true } as T;
    }
    throw new Error("No cached data available offline");
  }

  try {
    const result = await customFetch<T>(url, fetchOptions as RequestInit);

    // Invalidate related cache entries on successful mutation
    const method = (fetchOptions.method || "GET").toUpperCase();
    if (method !== "GET" && invalidateKeys) {
      for (const key of invalidateKeys) {
        invalidateCachedQueries(key).catch(() => {});
      }
    }

    return result;
  } catch (err) {
    // If it's a network error (not an API error), queue it
    if (
      err instanceof TypeError ||
      (err instanceof Error && err.message.includes("fetch"))
    ) {
      const method = (fetchOptions.method || "GET").toUpperCase();
      if (method !== "GET") {
        await enqueueMutation({
          url,
          method,
          body: fetchOptions.body ? String(fetchOptions.body) : "",
          headers: fetchOptions.headers
            ? Object.fromEntries(new Headers(fetchOptions.headers).entries())
            : { "Content-Type": "application/json" },
          entityType,
          entityId: entityId || "unknown",
          clientTimestamp: Date.now(),
        });
        return { queued: true, offline: true } as T;
      }
    }
    throw err;
  }
}
