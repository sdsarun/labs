export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type HttpRequest<Params = unknown, Query = unknown, Body = unknown> = {
  id: string;
  method: HttpMethod;
  url: string;
  path: string;
  params: Params;
  query: Query;
  body: Body;
  headers: Record<string, unknown>;
  ip?: string;
  raw: unknown;
};

export type HttpCookieOptions = {
  domain?: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
};

export type HttpReply = {
  readonly sent: boolean;
  status(code: number): HttpReply;
  header(name: string, value: string): HttpReply;
  headers(values: Record<string, string>): HttpReply;
  cookie(name: string, value: string, options?: HttpCookieOptions): HttpReply;
  clearCookie(name: string, options?: HttpCookieOptions): HttpReply;
  send<T>(payload: T): void;
  json<T>(payload: T): void;
  noContent(): void;
};

export type HttpContext<Params = unknown, Query = unknown, Body = unknown> = {
  request: HttpRequest<Params, Query, Body>;
  reply: HttpReply;
};

export type HttpHandler<Params = unknown, Query = unknown, Body = unknown> = (
  context: HttpContext<Params, Query, Body>
) => Promise<void> | void;

export type HttpMiddleware<Params = unknown, Query = unknown, Body = unknown> = HttpHandler<
  Params,
  Query,
  Body
>;

export type HttpRouteDefinition<Params = unknown, Query = unknown, Body = unknown> = {
  method: HttpMethod;
  path: string;
  handler: HttpHandler<Params, Query, Body>;
  middlewares?: HttpMiddleware<Params, Query, Body>[];
  schema?: unknown;
  summary?: string;
  description?: string;
  tags?: string[];
};

export type HttpRouter = {
  register<Params, Query, Body>(route: HttpRouteDefinition<Params, Query, Body>): void;
};

export type HttpController = {
  register(router: HttpRouter): void;
};

export abstract class BaseHttpController implements HttpController {
  abstract routes(): HttpRouteDefinition[];

  register(router: HttpRouter): void {
    for (const route of this.routes()) {
      router.register(route);
    }
  }
}

export type HttpServerListenOptions = {
  host?: string;
  port: number;
};

export type HttpServer = {
  register(controller: HttpController): void;
  listen(options: HttpServerListenOptions): Promise<void>;
  close(): Promise<void>;
};
