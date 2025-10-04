import { HttpStatus } from "../core/status.js";
import type { Handler } from "../core/types.js";

/**
 * Middleware wrapper that parses JSON payloads and reports bad inputs.
 */
export function createJsonMiddleware(): Handler {
  return async (req, res, next) => {
    if (req.rawBody && req.rawBody.length > 0) {
      try {
        req.body = JSON.parse(req.rawBody.toString("utf8"));
      } catch (error) {
        res.status(HttpStatus.BadRequest).json({ error: "Invalid JSON payload" });
        return;
      }
    }

    await next();
  };
}
