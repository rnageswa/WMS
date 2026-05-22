// ─── Offline Module ────────────────────────────────────────────────────────────
// Barrel export for offline infrastructure.

export { networkDetector } from "./network";
export {
  getCache,
  setCache,
  invalidateCache,
  enqueueMutation,
  getPendingMutations,
  getAllMutations,
  updateMutation,
  removeMutation,
  getQueueSize,
  getFailedMutations,
  getMeta,
  setMeta,
} from "./db";
export type { QueryCacheEntry, QueuedMutation, SyncMeta } from "./db";
export {
  triggerSync,
  onSyncComplete,
  getIsSyncing,
  retryMutation,
  resolveConflict,
} from "./sync-engine";
export type { SyncResult } from "./sync-engine";
export {
  getCachedQuery,
  setCachedQuery,
  invalidateCachedQueries,
  getTTLForUrl,
  TTL_PRODUCTS,
  TTL_BINS,
  TTL_INVENTORY,
  TTL_TASKS,
  TTL_PURCHASE_ORDERS,
  TTL_SUPPLIERS,
  TTL_DEFAULT,
} from "./query-cache";
export { offlineFetch } from "./offline-fetch";
