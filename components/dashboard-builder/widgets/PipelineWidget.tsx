"use client";
// components/dashboard-builder/widgets/PipelineWidget.tsx
// Real data: GET /api/deals/pipeline-stats via usePipelineStats hook.
// Mock const PIPELINE_DATA removed entirely.

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { RefreshCw, AlertCircle } from "lucide-react";
import { usePipelineStats } from "@/hooks/useDashboard";
import type { PipelineStageStat } from "@/lib/api/dashboardApi";

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#10b981",
                "#06b6d4", "#f59e0b", "#ef4444", "#64748b"];

function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function normaliseStages(raw: PipelineStageStat[]) {
  return raw.map((s) => ({
    stage: s.stage ?? "—",
    count: s.count ?? 0,
    // swagger confirms the field name is totalAmount
    value: s.totalAmount ?? s.amount ?? s.value ?? 0,
  }));
}

interface TooltipProps { active?: boolean; payload?: any[]; label?: string; }
function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-indigo-600">{row?.count} deals</p>
      {row?.value > 0 && <p className="text-gray-500">{formatValue(row.value)}</p>}
    </div>
  );
}

export function PipelineWidget({ isPreview }: { isPreview?: boolean }) {
  const { data: raw, loading, error, refetch } = usePipelineStats();

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2">
        <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
        <div className="flex-1 bg-gray-50 rounded-xl animate-pulse" />
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

  // getPipelineStats now always returns { stages: [...] }
  const rawStages: PipelineStageStat[] = raw?.stages ?? [];

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (!rawStages || rawStages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1 p-3 text-center">
        <p className="text-xs text-gray-400">No pipeline data yet</p>
      </div>
    );
  }

  const stages     = normaliseStages(rawStages);
  const totalDeals = stages.reduce((s, st) => s + st.count, 0);
  const totalValue = raw?.totalValue ?? stages.reduce((s, st) => s + st.value, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Summary */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex gap-4 text-xs text-gray-500">
          <span><span className="font-bold text-gray-800">{totalDeals}</span> deals</span>
          {totalValue > 0 && (
            <span><span className="font-bold text-emerald-600">{formatValue(totalValue)}</span></span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stages} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="stage"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {stages.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
