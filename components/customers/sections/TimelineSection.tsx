"use client";

import { Activity } from "lucide-react";
import { useCustomerTimeline } from "@/hooks/useCustomerTimeline";
import { SectionCard } from "../SectionCard";
import { SectionEmpty, SectionError, SectionLoading } from "../SectionStates";
import { formatDateTime } from "../primitives";
import { ProvenanceBadge } from "../ProvenanceBadge";
import type { CustomerTimelineEvent } from "@/types/customer360";

function eventProvenance(event: CustomerTimelineEvent) {
  if (!event.source || event.source === "INTERNAL") return null;
  return {
    source: event.source,
    channel: event.channel ?? null,
    confidence: event.confidence ?? null,
    externalId: event.externalId ?? null,
    observedAt: event.timestamp ?? null,
  };
}

function humanizeEventType(type: string): string {
  return type.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TimelineSection({ customerId }: { customerId: string }) {
  const { events, loading, loadingMore, error, hasMore, loadMore, reload } =
    useCustomerTimeline(customerId);

  return (
    <SectionCard
      id="timeline"
      title="Timeline"
      icon={Activity}
      description="Unified activity across every connected system"
    >
      {loading ? (
        <SectionLoading label="Loading timeline…" />
      ) : error ? (
        <SectionError message={error.message} onRetry={reload} />
      ) : events.length === 0 ? (
        <SectionEmpty
          title="No timeline events yet"
          description="Activity from CRM, billing, support and other systems will appear here."
        />
      ) : (
        <div className="flex flex-col">
          <ol className="relative border-l border-border-light pl-5">
            {events.map((event) => {
              const prov = eventProvenance(event);
              return (
                <li key={event.id} className="mb-5 last:mb-0">
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-primary" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-text">
                      {humanizeEventType(event.eventType)}
                    </span>
                    {prov ? <ProvenanceBadge provenance={prov} /> : (
                      <span className="rounded-full border border-border-light bg-background-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                        Internal
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-text-secondary">
                    {formatDateTime(event.timestamp)}
                    {event.actorName ? ` · ${event.actorName}` : ""}
                  </div>
                </li>
              );
            })}
          </ol>

          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-2 self-start rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface-hover disabled:opacity-60"
            >
              {loadingMore ? "Loading…" : "Load older events"}
            </button>
          )}
        </div>
      )}
    </SectionCard>
  );
}
