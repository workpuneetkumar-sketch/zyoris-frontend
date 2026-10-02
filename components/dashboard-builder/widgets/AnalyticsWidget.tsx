"use client";
// components/dashboard-builder/widgets/AnalyticsWidget.tsx
// Real data: GET /analytics/demand/trends via useDemandTrends hook.
// Mock const data (27,100 visitors / 5,420 conversions / +18.4% MoM / Feb-Jul bars) removed entirely.
// "MoM" badge removed — backend does not return period-over-period deltas.

import { RefreshCw, AlertCircle, BarChart2 } from "lucide-react";
import { useDemandTrends } from "@/hooks/useDashboard";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import type { DemandTrendsData } from "@/lib/api/dashboardApi";

function shortDate(label?: string): string {
  if (!label) return "";
  try {
    const d = new Date(label);
    if (isNaN(d.getTime())) return label;
    return d.toLocaleDateString("en-US", { month: "short" });
  } catch {
    return label;
  }
}

function fmtK(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v);
}

export function AnalyticsWidget({ isPreview }: { isPreview?: boolean }) {
  const { data: trends, loading, error, refetch } = useDemandTrends();

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2 animate-pulse">
        <div className="flex items-center gap-4">
          <div>
            <div className="h-3 w-12 bg-gray-100 rounded mb-1" />
            <div className="h-5 w-16 bg-gray-200 rounded" />
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div>
            <div className="h-3 w-16 bg-gray-100 rounded mb-1" />
            <div className="h-5 w-16 bg-gray-200 rounded" />
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

  const points: DemandTrendsData["inventoryRisk"] = trends?.inventoryRisk ?? [];

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (!points || points.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1 p-3 text-center">
        <BarChart2 size={20} className="text-gray-300" />
        <p className="text-xs text-gray-400">No demand trend data yet</p>
      </div>
    );
  }

  // Build chart data from real points
  const chartData = points.slice(-8).map((p: any) => ({
    month:       shortDate(p.date ?? p.month ?? ""),
    demand:      p.demand ?? p.visitors ?? 0,
    conversions: p.inventory ?? p.conversions ?? 0,
  }));

  const totalDemand      = chartData.reduce((s, p) => s + p.demand, 0);
  const totalConversions = chartData.reduce((s, p) => s + p.conversions, 0);

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-[10px] text-gray-400">Demand</p>
          <p className="text-base font-extrabold text-gray-900">{fmtK(totalDemand)}</p>
        </div>
        <div className="w-px h-8 bg-gray-100" />
        <div>
          <p className="text-[10px] text-gray-400">Inventory</p>
          <p className="text-base font-extrabold text-violet-600">{fmtK(totalConversions)}</p>
        </div>
        {trends?.overallTrend && (
          <div className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full capitalize">
            {trends.overallTrend}
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={14} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
            <Tooltip
              formatter={(v: number, name: string) => [fmtK(v), name]}
              contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
            />
            <Bar dataKey="demand"      fill="#e0e7ff" radius={[4, 4, 0, 0]} name="Demand" />
            <Bar dataKey="conversions" fill="#6366f1" radius={[4, 4, 0, 0]} name="Inventory" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
