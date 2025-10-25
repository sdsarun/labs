import type { UseCase } from "../types/usecase";
import type { UnitOfWork } from "../types/unit-of-work";
import type { CustomerAttributes } from "../../domain/customer/customer-entity";
import { NotFoundError, ValidationError } from "../errors";

export type UpdateCustomerInput = {
  id: string;
  name?: string;
  email?: string;
};

export type UpdateCustomerOutput = CustomerAttributes;

export class UpdateCustomerUseCase implements UseCase<UpdateCustomerInput, UpdateCustomerOutput> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: UpdateCustomerInput): Promise<UpdateCustomerOutput> {
    if (input.name !== undefined && input.name.trim().length === 0) {
      throw new ValidationError("name, if provided, cannot be empty");
    }

    if (input.email !== undefined && input.email.trim().length === 0) {
      throw new ValidationError("email, if provided, cannot be empty");
    }

    return this.unitOfWork.run(async ({ customers }) => {
      const record = await customers.updateById({
        id: input.id,
        payload: {
          name: input.name?.trim(),
          email: input.email?.trim(),
        },
      });

      if (!record) {
        throw new NotFoundError(`Customer with id "${input.id}" not found.`);
      }

      return record.toJSON();
    });
  }
}
