import { randomUUID } from "node:crypto";
import type { Collection, Document, WithId } from "mongodb";
import { Room, type RoomAttributes, type RoomType } from "../../../domain/room/room-entity";
import type { RoomRepository } from "../../../domain/room/room-repository";

type RoomDocument = {
  _id: string;
  id: string;
  name: string;
  capacity: number;
  type: RoomType;
};

export class MongoRoomRepository implements RoomRepository {
  constructor(private readonly collection: Collection<RoomDocument>) {}

  async findOneById({ id }: { id: string }): Promise<Room | null> {
    const doc = await this.collection.findOne({ id });
    return doc ? this.toEntity(doc) : null;
  }

  async findMany(params: Record<string, unknown>): Promise<Room[]> {
    const filter = this.buildFilter(params);
    const docs = await this.collection.find(filter).toArray();
    return docs.map((doc) => this.toEntity(doc));
  }

  async findByIds({ ids }: { ids: string[] }): Promise<Room[]> {
    if (ids.length === 0) {
      return [];
    }

    const docs = await this.collection.find({ id: { $in: ids } }).toArray();
    return docs.map((doc) => this.toEntity(doc));
  }

  async updateById({
    id,
    payload
  }: {
    id: string;
    payload: Partial<RoomAttributes>;
  }): Promise<Room | null> {
    const update: Partial<RoomDocument> = {};

    if (payload.name !== undefined) {
      update.name = payload.name;
    }

    if (payload.capacity !== undefined) {
      update.capacity = payload.capacity;
    }

    if (payload.type !== undefined) {
      update.type = payload.type;
    }

    if (Object.keys(update).length === 0) {
      const current = await this.collection.findOne({ id });
      return current ? this.toEntity(current) : null;
    }

    const result = await this.collection.findOneAndUpdate(
      { id },
      { $set: update },
      { returnDocument: "after" }
    );

    const doc = (result as { value?: RoomDocument | null } | null)?.value ?? null;
    return doc ? this.toEntity(doc) : null;
  }

  async deleteById({ id }: { id: string }): Promise<void> {
    await this.collection.deleteOne({ id });
  }

  async create(params: Partial<RoomAttributes>): Promise<Room> {
    const name = params.name?.trim();
    if (!name) {
      throw new Error("Room name is required.");
    }

    const capacity = params.capacity;
    if (!Number.isFinite(capacity) || (typeof capacity === "number" && capacity <= 0)) {
      throw new Error("Room capacity must be a positive number.");
    }

    if (!params.type) {
      throw new Error("Room type is required.");
    }

    const id = params.id ?? randomUUID();

    const doc: RoomDocument = {
      _id: id,
      id,
      name,
      capacity: capacity as number,
      type: params.type
    };

    await this.collection.insertOne(doc);

    return this.toEntity(doc);
  }

  private buildFilter(params: Record<string, unknown>): Document {
    const filter: Document = {};

    if (typeof params.id === "string") {
      filter.id = params.id;
    }

    if (typeof params.name === "string") {
      filter.name = params.name;
    }

    if (params.type === "standard" || params.type === "deluxe" || params.type === "suite") {
      filter.type = params.type;
    }

    return filter;
  }

  private toEntity(doc: WithId<RoomDocument>): Room {
    return new Room({
      id: doc.id,
      name: doc.name,
      capacity: doc.capacity,
      type: doc.type
    });
  }
}
