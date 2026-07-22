"use client";

import { Clock } from "lucide-react";

interface ActivityWidgetProps {
  title: string;
  activities: Array<{
    id: string;
    user: string;
    action: string;
    target: string;
    timestamp: string;
  }>;
}

const MOCK_ACTIVITIES = [
  { id: "1", user: "Alice J.", action: "created a new deal", target: "Acme Corp - Enterprise", timestamp: "2 min ago" },
  { id: "2", user: "Bob S.", action: "sent proposal to", target: "Globex Inc", timestamp: "15 min ago" },
  { id: "3", user: "Carol W.", action: "updated lead status for", target: "Initech", timestamp: "1 hour ago" },
  { id: "4", user: "Dave B.", action: "scheduled meeting with", target: "Umbrella Co", timestamp: "2 hours ago" },
  { id: "5", user: "Eve D.", action: "closed deal with", target: "Stark Ind", timestamp: "3 hours ago" },
  { id: "6", user: "Frank L.", action: "added note to", target: "Hooli - Project X", timestamp: "5 hours ago" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function ActivityWidget({ title }: ActivityWidgetProps) {
  const activities = MOCK_ACTIVITIES;

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </h3>
      </div>
      <div className="flex-1 overflow-auto px-4 pb-2 space-y-1">
        {activities.map((act) => (
          <div
            key={act.id}
            className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
              {getInitials(act.user)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700 leading-relaxed">
                <span className="font-semibold text-gray-900">{act.user}</span>{" "}
                {act.action}{" "}
                <span className="font-medium text-gray-900">{act.target}</span>
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock size={10} className="text-gray-400" />
                <span className="text-[10px] text-gray-400">{act.timestamp}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
