import type { PrismaClient, Prisma } from "../../../generated/prisma/client";
import type { UnitOfWork, UnitOfWorkRepositories } from "../../application/types/unit-of-work";
import { PrismaCustomerRepository } from "../repositories/prisma/prisma-customer-repository";
import { PrismaRoomRepository } from "../repositories/prisma/prisma-room-repository";
import { PrismaBookingRepository } from "../repositories/prisma/prisma-booking-repository";

export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  async run<T>(work: (repositories: UnitOfWorkRepositories) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const repositories = this.createRepositories(tx);
      return work(repositories);
    });
  }

  private createRepositories(transactionClient: Prisma.TransactionClient): UnitOfWorkRepositories {
    return {
      customers: new PrismaCustomerRepository(transactionClient),
      rooms: new PrismaRoomRepository(transactionClient),
      bookings: new PrismaBookingRepository(transactionClient)
    };
  }
}
