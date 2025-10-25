import type { LogLevel } from "../adapters/logger/base-logger";

export type HttpDriver = "fastify" | "express";
export type DataDriver = "prisma" | "memory" | "mongo";

export interface AppConfig {
  logLevel: LogLevel;
  httpDriver: HttpDriver;
  dataDriver: DataDriver;
  host: string;
  port: number;
  startServer: boolean;
  mongoUrl?: string;
  mongoDbName?: string;
}

export function loadConfigFromEnv(env: NodeJS.ProcessEnv): AppConfig {
  const httpDriver = (env.HTTP_DRIVER ?? "fastify").toLowerCase() as HttpDriver;
  const dataDriverRaw = (env.DATA_DRIVER ?? "prisma").toLowerCase();
  const dataDriver: DataDriver =
    dataDriverRaw === "memory"
      ? "memory"
      : dataDriverRaw === "mongo"
        ? "mongo"
        : "prisma";

  return {
    logLevel: (env.LOG_LEVEL ?? "info") as LogLevel,
    httpDriver: httpDriver === "express" ? "express" : "fastify",
    dataDriver,
    host: env.HTTP_HOST ?? "0.0.0.0",
    port: Number(env.HTTP_PORT ?? 4001),
    startServer: env.START_HTTP_SERVER === "true",
    mongoUrl: env.MONGO_URL ?? "mongodb://127.0.0.1:27017",
    mongoDbName: env.MONGO_DB ?? "labs"
  };
}
