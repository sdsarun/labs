# Testing

The repository already ships with unit, integration, and end-to-end suites under `test/`. Use them as templates when adding new features.

## Running tests

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run test` – executes all of the above (build + unit + integration + e2e).

## Unit tests

Use Node's built-in test runner (`node:test`) and `assert`. The console logger example (`test/unit/console-logger.test.js`) demonstrates spying on console output.

## Integration tests

`test/integration/jason.integration.test.js` showcases how to:

- Spin up in-memory Jason apps per test.
- Use helper utilities (e.g., the local `dispatch` function) to simulate requests with raw payloads and inspect the `ServerResponse`.
- Assert validation, caching, sessions, uploads, security headers, and rate limiting.

When writing new integration cases, prefer dispatching through `app.handle(req, res)` to avoid binding to a port. The helper collects status code, headers, raw body, and the response object for flexible assertions.

## End-to-end tests

`test/e2e/jason.e2e.test.js` starts a real HTTP server on an ephemeral port and performs Node `http.request`. This verifies logging and networking end-to-end. Use it when you need to assert behaviour that depends on actual sockets (e.g., streaming to a real client).

## Tips

- Always run `npm run build` before tests to ensure the compiled `dist/` directory reflects your changes.
- Keep integration tests fast by avoiding large file system fixtures; generate temporary files with `fs.promises` and `tmpdir()` when necessary.
- Remember to clean up resources (servers, temp files) within each test to avoid interference across cases.

By mirroring the existing tests you maintain confidence across the growing feature set.
