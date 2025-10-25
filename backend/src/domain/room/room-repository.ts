import { Room, type RoomAttributes } from "./room-entity";

export abstract class RoomRepository {
  abstract findOneById(params: { id: string }): Promise<Room | null>;
  abstract findMany(params: Record<string, unknown>): Promise<Room[]>;
  abstract findByIds(params: { ids: string[] }): Promise<Room[]>;
  abstract updateById(params: { id: string; payload: Partial<RoomAttributes> }): Promise<Room | null>;
  abstract deleteById(params: { id: string }): Promise<void>;
  abstract create(params: Partial<RoomAttributes>): Promise<Room>;
}
