import { Booking, type BookingAttributes } from "./booking-entity";

export abstract class BookingRepository {
  abstract findOneById(params: { id: string }): Promise<Booking | null>;
  abstract findMany(params: Partial<BookingAttributes>): Promise<Booking[]>;
  abstract findManyByCustomerIds(params: { customerIds: string[] }): Promise<Booking[]>;
  abstract create(params: BookingAttributes): Promise<Booking>;
  abstract updateById(params: {
    id: string;
    payload: Partial<BookingAttributes>;
  }): Promise<Booking | null>;
  abstract deleteById(params: { id: string }): Promise<void>;
}
