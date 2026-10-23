import { Module } from "@nestjs/common";
import { TrackingEventsPublisher } from "./tracking-events.publisher";

@Module({
  providers: [TrackingEventsPublisher],
  exports: [TrackingEventsPublisher]
})
export class KafkaModule {}
