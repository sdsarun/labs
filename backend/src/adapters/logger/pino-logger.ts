import pino, { type Logger, type LoggerOptions } from "pino";
import { BaseLogger, BaseLoggerOptions, type LogEntry, type LogLevel } from "./base-logger";

export type PinoLoggerOptions = BaseLoggerOptions & { pino?: LoggerOptions };

export class PinoLogger extends BaseLogger {
  private readonly logger: Logger;
  private readonly pid: number;

  constructor(options: PinoLoggerOptions = {}) {
    super(options);
    this.pid = process.pid;
    this.logger = pino({
      level: options.pino?.level ?? options.level ?? "info",
      formatters: {
        level(label) {
          return { level: label.toUpperCase() };
        }
      },
      timestamp: false,
      base: undefined,
      hooks: {
        logMethod: (inputArgs, method, numericLevel) => {
          const args = [...inputArgs];
          const formatted = args.pop();
          const payload = (args[0] ?? {}) as {
            meta?: string;
            err?: LogEntry["error"];
            level?: LogLevel;
          };
          const level = payload.level ?? (pino.levels.labels[numericLevel as number] as LogLevel);
          const message = this.buildOutput(formatted, payload.meta);
          this.output(level, message, payload.err);
        }
      },
      ...options.pino
    });
  }

  protected write(entry: LogEntry): void {
    const { level, message, context, error, timestamp, service } = entry;
    const levelLabel = this.nestLevelLabel(level);
    const timestampLabel = timestamp.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const contextLabel = this.resolveContextLabel(service, context);
    const formatted = `${this.pid}   ${timestampLabel}   ${levelLabel} [${contextLabel}] ${message}`;
    const metadata = this.formatMetadata(context);

    this.logger[level](
      {
        meta: metadata,
        err: error,
        level
      },
      formatted
    );
  }

  private resolveContextLabel(service?: string, context?: Record<string, unknown>): string {
    if (typeof service === "string" && service.trim().length > 0) {
      return service;
    }

    if (context && typeof context.context === "string") {
      return context.context;
    }

    return "Application";
  }

  private nestLevelLabel(level: LogLevel): string {
    switch (level) {
      case "trace":
        return "VERBOSE";
      case "debug":
        return "DEBUG";
      case "info":
        return "LOG";
      case "warn":
        return "WARN";
      case "error":
        return "ERROR";
      case "fatal":
        return "FATAL";
      default:
        return String(level).toUpperCase();
    }
  }

  private buildOutput(formatted: unknown, metadata?: string): string {
    const base = typeof formatted === "string" ? formatted : String(formatted);
    if (!metadata) {
      return base;
    }
    return `${base} ${metadata}`;
  }

  private output(level: LogLevel, message: string, error?: LogEntry["error"]): void {
    const writer = this.resolveWriter(level);
    writer(message);

    const errorText = this.formatError(error);
    if (errorText) {
      writer(errorText);
    }
  }

  private formatMetadata(context?: Record<string, unknown>): string | undefined {
    if (!context) {
      return undefined;
    }

    const entries = Object.entries(context).filter(([key, value]) => {
      if (key === "context") {
        return false;
      }
      return value !== undefined && value !== null;
    });

    if (entries.length === 0) {
      return undefined;
    }

    return entries.map(([key, value]) => `${key}=${this.stringifyValue(value)}`).join(" ");
  }

  private stringifyValue(value: unknown): string {
    if (typeof value === "string") {
      return value.includes(" ") ? `"${value}"` : value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    if (value === null || value === undefined) {
      return String(value);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private formatError(error?: LogEntry["error"]): string | undefined {
    if (!error) {
      return undefined;
    }

    if (error.stack) {
      return error.stack;
    }

    if (error.message) {
      return error.message;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  private resolveWriter(level: LogLevel): (line: string) => void {
    switch (level) {
      case "fatal":
      case "error":
        return console.error.bind(console);
      case "warn":
        return console.warn.bind(console);
      case "debug":
      case "trace":
        return (console.debug ?? console.log).bind(console);
      case "info":
      default:
        return console.log.bind(console);
    }
  }
}
