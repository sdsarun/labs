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
    }
  ]
});

const server = buildServer({
  interactor,
  cors: {
    origin: config.corsOrigin
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
      "Service started"
    );
  } catch (error) {
    server.log.error(error, "Unable to start service");
    process.exit(1);
  }
};

void start();
