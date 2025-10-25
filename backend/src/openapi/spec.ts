export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Labs Booking API",
    version: "1.0.0",
    description:
      "HTTP API for managing customers, rooms, and bookings. The schema reflects the exposed controllers."
  },
  servers: [
    {
      url: "/",
      description: "Current server"
    }
  ],
  tags: [
    { name: "Health", description: "Service status" },
    { name: "Rooms", description: "Room management" },
    { name: "Customers", description: "Customer management" },
    { name: "Bookings", description: "Booking management" },
    { name: "Docs", description: "Documentation routes" }
  ],
  components: {
    schemas: {
      ProblemDetails: {
        type: "object",
        properties: {
          type: { type: "string", format: "uri" },
          title: { type: "string" },
          status: { type: "integer" },
          detail: { type: "string" },
          instance: { type: "string" }
        },
        required: ["type", "title", "status"]
      },
      RoomType: {
        type: "string",
        enum: ["standard", "deluxe", "suite"]
      },
      Room: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          capacity: { type: "integer", minimum: 1 },
          type: { $ref: "#/components/schemas/RoomType" }
        },
        required: ["id", "name", "capacity", "type"]
      },
      RoomCreateInput: {
        type: "object",
        properties: {
          name: { type: "string", example: "Conference Room 1" },
          capacity: { type: "integer", minimum: 1, example: 12 },
          type: { $ref: "#/components/schemas/RoomType" }
        },
        required: ["name", "capacity", "type"]
      },
      RoomUpdateInput: {
        type: "object",
        properties: {
          name: { type: "string" },
          capacity: { type: "integer", minimum: 1 },
          type: { $ref: "#/components/schemas/RoomType" }
        }
      },
      Customer: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string", format: "email", nullable: true }
        },
        required: ["id", "name"]
      },
      CustomerCreateInput: {
        type: "object",
        properties: {
          name: { type: "string", example: "Ada Lovelace" },
          email: { type: "string", format: "email", example: "ada@example.com" }
        },
        required: ["name"]
      },
      CustomerUpdateInput: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string", format: "email" }
        }
      },
      PaginatedCustomersResponse: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Customer" }
          },
          page: { type: "integer", minimum: 1 },
          pageSize: { type: "integer", minimum: 1 },
          total: { type: "integer", minimum: 0 }
        },
        required: ["data", "page", "pageSize", "total"]
      },
      BookingStatus: {
        type: "string",
        enum: ["pending", "confirmed", "cancelled"]
      },
      Booking: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          customerId: { type: "string", format: "uuid" },
          roomId: { type: "string", format: "uuid" },
          startDate: { type: "string", format: "date" },
          endDate: { type: "string", format: "date" },
          status: { $ref: "#/components/schemas/BookingStatus" }
        },
        required: ["id", "customerId", "roomId", "startDate", "endDate", "status"]
      },
      BookingCreateInput: {
        type: "object",
        properties: {
          customerId: { type: "string", format: "uuid" },
          roomId: { type: "string", format: "uuid" },
          startDate: { type: "string", format: "date" },
          endDate: { type: "string", format: "date" },
          status: { $ref: "#/components/schemas/BookingStatus" }
        },
        required: ["customerId", "roomId", "startDate", "endDate"]
      },
      BookingUpdateInput: {
        type: "object",
        properties: {
          customerId: { type: "string", format: "uuid" },
          roomId: { type: "string", format: "uuid" },
          startDate: { type: "string", format: "date" },
          endDate: { type: "string", format: "date" },
          status: { $ref: "#/components/schemas/BookingStatus" }
        }
      },
      BookingWithRoom: {
        type: "object",
        properties: {
          booking: { $ref: "#/components/schemas/Booking" },
          room: { $ref: "#/components/schemas/Room", nullable: true }
        },
        required: ["booking"]
      },
      CustomerWithBookings: {
        type: "object",
        properties: {
          customer: { $ref: "#/components/schemas/Customer" },
          bookings: {
            type: "array",
            items: { $ref: "#/components/schemas/BookingWithRoom" }
          }
        },
        required: ["customer", "bookings"]
      },
      PaginatedCustomersWithBookingsResponse: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/CustomerWithBookings" }
          },
          page: { type: "integer", minimum: 1 },
          pageSize: { type: "integer", minimum: 1 },
          total: { type: "integer", minimum: 0 }
        },
        required: ["data", "page", "pageSize", "total"]
      },
      RoomsArray: {
        type: "array",
        items: { $ref: "#/components/schemas/Room" }
      },
      BookingsArray: {
        type: "array",
        items: { $ref: "#/components/schemas/Booking" }
      },
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "ok" }
        },
        required: ["status"]
      }
    }
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Service status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" }
              }
            }
          }
        }
      }
    },
    "/rooms": {
      get: {
        tags: ["Rooms"],
        summary: "List rooms",
        parameters: [
          {
            name: "name",
            in: "query",
            schema: { type: "string" },
            description: "Filter by exact room name"
          },
          {
            name: "type",
            in: "query",
            schema: { $ref: "#/components/schemas/RoomType" },
            description: "Filter by room type"
          }
        ],
        responses: {
          "200": {
            description: "Array of rooms",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RoomsArray" }
              }
            }
          }
        }
      },
      post: {
        tags: ["Rooms"],
        summary: "Create room",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoomCreateInput" }
            }
          }
        },
        responses: {
          "201": {
            description: "Created room",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Room" }
              }
            }
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProblemDetails" }
              }
            }
          }
        }
      }
    },
    "/rooms/{id}": {
      get: {
        tags: ["Rooms"],
        summary: "Get room",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" }
          }
        ],
        responses: {
          "200": {
            description: "Room",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Room" }
              }
            }
          },
          "404": {
            description: "Room not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProblemDetails" }
              }
            }
          }
        }
      },
      patch: {
        tags: ["Rooms"],
        summary: "Update room",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoomUpdateInput" }
            }
          }
        },
        responses: {
          "200": {
            description: "Updated room",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Room" }
              }
            }
          },
          "404": {
            description: "Room not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProblemDetails" }
              }
            }
          }
        }
      },
      delete: {
        tags: ["Rooms"],
        summary: "Delete room",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" }
          }
        ],
        responses: {
          "204": { description: "Room deleted" },
          "404": {
            description: "Room not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProblemDetails" }
              }
            }
          }
        }
      }
    },
    "/customers": {
      get: {
        tags: ["Customers"],
        summary: "List customers",
        parameters: [
          {
            name: "name",
            in: "query",
            schema: { type: "string" },
            description: "Filter by exact name"
          },
          {
            name: "email",
            in: "query",
            schema: { type: "string", format: "email" },
            description: "Filter by email"
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1 },
            description: "Page number (default 1)"
          },
          {
            name: "pageSize",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100 },
            description: "Records per page (default 25)"
          },
          {
            name: "include",
            in: "query",
            schema: { type: "string", example: "bookings" },
            description:
              "Comma separated expansions. Use `bookings` to include each customer's bookings."
          }
        ],
        responses: {
          "200": {
            description: "Paginated customers",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/PaginatedCustomersResponse" },
                    {
                      $ref: "#/components/schemas/PaginatedCustomersWithBookingsResponse"
                    }
                  ]
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Customers"],
        summary: "Create customer",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CustomerCreateInput" }
            }
          }
        },
        responses: {
          "201": {
            description: "Created customer",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Customer" }
              }
            }
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProblemDetails" }
              }
            }
          }
        }
      }
    },
    "/customers/{id}": {
      get: {
        tags: ["Customers"],
        summary: "Get customer",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": {
            description: "Customer",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Customer" }
              }
            }
          },
          "404": {
            description: "Customer not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProblemDetails" }
              }
            }
          }
        }
      },
      patch: {
        tags: ["Customers"],
        summary: "Update customer",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CustomerUpdateInput" }
            }
          }
        },
        responses: {
          "200": {
            description: "Updated customer",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Customer" }
              }
            }
          },
          "404": {
            description: "Customer not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProblemDetails" }
              }
            }
          }
        }
      },
      delete: {
        tags: ["Customers"],
        summary: "Delete customer",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "204": { description: "Customer deleted" },
          "404": {
            description: "Customer not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProblemDetails" }
              }
            }
          }
        }
      }
    },
    "/bookings": {
      get: {
        tags: ["Bookings"],
        summary: "List bookings",
        parameters: [
          {
            name: "customerId",
            in: "query",
            schema: { type: "string", format: "uuid" },
            description: "Filter by customer id"
          },
          {
            name: "roomId",
            in: "query",
            schema: { type: "string", format: "uuid" },
            description: "Filter by room id"
          },
          {
            name: "status",
            in: "query",
            schema: { $ref: "#/components/schemas/BookingStatus" },
            description: "Filter by booking status"
          }
        ],
        responses: {
          "200": {
            description: "Array of bookings",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BookingsArray" }
              }
            }
          }
        }
      },
      post: {
        tags: ["Bookings"],
        summary: "Create booking",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BookingCreateInput" }
            }
          }
        },
        responses: {
          "201": {
            description: "Created booking",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Booking" }
              }
            }
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProblemDetails" }
              }
            }
          }
        }
      }
    },
    "/bookings/{id}": {
      get: {
        tags: ["Bookings"],
        summary: "Get booking",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": {
            description: "Booking",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Booking" }
              }
            }
          },
          "404": {
            description: "Booking not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProblemDetails" }
              }
            }
          }
        }
      },
      patch: {
        tags: ["Bookings"],
        summary: "Update booking",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BookingUpdateInput" }
            }
          }
        },
        responses: {
          "200": {
            description: "Updated booking",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Booking" }
              }
            }
          },
          "404": {
            description: "Booking not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProblemDetails" }
              }
            }
          }
        }
      },
      delete: {
        tags: ["Bookings"],
        summary: "Delete booking",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "204": { description: "Booking deleted" },
          "404": {
            description: "Booking not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProblemDetails" }
              }
            }
          }
        }
      }
    },
    "/docs/openapi.json": {
      get: {
        tags: ["Docs"],
        summary: "Download OpenAPI document",
        responses: {
          "200": {
            description: "OpenAPI specification",
            content: {
              "application/json": {
                schema: { type: "object" }
              }
            }
          }
        }
      }
    },
    "/docs": {
      get: {
        tags: ["Docs"],
        summary: "Swagger UI",
        responses: {
          "200": {
            description: "Interactive documentation",
            content: {
              "text/html": {
                schema: { type: "string" }
              }
            }
          }
        }
      }
    }
  }
} as const;

export type OpenApiDocument = typeof openApiDocument;
