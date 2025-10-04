import type { ConsoleLoggerOptions, LoggerAdapter } from "./types.js";

type Level = "info" | "warn" | "error" | "debug";

const LEVEL_COLORS: Record<Level, string> = {
  info: "32",
  warn: "33",
  error: "31",
  debug: "35"
};

interface ResolvedConsoleOptions {
  appName: string;
  colorize: boolean;
  timestamp: boolean;
}

/** Default settings for the console logger. */
const DEFAULT_OPTIONS: ResolvedConsoleOptions = {
  appName: "Jason",
  colorize: process.env.NODE_ENV !== "production",
  timestamp: true
};

/**
 * Default NestJS-inspired console logger with optional colour output.
 */
class ConsoleLogger implements LoggerAdapter {
  constructor(private readonly options: ResolvedConsoleOptions) {}

  info(message: string, meta?: Record<string, unknown>) {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.log("warn", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.log("error", message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.log("debug", message, meta);
  }

  private log(level: Level, message: string, meta?: Record<string, unknown>) {
    const line = formatLine(level, message, meta, this.options);
    const fn = level === "debug" ? console.debug : console[level];
    fn(line);
  }
}

/**
 * Formats a log line according to console logger options.
 */
function formatLine(
  level: Level,
  message: string,
  meta: Record<string, unknown> | undefined,
  options: ResolvedConsoleOptions
): string {
  const timestamp = options.timestamp ? new Date().toISOString() : undefined;
  const appLabel = colorize(`[${options.appName}]`, "36", options.colorize);
  const levelLabel = colorize(level.toUpperCase(), LEVEL_COLORS[level], options.colorize);

  const segments = [appLabel, levelLabel];
  if (timestamp) {
    segments.push(timestamp);
  }
  segments.push(message);

  if (meta && Object.keys(meta).length > 0) {
    segments.push(JSON.stringify(meta));
  }

  return segments.join(" ");
}

/**
 * Wraps text in ANSI color codes when requested.
 */
function colorize(text: string, code: string, shouldColorize: boolean): string {
  if (!shouldColorize) {
    return text;
  }

  return `\x1b[${code}m${text}\x1b[0m`;
}

/**
 * Merges user-supplied options with defaults.
 */
function resolveOptions(options?: ConsoleLoggerOptions): ResolvedConsoleOptions {
  return {
    appName: options?.appName ?? DEFAULT_OPTIONS.appName,
    colorize: options?.colorize ?? DEFAULT_OPTIONS.colorize,
    timestamp: options?.timestamp ?? DEFAULT_OPTIONS.timestamp
  };
}

let currentLogger: LoggerAdapter = createConsoleLogger();

/** Creates a console logger using the given options. */
export function createConsoleLogger(
  options?: ConsoleLoggerOptions
): LoggerAdapter {
  return new ConsoleLogger(resolveOptions(options));
}

/**
 * Sets the global logger adapter. Falls back to the console logger when no adapter is supplied.
 */
export function setLogger(
  logger?: LoggerAdapter,
  options?: ConsoleLoggerOptions
): void {
  if (logger) {
    currentLogger = logger;
    return;
  }

  currentLogger = createConsoleLogger(options);
}

/** Returns the logger adapter currently used by the framework. */
export function getLogger(): LoggerAdapter {
  return currentLogger;
}
