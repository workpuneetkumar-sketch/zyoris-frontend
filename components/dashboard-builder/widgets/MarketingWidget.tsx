"use client";
// components/dashboard-builder/widgets/MarketingWidget.tsx
// Real data: GET /dashboard/stats (leads) + GET /analytics/demand/trends (chart).
// Mock const data (285 Leads, $52 CAC, 4.2x ROI, W1-W6 chart) removed entirely.
// CAC and ROI are NOT in the backend response — those cards are omitted.

import { RefreshCw, AlertCircle, TrendingUp } from "lucide-react";
import { useDashboardStats, useDemandTrends } from "@/hooks/useDashboard";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";

function shortLabel(label?: string): string {
  if (!label) return "";
  try {
    const d = new Date(label);
    if (isNaN(d.getTime())) return label;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return label; }
}

export function MarketingWidget({ isPreview }: { isPreview?: boolean }) {
  const stats   = useDashboardStats();
  const trends  = useDemandTrends();

  const loading = stats.loading || trends.loading;
  const error   = stats.error ?? trends.error;

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2 animate-pulse">
        <div className="grid grid-cols-2 gap-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-2 text-center">
              <div className="h-5 w-12 mx-auto bg-gray-200 rounded mb-1" />
              <div className="h-2.5 w-16 mx-auto bg-gray-100 rounded" />
            </div>
          ))}
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
        <button onClick={() => { stats.refetch(); trends.refetch(); }}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
          <RefreshCw size={11} /> Retry
        </button>
      </div>
    );
  }

  const kpis = [
    { label: "Total Leads",   value: stats.data?.leadsCount?.toLocaleString() ?? "—",   color: "#ec4899" },
    { label: "Emails Sent",   value: stats.data?.emailsSent?.toLocaleString() ?? "—",   color: "#6366f1" },
  ];

  const points = (trends.data?.inventoryRisk ?? []).slice(-8).map((p: any) => ({
    label:  shortLabel(p.date ?? p.month ?? ""),
    demand: p.demand ?? 0,
  }));

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <div className="grid grid-cols-2 gap-2">
        {kpis.map((k) => (
          <div key={k.label} className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-2 text-center border border-pink-100">
            <p className="text-base font-extrabold text-gray-900">{k.value}</p>
            <p className="text-[9px] text-gray-400">{k.label}</p>
          </div>
        ))}
      </div>

      {points.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-gray-400">No trend data yet</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fce7f3" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Line type="monotone" dataKey="demand" stroke="#ec4899" strokeWidth={2} dot={false} name="Demand" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
