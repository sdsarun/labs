import { GetServiceHealth } from "./application/health/GetServiceHealth";
import { loadConfig } from "./infrastructure/config/env";
import { buildServer } from "./infrastructure/http/server";

const config = loadConfig();

const interactor = new GetServiceHealth({
  serviceName: config.serviceName,
  version: config.version,
  probes: [
    {
      name: "uptime",
      check: async () => ({
        status: "ok" as const,
        detail: `${process.uptime().toFixed(2)}s`
      })
    },
    {
      name: "process:heap-usage",
      check: async () => {
        const memory = process.memoryUsage();
        const ratio = memory.heapUsed / memory.heapTotal;
        const status = ratio > 0.85 ? ("degraded" as const) : ("ok" as const);
        return {
          status,
          detail: `${(ratio * 100).toFixed(1)}%`
        };
      }
    }
  ]
});

const server = buildServer({
  interactor,
  cors: {
    // origin: config.corsOrigin,
    // exposedHeaders: "*"
    origin: [/localhost/]
  }
});

const start = async () => {
  try {
    await server.listen({ port: config.port, host: "0.0.0.0" });
    server.log.info(
      {
        service: config.serviceName,
        port: config.port,
        version: config.version
      },
      "Analytics service started"
    );
  } catch (error) {
    server.log.error(error, "Unable to start analytics service");
    process.exit(1);
  }
};

void start();
