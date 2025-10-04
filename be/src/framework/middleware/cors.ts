import { HttpStatus } from "../core/status.js";
import type {
  CorsOptions,
  CorsOriginOption,
  Handler,
  Request,
  Response
} from "../core/types.js";

const DEFAULT_ALLOWED_METHODS = [
  "GET",
  "HEAD",
  "PUT",
  "PATCH",
  "POST",
  "DELETE",
  "OPTIONS"
];

function appendVaryHeader(res: Response, header: string) {
  const current = res.getHeader("Vary");
  if (!current) {
    res.setHeader("Vary", header);
    return;
  }

  const value = Array.isArray(current) ? current.join(", ") : String(current);
  if (value.split(/\s*,\s*/).includes(header)) {
    return;
  }

  res.setHeader("Vary", `${value}, ${header}`);
}

function formatHeaderList(values?: string[]): string | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  return values.join(", ");
}

function resolveCorsOrigin(
  req: Request,
  option?: CorsOriginOption
): string | undefined {
  const requestOrigin =
    typeof req.headers.origin === "string" ? req.headers.origin : undefined;

  if (option === undefined) {
    return "*";
  }

  if (typeof option === "string") {
    return option;
  }

  if (Array.isArray(option)) {
    if (option.includes("*")) {
      return "*";
    }

    if (requestOrigin && option.includes(requestOrigin)) {
      return requestOrigin;
    }

    return undefined;
  }

  const result = option(req);

  if (!result) {
    return undefined;
  }

  if (typeof result === "string") {
    return result;
  }

  if (Array.isArray(result)) {
    if (result.includes("*")) {
      return "*";
    }

    if (requestOrigin && result.includes(requestOrigin)) {
      return requestOrigin;
    }

    return result[0];
  }

  return undefined;
}

/**
 * Builds a CORS middleware configured by the provided options.
 */
export function createCors(options: CorsOptions = {}): Handler {
  const {
    origin,
    methods,
    allowHeaders,
    exposeHeaders,
    credentials = false,
    maxAge
  } = options;

  const allowMethodsHeader =
    formatHeaderList(methods) ?? DEFAULT_ALLOWED_METHODS.join(", ");
  const allowHeadersHeader = formatHeaderList(allowHeaders);
  const exposeHeadersHeader = formatHeaderList(exposeHeaders);

  return (req, res, next) => {
    const requestOrigin =
      typeof req.headers.origin === "string" ? req.headers.origin : undefined;

    let resolvedOrigin = resolveCorsOrigin(req, origin);
    if (credentials && resolvedOrigin === "*") {
      resolvedOrigin = requestOrigin ?? undefined;
    }

    if (resolvedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", resolvedOrigin);
      if (resolvedOrigin !== "*") {
        appendVaryHeader(res, "Origin");
      }
    } else if (origin !== undefined && requestOrigin) {
      appendVaryHeader(res, "Origin");
    }

    if (credentials) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    if (exposeHeadersHeader) {
      res.setHeader("Access-Control-Expose-Headers", exposeHeadersHeader);
    }

    if (allowMethodsHeader) {
      res.setHeader("Access-Control-Allow-Methods", allowMethodsHeader);
    }

    if (req.method === "OPTIONS") {
      const requestAllowHeaders =
        allowHeadersHeader ??
        (Array.isArray(req.headers["access-control-request-headers"]) ?
          (req.headers["access-control-request-headers"] as string[]).join(", ") :
          (req.headers["access-control-request-headers"] as string | undefined));

      if (!allowHeadersHeader && req.headers["access-control-request-headers"]) {
        appendVaryHeader(res, "Access-Control-Request-Headers");
      }

      if (requestAllowHeaders) {
        res.setHeader("Access-Control-Allow-Headers", requestAllowHeaders);
      }

      const requestedMethod = req.headers["access-control-request-method"];
      if (!methods && typeof requestedMethod === "string") {
        res.setHeader("Access-Control-Allow-Methods", requestedMethod);
      }

      if (typeof maxAge === "number") {
        res.setHeader("Access-Control-Max-Age", `${maxAge}`);
      }

      res.status(HttpStatus.NoContent);
      res.end();
      return;
    }

    if (allowHeadersHeader) {
      res.setHeader("Access-Control-Allow-Headers", allowHeadersHeader);
    }

    return next();
  };
}
