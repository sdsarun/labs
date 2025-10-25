import { Prisma, PrismaClient } from "../../../../generated/prisma/client";
import type { Booking as PrismaBooking } from "../../../../generated/prisma/client";
import { Booking, type BookingAttributes, type BookingStatus } from "../../../domain/booking/booking-entity";
import type { BookingRepository } from "../../../domain/booking/booking-repository";

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

export class PrismaBookingRepository implements BookingRepository {
  constructor(private readonly prisma: PrismaClientLike) {}

  async findOneById({ id }: { id: string }): Promise<Booking | null> {
    const record = await this.prisma.booking.findUnique({ where: { id } });

    if (!record || record.deletedAt) {
      return null;
    }

    return this.toEntity(record);
  }

  async findMany(params: Partial<BookingAttributes>): Promise<Booking[]> {
    const where = this.buildWhere(params);
    const records = await this.prisma.booking.findMany({ where });
    return records.map((record) => this.toEntity(record));
  }

  async findManyByCustomerIds({ customerIds }: { customerIds: string[] }): Promise<Booking[]> {
    if (customerIds.length === 0) {
      return [];
    }

    const records = await this.prisma.booking.findMany({
      where: {
        customerId: { in: customerIds },
        deletedAt: null,
      },
    });

    return records.map((record) => this.toEntity(record));
  }

  async create(params: BookingAttributes): Promise<Booking> {
    const record = await this.prisma.booking.create({
      data: this.mapCreateData(params),
    });

    return this.toEntity(record);
  }

  async updateById({
    id,
    payload,
  }: {
    id: string;
    payload: Partial<BookingAttributes>;
  }): Promise<Booking | null> {
    try {
      const record = await this.prisma.booking.update({
        where: { id },
        data: this.mapUpdateData(payload),
      });

      return record.deletedAt ? null : this.toEntity(record);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  async deleteById({ id }: { id: string }): Promise<void> {
    await this.prisma.booking.delete({ where: { id } });
  }

  private toEntity(record: PrismaBooking): Booking {
    return new Booking({
      id: record.id,
      customerId: record.customerId,
      roomId: record.roomId,
      startDate: record.startDate.toISOString().slice(0, 10),
      endDate: record.endDate.toISOString().slice(0, 10),
      status: record.status as BookingStatus,
    });
  }

  private mapCreateData(params: BookingAttributes): Prisma.BookingCreateInput {
    return {
      id: params.id,
      customer: { connect: { id: params.customerId } },
      room: { connect: { id: params.roomId } },
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      status: params.status,
    };
  }

  private mapUpdateData(payload: Partial<BookingAttributes>): Prisma.BookingUpdateInput {
    const data: Prisma.BookingUpdateInput = {};

    if (payload.customerId) {
      data.customer = { connect: { id: payload.customerId } };
    }

    if (payload.roomId) {
      data.room = { connect: { id: payload.roomId } };
    }

    if (payload.startDate) {
      data.startDate = new Date(payload.startDate);
    }

    if (payload.endDate) {
      data.endDate = new Date(payload.endDate);
    }

    if (payload.status) {
      data.status = payload.status;
    }

    return data;
  }

  private buildWhere(params: Partial<BookingAttributes>): Prisma.BookingWhereInput {
    const where: Prisma.BookingWhereInput = {
      deletedAt: null,
    };

    if (typeof params.id === "string") {
      where.id = params.id;
    }

    if (typeof params.customerId === "string") {
      where.customerId = params.customerId;
    }

    if (typeof params.roomId === "string") {
      where.roomId = params.roomId;
    }

    if (typeof params.startDate === "string") {
      where.startDate = new Date(params.startDate);
    }

    if (typeof params.endDate === "string") {
      where.endDate = new Date(params.endDate);
    }

    if (typeof params.status === "string") {
      where.status = params.status as BookingStatus;
    }

    return where;
  }
}

function isNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}
