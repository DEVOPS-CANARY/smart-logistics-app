import { BadRequestException, NotFoundException } from "@nestjs/common";
import { TrackingGateway } from "./tracking.gateway";
import { TrackingService } from "./tracking.service";
import { CreateTrackingDto } from "./dto/create-tracking.dto";

describe("TrackingService", () => {
  it("create allows COURIER to create tracking event only for assigned shipments", async () => {
    const prisma = {
      shipment: {
        update: jest.fn().mockResolvedValue({})
      },
      trackingEvent: {
        create: jest.fn().mockResolvedValue({
          id: "t1",
          createdAt: new Date("2026-03-21T12:00:00.000Z")
        })
      }
    } as any;

    const gateway: TrackingGateway = {
      emitShipmentUpdate: jest.fn()
    } as any;
    const events = { publish: jest.fn().mockResolvedValue(undefined) } as any;

    const auditService = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const accessControlService = {
      assertShipmentAccess: jest.fn().mockResolvedValue({
        id: "s1",
        status: "PICKED_UP"
      })
    } as any;
    const service = new TrackingService(
      prisma,
      gateway,
      auditService,
      accessControlService,
      events
    );

    const dto: CreateTrackingDto = {
      status: "IN_TRANSIT" as any,
      note: "On the way"
    } as any;

    await service.create("s1", dto, { userId: "u1", role: "COURIER" });

    expect(prisma.trackingEvent.create).toHaveBeenCalledWith({
      data: {
        shipmentId: "s1",
        status: dto.status,
        locationLat: dto.locationLat,
        locationLng: dto.locationLng,
        note: dto.note
      }
    });
    expect(prisma.shipment.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { status: dto.status }
    });
    expect(gateway.emitShipmentUpdate).toHaveBeenCalledWith({
      shipmentId: "s1",
      status: dto.status,
      locationLat: dto.locationLat,
      locationLng: dto.locationLng,
      note: dto.note,
      createdAt: new Date("2026-03-21T12:00:00.000Z")
    });
    expect(events.publish).toHaveBeenCalledWith({
      eventId: "t1",
      shipmentId: "s1",
      status: "IN_TRANSIT",
      note: "On the way",
      locationLat: dto.locationLat,
      locationLng: dto.locationLng,
      occurredAt: "2026-03-21T12:00:00.000Z"
    });
  });

  it("create throws NotFoundException when COURIER is not assigned", async () => {
    const prisma = {
      shipment: {
        update: jest.fn()
      },
      trackingEvent: {
        create: jest.fn()
      }
    } as any;

    const gateway: TrackingGateway = {
      emitShipmentUpdate: jest.fn()
    } as any;

    const auditService = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const accessControlService = {
      assertShipmentAccess: jest
        .fn()
        .mockRejectedValue(new NotFoundException("Shipment Not Found"))
    } as any;
    const service = new TrackingService(
      prisma,
      gateway,
      auditService,
      accessControlService,
      { publish: jest.fn().mockResolvedValue(undefined) } as any
    );

    const dto: CreateTrackingDto = {
      status: "IN_TRANSIT" as any
    } as any;

    await expect(
      service.create("s1", dto, { userId: "u1", role: "COURIER" })
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.trackingEvent.create).not.toHaveBeenCalled();
  });

  it("create rejects invalid status transitions", async () => {
    const prisma = {
      shipment: {
        update: jest.fn()
      },
      trackingEvent: {
        create: jest.fn()
      }
    } as any;

    const gateway: TrackingGateway = {
      emitShipmentUpdate: jest.fn()
    } as any;

    const auditService = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const accessControlService = {
      assertShipmentAccess: jest.fn().mockResolvedValue({
        id: "s1",
        status: "ASSIGNED"
      })
    } as any;
    const service = new TrackingService(
      prisma,
      gateway,
      auditService,
      accessControlService,
      { publish: jest.fn().mockResolvedValue(undefined) } as any
    );

    await expect(
      service.create("s1", { status: "DELIVERED", note: "done" } as any, {
        userId: "u1",
        role: "COURIER"
      })
    ).rejects.toThrow("Invalid status transition");
  });

  it("create requires a note when marking shipment as DELIVERED", async () => {
    const prisma = {
      shipment: {
        update: jest.fn()
      },
      trackingEvent: {
        create: jest.fn()
      }
    } as any;

    const gateway: TrackingGateway = {
      emitShipmentUpdate: jest.fn()
    } as any;

    const auditService = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const accessControlService = {
      assertShipmentAccess: jest.fn().mockResolvedValue({
        id: "s1",
        status: "IN_TRANSIT"
      })
    } as any;
    const service = new TrackingService(
      prisma,
      gateway,
      auditService,
      accessControlService,
      { publish: jest.fn().mockResolvedValue(undefined) } as any
    );

    await expect(
      service.create("s1", { status: "DELIVERED" } as any, {
        userId: "u1",
        role: "COURIER"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("findByShipment returns tracking events for ADMIN", async () => {
    const prisma = {
      shipment: {
        findUnique: jest.fn().mockResolvedValue({ id: "s1" })
      },
      trackingEvent: {
        findMany: jest.fn().mockResolvedValue([{ id: "t1" }, { id: "t2" }])
      }
    } as any;

    const gateway: TrackingGateway = {
      emitShipmentUpdate: jest.fn()
    } as any;

    const auditService = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const accessControlService = {
      assertShipmentAccess: jest.fn().mockResolvedValue({})
    } as any;
    const service = new TrackingService(
      prisma,
      gateway,
      auditService,
      accessControlService,
      { publish: jest.fn().mockResolvedValue(undefined) } as any
    );

    const result = await service.findByShipment("s1", {
      userId: "admin",
      role: "ADMIN"
    });

    expect(prisma.trackingEvent.findMany).toHaveBeenCalledWith({
      where: { shipmentId: "s1" },
      orderBy: { createdAt: "asc" }
    });
    expect(result).toEqual([{ id: "t1" }, { id: "t2" }]);
  });

  it("findByShipment returns tracking events for COURIER when assigned", async () => {
    const prisma = {
      shipment: {
        findUnique: jest.fn().mockResolvedValue({
          id: "s1",
          assignedCourierId: "c1",
          createdById: "u2"
        })
      },
      courier: {
        findUnique: jest.fn().mockResolvedValue({ id: "c1", userId: "u1" })
      },
      trackingEvent: {
        findMany: jest.fn().mockResolvedValue([{ id: "t1" }])
      }
    } as any;

    const gateway: TrackingGateway = {
      emitShipmentUpdate: jest.fn()
    } as any;

    const auditService = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const accessControlService = {
      assertShipmentAccess: jest.fn().mockResolvedValue({})
    } as any;
    const service = new TrackingService(
      prisma,
      gateway,
      auditService,
      accessControlService,
      { publish: jest.fn().mockResolvedValue(undefined) } as any
    );

    const result = await service.findByShipment("s1", {
      userId: "u1",
      role: "COURIER"
    });

    expect(prisma.trackingEvent.findMany).toHaveBeenCalledWith({
      where: { shipmentId: "s1" },
      orderBy: { createdAt: "asc" }
    });
    expect(result).toEqual([{ id: "t1" }]);
  });

  it("findByShipment throws NotFoundException for COURIER when not assigned", async () => {
    const prisma = {
      shipment: {
        findUnique: jest.fn().mockResolvedValue({
          id: "s1",
          assignedCourierId: "c2",
          createdById: "u2"
        })
      },
      courier: {
        findUnique: jest.fn().mockResolvedValue({ id: "c1", userId: "u1" })
      },
      trackingEvent: {
        findMany: jest.fn()
      }
    } as any;

    const gateway: TrackingGateway = {
      emitShipmentUpdate: jest.fn()
    } as any;

    const auditService = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const accessControlService = {
      assertShipmentAccess: jest
        .fn()
        .mockRejectedValue(new NotFoundException("Shipment Not Found"))
    } as any;
    const service = new TrackingService(
      prisma,
      gateway,
      auditService,
      accessControlService,
      { publish: jest.fn().mockResolvedValue(undefined) } as any
    );

    const result = service.findByShipment("s1", {
      userId: "u1",
      role: "COURIER"
    });

    await expect(result).rejects.toBeInstanceOf(NotFoundException);
  });
});
