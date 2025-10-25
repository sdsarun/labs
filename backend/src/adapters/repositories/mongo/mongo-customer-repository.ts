import { randomUUID } from "node:crypto";
import type { Collection, Document, WithId } from "mongodb";
import { Customer, type CustomerAttributes } from "../../../domain/customer/customer-entity";
import type { CustomerRepository } from "../../../domain/customer/customer-repository";

type CustomerDocument = {
  _id: string;
  id: string;
  name: string;
  email?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
};

export class MongoCustomerRepository implements CustomerRepository {
  constructor(private readonly collection: Collection<CustomerDocument>) {}

  async findOneById({ id }: { id: string }): Promise<Customer | null> {
    const doc = await this.collection.findOne({ id, deletedAt: { $in: [null, undefined] } });
    return doc ? this.toEntity(doc) : null;
  }

  async findMany(params: Record<string, unknown>): Promise<Customer[]> {
    const filter = this.buildFilter(params);
    const docs = await this.collection.find(filter).toArray();
    return docs.map((doc) => this.toEntity(doc));
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
    const filter = this.buildFilter(filters);

    const cursor = this.collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const [docs, total] = await Promise.all([cursor.toArray(), this.collection.countDocuments(filter)]);

    return {
      data: docs.map((doc) => this.toEntity(doc)),
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
    const existing = await this.collection.findOne({ id, deletedAt: { $in: [null, undefined] } });
    if (!existing) {
      return null;
    }

    const customer = this.toEntity(existing);
    customer.update(payload);
    const snapshot = customer.toJSON();
    const document = this.toDocument(snapshot);

    await this.collection.updateOne(
      { id },
      {
        $set: {
          name: document.name,
          email: document.email ?? null,
          updatedAt: document.updatedAt,
          deletedAt: document.deletedAt ?? null
        }
      }
    );

    return customer;
  }

  async deleteById({ id }: { id: string }): Promise<void> {
    await this.collection.deleteOne({ id });
  }

  async create(params: Partial<CustomerAttributes>): Promise<Customer> {
    const name = params.name?.trim();
    if (!name) {
      throw new Error("Customer name is required.");
    }

    const id = params.id ?? randomUUID();
    const now = new Date();

    const customer = new Customer({
      id,
      name,
      email: params.email?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    });

    if (customer.email) {
      const existing = await this.collection.findOne({
        email: customer.email,
        deletedAt: { $in: [null, undefined] }
      });

      if (existing) {
        throw createCustomerEmailConflictError();
      }
    }

    const doc = this.toDocument(customer.toJSON());
    await this.collection.insertOne(doc);

    return customer;
  }

  private buildFilter(params: Record<string, unknown>): Document {
    const filter: Document = {
      deletedAt: { $in: [null, undefined] }
    };

    if (typeof params.id === "string") {
      filter.id = params.id;
    }

    if (typeof params.name === "string") {
      filter.name = params.name;
    }

    if (typeof params.email === "string") {
      filter.email = params.email;
    }

    return filter;
  }

  private toEntity(doc: WithId<CustomerDocument>): Customer {
    return new Customer({
      id: doc.id,
      name: doc.name,
      email: doc.email ?? undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      deletedAt: doc.deletedAt ?? null
    });
  }

  private toDocument(attributes: CustomerAttributes): CustomerDocument {
    return {
      _id: attributes.id,
      id: attributes.id,
      name: attributes.name,
      email: attributes.email ?? null,
      createdAt: attributes.createdAt,
      updatedAt: attributes.updatedAt,
      deletedAt: attributes.deletedAt ?? null
    };
  }
}

function createCustomerEmailConflictError(): Error {
  const error = new Error("Customer email already exists.");
  (error as unknown as { code: string }).code = "EMAIL_CONFLICT";
  return error;
}
