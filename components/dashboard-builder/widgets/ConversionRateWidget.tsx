"use client";
// components/dashboard-builder/widgets/ConversionRateWidget.tsx
// Real data: GET /analytics/conversion/scores via useConversionScores hook.
// Mock CONVERSION_DATA (Leads→Qualified 62%, "18.3%", "-2.1% this month") removed entirely.

import { TrendingUp, TrendingDown, RefreshCw, AlertCircle, Target } from "lucide-react";
import { useConversionScores } from "@/hooks/useDashboard";
import type { ConversionScore } from "@/lib/api/dashboardApi";

const STAGE_COLORS: Record<string, string> = {
  NEW:         "#6366f1",
  PROSPECT:    "#6366f1",
  QUALIFIED:   "#8b5cf6",
  PROPOSAL:    "#10b981",
  NEGOTIATION: "#f59e0b",
  WON:         "#10b981",
  LOST:        "#ef4444",
};
function stageColor(stage: string): string {
  return STAGE_COLORS[(stage ?? "").toUpperCase()] ?? "#94a3b8";
}

export function ConversionRateWidget({ isPreview }: { isPreview?: boolean }) {
  const { data: scores, loading, error, refetch } = useConversionScores();

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col gap-3 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="h-8 w-16 bg-gray-200 rounded" />
          <div className="ml-auto h-6 w-24 bg-gray-100 rounded-lg" />
        </div>
        <div className="flex-1 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <div className="flex justify-between">
                  <div className="h-2.5 w-28 bg-gray-100 rounded" />
                  <div className="h-2.5 w-8 bg-gray-100 rounded" />
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full" />
              </div>
            </div>
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
        <button onClick={refetch} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
          <RefreshCw size={11} /> Retry
        </button>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (!scores || scores.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1 p-3 text-center">
        <Target size={20} className="text-gray-300" />
        <p className="text-xs text-gray-400">No conversion data yet</p>
      </div>
    );
  }

  // ── Compute overall conversion from real scores ───────────────────────────────
  // conversionProbability is 0–1 from backend
  const avg = scores.reduce((s: number, c: ConversionScore) => s + c.conversionProbability, 0) / scores.length;
  const avgPct = Math.round(avg * 100);

  // Group by stage: average probability per stage
  const stageMap = new Map<string, number[]>();
  scores.forEach((c: ConversionScore) => {
    const s = c.stage ?? "Unknown";
    if (!stageMap.has(s)) stageMap.set(s, []);
    stageMap.get(s)!.push(c.conversionProbability);
  });
  const stageRows = Array.from(stageMap.entries())
    .map(([stage, probs]) => ({
      name:  stage,
      rate:  Math.round((probs.reduce((a, b) => a + b, 0) / probs.length) * 100),
      color: stageColor(stage),
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 4);

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <p className="text-2xl font-bold text-gray-900">{avgPct}%</p>
          <p className="text-xs text-gray-500">Avg conversion score ({scores.length} deals)</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-2 justify-center">
        {stageRows.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 truncate">{item.name}</span>
                <span className="text-xs font-bold text-gray-800 ml-2 flex-shrink-0">{item.rate}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${item.rate}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
