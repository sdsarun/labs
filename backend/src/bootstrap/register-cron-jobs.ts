import type { Scheduler } from "../frameworks/scheduler/scheduler";
import type { BaseLogger } from "../adapters/logger/base-logger";
import type { ListCustomersUseCase } from "../application/usecases/list-customers";
import type { ListBookingsUseCase } from "../application/usecases/list-bookings";
import type { AppConfig } from "../config/app-config";

type Dependencies = {
  scheduler: Scheduler;
  logger: BaseLogger;
  listCustomers: ListCustomersUseCase;
  listBookings: ListBookingsUseCase;
  config: AppConfig;
};

export function registerCronJobs({
  scheduler,
  logger,
  listCustomers,
  listBookings,
  config
}: Dependencies): void {
  if (!config.enableCronJobs) {
    logger.debug("Cron jobs disabled via configuration");
    return;
  }

  const expression = config.customerMetricsCron ?? "1 * * * *";

  scheduler.schedule(
    expression,
    async () => {
      const customers = await listCustomers.execute({ page: 1, pageSize: 1 });
      const bookings = await listBookings.execute({});
      logger.info("Cron metrics snapshot", {
        totalCustomers: customers.total,
        totalBookings: bookings.length
      });
    },
    {
      name: "customer-booking-metrics",
      timezone: config.cronTimezone,
      runOnInit: false
    }
  );

  logger.info("Registered cron jobs", {
    expression,
    timezone: config.cronTimezone ?? "system"
  });
}
