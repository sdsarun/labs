import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { GetServiceHealth } from "../../../application/health/GetServiceHealth";
import z from "zod";

export interface HealthRouteOptions {
  interactor: GetServiceHealth;
}

declare module "fastify" {
  interface FastifyInstance {
    analyticsHealthInteractor: GetServiceHealth;
  }
}

const healthRoute = fp<HealthRouteOptions>(async (fastify: FastifyInstance, opts) => {
  fastify.decorate("analyticsHealthInteractor", opts.interactor);

  fastify.get("/health", async (request, reply) => {
    const data = await fastify.analyticsHealthInteractor.execute();

    // Option A: use reply explicitly
    return reply
      .code(200)
      .header("x-nginx", "true")
      .header("x-analytic", "false")
      .type("application/json")
      .send({ requestHeaders: request.headers, data });
  });

  fastify.post("/hello", async (request, reply) => {
    const schema = z.object({
      firstName: z.string()
    });

    const bodyParsed = await schema.safeParseAsync(request.body);
    if (!bodyParsed.success) {
      return reply.type("application/problem+json").send(bodyParsed.error);
    }
    return reply.type("application/json").send({ ok: true })
  });
  fastify.post("/health", async (request, reply) => {
    const data = await fastify.analyticsHealthInteractor.execute();

    // Option A: use reply explicitly
    return reply
      .code(200)
      .header("x-nginx", "true")
      .header("x-analytic", "false")
      .type("application/json")
      .send({ requestHeaders: request.headers, data });
  });
});

export default healthRoute;
