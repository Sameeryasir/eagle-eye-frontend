// Simple in-memory API cache so stack remounts / navigate-back reuse data
// instead of hitting the network every time (React Query-style for non-RQ screens).

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export function getApiCache<T>(key: string, maxAgeMs: number): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > maxAgeMs) return null;
  return entry.data;
}

export function setApiCache<T>(key: string, data: T): void {
  store.set(key, { data, fetchedAt: Date.now() });
}

export function clearApiCache(key?: string): void {
  if (!key) {
    store.clear();
    return;
  }
  store.delete(key);
}

export const ApiCacheKeys = {
  conversations: "chats.conversations",
  notifications: "alerts.notifications",
} as const;
