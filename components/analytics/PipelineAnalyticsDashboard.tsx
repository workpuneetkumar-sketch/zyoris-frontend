"use client";

// components/analytics/PipelineAnalyticsDashboard.tsx
// Pipeline Analytics Dashboard — Task 2

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { usePipelineAnalytics } from "@/hooks/usePipelineAnalytics";
import {
  TrendingUp,
  DollarSign,
  Target,
  Award,
  BarChart2,
  RefreshCw,
  AlertTriangle,
  Loader2,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt$(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "violet" | "amber";
}

const COLOR_MAP = {
  blue: { bg: "bg-blue-50", border: "border-blue-100", icon: "text-blue-600", val: "text-blue-700" },
  green: { bg: "bg-emerald-50", border: "border-emerald-100", icon: "text-emerald-600", val: "text-emerald-700" },
  violet: { bg: "bg-violet-50", border: "border-violet-100", icon: "text-violet-600", val: "text-violet-700" },
  amber: { bg: "bg-amber-50", border: "border-amber-100", icon: "text-amber-600", val: "text-amber-700" },
};

function KpiCard({ label, value, sub, icon, color }: KpiCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{label}</p>
        <div className={`p-2 rounded-xl ${c.bg} border ${c.border}`}>
          <span className={c.icon}>{icon}</span>
        </div>
      </div>
      <p className={`text-2xl font-extrabold tracking-tight ${c.val}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Stage colors ──────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  NEW: "#3b82f6",
  HOT: "#ef4444",
  WARM: "#f97316",
  WON: "#10b981",
  LOST: "#6b7280",
  DEAD: "#94a3b8",
};

function getStageColor(stage: string): string {
  return STAGE_COLORS[stage.toUpperCase()] ?? "#6366f1";
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" && entry.value > 1000
            ? fmt$(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  );
}

// ── Revenue Forecast Chart ────────────────────────────────────────────────────

function RevenueForecastChart({ data }: { data: NonNullable<ReturnType<typeof usePipelineAnalytics>["data"]>["forecast"] }) {
  if (!data) return <div className="h-48 flex items-center justify-center text-xs text-gray-400">No forecast data</div>;

  const chartData = data.datapoints.slice(-30).map((d) => ({
    date: new Date(d.label).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Forecast: d.forecast,
    Upper: d.upper,
    Lower: d.lower,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => fmt$(v)} width={55} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="Upper" stroke="transparent" fill="rgba(59,130,246,0.08)" name="Upper" />
        <Area type="monotone" dataKey="Forecast" stroke="#3b82f6" fill="url(#forecastGradient)" strokeWidth={2} dot={false} name="Revenue" />
        <Area type="monotone" dataKey="Lower" stroke="transparent" fill="transparent" name="Lower" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Stage Distribution Chart ──────────────────────────────────────────────────

function StageDistributionChart({ stages }: { stages: Array<{ stage: string; amount: number; count: number; percentage: number }> }) {
  const data = stages.map((s) => ({
    name: s.stage,
    value: s.amount,
    count: s.count,
    fill: getStageColor(s.stage),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [fmt$(value), name]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
        />
        <Legend
          formatter={(value) => <span style={{ fontSize: 11, color: "#64748b" }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Conversion Funnel Chart ───────────────────────────────────────────────────

function ConversionFunnelChart({ stages }: { stages: Array<{ stage: string; amount: number; count: number; percentage: number }> }) {
  const data = stages.map((s) => ({
    stage: s.stage,
    value: s.amount,
    count: s.count,
    fill: getStageColor(s.stage),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => fmt$(v)} width={55} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" name="Pipeline Value" radius={[4, 4, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Conversion Score List ─────────────────────────────────────────────────────

function ConversionScoreList({
  conversions,
}: {
  conversions: Array<{ dealId: string; name: string; stage: string; amount: number; conversionProbability: number }>;
}) {
  const sorted = [...conversions].sort((a, b) => b.conversionProbability - a.conversionProbability).slice(0, 5);

  return (
    <div className="space-y-2">
      {sorted.map((deal) => {
        const pct = Math.round(deal.conversionProbability * 100);
        const barColor =
          pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-400";
        return (
          <div key={deal.dealId} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-xs font-medium text-gray-700 truncate">{deal.name}</p>
                <span className="text-[11px] font-bold text-gray-900 ml-2">{pct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PipelineAnalyticsDashboard() {
  const { data, loading, error, dateRange, setDateRange, lastRefreshed, refetch } =
    usePipelineAnalytics();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 size={22} className="text-blue-600" />
            Pipeline Analytics
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Revenue forecast, conversion rates, and stage performance
            {data?.isMock && (
              <span className="ml-2 text-amber-500 font-medium">(Demo Data)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range selector */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(["7D", "30D", "90D", "1Y"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-xs transition-colors ${
                  dateRange === range
                    ? "bg-blue-600 text-white font-semibold"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-700">
          <AlertTriangle size={14} className="shrink-0" />
          {error} — showing fallback data
        </div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <KpiSkeleton />
      ) : data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total Pipeline"
            value={fmt$(data.totalPipelineValue)}
            sub={`${data.stages.reduce((s, st) => s + st.count, 0)} deals`}
            icon={<DollarSign size={16} />}
            color="blue"
          />
          <KpiCard
            label="Win Rate"
            value={`${data.winRate}%`}
            sub="Won / (Won + Lost)"
            icon={<Award size={16} />}
            color="green"
          />
          <KpiCard
            label="Avg Deal Size"
            value={fmt$(data.avgDealSize)}
            sub="Per active deal"
            icon={<TrendingUp size={16} />}
            color="violet"
          />
          <KpiCard
            label="Conv. Rate"
            value={`${data.conversionRate}%`}
            sub={`${data.highProbabilityDeals} high-prob deals`}
            icon={<Target size={16} />}
            color="amber"
          />
        </div>
      ) : null}

      {/* Charts grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4">
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-48 w-full" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue Forecast */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-gray-900">Revenue Projection</p>
                <p className="text-xs text-gray-400">
                  {fmt$(data.revenueProjection)} projected
                </p>
              </div>
              {data.isMock && (
                <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                  Demo
                </span>
              )}
            </div>
            <RevenueForecastChart data={data.forecast} />
          </div>

          {/* Stage Distribution */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-gray-900">Stage Distribution</p>
                <p className="text-xs text-gray-400">{data.stages.length} stages</p>
              </div>
            </div>
            <StageDistributionChart stages={data.stages} />
          </div>

          {/* Pipeline Stage Performance (bar) */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-bold text-gray-900">Pipeline Stage Performance</p>
              <p className="text-xs text-gray-400">Value by stage</p>
            </div>
            <ConversionFunnelChart stages={data.stages} />
          </div>

          {/* Conversion Scores */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-bold text-gray-900">Top Conversion Scores</p>
              <p className="text-xs text-gray-400">
                Avg: {data.avgConversionScore}% · {data.highProbabilityDeals} high-prob deals
              </p>
            </div>
            <ConversionScoreList conversions={data.conversions} />
          </div>
        </div>
      ) : null}

      {/* Stage table */}
      {!loading && data && data.stages.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm overflow-x-auto">
          <p className="text-sm font-bold text-gray-900 mb-4">Stage Breakdown</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 text-gray-400 font-semibold uppercase tracking-wide">Stage</th>
                <th className="text-right py-2 pr-4 text-gray-400 font-semibold uppercase tracking-wide">Deals</th>
                <th className="text-right py-2 pr-4 text-gray-400 font-semibold uppercase tracking-wide">Value</th>
                <th className="text-right py-2 text-gray-400 font-semibold uppercase tracking-wide">Share</th>
              </tr>
            </thead>
            <tbody>
              {data.stages.map((stage) => (
                <tr key={stage.stage} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: getStageColor(stage.stage) }}
                      />
                      <span className="font-medium text-gray-700">{stage.stage}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-right text-gray-600">{stage.count}</td>
                  <td className="py-2.5 pr-4 text-right font-semibold text-gray-800">{fmt$(stage.amount)}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${stage.percentage}%`,
                            backgroundColor: getStageColor(stage.stage),
                          }}
                        />
                      </div>
                      <span className="text-gray-600 w-8 text-right">{stage.percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Last refreshed */}
      {lastRefreshed && (
        <p className="text-[11px] text-gray-300 text-right">
          Last updated: {lastRefreshed.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
