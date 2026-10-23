import { Module } from "@nestjs/common";
import { TrackingController } from "./tracking.controller";
import { TrackingService } from "./tracking.service";
import { TrackingGateway } from "./tracking.gateway";
import { AuditModule } from "../audit/audit.module";
import { ShipmentsModule } from "../shipments/shipments.module";
import { JwtModule } from "@nestjs/jwt";
import { jwtConstants } from "../auth/constants";
import { AccessControlModule } from "../auth/access-control.module";
import { KafkaModule } from "../kafka/kafka.module";

@Module({
  imports: [
    AuditModule,
    ShipmentsModule,
    AccessControlModule,
    KafkaModule,
    JwtModule.register({
      secret: jwtConstants.secret
    })
  ],
  controllers: [TrackingController],
  providers: [TrackingService, TrackingGateway]
})
export class TrackingModule {}
