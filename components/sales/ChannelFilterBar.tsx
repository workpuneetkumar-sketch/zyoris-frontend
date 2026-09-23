"use client";

import React from "react";
import {
  Layers,
  Mail,
  Calendar,
  Phone,
  Video,
  MessageSquare,
} from "lucide-react";
import { ChannelFilterOption, SalesChannel } from "@/types/salesExecution";

interface ChannelFilterBarProps {
  activeChannel: ChannelFilterOption;
  onChange: (channel: ChannelFilterOption) => void;
  counts?: Partial<Record<ChannelFilterOption, number>>;
}

const CHANNELS: { key: ChannelFilterOption; label: string; icon: React.ReactNode }[] = [
  { key: "ALL", label: "All Channels", icon: <Layers size={14} /> },
  { key: "EMAIL", label: "Email", icon: <Mail size={14} /> },
  { key: "CALENDAR", label: "Calendar", icon: <Calendar size={14} /> },
  { key: "CALLS", label: "Calls", icon: <Phone size={14} /> },
  { key: "MEETINGS", label: "Meetings", icon: <Video size={14} /> },
  { key: "WHATSAPP", label: "WhatsApp", icon: <MessageSquare size={14} /> },
];

export const ChannelFilterBar: React.FC<ChannelFilterBarProps> = ({
  activeChannel,
  onChange,
  counts,
}) => {
  return (
    <div className="sales-channel-tabs">
      {CHANNELS.map((ch) => {
        const isActive = activeChannel === ch.key;
        const count = counts?.[ch.key];

        return (
          <button
            key={ch.key}
            type="button"
            className={`sales-channel-tab ${
              isActive ? "sales-channel-tab-active" : ""
            }`}
            onClick={() => onChange(ch.key)}
          >
            {ch.icon}
            <span>{ch.label}</span>
            {typeof count === "number" && (
              <span className="sales-source-pill">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ChannelFilterBar;
