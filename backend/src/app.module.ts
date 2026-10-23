import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { CacheModule } from "@nestjs/cache-manager";
import { seconds, ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import Redis from "ioredis";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ShipmentsModule } from "./shipments/shipments.module";
import { CouriersModule } from "./couriers/couriers.module";
import { TrackingModule } from "./tracking/tracking.module";
import { UsersModule } from "./users/users.module";
import { AuditModule } from "./audit/audit.module";
import { HttpThrottlerGuard } from "./common/guards/http-throttler.guard";
import { REDIS_CLIENT, RedisModule } from "./redis/redis.module";

@Module({
  imports: [
    RedisModule,
    // Counted in Redis when it's configured, so limits hold across replicas
    // (with in-memory counters, 2 replicas would allow twice the limit).
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis | null) => ({
        throttlers: [
          {
            name: "short",
            ttl: seconds(60),
            limit: 60
          }
        ],
        storage: redis ? new ThrottlerStorageRedisService(redis) : undefined
      })
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 30000,
      max: 100
    }),
    PrismaModule,
    AuthModule,
    ShipmentsModule,
    CouriersModule,
    TrackingModule,
    UsersModule,
    AuditModule
  ],
  controllers: [HealthController],
  providers: [
    // Restrict global throttling to HTTP requests so websocket tracking stays stable.
    { provide: APP_GUARD, useClass: HttpThrottlerGuard }
  ]
})
export class AppModule {}
