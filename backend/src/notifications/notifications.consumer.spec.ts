import { NotificationsConsumer } from "./notifications.consumer";

const event = {
  type: "tracking.created",
  version: 1,
  eventId: "t1",
  shipmentId: "s1",
  status: "PICKED_UP",
  occurredAt: "2026-10-23T10:00:00.000Z"
};
const message = (value: unknown) => Buffer.from(JSON.stringify(value));

function setup(alreadySent: boolean) {
  const prisma = {
    auditLog: {
      findFirst: jest.fn().mockResolvedValue(alreadySent ? { id: "a1" } : null)
    }
  } as any;
  const auditService = { log: jest.fn().mockResolvedValue(undefined) } as any;
  return {
    prisma,
    auditService,
    consumer: new NotificationsConsumer(prisma, auditService)
  };
}

describe("NotificationsConsumer.handle", () => {
  it("records one notification per tracking event", async () => {
    const { prisma, auditService, consumer } = setup(false);

    await consumer.handle(message(event));

    expect(prisma.auditLog.findFirst).toHaveBeenCalledWith({
      where: {
        actionType: "NOTIFICATION_SENT",
        targetId: "s1",
        metadata: { path: ["eventId"], equals: "t1" }
      },
      select: { id: true }
    });
    expect(auditService.log).toHaveBeenCalledWith({
      actionType: "NOTIFICATION_SENT",
      targetType: "Shipment",
      targetId: "s1",
      metadata: {
        eventId: "t1",
        status: "PICKED_UP",
        channel: "email (simulated)"
      }
    });
  });

  it("skips an event that was already notified (redelivery)", async () => {
    const { auditService, consumer } = setup(true);

    await consumer.handle(message(event));

    expect(auditService.log).not.toHaveBeenCalled();
  });

  it.each([
    ["empty", null],
    ["not JSON", Buffer.from("not json")],
    ["another event type", message({ ...event, type: "shipment.deleted" })],
    ["a future version", message({ ...event, version: 2 })],
    ["missing shipmentId", message({ ...event, shipmentId: undefined })]
  ])("skips a message that isn't a tracking event (%s)", async (_, value) => {
    const { prisma, auditService, consumer } = setup(false);

    await consumer.handle(value as Buffer | null);

    expect(prisma.auditLog.findFirst).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });
});
