import express, {
  type CookieOptions,
  type Express,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { randomUUID } from "node:crypto";
import { type Server } from "node:http";
import {
  type HttpContext,
  type HttpController,
  type HttpCookieOptions,
  type HttpMethod,
  type HttpMiddleware,
  type HttpReply,
  type HttpRequest,
  type HttpRouteDefinition,
  type HttpRouter,
  type HttpServer,
  type HttpServerListenOptions
} from "../../../adapters/http-handlers/base-http-handler";
import { BaseLogger } from "../../../adapters/logger/base-logger";

export type ExpressHttpServerOptions = {
  app?: Express;
  logger?: BaseLogger;
  configureApp?: (app: Express) => void;
};

export class ExpressHttpServer implements HttpServer {
  private readonly app: Express;
  private readonly router: ExpressHttpRouter;
  private readonly logger?: BaseLogger;
  private httpServer?: Server;

  constructor(options: ExpressHttpServerOptions = {}) {
    this.app = options.app ?? express();
    this.logger = options.logger;

    if (options.configureApp) {
      options.configureApp(this.app);
    }

    this.router = new ExpressHttpRouter(this.app, this.logger);
  }

  register(controller: HttpController): void {
    controller.register(this.router);
  }

  async listen(options: HttpServerListenOptions): Promise<void> {
    if (this.httpServer) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const server = this.app.listen(options.port, options.host ?? "0.0.0.0", () => resolve());
      server.on("error", reject);
      this.httpServer = server;
    });

    this.logger?.info("HTTP server listening", {
      host: options.host ?? "0.0.0.0",
      port: options.port,
      framework: "express"
    });
  }

  async close(): Promise<void> {
    if (!this.httpServer) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.httpServer?.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    this.httpServer = undefined;
  }

  get instance(): Express {
    return this.app;
  }
}

class ExpressHttpRouter implements HttpRouter {
  constructor(private readonly app: Express, private readonly logger?: BaseLogger) {}

  register<Params, Query, Body>(route: HttpRouteDefinition<Params, Query, Body>): void {
    const handler = this.createHandler(route);

    const middlewares = ((route.middlewares ?? []) as HttpMiddleware<Params, Query, Body>[]).map(
      (middleware) => this.wrapMiddleware(middleware)
    );

    const method = route.method.toLowerCase() as Lowercase<HttpMethod>;

    if (
      method === "get" ||
      method === "post" ||
      method === "put" ||
      method === "patch" ||
      method === "delete"
    ) {
      this.app[method](route.path, ...middlewares, handler);
    } else if (method === "head") {
      this.app.head(route.path, ...middlewares, handler);
    } else {
      this.app.all(route.path, ...middlewares, handler);
    }

    this.logger?.info("Registered route", {
      method: route.method,
      path: route.path,
      summary: route.summary,
      framework: "express"
    });
  }

  private wrapMiddleware<Params, Query, Body>(middleware: HttpMiddleware<Params, Query, Body>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const context = this.createContext<Params, Query, Body>(req, res);
      await middleware(context);
      if (!context.reply.sent) {
        next();
      }
    };
  }

  private createHandler<Params, Query, Body>(route: HttpRouteDefinition<Params, Query, Body>) {
    return async (req: Request, res: Response) => {
      const context = this.createContext<Params, Query, Body>(req, res);
      await route.handler(context);
    };
  }

  private createContext<Params, Query, Body>(
    req: Request,
    res: Response
  ): HttpContext<Params, Query, Body> {
    const httpRequest: HttpRequest<Params, Query, Body> = {
      id: (req as Request & { id?: string }).id ?? randomUUID(),
      method: req.method.toUpperCase() as HttpMethod,
      url: req.originalUrl ?? req.url,
      path: req.path,
      params: req.params as Params,
      query: req.query as Query,
      body: req.body as Body,
      headers: req.headers as Record<string, unknown>,
      ip: req.ip,
      raw: req
    };

    const reply = new ExpressHttpReplyAdapter(res);

    return {
      request: httpRequest,
      reply
    };
  }
}

class ExpressHttpReplyAdapter implements HttpReply {
  constructor(private readonly response: Response) {}

  get sent(): boolean {
    return this.response.headersSent || this.response.writableEnded;
  }

  status(code: number): HttpReply {
    this.response.status(code);
    return this;
  }

  header(name: string, value: string): HttpReply {
    this.response.setHeader(name, value);
    return this;
  }

  headers(values: Record<string, string>): HttpReply {
    this.response.set(values);
    return this;
  }

  cookie(name: string, value: string, options?: HttpCookieOptions): HttpReply {
    const mapped = mapCookieOptions(options);
    if (mapped) {
      this.response.cookie(name, value, mapped);
    } else {
      this.response.cookie(name, value);
    }
    return this;
  }

  clearCookie(name: string, options?: HttpCookieOptions): HttpReply {
    const mapped = mapCookieOptions(options);
    if (mapped) {
      this.response.clearCookie(name, mapped);
    } else {
      this.response.clearCookie(name);
    }
    return this;
  }

  send<T>(payload: T): void {
    this.response.send(payload as any);
  }

  json<T>(payload: T): void {
    this.response.json(payload as any);
  }

  noContent(): void {
    this.response.status(204).end();
  }
}

function mapCookieOptions(options?: HttpCookieOptions): CookieOptions | undefined {
  if (!options) {
    return undefined;
  }

  const mapped: CookieOptions = { ...options };

  if (options.sameSite) {
    mapped.sameSite = options.sameSite;
  }

  return mapped;
}
