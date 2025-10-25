import type { UseCase } from "../types/usecase";
import type { CustomerAttributes } from "../../domain/customer/customer-entity";
import type { UnitOfWork } from "../types/unit-of-work";
import { NotFoundError } from "../errors";

export type GetCustomerInput = { id: string };
export type GetCustomerOutput = CustomerAttributes;

export class GetCustomerUseCase implements UseCase<GetCustomerInput, GetCustomerOutput> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: GetCustomerInput): Promise<GetCustomerOutput> {
    return this.unitOfWork.run(async ({ customers }) => {
      const customer = await customers.findOneById({ id: input.id });
      if (!customer) {
        throw new NotFoundError(`Customer with id "${input.id}" not found.`);
      }

      return customer.toJSON();
    });
  }
}
