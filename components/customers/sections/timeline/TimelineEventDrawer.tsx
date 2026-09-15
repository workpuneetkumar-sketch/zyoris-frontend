"use client";

// components/customers/sections/timeline/TimelineEventDrawer.tsx
// Expandable event-detail panel for the Customer 360 timeline.
//
// Purely presentational: it receives the already-loaded CustomerTimelineEvent
// and an onClose callback. It holds NO pagination / fetch state, so opening or
// closing it never touches useCustomerTimeline — the timeline list, cursor and
// filters are untouched while the drawer is open.

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, Radio, User, X } from "lucide-react";
import type { CustomerTimelineEvent } from "@/types/customer360";
import { ProvenanceBadge } from "../../ProvenanceBadge";
import { formatDateTime } from "../../primitives";
import { CommunicationEventDetails } from "./CommunicationEventDetails";
import {
  CATEGORY_STYLES,
  categoryOf,
  eventProvenance,
  eventSummary,
  humanizeEventType,
  isCommunicationEvent,
  relatedEntitiesOf,
} from "./eventPresentation";

function formatConfidence(confidence?: number | null): string | null {
  if (confidence == null || Number.isNaN(confidence)) return null;
  const pct = confidence <= 1 ? confidence * 100 : confidence;
  return `${Math.round(pct)}%`;
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <span className="text-xs text-text">{children}</span>
    </div>
  );
}

export function TimelineEventDrawer({
  event,
  onClose,
}: {
  event: CustomerTimelineEvent | null;
  onClose: () => void;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!event) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [event, handleKeyDown]);

  if (!event) return null;

  const category = categoryOf(event);
  const style = CATEGORY_STYLES[category];
  const Icon = style.icon;
  const provenance = eventProvenance(event);
  const summary = eventSummary(event);
  const related = relatedEntitiesOf(event);
  const confidence = formatConfidence(event.confidence);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${humanizeEventType(event.eventType)} details`}
        className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border-light px-5 py-4">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${style.iconClass}`}
            >
              <Icon size={15} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-text">
                {humanizeEventType(event.eventType)}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.chipClass}`}
                >
                  {style.label}
                </span>
                {provenance ? (
                  <ProvenanceBadge provenance={provenance} />
                ) : (
                  <span className="rounded-full border border-border-light bg-background-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    Internal
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-text-muted hover:bg-surface-hover"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {summary && (
            <p className="text-sm leading-relaxed text-text-secondary">{summary}</p>
          )}

          <div className="flex flex-col gap-2">
            <MetaRow label="When">
              <time dateTime={event.timestamp}>{formatDateTime(event.timestamp)}</time>
            </MetaRow>
            {event.actorName && (
              <MetaRow label="Actor">
                <span className="inline-flex items-center gap-1">
                  <User size={12} />
                  {event.actorName}
                </span>
              </MetaRow>
            )}
            {event.channel && (
              <MetaRow label="Channel">
                <span className="inline-flex items-center gap-1">
                  <Radio size={12} />
                  {event.channel}
                </span>
              </MetaRow>
            )}
            {event.source && <MetaRow label="Source">{event.source}</MetaRow>}
            {confidence && <MetaRow label="Confidence">{confidence}</MetaRow>}
            {event.externalId && (
              <MetaRow label="External ID">
                <span className="break-all font-mono text-[11px]">
                  {event.externalId}
                </span>
              </MetaRow>
            )}
          </div>

          {isCommunicationEvent(event) && <CommunicationEventDetails event={event} />}

          {related.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Related
              </span>
              <div className="flex flex-wrap gap-1.5">
                {related.map((ref) =>
                  ref.href ? (
                    <Link
                      key={ref.id}
                      href={ref.href}
                      className="inline-flex items-center gap-0.5 rounded-md border border-border-light bg-surface px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-surface-hover"
                      title={`${ref.type ? `${ref.type}: ` : ""}${ref.id}`}
                    >
                      {ref.label}
                      <ArrowUpRight size={11} />
                    </Link>
                  ) : (
                    <span
                      key={ref.id}
                      className="inline-flex items-center rounded-md border border-border-light bg-background-secondary px-1.5 py-0.5 text-[11px] font-medium text-text-secondary"
                      title={`${ref.type ? `${ref.type}: ` : ""}${ref.id}`}
                    >
                      {ref.label}
                    </span>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
