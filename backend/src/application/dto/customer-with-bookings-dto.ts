import type { CustomerAttributes } from "../../domain/customer/customer-entity";
import type { BookingAttributes } from "../../domain/booking/booking-entity";
import type { RoomAttributes } from "../../domain/room/room-entity";

export type CustomerWithBookingsDTO = CustomerAttributes & {
  bookings: Array<{
    booking: BookingAttributes;
    room?: RoomAttributes;
  }>;
};

export type PaginatedCustomersWithBookings = {
  data: CustomerWithBookingsDTO[];
  page: number;
  pageSize: number;
  total: number;
};
