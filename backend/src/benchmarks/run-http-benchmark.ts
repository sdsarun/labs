import autocannon, {
  type Instance as AutocannonInstance,
  type Options as AutocannonOptions,
  type Result as AutocannonResult
} from "autocannon";
import { loadEnv } from "../utils/env";
import {
  loadConfigFromEnv,
  type AppConfig,
  type DataDriver,
  type HttpDriver
} from "../config/app-config";
import { buildApplication, type BuiltApplication } from "../bootstrap/build-application";

type Scenario = {
  name: string;
  path: string;
  method?: AutocannonOptions["method"];
  body?: string;
  headers?: Record<string, string>;
  connections?: number;
  duration?: number;
  pipelining?: number;
};

type CliOptions = {
  driver?: HttpDriver;
  dataDriver: DataDriver;
  duration: number;
  connections: number;
  pipelining: number;
  warmup: number;
};

type BenchmarkResult = {
  scenario: string;
  result: AutocannonResult;
};

type MinimalFetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

type MinimalFetchResponse = {
  ok: boolean;
  status: number;
};

type MinimalFetch = (input: string, init?: MinimalFetchInit) => Promise<MinimalFetchResponse>;

async function main(): Promise<void> {
  const cli = parseCliArgs(process.argv);

  loadEnv();
  prepareEnv(cli);

  const config = loadConfigFromEnv(process.env);
  const app = await buildApplication(config);

  try {
    const port = await startServer(app, config);
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`[benchmark] server started on ${baseUrl} using ${config.httpDriver}`);

    await seedCustomers(baseUrl);

    const scenarios = createScenarios();
    const results = await runScenarios(baseUrl, scenarios, cli);

    report(results);
  } finally {
    await app.shutdown().catch((error) => {
      console.error("[benchmark] failed to shutdown application", error);
    });
  }
}

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dataDriver: "memory",
    duration: 15,
    connections: 50,
    pipelining: 1,
    warmup: 5
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--driver" && argv[index + 1]) {
      options.driver = parseHttpDriver(argv[++index]);
      continue;
    }

    if (arg === "--data-driver" && argv[index + 1]) {
      options.dataDriver = parseDataDriver(argv[++index]);
      continue;
    }

    if (arg === "--duration" && argv[index + 1]) {
      options.duration = Number(argv[++index]) || options.duration;
      continue;
    }

    if (arg === "--connections" && argv[index + 1]) {
      options.connections = Number(argv[++index]) || options.connections;
      continue;
    }

    if (arg === "--pipelining" && argv[index + 1]) {
      options.pipelining = Number(argv[++index]) || options.pipelining;
      continue;
    }

    if (arg === "--warmup" && argv[index + 1]) {
      options.warmup = Number(argv[++index]) || 0;
      continue;
    }
  }

  return options;
}

function parseHttpDriver(value: string): HttpDriver {
  const driver = value.toLowerCase();
  if (driver === "express") {
    return "express";
  }
  return "fastify";
}

function parseDataDriver(value: string): DataDriver {
  const driver = value.toLowerCase();
  if (driver === "mongo") {
    return "mongo";
  }
  if (driver === "prisma") {
    return "prisma";
  }
  return "memory";
}

function prepareEnv(options: CliOptions): void {
  process.env.DATA_DRIVER = process.env.DATA_DRIVER ?? options.dataDriver;
  process.env.HTTP_DRIVER = options.driver ?? process.env.HTTP_DRIVER ?? "fastify";
  process.env.START_HTTP_SERVER = "false";
  process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "warn";
}

async function startServer(app: BuiltApplication, config: AppConfig): Promise<number> {
  const host = "127.0.0.1";
  await app.server.listen({ host, port: 0 });

  const address = app.server.getRawServer().address();
  if (!address) {
    throw new Error("failed to determine listening address");
  }

  if (typeof address === "object") {
    if (typeof address.port === "number") {
      return address.port;
    }
    throw new Error("unexpected address object without port");
  }

  if (typeof address === "number") {
    return address;
  }

  throw new Error("unsupported address type");
}

async function seedCustomers(baseUrl: string): Promise<void> {
  const customers = [
    { name: "Ada Lovelace", email: "ada@example.com" },
    { name: "Alan Turing", email: "alan@example.com" },
    { name: "Grace Hopper", email: "grace@example.com" }
  ];

  const fetchImpl = (globalThis as { fetch?: MinimalFetch }).fetch;
  if (!fetchImpl) {
    throw new Error("Fetch API is not available in this Node.js runtime.");
  }

  for (const customer of customers) {
    try {
      const response = await fetchImpl(`${baseUrl}/customers`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(customer)
      });

      if (!response.ok && response.status !== 409) {
        console.warn(`[benchmark] failed to seed customer ${customer.name}`, response.status);
      }
    } catch (error) {
      console.warn(`[benchmark] failed to seed customer ${customer.name}`, error);
    }
  }
}

function createScenarios(): Scenario[] {
  return [
    {
      name: "health-check",
      path: "/health"
    },
    {
      name: "list-customers",
      path: "/customers"
    },
    {
      name: "create-customer",
      path: "/customers",
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ name: "Load Test Customer" })
    }
  ];
}

async function runScenarios(
  baseUrl: string,
  scenarios: Scenario[],
  cli: CliOptions
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  for (const scenario of scenarios) {
    const url = new URL(scenario.path, baseUrl).toString();
    const method: AutocannonOptions["method"] = scenario.method ?? "GET";

    const sharedOptions: AutocannonOptions = {
      url,
      method,
      connections: scenario.connections ?? cli.connections,
      duration: scenario.duration ?? cli.duration,
      pipelining: scenario.pipelining ?? cli.pipelining,
      headers: scenario.headers,
      body: scenario.body
    };

    if (cli.warmup > 0) {
      await runAutocannon({
        ...sharedOptions,
        duration: cli.warmup
      });
    }

    console.log(`\n[benchmark] running ${scenario.name}`);
    const result = await runAutocannon(sharedOptions);
    results.push({ scenario: scenario.name, result });
  }

  return results;
}

async function runAutocannon(options: AutocannonOptions): Promise<AutocannonResult> {
  return new Promise<AutocannonResult>((resolve, reject) => {
    const instance: AutocannonInstance = autocannon(options, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });

    instance.once("error", reject);
  });
}

function report(results: BenchmarkResult[]): void {
  console.log("\n[benchmark] results");

  for (const { scenario, result } of results) {
    const { requests, latency, throughput } = result;

    console.log(`\n${scenario}`);
    console.log(`  requests/sec avg: ${requests.average.toFixed(1)}`);
    console.log(`  requests/sec p99: ${requests.p99.toFixed(1)}`);
    console.log(`  latency avg: ${latency.average.toFixed(1)} ms`);
    console.log(`  latency p99: ${latency.p99.toFixed(1)} ms`);
    console.log(`  throughput avg: ${(throughput.average / 1024).toFixed(1)} KiB/s`);
  }
}

void main().catch((error) => {
  console.error("[benchmark] run failed", error);
  process.exitCode = 1;
});
