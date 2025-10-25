import type { UseCase } from "../types/usecase";
import type { UnitOfWork } from "../types/unit-of-work";
import type { RoomAttributes } from "../../domain/room/room-entity";
import { NotFoundError } from "../errors";

export type GetRoomInput = { id: string };
export type GetRoomOutput = RoomAttributes;

export class GetRoomUseCase implements UseCase<GetRoomInput, GetRoomOutput> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: GetRoomInput): Promise<GetRoomOutput> {
    return this.unitOfWork.run(async ({ rooms }) => {
      const room = await rooms.findOneById({ id: input.id });
      if (!room) {
        throw new NotFoundError(`Room with id "${input.id}" not found.`);
      }

      return room.toJSON();
    });
  }
}
