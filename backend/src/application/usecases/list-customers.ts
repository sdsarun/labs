import type { UseCase } from "../types/usecase";
import type { UnitOfWork } from "../types/unit-of-work";
import type { CustomerAttributes } from "../../domain/customer/customer-entity";

export type ListCustomersInput = {
  name?: string;
  email?: string;
  page?: number;
  pageSize?: number;
};

export type ListCustomersOutput = {
  data: CustomerAttributes[];
  page: number;
  pageSize: number;
  total: number;
};

export class ListCustomersUseCase implements UseCase<ListCustomersInput, ListCustomersOutput> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: ListCustomersInput): Promise<ListCustomersOutput> {
    return this.unitOfWork.run(async ({ customers }) => {
      const filters: Record<string, unknown> = {};

      if (input.name) {
        filters.name = input.name;
      }

      if (input.email) {
        filters.email = input.email;
      }

      const page = Math.max(1, input.page ?? 1);
      const pageSize = Math.min(Math.max(1, input.pageSize ?? 25), 100);

      const { data, total } = await customers.findPage({
        filters,
        page,
        pageSize
      });

      return {
        data: data.map((customer) => customer.toJSON()),
        page,
        pageSize,
        total
      };
    });
  }
}
