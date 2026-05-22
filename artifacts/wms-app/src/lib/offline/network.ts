// ─── Network Detector ──────────────────────────────────────────────────────────
// Three-layer detection: navigator.onLine + events + periodic heartbeat ping.

type Listener = (online: boolean) => void;

const HEARTBEAT_INTERVAL = 30_000; // 30s
const HEARTBEAT_TIMEOUT = 5_000; // 5s

class NetworkDetector {
  private _isOnline: boolean = navigator.onLine;
  private _listeners: Set<Listener> = new Set();
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _channel: BroadcastChannel | null = null;

  get isOnline(): boolean {
    return this._isOnline;
  }

  start(): void {
    window.addEventListener("online", this._handleOnline);
    window.addEventListener("offline", this._handleOffline);

    // Cross-tab sync
    try {
      this._channel = new BroadcastChannel("wareiq-network");
      this._channel.onmessage = (e) => {
        if (e.data?.type === "network-change") {
          this._setOnline(e.data.online, false); // don't re-broadcast
        }
      };
    } catch {
      // BroadcastChannel not supported
    }

    // Start heartbeat
    this._heartbeatTimer = setInterval(() => this._ping(), HEARTBEAT_INTERVAL);
  }

  stop(): void {
    window.removeEventListener("online", this._handleOnline);
    window.removeEventListener("offline", this._handleOffline);
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
    if (this._channel) {
      this._channel.close();
      this._channel = null;
    }
  }

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    // Immediately notify with current state
    listener(this._isOnline);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _handleOnline = (): void => {
    this._ping(); // verify actual connectivity
  };

  private _handleOffline = (): void => {
    this._setOnline(false);
  };

  private async _ping(): Promise<void> {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), HEARTBEAT_TIMEOUT);
      const res = await fetch("/api/health", {
        method: "GET",
        cache: "no-store",
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      this._setOnline(res.ok);
    } catch {
      this._setOnline(false);
    }
  }

  private _setOnline(online: boolean, broadcast = true): void {
    if (online === this._isOnline) return;
    this._isOnline = online;
    this._listeners.forEach((l) => l(online));

    if (broadcast && this._channel) {
      try {
        this._channel.postMessage({ type: "network-change", online });
      } catch {
        // channel closed
      }
    }
  }
}

// Singleton
export const networkDetector = new NetworkDetector();
