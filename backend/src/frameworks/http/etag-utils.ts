import { createHash } from "node:crypto";

type HeaderMap = Record<string, unknown>;

export function isReadableStream(value: unknown): value is NodeJS.ReadableStream {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as NodeJS.ReadableStream).pipe === "function"
  );
}

export function toEtagBuffer(body: unknown): Buffer | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (typeof body === "string") {
    return Buffer.from(body);
  }

  if (isReadableStream(body)) {
    return undefined;
  }

  if (typeof body === "number" || typeof body === "boolean" || typeof body === "bigint") {
    return Buffer.from(String(body));
  }

  if (typeof body === "object") {
    try {
      return Buffer.from(JSON.stringify(body));
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function generateStrongEtag(payload: Buffer): string {
  if (payload.length === 0) {
    return '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"';
  }

  const hash = createHash("sha1").update(payload).digest("base64").substring(0, 27);
  const length = payload.length.toString(16);

  return `"${length}-${hash}"`;
}

export function generateWeakEtag(payload: Buffer): string {
  return `W/${generateStrongEtag(payload)}`;
}

export function generateWeakEtagFromBody(body: unknown): string | undefined {
  const buffer = toEtagBuffer(body);
  if (!buffer) {
    return undefined;
  }

  return generateWeakEtag(buffer);
}

export function matchesIfNoneMatch(headers: HeaderMap, etag: string): boolean {
  const candidates = parseEntityTagHeader(headers, "if-none-match");

  if (!candidates || candidates.length === 0) {
    return false;
  }

  if (candidates.includes("*")) {
    return true;
  }

  return candidates.some((candidate) => entityTagEquals(candidate, etag));
}

export function parseEntityTagHeader(headers: HeaderMap, headerName: string): string[] | null {
  const raw = getHeaderValue(headers, headerName);
  if (raw === undefined || raw === null) {
    return null;
  }

  const values = Array.isArray(raw) ? raw : [raw];
  const tags: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    for (const part of value.split(",")) {
      const trimmed = part.trim();
      if (trimmed) {
        tags.push(trimmed);
      }
    }
  }

  return tags;
}

export function entityTagEquals(left: string, right: string): boolean {
  if (left === right) {
    return true;
  }

  if (left.startsWith("W/") && !right.startsWith("W/")) {
    return left.slice(2) === right;
  }

  if (!left.startsWith("W/") && right.startsWith("W/")) {
    return left === right.slice(2);
  }

  return false;
}

function getHeaderValue(headers: HeaderMap, name: string): unknown {
  const lower = name.toLowerCase();
  if (lower in headers) {
    return headers[lower];
  }

  if (name in headers) {
    return headers[name];
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) {
      return value;
    }
  }

  return undefined;
}
