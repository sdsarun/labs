import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type FastifySchema,
  type FastifyServerOptions
} from "fastify";
import type { Server } from "node:http";
import {
  type HttpContext,
  type HttpController,
  type HttpCookieOptions,
  type HttpMethod,
  type HttpReply,
  type HttpRequest,
  type HttpRouteDefinition,
  type HttpRouter,
  type HttpServer,
  type HttpServerListenOptions
} from "../../../adapters/http-handlers/base-http-handler";
import type { BaseLogger } from "../../../adapters/logger/base-logger";
import {
  generateWeakEtag,
  isReadableStream,
  matchesIfNoneMatch,
  toEtagBuffer
} from "../../http/etag-utils";

export type FastifyHttpServerOptions = {
  fastify?: FastifyInstance;
  fastifyOptions?: FastifyServerOptions;
  logger?: BaseLogger;
};

export class FastifyHttpServer implements HttpServer {
  private readonly app: FastifyInstance;
  private readonly router: FastifyHttpRouter;
  private readonly logger?: BaseLogger;

  constructor(options: FastifyHttpServerOptions = {}) {
    this.app = options.fastify ?? Fastify(options.fastifyOptions ?? {});
    this.logger = options.logger;
    this.router = new FastifyHttpRouter(this.app, this.logger);
    this.registerEtagHook();
  }

  register(controller: HttpController): void {
    controller.register(this.router);
  }

  async listen(options: HttpServerListenOptions): Promise<void> {
    await this.app.listen({ host: options.host, port: options.port });
    this.logger?.info("HTTP server listening", {
      host: options.host ?? "0.0.0.0",
      port: options.port
    });
  }

  async close(): Promise<void> {
    await this.app.close();
  }

  get instance(): FastifyInstance {
    return this.app;
  }

  getRawServer(): Server {
    return this.app.server;
  }

  private registerEtagHook(): void {
    this.app.addHook("onSend", async (request, reply, payload) => {
      if (!shouldAttachEtag(request, reply, payload)) {
        return payload;
      }

      const buffer = toEtagBuffer(payload);
      if (!buffer) {
        return payload;
      }

      const etag = generateWeakEtag(buffer);
      reply.header("etag", etag);

      if (matchesIfNoneMatch(request.headers as Record<string, unknown>, etag)) {
        reply.code(304);
        reply.removeHeader("content-length");
        reply.removeHeader("content-type");
        return "";
      }

      return payload;
    });
  }
}

class FastifyHttpRouter implements HttpRouter {
  constructor(private readonly app: FastifyInstance, private readonly logger?: BaseLogger) {}

  register<Params, Query, Body>(route: HttpRouteDefinition<Params, Query, Body>): void {
    this.app.route({
      method: route.method,
      url: route.path,
      schema: route.schema as FastifySchema | undefined,
      handler: async (request: FastifyRequest, reply: FastifyReply) => {
        const context = this.createContext<Params, Query, Body>(request, reply);

        if (route.middlewares) {
          for (const middleware of route.middlewares) {
            await middleware(context);
            if (context.reply.sent) {
              return;
            }
          }
        }

        await route.handler(context);
      }
    });

    this.logger?.info("Registered route", {
      method: route.method,
      path: route.path,
      summary: route.summary
    });
  }

  private createContext<Params, Query, Body>(
    request: FastifyRequest,
    reply: FastifyReply
  ): HttpContext<Params, Query, Body> {
    const routePath =
      typeof request.routeOptions.url === "string" ? request.routeOptions.url : request.url;

    const httpRequest: HttpRequest<Params, Query, Body> = {
      id: request.id,
      method: request.method.toUpperCase() as HttpMethod,
      url: request.url,
      path: routePath,
      params: request.params as Params,
      query: request.query as Query,
      body: request.body as Body,
      headers: request.headers as Record<string, unknown>,
      ip: request.ip,
      raw: request
    };

    const httpReply = new FastifyHttpReplyAdapter(reply);

    return {
      request: httpRequest,
      reply: httpReply
    };
  }
}

class FastifyHttpReplyAdapter implements HttpReply {
  constructor(private readonly reply: FastifyReply) {}

  get sent(): boolean {
    return this.reply.sent;
  }

  status(code: number): HttpReply {
    this.reply.status(code);
    return this;
  }

  header(name: string, value: string): HttpReply {
    this.reply.header(name, value);
    return this;
  }

  headers(values: Record<string, string>): HttpReply {
    for (const [name, value] of Object.entries(values)) {
      this.reply.header(name, value);
    }
    return this;
  }

  cookie(name: string, value: string, options?: HttpCookieOptions): HttpReply {
    const serialized = serializeCookie(name, value, options);
    this.appendSetCookie(serialized);
    return this;
  }

  clearCookie(name: string, options?: HttpCookieOptions): HttpReply {
    const opts: HttpCookieOptions = { ...(options ?? {}), expires: new Date(0), maxAge: 0 };
    return this.cookie(name, "", opts);
  }

  send<T>(payload: T): void {
    this.reply.send(payload);
  }

  json<T>(payload: T): void {
    this.reply.send(payload);
  }

  noContent(): void {
    this.reply.status(204);
    this.reply.send();
  }

  private appendSetCookie(value: string): void {
    const existing = this.reply.getHeader("set-cookie");

    if (!existing) {
      this.reply.header("set-cookie", value);
      return;
    }

    if (Array.isArray(existing)) {
      existing.push(value);
      this.reply.header("set-cookie", existing);
      return;
    }

    this.reply.header("set-cookie", [existing as string, value]);
  }
}

function serializeCookie(name: string, value: string, options?: HttpCookieOptions): string {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  const opts = options ?? {};

  if (opts.maxAge !== undefined) {
    segments.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  }

  if (opts.domain) {
    segments.push(`Domain=${opts.domain}`);
  }

  if (opts.path) {
    segments.push(`Path=${opts.path}`);
  }

  const expires =
    opts.expires ?? (opts.maxAge !== undefined ? new Date(Date.now() + opts.maxAge * 1000) : undefined);
  if (expires) {
    segments.push(`Expires=${expires.toUTCString()}`);
  }

  if (opts.httpOnly ?? true) {
    segments.push("HttpOnly");
  }

  if (opts.secure) {
    segments.push("Secure");
  }

  if (opts.sameSite) {
    segments.push(`SameSite=${capitalize(opts.sameSite)}`);
  }

  return segments.join("; ");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function shouldAttachEtag(request: FastifyRequest, reply: FastifyReply, payload: unknown): boolean {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return false;
  }

  if (reply.hasHeader("etag")) {
    return false;
  }

  const statusCode = reply.statusCode;
  if (statusCode < 200 || statusCode === 204 || statusCode === 304) {
    return false;
  }

  if (payload === undefined || payload === null) {
    return false;
  }

  if (isReadableStream(payload)) {
    return false;
  }

  return Buffer.isBuffer(payload) || typeof payload === "string";
}
