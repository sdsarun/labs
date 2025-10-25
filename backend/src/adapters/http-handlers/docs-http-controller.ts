import { BaseHttpController, type HttpRouteDefinition } from "./base-http-handler";
import { openApiDocument } from "../../openapi/spec";

const OPENAPI_PATH = "/docs/openapi.json";

export class DocsHttpController extends BaseHttpController {
  routes(): HttpRouteDefinition[] {
    return [
      {
        method: "GET",
        path: OPENAPI_PATH,
        summary: "OpenAPI document",
        handler: async ({ reply }) => {
          reply
            .header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-store")
            .json(openApiDocument);
        }
      },
      {
        method: "GET",
        path: "/docs",
        summary: "Swagger UI",
        handler: async ({ reply }) => {
          const html = renderHtml(OPENAPI_PATH);
          reply
            .header("content-type", "text/html; charset=utf-8")
            .header("cache-control", "no-store")
            .send(html);
        }
      }
    ];
  }
}

function renderHtml(specUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Labs Booking API Docs</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.min.css"
    />
    <style>
      body {
        margin: 0;
        padding: 0;
      }
      #swagger-ui {
        height: 100vh;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.min.js"></script>
    <script>
      window.addEventListener("load", () => {
        window.ui = SwaggerUIBundle({
          url: "${specUrl}",
          dom_id: "#swagger-ui",
          presets: [SwaggerUIBundle.presets.apis],
          layout: "BaseLayout"
        });
      });
    </script>
  </body>
</html>`;
}
