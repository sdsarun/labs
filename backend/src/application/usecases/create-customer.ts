import { randomUUID } from "node:crypto";
import type { UseCase } from "../types/usecase";
import type { UnitOfWork } from "../types/unit-of-work";
import type { CustomerAttributes } from "../../domain/customer/customer-entity";
import { ValidationError } from "../errors";

export type CreateCustomerInput = {
  name: string;
  email?: string;
};

export type CreateCustomerOutput = CustomerAttributes;

export class CreateCustomerUseCase implements UseCase<CreateCustomerInput, CreateCustomerOutput> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: CreateCustomerInput): Promise<CreateCustomerOutput> {
    const name = input.name?.trim();

    if (!name) {
      throw new ValidationError("Customer name is required.");
    }

    return this.unitOfWork.run(async ({ customers }) => {
      const customer = await customers.create({
        id: randomUUID(),
        name,
        email: input.email?.trim() || undefined,
      });

      return customer.toJSON();
    });
  }
}
