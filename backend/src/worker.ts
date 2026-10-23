import "./env/load-env";
import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./notifications/worker.module";

// Entry point of the notification worker: `node dist/worker.js`, the backend
// image run as its own Deployment. On any fatal error it exits, so Kubernetes
// restarts it.
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks(); // SIGTERM: stop consuming, commit offsets, exit
}

const exitOnError = (error: unknown) => {
  new Logger("Worker").error(error);
  process.exit(1);
};
process.on("unhandledRejection", exitOnError);
bootstrap().catch(exitOnError);
