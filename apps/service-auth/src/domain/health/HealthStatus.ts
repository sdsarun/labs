export type HealthLevel = "ok" | "degraded" | "critical";

export interface HealthStatus {
  readonly service: string;
  readonly status: HealthLevel;
  readonly version: string;
  readonly timestamp: string;
  readonly checks: Array<{
    name: string;
    status: HealthLevel;
    detail?: string;
  }>;
}
