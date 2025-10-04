import { createHash } from "crypto";
import type { CacheEntry, CacheOptions, CacheStore, Request, Response } from "../core/types.js";

/**
 * Basic in-memory cache store used by default.
 */
class InMemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, CacheEntry>();

  get(key: string): CacheEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.ttl && Date.now() - entry.createdAt > entry.ttl) {
      this.store.delete(key);
      return undefined;
    }

    return entry;
  }

  set(key: string, entry: CacheEntry, ttl?: number): void {
    this.store.set(key, { ...entry, ttl });
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}

/** Shared in-memory cache instance used unless a custom store is provided. */
export const memoryCacheStore = new InMemoryCacheStore();

/**
 * Generates a consistent cache key for the given request.
 */
export function computeCacheKey(req: Request, options?: CacheOptions): string {
  if (options?.key) {
    return options.key(req);
  }

  const url = req.url ?? "/";
  const base = `${req.method}:${url}`;
  const hash = createHash("sha1");
  hash.update(base);
  if (req.headers["accept-encoding"]) {
    hash.update(String(req.headers["accept-encoding"]));
  }
  return hash.digest("hex");
}

/**
 * Determines if caching should be applied for the current request.
 */
export function shouldUseCache(req: Request, options?: CacheOptions | boolean): boolean {
  if (!options) {
    return false;
  }

  return (req.method ?? "GET").toUpperCase() === "GET";
}

/**
 * Wraps response write/end to capture payload details for caching.
 */
export function hijackResponse(
  res: Response,
  onFinish: (payload: CacheEntry | null) => void
) {
  const originalWrite = res.write;
  const originalEnd = res.end;
  const chunks: Buffer[] = [];

  function captureChunk(chunk: any, encoding?: BufferEncoding) {
    if (!chunk) {
      return;
    }
    const enc = encoding ?? "utf8";
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc));
  }

  res.write = function write(this: Response, chunk: any, encoding?: BufferEncoding, cb?: () => void) {
    captureChunk(chunk, encoding);
    const finalEncoding = typeof chunk === "string" ? (encoding ?? "utf8") : encoding;
    const args: any[] = [chunk];
    if (finalEncoding !== undefined) {
      args.push(finalEncoding);
      if (typeof cb === "function") {
        args.push(cb);
      }
    } else if (typeof cb === "function") {
      args.push(undefined, cb);
    }

    return (originalWrite as unknown as (...params: any[]) => boolean).apply(this, args);
  } as typeof res.write;

  res.end = function end(this: Response, chunk?: any, encoding?: BufferEncoding, cb?: () => void) {
    captureChunk(chunk, encoding);
    const body = Buffer.concat(chunks);

    const headers: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(this.getHeaders())) {
      if (Array.isArray(value)) {
        headers[key] = value.map((item) => String(item));
      } else if (value !== undefined) {
        headers[key] = String(value);
      }
    }

    const payload: CacheEntry = {
      statusCode: this.statusCode,
      headers,
      body,
      createdAt: Date.now()
    };

    onFinish(payload);
    const finalEncoding = typeof chunk === "string" ? (encoding ?? "utf8") : encoding;
    const args: any[] = [chunk];
    if (finalEncoding !== undefined) {
      args.push(finalEncoding);
      if (typeof cb === "function") {
        args.push(cb);
      }
    } else if (typeof cb === "function") {
      args.push(undefined, cb);
    }

    return (originalEnd as unknown as (...params: any[]) => any).apply(this, args);
  } as typeof res.end;
}

/**
 * Replays a cached response to the client.
 */
export function sendFromCache(res: Response, entry: CacheEntry) {
  Object.entries(entry.headers).forEach(([key, value]) => {
    const headerValue = Array.isArray(value) ? value : value;
    res.setHeader(key, headerValue);
  });
  res.statusCode = entry.statusCode;
  res.end(entry.body);
}
