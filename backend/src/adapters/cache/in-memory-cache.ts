import { BaseCache, type CacheItem } from "./base-cache";

type StoredItem<T> = CacheItem<T> & { expiresAt?: number };

export class InMemoryCache extends BaseCache {
  private readonly store = new Map<string, StoredItem<unknown>>();

  async get<T>(key: string): Promise<CacheItem<T> | null> {
    const item = this.store.get(key) as StoredItem<T> | undefined;
    if (!item) {
      return null;
    }

    if (this.isExpired(item)) {
      this.store.delete(key);
      return null;
    }

    return item;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = ttl !== undefined ? Date.now() + ttl : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
