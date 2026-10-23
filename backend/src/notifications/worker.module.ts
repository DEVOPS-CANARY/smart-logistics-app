import { Module } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsConsumer } from "./notifications.consumer";

// The worker's whole application: no HTTP server, no controllers.
@Module({
  imports: [PrismaModule],
  providers: [AuditService, NotificationsConsumer]
})
export class WorkerModule {}
