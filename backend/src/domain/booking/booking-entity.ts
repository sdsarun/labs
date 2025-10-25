import { Entity } from "../base/base-entity";

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type BookingAttributes = {
  id: string;
  customerId: string;
  roomId: string;
  /**
   * YYYY-MM-DD
   */
  startDate: string;
  /**
   * YYYY-MM-DD
   */
  endDate: string;
  status: BookingStatus;
}

export class Booking extends Entity<BookingAttributes> {}
