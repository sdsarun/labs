import type { UseCase } from "../types/usecase";
import type { UnitOfWork } from "../types/unit-of-work";
import type { BookingAttributes, BookingStatus } from "../../domain/booking/booking-entity";
import { NotFoundError, ValidationError } from "../errors";

export type UpdateBookingInput = {
  id: string;
  customerId?: string;
  roomId?: string;
  startDate?: string;
  endDate?: string;
  status?: BookingStatus;
};

export type UpdateBookingOutput = BookingAttributes;

export class UpdateBookingUseCase implements UseCase<UpdateBookingInput, UpdateBookingOutput> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: UpdateBookingInput): Promise<UpdateBookingOutput> {
    if (input.status && !isValidStatus(input.status)) {
      throw new ValidationError(`Invalid booking status: ${input.status}`);
    }

    return this.unitOfWork.run(async ({ bookings, customers, rooms }) => {
      const existing = await bookings.findOneById({ id: input.id });
      if (!existing) {
        throw new NotFoundError(`Booking with id "${input.id}" not found.`);
      }

      const original = existing.toJSON();

      if (input.customerId) {
        const customer = await customers.findOneById({ id: input.customerId });
        if (!customer) {
          throw new NotFoundError(`Customer with id "${input.customerId}" not found.`);
        }
      }

      if (input.roomId) {
        const room = await rooms.findOneById({ id: input.roomId });
        if (!room) {
          throw new NotFoundError(`Room with id "${input.roomId}" not found.`);
        }
      }

      const nextStart = input.startDate ?? original.startDate;
      const nextEnd = input.endDate ?? original.endDate;

      const startTimestamp = parseDate(nextStart, "startDate");
      const endTimestamp = parseDate(nextEnd, "endDate");

      if (startTimestamp > endTimestamp) {
        throw new ValidationError("startDate must be before or equal to endDate.");
      }

      const payload: Partial<BookingAttributes> = {};

      if (input.customerId) {
        payload.customerId = input.customerId;
      }

      if (input.roomId) {
        payload.roomId = input.roomId;
      }

      if (input.startDate) {
        payload.startDate = input.startDate;
      }

      if (input.endDate) {
        payload.endDate = input.endDate;
      }

      if (input.status) {
        payload.status = input.status;
      }

      const updated = await bookings.updateById({ id: input.id, payload });
      if (!updated) {
        throw new NotFoundError(`Booking with id "${input.id}" not found.`);
      }

      return updated.toJSON();
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

function isValidStatus(value: BookingStatus): boolean {
  return value === "pending" || value === "confirmed" || value === "cancelled";
}
