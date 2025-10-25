import type { BookingRepository } from "../../domain/booking/booking-repository";
import type { CustomerRepository } from "../../domain/customer/customer-repository";
import type { RoomRepository } from "../../domain/room/room-repository";

export type UnitOfWorkRepositories = {
  customers: CustomerRepository;
  rooms: RoomRepository;
  bookings: BookingRepository;
};

export interface UnitOfWork {
  run<T>(work: (repositories: UnitOfWorkRepositories) => Promise<T>): Promise<T>;
}
