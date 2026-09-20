"use client";

/**
 * components/revops/RevOpsInsightCard.tsx
 * ─────────────────────────────────────────────────────────────
 * W4 — RevOps UI
 *
 * Metric card with benchmark bar and proposed-action preview.
 *
 * Acceptance criteria (W4):
 * ✓ Shows metric vs benchmark with visual progress bar
 * ✓ proposedAction rendered as read-only preview — never executed directly
 * ✓ "Send to Approval Queue" creates AgentApprovalRequest via existing flow
 * ✓ Severity badges use CSS variable tokens
 * ✓ No local button that changes CRM data from this screen
 */

import { useState } from "react";
import classNames from "classnames";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Eye,
  Send,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { sendRevOpsActionToApproval } from "@/lib/api/revopsApi";
import { AgentResultFrame } from "@/components/agents/AgentResultFrame";
import { toast } from "react-toastify";
import type { RevOpsInsight, RevOpsCategory } from "@/lib/types/agent-results";

// ─── Category meta ────────────────────────────────────────────────────────────

const CATEGORY_META: Record<RevOpsCategory, { label: string; icon: React.ElementType; accent: string }> = {
  COVERAGE: {
    label: "Pipeline Coverage",
    icon: BarChart3,
    accent: "bg-[color:var(--color-info-light)] text-[color:var(--color-info-foreground)]",
  },
  LEAKAGE: {
    label: "Deal Leakage",
    icon: TrendingDown,
    accent: "bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)]",
  },
  QUOTA: {
    label: "Quota Attainment",
    icon: TrendingUp,
    accent: "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)]",
  },
  FORECAST: {
    label: "Forecast Accuracy",
    icon: BarChart3,
    accent: "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)]",
  },
};

// ─── Severity badge ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    HIGH:   "bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)] border-[color:var(--color-error-light)]",
    MEDIUM: "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]",
    LOW:    "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]",
  };
  return (
    <span className={classNames(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
      styles[severity] ?? styles.LOW
    )}>
      {severity.charAt(0) + severity.slice(1).toLowerCase()} Severity
    </span>
  );
}

// ─── Benchmark bar ────────────────────────────────────────────────────────────

function BenchmarkBar({
  value,
  benchmark,
  unit = "",
}: {
  value: number;
  benchmark?: number;
  unit?: string;
}) {
  if (benchmark == null) return null;
  // Cap pct at 120% so an overperforming metric still looks right
  const pct = Math.min(120, Math.round((value / benchmark) * 100));
  const barColor =
    pct >= 100
      ? "bg-[color:var(--color-success)]"
      : pct >= 70
      ? "bg-[color:var(--color-warning)]"
      : "bg-[color:var(--color-error)]";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-semibold">
        <span className="text-[color:var(--color-text-muted)]">vs benchmark</span>
        <span className={classNames(pct >= 100 ? "text-[color:var(--color-success)]" : "text-[color:var(--color-error)]")}>
          {pct}% of target ({benchmark}{unit})
        </span>
      </div>
      <div className="h-2 bg-[color:var(--color-background-secondary)] rounded-full overflow-hidden">
        <div
          className={classNames("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Proposed action preview ──────────────────────────────────────────────────

interface ProposedActionPreviewProps {
  insight: RevOpsInsight;
}

function ProposedActionPreview({ insight }: ProposedActionPreviewProps) {
  const { proposedAction } = insight;
  const [sending, setSending]     = useState(false);
  const [approvalId, setApprovalId] = useState<string | null>(
    proposedAction?.approvalRequestId ?? null
  );
  const [open, setOpen]           = useState(false);

  if (!proposedAction) return null;

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await sendRevOpsActionToApproval(insight);
      setApprovalId(res.approvalRequestId);
      toast.success("Action sent to Approval Queue.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send to Approval Queue.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-[color:var(--color-border)] overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[color:var(--color-surface-active)] hover:bg-[color:var(--color-surface-hover)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Eye size={13} className="text-[color:var(--color-text-muted)]" />
          <span className="text-xs font-bold text-[color:var(--color-text)]">
            Proposed Action — Preview Only
          </span>
        </div>
        {open
          ? <ChevronUp size={13} className="text-[color:var(--color-text-muted)]" />
          : <ChevronDown size={13} className="text-[color:var(--color-text-muted)]" />}
      </button>

      {open && (
        <div className="p-4 space-y-3 border-t border-[color:var(--color-border-light)]">
          {/* Action label */}
          <div>
            <p className="text-xs font-bold text-[color:var(--color-text)]">
              {proposedAction.label}
            </p>
            {proposedAction.description && (
              <p className="text-xs text-[color:var(--color-text-secondary)] mt-1 leading-relaxed">
                {proposedAction.description}
              </p>
            )}
          </div>

          {/* Action type chip */}
          <code className="inline-block text-[10px] font-mono px-2 py-0.5 rounded-lg bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border)]">
            {proposedAction.type}
          </code>

          {/* Send / already sent */}
          <div className="pt-1 border-t border-[color:var(--color-border-light)]">
            {approvalId ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--color-success)]">
                  <CheckCircle2 size={13} />
                  Sent to Approval Queue
                </span>
                <a
                  href={`/approvals/${approvalId}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--color-primary)] hover:underline"
                >
                  View <ExternalLink size={10} />
                </a>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className={classNames(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                    "bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)]",
                    "text-[color:var(--color-primary-foreground)]",
                    "disabled:opacity-60 disabled:cursor-not-allowed"
                  )}
                >
                  {sending
                    ? <RefreshCw size={11} className="animate-spin" />
                    : <Send size={11} />}
                  {sending ? "Sending…" : "Send to Approval Queue"}
                </button>
                <p className="text-[10px] text-[color:var(--color-text-muted)] leading-snug max-w-[180px]">
                  This screen never executes the action directly — it goes to the Approval Queue first.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export interface RevOpsInsightCardProps {
  insight: RevOpsInsight;
  className?: string;
}

export function RevOpsInsightCard({ insight, className }: RevOpsInsightCardProps) {
  const meta = CATEGORY_META[insight.category] ?? CATEGORY_META.COVERAGE;
  const Icon = meta.icon;

  return (
    <AgentResultFrame
      result={insight}
      status="SUGGESTION_ONLY"
      evidenceTitle="Metric Evidence"
      className={className}
    >
      <div className="space-y-4">
        {/* Category + metric header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className={classNames("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", meta.accent)}>
              <Icon size={15} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-text-muted)]">
                {meta.label}
              </p>
              <p className="text-sm font-bold text-[color:var(--color-text)] leading-snug">
                {insight.metricLabel}
              </p>
            </div>
          </div>
          <SeverityBadge severity={insight.severity} />
        </div>

        {/* Metric value */}
        <div className="bg-[color:var(--color-surface-active)] rounded-2xl p-4 border border-[color:var(--color-border-light)]">
          <p className="text-3xl font-black text-[color:var(--color-text)] leading-none">
            {insight.metricValue}
            <span className="text-lg font-bold text-[color:var(--color-text-muted)] ml-1">
              {insight.metricUnit ?? ""}
            </span>
          </p>
          <p className="text-xs text-[color:var(--color-text-secondary)] mt-1">
            {insight.metricLabel}
          </p>
          {insight.benchmarkValue != null && (
            <div className="mt-3">
              <BenchmarkBar
                value={insight.metricValue}
                benchmark={insight.benchmarkValue}
                unit={insight.metricUnit}
              />
            </div>
          )}
        </div>

        {/* Proposed action — preview only */}
        <ProposedActionPreview insight={insight} />
      </div>
    </AgentResultFrame>
  );
}
