"use client";

// components/dashboard-builder/widgets/ActivityWidget.tsx

import { Phone, Mail, MessageSquare, Calendar, Users, Clock } from "lucide-react";

const ACTIVITIES = [
  {
    id: "1",
    type: "CALL",
    title: "Called Acme Corp",
    description: "Discussed Q4 renewal proposal",
    user: "Sarah K.",
    time: "5 min ago",
    icon: Phone,
    color: "#10b981",
    bg: "#f0fdf4",
  },
  {
    id: "2",
    type: "EMAIL",
    title: "Email sent to GlobalTech",
    description: "Sent contract for review",
    user: "John M.",
    time: "23 min ago",
    icon: Mail,
    color: "#6366f1",
    bg: "#eef2ff",
  },
  {
    id: "3",
    type: "MEETING",
    title: "Product demo scheduled",
    description: "Startup Inc. — tomorrow 2 PM",
    user: "Alex R.",
    time: "1 hr ago",
    icon: Calendar,
    color: "#f59e0b",
    bg: "#fffbeb",
  },
  {
    id: "4",
    type: "NOTE",
    title: "Note added to TechVentures",
    description: "Budget confirmed: $50K Q1",
    user: "Priya L.",
    time: "2 hrs ago",
    icon: MessageSquare,
    color: "#8b5cf6",
    bg: "#f5f3ff",
  },
  {
    id: "5",
    type: "LEAD",
    title: "New lead assigned",
    description: "BlueWave Corp → John M.",
    user: "System",
    time: "3 hrs ago",
    icon: Users,
    color: "#06b6d4",
    bg: "#ecfeff",
  },
];

export function ActivityWidget({ isPreview }: { isPreview?: boolean }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {ACTIVITIES.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: activity.bg }}
              >
                <Icon size={14} style={{ color: activity.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{activity.title}</p>
                <p className="text-xs text-gray-500 truncate">{activity.description}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{activity.user} · {activity.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
