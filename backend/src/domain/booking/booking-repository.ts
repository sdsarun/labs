import { Booking, type BookingAttributes } from "./booking-entity";

export interface BookingRepository {
  findOneById(params: { id: string }): Promise<Booking | null>;
  findMany(params: Partial<BookingAttributes>): Promise<Booking[]>;
  findManyByCustomerIds(params: { customerIds: string[] }): Promise<Booking[]>;
  create(params: BookingAttributes): Promise<Booking>;
  updateById(params: {
    id: string;
    payload: Partial<BookingAttributes>;
  }): Promise<Booking | null>;
  deleteById(params: { id: string }): Promise<void>;
}
