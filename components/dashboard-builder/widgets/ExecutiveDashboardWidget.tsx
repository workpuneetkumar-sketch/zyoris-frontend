"use client";
// components/dashboard-builder/widgets/ExecutiveDashboardWidget.tsx
// Real data:
//   Metrics → GET /dashboard/ceo via useDashboardCeo
//   Sparkline → GET /analytics/revenue/forecast via fetchForecast (analyticsApi)
// Mock const METRICS and sparkData removed entirely.

import { useCallback, useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Users, Briefcase, Target, RefreshCw, AlertCircle } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { useDashboardCeo } from "@/hooks/useDashboard";
import { fetchForecast, type Forecast } from "@/lib/api/analyticsApi";

// ── Format helpers — display only ────────────────────────────────────────────
function fmtCurrency(n?: number): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtPercent(n?: number): string {
  if (n == null) return "—";
  // Backend sends 0–1 fraction (e.g. 0.35 = 35%)
  const pct = n > 1 ? n : n * 100;
  return `${Math.round(pct)}%`;
}

export function ExecutiveDashboardWidget({ isPreview }: { isPreview?: boolean }) {
  const { data: ceo, loading: ceoLoading, error: ceoError, refetch: refetchCeo } = useDashboardCeo();

  // Sparkline from revenue forecast — isolated, non-blocking
  const [sparkPoints, setSparkPoints] = useState<{ i: number; v: number }[]>([]);
  useEffect(() => {
    fetchForecast()
      .then((f: Forecast) => {
        const pts = f.datapoints.slice(-12).map((d, i) => ({ i, v: d.forecast }));
        if (process.env.NODE_ENV !== "production") {
          console.log("[ExecutiveDashboardWidget] sparkline points:", pts.length, pts.slice(0, 3));
        }
        setSparkPoints(pts);
      })
      .catch((err) => {
        console.error("[ExecutiveDashboardWidget] sparkline fetch failed:", err?.message);
      });
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (ceoLoading) {
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-2.5 flex items-center gap-2 animate-pulse">
              <div className="w-7 h-7 rounded-lg bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2 w-12 bg-gray-200 rounded" />
                <div className="h-4 w-16 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (ceoError || !ceo) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 p-3 text-center">
        <AlertCircle size={20} className="text-red-400" />
        <p className="text-xs text-gray-500">{ceoError ?? "Failed to load data"}</p>
        <button onClick={refetchCeo} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
          <RefreshCw size={11} /> Retry
        </button>
      </div>
    );
  }

  // ── Build metric rows from real CEO response ──────────────────────────────────
  const totalRevenue  = ceo.kpis?.totalRevenue;
  const marginPct     = ceo.riskIndicators?.marginPct;
  const demandTrend   = (ceo.riskIndicators?.demandTrend ?? "").toLowerCase();
  const projRevenue   = ceo.revenueForecast?.projectedRevenue;

  // Build metric rows — only include entries where we have real data to show.
  // "up" is a tri-state: true = up arrow, false = down arrow, undefined = no arrow.
  type MetricRow = {
    label: string;
    value: string;
    up?: boolean;          // undefined → hide trend arrow entirely
    icon: React.ElementType;
    color: string;
  };

  const metrics: MetricRow[] = [];

  // Total Revenue — always show value; trend arrow only when backend provides a direction
  metrics.push({
    label: "Total Revenue",
    value: fmtCurrency(totalRevenue),
    up:    undefined,   // no trend field available in CEO response for overall revenue
    icon:  DollarSign,
    color: "#6366f1",
  });

  // Gross Margin — show value; remove threshold-based label (no marginTarget from API)
  metrics.push({
    label: "Gross Margin",
    value: fmtPercent(marginPct),
    up:    undefined,   // no "good vs bad" without a backend-provided target
    icon:  Briefcase,
    color: "#10b981",
  });

  // Demand — derive arrow from real trend string; hide arrow when absent
  if (demandTrend) {
    metrics.push({
      label: "Demand",
      value: demandTrend.charAt(0).toUpperCase() + demandTrend.slice(1),
      up:    demandTrend === "increasing" ? true : demandTrend === "decreasing" ? false : undefined,
      icon:  Users,
      color: "#f59e0b",
    });
  }

  // Projection — only show card when backend explicitly provides projectedRevenue
  if (projRevenue != null) {
    metrics.push({
      label: "Projection",
      value: fmtCurrency(projRevenue),
      up:    undefined,   // no direction data for projection card
      icon:  Target,
      color: "#8b5cf6",
    });
  }

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Metric grid */}
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className="bg-gray-50 rounded-xl p-2.5 flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: m.color + "18" }}
              >
                <Icon size={13} style={{ color: m.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 truncate">{m.label}</p>
                <p className="text-sm font-extrabold text-gray-900 truncate">{m.value}</p>
              </div>
              {m.up === true  && <TrendingUp  size={10} className="ml-auto text-emerald-500 flex-shrink-0" />}
              {m.up === false && <TrendingDown size={10} className="ml-auto text-red-500   flex-shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Sparkline — from real forecast data; shows empty chart frame if data exists but all zero */}
      {sparkPoints.length > 0 && (
        <div className="flex-1 min-h-0" style={{ minHeight: "48px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkPoints} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="execGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                formatter={(v: number) => [fmtCurrency(v), "Forecast"]}
                contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#execGrad)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
