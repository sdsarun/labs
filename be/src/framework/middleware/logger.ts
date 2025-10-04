import type { Handler, LoggerInfo, LoggerOptions } from "../core/types.js";

/**
 * Creates a request logging middleware that writes structured logs per response.
 */
export function createLogger(options: LoggerOptions = {}): Handler {
  const stream = options.stream ?? process.stdout;
  const format =
    options.format ??
    ((info: LoggerInfo) =>
      `${info.timestamp.toISOString()} ${info.method} ${info.path} ${info.statusCode} ${info.durationMs.toFixed(2)}ms`);

  return (req, res, next) => {
    const start = process.hrtime.bigint();
    const onClose = () => {
      res.off("finish", onClose);
      res.off("close", onClose);

      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const info: LoggerInfo = {
        method: req.method ?? "UNKNOWN",
        path: req.url ?? "UNKNOWN",
        statusCode: res.statusCode,
        durationMs,
        contentLength: Number(res.getHeader("Content-Length")) || undefined,
        timestamp: new Date()
      };

      stream.write(`${format(info)}\n`);
    };

    res.once("finish", onClose);
    res.once("close", onClose);

    return next();
  };
}
