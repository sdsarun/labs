import { z } from "zod";

const schema = z.object({
  SERVICE_NAME: z.string().min(1).default("auth-service"),
  SERVICE_VERSION: z.string().min(1).default("0.1.0"),
  PORT: z.coerce.number().int().positive().default(4001),
  CORS_ORIGIN: z.string().optional()
});

export type AppConfig = {
  serviceName: string;
  version: string;
  port: number;
  corsOrigin: string | string[];
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const formatted = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
    throw new Error(`Invalid environment configuration: ${formatted}`);
  }

  return {
    serviceName: parsed.data.SERVICE_NAME,
    version: parsed.data.SERVICE_VERSION,
    port: parsed.data.PORT,
    corsOrigin: parseCorsOrigins(parsed.data.CORS_ORIGIN)
  };
};

const parseCorsOrigins = (value?: string): string | string[] => {
  if (!value || value.trim() === "" || value.trim() === "*") {
    return "*";
  }

  const entries = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (entries.length === 0) {
    return "*";
  }

  return entries.length === 1 ? entries[0] : entries;
};
