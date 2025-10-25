import { randomUUID } from "node:crypto";
import type { UseCase } from "../types/usecase";
import type { UnitOfWork } from "../types/unit-of-work";
import type { CustomerAttributes } from "../../domain/customer/customer-entity";
import { ConflictError, ValidationError } from "../errors";

export type CreateCustomerInput = {
  name: string;
  email?: string;
};

export type CreateCustomerOutput = CustomerAttributes;

export class CreateCustomerUseCase implements UseCase<CreateCustomerInput, CreateCustomerOutput> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: CreateCustomerInput): Promise<CreateCustomerOutput> {
    const name = input.name?.trim();
    const email = input.email?.trim();

    if (!name) {
      throw new ValidationError("Customer name is required.");
    }

    return this.unitOfWork.run(async ({ customers }) => {
      try {
        const customer = await customers.create({
          id: randomUUID(),
          name,
          email: email || undefined
        });

        return customer.toJSON();
      } catch (error) {
        if (isEmailConflictError(error)) {
          throw new ConflictError("Customer with this email already exists.");
        }

        throw error;
      }
    });
  }
}

function isEmailConflictError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "EMAIL_CONFLICT";
}
