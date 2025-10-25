import { BaseHttpController, type HttpRouteDefinition } from "./base-http-handler";
import type { BaseLogger } from "../logger/base-logger";

export class HealthHttpController extends BaseHttpController {
  constructor(private readonly logger: BaseLogger) {
    super();
  }

  routes(): HttpRouteDefinition[] {
    return [
      {
        method: "GET",
        path: "/health",
        summary: "Health check",
        handler: async ({ reply }) => {
          reply.json({ status: "ok" });
        }
      }
    ];
  }
}
