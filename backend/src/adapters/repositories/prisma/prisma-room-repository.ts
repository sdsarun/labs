import { Prisma, PrismaClient } from "../../../../generated/prisma/client";
import type { Room as PrismaRoom } from "../../../../generated/prisma/client";
import type { RoomType as PrismaRoomType } from "../../../../generated/prisma/enums";
import { Room, type RoomAttributes } from "../../../domain/room/room-entity";
import { RoomRepository } from "../../../domain/room/room-repository";

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

export class PrismaRoomRepository extends RoomRepository {
  constructor(private readonly prisma: PrismaClientLike) {
    super();
  }

  async findOneById({ id }: { id: string }): Promise<Room | null> {
    const record = await this.prisma.room.findUnique({
      where: { id },
    });

    if (!record || record.deletedAt) {
      return null;
    }

    return this.toEntity(record);
  }

  async findMany(params: Record<string, unknown>): Promise<Room[]> {
    const where = this.buildWhere(params);
    const records = await this.prisma.room.findMany({ where });
    return records.map((record) => this.toEntity(record));
  }

  async findByIds({ ids }: { ids: string[] }): Promise<Room[]> {
    if (ids.length === 0) {
      return [];
    }

    const records = await this.prisma.room.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
    });

    return records.map((record) => this.toEntity(record));
  }

  async updateById({
    id,
    payload,
  }: {
    id: string;
    payload: Partial<RoomAttributes>;
  }): Promise<Room | null> {
    try {
      const record = await this.prisma.room.update({
        where: { id },
        data: this.mapUpdateData(payload),
      });

      return record.deletedAt ? null : this.toEntity(record);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  async deleteById({ id }: { id: string }): Promise<void> {
    await this.prisma.room.delete({ where: { id } });
  }

  async create(params: Partial<RoomAttributes>): Promise<Room> {
    if (!params.name) {
      throw new Error("Room name is required.");
    }

    if (typeof params.capacity !== "number") {
      throw new Error("Room capacity is required.");
    }

    if (!params.type) {
      throw new Error("Room type is required.");
    }

    const record = await this.prisma.room.create({
      data: {
        id: params.id,
        name: params.name,
        capacity: params.capacity,
        type: params.type,
      },
    });

    return this.toEntity(record);
  }

  private toEntity(record: PrismaRoom): Room {
    return new Room({
      id: record.id,
      name: record.name,
      capacity: record.capacity,
      type: record.type,
    });
  }

  private mapUpdateData(payload: Partial<RoomAttributes>): Prisma.RoomUpdateInput {
    const data: Prisma.RoomUpdateInput = {};

    if (payload.name !== undefined) {
      data.name = payload.name;
    }

    if (payload.capacity !== undefined) {
      data.capacity = payload.capacity;
    }

    if (payload.type !== undefined) {
      data.type = payload.type as PrismaRoomType;
    }

    return data;
  }

  private buildWhere(params: Record<string, unknown>): Prisma.RoomWhereInput {
    const where: Prisma.RoomWhereInput = {
      deletedAt: null,
    };

    if (typeof params.id === "string") {
      where.id = params.id;
    }

    if (typeof params.name === "string") {
      where.name = params.name;
    }

    if (typeof params.capacity === "number") {
      where.capacity = params.capacity;
    }

    if (typeof params.type === "string") {
      where.type = params.type as PrismaRoomType;
    }

    return where;
  }
}

function isNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}
