import type { UseCase } from "../types/usecase";
import type { UnitOfWork } from "../types/unit-of-work";
import { NotFoundError } from "../errors";

export type DeleteCustomerInput = { id: string };

export class DeleteCustomerUseCase implements UseCase<DeleteCustomerInput, void> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: DeleteCustomerInput): Promise<void> {
    await this.unitOfWork.run(async ({ customers }) => {
      const existing = await customers.findOneById({ id: input.id });
      if (!existing) {
        throw new NotFoundError(`Customer with id "${input.id}" not found.`);
      }

      await customers.deleteById({ id: input.id });
    });
  }
}
