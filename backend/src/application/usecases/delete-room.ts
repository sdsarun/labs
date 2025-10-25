import type { UseCase } from "../types/usecase";
import type { UnitOfWork } from "../types/unit-of-work";
import { NotFoundError } from "../errors";

export type DeleteRoomInput = { id: string };

export class DeleteRoomUseCase implements UseCase<DeleteRoomInput, void> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: DeleteRoomInput): Promise<void> {
    await this.unitOfWork.run(async ({ rooms }) => {
      const existing = await rooms.findOneById({ id: input.id });
      if (!existing) {
        throw new NotFoundError(`Room with id "${input.id}" not found.`);
      }

      await rooms.deleteById({ id: input.id });
    });
  }
}
