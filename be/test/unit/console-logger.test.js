import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const loggerModule = require("../../dist/framework/core/logger.js");
const { createConsoleLogger } = loggerModule;

describe("Console logger", () => {
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalDebug = console.debug;
  let outputs;

  beforeEach(() => {
    outputs = { info: [], warn: [], error: [], debug: [] };
    console.info = (msg) => outputs.info.push(msg);
    console.warn = (msg) => outputs.warn.push(msg);
    console.error = (msg) => outputs.error.push(msg);
    console.debug = (msg) => outputs.debug.push(msg);
  });

  afterEach(() => {
    console.info = originalInfo;
    console.warn = originalWarn;
    console.error = originalError;
    console.debug = originalDebug;
  });

  it("formats logs without color when disabled", () => {
    const logger = createConsoleLogger({ appName: "TestApp", colorize: false, timestamp: false });

    logger.info("Hello", { foo: "bar" });

    assert.equal(outputs.info.length, 1);
    assert.equal(outputs.info[0], "[TestApp] INFO Hello {\"foo\":\"bar\"}");
  });

  it("applies ANSI colors when enabled", () => {
    const logger = createConsoleLogger({ appName: "TestApp", colorize: true, timestamp: false });

    logger.warn("Colored message");

    assert.equal(outputs.warn.length, 1);
    assert.match(outputs.warn[0], /\x1b\[36m\[TestApp\]\x1b\[0m/);
    assert.match(outputs.warn[0], /\x1b\[33mWARN\x1b\[0m/);
  });
});
