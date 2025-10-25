import { randomUUID } from "node:crypto";
import type { Collection, Document, WithId } from "mongodb";
import { Booking, type BookingAttributes, type BookingStatus } from "../../../domain/booking/booking-entity";
import type { BookingRepository } from "../../../domain/booking/booking-repository";

type BookingDocument = {
  _id: string;
  id: string;
  customerId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  status: BookingStatus;
};

export class MongoBookingRepository implements BookingRepository {
  constructor(private readonly collection: Collection<BookingDocument>) {}

  async findOneById({ id }: { id: string }): Promise<Booking | null> {
    const doc = await this.collection.findOne({ id });
    return doc ? this.toEntity(doc) : null;
  }

  async findMany(params: Partial<BookingAttributes>): Promise<Booking[]> {
    const filter = this.buildFilter(params);
    const docs = await this.collection.find(filter).toArray();
    return docs.map((doc) => this.toEntity(doc));
  }

  async findManyByCustomerIds({ customerIds }: { customerIds: string[] }): Promise<Booking[]> {
    if (customerIds.length === 0) {
      return [];
    }

    const docs = await this.collection.find({ customerId: { $in: customerIds } }).toArray();
    return docs.map((doc) => this.toEntity(doc));
  }

  async create(params: BookingAttributes): Promise<Booking> {
    const id = params.id ?? randomUUID();

    const doc: BookingDocument = {
      _id: id,
      id,
      customerId: params.customerId,
      roomId: params.roomId,
      startDate: params.startDate,
      endDate: params.endDate,
      status: params.status
    };

    await this.collection.insertOne(doc);

    return this.toEntity(doc);
  }

  async updateById({
    id,
    payload
  }: {
    id: string;
    payload: Partial<BookingAttributes>;
  }): Promise<Booking | null> {
    const update: Partial<BookingDocument> = {};

    if (payload.customerId !== undefined) {
      update.customerId = payload.customerId;
    }

    if (payload.roomId !== undefined) {
      update.roomId = payload.roomId;
    }

    if (payload.startDate !== undefined) {
      update.startDate = payload.startDate;
    }

    if (payload.endDate !== undefined) {
      update.endDate = payload.endDate;
    }

    if (payload.status !== undefined) {
      update.status = payload.status;
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

    const doc = (result as { value?: BookingDocument | null } | null)?.value ?? null;
    return doc ? this.toEntity(doc) : null;
  }

  async deleteById({ id }: { id: string }): Promise<void> {
    await this.collection.deleteOne({ id });
  }

  private buildFilter(params: Partial<BookingAttributes>): Document {
    const filter: Document = {};

    if (typeof params.id === "string") {
      filter.id = params.id;
    }

    if (typeof params.customerId === "string") {
      filter.customerId = params.customerId;
    }

    if (typeof params.roomId === "string") {
      filter.roomId = params.roomId;
    }

    if (params.status === "pending" || params.status === "confirmed" || params.status === "cancelled") {
      filter.status = params.status;
    }

    if (typeof params.startDate === "string") {
      filter.startDate = params.startDate;
    }

    if (typeof params.endDate === "string") {
      filter.endDate = params.endDate;
    }

    return filter;
  }

  private toEntity(doc: WithId<BookingDocument>): Booking {
    return new Booking({
      id: doc.id,
      customerId: doc.customerId,
      roomId: doc.roomId,
      startDate: doc.startDate,
      endDate: doc.endDate,
      status: doc.status
    });
  }
}
