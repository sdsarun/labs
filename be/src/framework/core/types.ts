import { IncomingMessage, ServerResponse } from "http";
import { Writable } from "stream";

/**
 * Signature for middleware/handler continuation.
 */
export type NextFunction = () => void | Promise<void>;

/**
 * Generic request handler used for routes and middleware.
 */
export type Handler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Supported HTTP methods.
 */
export type HTTPMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD";

/**
 * Metadata describing a single uploaded multipart file.
 */
export interface UploadedFile {
  fieldName: string;
  filename: string;
  mimeType: string;
  encoding: string;
  size: number;
  buffer?: Buffer;
  tempFilePath?: string;
}

/**
 * Runtime representation of a session entry managed by the framework.
 */
export interface SessionData {
  id: string;
  createdAt: number;
  touchedAt: number;
  data: Record<string, unknown>;
}

/**
 * Extended request object surfaced to handlers.
 */
export interface Request extends IncomingMessage {
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  body?: unknown;
  rawBody?: Buffer;
  validated?: {
    params?: unknown;
    query?: unknown;
    body?: unknown;
  };
  cookies: Record<string, string>;
  signedCookies: Record<string, string>;
  session?: SessionData;
  files?: UploadedFile[];
  fileMap?: Record<string, UploadedFile[]>;
}

/**
 * Cookie serialization options compatible with modern browsers.
 */
export interface CookieOptions {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  signed?: boolean;
}

/**
 * Controls behaviour of `res.streamFile()`.
 */
export interface StreamOptions {
  contentType?: string;
  contentLength?: number;
  headers?: Record<string, string>;
  downloadName?: string;
  cacheControl?: string;
  statusCode?: number;
  range?: boolean;
}

export type StreamSource =
  | string
  | Buffer
  | AsyncIterable<Buffer | string>
  | NodeJS.ReadableStream
  | { filePath: string; range?: boolean };

/**
 * Extended response object providing ergonomic helpers.
 */
export interface Response extends ServerResponse {
  status(code: number): Response;
  json(payload: unknown): void;
  send(payload: unknown): void;
  set(field: string, value: string): Response;
  cookie(name: string, value: string, options?: CookieOptions): Response;
  clearCookie(name: string, options?: CookieOptions): Response;
  stream(source: StreamSource, options?: StreamOptions): Promise<void>;
  locals: Record<string, unknown>;
}

/**
 * Metadata describing a single log event.
 */
export interface LoggerInfo {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  contentLength?: number;
  timestamp: Date;
}

/**
 * Legacy logger options for pipeable stream formatters.
 */
export interface LoggerOptions {
  stream?: Writable;
  format?: (info: LoggerInfo) => string;
}

/**
 * Options for the built-in console logger adapter.
 */
export interface ConsoleLoggerOptions {
  appName?: string;
  colorize?: boolean;
  timestamp?: boolean;
}

/**
 * Contract for custom logging adapters.
 */
export interface LoggerAdapter {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug?(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Options accepted by the Jason application factory.
 */
export interface FrameworkOptions {
  logger?: LoggerAdapter;
  loggerOptions?: ConsoleLoggerOptions;
  cacheStore?: CacheStore;
  session?: SessionOptions;
}

export type CorsOriginOption =
  | string
  | string[]
  | ((req: IncomingMessage) => string | string[] | undefined);

/**
 * Declarative configuration for the CORS middleware.
 */
export interface CorsOptions {
  origin?: CorsOriginOption;
  methods?: string[];
  allowHeaders?: string[];
  exposeHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * Internal representation of a registered route.
 */
export interface Route {
  method: HTTPMethod;
  path: string;
  segments: string[];
  handlers: Handler[];
  options: RouteOptions;
}

/**
 * Internal representation of a registered middleware chain.
 */
export interface Middleware {
  path: string;
  segments: string[];
  handlers: Handler[];
}

/**
 * Normalised validator signature used across Jason.
 */
export type ValidatorFunction<T = unknown> = (value: unknown, ctx: Request) => Promise<T> | T;

/**
 * Configure per-route validation for params, query, body, and response payloads.
 */
export interface ValidationConfig {
  params?: ValidatorFunction;
  query?: ValidatorFunction;
  body?: ValidatorFunction;
  response?: ValidatorFunction;
}

/**
 * Cached response metadata stored by the cache service.
 */
export interface CacheEntry {
  etag?: string;
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: Buffer;
  createdAt: number;
  ttl?: number;
}

/**
 * Pluggable cache store interface (e.g., memory, Redis).
 */
export interface CacheStore {
  get(key: string): Promise<CacheEntry | undefined> | CacheEntry | undefined;
  set(key: string, entry: CacheEntry, ttl?: number): Promise<void> | void;
  delete(key: string): Promise<void> | void;
}

/**
 * Route-level cache behaviour.
 */
export interface CacheOptions {
  key?: (req: Request) => string;
  ttl?: number;
  staleWhileRevalidate?: number;
  store?: CacheStore;
}

/**
 * Store abstraction for persisting session data.
 */
export interface SessionStore {
  get(id: string): Promise<SessionData | undefined> | SessionData | undefined;
  set(id: string, data: SessionData, ttl: number): Promise<void> | void;
  destroy(id: string): Promise<void> | void;
}

/**
 * Global session configuration supplied at app creation.
 */
export interface SessionOptions {
  name?: string;
  secret?: string;
  rolling?: boolean;
  ttl?: number;
  store?: SessionStore;
  cookie?: CookieOptions;
}

/**
 * Controls multipart upload parsing and file handling.
 */
export interface UploadOptions {
  maxFileSize?: number;
  maxFiles?: number;
  allowMimeTypes?: string[];
  directory?: string;
  keepExtensions?: boolean;
  memory?: boolean;
  fields?: Array<{ name: string; maxCount?: number }>;
}

/**
 * Fine-grained security headers applied per route.
 */
export interface SecurityHeadersOptions {
  contentSecurityPolicy?: string;
  frameGuard?: "deny" | "sameorigin";
  xssProtection?: boolean;
  noSniff?: boolean;
  hidePoweredBy?: boolean;
  hsts?: {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
}

/**
 * Backing store for rate-limit counters.
 */
export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<number> | number;
}

/**
 * Rate limiting configuration attached to a route.
 */
export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  store?: RateLimitStore;
  keyGenerator?: (req: Request) => string;
}

/**
 * Optional behaviour modifiers accepted by every route handler.
 */
export interface RouteOptions {
  validate?: ValidationConfig;
  cache?: CacheOptions | boolean;
  uploads?: UploadOptions | boolean;
  security?: SecurityHeadersOptions;
  rateLimit?: RateLimitOptions;
  session?: boolean;
}

export interface App {
  use: (...args: [Handler] | [string, ...Handler[]]) => void;
  get: (path: string, ...handlers: Array<Handler | RouteOptions>) => void;
  post: (path: string, ...handlers: Array<Handler | RouteOptions>) => void;
  put: (path: string, ...handlers: Array<Handler | RouteOptions>) => void;
  patch: (path: string, ...handlers: Array<Handler | RouteOptions>) => void;
  delete: (path: string, ...handlers: Array<Handler | RouteOptions>) => void;
  options: (path: string, ...handlers: Array<Handler | RouteOptions>) => void;
  head: (path: string, ...handlers: Array<Handler | RouteOptions>) => void;
  listen: (
    port: number,
    hostname?: string,
    callback?: () => void
  ) => ReturnType<typeof import("http").createServer>;
  handle: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
}
