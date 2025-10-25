import { randomUUID } from "node:crypto";
import { Customer, CustomerAttributes } from "../../../domain/customer/customer-entity";
import { CustomerRepository } from "../../../domain/customer/customer-repository";

export class InMemoryCustomerRepository extends CustomerRepository {
  private customers: Customer[] = [];

  async findOneById({ id }: { id: string }): Promise<Customer | null> {
    return this.customers.find((customer) => customer.id === id) ?? null;
  }

  async findMany(params: Record<string, unknown>): Promise<Customer[]> {
    if (!params || Object.keys(params).length === 0) {
      return [...this.customers];
    }

    return this.customers.filter((customer) => {
      const attributes = customer.toJSON() as CustomerAttributes;
      return Object.entries(params).every(([key, expected]) => {
        if (expected === undefined) {
          return true;
        }

        return (attributes as Record<string, unknown>)[key] === expected;
      });
    });
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
    const start = (page - 1) * pageSize;
    const filtered = await this.findMany(filters);
    const paginated = filtered.slice(start, start + pageSize);
    return {
      data: paginated,
      total: filtered.length
    };
  }

  async updateById({
    id,
    payload
  }: {
    id: string;
    payload: Partial<CustomerAttributes>;
  }): Promise<Customer> {
    const customer = await this.findOneById({ id });
    if (!customer) {
      throw new Error(`Customer with id "${id}" was not found.`);
    }

    const updates = this.extractAttributes(payload);
    if (Object.keys(updates).length > 0) {
      customer.update(updates);
    }

    return customer;
  }

  async deleteById({ id }: { id: string }): Promise<void> {
    this.customers = this.customers.filter((customer) => customer.id !== id);
  }

  async create(params: Partial<CustomerAttributes>): Promise<Customer> {
    const attributes = this.extractAttributes(params);
    const id = attributes.id ?? randomUUID();

    if (!attributes.name) {
      throw new Error("Customer name is required.");
    }

    if (this.customers.some((customer) => customer.id === id)) {
      throw new Error(`Customer with id "${id}" already exists.`);
    }

    const customer = new Customer({
      id,
      name: attributes.name,
      email: attributes.email
    });

    this.customers.push(customer);

    return customer;
  }

  private extractAttributes(
    source: Partial<Customer> | Partial<CustomerAttributes>
  ): Partial<CustomerAttributes> {
    if (source instanceof Customer) {
      return source.toJSON();
    }

    const record = source as Record<string, unknown>;
    const attributes: Partial<CustomerAttributes> = {};

    if (typeof record.id === "string") {
      attributes.id = record.id;
    }

    if (typeof record.name === "string") {
      attributes.name = record.name;
    }

    if (typeof record.email === "string") {
      attributes.email = record.email;
    }

    return attributes;
  }

  exportData(): CustomerAttributes[] {
    return this.customers.map((customer) => customer.toJSON());
  }

  importData(data: CustomerAttributes[]): void {
    this.customers = data.map((attributes) => new Customer(attributes));
  }
}
