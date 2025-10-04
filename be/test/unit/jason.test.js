import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const jasonModule = require("../../dist/jason.js");
const { default: jason, HttpStatus } = jasonModule;

const { splitPath, matchRoute, matchPrefix, parseQuery } = jason.__testOnly;

describe("Jason unit helpers", () => {
  it("splits paths into segments", () => {
    assert.deepEqual(splitPath("/"), []);
    assert.deepEqual(splitPath("/users/123"), ["users", "123"]);
    assert.deepEqual(splitPath("/users/123/"), ["users", "123"]);
  });

  it("matches routes with parameters", () => {
    const match = matchRoute(["users", ":id"], ["users", "42"]);
    assert.ok(match);
    assert.deepEqual(match.params, { id: "42" });
  });

  it("rejects non matching routes", () => {
    assert.equal(matchRoute(["users", "list"], ["users", "42"]), null);
  });

  it("matches middleware prefixes", () => {
    assert.equal(matchPrefix([], ["users"]), true);
    assert.equal(matchPrefix(["users"], ["users", "42"]), true);
    assert.equal(matchPrefix(["admin"], ["users", "42"]), false);
  });

  it("parses query strings with repeated keys", () => {
    const url = new URL("http://localhost/search?q=node&q=testing&page=2");
    assert.deepEqual(parseQuery(url), {
      q: ["node", "testing"],
      page: "2"
    });
  });

  it("exposes HttpStatus enum values", () => {
    assert.equal(HttpStatus.OK, 200);
    assert.equal(HttpStatus.NotFound, 404);
    assert.equal(HttpStatus.InternalServerError, 500);
  });

  it("provides a cors middleware factory", () => {
    assert.equal(typeof jason.cors, "function");
  });
});
