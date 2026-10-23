import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AccessControlService } from "../auth/access-control.service";
import { CreateTrackingDto } from "./dto/create-tracking.dto";
import { TrackingGateway } from "./tracking.gateway";
import { TrackingEventsPublisher } from "../kafka/tracking-events.publisher";

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  ASSIGNED: ["PICKED_UP"],
  PICKED_UP: ["IN_TRANSIT"],
  IN_TRANSIT: ["DELIVERED"]
};

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trackingGateway: TrackingGateway,
    private readonly auditService: AuditService,
    private readonly accessControlService: AccessControlService,
    private readonly trackingEvents: TrackingEventsPublisher
  ) {}

  async create(
    shipmentId: string,
    dto: CreateTrackingDto,
    user: { userId: string; role: string }
  ) {
    const shipment = await this.accessControlService.assertShipmentAccess(
      shipmentId,
      user
    );

    const allowedNextStatuses =
      ALLOWED_STATUS_TRANSITIONS[shipment.status] ?? [];
    if (!allowedNextStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${shipment.status} to ${dto.status}.`
      );
    }

    if (dto.status === "DELIVERED" && !dto.note?.trim()) {
      throw new BadRequestException(
        "A delivery note is required when marking a shipment as DELIVERED."
      );
    }

    const tracking = await this.prisma.trackingEvent.create({
      data: {
        shipmentId,
        status: dto.status,
        locationLat: dto.locationLat,
        locationLng: dto.locationLng,
        note: dto.note
      }
    });

    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: dto.status }
    });

    await this.auditService.log({
      actorUserId: user.userId,
      actionType: "TRACKING_EVENT_CREATED",
      targetType: "Shipment",
      targetId: shipmentId,
      metadata: {
        status: dto.status,
        note: dto.note,
        locationLat: dto.locationLat,
        locationLng: dto.locationLng
      }
    });

    this.trackingGateway.emitShipmentUpdate({
      shipmentId,
      status: dto.status,
      locationLat: dto.locationLat,
      locationLng: dto.locationLng,
      note: dto.note,
      createdAt: tracking.createdAt
    });

    // For other services (e.g. notifications), through Kafka. Never throws.
    await this.trackingEvents.publish({
      eventId: tracking.id,
      shipmentId,
      status: dto.status,
      note: dto.note,
      locationLat: dto.locationLat,
      locationLng: dto.locationLng,
      occurredAt: tracking.createdAt.toISOString()
    });

    return tracking;
  }

  async findByShipment(
    shipmentId: string,
    user: { userId: string; role: string }
  ) {
    await this.accessControlService.assertShipmentAccess(shipmentId, user);

    return this.prisma.trackingEvent.findMany({
      where: { shipmentId },
      orderBy: { createdAt: "asc" }
    });
  }
}
