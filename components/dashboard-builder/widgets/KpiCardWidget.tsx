"use client";
// components/dashboard-builder/widgets/KpiCardWidget.tsx
// Real data: GET /dashboard/stats via useDashboardStats hook.
// Mock KPI_DATA and DEFAULT_KPIS constants removed entirely.

import { Users, DollarSign, TrendingUp, Target, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboard";
import type { DashboardStats } from "@/lib/api/dashboardApi";

interface KpiCardWidgetProps {
  isPreview?: boolean;
  widgetId?: string;
}

// ── Format helpers — display only, no business logic ────────────────────────
function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtNumber(n: number): string {
  return n.toLocaleString();
}

// ── Build metric rows from real stats ────────────────────────────────────────
// change deltas are intentionally absent — the backend /dashboard/stats does not
// return period-over-period deltas. We display the raw counts only.
function buildMetrics(stats: DashboardStats, widgetId?: string) {
  const all = [
    { label: "Total Leads",      value: fmtNumber(stats.leadsCount),              icon: Users,       color: "#6366f1" },
    { label: "Pipeline Value",   value: fmtCurrency(stats.totalDealValue),         icon: DollarSign,  color: "#10b981" },
    { label: "Revenue",          value: fmtCurrency(stats.revenue),                icon: TrendingUp,  color: "#8b5cf6" },
    { label: "Overdue Tasks",    value: fmtNumber(stats.overdueTasks),             icon: Target,      color: "#f59e0b" },
    { label: "Emails Sent",      value: fmtNumber(stats.emailsSent),               icon: DollarSign,  color: "#6366f1" },
    { label: "Calls Today",      value: fmtNumber(stats.callsToday),               icon: Users,       color: "#10b981" },
  ];

  // Show 3 metrics relevant to the widgetId slot, else default first 3
  if (widgetId === "deals-kpi")   return all.slice(1, 4);
  if (widgetId === "revenue-kpi") return [all[2], all[0], all[3]];
  return all.slice(0, 3); // default / leads-kpi
}

export function KpiCardWidget({ isPreview, widgetId }: KpiCardWidgetProps) {
  const { data: stats, loading, error, refetch } = useDashboardStats();

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col gap-3 p-1">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex-1 bg-gray-50 rounded-xl p-3 animate-pulse flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 w-16 bg-gray-200 rounded" />
              <div className="h-5 w-20 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !stats) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center p-3">
        <AlertCircle size={20} className="text-red-400" />
        <p className="text-xs text-gray-500">{error ?? "Failed to load stats"}</p>
        <button onClick={refetch} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
          <RefreshCw size={11} /> Retry
        </button>
      </div>
    );
  }

  const metrics = buildMetrics(stats, widgetId);

  return (
    <div className="h-full flex flex-col gap-3 p-1">
      {metrics.map((metric, i) => {
        const Icon = metric.icon;
        return (
          <div
            key={i}
            className="flex-1 bg-gray-50 rounded-xl p-3 flex items-center gap-3 min-h-0"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: metric.color + "18" }}
            >
              <Icon size={16} style={{ color: metric.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 truncate">{metric.label}</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{metric.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
