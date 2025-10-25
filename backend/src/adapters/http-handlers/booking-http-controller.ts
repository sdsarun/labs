import {
  BaseHttpController,
  type HttpReply,
  type HttpRouteDefinition,
} from "./base-http-handler";
import type { CreateBookingUseCase } from "../../application/usecases/create-booking";
import type { GetBookingUseCase } from "../../application/usecases/get-booking";
import type { ListBookingsUseCase } from "../../application/usecases/list-bookings";
import type { UpdateBookingUseCase } from "../../application/usecases/update-booking";
import type { DeleteBookingUseCase } from "../../application/usecases/delete-booking";
import type { BookingStatus } from "../../domain/booking/booking-entity";
import type { BaseLogger } from "../logger/base-logger";
import { NotFoundError, ValidationError } from "../../application/errors";
import { sendProblem } from "./problem-details";

type CreateBookingBody = {
  customerId?: string;
  roomId?: string;
  startDate?: string;
  endDate?: string;
  status?: BookingStatus;
};

type UpdateBookingBody = {
  customerId?: string;
  roomId?: string;
  startDate?: string;
  endDate?: string;
  status?: BookingStatus;
};

type Dependencies = {
  createBooking: CreateBookingUseCase;
  getBooking: GetBookingUseCase;
  listBookings: ListBookingsUseCase;
  updateBooking: UpdateBookingUseCase;
  deleteBooking: DeleteBookingUseCase;
  logger: BaseLogger;
};

export class BookingHttpController extends BaseHttpController {
  constructor(private readonly deps: Dependencies) {
    super();
  }

  routes(): HttpRouteDefinition[] {
    return [
      {
        method: "POST",
        path: "/bookings",
        summary: "Create booking",
        handler: async ({ request, reply }) => {
          const body = (request.body ?? {}) as CreateBookingBody;

          try {
            const booking = await this.deps.createBooking.execute({
              customerId: body.customerId ?? "",
              roomId: body.roomId ?? "",
              startDate: body.startDate ?? "",
              endDate: body.endDate ?? "",
              status: body.status,
            });

            this.deps.logger.info("Created booking", { bookingId: booking.id });
            reply.status(201).json(booking);
          } catch (error) {
            this.handleError(error, reply, "POST /bookings");
          }
        },
      },
      {
        method: "GET",
        path: "/bookings",
        summary: "List bookings",
        handler: async ({ request, reply }) => {
          const query = (request.query ?? {}) as Record<string, unknown>;

          try {
            const bookings = await this.deps.listBookings.execute({
              customerId: typeof query.customerId === "string" ? query.customerId : undefined,
              roomId: typeof query.roomId === "string" ? query.roomId : undefined,
              status: isBookingStatus(query.status) ? query.status : undefined,
            });

            reply.json(bookings);
          } catch (error) {
            this.handleError(error, reply, "GET /bookings");
          }
        },
      },
      {
        method: "GET",
        path: "/bookings/:id",
        summary: "Get booking",
        handler: async ({ request, reply }) => {
          const { id } = (request.params ?? {}) as { id?: string };
          if (!id) {
            sendProblem(reply, 400, "Invalid request", { detail: "id is required" });
            return;
          }

          try {
            const booking = await this.deps.getBooking.execute({ id });
            reply.json(booking);
          } catch (error) {
            this.handleError(error, reply, "GET /bookings/:id");
          }
        },
      },
      {
        method: "PATCH",
        path: "/bookings/:id",
        summary: "Update booking",
        handler: async ({ request, reply }) => {
          const { id } = (request.params ?? {}) as { id?: string };
          if (!id) {
            sendProblem(reply, 400, "Invalid request", { detail: "id is required" });
            return;
          }

          const body = (request.body ?? {}) as UpdateBookingBody;

          try {
            const booking = await this.deps.updateBooking.execute({
              id,
              customerId: body.customerId,
              roomId: body.roomId,
              startDate: body.startDate,
              endDate: body.endDate,
              status: body.status,
            });

            reply.json(booking);
          } catch (error) {
            this.handleError(error, reply, "PATCH /bookings/:id");
          }
        },
      },
      {
        method: "DELETE",
        path: "/bookings/:id",
        summary: "Delete booking",
        handler: async ({ request, reply }) => {
          const { id } = (request.params ?? {}) as { id?: string };
          if (!id) {
            sendProblem(reply, 400, "Invalid request", { detail: "id is required" });
            return;
          }

          try {
            await this.deps.deleteBooking.execute({ id });
            reply.noContent();
          } catch (error) {
            this.handleError(error, reply, "DELETE /bookings/:id");
          }
        },
      },
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

function isBookingStatus(value: unknown): value is BookingStatus {
  return value === "pending" || value === "confirmed" || value === "cancelled";
}
