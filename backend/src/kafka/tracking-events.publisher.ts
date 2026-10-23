import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit
} from "@nestjs/common";
import { KafkaJS } from "@confluentinc/kafka-javascript";
import { createKafka, kafkaBrokers, trackingEventsTopic } from "./kafka.config";
import { TrackingEvent } from "./tracking-event";

const RECONNECT_DELAY_MS = 10_000;

// Publishes tracking events to Kafka. Best effort, on purpose: if Kafka is
// down, recording a tracking update still succeeds and the event is logged as
// not published. Guaranteeing delivery needs an outbox (plan §7), not this.
@Injectable()
export class TrackingEventsPublisher
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(TrackingEventsPublisher.name);
  private producer: KafkaJS.Producer | null = null;
  private connected = false;
  private stopping = false;

  onModuleInit() {
    if (kafkaBrokers().length === 0) {
      this.logger.warn(
        "KAFKA_BROKERS is not set: tracking events are not published."
      );
      return;
    }

    this.producer = createKafka("logistics-backend").producer({
      // Give up on a message after 5 s instead of librdkafka's 5 minutes, so a
      // Kafka outage can't hold an API request open.
      "message.timeout.ms": 5000,
      kafkaJS: { idempotent: true, allowAutoTopicCreation: false }
    });
    // In the background: the API starts and serves even while Kafka is down.
    void this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.producer?.connect();
      this.connected = true;
      this.logger.log(`Publishing tracking events to ${trackingEventsTopic()}`);
    } catch (error) {
      if (this.stopping) {
        return;
      }
      this.logger.warn(
        `Kafka not reachable (${(error as Error).message}); retrying in ${RECONNECT_DELAY_MS / 1000} s.`
      );
      setTimeout(() => void this.connect(), RECONNECT_DELAY_MS).unref();
    }
  }

  async publish(event: Omit<TrackingEvent, "type" | "version">) {
    if (!this.producer) {
      return;
    }
    if (!this.connected) {
      this.logger.error(
        `Tracking event ${event.eventId} not published: Kafka not connected`
      );
      return;
    }

    const message: TrackingEvent = {
      type: "tracking.created",
      version: 1,
      ...event
    };
    try {
      await this.producer.send({
        topic: trackingEventsTopic(),
        messages: [{ key: event.shipmentId, value: JSON.stringify(message) }]
      });
    } catch (error) {
      this.logger.error(
        `Tracking event ${event.eventId} not published: ${(error as Error).message}`
      );
    }
  }

  async onApplicationShutdown() {
    this.stopping = true;
    if (this.connected) {
      await this.producer?.disconnect(); // flushes messages still in flight
    }
  }
}
