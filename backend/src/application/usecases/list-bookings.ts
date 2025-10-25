import type { UseCase } from "../types/usecase";
import type { UnitOfWork } from "../types/unit-of-work";
import type { BookingAttributes, BookingStatus } from "../../domain/booking/booking-entity";

export type ListBookingsInput = {
  customerId?: string;
  roomId?: string;
  status?: BookingStatus;
};

export type ListBookingsOutput = BookingAttributes[];

export class ListBookingsUseCase implements UseCase<ListBookingsInput, ListBookingsOutput> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: ListBookingsInput): Promise<ListBookingsOutput> {
    return this.unitOfWork.run(async ({ bookings }) => {
      const filters: Partial<BookingAttributes> = {};

      if (input.customerId) {
        filters.customerId = input.customerId;
      }

      if (input.roomId) {
        filters.roomId = input.roomId;
      }

      if (input.status) {
        filters.status = input.status;
      }

      const records = await bookings.findMany(filters);
      return records.map((booking) => booking.toJSON());
    });
  }
}
