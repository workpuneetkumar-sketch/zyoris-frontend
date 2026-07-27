"use client";
// components/dashboard-builder/widgets/ActivitiesWidget.tsx

import { Phone, Mail, MessageSquare, Calendar, FileText } from "lucide-react";

const ACTIVITIES = [
  { type: "CALL", title: "Called Acme Corp", user: "Sarah K.", time: "5m ago", icon: Phone, color: "#10b981" },
  { type: "EMAIL", title: "Sent proposal to TechFlow", user: "Mark J.", time: "22m ago", icon: Mail, color: "#3b82f6" },
  { type: "MEETING", title: "Demo with BlueStar", user: "Sarah K.", time: "1h ago", icon: Calendar, color: "#f59e0b" },
  { type: "NOTE", title: "Updated lead notes", user: "Alex R.", time: "2h ago", icon: FileText, color: "#8b5cf6" },
  { type: "MESSAGE", title: "WhatsApp to Vertex Inc.", user: "Mark J.", time: "3h ago", icon: MessageSquare, color: "#25d366" },
];

export function ActivitiesWidget({ isPreview }: { isPreview?: boolean }) {
  return (
    <div className="h-full flex flex-col gap-1 overflow-hidden">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Recent Activity</p>
      {ACTIVITIES.map((a, i) => {
        const Icon = a.icon;
        return (
          <div key={i} className="flex items-center gap-2.5 py-1">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: a.color + "18" }}>
              <Icon size={11} style={{ color: a.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{a.title}</p>
              <p className="text-[10px] text-gray-400">{a.user}</p>
            </div>
            <p className="text-[10px] text-gray-400 flex-shrink-0">{a.time}</p>
          </div>
        );
      })}
    </div>
  );
}
