import type { UseCase } from "../types/usecase";
import type { UnitOfWork } from "../types/unit-of-work";
import { NotFoundError } from "../errors";

export type DeleteBookingInput = { id: string };

export class DeleteBookingUseCase implements UseCase<DeleteBookingInput, void> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: DeleteBookingInput): Promise<void> {
    await this.unitOfWork.run(async ({ bookings }) => {
      const existing = await bookings.findOneById({ id: input.id });
      if (!existing) {
        throw new NotFoundError(`Booking with id "${input.id}" not found.`);
      }

      await bookings.deleteById({ id: input.id });
    });
  }
}
