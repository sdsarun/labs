import { HttpStatus } from "../core/status.js";
import type { Handler, Request, Response, ValidationConfig, ValidatorFunction } from "../core/types.js";

/**
 * Minimum shape recognised from common schema libraries (Zod, Yup, etc.).
 */
interface SchemaLike {
  safeParse?: (input: unknown) => { success: boolean; data?: unknown; error?: unknown };
  parse?: (input: unknown) => unknown | Promise<unknown>;
  parseAsync?: (input: unknown) => Promise<unknown>;
  validate?: (input: unknown) => unknown | Promise<unknown>;
  validateSync?: (input: unknown) => unknown;
}

/**
 * Normalises schema-like objects or functions into a `ValidatorFunction`.
 */
function toValidator(source?: ValidatorFunction | SchemaLike): ValidatorFunction | undefined {
  if (!source) {
    return undefined;
  }

  if (typeof source === "function") {
    return source as ValidatorFunction;
  }

  const schema = source as SchemaLike;

  return async (input: unknown) => {
    if (schema.safeParse) {
      const result = schema.safeParse(input);
      if (result.success) {
        return result.data;
      }
      throw result.error ?? new Error("Validation failed");
    }

    if (schema.parseAsync) {
      return schema.parseAsync(input);
    }

    if (schema.parse) {
      return schema.parse(input);
    }

    if (schema.validate) {
      return schema.validate(input);
    }

    if (schema.validateSync) {
      return schema.validateSync(input);
    }

    throw new Error("Unsupported schema object");
  };
}

/**
 * Sends a formatted validation error response.
 */
function handleValidationError(
  res: Response,
  error: unknown,
  jsonImpl?: Response["json"]
) {
  const target = res.status(HttpStatus.BadRequest);
  const sendJson = jsonImpl ? jsonImpl.bind(target) : target.json.bind(target);
  sendJson({
    error: "Validation failed",
    details: normalizeError(error)
  });
}

function normalizeError(error: unknown): unknown {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name
    };
  }

  return error;
}

/**
 * Builds validation middleware from route-level configuration.
 */
export function createValidationHandlers(config?: ValidationConfig): Handler[] {
  if (!config) {
    return [];
  }

  const validators = {
    params: toValidator(config.params),
    query: toValidator(config.query),
    body: toValidator(config.body),
    response: toValidator(config.response)
  };

  if (!validators.params && !validators.query && !validators.body && !validators.response) {
    return [];
  }

  const middleware: Handler = async (req, res, next) => {
    try {
      req.validated = req.validated ?? {};
      if (validators.params) {
        req.validated.params = await validators.params(req.params, req);
      }

      if (validators.query) {
        req.validated.query = await validators.query(req.query, req);
      }

      if (validators.body) {
        req.validated.body = await validators.body(req.body, req);
      }

      if (validators.response) {
        wrapResponseValidation(
          res,
          validators.response,
          req,
          res.json.bind(res),
          res.send.bind(res)
        );
      }
    } catch (error) {
      handleValidationError(res, error);
      return;
    }

    await next();
  };

  return [middleware];
}

function wrapResponseValidation(
  res: Response,
  validator: ValidatorFunction,
  req: Request,
  originalJson: Response["json"],
  originalSend: Response["send"]
) {
  res.json = function json(payload: unknown) {
    Promise.resolve(validator(payload, req))
      .then((validated) => {
        originalJson.call(res, validated);
      })
      .catch((error) => {
        handleValidationError(res, error, originalJson);
      });
    return res;
  };

  res.send = function send(payload: unknown) {
    Promise.resolve(validator(payload, req))
      .then((validated) => {
        originalSend.call(res, validated as unknown);
      })
      .catch((error) => {
        handleValidationError(res, error, originalJson);
      });
    return res;
  };
}
