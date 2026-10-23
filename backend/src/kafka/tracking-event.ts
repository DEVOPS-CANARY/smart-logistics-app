// The message published on <prefix>tracking-events when a tracking update is
// recorded. The Kafka key is the shipment ID, so one shipment's events stay in
// order (same partition). Consumers must accept fields they don't know: new
// fields may be added without changing `version`.
export type TrackingEvent = {
  type: "tracking.created";
  version: 1;
  eventId: string; // the tracking event's ID: consumers use it to skip repeats
  shipmentId: string;
  status: string;
  note?: string;
  locationLat?: number;
  locationLng?: number;
  occurredAt: string; // ISO 8601
};

// Returns the event, or null if the message isn't a version-1 tracking event.
export function parseTrackingEvent(
  value: Buffer | string | null
): TrackingEvent | null {
  if (!value) {
    return null;
  }

  try {
    const event = JSON.parse(value.toString()) as Partial<TrackingEvent>;
    const valid =
      event.type === "tracking.created" &&
      event.version === 1 &&
      typeof event.eventId === "string" &&
      typeof event.shipmentId === "string" &&
      typeof event.status === "string" &&
      typeof event.occurredAt === "string";
    return valid ? (event as TrackingEvent) : null;
  } catch {
    return null;
  }
}
