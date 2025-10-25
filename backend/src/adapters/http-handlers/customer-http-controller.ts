import { BaseHttpController, type HttpRouteDefinition, type HttpReply } from "./base-http-handler";
import type { CreateCustomerUseCase } from "../../application/usecases/create-customer";
import type { GetCustomerUseCase } from "../../application/usecases/get-customer";
import type { ListCustomersUseCase } from "../../application/usecases/list-customers";
import type { UpdateCustomerUseCase } from "../../application/usecases/update-customer";
import type { DeleteCustomerUseCase } from "../../application/usecases/delete-customer";
import type { ListCustomersWithBookingsUseCase } from "../../application/usecases/list-customers-with-bookings";
import type { BaseLogger } from "../logger/base-logger";
import { NotFoundError, ValidationError } from "../../application/errors";
import { sendProblem } from "./problem-details";

type CreateCustomerBody = {
  name?: string;
  email?: string;
};

type UpdateCustomerBody = {
  name?: string;
  email?: string;
};

type Dependencies = {
  createCustomer: CreateCustomerUseCase;
  getCustomer: GetCustomerUseCase;
  listCustomers: ListCustomersUseCase;
  listCustomersWithBookings: ListCustomersWithBookingsUseCase;
  updateCustomer: UpdateCustomerUseCase;
  deleteCustomer: DeleteCustomerUseCase;
  logger: BaseLogger;
};

export class CustomerHttpController extends BaseHttpController {
  constructor(private readonly deps: Dependencies) {
    super();
  }

  routes(): HttpRouteDefinition[] {
    return [
      {
        method: "POST",
        path: "/customers",
        summary: "Create customer",
        handler: async ({ request, reply }) => {
          const body = (request.body ?? {}) as CreateCustomerBody;

          try {
            const customer = await this.deps.createCustomer.execute({
              name: body.name ?? "",
              email: body.email
            });

            this.deps.logger.info("Created customer", { customerId: customer.id });
            reply.status(201).json(customer);
          } catch (error) {
            this.handleError(error, reply, "POST /customers");
          }
        }
      },
      {
        method: "GET",
        path: "/customers",
        summary: "List customers",
        handler: async ({ request, reply }) => {
          const query = (request.query ?? {}) as Record<string, unknown>;

          try {
            const include = typeof query.include === "string" ? query.include.split(",") : [];
            const baseFilters = {
              name: typeof query.name === "string" ? query.name : undefined,
              email: typeof query.email === "string" ? query.email : undefined,
              page: typeof query.page === "string" ? Number(query.page) : undefined,
              pageSize: typeof query.pageSize === "string" ? Number(query.pageSize) : undefined
            };

            if (include.includes("bookings")) {
              const result = await this.deps.listCustomersWithBookings.execute(baseFilters);
              reply.json(result);
              return;
            }

            const customers = await this.deps.listCustomers.execute(baseFilters);

            reply.json(customers);
          } catch (error) {
            this.handleError(error, reply, "GET /customers");
          }
        }
      },
      {
        method: "GET",
        path: "/customers/:id",
        summary: "Get customer",
        handler: async ({ request, reply }) => {
          const { id } = (request.params ?? {}) as { id?: string };
          if (!id) {
            sendProblem(reply, 400, "Invalid request", { detail: "id is required" });
            return;
          }

          try {
            const customer = await this.deps.getCustomer.execute({ id });
            reply.json(customer);
          } catch (error) {
            this.handleError(error, reply, "GET /customers/:id");
          }
        }
      },
      {
        method: "PATCH",
        path: "/customers/:id",
        summary: "Update customer",
        handler: async ({ request, reply }) => {
          const { id } = (request.params ?? {}) as { id?: string };
          if (!id) {
            sendProblem(reply, 400, "Invalid request", { detail: "id is required" });
            return;
          }

          const body = (request.body ?? {}) as UpdateCustomerBody;

          try {
            const customer = await this.deps.updateCustomer.execute({
              id,
              name: body.name,
              email: body.email
            });

            reply.json(customer);
          } catch (error) {
            this.handleError(error, reply, "PATCH /customers/:id");
          }
        }
      },
      {
        method: "DELETE",
        path: "/customers/:id",
        summary: "Delete customer",
        handler: async ({ request, reply }) => {
          const { id } = (request.params ?? {}) as { id?: string };
          if (!id) {
            sendProblem(reply, 400, "Invalid request", { detail: "id is required" });
            return;
          }

          try {
            await this.deps.deleteCustomer.execute({ id });
            reply.noContent();
          } catch (error) {
            this.handleError(error, reply, "DELETE /customers/:id");
          }
        }
      }
    ];
  }

  private handleError(error: unknown, reply: HttpReply, route: string): void {
    this.deps.logger.error(error, { route });

    if (error instanceof ValidationError) {
      sendProblem(reply, 400, "Invalid request", { detail: error.message });
      return;
    }

    if (error instanceof NotFoundError) {
      sendProblem(reply, 404, "Resource not found", { detail: error.message });
      return;
    }

    sendProblem(reply, 500, "Internal server error");
  }
}
