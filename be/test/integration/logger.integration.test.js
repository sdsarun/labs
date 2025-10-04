import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { Readable } from "node:stream";
import { ServerResponse } from "node:http";

const require = createRequire(import.meta.url);
const { default: jason } = require("../../dist/jason.js");

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

test("Jason uses injected logger adapter", async () => {
  const logger = new MemoryLogger();
  const app = jason({ logger });

  app.get("/log", (_req, res) => {
    res.status(200).end();
  });

  const req = createRequest({ method: "GET", url: "/log" });
  const res = new ServerResponse(req);

  await app.handle(req, res);

  assert.ok(
    logger.records.some(
      (entry) => entry.level === "info" && entry.message === "Registered route handler"
    ),
    "should log route registration"
  );
});
