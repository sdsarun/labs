import type { UseCase } from "../types/usecase";
import type { UnitOfWork } from "../types/unit-of-work";
import type { PaginatedCustomersWithBookings } from "../dto/customer-with-bookings-dto";

export type ListCustomersWithBookingsInput = {
  name?: string;
  email?: string;
  page?: number;
  pageSize?: number;
};

export class ListCustomersWithBookingsUseCase
  implements UseCase<ListCustomersWithBookingsInput, PaginatedCustomersWithBookings>
{
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: ListCustomersWithBookingsInput): Promise<PaginatedCustomersWithBookings> {
    const filters: Record<string, unknown> = {};

    if (input.name) {
      filters.name = input.name;
    }

    if (input.email) {
      filters.email = input.email;
    }

    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(Math.max(1, input.pageSize ?? 25), 100);

    return this.unitOfWork.run(async ({ customers, bookings, rooms }) => {
      const { data, total } = await customers.findPage({ filters, page, pageSize });

      const customerIds = data.map((customer) => customer.id);
      const bookingEntities = await bookings.findManyByCustomerIds({ customerIds });

      const roomIds = Array.from(
        new Set(
          bookingEntities
            .map((booking) => booking.toJSON().roomId)
            .filter((id): id is string => typeof id === "string")
        )
      );

      const roomEntities = await rooms.findByIds({ ids: roomIds });
      const roomsMap = new Map(roomEntities.map((room) => [room.id, room.toJSON()]));

      const bookingsByCustomer = new Map<
        string,
        PaginatedCustomersWithBookings["data"][number]["bookings"]
      >();

      for (const booking of bookingEntities) {
        const snapshot = booking.toJSON();
        const list = bookingsByCustomer.get(snapshot.customerId) ?? [];
        list.push({
          booking: snapshot,
          room: snapshot.roomId ? roomsMap.get(snapshot.roomId) : undefined
        });
        bookingsByCustomer.set(snapshot.customerId, list);
      }

      return {
        data: data.map((customer) => ({
          ...customer.toJSON(),
          bookings: bookingsByCustomer.get(customer.id) ?? []
        })),
        page,
        pageSize,
        total
      };
    });
  }
}
