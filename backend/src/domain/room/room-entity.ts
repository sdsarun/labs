import { Entity } from "../base/base-entity";

export type RoomType = "standard" | "deluxe" | "suite";
export type RoomAttributes = {
  id: string;
  name: string;
  capacity: number;
  type: RoomType;
};

export class Room extends Entity<RoomAttributes> {
  get id() {
    return this.attributes.id;
  }

  get name() {
    return this.attributes.name;
  }

  get capacity() {
    return this.attributes.capacity;
  }

  get type() {
    return this.attributes.type;
  }
}
