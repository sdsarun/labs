import { Prisma, PrismaClient } from "../../../../generated/prisma/client";
import type { Customer as PrismaCustomer } from "../../../../generated/prisma/client";
import { Customer, type CustomerAttributes } from "../../../domain/customer/customer-entity";
import { CustomerRepository } from "../../../domain/customer/customer-repository";

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

export class PrismaCustomerRepository extends CustomerRepository {
  constructor(private readonly prisma: PrismaClientLike) {
    super();
  }

  async findOneById({ id }: { id: string }): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({
      where: { id }
    });

    if (!record || record.deletedAt) {
      return null;
    }

    return this.toEntity(record);
  }

  async findMany(params: Record<string, unknown>): Promise<Customer[]> {
    const where = this.buildWhere(params);
    const records = await this.prisma.customer.findMany({ where });
    return records.map((record) => this.toEntity(record));
  }

  async findPage({
    filters = {},
    page,
    pageSize
  }: {
    filters?: Record<string, unknown>;
    page: number;
    pageSize: number;
  }): Promise<{ data: Customer[]; total: number }> {
    const where = this.buildWhere(filters);

    const records = await this.prisma.customer.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" }
    });

    const total = await this.prisma.customer.count({ where });

    return {
      data: records.map((record) => this.toEntity(record)),
      total
    };
  }

  async updateById({
    id,
    payload
  }: {
    id: string;
    payload: Partial<CustomerAttributes>;
  }): Promise<Customer | null> {
    try {
      const record = await this.prisma.customer.update({
        where: { id },
        data: this.mapUpdateData(payload)
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
    await this.prisma.customer.delete({ where: { id } });
  }

  async create(params: Partial<CustomerAttributes>): Promise<Customer> {
    if (!params.name) {
      throw new Error("Customer name is required.");
    }

    const record = await this.prisma.customer.create({
      data: {
        id: params.id,
        name: params.name,
        email: params.email ?? null
      }
    });

    return this.toEntity(record);
  }

  private toEntity(record: PrismaCustomer): Customer {
    return new Customer({
      id: record.id,
      name: record.name,
      email: record.email ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt
    });
  }

  private mapUpdateData(payload: Partial<CustomerAttributes>): Prisma.CustomerUpdateInput {
    const data: Prisma.CustomerUpdateInput = {};

    if (payload.name !== undefined) {
      data.name = payload.name;
    }

    if (payload.email !== undefined) {
      data.email = payload.email ?? null;
    }

    return data;
  }

  private buildWhere(params: Record<string, unknown>): Prisma.CustomerWhereInput {
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null
    };

    if (typeof params.id === "string") {
      where.id = params.id;
    }

    if (typeof params.name === "string") {
      where.name = params.name;
    }

    if (typeof params.email === "string") {
      where.email = params.email;
    }

    return where;
  }
}

function isNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}
