"use client";

import { LifeBuoy } from "lucide-react";
import { SectionCard } from "../SectionCard";
import { SectionUnavailable } from "../SectionStates";

/**
 * Support load, SLA health and recent tickets for a customer.
 *
 * No frozen Platform contract exists for this yet — the live API docs expose no
 * support/ticketing/SLA surface at all. Tracked in the PR description.
 */
export function ServiceSection() {
  return (
    <SectionCard
      id="service"
      title="Service"
      icon={LifeBuoy}
      description="Support load, SLA health and recent tickets"
    >
      <SectionUnavailable
        title="Not available from the Platform API yet"
        description="There is no frozen support/ticketing contract. This section is wired to render the moment one ships."
      />
    </SectionCard>
  );
}
