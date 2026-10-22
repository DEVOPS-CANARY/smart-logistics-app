"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../lib/api-base";

type Status = "checking" | "operational" | "degraded";

const LABELS: Record<Status, string> = {
  checking: "Checking service status…",
  operational: "All systems operational",
  degraded: "Service degraded"
};

const DOT_CLASSES: Record<Status, string> = {
  checking: "bg-slate-400",
  operational: "bg-emerald-500",
  degraded: "bg-amber-500"
};

// Polls the API's readiness endpoint (which also checks the database) so
// visitors can see at a glance whether the platform is healthy.
export default function ServiceStatusBadge({
  intervalMs = 30000
}: {
  intervalMs?: number;
}) {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`${API_BASE_URL}/health/readiness`, {
          cache: "no-store"
        });
        if (!cancelled) {
          setStatus(res.ok ? "operational" : "degraded");
        }
      } catch {
        if (!cancelled) {
          setStatus("degraded");
        }
      }
    }

    check();
    const timer = setInterval(check, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700"
    >
      <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[status]}`} />
      {LABELS[status]}
    </span>
  );
}
