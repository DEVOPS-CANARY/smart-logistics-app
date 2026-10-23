import { Global, Inject, Module, OnApplicationShutdown } from "@nestjs/common";
import Redis from "ioredis";
import { createRedisClient, redisKeyPrefix, redisUrl } from "./redis.config";

// The shared Redis connection for keys (rate limits, readiness), or null when
// REDIS_URL is not set. Socket.io opens its own pub/sub pair (RedisIoAdapter).
export const REDIS_CLIENT = Symbol("REDIS_CLIENT");

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis | null =>
        redisUrl()
          ? createRedisClient("app", { keyPrefix: redisKeyPrefix() })
          : null
    }
  ],
  exports: [REDIS_CLIENT]
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis | null) {}

  async onApplicationShutdown() {
    await this.redis?.quit();
  }
}
