import type {
  RateLimitOptions,
  RateLimitStore,
  Request,
  Response,
  SecurityHeadersOptions
} from "../core/types.js";
import { HttpStatus } from "../core/status.js";

/**
 * Naive in-memory rate limit store suitable for single instance deployments.
 */
class InMemoryRateLimitStore implements RateLimitStore {
  private readonly counters = new Map<string, { count: number; expires: number }>();

  increment(key: string, windowMs: number): number {
    const now = Date.now();
    const entry = this.counters.get(key);
    if (!entry || entry.expires <= now) {
      this.counters.set(key, { count: 1, expires: now + windowMs });
      return 1;
    }

    entry.count += 1;
    return entry.count;
  }
}

/** Default rate limit store used when none is provided. */
export const memoryRateLimitStore = new InMemoryRateLimitStore();

/**
 * Applies common security headers according to supplied options.
 */
export function applySecurityHeaders(res: Response, options?: SecurityHeadersOptions) {
  if (!options) {
    return;
  }

  if (options.contentSecurityPolicy) {
    res.setHeader("Content-Security-Policy", options.contentSecurityPolicy);
  }

  if (options.frameGuard) {
    res.setHeader("X-Frame-Options", options.frameGuard === "deny" ? "DENY" : "SAMEORIGIN");
  }

  if (options.xssProtection ?? true) {
    res.setHeader("X-XSS-Protection", "1; mode=block");
  }

  if (options.noSniff ?? true) {
    res.setHeader("X-Content-Type-Options", "nosniff");
  }

  if (options.hidePoweredBy ?? true) {
    res.removeHeader("X-Powered-By");
  }

  if (options.hsts) {
    const maxAge = options.hsts.maxAge ?? 15552000;
    let value = `max-age=${maxAge}`;
    if (options.hsts.includeSubDomains ?? true) {
      value += "; includeSubDomains";
    }
    if (options.hsts.preload) {
      value += "; preload";
    }
    res.setHeader("Strict-Transport-Security", value);
  }
}

/**
 * Increments the rate-limit counter and responds with 429 when request exceeds `max`.
 */
export async function enforceRateLimit(
  req: Request,
  res: Response,
  options?: RateLimitOptions
): Promise<boolean> {
  if (!options) {
    return false;
  }

  const store = options.store ?? memoryRateLimitStore;
  const key = options.keyGenerator ? options.keyGenerator(req) : req.socket.remoteAddress ?? "anonymous";
  const count = await Promise.resolve(store.increment(key, options.windowMs));
  if (count > options.max) {
    res.status(HttpStatus.TooManyRequests).json({
      error: options.message ?? "Too many requests"
    });
    return true;
  }

  return false;
}
