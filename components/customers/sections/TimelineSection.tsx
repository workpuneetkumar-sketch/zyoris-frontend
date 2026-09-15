"use client";

// components/customers/sections/TimelineSection.tsx
// Canonical Customer 360 Timeline.
//
// Wired straight to Prashant's timeline API via useCustomerTimeline →
// fetchCustomerTimeline → GET /api/customers/:id/timeline?cursor=&types=&from=&to=
// No mocks, no adapters: events render exactly as the backend returns them and
// filters are sent as the backend's own `eventType` enum values.

import { useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { useCustomerTimeline } from "@/hooks/useCustomerTimeline";
import type { CustomerTimelineEvent } from "@/types/customer360";
import { SectionCard } from "../SectionCard";
import { SectionEmpty, SectionError, SectionLoading } from "../SectionStates";
import { TimelineFilters } from "./timeline/TimelineFilters";
import { TimelineEvent } from "./timeline/TimelineEvent";
import { TimelineEventDrawer } from "./timeline/TimelineEventDrawer";

export function TimelineSection({ customerId }: { customerId: string }) {
  const {
    events,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    reload,
    filters,
    setFilters,
    clearFilters,
    isFiltered,
    knownEventTypes,
  } = useCustomerTimeline(customerId);

  // Drawer selection is local view state only — deliberately kept out of
  // useCustomerTimeline so opening/closing an event never refetches the list or
  // resets the cursor / active filters.
  const [selectedEvent, setSelectedEvent] =
    useState<CustomerTimelineEvent | null>(null);

  const showFilters = knownEventTypes.length > 0 || isFiltered;

  return (
    <SectionCard
      id="timeline"
      title="Timeline"
      icon={Activity}
      description="Unified activity across every connected system"
      action={
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text hover:bg-surface-hover disabled:opacity-60"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : undefined} />
          Refresh
        </button>
      }
    >
      {showFilters && (
        <TimelineFilters
          filters={filters}
          knownEventTypes={knownEventTypes}
          events={events}
          isFiltered={isFiltered}
          onChange={setFilters}
          onClear={clearFilters}
          disabled={loading}
        />
      )}

      {loading ? (
        <SectionLoading label="Loading timeline…" />
      ) : error ? (
        <SectionError message={error.message} onRetry={reload} />
      ) : events.length === 0 ? (
        isFiltered ? (
          <SectionEmpty
            title="No events match these filters"
            description="Try widening the date range or clearing some event types."
          />
        ) : (
          <SectionEmpty
            title="No timeline events yet"
            description="Activity, deals, tasks, invoices and payments will appear here as they happen."
          />
        )
      ) : (
        <div className="flex flex-col gap-4">
          <ol className="relative ml-3 flex flex-col gap-5 border-l border-border-light">
            {events.map((event) => (
              <TimelineEvent
                key={event.id}
                event={event}
                onOpen={setSelectedEvent}
              />
            ))}
          </ol>

          <div className="flex items-center gap-3">
            {hasMore ? (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface-hover disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : "Load older events"}
              </button>
            ) : (
              <span className="text-[11px] text-text-muted">
                {events.length} event{events.length === 1 ? "" : "s"} · end of timeline
              </span>
            )}
          </div>
        </div>
      )}

      <TimelineEventDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </SectionCard>
  );
}
