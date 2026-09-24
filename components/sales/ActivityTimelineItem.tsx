"use client";

import React from "react";
import {
  Building2,
  Briefcase,
  User,
  ChevronRight,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { CapturedActivity } from "@/types/salesExecution";
import SourceBadge from "./SourceBadge";

interface ActivityTimelineItemProps {
  activity: CapturedActivity;
  onClick: (activity: CapturedActivity) => void;
}

export const ActivityTimelineItem: React.FC<ActivityTimelineItemProps> = ({
  activity,
  onClick,
}) => {
  const dateFormatted = activity.occurredAt
    ? new Date(activity.occurredAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : activity.receivedAt
    ? new Date(activity.receivedAt).toLocaleDateString()
    : "—";

  const customerName =
    activity.customer?.name ||
    activity.customer?.companyName ||
    activity.company?.name ||
    null;

  const dealTitle =
    activity.deal?.title ||
    activity.deal?.name ||
    null;

  const contactName =
    activity.contact?.name ||
    null;

  // Extract clean participant emails or names (avoiding raw uppercase "SENDER"/"RECIPIENT")
  const validParticipants = (activity.participants || [])
    .map((p) => p.email || p.name)
    .filter((val): val is string => Boolean(val && !["SENDER", "RECIPIENT", "ACTOR"].includes(val.toUpperCase())));

  const displayParticipants = validParticipants.slice(0, 2);
  const remainingCount = validParticipants.length - displayParticipants.length;

  const titleText =
    activity.subject ||
    (activity.channel === "WHATSAPP"
      ? "WhatsApp Message"
      : activity.channel === "CALLS"
      ? "Sales Call"
      : activity.channel === "CALENDAR"
      ? "Calendar Event"
      : activity.channel === "MEETINGS"
      ? "Sales Meeting"
      : "Email Communication");

  return (
    <div
      className="sales-timeline-card"
      onClick={() => onClick(activity)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick(activity);
        }
      }}
    >
      {/* Left Channel Icon Squircle */}
      <div className="sales-timeline-avatar-wrap">
        <SourceBadge channel={activity.channel} source={activity.source} variant="icon" />
      </div>

      {/* Center Main Content */}
      <div className="sales-timeline-body">
        {/* Header Row: Title & Channel Tag */}
        <div className="sales-timeline-title-row">
          <h3 className="sales-timeline-title">{titleText}</h3>

          <SourceBadge
            channel={activity.channel}
            source={activity.source}
            variant="badge"
          />

          {activity.duplicateStatus && activity.duplicateStatus !== "UNIQUE" && (
            <span
              className="sales-status-chip sales-status-chip-warning"
              title={`Duplicate: ${activity.duplicateStatus}`}
            >
              <AlertTriangle size={11} />
              <span>Duplicate</span>
            </span>
          )}
        </div>

        {/* Content Snippet */}
        {activity.content && activity.content !== activity.subject && (
          <p className="sales-timeline-snippet">{activity.content}</p>
        )}

        {/* Association Chips: Only shown if real data exists */}
        {(customerName || dealTitle || contactName || displayParticipants.length > 0) && (
          <div className="sales-timeline-tags-row">
            {customerName && (
              <span className="sales-pill sales-pill-customer" title="Associated Customer">
                <Building2 size={12} />
                <span>{customerName}</span>
              </span>
            )}

            {dealTitle && (
              <span className="sales-pill sales-pill-deal" title="Associated Deal">
                <Briefcase size={12} />
                <span>{dealTitle}</span>
                {activity.deal?.stage && (
                  <span className="sales-pill-sub">{activity.deal.stage}</span>
                )}
              </span>
            )}

            {contactName && (
              <span className="sales-pill sales-pill-contact" title="Contact">
                <User size={12} />
                <span>{contactName}</span>
              </span>
            )}

            {displayParticipants.map((p, idx) => (
              <span key={idx} className="sales-pill sales-pill-participant">
                {p}
              </span>
            ))}

            {remainingCount > 0 && (
              <span className="sales-pill sales-pill-participant">
                +{remainingCount} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Timestamp & Action */}
      <div className="sales-timeline-end">
        <div className="sales-timeline-timestamp">
          <Clock size={12} />
          <span>{dateFormatted}</span>
        </div>

        <div className="sales-timeline-action">
          <span>View Details</span>
          <ChevronRight size={14} />
        </div>
      </div>
    </div>
  );
};

export default ActivityTimelineItem;
