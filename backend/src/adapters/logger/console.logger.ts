import { BaseLogger, BaseLoggerOptions, LogEntry } from "./base-logger";

export type ConsoleLoggerOptions = BaseLoggerOptions & {
  mode?: "json" | "pretty";
  formatter?: (entry: LogEntry) => unknown;
};

export class ConsoleLogger extends BaseLogger {
  private readonly mode: "json" | "pretty";
  private readonly formatter?: (entry: LogEntry) => unknown;

  constructor(options: ConsoleLoggerOptions = {}) {
    super(options);
    this.mode = options.mode ?? "json";
    this.formatter = options.formatter;
  }

  protected write(entry: LogEntry): void {
    const writer = this.getConsoleWriter(entry.level);

    if (this.formatter) {
      writer(this.formatter(entry));
      return;
    }

    if (this.mode === "pretty") {
      writer(this.formatPretty(entry));
      return;
    }

    writer(
      JSON.stringify(
        {
          timestamp: entry.timestamp.toISOString(),
          level: entry.level,
          message: entry.message,
          service: entry.service,
          context: entry.context,
          error: entry.error,
        },
      ),
    );
  }

  private formatPretty(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp.toISOString()}]`,
      entry.service ? `${entry.service}` : undefined,
      entry.level.toUpperCase(),
      entry.message,
    ].filter(Boolean);

    if (entry.context) {
      parts.push(`context=${JSON.stringify(entry.context)}`);
    }

    if (entry.error) {
      const serializedError = {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
        cause: entry.error.cause,
      };
      parts.push(`error=${JSON.stringify(serializedError)}`);
    }

    return parts.join(" ");
  }

  private getConsoleWriter(level: LogEntry["level"]) {
    switch (level) {
      case "trace":
        return console.trace.bind(console);
      case "debug":
        return console.debug.bind(console);
      case "warn":
        return console.warn.bind(console);
      case "error":
      case "fatal":
        return console.error.bind(console);
      case "info":
      default:
        return console.info ? console.info.bind(console) : console.log.bind(console);
    }
  }
}
