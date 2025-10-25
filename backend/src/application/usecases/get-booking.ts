import type { UseCase } from "../types/usecase";
import type { UnitOfWork } from "../types/unit-of-work";
import type { BookingAttributes } from "../../domain/booking/booking-entity";
import { NotFoundError } from "../errors";

export type GetBookingInput = { id: string };
export type GetBookingOutput = BookingAttributes;

export class GetBookingUseCase implements UseCase<GetBookingInput, GetBookingOutput> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: GetBookingInput): Promise<GetBookingOutput> {
    return this.unitOfWork.run(async ({ bookings }) => {
      const booking = await bookings.findOneById({ id: input.id });
      if (!booking) {
        throw new NotFoundError(`Booking with id "${input.id}" not found.`);
      }

      return booking.toJSON();
    });
  }
}
