"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io } from "socket.io-client";
import CurrentStatusCard from "../../../components/tracking/current-status-card";
import TrackingHistoryList from "../../../components/tracking/tracking-history-list";
import FeedbackAlert from "../../../components/feedback-alert";
import { FeedbackState, ShipmentUpdate } from "../../../lib/types";
import {
  fetchShipmentById,
  fetchTrackingEvents,
  Shipment
} from "../../../lib/api";
import { redirectToLoginIfUnauthorized } from "../../../lib/route-guards";
import { socketTarget } from "../../../lib/api-base";
import ShipmentSummaryCard from "../../../components/tracking/shipment-summary-card";
import ShipmentProgressCard from "../../../components/tracking/shipment-progress-card";
import TrackingHero from "../../../components/tracking/tracking-hero";

export default function ShipmentTrackingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const shipmentId = typeof params?.id === "string" ? params.id : "";
  const [lastEvent, setLastEvent] = useState<ShipmentUpdate | null>(null);
  const [events, setEvents] = useState<ShipmentUpdate[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);

  useEffect(() => {
    if (!redirectToLoginIfUnauthorized(router)) {
      return;
    }

    if (!shipmentId) {
      return;
    }

    setFeedback(null);
    fetchShipmentById(shipmentId)
      .then((data) => setShipment(data))
      .catch(() => {
        setFeedback({
          type: "error",
          message: "Failed to load shipment details."
        });
      });

    fetchTrackingEvents(shipmentId)
      .then((data) => {
        setEvents(data.slice().reverse());
        setLastEvent(data.length > 0 ? data[data.length - 1] : null);
      })
      .catch(() => {
        setFeedback({
          type: "error",
          message: "Failed to load tracking history."
        });
      });

    const token = localStorage.getItem("access_token");
    const { url, path } = socketTarget();
    const socketOptions = { path, auth: { token } };
    const socket = url ? io(url, socketOptions) : io(socketOptions);

    const handleShipmentUpdate = (payload: ShipmentUpdate) => {
      setLastEvent(payload);
      setEvents((prev) => [payload, ...prev]);
      setShipment((prev) =>
        prev
          ? {
              ...prev,
              status: payload.status
            }
          : prev
      );
    };

    socket.emit("joinShipmentRoom", { shipmentId });
    socket.on("shipment-status-update", handleShipmentUpdate);

    return () => {
      socket.off("shipment-status-update", handleShipmentUpdate);
      socket.emit("leaveShipmentRoom", { shipmentId });
      socket.disconnect();
    };
  }, [router, shipmentId]);

  return (
    <main className="user-experience px-4 py-6 md:px-8 md:py-8">
      <div className="user-page-shell">
        <TrackingHero shipment={shipment} />

        <FeedbackAlert feedback={feedback} />

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <ShipmentSummaryCard shipment={shipment} />
          <ShipmentProgressCard shipment={shipment} events={events} />
          <CurrentStatusCard lastEvent={lastEvent} />
          <TrackingHistoryList events={events} />
        </div>
      </div>
    </main>
  );
}
