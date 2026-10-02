"use client";
// components/dashboard-builder/widgets/AIInsightsWidget.tsx
// Real data: GET /dashboard/anomalies via useDashboardAnomalies hook.
// Mock INSIGHTS array with hardcoded text ("Acme Enterprise is 15 days past...",
// "pipeline velocity improved by 18%", fake "LIVE" badge) removed entirely.
// Action buttons dispatch zii:open-with-context event (existing Zii integration contract).

import { Brain, TrendingUp, AlertTriangle, Lightbulb, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { useDashboardAnomalies } from "@/hooks/useDashboard";
import type { DashboardAnomalyItem } from "@/lib/api/dashboardApi";

const SEVERITY_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  HIGH:   { icon: AlertTriangle, color: "#ef4444", bg: "#fef2f2" },
  MEDIUM: { icon: TrendingUp,   color: "#f59e0b", bg: "#fffbeb" },
  LOW:    { icon: Lightbulb,    color: "#10b981", bg: "#f0fdf4" },
};
const DEFAULT_META = { icon: Lightbulb, color: "#8b5cf6", bg: "#f5f3ff" };

function openZii(item: DashboardAnomalyItem) {
  window.dispatchEvent(
    new CustomEvent("zii:open-with-context", {
      detail: {
        pageId:          null,
        pageTitle:       item.title,
        contextMarkdown: `${item.description}\n\nMetric: ${item.metric}\nChange: ${item.change}`,
        seedMessage:     `${item.recommendation}`,
      },
    })
  );
}

export function AIInsightsWidget({ isPreview }: { isPreview?: boolean }) {
  const { data: anomalies, loading, error, refetch } = useDashboardAnomalies();

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2">
        <div className="flex items-center gap-2 pb-1">
          <div className="w-6 h-6 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="flex-1 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl p-2.5 bg-gray-50 animate-pulse h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 p-3 text-center">
        <AlertCircle size={20} className="text-red-400" />
        <p className="text-xs text-gray-500">{error}</p>
        <button onClick={refetch} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
          <RefreshCw size={11} /> Retry
        </button>
      </div>
    );
  }

  const items: DashboardAnomalyItem[] = anomalies?.anomalies ?? [];

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center gap-2 pb-1">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Brain size={12} className="text-white" />
        </div>
        <p className="text-xs font-bold text-gray-700">AI Anomaly Detection</p>
        {items.length > 0 && (
          <span className="ml-auto text-[9px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full">
            {items.length} alert{items.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1 text-center">
          <Sparkles size={20} className="text-gray-300" />
          <p className="text-xs text-gray-400">No anomalies detected</p>
          <p className="text-[10px] text-gray-400 opacity-70">All metrics within normal range</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {items.map((ins) => {
            const meta = SEVERITY_META[(ins.severity ?? "").toUpperCase()] ?? DEFAULT_META;
            const Icon = meta.icon;
            return (
              <div
                key={ins.id}
                className="rounded-xl p-2.5 border"
                style={{ backgroundColor: meta.bg, borderColor: meta.color + "30" }}
              >
                <div className="flex items-start gap-2">
                  <Icon size={12} style={{ color: meta.color }} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-gray-800 truncate">{ins.title}</p>
                    <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-2">{ins.description}</p>
                    {ins.change && (
                      <p className="text-[10px] font-bold mt-0.5" style={{ color: meta.color }}>
                        {ins.change}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openZii(ins)}
                  aria-label={`Action: ${ins.recommendation}`}
                  className="mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-lg hover:opacity-80 active:scale-95 focus-visible:outline-none focus-visible:ring-1 transition"
                  style={{ color: meta.color, backgroundColor: meta.color + "18" }}
                >
                  {ins.recommendation?.slice(0, 40) || "View details"} →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
