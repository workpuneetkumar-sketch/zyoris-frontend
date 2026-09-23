"use client";

import React from "react";
import { Mail, Calendar, Phone, Video, MessageSquare } from "lucide-react";
import { SalesChannel } from "@/types/salesExecution";

interface SourceBadgeProps {
  channel: SalesChannel | string;
  source?: string | null;
  variant?: "icon" | "badge";
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  channel,
  source,
  variant = "badge",
}) => {
  const normChannel = (channel || "").toUpperCase() as SalesChannel;

  let icon = <Mail size={14} />;
  let channelClass = "email";
  let label = "Email";

  switch (normChannel) {
    case "CALENDAR":
      icon = <Calendar size={14} />;
      channelClass = "calendar";
      label = "Calendar";
      break;
    case "CALLS":
      icon = <Phone size={14} />;
      channelClass = "calls";
      label = "Calls";
      break;
    case "MEETINGS":
      icon = <Video size={14} />;
      channelClass = "meetings";
      label = "Meetings";
      break;
    case "WHATSAPP":
      icon = <MessageSquare size={14} />;
      channelClass = "whatsapp";
      label = "WhatsApp";
      break;
    case "EMAIL":
    default:
      icon = <Mail size={14} />;
      channelClass = "email";
      label = "Email";
      break;
  }

  if (variant === "icon") {
    return (
      <div
        className={`sales-channel-avatar sales-channel-avatar-${channelClass}`}
        title={`${label} (${source || "Direct"})`}
      >
        {icon}
      </div>
    );
  }

  return (
    <span className={`sales-channel-pill sales-channel-pill-${channelClass}`}>
      {icon}
      <span>{label}</span>
      {source && source !== "DIRECT" && source !== "MANUAL" && (
        <span className="sales-channel-sub">{source}</span>
      )}
    </span>
  );
};

export default SourceBadge;
