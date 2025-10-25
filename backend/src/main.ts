import { loadConfigFromEnv } from "./config/app-config";
import { buildApplication } from "./bootstrap/build-application";
import { loadEnv } from "./utils/env";

loadEnv();

async function bootstrap() {
  const config = loadConfigFromEnv(process.env);
  const app = await buildApplication(config);

  if (config.startServer) {
    await app.server.listen({ host: config.host, port: config.port });
  } else {
    app.logger.info("HTTP server configured but not started. Set START_HTTP_SERVER=true to listen.");
  }

  const shutdown = async () => {
    await app.shutdown();
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

void bootstrap();
