# Jason Framework

Jason is a zero-dependency HTTP micro-framework focused on composability. It builds on Node's native `http` module but layers modern comforts:

- Express-style routing with structured route options.
- Built-in request/response validation (bring your own schema library like Zod or Yup).
- Configurable logging with NestJS-inspired formatting.
- Middleware for CORS, caching, sessions, cookies, multipart uploads, security headers, and rate limiting.
- Strong TypeScript typings that surface `req.validated`, `req.session`, `req.files`, and response helpers like `res.streamFile`.

This document summarizes the essentials. Detailed guides live under [`docs/`](docs/).

## Installation

```bash
npm install
npm run build
```

Jason is packaged as a local framework inside the `be/` workspace. Import it via relative paths, e.g. `import jason from "./jason.js";` from your application code.

## Quick Start

```ts
import jason, { HttpStatus } from "./jason.js";

const app = jason({
  loggerOptions: { appName: "API", colorize: process.env.NODE_ENV !== "production" },
  session: { secret: "super-secret", cookie: { secure: false } }
});

app.use(jason.cors());
app.use(jason.logger());

app.get(
  "/health",
  { cache: { ttl: 5_000 } },
  (_req, res) => {
    res.status(HttpStatus.OK).json({ ok: true, timestamp: Date.now() });
  }
);

app.post(
  "/users/:id",
  {
    validate: {
      params: (value) => {
        if (!value.id) throw new Error("id is required");
        return value;
      },
      body: (value) => {
        if (!value?.name) throw new Error("name is required");
        return value;
      }
    },
    session: true
  },
  (req, res) => {
    const { id } = req.validated!.params as { id: string };
    const { name } = req.validated!.body as { name: string };

    req.session!.data.lastUpdated = Date.now();
    res.json({ id, name, updatedAt: req.session!.data.lastUpdated });
  }
);

app.listen(4000, "0.0.0.0", () => {
  jason.getLogger().info("Server ready", { port: 4000 });
});
```

See the topic guides for the full API surface:

- [`docs/routing.md`](docs/routing.md)
- [`docs/validation.md`](docs/validation.md)
- [`docs/logging.md`](docs/logging.md)
- [`docs/cache-and-performance.md`](docs/cache-and-performance.md)
- [`docs/state-and-storage.md`](docs/state-and-storage.md)
- [`docs/security.md`](docs/security.md)
- [`docs/testing.md`](docs/testing.md)

---

## Project Layout

```
be/
├── src/
│   ├── jason.ts               # public entry point re-exporting framework APIs
│   ├── framework/
│   │   ├── index.ts           # main factory + export barrel
│   │   ├── core/              # types, status codes, response helpers, logger core
│   │   ├── middleware/        # built-in middleware factories
│   │   ├── services/          # platform services (validation, cache, uploads, etc.)
│   │   └── server/            # app factory + handler execution
├── test/                      # unit/integration/e2e coverage
└── README.md (this file)
```

## Scripts

- `npm run build` – compile TypeScript under `src/` to `dist/`.
- `npm run test` – build + run unit, integration, and e2e suites.
- `npm run test:unit` / `test:integration` / `test:e2e` – targeted runs.

## Contributing

1. Make changes under `src/framework` or `src/main.ts`.
2. Add/adjust tests under `test/`.
3. Run `npm run test` before shipping.
4. Update docs in `docs/` when you introduce new APIs.

Enjoy the lightweight stack!
