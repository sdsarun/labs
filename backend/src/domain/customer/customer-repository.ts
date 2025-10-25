import { Customer, type CustomerAttributes } from "./customer-entity";

export abstract class CustomerRepository {
  abstract findOneById(params: { id: string }): Promise<Customer | null>;
  abstract findMany(params: Record<string, unknown>): Promise<Customer[]>;
  abstract findPage(params: {
    filters?: Record<string, unknown>;
    page: number;
    pageSize: number;
  }): Promise<{ data: Customer[]; total: number }>;
  abstract updateById(params: {
    id: string;
    payload: Partial<CustomerAttributes>;
  }): Promise<Customer | null>;
  abstract deleteById(params: { id: string }): Promise<void>;
  abstract create(params: Partial<CustomerAttributes>): Promise<Customer>;
}
