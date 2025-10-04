import { createApp } from "./server/app.js";
import { createLogger } from "./middleware/logger.js";
import { createCors } from "./middleware/cors.js";
import { createJsonMiddleware } from "./middleware/json.js";
import { HttpStatus } from "./core/status.js";
import { splitPath, matchRoute, matchPrefix } from "./core/path.js";
import { parseQuery } from "./core/query.js";
import { setLogger, getLogger, createConsoleLogger } from "./core/logger.js";

const jason = Object.assign(createApp, {
  json: createJsonMiddleware,
  logger: createLogger,
  cors: createCors,
  setLogger,
  getLogger,
  consoleLogger: createConsoleLogger,
  __testOnly: {
    splitPath,
    matchRoute,
    matchPrefix,
    parseQuery
  }
});

export { HttpStatus };
export type {
  NextFunction,
  Handler,
  HTTPMethod,
  Request,
  Response,
  LoggerInfo,
  LoggerOptions,
  ConsoleLoggerOptions,
  LoggerAdapter,
  FrameworkOptions,
  UploadedFile,
  CookieOptions,
  ValidationConfig,
  ValidatorFunction,
  CacheOptions,
  CacheStore,
  SessionOptions,
  SessionStore,
  UploadOptions,
  SecurityHeadersOptions,
  RateLimitOptions,
  CorsOriginOption,
  CorsOptions,
  Route,
  Middleware,
  App
} from "./core/types.js";
export default jason;
