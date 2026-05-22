// ─── useNetworkStatus ─────────────────────────────────────────────────────────
// React hook for online/offline state. Subscribes to NetworkDetector.

import { useState, useEffect } from "react";
import { networkDetector } from "@/lib/offline/network";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(networkDetector.isOnline);

  useEffect(() => {
    const unsub = networkDetector.subscribe(setIsOnline);
    networkDetector.start();
    return () => {
      unsub();
      // Don't stop detector on unmount — it's a singleton
    };
  }, []);

  return { isOnline };
}
