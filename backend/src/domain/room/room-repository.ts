import { Room, type RoomAttributes } from "./room-entity";

export interface RoomRepository {
  findOneById(params: { id: string }): Promise<Room | null>;
  findMany(params: Record<string, unknown>): Promise<Room[]>;
  findByIds(params: { ids: string[] }): Promise<Room[]>;
  updateById(params: { id: string; payload: Partial<RoomAttributes> }): Promise<Room | null>;
  deleteById(params: { id: string }): Promise<void>;
  create(params: Partial<RoomAttributes>): Promise<Room>;
}
