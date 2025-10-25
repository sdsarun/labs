import { randomUUID } from "node:crypto";
import type { UseCase } from "../types/usecase";
import type { UnitOfWork } from "../types/unit-of-work";
import type { RoomAttributes, RoomType } from "../../domain/room/room-entity";
import { ValidationError } from "../errors";

export type CreateRoomInput = {
  name: string;
  capacity: number;
  type: RoomType;
};

export type CreateRoomOutput = RoomAttributes;

export class CreateRoomUseCase implements UseCase<CreateRoomInput, CreateRoomOutput> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: CreateRoomInput): Promise<CreateRoomOutput> {
    const name = input.name?.trim();
    if (!name) {
      throw new ValidationError("Room name is required.");
    }

    const capacity = Number(input.capacity);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      throw new ValidationError("Room capacity must be a positive number.");
    }

    if (!isValidRoomType(input.type)) {
      throw new ValidationError(`Invalid room type: ${input.type}`);
    }

    return this.unitOfWork.run(async ({ rooms }) => {
      const room = await rooms.create({
        id: randomUUID(),
        name,
        capacity,
        type: input.type,
      });

      return room.toJSON();
    });
  }
}

function isValidRoomType(type: unknown): type is RoomType {
  return type === "standard" || type === "deluxe" || type === "suite";
}
