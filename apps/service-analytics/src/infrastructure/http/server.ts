import Fastify, { FastifyInstance, FastifyServerOptions } from "fastify";
import cors, { FastifyCorsOptions } from "@fastify/cors";
import { GetServiceHealth } from "../../application/health/GetServiceHealth";
import healthRoute from "./routes/healthRoute";

export interface BuildServerOptions {
  interactor: GetServiceHealth;
  server?: FastifyServerOptions;
  cors?: FastifyCorsOptions;
}

export const buildServer = ({
  interactor,
  server,
  cors: corsOptions
}: BuildServerOptions): FastifyInstance => {
  const instance = Fastify({
    logger: {
      level: "info"
    },
    ...(server ?? {})
  });

  const resolvedCors: FastifyCorsOptions = {
    origin: "*",
    credentials: true,
    ...(corsOptions ?? {})
  };

  instance.register(cors, resolvedCors);

  instance.register(healthRoute, { interactor });

  return instance;
};
