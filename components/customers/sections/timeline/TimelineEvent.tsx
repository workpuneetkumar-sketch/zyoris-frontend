"use client";

// components/customers/sections/timeline/TimelineEvent.tsx
// One row in the Customer 360 timeline.
//
// Renders every fact the backend event carries: type icon + label, actor,
// channel, timestamp, confidence/provenance, and links to related entities.

import Link from "next/link";
import { ArrowUpRight, Radio, User } from "lucide-react";
import type { CustomerTimelineEvent } from "@/types/customer360";
import { ProvenanceBadge } from "../../ProvenanceBadge";
import { formatDateTime } from "../../primitives";
import {
  CATEGORY_STYLES,
  categoryOf,
  eventProvenance,
  eventSummary,
  humanizeEventType,
  relatedEntitiesOf,
} from "./eventPresentation";

function formatConfidence(confidence?: number | null): string | null {
  if (confidence == null || Number.isNaN(confidence)) return null;
  const pct = confidence <= 1 ? confidence * 100 : confidence;
  return `${Math.round(pct)}%`;
}

export function TimelineEvent({ event }: { event: CustomerTimelineEvent }) {
  const category = categoryOf(event);
  const style = CATEGORY_STYLES[category];
  const Icon = style.icon;

  const provenance = eventProvenance(event);
  const summary = eventSummary(event);
  const related = relatedEntitiesOf(event);
  const confidence = formatConfidence(event.confidence);

  return (
    <li className="relative pl-6">
      <span
        className={`absolute -left-3 top-0 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-surface ${style.iconClass}`}
      >
        <Icon size={13} />
      </span>

      <div className="flex flex-col gap-1.5 pb-1">
        {/* Title row */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-text">
            {humanizeEventType(event.eventType)}
          </span>
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

          {confidence && (
            <span
              className="text-[10px] font-semibold text-text-muted"
              title="Model / pipeline confidence for this event"
            >
              {confidence} confidence
            </span>
          )}
        </div>

        {/* Optional human-readable summary */}
        {summary && (
          <p className="text-xs leading-relaxed text-text-secondary">{summary}</p>
        )}

        {/* Meta row: timestamp · actor · channel */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
          <time dateTime={event.timestamp}>{formatDateTime(event.timestamp)}</time>

          {event.actorName && (
            <span className="inline-flex items-center gap-1">
              <User size={11} />
              {event.actorName}
            </span>
          )}

          {event.channel && (
            <span className="inline-flex items-center gap-1">
              <Radio size={11} />
              {event.channel}
            </span>
          )}
        </div>

        {/* Related entities */}
        {related.length > 0 && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Related
            </span>
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
        )}
      </div>
    </li>
  );
}
