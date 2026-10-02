"use client";
// components/dashboard-builder/widgets/ActivitiesWidget.tsx
// Real data: GET /activities/timeline via useActivityFeed hook.
// Mock const ACTIVITIES removed entirely.

import { Phone, Mail, MessageSquare, Calendar, FileText, Clock, RefreshCw, AlertCircle } from "lucide-react";
import { useActivityFeed } from "@/hooks/useDashboard";
import type { TimelineActivity } from "@/lib/api/dashboardApi";

const TYPE_META: Record<string, { icon: React.ElementType; color: string }> = {
  CALL:    { icon: Phone,         color: "#10b981" },
  EMAIL:   { icon: Mail,          color: "#3b82f6" },
  MEETING: { icon: Calendar,      color: "#f59e0b" },
  NOTE:    { icon: FileText,      color: "#8b5cf6" },
  MESSAGE: { icon: MessageSquare, color: "#25d366" },
  WHATSAPP:{ icon: MessageSquare, color: "#25d366" },
  TASK:    { icon: Clock,         color: "#ec4899" },
};
const DEFAULT_META = { icon: FileText, color: "#94a3b8" };

function getTypeMeta(type: string) {
  return TYPE_META[(type ?? "").toUpperCase()] ?? DEFAULT_META;
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ActivitiesWidget({ isPreview }: { isPreview?: boolean }) {
  const { data: items, loading, error, refetch } = useActivityFeed(5);

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Recent Activity</p>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 py-1 animate-pulse">
            <div className="w-6 h-6 rounded-lg bg-gray-100 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-2.5 bg-gray-100 rounded w-3/4" />
              <div className="h-2 bg-gray-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
        <AlertCircle size={16} className="text-red-400" />
        <p className="text-[10px] text-gray-500">{error}</p>
        <button onClick={refetch} className="flex items-center gap-1 text-[10px] text-indigo-600 hover:underline">
          <RefreshCw size={9} /> Retry
        </button>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1">
        <p className="text-[10px] text-gray-400">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-1 overflow-hidden">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Recent Activity</p>
      {items.map((a: TimelineActivity, i: number) => {
        const meta = getTypeMeta(a.type);
        const Icon = meta.icon;
        const title = a.message ?? a.title ?? "Activity";
        const user  = a.createdBy?.name ?? "";
        const time  = relativeTime(a.timestamp ?? a.createdAt);

        return (
          <div key={a.id ?? i} className="flex items-center gap-2.5 py-1">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: meta.color + "18" }}
            >
              <Icon size={11} style={{ color: meta.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{title}</p>
              {user && <p className="text-[10px] text-gray-400">{user}</p>}
            </div>
            <p className="text-[10px] text-gray-400 flex-shrink-0">{time}</p>
          </div>
        );
      })}
    </div>
  );
}
