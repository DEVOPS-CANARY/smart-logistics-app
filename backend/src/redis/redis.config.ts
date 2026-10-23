import { Logger } from "@nestjs/common";
import Redis, { RedisOptions } from "ioredis";

// Redis is optional. With REDIS_URL set (the cluster), WebSocket events and
// rate limits are shared by every backend replica. Without it (local dev,
// tests) they stay inside this process, which is only correct for one replica.
export function redisUrl(): string | undefined {
  return process.env.REDIS_URL?.trim() || undefined;
}

// Every key and pub/sub channel this app uses starts with this prefix (e.g.
// "logistics:uat:"). The Redis user is only allowed that prefix, so
// environments sharing one Redis can't read each other's keys or messages.
export function redisKeyPrefix(): string {
  return process.env.REDIS_KEY_PREFIX?.trim() ?? "";
}

export function createRedisClient(
  name: string,
  options: RedisOptions = {}
): Redis {
  const url = redisUrl();
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }

  const client = new Redis(url, {
    connectionName: name,
    // The ready check runs INFO, which the app's Redis user may not run
    // (least privilege); readiness is checked by /health/readiness instead.
    enableReadyCheck: false,
    ...options
  });
  const logger = new Logger(`Redis:${name}`);
  // ioredis reconnects by itself; log instead of "Unhandled error event".
  client.on("error", (error: Error) => logger.warn(error.message));
  return client;
}
