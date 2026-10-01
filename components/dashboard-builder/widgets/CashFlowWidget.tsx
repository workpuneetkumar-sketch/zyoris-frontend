"use client";
// components/dashboard-builder/widgets/CashFlowWidget.tsx
// Real data: GET /analytics/revenue/forecast via useRevenueForecast.
// The backend returns a single revenue forecast series (no separate inflow/outflow split).
// Mock CASHFLOW_DATA (Jan-Jul inflow/outflow arrays) removed entirely.
// We render the forecast series as the primary line.
// Outflow line is OMITTED — the backend does not return expense time-series here.
// If a real inflow/outflow split endpoint is added later, the /dashboard/cfo endpoint
// provides expensesSummary.totalExpenses (a single number, not a time-series).

import { RefreshCw, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { useRevenueForecast } from "@/hooks/useDashboard";
import type { ForecastDatapoint } from "@/lib/api/dashboardApi";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

function fmt(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

function shortLabel(label: string): string {
  try {
    const d = new Date(label);
    if (isNaN(d.getTime())) return label;
    return d.toLocaleDateString("en-US", { month: "short" });
  } catch { return label; }
}

interface TooltipProps { active?: boolean; payload?: any[]; label?: string; }
function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{shortLabel(label ?? "")}</p>
      <p className="text-indigo-600">Revenue: {fmt(payload[0]?.value ?? 0)}</p>
    </div>
  );
}

export function CashFlowWidget({ isPreview }: { isPreview?: boolean }) {
  const { data: forecast, loading, error, refetch } = useRevenueForecast();

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2 animate-pulse">
        <div className="flex gap-4 px-1">
          <div className="space-y-1">
            <div className="h-3 w-28 bg-gray-100 rounded" />
            <div className="h-6 w-20 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="flex-1 bg-gray-50 rounded-xl" />
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

  const points: ForecastDatapoint[] = forecast?.datapoints ?? [];

  if (points.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1 p-3 text-center">
        <p className="text-xs text-gray-400">No revenue data available</p>
      </div>
    );
  }

  const latest  = points[points.length - 1];
  const prev    = points.length > 1 ? points[points.length - 2] : null;
  const isUp    = prev ? latest.forecast >= prev.forecast : true;
  const chartData = points.slice(-8).map((p) => ({
    month: shortLabel(p.label),
    value: p.forecast,
  }));

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-4 mb-2 px-1">
        <div>
          <p className="text-xs text-gray-500">Revenue Forecast</p>
          <p className="text-xl font-bold" style={{ color: isUp ? "#10b981" : "#ef4444" }}>
            {fmt(latest.forecast)}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-500">Trend</p>
          <p className="text-sm font-semibold flex items-center gap-1" style={{ color: isUp ? "#10b981" : "#ef4444" }}>
            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isUp ? "Upward" : "Downward"}
          </p>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={fmt} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#cfGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
