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
}
