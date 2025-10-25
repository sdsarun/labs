import { randomUUID } from "node:crypto";
import type { UseCase } from "../types/usecase";
import type { UnitOfWork } from "../types/unit-of-work";
import type { BookingAttributes, BookingStatus } from "../../domain/booking/booking-entity";
import { NotFoundError, ValidationError } from "../errors";

export type CreateBookingInput = {
  customerId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  status?: BookingStatus;
};

export type CreateBookingOutput = BookingAttributes;

export class CreateBookingUseCase implements UseCase<CreateBookingInput, CreateBookingOutput> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: CreateBookingInput): Promise<CreateBookingOutput> {
    return this.unitOfWork.run(async ({ bookings, customers, rooms }) => {
      const customer = await customers.findOneById({ id: input.customerId });
      if (!customer) {
        throw new NotFoundError(`Customer with id "${input.customerId}" not found.`);
      }

      const room = await rooms.findOneById({ id: input.roomId });
      if (!room) {
        throw new NotFoundError(`Room with id "${input.roomId}" not found.`);
      }

      const startDate = parseDate(input.startDate, "startDate");
      const endDate = parseDate(input.endDate, "endDate");

      if (startDate > endDate) {
        throw new ValidationError("startDate must be before or equal to endDate.");
      }

      const status = input.status ?? "pending";
      if (!isValidStatus(status)) {
        throw new ValidationError(`Invalid booking status: ${status}`);
      }

      const booking = await bookings.create({
        id: randomUUID(),
        customerId: customer.id,
        roomId: room.id,
        startDate: input.startDate,
        endDate: input.endDate,
        status
      });

      return booking.toJSON();
    });
  }
}

function parseDate(value: string, field: string): number {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be provided as an ISO date string.`);
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new ValidationError(`${field} must be a valid date string.`);
  }

  return timestamp;
}

function isValidStatus(value: unknown): value is BookingStatus {
  return value === "pending" || value === "confirmed" || value === "cancelled";
}
