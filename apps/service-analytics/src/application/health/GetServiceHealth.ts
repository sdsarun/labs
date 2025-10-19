import { HealthLevel, HealthStatus } from "../../domain/health/HealthStatus";

export interface HealthProbe {
  name: string;
  check(): Promise<{ status: HealthLevel; detail?: string }>;
}

export interface GetServiceHealthOptions {
  serviceName: string;
  version: string;
  probes?: HealthProbe[];
}

export class GetServiceHealth {
  private readonly probes: HealthProbe[];

  constructor(private readonly options: GetServiceHealthOptions) {
    this.probes = options.probes ?? [];
  }

  async execute(): Promise<HealthStatus> {
    const results = await Promise.all(
      this.probes.map(async (probe) => {
        try {
          return { name: probe.name, ...(await probe.check()) };
        } catch (error) {
          return {
            name: probe.name,
            status: "critical" as const,
            detail: error instanceof Error ? error.message : "Unknown error"
          };
        }
      })
    );

    const aggregate = this.aggregate(results.map((result) => result.status));

    return {
      service: this.options.serviceName,
      status: aggregate,
      version: this.options.version,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }

  private aggregate(statuses: HealthLevel[]): HealthLevel {
    if (statuses.includes("critical")) return "critical";
    if (statuses.includes("degraded")) return "degraded";
    return "ok";
  }
}
