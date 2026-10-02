"use client";
// components/dashboard-builder/widgets/RevenueWidget.tsx
// Real data: GET /analytics/revenue/forecast via useRevenueForecast hook.
// Mock REVENUE_DATA (Feb-Jul hardcoded), "$128K", "103% of target" removed entirely.
// "% of target" badge is OMITTED — the backend does not return a target value,
// so we must not fabricate or compute it here.

import { TrendingUp, TrendingDown, RefreshCw, AlertCircle, DollarSign } from "lucide-react";
import { useRevenueForecast } from "@/hooks/useDashboard";
import type { ForecastDatapoint } from "@/lib/api/dashboardApi";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

function fmt(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

function shortLabel(label: string): string {
  // backend returns "YYYY-MM-DD" — show "MMM DD"
  try {
    const d = new Date(label);
    if (isNaN(d.getTime())) return label;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return label;
  }
}

interface TooltipProps { active?: boolean; payload?: any[]; label?: string; }
function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{shortLabel(label ?? "")}</p>
      <p className="text-indigo-600">Forecast: {fmt(payload[0]?.value ?? 0)}</p>
    </div>
  );
}

export function RevenueWidget({ isPreview }: { isPreview?: boolean }) {
  const { data: forecast, loading, error, refetch } = useRevenueForecast();

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2 animate-pulse">
        <div className="flex items-start gap-3 px-1">
          <div>
            <div className="h-7 w-20 bg-gray-200 rounded mb-1" />
            <div className="h-3 w-28 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="flex-1 bg-gray-50 rounded-xl" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
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

  const points: ForecastDatapoint[] = forecast?.datapoints ?? [];

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (points.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1 p-3 text-center">
        <DollarSign size={20} className="text-gray-300" />
        <p className="text-xs text-gray-400">No revenue forecast data yet</p>
      </div>
    );
  }

  // Latest point as the headline value
  const latest = points[points.length - 1];
  const prev   = points.length > 1 ? points[points.length - 2] : null;
  const trending = prev ? (latest.forecast >= prev.forecast ? "up" : "down") : null;

  // Last 12 points for the chart
  const chartData = points.slice(-12).map((p) => ({
    label: shortLabel(p.label),
    value: p.forecast,
  }));

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start gap-3 mb-2 px-1">
        <div>
          <p className="text-xl font-bold text-gray-900">{fmt(latest.forecast)}</p>
          <p className="text-xs text-gray-500">Revenue forecast</p>
        </div>
        {trending && (
          <div className={`ml-auto flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
            trending === "up"
              ? "text-emerald-600 bg-emerald-50"
              : "text-red-500 bg-red-50"
          }`}>
            {trending === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            Trending {trending}
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={fmt} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ r: 2, fill: "#6366f1" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
