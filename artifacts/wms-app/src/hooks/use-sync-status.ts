// ─── useSyncStatus ─────────────────────────────────────────────────────────────
// React hook for sync state: pending count, isSyncing, hasErrors.

import { useState, useEffect, useCallback } from "react";
import { getQueueSize, getFailedMutations } from "@/lib/offline/db";
import {
  onSyncComplete,
  getIsSyncing,
  triggerSync,
} from "@/lib/offline/sync-engine";
import { networkDetector } from "@/lib/offline/network";

export function useSyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasAuthError, setHasAuthError] = useState(false);

  const refresh = useCallback(async () => {
    const [size, failed] = await Promise.all([
      getQueueSize(),
      getFailedMutations(),
    ]);
    setPendingCount(size);
    setHasAuthError(failed.some((m) => m.error === "auth_required"));
    setIsSyncing(getIsSyncing());
  }, []);

  useEffect(() => {
    refresh();

    // Listen for sync completions
    const unsubSync = onSyncComplete(() => {
      refresh();
    });

    // Listen for network changes — auto-sync when coming online
    const unsubNetwork = networkDetector.subscribe((online) => {
      if (online) {
        triggerSync();
      }
      refresh();
    });

    // Poll for queue size changes (mutations can be added from any tab)
    const interval = setInterval(refresh, 2000);

    return () => {
      unsubSync();
      unsubNetwork();
      clearInterval(interval);
    };
  }, [refresh]);

  return {
    pendingCount,
    isSyncing,
    hasAuthError,
    refresh,
    sync: triggerSync,
  };
}
