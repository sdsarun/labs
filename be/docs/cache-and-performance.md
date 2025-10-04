# Caching & Performance

Jason includes helpers for response caching, streaming large files, and tuning HTTP headers.

## Response caching

Enable caching per route with the `cache` option. It only applies to GET requests and stores the final payload; cached responses short-circuit the handler stack.

```ts
app.get(
  "/news",
  {
    cache: {
      ttl: 60_000,              // milliseconds
      key: (req) => `news:${req.headers['accept-language']}`
    }
  },
  fetchNews
);
```

- `ttl`: time-to-live in ms (default `undefined`, meaning cache until explicit eviction or process exit).
- `key(req)`: customise cache keys; defaults to a hash of method + URL + `accept-encoding`.
- `store`: plug in a custom `CacheStore` (must implement `get`, `set`, `delete`). In-memory cache is used otherwise.

While caching, Jason intercepts `res.write`/`res.end` to capture the body, status code, and headers. Errors and non-GET requests bypass caching automatically.

## Streaming files

Use `res.stream(source, options?)` to push any streamable content, or `res.streamFile` for convenience when streaming files.

```ts
app.get("/assets/:file", (req, res) => {
  const path = join(process.cwd(), "public", req.params.file);
  res.streamFile(path, {
    range: true,
    cacheControl: "public, max-age=31536000"
  }).catch((error) => {
    res.status(500).json({ error: error.message });
  });
});

app.get("/clock", async (_req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  await res.stream(async function* () {
    for (let i = 0; i < 5; i += 1) {
      yield `tick ${i}\n`;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }());
});
```

`res.stream` accepts:

- `source`: `Buffer`, `string`, `Readable`, or `AsyncIterable`.
- `contentType`, `contentLength`, `headers`, `downloadName`, `cacheControl`, and `statusCode`.

`res.streamFile` extends the same options with `range` support that honours `Range` headers and serves partial content when requested.

MIME types are inferred from file extensions with sensible defaults (`application/octet-stream` fallback).

## Response helpers

- `res.set(name, value)` – wrapper around `setHeader`.
- `res.cookie(name, value, options?)` – set cookies (see [State & Storage](state-and-storage.md)).
- `res.clearCookie(name, options?)` – expire cookie immediately.
- `res.locals` – plain object for middleware coordination (similar to Express).

## When to disable caching

Set `cache: false` or simply omit the option for routes that mutate state, rely on sessions, or contain per-request data.

If you want finer-grained control (e.g., bypass caching based on headers), implement a custom `key` function that returns `''` or throw inside your handler when caching is inappropriate.
