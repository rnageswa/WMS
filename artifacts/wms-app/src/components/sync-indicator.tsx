// ─── SyncIndicator ─────────────────────────────────────────────────────────────
// Small badge in header showing sync status.

import { useNetworkStatus } from "@/hooks/use-network-status";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SyncIndicator() {
  const { isOnline } = useNetworkStatus();
  const { pendingCount, isSyncing, hasAuthError } = useSyncStatus();

  if (!isOnline) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-300 bg-amber-50 text-amber-700"
      >
        <WifiOff className="w-3 h-3" />
        Offline
        {pendingCount > 0 && (
          <span className="ml-1 text-[10px]">({pendingCount})</span>
        )}
      </Badge>
    );
  }

  if (hasAuthError) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-red-300 bg-red-50 text-red-700"
      >
        <AlertTriangle className="w-3 h-3" />
        Auth expired
      </Badge>
    );
  }

  if (isSyncing) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-blue-300 bg-blue-50 text-blue-700"
      >
        <RefreshCw className="w-3 h-3 animate-spin" />
        Syncing
      </Badge>
    );
  }

  if (pendingCount > 0) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-300 bg-amber-50 text-amber-700"
      >
        <Wifi className="w-3 h-3" />
        {pendingCount} pending
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700"
    >
      <CheckCircle className="w-3 h-3" />
      Synced
    </Badge>
  );
}
