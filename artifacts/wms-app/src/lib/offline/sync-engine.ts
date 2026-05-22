// ─── Sync Engine ───────────────────────────────────────────────────────────────
// Replays queued mutations FIFO when online. Handles retries, conflicts, auth errors.

import {
  getPendingMutations,
  updateMutation,
  removeMutation,
  getAllMutations,
} from "./db";
import { networkDetector } from "./network";
import type { QueuedMutation } from "./db";

export interface SyncResult {
  total: number;
  succeeded: number;
  failed: number;
  conflicts: number;
  authError: boolean;
}

type SyncListener = (result: SyncResult) => void;

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 1000; // 1s

let isSyncing = false;
let listeners: Set<SyncListener> = new Set();

export function onSyncComplete(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getIsSyncing(): boolean {
  return isSyncing;
}

export async function triggerSync(): Promise<SyncResult> {
  if (isSyncing) {
    return { total: 0, succeeded: 0, failed: 0, conflicts: 0, authError: false };
  }
  if (!networkDetector.isOnline) {
    return { total: 0, succeeded: 0, failed: 0, conflicts: 0, authError: false };
  }

  isSyncing = true;
  const result: SyncResult = {
    total: 0,
    succeeded: 0,
    failed: 0,
    conflicts: 0,
    authError: false,
  };

  try {
    const pending = await getPendingMutations();
    result.total = pending.length;

    for (const mutation of pending) {
      // Re-check connectivity before each mutation
      if (!networkDetector.isOnline) {
        break;
      }

      try {
        await updateMutation(mutation.id, { status: "syncing" });

        const response = await fetch(mutation.url, {
          method: mutation.method,
          headers: {
            "Content-Type": "application/json",
            ...mutation.headers,
            "X-Client-Timestamp": String(mutation.clientTimestamp),
          },
          body: mutation.body,
          credentials: "include",
        });

        if (response.status === 401) {
          // Auth expired — pause sync, don't discard mutations
          await updateMutation(mutation.id, {
            status: "pending",
            error: "auth_required",
          });
          result.authError = true;
          break;
        }

        if (response.status === 409) {
          // Conflict — mark for resolution
          await updateMutation(mutation.id, {
            status: "conflict",
            error: "conflict",
          });
          result.conflicts++;
          continue;
        }

        if (!response.ok) {
          // Server error — retry later
          const newRetry = mutation.retryCount + 1;
          if (newRetry >= MAX_RETRIES) {
            await updateMutation(mutation.id, {
              status: "failed",
              retryCount: newRetry,
              error: `HTTP ${response.status}`,
            });
            result.failed++;
          } else {
            await updateMutation(mutation.id, {
              status: "pending",
              retryCount: newRetry,
            });
            // Exponential backoff: wait before continuing
            await delay(BASE_RETRY_DELAY * Math.pow(2, newRetry));
          }
          continue;
        }

        // Success
        await removeMutation(mutation.id);
        result.succeeded++;
      } catch (err) {
        // Network error during replay — stop sync, will retry on next online event
        await updateMutation(mutation.id, {
          status: "pending",
          error: err instanceof Error ? err.message : "Network error",
        });
        break;
      }
    }
  } finally {
    isSyncing = false;
    listeners.forEach((l) => l(result));
  }

  return result;
}

export async function retryMutation(id: string): Promise<void> {
  await updateMutation(id, {
    status: "pending",
    retryCount: 0,
    error: undefined,
  });
  triggerSync();
}

export async function resolveConflict(
  id: string,
  useClient: boolean
): Promise<void> {
  if (useClient) {
    // Force: bump timestamp and retry
    const mutations = await getAllMutations();
    const m = mutations.find((x) => x.id === id);
    if (m) {
      await updateMutation(id, {
        status: "pending",
        clientTimestamp: Date.now(),
        retryCount: 0,
        error: undefined,
      });
    }
  } else {
    // Discard: use server version
    await removeMutation(id);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
