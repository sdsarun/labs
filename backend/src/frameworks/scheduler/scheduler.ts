export type ScheduleOptions = {
  name?: string;
  timezone?: string;
  runOnInit?: boolean;
};

export interface ScheduledJob {
  stop(): void;
}

export interface Scheduler {
  schedule(cronExpression: string, task: () => Promise<void> | void, options?: ScheduleOptions): ScheduledJob;
  shutdown(): Promise<void>;
}
