import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException
} from "@nestjs/common";
import Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS_CLIENT } from "../redis/redis.module";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null
  ) {}

  @Get()
  getHealth() {
    return {
      status: "ok"
    };
  }

  @Get("readiness")
  async readiness() {
    try {
      // Simple DB connectivity check used by orchestrators/load balancers.
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException("Database readiness check failed");
    }

    // Without Redis, events and rate limits would silently stop being shared,
    // so the pod reports not ready instead.
    if (this.redis) {
      try {
        if (this.redis.status !== "ready") {
          throw new Error(this.redis.status);
        }
        await this.redis.ping();
      } catch {
        throw new ServiceUnavailableException("Redis readiness check failed");
      }
    }

    return { status: "ok" };
  }
}
