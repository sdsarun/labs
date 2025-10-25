import type { Db } from "mongodb";
import type { UnitOfWork, UnitOfWorkRepositories } from "../../application/types/unit-of-work";
import { MongoCustomerRepository } from "../repositories/mongo/mongo-customer-repository";
import { MongoRoomRepository } from "../repositories/mongo/mongo-room-repository";
import { MongoBookingRepository } from "../repositories/mongo/mongo-booking-repository";

export class MongoUnitOfWork implements UnitOfWork {
  private readonly repositories: UnitOfWorkRepositories;

  constructor(private readonly db: Db) {
    this.repositories = {
      customers: new MongoCustomerRepository(this.db.collection("customers")),
      rooms: new MongoRoomRepository(this.db.collection("rooms")),
      bookings: new MongoBookingRepository(this.db.collection("bookings"))
    };
  }

  async run<T>(work: (repositories: UnitOfWorkRepositories) => Promise<T>): Promise<T> {
    return work(this.repositories);
  }
}
