# Security

Jason bundles several protections to harden your APIs.

## CORS

Use the built-in middleware `jason.cors(options?)` to manage cross-origin requests.

```ts
app.use(
  jason.cors({
    origin: ["https://app.example.com", "https://admin.example.com"],
    credentials: true,
    methods: ["GET", "POST"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["X-Request-Id"],
    maxAge: 3600
  })
);
```

If you omit options, Jason defaults to permissive `Access-Control-Allow-Origin: *` for simple GET/HEAD requests. `credentials: true` automatically echoes the request's origin while setting `Vary: Origin`.

## Security headers

Per-route headers can be configured via the `security` option:

```ts
app.get(
  "/admin",
  {
    security: {
      frameGuard: "deny",
      contentSecurityPolicy: "default-src 'none'; frame-ancestors 'none'",
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
    }
  },
  adminHandler
);
```

Available flags:

- `contentSecurityPolicy`
- `frameGuard` (`"deny"` or `"sameorigin"`)
- `xssProtection` (default `true`)
- `noSniff` (default `true`)
- `hidePoweredBy` (default `true`, removes `X-Powered-By`)
- `hsts` (HTTP Strict Transport Security)

## Rate limiting

Throttle high-traffic routes with `rateLimit`:

```ts
app.post(
  "/login",
  {
    rateLimit: {
      windowMs: 60_000,
      max: 5,
      message: "Too many login attempts",
      keyGenerator: (req) => req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "anon"
    }
  },
  loginHandler
);
```

Jason provides an in-memory `RateLimitStore` by default. To support shared limits (Redis, Memcached), pass an object with an `increment(key, windowMs)` method that returns the updated count.

If the count exceeds `max`, Jason returns a `429 Too Many Requests` response.

## Sessions and cookies

See [State & Storage](state-and-storage.md) for cookie management and session security. Remember to:

- Use a strong `session.secret`.
- Enable `cookie.secure` in production.
- Keep JWT or session IDs signed (`signed: true` is automatic for sessions).

## Logging

All built-in protections emit informative logs (e.g., cache store failures, rate limit breaches). Hook into `jason.getLogger()` to centralise audit trails.
