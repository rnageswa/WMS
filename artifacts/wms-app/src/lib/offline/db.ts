// ─── IndexedDB Wrapper ────────────────────────────────────────────────────────
// Lightweight promise-based IndexedDB wrapper for offline data persistence.
// Stores: queryCache (API responses), mutationQueue (pending mutations), meta (sync state)

const DB_NAME = "wareiq-offline";
const DB_VERSION = 1;

export interface QueryCacheEntry {
  key: string;
  data: unknown;
  cachedAt: number;
  expiresAt: number;
}

export interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
  createdAt: number;
  retryCount: number;
  status: "pending" | "syncing" | "failed" | "conflict";
  entityType: string;
  entityId: string;
  clientTimestamp: number;
  error?: string;
}

export interface SyncMeta {
  key: string;
  value: unknown;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("queryCache")) {
        db.createObjectStore("queryCache", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("mutationQueue")) {
        const mq = db.createObjectStore("mutationQueue", { keyPath: "id" });
        mq.createIndex("status", "status", { unique: false });
        mq.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(
  storeName: string,
  mode: IDBTransactionMode = "readonly"
): Promise<{ store: IDBObjectStore; done: Promise<void> }> {
  const db = await openDB();
  const tx = db.transaction(storeName, mode);
  return {
    store: tx.objectStore(storeName),
    done: new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }),
  };
}

// ─── Query Cache ──────────────────────────────────────────────────────────────

export async function getCache(key: string): Promise<QueryCacheEntry | null> {
  const { store } = await tx("queryCache");
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => {
      const entry: QueryCacheEntry | undefined = req.result;
      if (entry && entry.expiresAt > Date.now()) {
        resolve(entry);
      } else if (entry) {
        // Expired — delete it
        const { store: s } = store as any; // tx still open
        store.delete(key);
        resolve(null);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function setCache(
  key: string,
  data: unknown,
  ttlMs: number
): Promise<void> {
  const { store, done } = await tx("queryCache", "readwrite");
  const entry: QueryCacheEntry = {
    key,
    data,
    cachedAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };
  store.put(entry);
  await done;
}

export async function invalidateCache(pattern: string): Promise<void> {
  const { store, done } = await tx("queryCache", "readwrite");
  const req = store.openCursor();
  req.onsuccess = () => {
    const cursor = req.result;
    if (cursor) {
      if ((cursor.key as string).includes(pattern)) {
        cursor.delete();
      }
      cursor.continue();
    }
  };
  await done;
}

// ─── Mutation Queue ───────────────────────────────────────────────────────────

export async function enqueueMutation(
  mutation: Omit<QueuedMutation, "id" | "createdAt" | "retryCount" | "status">
): Promise<string> {
  const id = `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const full: QueuedMutation = {
    ...mutation,
    id,
    createdAt: Date.now(),
    retryCount: 0,
    status: "pending",
  };
  const { store, done } = await tx("mutationQueue", "readwrite");
  store.put(full);
  await done;
  return id;
}

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  const { store } = await tx("mutationQueue");
  return new Promise((resolve, reject) => {
    const req = store.index("status").getAll("pending");
    req.onsuccess = () => {
      const items: QueuedMutation[] = req.result;
      items.sort((a, b) => a.createdAt - b.createdAt);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAllMutations(): Promise<QueuedMutation[]> {
  const { store } = await tx("mutationQueue");
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function updateMutation(
  id: string,
  updates: Partial<QueuedMutation>
): Promise<void> {
  const { store, done } = await tx("mutationQueue", "readwrite");
  const req = store.get(id);
  req.onsuccess = () => {
    const existing: QueuedMutation | undefined = req.result;
    if (existing) {
      store.put({ ...existing, ...updates });
    }
  };
  await done;
}

export async function removeMutation(id: string): Promise<void> {
  const { store, done } = await tx("mutationQueue", "readwrite");
  store.delete(id);
  await done;
}

export async function getQueueSize(): Promise<number> {
  const all = await getAllMutations();
  return all.filter((m) => m.status === "pending" || m.status === "failed").length;
}

export async function getFailedMutations(): Promise<QueuedMutation[]> {
  const { store } = await tx("mutationQueue");
  return new Promise((resolve, reject) => {
    const req = store.index("status").getAll("failed");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export async function getMeta(key: string): Promise<unknown> {
  const { store } = await tx("meta");
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const { store, done } = await tx("meta", "readwrite");
  store.put({ key, value });
  await done;
}
