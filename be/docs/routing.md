# Routing

Jason exposes an Express-style API but augments each verb with optional route metadata. You can attach middleware, validation, caching, uploads, security, and rate limits while keeping handlers clean.

```ts
import jason from "./jason.js";

const app = jason();

app.get(
  "/articles/:slug",
  {
    validate: {
      params: (value) => {
        if (!value.slug) throw new Error("slug required");
        return value;
      }
    },
    cache: { ttl: 10_000 }
  },
  (req, res) => {
    res.json({ slug: req.validated!.params.slug });
  }
);
```

## Route options

Every HTTP verb (`get`, `post`, `put`, `patch`, `delete`, `options`, `head`) accepts either

```ts
app.get(path, handler, handler? ...)
```

or

```ts
app.get(path, routeOptions, handler, handler? ...)
```

### `RouteOptions`

| Option | Type | Purpose |
| --- | --- | --- |
| `validate` | [`ValidationConfig`](validation.md#validationconfig) | Per-request validation for params/query/body/response. |
| `cache` | `CacheOptions \| boolean` | Cache successful responses for GET requests. `true` defaults to in-memory store. |
| `uploads` | `UploadOptions \| boolean` | Enable multipart/form-data parsing with limits. |
| `security` | [`SecurityHeadersOptions`](security.md#security-headers) | Apply helmet-style headers. |
| `rateLimit` | [`RateLimitOptions`](security.md#rate-limiting) | Rate limit requests using in-memory or custom stores. |
| `session` | `boolean` | Ensure `req.session` is available for the route. Requires `session` config when creating the app. |

Handlers can be stacked after the options object just like Express middleware.

## Request and response objects

Jason extends the native Node objects with the following properties and helpers:

### `Request`

- `params`: parsed route parameters.
- `query`: parsed query string map.
- `body`: JSON payload or raw data (when not JSON).
- `rawBody`: original `Buffer` for non-idempotent use cases.
- `validated`: populated by validation middleware `{ params, query, body }`.
- `cookies` / `signedCookies`: parsed values from the `Cookie` header.
- `session`: present when sessions are enabled; see [state management](state-and-storage.md#sessions).
- `files`: array of `UploadedFile` when `uploads` is enabled.

See [`src/framework/core/types.ts`](../src/framework/core/types.ts) for full typings.

### `Response`

- `status(code)`
- `json(payload)`
- `send(payload)`
- `set(name, value)`
- `cookie(name, value, options?)` / `clearCookie(name, options?)`
- `streamFile(filePath, options?)`
- `locals`: mutable bag for cross-middleware state.

Refer to [streaming and caching](cache-and-performance.md) for usage details.

## Middleware registration

`app.use()` accepts either a handler or a path + handler(s). Middleware is evaluated in the order registered.

```ts
app.use(jason.logger());
app.use("/admin", requireAdminAccess);
```

The provided middleware factories (`jason.json()`, `jason.cors()`, `jason.logger()`) come from `framework/middleware`. You can mix them with custom handlers.

## Listening

```ts
app.listen(port, hostname?, callback?)
```

`listen()` logs the bound routes using the configured logger. The returned `http.Server` follows Node semantics.

## Extending the pipeline

Because handlers are just `(req, res, next) => {}` functions, you can compose them freely:

```ts
const audit = (req, res, next) => {
  jason.getLogger().info("Audit", { method: req.method, url: req.url });
  return next();
};

app.post("/events", { validate: { body: eventSchema } }, audit, processEvent);
```

Downstream middleware can rely on `req.validated`, `req.files`, `req.session`, etc., based on the options used earlier in the chain.
