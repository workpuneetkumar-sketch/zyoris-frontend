"use client";

// components/customers/sections/timeline/CommunicationEventDetails.tsx
// Communication-specific presentation for a Customer 360 timeline event.
//
// Consumes ONLY the common timeline DTO (CustomerTimelineEvent) via
// communicationDetailsOf() — no channel-specific API calls. Every field is
// optional and only rendered when the backend supplied it.

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Clock,
  ExternalLink,
  Users,
} from "lucide-react";
import type { CustomerTimelineEvent } from "@/types/customer360";
import { formatDateTime } from "../../primitives";
import {
  communicationDetailsOf,
  directionLabel,
  formatDuration,
  type CommunicationDirection,
} from "./eventPresentation";

function DirectionBadge({ direction }: { direction: CommunicationDirection }) {
  const Icon =
    direction === "inbound"
      ? ArrowDownLeft
      : direction === "outbound"
      ? ArrowUpRight
      : ArrowLeftRight;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-background-secondary px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
      <Icon size={12} />
      {directionLabel(direction)}
    </span>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <span className="break-words text-xs text-text">{value}</span>
    </div>
  );
}

function MiniLink({ label, href }: { label: string; href: string }) {
  if (!/^https?:\/\//i.test(href)) return <MiniField label={label} value={href} />;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        Open
        <ExternalLink size={11} />
      </a>
    </div>
  );
}

export function CommunicationEventDetails({
  event,
}: {
  event: CustomerTimelineEvent;
}) {
  const details = communicationDetailsOf(event);
  if (!details.hasAny) return null;

  const { direction, subject, participants, call, meeting, threadIds } = details;
  const duration = formatDuration(details.durationSeconds);

  const hasCall =
    call.outcome || call.status || call.fromNumber || call.toNumber || call.recordingUrl;
  const hasMeeting =
    meeting.joinUrl ||
    meeting.location ||
    meeting.startsAt ||
    meeting.endsAt ||
    meeting.provider;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-light bg-background-secondary/50 p-3">
      <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
        Communication details
      </span>

      {(direction || duration) && (
        <div className="flex flex-wrap items-center gap-2">
          {direction && <DirectionBadge direction={direction} />}
          {duration && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary">
              <Clock size={12} />
              {duration}
            </span>
          )}
        </div>
      )}

      {subject && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            Subject
          </span>
          <span className="text-sm text-text">{subject}</span>
        </div>
      )}

      {participants.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            <Users size={11} />
            Participants
          </span>
          <div className="flex flex-wrap gap-1.5">
            {participants.map((participant, index) => (
              <span
                key={`${participant.label}-${index}`}
                className="inline-flex items-center gap-1 rounded-md border border-border-light bg-surface px-1.5 py-0.5 text-[11px] text-text-secondary"
                title={participant.email ?? participant.phone ?? participant.label}
              >
                {participant.role && (
                  <span className="font-semibold uppercase text-text-muted">
                    {participant.role}
                  </span>
                )}
                <span className="text-text">{participant.label}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {hasCall && (
        <div className="grid grid-cols-2 gap-2">
          {call.outcome && <MiniField label="Outcome" value={call.outcome} />}
          {call.status && <MiniField label="Status" value={call.status} />}
          {call.fromNumber && <MiniField label="From" value={call.fromNumber} />}
          {call.toNumber && <MiniField label="To" value={call.toNumber} />}
          {call.recordingUrl && <MiniLink label="Recording" href={call.recordingUrl} />}
        </div>
      )}

      {hasMeeting && (
        <div className="grid grid-cols-2 gap-2">
          {meeting.provider && <MiniField label="Platform" value={meeting.provider} />}
          {meeting.location && <MiniField label="Location" value={meeting.location} />}
          {meeting.startsAt && (
            <MiniField label="Starts" value={formatDateTime(meeting.startsAt)} />
          )}
          {meeting.endsAt && (
            <MiniField label="Ends" value={formatDateTime(meeting.endsAt)} />
          )}
          {meeting.joinUrl && <MiniLink label="Join link" href={meeting.joinUrl} />}
        </div>
      )}

      {threadIds.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            References
          </span>
          <div className="flex flex-wrap gap-1.5">
            {threadIds.map((thread) => (
              <span
                key={thread.value}
                className="inline-flex items-center gap-1 rounded-md border border-border-light bg-surface px-1.5 py-0.5 text-[10px] text-text-secondary"
                title={`${thread.label}: ${thread.value}`}
              >
                <span className="font-semibold uppercase text-text-muted">
                  {thread.label}
                </span>
                <span className="font-mono">
                  {thread.value.length > 20
                    ? `${thread.value.slice(0, 10)}…${thread.value.slice(-6)}`
                    : thread.value}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
