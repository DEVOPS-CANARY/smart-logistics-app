import { INestApplicationContext } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { ServerOptions } from "socket.io";
import { createRedisClient, redisKeyPrefix } from "./redis.config";

// Socket.io through Redis pub/sub: an event emitted on any replica reaches
// clients connected to every replica. Without it, a client connected to pod B
// never hears about an update handled by pod A.
export class RedisIoAdapter extends IoAdapter {
  private readonly adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext) {
    super(app);
    // Two connections: one in subscriber mode can't publish.
    const pub = createRedisClient("socket.io-pub");
    const sub = createRedisClient("socket.io-sub");
    this.adapterConstructor = createAdapter(pub, sub, {
      key: `${redisKeyPrefix()}socket.io`
    });
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
