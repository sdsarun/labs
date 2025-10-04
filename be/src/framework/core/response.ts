import { createReadStream } from "fs";
import { stat } from "fs/promises";
import type { ServerResponse } from "http";
import { extname } from "path";
import type {
  Response,
  CookieOptions,
  StreamOptions,
  StreamSource
} from "./types.js";
import { prepareCookieValue } from "../services/cookies.js";

/**
 * Minimal content type lookup used by `streamFile` when no explicit header provided.
 */
const MIME_LOOKUP: Record<string, string> = {
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".cjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf"
};

/**
 * Serializes a cookie name/value pair according to the supplied options.
 */
function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): string {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    segments.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }

  if (options.domain) {
    segments.push(`Domain=${options.domain}`);
  }

  if (options.path) {
    segments.push(`Path=${options.path}`);
  } else {
    segments.push("Path=/");
  }

  if (options.expires) {
    segments.push(`Expires=${options.expires.toUTCString()}`);
  }

  if (options.httpOnly) {
    segments.push("HttpOnly");
  }

  if (options.secure) {
    segments.push("Secure");
  }

  if (options.sameSite) {
    segments.push(`SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`);
  }

  return segments.join("; ");
}

/**
 * Augments Node's `ServerResponse` with Jason convenience helpers.
 */
export function enhanceResponse(res: ServerResponse): Response {
  const response = res as Response;
  response.locals = response.locals ?? {};

  response.status = function status(code: number) {
    this.statusCode = code;
    return this;
  };

  response.set = function set(field: string, value: string) {
    this.setHeader(field, value);
    return this;
  };

  response.json = function json(payload: unknown) {
    if (!this.hasHeader("Content-Type")) {
      this.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    const body = JSON.stringify(payload);
    this.end(body);
  };

  response.send = function send(payload: unknown) {
    if (Buffer.isBuffer(payload)) {
      this.end(payload);
      return;
    }

    if (typeof payload === "object" && payload !== null) {
      this.setHeader("Content-Type", "application/json; charset=utf-8");
      this.end(JSON.stringify(payload));
      return;
    }

    if (typeof payload === "string") {
      if (!this.hasHeader("Content-Type")) {
        this.setHeader("Content-Type", "text/plain; charset=utf-8");
      }
      this.end(payload);
      return;
    }

    this.end(String(payload));
  };

  response.cookie = function cookie(
    name: string,
    value: string,
    options?: CookieOptions
  ) {
    const secret = this.locals?.__cookieSecret as string | undefined;
    const payload = prepareCookieValue(name, value, options, secret);
    const serialized = serializeCookie(name, payload, options);
    const existing = this.getHeader("Set-Cookie");

    if (!existing) {
      this.setHeader("Set-Cookie", serialized);
    } else if (Array.isArray(existing)) {
      this.setHeader("Set-Cookie", [...existing, serialized]);
    } else {
      this.setHeader("Set-Cookie", [existing as string, serialized]);
    }

    return this;
  };

  response.clearCookie = function clearCookie(
    name: string,
    options?: CookieOptions
  ) {
    const opts = { ...(options ?? {}), expires: new Date(0), maxAge: 0 };
    return this.cookie(name, "", opts);
  };

  response.stream = async function stream(
    source: StreamSource,
    options: StreamOptions = {}
  ) {
    const {
      contentType,
      contentLength,
      headers,
      downloadName,
      cacheControl,
      statusCode
    } = options;

    if (statusCode) {
      this.statusCode = statusCode;
    }

    if (headers) {
      Object.entries(headers).forEach(([key, value]) => this.setHeader(key, value));
    }

    if (cacheControl) {
      this.setHeader("Cache-Control", cacheControl);
    }

    if (downloadName) {
      this.setHeader(
        "Content-Disposition",
        `attachment; filename="${downloadName}"`
      );
    }

    if (contentType) {
      this.setHeader("Content-Type", contentType);
    }

    if (isFileSource(source)) {
      await streamFileSource(this, source, { ...options });
      return;
    }

    if (Buffer.isBuffer(source)) {
      if (contentLength ?? true) {
        this.setHeader("Content-Length", (contentLength ?? source.length).toString());
      }
      this.end(source);
      return;
    }

    if (typeof source === "string") {
      const payload = Buffer.from(source);
      if (contentType === undefined) {
        this.setHeader("Content-Type", "text/plain; charset=utf-8");
      }
      if (contentLength ?? true) {
        this.setHeader("Content-Length", (contentLength ?? payload.length).toString());
      }
      this.end(payload);
      return;
    }

    if (isReadable(source)) {
      await pipeReadable(this, source, contentLength);
      return;
    }

    if (isAsyncIterable(source)) {
      await writeIterable(this, source);
      return;
    }

    throw new Error("Unsupported stream source provided to res.stream()");
  };

  return response;
}

function isReadable(value: unknown): value is NodeJS.ReadableStream {
  return typeof value === "object" && value !== null && typeof (value as any).pipe === "function";
}

function isAsyncIterable(
  value: unknown
): value is AsyncIterable<Buffer | string> {
  return typeof value === "object" && value !== null && Symbol.asyncIterator in value;
}

function isFileSource(value: StreamSource): value is { filePath: string; range?: boolean } {
  return typeof value === "object" && value !== null && "filePath" in value;
}

async function pipeReadable(
  res: Response,
  readable: NodeJS.ReadableStream,
  contentLength?: number
) {
  if (contentLength !== undefined) {
    res.setHeader("Content-Length", contentLength.toString());
  }

  await new Promise<void>((resolve, reject) => {
    readable.once("error", reject);
    readable.once("end", resolve);
    readable.pipe(res, { end: true });
  });
}

async function writeIterable(
  res: Response,
  iterable: AsyncIterable<Buffer | string>
) {
  for await (const chunk of iterable) {
    if (res.writableEnded) {
      break;
    }
    res.write(chunk);
  }
  res.end();
}

async function streamFileSource(
  res: Response,
  source: { filePath: string; range?: boolean },
  options: StreamOptions
) {
  const stats = await stat(source.filePath);
  const total = stats.size;
  const enableRange = source.range ?? options.range ?? true;
  const rangeHeader = enableRange ? res.req.headers.range : undefined;
  const ext = extname(source.filePath).toLowerCase();
  const contentType = options.contentType ?? MIME_LOOKUP[ext] ?? "application/octet-stream";

  let start = 0;
  let end = total - 1;
  let statusCode = options.statusCode ?? 200;

  if (rangeHeader && typeof rangeHeader === "string") {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (match) {
      if (match[1]) {
        start = Number.parseInt(match[1], 10);
      }
      if (match[2]) {
        end = Number.parseInt(match[2], 10);
      }
      if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
        res.statusCode = 416;
        res.setHeader("Content-Range", `bytes */${total}`);
        res.end();
        return;
      }
      statusCode = 206;
    }
  }

  const chunkSize = end - start + 1;
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Content-Length": (options.contentLength ?? chunkSize).toString()
  };

  if (statusCode === 206) {
    headers["Content-Range"] = `bytes ${start}-${end}/${total}`;
  }

  if (options.downloadName) {
    headers["Content-Disposition"] = `attachment; filename="${options.downloadName}"`;
  }

  if (options.cacheControl) {
    headers["Cache-Control"] = options.cacheControl;
  }

  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers[key] = value;
    });
  }

  res.statusCode = statusCode;
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));

  const stream = createReadStream(source.filePath, { start, end });
  await pipeReadable(res, stream);
}
