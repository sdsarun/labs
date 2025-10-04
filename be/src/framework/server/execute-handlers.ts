import { HttpStatus } from "../core/status.js";
import type { Handler, NextFunction, Request, Response } from "../core/types.js";

/**
 * Executes a stack of handlers sequentially, respecting `next()` semantics.
 */
export async function executeHandlers(
  handlers: Handler[],
  req: Request,
  res: Response,
  index = 0
): Promise<void> {
  if (index >= handlers.length || res.writableEnded) {
    return;
  }

  const handler = handlers[index];
  let nextCalled = false;

  const next: NextFunction = () => {
    if (nextCalled) {
      throw new Error("next() called multiple times");
    }
    nextCalled = true;

    const promise = executeHandlers(handlers, req, res, index + 1);
    promise.catch((error) => {
      console.error("Handler execution failed", error);
      if (!res.writableEnded) {
        res.status(HttpStatus.InternalServerError).json({
          error: "Internal Server Error"
        });
      }
    });
    return promise;
  };

  try {
    const result = handler(req, res, next);
    if (result && typeof (result as Promise<void>).then === "function") {
      await result;
    }
  } catch (error) {
    console.error("Handler execution failed", error);
    if (!res.writableEnded) {
      res.status(HttpStatus.InternalServerError).json({
        error: "Internal Server Error"
      });
    }
  }
}
