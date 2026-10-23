import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("getHealth returns ok status", () => {
    const prisma = {} as any;
    const controller = new HealthController(prisma, null);

    expect(controller.getHealth()).toEqual({ status: "ok" });
  });

  it("readiness returns ok when database is reachable", async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }])
    } as any;
    const controller = new HealthController(prisma, null);

    const result = await controller.readiness();

    expect(result).toEqual({ status: "ok" });
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it("readiness throws ServiceUnavailableException when database is down", async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error("Connection refused"))
    } as any;
    const controller = new HealthController(prisma, null);

    await expect(controller.readiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );
  });

  describe("with Redis configured", () => {
    const prisma = () =>
      ({ $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]) }) as any;

    it("is ready when Redis is connected and answers", async () => {
      const redis = {
        status: "ready",
        ping: jest.fn().mockResolvedValue("PONG")
      } as any;
      const controller = new HealthController(prisma(), redis);

      await expect(controller.readiness()).resolves.toEqual({ status: "ok" });
      expect(redis.ping).toHaveBeenCalled();
    });

    it("is not ready while Redis is reconnecting", async () => {
      const redis = { status: "reconnecting", ping: jest.fn() } as any;
      const controller = new HealthController(prisma(), redis);

      await expect(controller.readiness()).rejects.toBeInstanceOf(
        ServiceUnavailableException
      );
      expect(redis.ping).not.toHaveBeenCalled();
    });

    it("is not ready when Redis refuses the command", async () => {
      const redis = {
        status: "ready",
        ping: jest.fn().mockRejectedValue(new Error("NOPERM"))
      } as any;
      const controller = new HealthController(prisma(), redis);

      await expect(controller.readiness()).rejects.toBeInstanceOf(
        ServiceUnavailableException
      );
    });
  });
});
