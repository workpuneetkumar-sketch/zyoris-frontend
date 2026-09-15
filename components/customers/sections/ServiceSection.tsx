"use client";

import { LifeBuoy } from "lucide-react";
import type { CustomerServiceSummary } from "@/types/customer360";
import { provenanceOf, unwrap } from "@/types/customer360";
import { SectionCard } from "../SectionCard";
import { SectionEmpty } from "../SectionStates";
import { StatTile, formatDate } from "../primitives";
import { ProvenanceBadge } from "../ProvenanceBadge";

export function ServiceSection({
  service,
}: {
  service?: CustomerServiceSummary | null;
}) {
  const openTickets = unwrap(service?.openTickets ?? null);
  const breached = unwrap(service?.breachedSlas ?? null);
  const csat = unwrap(service?.csat ?? null);
  const recent = service?.recentTickets ?? [];

  const hasContent =
    service != null &&
    (openTickets != null || breached != null || csat != null || recent.length > 0);

  return (
    <SectionCard
      id="service"
      title="Service"
      icon={LifeBuoy}
      description="Support load, SLA health and recent tickets"
    >
      {!hasContent ? (
        <SectionEmpty
          title="No service data linked"
          description="Ticket counts and SLA status from the support system will appear here."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile
              label="Open tickets"
              value={openTickets != null ? openTickets : null}
              provenance={provenanceOf(service?.openTickets ?? null)}
            />
            <StatTile
              label="Breached SLAs"
              value={breached != null ? breached : null}
              provenance={provenanceOf(service?.breachedSlas ?? null)}
            />
            <StatTile
              label="CSAT"
              value={csat != null ? csat : null}
              provenance={provenanceOf(service?.csat ?? null)}
            />
          </div>

          {recent.length > 0 && (
            <ul className="flex flex-col divide-y divide-border-light">
              {recent.map((ticket) => (
                <li key={ticket.id} className="flex flex-wrap items-center gap-2 py-2.5 first:pt-0 last:pb-0">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                    {ticket.subject}
                  </span>
                  <span className="rounded-full bg-background-secondary px-2 py-0.5 text-[11px] font-semibold capitalize text-text-secondary">
                    {ticket.status}
                  </span>
                  {ticket.priority && (
                    <span className="text-[11px] uppercase tracking-wide text-text-muted">
                      {ticket.priority}
                    </span>
                  )}
                  {ticket.updatedAt && (
                    <span className="text-[11px] text-text-muted">{formatDate(ticket.updatedAt)}</span>
                  )}
                  <ProvenanceBadge provenance={ticket.provenance} />
                </li>
              ))}
            </ul>
          )}

          {service?.lastTicketAt && (
            <p className="text-[11px] text-text-muted">
              Last ticket activity {formatDate(service.lastTicketAt)}
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}
