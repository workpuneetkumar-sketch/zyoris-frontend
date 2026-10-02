"use client";
// components/dashboard-builder/widgets/ActivityWidget.tsx
// Real data: GET /activities/timeline via useActivityFeed hook.
// Mock const ACTIVITIES removed entirely.

import { Phone, Mail, MessageSquare, Calendar, Users, Clock, RefreshCw, AlertCircle } from "lucide-react";
import { useActivityFeed } from "@/hooks/useDashboard";
import type { TimelineActivity } from "@/lib/api/dashboardApi";

// ── Icon / colour mapping by activity type ────────────────────────────────────
const TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  CALL:     { icon: Phone,          color: "#10b981", bg: "#f0fdf4" },
  EMAIL:    { icon: Mail,           color: "#6366f1", bg: "#eef2ff" },
  MEETING:  { icon: Calendar,       color: "#f59e0b", bg: "#fffbeb" },
  NOTE:     { icon: MessageSquare,  color: "#8b5cf6", bg: "#f5f3ff" },
  LEAD:     { icon: Users,          color: "#06b6d4", bg: "#ecfeff" },
  TASK:     { icon: Clock,          color: "#ec4899", bg: "#fdf2f8" },
};
const DEFAULT_META = { icon: MessageSquare, color: "#94a3b8", bg: "#f8fafc" };

function getTypeMeta(type: string) {
  return TYPE_META[(type ?? "").toUpperCase()] ?? DEFAULT_META;
}

/** Format ISO timestamp → relative string ("5m ago", "2h ago", "3d ago") */
function relativeTime(isoString?: string): string {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 p-2">
      <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
        <div className="h-2.5 w-1/2 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function ActivityWidget({ isPreview }: { isPreview?: boolean }) {
  const { data: items, loading, error, refetch } = useActivityFeed(10);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col gap-1">
        {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center p-3">
        <AlertCircle size={20} className="text-red-400" />
        <p className="text-xs text-gray-500">{error}</p>
        <button
          onClick={refetch}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
        >
          <RefreshCw size={11} /> Retry
        </button>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (!items || items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1 text-center p-3">
        <Clock size={20} className="text-gray-300" />
        <p className="text-xs text-gray-400">No recent activity yet</p>
      </div>
    );
  }

  // ── Data ─────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {items.map((activity: TimelineActivity) => {
          const meta  = getTypeMeta(activity.type);
          const Icon  = meta.icon;
          const title = activity.message || activity.title || "Activity";
          const desc  = activity.description ?? "";
          const user  = (activity.createdBy?.name) ?? "";
          const time  = relativeTime(activity.timestamp ?? activity.createdAt);

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: meta.bg }}
              >
                <Icon size={14} style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{title}</p>
                {desc && <p className="text-xs text-gray-500 truncate">{desc}</p>}
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {user && `${user} · `}{time}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
