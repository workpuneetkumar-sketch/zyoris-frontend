"use client";

/**
 * components/admin/ObservabilityMetricCard.tsx
 * ─────────────────────────────────────────────────────────────
 * Day 7 — Observability metric stat card with optional sparkline.
 *
 * Used to display the four pillars per agent:
 *   Useful    — Recommendation Acceptance Rate, Action Success Rate
 *   Grounded  — Grounded Response Rate, Hallucination Count
 *   Safe      — Injection Attempts Blocked
 *   Affordable — Cost / Execution, Avg Latency
 *
 * All colors via CSS variable tokens only.
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
  AreaChart,
  Area,
  Tooltip,
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
  /** Optional threshold — renders a coloured delta vs the threshold */
  threshold?: number;
  className?: string;
}

// ─── Variant config ───────────────────────────────────────────────────────────

interface VariantStyle {
  iconEl: React.ElementType;
  iconBg: string;
  iconColor: string;
  areaColor: string;
  areaFill: string;
}

const VARIANT_STYLES: Record<MetricVariant, VariantStyle> = {
  success: {
    iconEl:    TrendingUp,
    iconBg:    "bg-[color:var(--color-success-light)]",
    iconColor: "text-[color:var(--color-success)]",
    areaColor: "var(--color-success)",
    areaFill:  "var(--color-success-light)",
  },
  danger: {
    iconEl:    AlertTriangle,
    iconBg:    "bg-[color:var(--color-error-light)]",
    iconColor: "text-[color:var(--color-error)]",
    areaColor: "var(--color-error)",
    areaFill:  "var(--color-error-light)",
  },
  cost: {
    iconEl:    DollarSign,
    iconBg:    "bg-[color:var(--color-warning-light)]",
    iconColor: "text-[color:var(--color-warning-foreground)]",
    areaColor: "var(--color-warning)",
    areaFill:  "var(--color-warning-light)",
  },
  latency: {
    iconEl:    Clock,
    iconBg:    "bg-[color:var(--color-info-light)]",
    iconColor: "text-[color:var(--color-info)]",
    areaColor: "var(--color-info)",
    areaFill:  "var(--color-info-light)",
  },
  neutral: {
    iconEl:    ShieldCheck,
    iconBg:    "bg-[color:var(--color-background-secondary)]",
    iconColor: "text-[color:var(--color-text-muted)]",
    areaColor: "var(--color-primary)",
    areaFill:  "var(--color-info-light)",
  },
};

// ─── Delta indicator ──────────────────────────────────────────────────────────

function DeltaIndicator({
  value,
  threshold,
  variant,
}: {
  value: number;
  threshold: number;
  variant: MetricVariant;
}) {
  const delta = typeof value === "number" ? value - threshold : null;
  if (delta === null) return null;

  // For danger metrics (lower is better), positive delta is bad
  const isGood =
    variant === "danger" || variant === "cost" || variant === "latency"
      ? delta <= 0
      : delta >= 0;

  const Icon = isGood ? TrendingUp : TrendingDown;
  const color = isGood
    ? "text-[color:var(--color-success)]"
    : "text-[color:var(--color-error)]";

  return (
    <span className={classNames("inline-flex items-center gap-0.5 text-[11px] font-bold", color)}>
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
  const Icon = style.iconEl;
  const hasTrend = Array.isArray(trend) && trend.length > 0;
  const numericValue = typeof value === "number" ? value : parseFloat(String(value));

  return (
    <div
      className={classNames(
        "bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden",
        className
      )}
      data-testid="observability-metric-card"
    >
      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Label + icon */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-text-muted)] leading-snug">
            {label}
          </p>
          <div className={classNames("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", style.iconBg)}>
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
        {threshold != null && !isNaN(numericValue) && (
          <DeltaIndicator
            value={numericValue}
            threshold={threshold}
            variant={variant}
          />
        )}
      </div>

      {/* Sparkline */}
      {hasTrend && (
        <div className="h-14 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trend}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={`grad-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={style.areaColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={style.areaColor} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <Tooltip content={<SparkTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={style.areaColor}
                strokeWidth={1.5}
                fill={`url(#grad-${label.replace(/\s/g, "")})`}
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
