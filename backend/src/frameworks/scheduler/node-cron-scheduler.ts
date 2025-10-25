import cron, { type ScheduledTask } from "node-cron";
import type { BaseLogger } from "../../adapters/logger/base-logger";
import type { ScheduledJob, Scheduler, ScheduleOptions } from "./scheduler";

type ManagedTask = {
  task: ScheduledTask;
  name?: string;
};

export class NodeCronScheduler implements Scheduler {
  private readonly tasks: Set<ManagedTask> = new Set();

  constructor(private readonly logger: BaseLogger, private readonly timezone?: string) {}

  schedule(
    cronExpression: string,
    job: () => Promise<void> | void,
    options?: ScheduleOptions
  ): ScheduledJob {
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    const managedTask: ManagedTask = {
      task: cron.schedule(
        cronExpression,
        () => {
          void this.execute(job, options?.name);
        },
        {
          timezone: options?.timezone ?? this.timezone
        }
      ),
      name: options?.name
    };

    this.tasks.add(managedTask);

    if (options?.runOnInit) {
      void this.execute(job, options.name);
    }

    return {
      stop: () => {
        managedTask.task.stop();
        managedTask.task.destroy();
        this.tasks.delete(managedTask);
      }
    };
  }

  async shutdown(): Promise<void> {
    for (const managed of this.tasks) {
      managed.task.stop();
      managed.task.destroy();
      this.logger.debug("Stopped cron task", { name: managed.name });
    }
    this.tasks.clear();
  }

  private async execute(job: () => Promise<void> | void, name?: string): Promise<void> {
    try {
      await job();
    } catch (error) {
      this.logger.error(error, {
        context: "cron-task",
        taskName: name ?? "anonymous"
      });
    }
  }
}
