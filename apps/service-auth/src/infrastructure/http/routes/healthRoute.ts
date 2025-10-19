import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { GetServiceHealth } from "../../../application/health/GetServiceHealth";

export interface HealthRouteOptions {
  interactor: GetServiceHealth;
}

declare module "fastify" {
  interface FastifyInstance {
    healthInteractor: GetServiceHealth;
  }
}

const healthRoute = fp<HealthRouteOptions>(async (fastify: FastifyInstance, opts) => {
  fastify.decorate("healthInteractor", opts.interactor);

  fastify.get("/health", {
    schema: {
      response: {
        200: {
          type: "object",
          properties: {
            service: { type: "string" },
            status: { type: "string", enum: ["ok", "degraded", "critical"] },
            version: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
            checks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  status: { type: "string", enum: ["ok", "degraded", "critical"] },
                  detail: { type: "string", nullable: true }
                }
              }
            }
          }
        }
      }
    }
  }, async () => {
    return fastify.healthInteractor.execute();
  });
});

export default healthRoute;
