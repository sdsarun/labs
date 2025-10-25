import type { UseCase } from "../types/usecase";
import type { UnitOfWork } from "../types/unit-of-work";
import type { RoomAttributes, RoomType } from "../../domain/room/room-entity";
import { NotFoundError, ValidationError } from "../errors";

export type UpdateRoomInput = {
  id: string;
  name?: string;
  capacity?: number;
  type?: RoomType;
};

export type UpdateRoomOutput = RoomAttributes;

export class UpdateRoomUseCase implements UseCase<UpdateRoomInput, UpdateRoomOutput> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: UpdateRoomInput): Promise<UpdateRoomOutput> {
    if (input.name !== undefined && input.name.trim().length === 0) {
      throw new ValidationError("name, if provided, cannot be empty");
    }

    if (input.capacity !== undefined && (!Number.isFinite(input.capacity) || input.capacity <= 0)) {
      throw new ValidationError("capacity, if provided, must be a positive number");
    }

    if (input.type !== undefined && !isValidRoomType(input.type)) {
      throw new ValidationError(`Invalid room type: ${input.type}`);
    }

    return this.unitOfWork.run(async ({ rooms }) => {
      const record = await rooms.updateById({
        id: input.id,
        payload: {
          name: input.name?.trim(),
          capacity: input.capacity,
          type: input.type,
        },
      });

      if (!record) {
        throw new NotFoundError(`Room with id "${input.id}" not found.`);
      }

      return record.toJSON();
    });
  }
}

function isValidRoomType(type: RoomType): boolean {
  return type === "standard" || type === "deluxe" || type === "suite";
}
