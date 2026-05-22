// ─── OfflineBanner ─────────────────────────────────────────────────────────────
// Fixed top banner showing offline status and queued action count.

import { useNetworkStatus } from "@/hooks/use-network-status";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { WifiOff, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const { pendingCount, isSyncing, hasAuthError, sync } = useSyncStatus();

  // Fully synced and online — don't show
  if (isOnline && pendingCount === 0 && !hasAuthError) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-colors ${
        !isOnline
          ? "bg-amber-500 text-white"
          : hasAuthError
          ? "bg-red-500 text-white"
          : isSyncing
          ? "bg-blue-500 text-white"
          : "bg-emerald-500 text-white"
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {!isOnline && (
          <>
            <WifiOff className="w-4 h-4" />
            <span>
              You are offline.{" "}
              {pendingCount > 0
                ? `${pendingCount} action(s) queued for sync.`
                : "Changes will sync when connection is restored."}
            </span>
          </>
        )}
        {isOnline && hasAuthError && (
          <>
            <AlertTriangle className="w-4 h-4" />
            <span>Session expired. Please sign in again to sync your changes.</span>
          </>
        )}
        {isOnline && !hasAuthError && isSyncing && pendingCount > 0 && (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Syncing {pendingCount} action(s)...</span>
          </>
        )}
        {isOnline && !hasAuthError && !isSyncing && pendingCount > 0 && (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>
              {pendingCount} pending action(s).{" "}
              <Button
                variant="link"
                size="sm"
                className="text-white underline h-auto p-0 text-sm"
                onClick={() => sync()}
              >
                Sync now
              </Button>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
