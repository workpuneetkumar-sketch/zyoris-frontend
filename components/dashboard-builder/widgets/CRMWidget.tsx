"use client";
// components/dashboard-builder/widgets/CRMWidget.tsx
// Real data:
//   Funnel → GET /api/deals/pipeline-stats via usePipelineStats
//   Recent → GET /activities/timeline via useActivityFeed
// Mock STAGES and RECENT constants removed entirely.

import { RefreshCw, AlertCircle } from "lucide-react";
import { usePipelineStats, useActivityFeed } from "@/hooks/useDashboard";
import type { PipelineStageStat, TimelineActivity } from "@/lib/api/dashboardApi";

const FUNNEL_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#10b981"];

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function CRMWidget({ isPreview }: { isPreview?: boolean }) {
  const pipeline   = usePipelineStats();
  const activities = useActivityFeed(3);

  const loading = pipeline.loading || activities.loading;
  // Isolate errors: show pipeline data even if activities fail
  const funnelError = pipeline.error;
  const error = funnelError; // only block render on pipeline error, not activities

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-16 h-2.5 bg-gray-100 rounded animate-pulse flex-shrink-0" />
              <div className="flex-1 h-1.5 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-px bg-gray-100" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 p-3 text-center">
        <AlertCircle size={20} className="text-red-400" />
        <p className="text-xs text-gray-500">{error}</p>
        <button
          onClick={() => { pipeline.refetch(); activities.refetch(); }}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
        >
          <RefreshCw size={11} /> Retry
        </button>
      </div>
    );
  }

  // ── Build funnel from real stage data ─────────────────────────────────────────
  // getPipelineStats now always returns { stages: [...] }
  const rawStages: PipelineStageStat[] = pipeline.data?.stages ?? [];

  const maxCount = rawStages.reduce((mx, s) => Math.max(mx, s.count ?? 0), 1);
  const stages = rawStages.slice(0, 5).map((s, i) => ({
    label: s.stage ?? "—",
    count: s.count ?? 0,
    pct:   maxCount > 0 ? Math.round(((s.count ?? 0) / maxCount) * 100) : 0,
    color: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
    value: s.totalAmount ?? s.amount ?? s.value ?? 0,
  }));

  // ── Build recent from activity feed ───────────────────────────────────────────
  const recent: { name: string; stage: string; time: string }[] =
    (activities.data ?? []).map((a: TimelineActivity) => ({
      name:  a.message ?? a.title ?? "Activity",
      stage: a.type?.charAt(0).toUpperCase() + (a.type?.slice(1).toLowerCase() ?? ""),
      time:  relativeTime(a.timestamp ?? a.createdAt),
    }));

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Funnel — empty guard */}
      {stages.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">No pipeline stages yet</p>
      ) : (
        <div className="space-y-1.5">
          {stages.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <p className="text-[10px] text-gray-500 w-16 flex-shrink-0 truncate">{s.label}</p>
              <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                />
              </div>
              <p className="text-[10px] font-bold text-gray-700 w-6 text-right">{s.count}</p>
            </div>
          ))}
        </div>
      )}

      <div className="h-px bg-gray-100" />

      {/* Recent activity */}
      <div className="flex-1 overflow-hidden space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Recent</p>
        {recent.length === 0 ? (
          <p className="text-xs text-gray-400">No recent activity</p>
        ) : (
          recent.map((r, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{r.name}</p>
                <p className="text-[10px] text-gray-400">{r.stage}</p>
              </div>
              <p className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{r.time}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
