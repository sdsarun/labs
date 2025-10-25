import type { LogLevel } from "../adapters/logger/base-logger";

export type HttpDriver = "fastify" | "express";
export type DataDriver = "prisma" | "memory";

export interface AppConfig {
  logLevel: LogLevel;
  httpDriver: HttpDriver;
  dataDriver: DataDriver;
  host: string;
  port: number;
  startServer: boolean;
}

export function loadConfigFromEnv(env: NodeJS.ProcessEnv): AppConfig {
  const httpDriver = (env.HTTP_DRIVER ?? "fastify").toLowerCase() as HttpDriver;
  const dataDriver = (env.DATA_DRIVER ?? "prisma").toLowerCase() as DataDriver;

  return {
    logLevel: (env.LOG_LEVEL ?? "info") as LogLevel,
    httpDriver: httpDriver === "express" ? "express" : "fastify",
    dataDriver: dataDriver === "memory" ? "memory" : "prisma",
    host: env.HTTP_HOST ?? "0.0.0.0",
    port: Number(env.HTTP_PORT ?? 4001),
    startServer: env.START_HTTP_SERVER === "true"
  };
}
