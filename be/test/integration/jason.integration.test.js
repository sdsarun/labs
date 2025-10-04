import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { Readable } from "node:stream";
import { ServerResponse } from "node:http";
import { once } from "node:events";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const require = createRequire(import.meta.url);
const jasonModule = require("../../dist/jason.js");
const { default: jason, HttpStatus } = jasonModule;

class MemoryLogger {
  constructor() {
    this.records = [];
  }

  info(message, meta) {
    this.records.push({ level: "info", message, meta });
  }

  warn(message, meta) {
    this.records.push({ level: "warn", message, meta });
  }

  error(message, meta) {
    this.records.push({ level: "error", message, meta });
  }
}

function createRequest({
  method = "GET",
  url = "/",
  headers = {},
  body
} = {}) {
  const source = new Readable({
    read() {
      if (body !== undefined) {
        this.push(body);
      }
      this.push(null);
    }
  });

  source.method = method;
  source.url = url;
  source.headers = headers;

  return source;
}

async function dispatch(app, options) {
  const req = createRequest(options);
  const res = new ServerResponse(req);
  const chunks = [];
  let resolveDone;
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });

  const originalWrite = res.write;
  res.write = function write(chunk, encoding, cb) {
    if (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    }
    return originalWrite.call(this, chunk, encoding, cb);
  };

  const originalEnd = res.end;
  res.end = function end(chunk, encoding, cb) {
    if (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    }
    const result = originalEnd.call(this, chunk, encoding, cb);
    resolveDone();
    return result;
  };

  await app.handle(req, res);
  await done;

  return {
    statusCode: res.statusCode,
    headers: res.getHeaders(),
    body: Buffer.concat(chunks),
    res
  };
}

test("Jason handles middleware, params, body, and queries", async () => {
  const app = jason();
  app.use(jason.json());
  app.post("/users/:id", (req, res) => {
    res.json({
      params: req.params,
      body: req.body,
      query: req.query
    });
  });

  const req = createRequest({
    method: "POST",
    url: "/users/99?debug=true&tag=one&tag=two",
    headers: {
      "content-type": "application/json"
    },
    body: Buffer.from(JSON.stringify({ name: "Taylor" }), "utf8")
  });

  const res = new ServerResponse(req);
  let payload = Buffer.alloc(0);

  const originalEnd = res.end;
  res.end = function patchedEnd(chunk, encoding, cb) {
    let buffer = chunk;
    if (typeof buffer === "string") {
      buffer = Buffer.from(buffer, encoding);
    }
    if (buffer) {
      payload = Buffer.concat([payload, buffer]);
    }
    return originalEnd.call(this, chunk, encoding, cb);
  };

  await app.handle(req, res);

  const body = JSON.parse(payload.toString("utf8"));

  assert.equal(res.statusCode, HttpStatus.OK);
  assert.deepEqual(body, {
    params: { id: "99" },
    body: { name: "Taylor" },
    query: { debug: "true", tag: ["one", "two"] }
  });
  assert.equal(res.getHeader("content-type"), "application/json; charset=utf-8");
});

test("Jason returns 404 when no route matches", async () => {
  const app = jason();
  const req = createRequest({ method: "GET", url: "/missing" });
  const res = new ServerResponse(req);
  let payload = Buffer.alloc(0);

  const originalEnd = res.end;
  res.end = function patchedEnd(chunk, encoding, cb) {
    if (chunk) {
      const buffer =
        typeof chunk === "string" ? Buffer.from(chunk, encoding) : chunk;
      payload = Buffer.concat([payload, buffer]);
    }
    return originalEnd.call(this, chunk, encoding, cb);
  };

  await app.handle(req, res);

  assert.equal(res.statusCode, HttpStatus.NotFound);
  assert.equal(res.getHeader("content-type"), "application/json; charset=utf-8");
  assert.deepEqual(JSON.parse(payload.toString("utf8")), { error: "Not Found" });
});

test("Jason logs registered routes when server starts", async () => {
  const logger = new MemoryLogger();
  const app = jason({ logger });
  app.get("/alpha", () => {});
  app.post("/beta", () => {});

  const server = app.listen(0, "127.0.0.1", () => {
    server.close();
  });

  await once(server, "close");

  const messages = logger.records.filter((entry) => entry.level === "info");
  assert.ok(
    messages.some((entry) => entry.message === "Jason registered routes:"),
    "should log header line"
  );
  assert.ok(
    messages.some(
      (entry) =>
        entry.message === "Registered route" && entry.meta?.path === "/alpha"
    ),
    "should log GET route"
  );
  assert.ok(
    messages.some(
      (entry) =>
        entry.message === "Registered route" && entry.meta?.path === "/beta"
    ),
    "should log POST route"
  );
});

test("Jason CORS middleware sets default headers", async () => {
  const app = jason();
  app.use(jason.cors());
  app.get("/cors", (_req, res) => {
    res.status(HttpStatus.OK).end();
  });

  const req = createRequest({
    method: "GET",
    url: "/cors",
    headers: { origin: "http://example.com" }
  });
  const res = new ServerResponse(req);

  await app.handle(req, res);

  assert.equal(res.statusCode, HttpStatus.OK);
  assert.equal(res.getHeader("access-control-allow-origin"), "*");
  const allowMethods = res.getHeader("access-control-allow-methods");
  assert.ok(
    typeof allowMethods === "string" && allowMethods.includes("GET"),
    "should advertise allowed methods"
  );
});

test("Jason CORS middleware handles preflight requests", async () => {
  const app = jason();
  app.use(
    jason.cors({
      origin: ["http://allowed.com"],
      methods: ["GET", "POST"],
      allowHeaders: ["X-Custom"],
      exposeHeaders: ["X-Response"],
      credentials: true,
      maxAge: 600
    })
  );
  app.post("/cors", (_req, res) => {
    res.status(HttpStatus.OK).end();
  });

  const req = createRequest({
    method: "OPTIONS",
    url: "/cors",
    headers: {
      origin: "http://allowed.com",
      "access-control-request-method": "POST",
      "access-control-request-headers": "X-Custom"
    }
  });

  const res = new ServerResponse(req);

  await app.handle(req, res);

  assert.equal(res.statusCode, HttpStatus.NoContent);
  assert.equal(res.getHeader("access-control-allow-origin"), "http://allowed.com");
  assert.equal(res.getHeader("access-control-allow-credentials"), "true");
  assert.equal(res.getHeader("access-control-max-age"), "600");
  assert.equal(res.getHeader("access-control-allow-headers"), "X-Custom");
  const varyHeader = res.getHeader("vary");
  assert.ok(
    typeof varyHeader === "string" && varyHeader.includes("Origin"),
    "should vary on Origin"
  );
});

test("Jason CORS middleware skips disallowed origins", async () => {
  const app = jason();
  app.use(jason.cors({ origin: ["http://allowed.com"], credentials: true }));
  app.get("/cors", (_req, res) => {
    res.status(HttpStatus.OK).end();
  });

  const req = createRequest({
    method: "GET",
    url: "/cors",
    headers: { origin: "http://denied.com" }
  });

  const res = new ServerResponse(req);

  await app.handle(req, res);

  assert.equal(res.statusCode, HttpStatus.OK);
  assert.equal(res.getHeader("access-control-allow-origin"), undefined);
  const varyHeader = res.getHeader("vary");
  assert.ok(
    typeof varyHeader === "string" && varyHeader.includes("Origin"),
    "should set Vary when origin is conditional"
  );
});

test("Jason validates request and response payloads", async () => {
  const app = jason();

  const bodyValidator = (value) => {
    if (!value || typeof value !== "object" || typeof value.name !== "string") {
      throw new Error("name is required");
    }
    return value;
  };

  const responseValidator = (value) => {
    if (!value || typeof value !== "object" || typeof value.message !== "string") {
      throw new Error("response message missing");
    }
    return value;
  };

  app.post(
    "/validate",
    {
      validate: {
        body: bodyValidator,
        response: responseValidator
      }
    },
    (req, res) => {
      const data = req.validated?.body ?? {};
      res.json({ message: `Hi ${data.name}` });
    }
  );

  const ok = await dispatch(app, {
    method: "POST",
    url: "/validate",
    headers: { "content-type": "application/json" },
    body: Buffer.from(JSON.stringify({ name: "Ada" }))
  });

  assert.equal(ok.statusCode, HttpStatus.OK);
  assert.equal(ok.body.toString("utf8"), JSON.stringify({ message: "Hi Ada" }));

  const bad = await dispatch(app, {
    method: "POST",
    url: "/validate",
    headers: { "content-type": "application/json" },
    body: Buffer.from(JSON.stringify({}))
  });

  assert.equal(bad.statusCode, HttpStatus.BadRequest);
});

test("Jason caches responses when cache options are provided", async () => {
  const app = jason();
  let hits = 0;

  app.get(
    "/cache",
    {
      cache: {
        ttl: 1000
      }
    },
    (_req, res) => {
      hits += 1;
      res.json({ hits });
    }
  );

  const first = await dispatch(app, { method: "GET", url: "/cache" });
  const second = await dispatch(app, { method: "GET", url: "/cache" });

  assert.equal(hits, 1);
  assert.equal(first.statusCode, HttpStatus.OK);
  assert.equal(second.statusCode, HttpStatus.OK);
  assert.equal(first.body.toString("utf8"), second.body.toString("utf8"));
});

test("Jason sessions persist values across requests", async () => {
  const app = jason({
    session: {
      secret: "supersecret",
      cookie: { secure: false }
    }
  });

  app.get(
    "/session",
    { session: true },
    (req, res) => {
      if (!req.session) {
        res.status(HttpStatus.InternalServerError).json({ error: "Session missing" });
        return;
      }
      const current = Number(req.session.data.count ?? 0);
      req.session.data.count = current + 1;
      res.json({ count: req.session.data.count });
    }
  );

  const first = await dispatch(app, { method: "GET", url: "/session" });
  const cookieHeader = first.headers["set-cookie"];
  assert.ok(cookieHeader);
  const cookieValue = Array.isArray(cookieHeader)
    ? cookieHeader[0].split(";")[0]
    : cookieHeader.split(";")[0];

  const second = await dispatch(app, {
    method: "GET",
    url: "/session",
    headers: {
      cookie: cookieValue
    }
  });

  assert.equal(JSON.parse(first.body.toString("utf8")).count, 1);
  assert.equal(JSON.parse(second.body.toString("utf8")).count, 2);
});

test("Jason parses multipart uploads", async () => {
  const app = jason();
  app.post(
    "/upload",
    {
      uploads: {
        memory: true,
        maxFiles: 2,
        fields: [{ name: "file", maxCount: 1 }]
      }
    },
    (req, res) => {
      res.json({
        files: req.files?.map((file) => ({ name: file.filename, size: file.size })),
        fields: req.body,
        fileMap: req.fileMap
      });
    }
  );

  const boundary = `----JasonForm${randomBytes(6).toString("hex")}`;
  const body = Buffer.from(
    [
      `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="description"\r\n\r\n' +
        "Example upload\r\n",
      `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="file"; filename="hello.txt"\r\n' +
        "Content-Type: text/plain\r\n\r\n" +
        "Hello world!\r\n",
      `--${boundary}--\r\n`
    ].join(""),
    "utf8"
  );

  const result = await dispatch(app, {
    method: "POST",
    url: "/upload",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`
    },
    body
  });

  const payload = JSON.parse(result.body.toString("utf8"));
  assert.equal(payload.fields.description.trim(), "Example upload");
  assert.equal(Array.isArray(payload.files), true);
  assert.equal(payload.files[0].size, "Hello world!".length);
  assert.equal(Array.isArray(payload.fileMap.file), true);
});

test("Jason streams files with range support", async () => {
  const app = jason();
  const filePath = join(tmpdir(), `jason-stream-${randomBytes(4).toString("hex")}.txt`);
  await fs.writeFile(filePath, "stream me");

  app.get("/file", (_req, res) => {
    res.streamFile(filePath, { cacheControl: "no-store" }).catch((error) => {
      res.status(HttpStatus.InternalServerError).json({ error: error.message });
    });
  });

  const response = await dispatch(app, { method: "GET", url: "/file" });
  assert.equal(response.statusCode, HttpStatus.OK);
  assert.equal(response.body.toString("utf8"), "stream me");
  await fs.unlink(filePath);
});

test("Jason streams custom async content", async () => {
  const app = jason();

  app.get("/clock", async (_req, res) => {
    await res.stream(async function* () {
      for (let i = 0; i < 3; i += 1) {
        yield `tick ${i}`;
      }
    }(), {
      contentType: "text/plain; charset=utf-8"
    });
  });

  const response = await dispatch(app, { method: "GET", url: "/clock" });
  assert.equal(response.statusCode, HttpStatus.OK);
  assert.equal(response.body.toString("utf8"), "tick 0tick 1tick 2");
});

test("Jason applies security headers", async () => {
  const app = jason();
  app.get(
    "/secure",
    {
      security: {
        frameGuard: "deny",
        contentSecurityPolicy: "default-src 'self'",
        hsts: { maxAge: 1000 }
      }
    },
    (_req, res) => {
      res.status(HttpStatus.OK).end();
    }
  );

  const response = await dispatch(app, { method: "GET", url: "/secure" });
  assert.equal(response.statusCode, HttpStatus.OK);
  assert.equal(response.headers["x-frame-options"], "DENY");
  assert.equal(response.headers["content-security-policy"], "default-src 'self'");
});

test("Jason rate limits per route", async () => {
  const app = jason();
  const store = new (class {
    constructor() {
      this.counters = new Map();
    }
    increment(key, windowMs) {
      const now = Date.now();
      const entry = this.counters.get(key);
      if (!entry || entry.expires < now) {
        this.counters.set(key, { count: 1, expires: now + windowMs });
        return 1;
      }
      entry.count += 1;
      return entry.count;
    }
  })();

  app.get(
    "/limited",
    {
      rateLimit: {
        windowMs: 1000,
        max: 1,
        store,
        keyGenerator: () => "integration-test"
      }
    },
    (_req, res) => {
      res.json({ ok: true });
    }
  );

  const ok = await dispatch(app, { method: "GET", url: "/limited" });
  const blocked = await dispatch(app, { method: "GET", url: "/limited" });

  assert.equal(ok.statusCode, HttpStatus.OK);
  assert.equal(blocked.statusCode, HttpStatus.TooManyRequests);
});
