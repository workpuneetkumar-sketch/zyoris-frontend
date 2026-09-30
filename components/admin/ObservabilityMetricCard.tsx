"use client";

/**
 * components/admin/ObservabilityMetricCard.tsx
 * ─────────────────────────────────────────────────────────────
 * Day 7 — Observability metric stat card with trend sparkline.
 *
 * Chart palette: every color comes from the .zyoris-chart-scope
 * CSS custom properties appended to globals.css. No hex, no rgb,
 * no Tailwind palette classes (text-green-*, bg-red-*, etc.).
 *
 * Sparkline replaced with LineChart (was AreaChart bell-curve):
 *   - XAxis and YAxis hidden but present for layout stability.
 *   - CartesianGrid: dashed, var(--chart-grid).
 *   - Axis strokes: var(--chart-axis).
 *   - ReferenceLine only rendered when threshold prop is provided.
 *   - Tooltip always present.
 * Delta badges use var(--chart-success) / var(--chart-danger).
 * Series color driven by variant via chart palette, not traffic-light.
 */

import classNames from "classnames";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ShieldCheck,
  DollarSign,
  Clock,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { MetricDataPoint } from "@/lib/types/day7.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MetricVariant =
  | "success"   // high = good  (acceptance rate, success rate, grounded rate)
  | "danger"    // high = bad   (hallucination count, injection attempts)
  | "cost"      // cost metrics
  | "latency"   // latency metrics
  | "neutral";  // no directional meaning

export interface ObservabilityMetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  /** Optional secondary sub-label below the value */
  sub?: string;
  variant: MetricVariant;
  /** Optional trend data for the sparkline — omit to hide chart */
  trend?: MetricDataPoint[];
  /** Optional threshold — renders a ReferenceLine and a delta badge */
  threshold?: number;
  className?: string;
}

// ─── Variant config ───────────────────────────────────────────────────────────
// Chart series color is always from the chart palette.
// Icon chrome reuses the existing semantic CSS vars (non-chart colors).

interface VariantStyle {
  iconEl:     React.ElementType;
  iconBg:     string;
  iconColor:  string;
  /** CSS custom property expression used as the line stroke */
  lineColor:  string;
}

const VARIANT_STYLES: Record<MetricVariant, VariantStyle> = {
  // success → chart-2 (teal) — good metrics trend up in teal
  success: {
    iconEl:    TrendingUp,
    iconBg:    "bg-[color:var(--color-success-light)]",
    iconColor: "text-[color:var(--color-success)]",
    lineColor: "var(--chart-2)",
  },
  // danger → chart-4 (rose) — bad metrics in rose/red
  danger: {
    iconEl:    AlertTriangle,
    iconBg:    "bg-[color:var(--color-error-light)]",
    iconColor: "text-[color:var(--color-error)]",
    lineColor: "var(--chart-4)",
  },
  // cost → chart-3 (amber)
  cost: {
    iconEl:    DollarSign,
    iconBg:    "bg-[color:var(--color-warning-light)]",
    iconColor: "text-[color:var(--color-warning-foreground)]",
    lineColor: "var(--chart-3)",
  },
  // latency → chart-1 (blue)
  latency: {
    iconEl:    Clock,
    iconBg:    "bg-[color:var(--color-info-light)]",
    iconColor: "text-[color:var(--color-info)]",
    lineColor: "var(--chart-1)",
  },
  // neutral → chart-1 (blue) as default
  neutral: {
    iconEl:    ShieldCheck,
    iconBg:    "bg-[color:var(--color-background-secondary)]",
    iconColor: "text-[color:var(--color-text-muted)]",
    lineColor: "var(--chart-1)",
  },
};

// ─── Delta indicator ──────────────────────────────────────────────────────────

function DeltaIndicator({
  value,
  threshold,
  variant,
}: {
  value:     number;
  threshold: number;
  variant:   MetricVariant;
}) {
  const delta = typeof value === "number" ? value - threshold : null;
  if (delta === null) return null;

  // For danger/cost/latency, lower is better — positive delta is bad.
  const isGood =
    variant === "danger" || variant === "cost" || variant === "latency"
      ? delta <= 0
      : delta >= 0;

  const Icon = isGood ? TrendingUp : TrendingDown;

  return (
    <span
      className="inline-flex items-center gap-0.5 text-[11px] font-bold"
      style={{ color: isGood ? "var(--chart-success)" : "var(--chart-danger)" }}
    >
      <Icon size={10} className="shrink-0" />
      {delta > 0 ? "+" : ""}
      {Math.abs(delta).toFixed(1)}
      {" "}vs threshold
    </span>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function SparkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-lg px-2.5 py-1.5 shadow-sm text-[11px]">
      <p className="text-[color:var(--color-text-muted)]">{label}</p>
      <p className="font-bold text-[color:var(--color-text)]">
        {payload[0].value}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ObservabilityMetricCard({
  label,
  value,
  unit,
  sub,
  variant,
  trend,
  threshold,
  className,
}: ObservabilityMetricCardProps) {
  const style = VARIANT_STYLES[variant] ?? VARIANT_STYLES.neutral;
  const Icon  = style.iconEl;
  const hasTrend      = Array.isArray(trend) && trend.length > 0;
  const hasThreshold  = threshold != null;
  const numericValue  = typeof value === "number" ? value : parseFloat(String(value));
  const showDelta     = hasThreshold && !isNaN(numericValue);

  // Stable gradient id per card to avoid SVG id collisions
  const gradId = `chart-grad-${label.replace(/\W/g, "")}`;

  return (
    // zyoris-chart-scope makes all var(--chart-*) tokens available
    <div
      className={classNames(
        "zyoris-chart-scope",
        "bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden",
        className
      )}
      data-testid="observability-metric-card"
    >
      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="p-4 space-y-2">

        {/* Label + icon */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-text-muted)] leading-snug">
            {label}
          </p>
          <div className={classNames(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            style.iconBg
          )}>
            <Icon size={13} className={style.iconColor} />
          </div>
        </div>

        {/* Value */}
        <div className="flex items-end gap-1.5">
          <p className="text-2xl font-black text-[color:var(--color-text)] leading-none tracking-tight">
            {value}
          </p>
          {unit && (
            <p className="text-sm font-semibold text-[color:var(--color-text-muted)] mb-0.5">
              {unit}
            </p>
          )}
        </div>

        {/* Sub label */}
        {sub && (
          <p className="text-xs text-[color:var(--color-text-muted)] leading-snug">{sub}</p>
        )}

        {/* Delta vs threshold */}
        {showDelta && (
          <DeltaIndicator
            value={numericValue}
            threshold={threshold!}
            variant={variant}
          />
        )}
      </div>

      {/* ── Sparkline (LineChart, replaces AreaChart bell-curve) ─────── */}
      {hasTrend && (
        <div className="h-14 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trend}
              margin={{ top: 2, right: 4, left: 4, bottom: 2 }}
            >
              {/* Dashed grid with chart-grid token */}
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--chart-grid)"
                vertical={false}
              />

              {/* Minimal axes — labels hidden, ticks hidden, only used for scale */}
              <XAxis
                dataKey="label"
                hide={false}
                tick={false}
                axisLine={false}
                tickLine={false}
                stroke="var(--chart-axis)"
              />
              <YAxis
                hide={true}
                domain={["auto", "auto"]}
              />

              {/* Tooltip always present */}
              <Tooltip
                content={<SparkTooltip />}
                cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1, strokeDasharray: "3 3" }}
              />

              {/* ReferenceLine only when backend provides a threshold */}
              {hasThreshold && (
                <ReferenceLine
                  y={threshold}
                  stroke="var(--chart-axis)"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  strokeOpacity={0.6}
                />
              )}

              {/* Main series — color from chart palette via variant */}
              <Line
                type="monotone"
                dataKey="value"
                stroke={style.lineColor}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 3, fill: style.lineColor, stroke: "none" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
