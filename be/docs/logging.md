# Logging

Jason provides a structured logging layer with two entry points:

- `jason.getLogger()` – retrieve the current `LoggerAdapter`.
- `jason.setLogger(adapter?, options?)` – replace the logger globally.

The default adapter is a NestJS-inspired console logger. You can tweak its output or replace it entirely.

## Console logger options

When you create an app, pass `loggerOptions` to control formatting:

```ts
const app = jason({
  loggerOptions: {
    appName: "Billing",
    colorize: process.env.NODE_ENV !== "production",
    timestamp: true
  }
});
```

Alternatively, build and set a console logger manually:

```ts
const consoleLogger = jason.consoleLogger({ appName: "Worker", colorize: false });
jason.setLogger(consoleLogger);
```

### Output format

```
[AppName] LEVEL 2025-01-01T00:00:00.000Z message {"meta":"data"}
```

Color codes follow NestJS conventions (cyan app name, colored level) and are disabled automatically in production unless overridden.

## Using an external logger

Implement the `LoggerAdapter` interface:

```ts
const adapter = {
  info(message, meta) {
    external.info({ message, ...meta });
  },
  warn(message, meta) {
    external.warn({ message, ...meta });
  },
  error(message, meta) {
    external.error({ message, ...meta });
  },
  debug(message, meta) {
    external.debug({ message, ...meta });
  }
};

const app = jason({ logger: adapter });
```

Once set, the adapter is used everywhere: route registration, middleware auditing, server start messages, error reporting, caching warnings, etc.

## Ad hoc logging

Within your handlers or services:

```ts
const logger = jason.getLogger();
logger.info("user created", { userId });
logger.error("purchase failed", { error: err.message });
```

Remember that `jason.getLogger()` returns the adapter currently in effect, so middleware and downstream modules stay in sync.
