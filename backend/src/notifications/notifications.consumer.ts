import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown
} from "@nestjs/common";
import { KafkaJS } from "@confluentinc/kafka-javascript";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  createKafka,
  kafkaBrokers,
  kafkaTopicPrefix,
  trackingEventsTopic
} from "../kafka/kafka.config";
import { parseTrackingEvent } from "../kafka/tracking-event";

// The notification worker (src/worker.ts, its own Deployment): reads tracking
// events and sends one notification per event. Sending is simulated: it's
// recorded in the audit log as NOTIFICATION_SENT, after NOTIFY_DELAY_MS, which
// stands in for a real email or SMS call.
@Injectable()
export class NotificationsConsumer
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(NotificationsConsumer.name);
  private readonly delayMs = Number(process.env.NOTIFY_DELAY_MS ?? 0);
  private consumer: KafkaJS.Consumer | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async onApplicationBootstrap() {
    if (kafkaBrokers().length === 0) {
      throw new Error("KAFKA_BROKERS is not set: nothing to consume");
    }

    const groupId = `${kafkaTopicPrefix()}notifications`;
    this.consumer = createKafka("logistics-notifications").consumer({
      kafkaJS: { groupId, fromBeginning: true }
    });
    await this.consumer.connect();
    await this.consumer.subscribe({ topics: [trackingEventsTopic()] });
    // A thrown error (e.g. the database is down) means the message is
    // delivered again later: nothing is lost.
    await this.consumer.run({
      eachMessage: async ({ message }) => this.handle(message.value)
    });
    this.logger.log(`Consuming ${trackingEventsTopic()} as group ${groupId}`);
  }

  async handle(value: Buffer | null) {
    const event = parseTrackingEvent(value);
    if (!event) {
      // Skipped, not retried: a bad message must not block the partition.
      this.logger.warn("Skipped a message that isn't a tracking event");
      return;
    }

    // Kafka delivers at least once: after a crash the same event can arrive
    // again, so one already notified is skipped.
    const alreadySent = await this.prisma.auditLog.findFirst({
      where: {
        actionType: "NOTIFICATION_SENT",
        targetId: event.shipmentId,
        metadata: { path: ["eventId"], equals: event.eventId }
      },
      select: { id: true }
    });
    if (alreadySent) {
      this.logger.log(`Event ${event.eventId} already notified; skipped`);
      return;
    }

    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
    await this.auditService.log({
      actionType: "NOTIFICATION_SENT",
      targetType: "Shipment",
      targetId: event.shipmentId,
      metadata: {
        eventId: event.eventId,
        status: event.status,
        channel: "email (simulated)"
      }
    });
    this.logger.log(`Shipment ${event.shipmentId}: notified "${event.status}"`);
  }

  async onApplicationShutdown() {
    await this.consumer?.disconnect(); // commits the offsets of handled messages
  }
}
