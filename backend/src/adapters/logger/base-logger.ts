export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type LogContext = Record<string, unknown>;

export type LogEntry = {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    cause?: unknown;
  };
  service?: string;
};

export type BaseLoggerOptions = {
  service?: string;
  defaultContext?: LogContext;
  level?: LogLevel;
};

export abstract class BaseLogger {
  private readonly service?: string;
  private readonly defaultContext: LogContext;
  private readonly levelIndex: number;

  private static readonly levelOrder: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];

  constructor(options: BaseLoggerOptions = {}) {
    this.service = options.service;
    this.defaultContext = { ...(options.defaultContext ?? {}) };
    this.levelIndex = BaseLogger.resolveLevelIndex(options.level);
  }

  trace(message: string, context?: LogContext): void {
    this.record({ level: "trace", message, context });
  }

  debug(message: string, context?: LogContext): void {
    this.record({ level: "debug", message, context });
  }

  info(message: string, context?: LogContext): void {
    this.record({ level: "info", message, context });
  }

  warn(message: string, context?: LogContext): void {
    this.record({ level: "warn", message, context });
  }

  error(error: unknown, context?: LogContext): void {
    const { message, normalizedError } = this.normalizeError(error);
    this.record({ level: "error", message, context, error: normalizedError });
  }

  fatal(error: unknown, context?: LogContext): void {
    const { message, normalizedError } = this.normalizeError(error);
    this.record({ level: "fatal", message, context, error: normalizedError });
  }

  protected record(entry: Omit<LogEntry, "timestamp" | "service">): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const timestamp = new Date();
    const context = this.mergeContext(entry.context);
    this.write({
      ...entry,
      timestamp,
      service: this.service,
      context: Object.keys(context).length > 0 ? context : undefined
    });
  }

  protected mergeContext(context?: LogContext): LogContext {
    if (!context) {
      return structuredClone(this.defaultContext);
    }

    return {
      ...structuredClone(this.defaultContext),
      ...context
    };
  }

  protected normalizeError(error: unknown): {
    message: string;
    normalizedError?: LogEntry["error"];
  } {
    if (error instanceof Error) {
      return {
        message: error.message,
        normalizedError: {
          name: error.name,
          message: error.message,
          stack: error.stack ?? undefined,
          cause: "cause" in error ? (error as { cause: unknown }).cause : undefined
        }
      };
    }

    if (typeof error === "string") {
      return { message: error };
    }

    try {
      return { message: JSON.stringify(error) };
    } catch {
      return { message: String(error) };
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levelIndex = BaseLogger.levelOrder.indexOf(level);
    return levelIndex >= this.levelIndex;
  }

  private static resolveLevelIndex(level?: LogLevel): number {
    if (!level) {
      return 0;
    }

    const resolved = BaseLogger.levelOrder.indexOf(level);
    return resolved === -1 ? 0 : resolved;
  }

  protected abstract write(entry: LogEntry): void;
}
