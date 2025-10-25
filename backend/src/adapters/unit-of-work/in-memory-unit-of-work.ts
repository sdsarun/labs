import type { UnitOfWork, UnitOfWorkRepositories } from "../../application/types/unit-of-work";
import { InMemoryBookingRepository } from "../repositories/in-memory/in-memory-booking-repository";
import { InMemoryCustomerRepository } from "../repositories/in-memory/in-memory-customer-repository";
import { InMemoryRoomRepository } from "../repositories/in-memory/in-memory-room-repository";

export type InMemoryUnitOfWorkOptions = {
  customers: InMemoryCustomerRepository;
  rooms: InMemoryRoomRepository;
  bookings: InMemoryBookingRepository;
};

export class InMemoryUnitOfWork implements UnitOfWork {
  private readonly repositories: UnitOfWorkRepositories;
  private readonly customerRepo: InMemoryCustomerRepository;
  private readonly roomRepo: InMemoryRoomRepository;
  private readonly bookingRepo: InMemoryBookingRepository;

  constructor(options: InMemoryUnitOfWorkOptions) {
    this.customerRepo = options.customers;
    this.roomRepo = options.rooms;
    this.bookingRepo = options.bookings;

    this.repositories = {
      customers: options.customers,
      rooms: options.rooms,
      bookings: options.bookings
    };
  }

  async run<T>(work: (repositories: UnitOfWorkRepositories) => Promise<T>): Promise<T> {
    const snapshots = {
      customers: this.customerRepo.exportData(),
      rooms: this.roomRepo.exportData(),
      bookings: this.bookingRepo.exportData()
    };

    try {
      return await work(this.repositories);
    } catch (error) {
      this.customerRepo.importData(snapshots.customers);
      this.roomRepo.importData(snapshots.rooms);
      this.bookingRepo.importData(snapshots.bookings);
      throw error;
    }
  }
}
