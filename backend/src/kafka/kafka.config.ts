import { KafkaJS } from "@confluentinc/kafka-javascript";

// Kafka is optional, like Redis. With KAFKA_BROKERS set (the cluster), tracking
// updates are published as events; without it (local dev, tests) they aren't.
export function kafkaBrokers(): string[] {
  return (process.env.KAFKA_BROKERS ?? "")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean);
}

// Every topic and consumer group starts with this prefix (e.g.
// "uat.logistics."), the only one this environment's Kafka user may use.
export function kafkaTopicPrefix(): string {
  return process.env.KAFKA_TOPIC_PREFIX?.trim() ?? "";
}

export function trackingEventsTopic(): string {
  return `${kafkaTopicPrefix()}tracking-events`;
}

export function createKafka(clientId: string): KafkaJS.Kafka {
  const username = process.env.KAFKA_USERNAME?.trim();
  const password = process.env.KAFKA_PASSWORD;

  return new KafkaJS.Kafka({
    kafkaJS: {
      clientId,
      brokers: kafkaBrokers(),
      ssl: false,
      sasl:
        username && password
          ? { mechanism: "scram-sha-512", username, password }
          : undefined,
      logLevel: KafkaJS.logLevel.WARN
    }
  });
}
