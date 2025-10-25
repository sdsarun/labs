import { randomUUID } from "node:crypto";
import { Booking, type BookingAttributes, type BookingStatus } from "../../../domain/booking/booking-entity";
import { BookingRepository } from "../../../domain/booking/booking-repository";

export class InMemoryBookingRepository extends BookingRepository {
  private bookings: Booking[] = [];

  async findOneById({ id }: { id: string }): Promise<Booking | null> {
    return this.bookings.find((booking) => booking.toJSON().id === id) ?? null;
  }

  async findMany(params: Partial<BookingAttributes>): Promise<Booking[]> {
    if (!params || Object.keys(params).length === 0) {
      return [...this.bookings];
    }

    return this.bookings.filter((booking) => {
      const attributes = booking.toJSON();
      return Object.entries(params).every(([key, value]) => {
        if (value === undefined) {
          return true;
        }

        return (attributes as Record<string, unknown>)[key] === value;
      });
    });
  }

  async findManyByCustomerIds({ customerIds }: { customerIds: string[] }): Promise<Booking[]> {
    if (customerIds.length === 0) {
      return [];
    }

    const set = new Set(customerIds);
    return this.bookings.filter((booking) => set.has(booking.toJSON().customerId));
  }

  async create(params: BookingAttributes): Promise<Booking> {
    const attributes = this.normalizeAttributes(params);
    const id = attributes.id ?? randomUUID();

    if (this.bookings.some((booking) => booking.toJSON().id === id)) {
      throw new Error(`Booking with id "${id}" already exists.`);
    }

    const booking = new Booking({
      ...attributes,
      id,
    });

    this.bookings.push(booking);
    return booking;
  }

  async updateById({
    id,
    payload,
  }: {
    id: string;
    payload: Partial<BookingAttributes>;
  }): Promise<Booking | null> {
    const booking = await this.findOneById({ id });
    if (!booking) {
      return null;
    }

    const updates = this.normalizeAttributes(payload);
    booking.update(updates);
    return booking;
  }

  async deleteById({ id }: { id: string }): Promise<void> {
    this.bookings = this.bookings.filter((booking) => booking.toJSON().id !== id);
  }

  private normalizeAttributes(
    source: Partial<BookingAttributes>,
  ): Partial<BookingAttributes> {
    const record = source as Record<string, unknown>;
    const attributes: Partial<BookingAttributes> = {};

    if (typeof record.id === "string") {
      attributes.id = record.id;
    }

    if (typeof record.customerId === "string") {
      attributes.customerId = record.customerId;
    }

    if (typeof record.roomId === "string") {
      attributes.roomId = record.roomId;
    }

    if (typeof record.startDate === "string") {
      attributes.startDate = record.startDate;
    }

    if (typeof record.endDate === "string") {
      attributes.endDate = record.endDate;
    }

    if (record.status === "pending" || record.status === "confirmed" || record.status === "cancelled") {
      attributes.status = record.status as BookingStatus;
    }

    return attributes;
  }

  exportData(): BookingAttributes[] {
    return this.bookings.map((booking) => booking.toJSON());
  }

  importData(data: BookingAttributes[]): void {
    this.bookings = data.map((attributes) => new Booking(attributes));
  }
}
