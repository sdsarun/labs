import { createHmac, timingSafeEqual } from "crypto";
import type { CookieOptions, Request } from "../core/types.js";

/**
 * Parses the raw `Cookie` header into a name/value map.
 */
export function parseCookieHeader(header: string | string[] | undefined): Record<string, string> {
  if (!header) {
    return {};
  }

  const cookieString = Array.isArray(header) ? header.join("; ") : header;
  const pairs = cookieString.split(/;\s*/);
  const result: Record<string, string> = {};

  for (const pair of pairs) {
    if (!pair) continue;
    const index = pair.indexOf("=");
    if (index === -1) continue;
    const name = decodeURIComponent(pair.slice(0, index).trim());
    const value = decodeURIComponent(pair.slice(index + 1).trim());
    result[name] = value;
  }

  return result;
}

/**
 * Produces a signed cookie payload using HMAC-SHA256.
 */
export function signCookie(value: string, secret: string): string {
  const signature = createHmac("sha256", secret).update(value).digest("base64url");
  return `${value}.${signature}`;
}

/**
 * Verifies a signed cookie payload and returns its unsigned value when valid.
 */
export function verifySignedCookie(value: string, secret: string): string | null {
  const index = value.lastIndexOf(".");
  if (index === -1) {
    return null;
  }
  const data = value.slice(0, index);
  const signature = value.slice(index + 1);
  const expected = createHmac("sha256", secret).update(data).digest();
  const actual = Buffer.from(signature, "base64url");

  if (expected.length !== actual.length) {
    return null;
  }

  if (timingSafeEqual(expected, actual)) {
    return data;
  }

  return null;
}

/**
 * Populates `req.cookies` and `req.signedCookies` for downstream handlers.
 */
export function attachCookies(
  req: Request,
  secret?: string
): void {
  const rawCookies = parseCookieHeader(req.headers.cookie);
  req.cookies = rawCookies;
  req.signedCookies = {};

  if (!secret) {
    return;
  }

  Object.entries(rawCookies).forEach(([key, value]) => {
    const verified = verifySignedCookie(value, secret);
    if (verified !== null) {
      req.signedCookies[key] = verified;
    }
  });
}

/**
 * Normalizes and optionally signs a cookie value before serialization.
 */
export function prepareCookieValue(
  name: string,
  value: string,
  options: CookieOptions | undefined,
  secret: string | undefined
): string {
  if (options?.signed && !secret) {
    throw new Error(`Cannot sign cookie "${name}" without a secret`);
  }

  const shouldSign = Boolean(secret && options?.signed);
  return shouldSign && secret ? signCookie(value, secret) : value;
}
