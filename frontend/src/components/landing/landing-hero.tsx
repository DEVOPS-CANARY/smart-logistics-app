import Link from "next/link";
import ServiceStatusBadge from "./service-status-badge";

type LandingHeroProps = {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
};

export default function LandingHero({
  primaryHref,
  primaryLabel,
  secondaryHref
}: LandingHeroProps) {
  return (
    <section className="landing-hero px-8 py-16 md:px-12 md:py-24">
      <div className="landing-glow -top-48 left-1/2 -translate-x-1/2" />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <div className="landing-animate-in mb-6">
          <ServiceStatusBadge />
        </div>

        <p className="landing-animate-in landing-label">
          Smart Logistics Platform
        </p>

        {/* Hotfix drill: stands in for an unfinished feature that must not reach prod. */}
        <p className="mt-4 text-sm font-semibold text-amber-700">
          NEW: Investment tracking (beta)
        </p>

        <h1 className="landing-animate-in landing-animate-in-delay-1 landing-display mt-6 text-5xl leading-[1.05] text-slate-950 md:text-7xl">
          Shipment operations, simplified.
        </h1>

        <p className="landing-animate-in landing-animate-in-delay-2 landing-muted mx-auto mt-6 max-w-xl text-lg leading-relaxed md:text-xl">
          Track deliveries, coordinate couriers, and manage logistics — all in
          one platform built for modern teams.
        </p>

        <div className="landing-animate-in landing-animate-in-delay-3 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href={primaryHref} className="landing-gradient-btn">
            {primaryLabel}
          </Link>
          <Link href={secondaryHref} className="landing-gradient-btn-outline">
            See How It Works
          </Link>
        </div>
      </div>
    </section>
  );
}
