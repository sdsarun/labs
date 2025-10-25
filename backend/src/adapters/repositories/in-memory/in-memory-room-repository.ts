import { randomUUID } from "node:crypto";
import { Room, type RoomAttributes } from "../../../domain/room/room-entity";
import type { RoomRepository } from "../../../domain/room/room-repository";

export class InMemoryRoomRepository implements RoomRepository {
  private rooms: Room[] = [];

  async findOneById({ id }: { id: string }): Promise<Room | null> {
    return this.rooms.find((room) => room.id === id) ?? null;
  }

  async findMany(params: Record<string, unknown>): Promise<Room[]> {
    if (!params || Object.keys(params).length === 0) {
      return [...this.rooms];
    }

    return this.rooms.filter((room) => {
      const attributes = room.toJSON();
      return Object.entries(params).every(([key, expected]) => {
        if (expected === undefined) {
          return true;
        }

        return (attributes as Record<string, unknown>)[key] === expected;
      });
    });
  }

  async findByIds({ ids }: { ids: string[] }): Promise<Room[]> {
    if (ids.length === 0) {
      return [];
    }

    const set = new Set(ids);
    return this.rooms.filter((room) => set.has(room.id));
  }

  async updateById({
    id,
    payload,
  }: {
    id: string;
    payload: Partial<RoomAttributes>;
  }): Promise<Room | null> {
    const room = await this.findOneById({ id });
    if (!room) {
      return null;
    }

    const updates = this.extractAttributes(payload);
    if (Object.keys(updates).length > 0) {
      room.update(updates);
    }

    return room;
  }

  async deleteById({ id }: { id: string }): Promise<void> {
    this.rooms = this.rooms.filter((room) => room.id !== id);
  }

  async create(params: Partial<RoomAttributes>): Promise<Room> {
    const attributes = this.extractAttributes(params);
    const id = attributes.id ?? randomUUID();

    if (!attributes.name) {
      throw new Error("Room name is required.");
    }

    if (typeof attributes.capacity !== "number" || Number.isNaN(attributes.capacity)) {
      throw new Error("Room capacity is required and must be a number.");
    }

    if (!attributes.type) {
      throw new Error("Room type is required.");
    }

    if (this.rooms.some((room) => room.id === id)) {
      throw new Error(`Room with id "${id}" already exists.`);
    }

    const room = new Room({
      id,
      name: attributes.name,
      capacity: attributes.capacity,
      type: attributes.type,
    });

    this.rooms.push(room);

    return room;
  }

  private extractAttributes(
    source: Partial<RoomAttributes> | Room,
  ): Partial<RoomAttributes> {
    if (source instanceof Room) {
      return source.toJSON();
    }

    const record = source as Record<string, unknown>;
    const attributes: Partial<RoomAttributes> = {};

    if (typeof record.id === "string") {
      attributes.id = record.id;
    }

    if (typeof record.name === "string") {
      attributes.name = record.name;
    }

    if (typeof record.capacity === "number" && !Number.isNaN(record.capacity)) {
      attributes.capacity = record.capacity;
    }

    if (record.type === "standard" || record.type === "deluxe" || record.type === "suite") {
      attributes.type = record.type;
    }

    return attributes;
  }

  exportData(): RoomAttributes[] {
    return this.rooms.map((room) => room.toJSON());
  }

  importData(data: RoomAttributes[]): void {
    this.rooms = data.map((attributes) => new Room(attributes));
  }
}
