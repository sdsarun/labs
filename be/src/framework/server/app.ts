import { createServer } from "http";
import { HttpStatus } from "../core/status.js";
import {
  type App,
  type Handler,
  type HTTPMethod,
  type Middleware,
  type Request,
  type Response,
  type Route,
  type FrameworkOptions,
  type RouteOptions,
  type CacheOptions
} from "../core/types.js";
import { splitPath, matchRoute, matchPrefix } from "../core/path.js";
import { parseQuery } from "../core/query.js";
import { readBody } from "../core/body.js";
import { enhanceResponse } from "../core/response.js";
import { executeHandlers } from "./execute-handlers.js";
import { getLogger, setLogger } from "../core/logger.js";
import { createValidationHandlers } from "../services/validation.js";
import {
  computeCacheKey,
  hijackResponse,
  memoryCacheStore,
  sendFromCache,
  shouldUseCache
} from "../services/cache.js";
import { attachCookies } from "../services/cookies.js";
import { createSessionManager } from "../services/session.js";
import { parseMultipartForm } from "../services/uploads.js";
import { applySecurityHeaders, enforceRateLimit } from "../services/security.js";

const defaultHostname = "0.0.0.0";

/**
 * Route option keys recognised when normalising handler arguments.
 */
const ROUTE_OPTION_KEYS = new Set([
  "validate",
  "cache",
  "uploads",
  "security",
  "rateLimit",
  "session"
]);

/**
 * Determines whether the value is likely a `RouteOptions` object.
 */
function isRouteOptionsCandidate(value: unknown): value is RouteOptions {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.keys(value as Record<string, unknown>).some((key) =>
    ROUTE_OPTION_KEYS.has(key)
  );
}

/**
 * Normalises the route options, expanding boolean shorthands to config objects.
 */
function normalizeRouteOptions(options?: RouteOptions): RouteOptions {
  return {
    validate: options?.validate,
    cache:
      typeof options?.cache === "boolean"
        ? options.cache
          ? {}
          : undefined
        : options?.cache,
    uploads:
      typeof options?.uploads === "boolean"
        ? options.uploads
          ? {}
          : undefined
        : options?.uploads,
    security: options?.security,
    rateLimit: options?.rateLimit,
    session: options?.session ?? false
  };
}

/**
 * Splits route registration arguments into options and handler list.
 */
function extractRouteDefinition(
  inputs: Array<Handler | RouteOptions>
): { handlers: Handler[]; options: RouteOptions } {
  if (inputs.length === 0) {
    return { handlers: [], options: normalizeRouteOptions() };
  }

  const maybeOptions = inputs[0];
  if (isRouteOptionsCandidate(maybeOptions)) {
    const handlers = inputs.slice(1) as Handler[];
    return { handlers, options: normalizeRouteOptions(maybeOptions as RouteOptions) };
  }

  return { handlers: inputs as Handler[], options: normalizeRouteOptions() };
}

/**
 * Emits a structured log for every registered route.
 */
function logRegisteredRoutes(routes: Route[]) {
  const logger = getLogger();
  logger.info("Jason registered routes:");
  if (routes.length === 0) {
    logger.info("(none)");
    return;
  }

  routes.forEach((route) => {
    logger.info("Registered route", { method: route.method, path: route.path });
  });
}

/**
 * Registers a route with method/path and attaches metadata.
 */
function registerRoute(
  routes: Route[],
  method: HTTPMethod,
  path: string,
  inputs: Array<Handler | RouteOptions>
) {
  const { handlers, options } = extractRouteDefinition(inputs);

  if (handlers.length === 0) {
    throw new Error(`Route ${method} ${path} must have at least one handler`);
  }

  routes.push({
    method,
    path,
    segments: splitPath(path),
    handlers,
    options
  });

  getLogger().info("Registered route handler", { method, path });
}

/**
 * Factory returning a configured Jason application instance.
 */
export function createApp(frameworkOptions: FrameworkOptions = {}): App {
  if (frameworkOptions.logger) {
    setLogger(frameworkOptions.logger);
  } else {
    setLogger(undefined, frameworkOptions.loggerOptions);
  }
  const logger = getLogger();
  const cacheStore = frameworkOptions.cacheStore ?? memoryCacheStore;
  const sessionManager = createSessionManager(frameworkOptions.session);
  const routes: Route[] = [];
  const middlewares: Middleware[] = [];

  const app: App = {
    use: (...args: [Handler] | [string, ...Handler[]]) => {
      if (typeof args[0] === "string") {
        const [path, ...handlers] = args;
        middlewares.push({
          path,
          segments: splitPath(path),
          handlers
        });
        logger.info("Registered middleware", { path });
        return;
      }

      const [handler] = args;
      middlewares.push({
        path: "/",
        segments: [],
        handlers: [handler]
      });
      logger.info("Registered middleware", { path: "/" });
    },
    get: (path: string, ...handlers) =>
      registerRoute(routes, "GET", path, handlers),
    post: (path: string, ...handlers) =>
      registerRoute(routes, "POST", path, handlers),
    put: (path: string, ...handlers) =>
      registerRoute(routes, "PUT", path, handlers),
    patch: (path: string, ...handlers) =>
      registerRoute(routes, "PATCH", path, handlers),
    delete: (path: string, ...handlers) =>
      registerRoute(routes, "DELETE", path, handlers),
    options: (path: string, ...handlers) =>
      registerRoute(routes, "OPTIONS", path, handlers),
    head: (path: string, ...handlers) =>
      registerRoute(routes, "HEAD", path, handlers),
    listen: (port: number, hostname?: string, callback?: () => void) => {
      const server = createServer(app.handle);
      return server.listen(port, hostname ?? defaultHostname, () => {
        logger.info("Server listening", {
          port,
          hostname: hostname ?? defaultHostname
        });
        logRegisteredRoutes(routes);
        callback?.();
      });
    },
    handle: async (incoming, serverRes) => {
      const req = incoming as Request;
      const res = enhanceResponse(serverRes);
      res.locals.__cookieSecret = sessionManager.options.secret;
      const requestLogger = getLogger();

      const baseUrl = `${req.headers.host ?? "localhost"}`;
      const url = new URL(req.url ?? "/", `http://${baseUrl}`);
      const requestSegments = splitPath(url.pathname);

      req.query = parseQuery(url);
      req.params = {};
      req.cookies = {};
      req.signedCookies = {};
      req.files = [];
      attachCookies(req, sessionManager.options.secret);

      if (!req.method || req.method === "GET" || req.method === "HEAD") {
        req.rawBody = Buffer.alloc(0);
      } else {
        req.rawBody = await readBody(req);
      }

      const contentType = req.headers["content-type"] ?? "";
      if (req.rawBody.length > 0 && typeof contentType === "string") {
        if (contentType.includes("application/json")) {
          try {
            req.body = JSON.parse(req.rawBody.toString("utf8"));
          } catch (error) {
            res.status(HttpStatus.BadRequest).json({
              error: "Invalid JSON payload"
            });
            return;
          }
        } else {
          req.body = req.rawBody;
        }
      }

      const stack: Handler[] = [];

      middlewares.forEach(({ segments, handlers, path }) => {
        if (matchPrefix(segments, requestSegments)) {
          stack.push(...handlers);
        }
      });

      let routeMatch: Route | undefined;
      let params: Record<string, string> = {};

      for (const route of routes) {
        if (route.method !== (req.method as HTTPMethod)) {
          continue;
        }

        const match = matchRoute(route.segments, requestSegments);
        if (match) {
          routeMatch = route;
          params = match.params;
          break;
        }
      }

      if (routeMatch) {
        req.params = params;
        const routeOptions = routeMatch.options;

        const sessionRequired = Boolean(frameworkOptions.session) || routeOptions.session;
        if (sessionRequired) {
          await sessionManager.load(req, res);
        }

        if (routeOptions.rateLimit) {
          const blocked = await enforceRateLimit(req, res, routeOptions.rateLimit);
          if (blocked) {
            return;
          }
        }

        if (routeOptions.security) {
          applySecurityHeaders(res, routeOptions.security);
        }

        const cacheConfig = routeOptions.cache as CacheOptions | undefined;
        if (cacheConfig && shouldUseCache(req, cacheConfig)) {
          const store = cacheConfig.store ?? cacheStore;
          const cacheKey = computeCacheKey(req, cacheConfig);
          const cachedEntry = await Promise.resolve(store.get(cacheKey));
          if (cachedEntry) {
            sendFromCache(res, cachedEntry);
            return;
          }

          stack.push((_, response, next) => {
            hijackResponse(response, (entry) => {
              if (entry) {
                Promise.resolve(store.set(cacheKey, entry, cacheConfig.ttl)).catch((error) => {
                  requestLogger.warn("Failed to cache response", {
                    error: error instanceof Error ? error.message : String(error)
                  });
                });
              }
            });
            return next();
          });
        }

        if (routeOptions.uploads) {
          try {
            req.files = await parseMultipartForm(req, {
              maxFileSize: 5 * 1024 * 1024,
              maxFiles: 10,
              memory: true,
              ...(typeof routeOptions.uploads === "object" ? routeOptions.uploads : {})
            });
          } catch (error) {
            res.status(HttpStatus.BadRequest).json({
              error: "Invalid multipart payload",
              details: error instanceof Error ? error.message : String(error)
            });
            return;
          }
        }

        if (routeOptions.validate) {
          stack.push(...createValidationHandlers(routeOptions.validate));
        }

        stack.push(...routeMatch.handlers);
      }

      stack.push((_, response) => {
        if (!response.writableEnded) {
          response.status(HttpStatus.NotFound).json({
            error: "Not Found"
          });
        }
      });

      try {
        await executeHandlers(stack, req, res);
      } catch (error) {
        requestLogger.error("Unhandled error during request", {
          error: error instanceof Error ? error.message : String(error)
        });
        if (!res.writableEnded) {
          res.status(HttpStatus.InternalServerError).json({
            error: "Internal Server Error"
          });
        }
      }
    }
  };

  return app;
}
