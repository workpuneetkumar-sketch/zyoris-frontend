"use client";

// components/analytics/PipelineAnalyticsDashboard.tsx
// Pipeline Analytics Dashboard — Task 2
//
// All colours resolved from CSS var tokens (--color-* and --chart-*).
// No hard-coded hex, no Tailwind palette classes (bg-blue-*, text-gray-*, etc.).
// Chart series use the .zyoris-chart-scope palette via inline var() references.

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
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt$(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
// Uses CSS var tokens instead of bg-gray-100 / bg-white.

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ backgroundColor: "var(--color-background-secondary)" }}
    />
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl p-4 space-y-2 border"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
// Colour mapping via semantic CSS var tokens — no Tailwind palette classes.

type KpiColor = "primary" | "success" | "info" | "warning";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: KpiColor;
}

// CSS var tokens keyed by semantic name
const COLOR_MAP: Record<KpiColor, { bg: string; border: string; icon: string; val: string }> = {
  primary: {
    bg:     "var(--color-info-light)",
    border: "var(--color-border)",
    icon:   "var(--color-primary)",
    val:    "var(--color-primary-dark)",
  },
  success: {
    bg:     "var(--color-success-light)",
    border: "var(--color-border)",
    icon:   "var(--color-success)",
    val:    "var(--color-success-foreground)",
  },
  info: {
    bg:     "var(--color-info-light)",
    border: "var(--color-border)",
    icon:   "var(--color-info)",
    val:    "var(--color-info-foreground)",
  },
  warning: {
    bg:     "var(--color-warning-light)",
    border: "var(--color-border)",
    icon:   "var(--color-warning)",
    val:    "var(--color-warning-foreground)",
  },
};

function KpiCard({ label, value, sub, icon, color }: KpiCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div
      className="rounded-2xl p-4 shadow-sm hover:shadow-md transition-all border"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <p
          className="text-[10px] font-extrabold uppercase tracking-widest"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </p>
        <div
          className="p-2 rounded-xl border"
          style={{ backgroundColor: c.bg, borderColor: c.border }}
        >
          <span style={{ color: c.icon }}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-extrabold tracking-tight" style={{ color: c.val }}>
        {value}
      </p>
      {sub && (
        <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Stage colours — mapped to chart palette tokens ────────────────────────────
// These are resolved at render time via getComputedStyle so charts always pick
// up the live token value (works in both light and dark mode).
//
// We intentionally do NOT hard-code hex here. Instead we map each stage to one
// of the five chart-scope variables. The zyoris-chart-scope class is applied
// on the outermost wrapper so the custom properties are in scope.

const STAGE_TOKEN_MAP: Record<string, string> = {
  NEW:  "var(--chart-1)",   // blue
  WARM: "var(--chart-3)",   // amber
  HOT:  "var(--chart-4)",   // rose
  WON:  "var(--chart-2)",   // teal / success
  LOST: "var(--chart-axis)",
  DEAD: "var(--chart-axis)",
};

function getStageColor(stage: string): string {
  return STAGE_TOKEN_MAP[stage.toUpperCase()] ?? "var(--chart-1)";
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-xl shadow-lg p-3 text-xs border"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <p
        className="font-semibold mb-1"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}:{" "}
          {typeof entry.value === "number" && entry.value > 1000
            ? fmt$(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  );
}

// ── Revenue Forecast Chart ────────────────────────────────────────────────────

function RevenueForecastChart({
  data,
}: {
  data: NonNullable<
    ReturnType<typeof usePipelineAnalytics>["data"]
  >["forecast"];
}) {
  if (!data)
    return (
      <div
        className="h-48 flex items-center justify-center text-xs"
        style={{ color: "var(--color-text-muted)" }}
      >
        No forecast data
      </div>
    );

  const chartData = data.datapoints.slice(-30).map((d) => ({
    date: new Date(d.label).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    Forecast: d.forecast,
    Upper:    d.upper,
    Lower:    d.lower,
  }));

  return (
    // zyoris-chart-scope ensures var(--chart-*) resolve inside this subtree
    <div className="zyoris-chart-scope">
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="var(--chart-1)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--chart-axis)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--chart-axis)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => fmt$(v)}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="Upper"
            stroke="transparent"
            fill="var(--chart-1)"
            fillOpacity={0.05}
            name="Upper"
          />
          <Area
            type="monotone"
            dataKey="Forecast"
            stroke="var(--chart-1)"
            fill="url(#forecastGradient)"
            strokeWidth={2}
            dot={false}
            name="Revenue"
          />
          <Area
            type="monotone"
            dataKey="Lower"
            stroke="transparent"
            fill="transparent"
            name="Lower"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Stage Distribution Chart ──────────────────────────────────────────────────

function StageDistributionChart({
  stages,
}: {
  stages: Array<{
    stage: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
}) {
  const data = stages.map((s) => ({
    name:  s.stage,
    value: s.amount,
    count: s.count,
    fill:  getStageColor(s.stage),
  }));

  return (
    <div className="zyoris-chart-scope">
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
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: `1px solid var(--color-border)`,
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text)",
            }}
          />
          <Legend
            formatter={(value) => (
              <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Conversion Funnel Chart ───────────────────────────────────────────────────

function ConversionFunnelChart({
  stages,
}: {
  stages: Array<{
    stage: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
}) {
  const data = stages.map((s) => ({
    stage: s.stage,
    value: s.amount,
    count: s.count,
    fill:  getStageColor(s.stage),
  }));

  return (
    <div className="zyoris-chart-scope">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="stage"
            tick={{ fontSize: 10, fill: "var(--chart-axis)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--chart-axis)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => fmt$(v)}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" name="Pipeline Value" radius={[4, 4, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Conversion Score List ─────────────────────────────────────────────────────

function ConversionScoreList({
  conversions,
}: {
  conversions: Array<{
    dealId: string;
    name: string;
    stage: string;
    amount: number;
    conversionProbability: number;
  }>;
}) {
  const sorted = [...conversions]
    .sort((a, b) => b.conversionProbability - a.conversionProbability)
    .slice(0, 5);

  return (
    <div className="zyoris-chart-scope space-y-2">
      {sorted.map((deal) => {
        const pct = Math.round(deal.conversionProbability * 100);
        // Bar colour uses chart success/warning/danger tokens
        const barColor =
          pct >= 80
            ? "var(--chart-success)"
            : pct >= 60
            ? "var(--chart-warning)"
            : "var(--chart-danger)";

        return (
          <div key={deal.dealId} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p
                  className="text-xs font-medium truncate"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {deal.name}
                </p>
                <span
                  className="text-[11px] font-bold ml-2"
                  style={{ color: "var(--color-text)" }}
                >
                  {pct}%
                </span>
              </div>
              <div
                className="w-full rounded-full h-1.5"
                style={{ backgroundColor: "var(--color-background-secondary)" }}
              >
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Chart card shell ──────────────────────────────────────────────────────────
// Consistent card wrapper: token-based surface + border, no bg-white / border-gray-*.

function ChartCard({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-4 shadow-sm border"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p
            className="text-sm font-bold"
            style={{ color: "var(--color-text)" }}
          >
            {title}
          </p>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {subtitle}
            </p>
          )}
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ── Demo badge ────────────────────────────────────────────────────────────────

function DemoBadge() {
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full border font-semibold"
      style={{
        backgroundColor: "var(--color-warning-light)",
        color: "var(--color-warning-foreground)",
        borderColor: "var(--color-warning-light)",
      }}
    >
      Demo
    </span>
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
          <h2
            className="text-xl font-bold flex items-center gap-2"
            style={{ color: "var(--color-text)" }}
          >
            <BarChart2 size={22} style={{ color: "var(--color-primary)" }} />
            Pipeline Analytics
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Revenue forecast, conversion rates, and stage performance
            {data?.isMock && (
              <span
                className="ml-2 font-medium"
                style={{ color: "var(--color-warning)" }}
              >
                (Demo Data)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range selector */}
          <div
            className="flex rounded-lg border overflow-hidden"
            style={{ borderColor: "var(--color-border)" }}
          >
            {(["7D", "30D", "90D", "1Y"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className="px-3 py-1.5 text-xs transition-colors"
                style={
                  dateRange === range
                    ? {
                        backgroundColor: "var(--color-primary)",
                        color: "var(--color-primary-foreground)",
                        fontWeight: 600,
                      }
                    : {
                        color: "var(--color-text-secondary)",
                        backgroundColor: "transparent",
                      }
                }
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors disabled:opacity-50"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
              backgroundColor: "transparent",
            }}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs border"
          style={{
            backgroundColor: "var(--color-error-light)",
            borderColor: "var(--color-error-light)",
            color: "var(--color-error-foreground)",
          }}
        >
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
            color="primary"
          />
          <KpiCard
            label="Win Rate"
            value={`${data.winRate}%`}
            sub="Won / (Won + Lost)"
            icon={<Award size={16} />}
            color="success"
          />
          <KpiCard
            label="Avg Deal Size"
            value={fmt$(data.avgDealSize)}
            sub="Per active deal"
            icon={<TrendingUp size={16} />}
            color="info"
          />
          <KpiCard
            label="Conv. Rate"
            value={`${data.conversionRate}%`}
            sub={`${data.highProbabilityDeals} high-prob deals`}
            icon={<Target size={16} />}
            color="warning"
          />
        </div>
      ) : null}

      {/* Charts grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl p-4 border"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-48 w-full" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Revenue Forecast */}
          <ChartCard
            title="Revenue Projection"
            subtitle={`${fmt$(data.revenueProjection)} projected`}
            badge={data.isMock ? <DemoBadge /> : undefined}
          >
            <RevenueForecastChart data={data.forecast} />
          </ChartCard>

          {/* Stage Distribution */}
          <ChartCard
            title="Stage Distribution"
            subtitle={`${data.stages.length} stages`}
          >
            <StageDistributionChart stages={data.stages} />
          </ChartCard>

          {/* Pipeline Stage Performance (bar) */}
          <ChartCard
            title="Pipeline Stage Performance"
            subtitle="Value by stage"
          >
            <ConversionFunnelChart stages={data.stages} />
          </ChartCard>

          {/* Conversion Scores */}
          <ChartCard
            title="Top Conversion Scores"
            subtitle={`Avg: ${data.avgConversionScore}% · ${data.highProbabilityDeals} high-prob deals`}
          >
            <ConversionScoreList conversions={data.conversions} />
          </ChartCard>
        </div>
      ) : null}

      {/* Stage table */}
      {!loading && data && data.stages.length > 0 && (
        <div
          className="rounded-2xl p-4 shadow-sm overflow-x-auto border"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <p
            className="text-sm font-bold mb-4"
            style={{ color: "var(--color-text)" }}
          >
            Stage Breakdown
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid var(--color-border)` }}>
                {["Stage", "Deals", "Value", "Share"].map((h, i) => (
                  <th
                    key={h}
                    className={`py-2 font-semibold uppercase tracking-wide ${
                      i === 0 ? "text-left pr-4" : "text-right pr-4 last:pr-0"
                    }`}
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.stages.map((stage) => (
                <tr
                  key={stage.stage}
                  className="transition-colors"
                  style={{ borderBottom: `1px solid var(--color-border-light)` }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--color-surface-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="zyoris-chart-scope w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: getStageColor(stage.stage) }}
                      />
                      <span
                        className="font-medium"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {stage.stage}
                      </span>
                    </div>
                  </td>
                  <td
                    className="py-2.5 pr-4 text-right"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {stage.count}
                  </td>
                  <td
                    className="py-2.5 pr-4 text-right font-semibold"
                    style={{ color: "var(--color-text)" }}
                  >
                    {fmt$(stage.amount)}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div
                        className="w-16 rounded-full h-1.5"
                        style={{ backgroundColor: "var(--color-background-secondary)" }}
                      >
                        <div
                          className="zyoris-chart-scope h-1.5 rounded-full"
                          style={{
                            width: `${stage.percentage}%`,
                            backgroundColor: getStageColor(stage.stage),
                          }}
                        />
                      </div>
                      <span
                        className="w-8 text-right"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {stage.percentage}%
                      </span>
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
        <p
          className="text-[11px] text-right"
          style={{ color: "var(--color-text-muted)" }}
        >
          Last updated: {lastRefreshed.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
