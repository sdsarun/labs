import type { UseCase } from "../types/usecase";
import type { UnitOfWork } from "../types/unit-of-work";
import type { RoomAttributes, RoomType } from "../../domain/room/room-entity";

export type ListRoomsInput = {
  name?: string;
  type?: RoomType;
};

export type ListRoomsOutput = RoomAttributes[];

export class ListRoomsUseCase implements UseCase<ListRoomsInput, ListRoomsOutput> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: ListRoomsInput): Promise<ListRoomsOutput> {
    return this.unitOfWork.run(async ({ rooms }) => {
      const filters: Record<string, unknown> = {};

      if (input.name) {
        filters.name = input.name;
      }

      if (input.type) {
        filters.type = input.type;
      }

      const records = await rooms.findMany(filters);
      return records.map((room) => room.toJSON());
    });
  }
}
