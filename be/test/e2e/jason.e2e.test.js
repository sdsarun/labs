import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { once } from "node:events";
import { Writable } from "node:stream";
import { request } from "node:http";

const require = createRequire(import.meta.url);
const jasonModule = require("../../dist/jason.js");
const { default: jason, HttpStatus } = jasonModule;

test("Jason app serves HTTP traffic end-to-end with logging", async () => {
  const logs = [];
  const logStream = new Writable({
    write(chunk, _encoding, callback) {
      logs.push(chunk.toString());
      callback();
    }
  });

  const app = jason();
  app.use(jason.logger({ stream: logStream }));
  app.get("/greet/:name", (req, res) => {
    res.json({ greeting: `Hello ${req.params.name}` });
  });

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const port = address.port;

  const responseBody = await new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/greet/Ada",
        method: "GET"
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            body: Buffer.concat(chunks).toString("utf8"),
            headers: res.headers
          });
        });
      }
    );

    req.on("error", reject);
    req.end();
  });

  server.close();
  await once(server, "close");

  assert.equal(responseBody.statusCode, HttpStatus.OK);
  assert.equal(
    responseBody.headers["content-type"],
    "application/json; charset=utf-8"
  );
  assert.deepEqual(JSON.parse(responseBody.body), { greeting: "Hello Ada" });
  assert.equal(logs.length, 1);
  assert.match(logs[0], /GET \/greet\/Ada 200/);
});
