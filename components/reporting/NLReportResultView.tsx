"use client";

/**
 * components/reporting/NLReportResultView.tsx
 * ─────────────────────────────────────────────────────────────
 * W6 — Reporting / Analysis UI — NL report result view
 *
 * Renders the answer + structured metrics from a NLReportResult.
 * Clicking a metric with a drilldownQuery opens ReportDrilldownPanel
 * in place — without navigating away.
 *
 * Acceptance criteria (W6):
 * ✓ Drill-down panel dismissible back to summary without losing question/answer
 * ✓ Metrics with no drilldownQuery render as non-interactive
 * ✓ Failed drilldown fetches offer retry (handled inside ReportDrilldownPanel)
 */

import { useState } from "react";
import classNames from "classnames";
import { MessageSquare, Table2, BarChart3 } from "lucide-react";
import { AgentResultFrame } from "@/components/agents/AgentResultFrame";
import { ReportDrilldownPanel } from "@/components/reporting/ReportDrilldownPanel";
import type { NLReportResult, ReportMetric } from "@/lib/types/agent-results";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NLReportResultViewProps {
  result: NLReportResult;
  className?: string;
}

interface ActiveDrilldown {
  drilldownQuery: string;
  metricLabel: string;
}

// ─── Metric cell ──────────────────────────────────────────────────────────────

function MetricCell({
  metric,
  onClick,
  active,
}: {
  metric: ReportMetric;
  onClick?: () => void;
  active: boolean;
}) {
  const isClickable = !!metric.drilldownQuery;

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      data-testid={isClickable ? "drilldown-metric" : "static-metric"}
      className={classNames(
        "p-4 rounded-2xl border transition-all",
        active
          ? "border-[color:var(--color-primary)] bg-[color:var(--color-info-light)] ring-2 ring-[color:var(--color-info-light)]"
          : isClickable
          ? "border-[color:var(--color-border)] bg-[color:var(--color-surface-active)] cursor-pointer hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-info-light)] hover:shadow-sm"
          : "border-[color:var(--color-border-light)] bg-[color:var(--color-background-secondary)] cursor-default"
      )}
    >
      <p className="text-xl font-black text-[color:var(--color-text)] leading-none">
        {metric.value}
      </p>
      <p className="text-xs font-semibold text-[color:var(--color-text-secondary)] mt-1.5 leading-snug">
        {metric.label}
      </p>
      {metric.segment && (
        <p className="text-[10px] text-[color:var(--color-text-muted)] mt-1 font-medium uppercase tracking-wide">
          {metric.segment}
        </p>
      )}
      {isClickable && (
        <div className="flex items-center gap-1 mt-2">
          <Table2 size={10} className={active ? "text-[color:var(--color-primary)]" : "text-[color:var(--color-text-muted)]"} />
          <span className={classNames("text-[10px] font-semibold", active ? "text-[color:var(--color-primary)]" : "text-[color:var(--color-text-muted)]")}>
            {active ? "Viewing drill-down" : "Click to drill down"}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NLReportResultView({ result, className }: NLReportResultViewProps) {
  const [activeDrilldown, setActiveDrilldown] = useState<ActiveDrilldown | null>(null);

  const openDrilldown = (metric: ReportMetric) => {
    if (!metric.drilldownQuery) return;
    // Toggle: clicking the same metric again dismisses it
    setActiveDrilldown((prev) =>
      prev?.drilldownQuery === metric.drilldownQuery
        ? null
        : { drilldownQuery: metric.drilldownQuery!, metricLabel: metric.label }
    );
  };

  return (
    <div className={classNames("space-y-4", className)} data-testid="nl-report-result">
      <AgentResultFrame
        result={result}
        status="SUCCESS"
        evidenceTitle="Report Evidence"
      >
        <div className="space-y-5">
          {/* Question */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-[color:var(--color-primary)] flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare size={13} className="text-[color:var(--color-primary-foreground)]" />
            </div>
            <p className="text-sm font-semibold text-[color:var(--color-text)] leading-relaxed">
              {result.question}
            </p>
          </div>

          {/* Answer summary */}
          <div className="bg-[color:var(--color-surface-active)] rounded-2xl p-4 border border-[color:var(--color-border-light)]">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-text-muted)] mb-2 flex items-center gap-1.5">
              <BarChart3 size={11} />
              Analysis
            </p>
            <p className="text-sm text-[color:var(--color-text)] leading-relaxed">
              {result.answerSummary}
            </p>
          </div>

          {/* Metrics grid */}
          {result.metrics.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-text-muted)] mb-3">
                Metrics ({result.metrics.length})
                {result.drilldownAvailable && (
                  <span className="ml-2 normal-case text-[color:var(--color-info)] font-semibold">
                    — click highlighted metrics to drill down
                  </span>
                )}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {result.metrics.map((metric, i) => (
                  <MetricCell
                    key={i}
                    metric={metric}
                    onClick={() => openDrilldown(metric)}
                    active={activeDrilldown?.drilldownQuery === metric.drilldownQuery}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </AgentResultFrame>

      {/* Drill-down panel — in place, dismissible */}
      {activeDrilldown && (
        <ReportDrilldownPanel
          reportId={result.id}
          drilldownQuery={activeDrilldown.drilldownQuery}
          metricLabel={activeDrilldown.metricLabel}
          onDismiss={() => setActiveDrilldown(null)}
        />
      )}
    </div>
  );
}
