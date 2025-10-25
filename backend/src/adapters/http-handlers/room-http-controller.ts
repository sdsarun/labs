import { BaseHttpController, type HttpReply, type HttpRouteDefinition } from "./base-http-handler";
import type { CreateRoomUseCase } from "../../application/usecases/create-room";
import type { GetRoomUseCase } from "../../application/usecases/get-room";
import type { ListRoomsUseCase } from "../../application/usecases/list-rooms";
import type { UpdateRoomUseCase } from "../../application/usecases/update-room";
import type { DeleteRoomUseCase } from "../../application/usecases/delete-room";
import type { BaseLogger } from "../logger/base-logger";
import type { RoomType } from "../../domain/room/room-entity";
import { NotFoundError, ValidationError } from "../../application/errors";
import { sendProblem } from "./problem-details";

type CreateRoomBody = {
  name?: string;
  capacity?: number | string;
  type?: RoomType;
};

type UpdateRoomBody = {
  name?: string;
  capacity?: number | string;
  type?: RoomType;
};

type Dependencies = {
  createRoom: CreateRoomUseCase;
  getRoom: GetRoomUseCase;
  listRooms: ListRoomsUseCase;
  updateRoom: UpdateRoomUseCase;
  deleteRoom: DeleteRoomUseCase;
  logger: BaseLogger;
};

export class RoomHttpController extends BaseHttpController {
  constructor(private readonly deps: Dependencies) {
    super();
  }

  routes(): HttpRouteDefinition[] {
    return [
      {
        method: "POST",
        path: "/rooms",
        summary: "Create room",
        handler: async ({ request, reply }) => {
          const body = (request.body ?? {}) as CreateRoomBody;

          try {
            const room = await this.deps.createRoom.execute({
              name: body.name ?? "",
              capacity: coerceNumber(body.capacity),
              type: body.type as RoomType
            });

            this.deps.logger.info("Created room", { roomId: room.id });
            reply.status(201).json(room);
          } catch (error) {
            this.handleError(error, reply, "POST /rooms");
          }
        }
      },
      {
        method: "GET",
        path: "/rooms",
        summary: "List rooms",
        handler: async ({ request, reply }) => {
          const query = (request.query ?? {}) as Record<string, unknown>;

          try {
            const rooms = await this.deps.listRooms.execute({
              name: typeof query.name === "string" ? query.name : undefined,
              type: isRoomType(query.type) ? query.type : undefined
            });

            reply.json(rooms);
          } catch (error) {
            this.handleError(error, reply, "GET /rooms");
          }
        }
      },
      {
        method: "GET",
        path: "/rooms/:id",
        summary: "Get room",
        handler: async ({ request, reply }) => {
          const { id } = (request.params ?? {}) as { id?: string };
          if (!id) {
            sendProblem(reply, 400, "Invalid request", { detail: "id is required" });
            return;
          }

          try {
            const room = await this.deps.getRoom.execute({ id });
            reply.json(room);
          } catch (error) {
            this.handleError(error, reply, "GET /rooms/:id");
          }
        }
      },
      {
        method: "PATCH",
        path: "/rooms/:id",
        summary: "Update room",
        handler: async ({ request, reply }) => {
          const { id } = (request.params ?? {}) as { id?: string };
          if (!id) {
            sendProblem(reply, 400, "Invalid request", { detail: "id is required" });
            return;
          }

          const body = (request.body ?? {}) as UpdateRoomBody;

          try {
            const room = await this.deps.updateRoom.execute({
              id,
              name: body.name,
              capacity: body.capacity !== undefined ? coerceNumber(body.capacity) : undefined,
              type: body.type as RoomType | undefined
            });

            reply.json(room);
          } catch (error) {
            this.handleError(error, reply, "PATCH /rooms/:id");
          }
        }
      },
      {
        method: "DELETE",
        path: "/rooms/:id",
        summary: "Delete room",
        handler: async ({ request, reply }) => {
          const { id } = (request.params ?? {}) as { id?: string };
          if (!id) {
            sendProblem(reply, 400, "Invalid request", { detail: "id is required" });
            return;
          }

          try {
            await this.deps.deleteRoom.execute({ id });
            reply.noContent();
          } catch (error) {
            this.handleError(error, reply, "DELETE /rooms/:id");
          }
        }
      }
    ];
  }

  private handleError(error: unknown, reply: HttpReply, route: string): void {
    this.deps.logger.error(error, { route });

    if (error instanceof ValidationError) {
      sendProblem(reply, 400, "Invalid request", { detail: error.message });
      return;
    }

    if (error instanceof NotFoundError) {
      sendProblem(reply, 404, "Resource not found", { detail: error.message });
      return;
    }

    sendProblem(reply, 500, "Internal server error");
  }
}

function coerceNumber(value: number | string | undefined): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return Number.NaN;
}

function isRoomType(value: unknown): value is RoomType {
  return value === "standard" || value === "deluxe" || value === "suite";
}
