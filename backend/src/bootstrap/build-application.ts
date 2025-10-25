import type { PrismaClient } from "../../generated/prisma/client";
import { PrismaClient as PrismaClientImpl } from "../../generated/prisma/client";
import { MongoClient } from "mongodb";
import type { AppConfig } from "../config/app-config";
import type { UnitOfWork } from "../application/types/unit-of-work";
import { PinoLogger } from "../adapters/logger/pino-logger";
import type { BaseLogger } from "../adapters/logger/base-logger";
import { InMemoryCustomerRepository } from "../adapters/repositories/in-memory/in-memory-customer-repository";
import { InMemoryRoomRepository } from "../adapters/repositories/in-memory/in-memory-room-repository";
import { InMemoryBookingRepository } from "../adapters/repositories/in-memory/in-memory-booking-repository";
import { InMemoryUnitOfWork } from "../adapters/unit-of-work/in-memory-unit-of-work";
import { PrismaUnitOfWork } from "../adapters/unit-of-work/prisma-unit-of-work";
import { MongoUnitOfWork } from "../adapters/unit-of-work/mongo-unit-of-work";
import { CreateCustomerUseCase } from "../application/usecases/create-customer";
import { GetCustomerUseCase } from "../application/usecases/get-customer";
import { ListCustomersUseCase } from "../application/usecases/list-customers";
import { ListCustomersWithBookingsUseCase } from "../application/usecases/list-customers-with-bookings";
import { UpdateCustomerUseCase } from "../application/usecases/update-customer";
import { DeleteCustomerUseCase } from "../application/usecases/delete-customer";
import { CreateRoomUseCase } from "../application/usecases/create-room";
import { GetRoomUseCase } from "../application/usecases/get-room";
import { ListRoomsUseCase } from "../application/usecases/list-rooms";
import { UpdateRoomUseCase } from "../application/usecases/update-room";
import { DeleteRoomUseCase } from "../application/usecases/delete-room";
import { CreateBookingUseCase } from "../application/usecases/create-booking";
import { GetBookingUseCase } from "../application/usecases/get-booking";
import { ListBookingsUseCase } from "../application/usecases/list-bookings";
import { UpdateBookingUseCase } from "../application/usecases/update-booking";
import { DeleteBookingUseCase } from "../application/usecases/delete-booking";
import { CustomerHttpController } from "../adapters/http-handlers/customer-http-controller";
import { RoomHttpController } from "../adapters/http-handlers/room-http-controller";
import { BookingHttpController } from "../adapters/http-handlers/booking-http-controller";
import { HealthHttpController } from "../adapters/http-handlers/health-http-controller";
import { DocsHttpController } from "../adapters/http-handlers/docs-http-controller";
import { FastifyHttpServer } from "../frameworks/fastify/http/server";
import { ExpressHttpServer } from "../frameworks/express/http/server";
import type { HttpServer } from "../adapters/http-handlers/base-http-handler";
import { SocketIoGateway } from "../frameworks/realtime/socket-io-gateway";
import type { RealtimeGateway } from "../frameworks/realtime/realtime-gateway";
import { SendCustomerChatMessageUseCase } from "../application/usecases/send-customer-chat-message";
import { SocketIoCustomerChatPublisher } from "../adapters/realtime/socket-io-customer-chat-publisher";
import { CustomerChatSocketController } from "../adapters/realtime/customer-chat-socket-controller";

export interface BuiltApplication {
  server: HttpServer;
  logger: BaseLogger;
  prisma?: PrismaClient;
  mongoClient?: MongoClient;
  realtime?: RealtimeGateway;
  shutdown(): Promise<void>;
}

export async function buildApplication(config: AppConfig): Promise<BuiltApplication> {
  const logger = new PinoLogger({ level: config.logLevel });

  const { unitOfWork, prisma, mongoClient } = await createUnitOfWork(config, logger);

  const createCustomer = new CreateCustomerUseCase(unitOfWork);
  const getCustomer = new GetCustomerUseCase(unitOfWork);
  const listCustomers = new ListCustomersUseCase(unitOfWork);
  const listCustomersWithBookings = new ListCustomersWithBookingsUseCase(unitOfWork);
  const updateCustomer = new UpdateCustomerUseCase(unitOfWork);
  const deleteCustomer = new DeleteCustomerUseCase(unitOfWork);

  const createRoom = new CreateRoomUseCase(unitOfWork);
  const getRoom = new GetRoomUseCase(unitOfWork);
  const listRooms = new ListRoomsUseCase(unitOfWork);
  const updateRoom = new UpdateRoomUseCase(unitOfWork);
  const deleteRoom = new DeleteRoomUseCase(unitOfWork);

  const createBooking = new CreateBookingUseCase(unitOfWork);
  const getBooking = new GetBookingUseCase(unitOfWork);
  const listBookings = new ListBookingsUseCase(unitOfWork);
  const updateBooking = new UpdateBookingUseCase(unitOfWork);
  const deleteBooking = new DeleteBookingUseCase(unitOfWork);

  const server = createHttpServer(config, logger);
  const realtime = new SocketIoGateway(server.getRawServer(), { logger });
  const chatPublisher = new SocketIoCustomerChatPublisher(realtime);
  const sendCustomerChatMessage = new SendCustomerChatMessageUseCase(chatPublisher);

  new CustomerChatSocketController(realtime, sendCustomerChatMessage, logger);

  server.register(
    new CustomerHttpController({
      createCustomer,
      getCustomer,
      listCustomers,
      listCustomersWithBookings,
      updateCustomer,
      deleteCustomer,
      logger,
      realtime
    })
  );

  server.register(
    new RoomHttpController({
      createRoom,
      getRoom,
      listRooms,
      updateRoom,
      deleteRoom,
      logger,
      realtime
    })
  );

  server.register(
    new BookingHttpController({
      createBooking,
      getBooking,
      listBookings,
      updateBooking,
      deleteBooking,
      logger,
      realtime
    })
  );

  server.register(new HealthHttpController(logger));
  server.register(new DocsHttpController());

  return {
    server,
    logger,
    prisma,
    mongoClient,
    realtime,
    async shutdown() {
      await realtime.close().catch(() => undefined);
      await server.close().catch(() => undefined);
      await prisma?.$disconnect().catch(() => undefined);
      await mongoClient?.close().catch(() => undefined);
    }
  };
}

async function createUnitOfWork(
  config: AppConfig,
  logger: BaseLogger
): Promise<{ unitOfWork: UnitOfWork; prisma?: PrismaClient; mongoClient?: MongoClient }> {
  if (config.dataDriver === "memory") {
    logger.debug("Using in-memory data driver");
    const customers = new InMemoryCustomerRepository();
    const rooms = new InMemoryRoomRepository();
    const bookings = new InMemoryBookingRepository();
    return {
      unitOfWork: new InMemoryUnitOfWork({
        customers,
        rooms,
        bookings
      })
    };
  }

  if (config.dataDriver === "mongo") {
    logger.debug("Using MongoDB data driver");
    const mongoUrl = config.mongoUrl ?? "mongodb://127.0.0.1:27017";
    const mongoDbName = config.mongoDbName ?? "labs";
    const mongoClient = new MongoClient(mongoUrl);
    await mongoClient.connect();
    const db = mongoClient.db(mongoDbName);

    return {
      unitOfWork: new MongoUnitOfWork(db),
      mongoClient
    };
  }

  logger.debug("Using Prisma data driver");
  const prisma = new PrismaClientImpl();
  return {
    unitOfWork: new PrismaUnitOfWork(prisma),
    prisma
  };
}

function createHttpServer(config: AppConfig, logger: BaseLogger): HttpServer {
  if (config.httpDriver === "express") {
    logger.debug("Using Express HTTP driver");
    return new ExpressHttpServer({ logger });
  }

  logger.debug("Using Fastify HTTP driver");
  return new FastifyHttpServer({ logger });
}
