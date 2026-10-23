import "./env/load-env";
import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { RedisIoAdapter } from "./redis/redis-io.adapter";
import { redisUrl } from "./redis/redis.config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === "production" ? undefined : false,
      crossOriginEmbedderPolicy: false
    })
  );

  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  const allowedOrigins =
    allowedOriginsEnv
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  app.enableCors({
    origin:
      allowedOrigins.length > 0 ? allowedOrigins : "http://localhost:3000",
    credentials: true,
    maxAge: 86400
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  if (process.env.NODE_ENV !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Smart Logistics API")
      .setDescription(
        "REST API for shipment management, courier assignment, real-time tracking, and audit logging"
      )
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document);
  }

  if (redisUrl()) {
    app.useWebSocketAdapter(new RedisIoAdapter(app));
  } else {
    new Logger("Bootstrap").warn(
      "REDIS_URL is not set: WebSocket events and rate limits stay in this process. Run a single replica."
    );
  }

  app.enableShutdownHooks();

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
}

bootstrap();
