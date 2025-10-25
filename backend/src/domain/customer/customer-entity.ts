import { Entity } from "../base/base-entity";

export type CustomerAttributes = {
  id: string;
  name: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class Customer extends Entity<CustomerAttributes> {
  get id() {
    return this.attributes.id;
  }

  get name() {
    return this.attributes.name;
  }

  get email() {
    return this.attributes.email;
  }

  update(attributes: Partial<CustomerAttributes>): void {
    const next: Partial<CustomerAttributes> = {};

    if (attributes.name !== undefined) {
      const trimmed = attributes.name.trim();
      if (!trimmed) {
        throw new Error("Customer name cannot be empty.");
      }
      next.name = trimmed;
    }

    if (attributes.email !== undefined) {
      const trimmed = attributes.email?.trim();
      if (trimmed && !isValidEmail(trimmed)) {
        throw new Error("Invalid email address.");
      }
      next.email = trimmed && trimmed.length > 0 ? trimmed : undefined;
    }

    next.updatedAt = attributes.updatedAt ?? new Date();

    super.update(next);
  }
}

function isValidEmail(value: string): boolean {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return EMAIL_REGEX.test(value);
}
