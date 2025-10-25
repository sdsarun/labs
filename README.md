# labs

## Backend Benchmark

- `npm run benchmark --workspace backend` spins up the Fastify server with in-memory data and runs health, list customers, and create customer scenarios using autocannon.
- Use `--driver express` to measure the Express adapter, and tweak `--connections`, `--duration`, or `--warmup` to shape load (defaults: 50 connections, 15s duration, 5s warmup).
- The script prints per-scenario request rate, latency, and throughput; compare `requests/sec avg` for throughput and `latency p99` for tail performance.
- Logs are reduced to warnings to keep output focused on the metrics; raise `LOG_LEVEL` if deeper tracing is needed.

## Backend Cron Jobs

- Set `ENABLE_CRON_JOBS=true` to activate scheduled tasks when the backend boots; leave unset/false to skip all cron work (useful for local dev).
- `CRON_CUSTOMER_METRICS` overrides the default hourly schedule (`0 * * * *`) that logs customer and booking counts; use standard cron syntax.
- `CRON_TIMEZONE` can pin execution to a specific zone (e.g. `UTC`); otherwise node-cron uses the system timezone.
- Cron jobs run inside the same process; graceful shutdown stops all scheduled tasks during application teardown.
