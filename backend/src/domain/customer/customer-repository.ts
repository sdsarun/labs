import { Customer, type CustomerAttributes } from "./customer-entity";

export interface CustomerRepository {
  findOneById(params: { id: string }): Promise<Customer | null>;
  findMany(params: Record<string, unknown>): Promise<Customer[]>;
  findPage(params: {
    filters?: Record<string, unknown>;
    page: number;
    pageSize: number;
  }): Promise<{ data: Customer[]; total: number }>;
  updateById(params: {
    id: string;
    payload: Partial<CustomerAttributes>;
  }): Promise<Customer | null>;
  deleteById(params: { id: string }): Promise<void>;
  create(params: Partial<CustomerAttributes>): Promise<Customer>;
}
