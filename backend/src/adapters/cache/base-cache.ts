export type CacheItem<T = unknown> = {
  value: T;
  expiresAt?: number;
};

export interface CacheGetOptions {
  fallback?: () => Promise<unknown>;
  ttl?: number;
}

export abstract class BaseCache {
  abstract get<T>(key: string): Promise<CacheItem<T> | null>;
  abstract set<T>(key: string, value: T, ttl?: number): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract clear(): Promise<void>;

  async remember<T>(key: string, compute: () => Promise<T>, ttl?: number): Promise<T> {
    const existing = await this.get<T>(key);
    if (existing && !this.isExpired(existing)) {
      return existing.value;
    }

    const value = await compute();
    await this.set(key, value, ttl);
    return value;
  }

  protected isExpired<T>(item: CacheItem<T>): boolean {
    if (item.expiresAt === undefined) {
      return false;
    }

    return item.expiresAt <= Date.now();
  }
}
