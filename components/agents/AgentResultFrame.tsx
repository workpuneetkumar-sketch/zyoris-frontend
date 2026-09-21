"use client";

/**
 * components/agents/AgentResultFrame.tsx
 * ─────────────────────────────────────────────────────────────
 * W1 — Shared Agent Result Framework
 *
 * The single shared wrapper for confidence badge, evidence button,
 * execution-id link, and timestamp header across all five Day 6
 * agent surfaces (Support, Data Quality, RevOps, Workflow, Reporting).
 *
 * Each surface mounts its content as children inside this frame.
 * No surface re-implements the header chrome independently.
 *
 * Acceptance criteria (W1):
 * ✓ Confidence badge renders ONLY when confidenceScore is present
 * ✓ "View Evidence" button renders ONLY when evidence.length > 0
 * ✓ Execution-id link renders ONLY when executionId is returned
 * ✓ No second evidence modal — the Day 4/5 EvidenceModal is imported here
 * ✓ All colors via CSS variable tokens only
 *
 * Dynamic status rendering:
 * - SUCCESS           → clean content rendering, no banner
 * - SUGGESTION_ONLY   → amber advisory banner above content
 * - APPROVAL_REQUIRED → red blocked banner; content still rendered below
 * - BLOCKED           → full blocked state, no content
 */

import { useState } from "react";
import classNames from "classnames";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  ExternalLink,
  Clock,
  ShieldAlert,
  Lightbulb,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { EvidenceModal } from "@/components/agents/EvidenceModal";
import type { AgentResultBase } from "@/lib/types/agent-results";
import type { AgentEvidenceItem } from "@/lib/api/agentApi";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * The four possible execution outcomes from AgentResponseStatus.
 * Components pass whichever status was returned by the backend.
 */
export type AgentResponseStatus =
  | "SUCCESS"
  | "SUGGESTION_ONLY"
  | "APPROVAL_REQUIRED"
  | "BLOCKED";

export interface AgentResultFrameProps {
  /** The base result object — used for header metadata */
  result: AgentResultBase;
  /**
   * Execution status returned by the backend.
   * Defaults to "SUCCESS" if not provided (backward-compatible).
   */
  status?: AgentResponseStatus;
  /**
   * Optional reason string shown in APPROVAL_REQUIRED / BLOCKED banners
   * (e.g. "Risk tier CRITICAL exceeds autonomous permission level").
   */
  blockedReason?: string;
  /** The agent-specific content to render inside the frame */
  children: React.ReactNode;
  /** Optional extra className on the outer container */
  className?: string;
  /** Override the evidence modal title */
  evidenceTitle?: string;
}

// ─── Confidence badge ─────────────────────────────────────────────────────────
// Mirrors the ConfidenceBadge in AgentResultModal.tsx for consistency.

function ConfidenceBadge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const { pill, iconClass, Icon } =
    clamped >= 80
      ? {
          pill: "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)] border-[color:var(--color-success-light)]",
          iconClass: "text-[color:var(--color-success)]",
          Icon: TrendingUp,
        }
      : clamped >= 60
      ? {
          pill: "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]",
          iconClass: "text-[color:var(--color-warning)]",
          Icon: Minus,
        }
      : {
          pill: "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]",
          iconClass: "text-[color:var(--color-text-muted)]",
          Icon: TrendingDown,
        };

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
        pill
      )}
    >
      <Icon size={12} className={classNames("shrink-0", iconClass)} />
      {clamped}% Confidence
    </span>
  );
}

// ─── Status banners ───────────────────────────────────────────────────────────

function SuggestionBanner() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[color:var(--color-warning-light)] border border-[color:var(--color-warning-light)]">
      <Lightbulb size={16} className="text-[color:var(--color-warning-foreground)] shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-bold text-[color:var(--color-warning-foreground)]">
          Suggestion Only
        </p>
        <p className="text-xs text-[color:var(--color-warning-foreground)] opacity-80 mt-0.5">
          This is a proposed action — it has not been applied. Review it and use
          the Approval Queue if you want to act on it.
        </p>
      </div>
    </div>
  );
}

function ApprovalRequiredBanner({ reason }: { reason?: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[color:var(--color-error-light)] border border-[color:var(--color-error-light)]">
      <ShieldAlert size={16} className="text-[color:var(--color-error)] shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-bold text-[color:var(--color-error-foreground)]">
          Approval Required
        </p>
        <p className="text-xs text-[color:var(--color-error-foreground)] opacity-80 mt-0.5">
          {reason ??
            "This action requires human approval before it can be executed. It has been placed in the Approval Queue."}
        </p>
      </div>
    </div>
  );
}

function BlockedState({ reason }: { reason?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
      <div className="w-14 h-14 bg-[color:var(--color-error-light)] rounded-2xl flex items-center justify-center">
        <Ban size={26} className="text-[color:var(--color-error)]" />
      </div>
      <div>
        <p className="text-sm font-bold text-[color:var(--color-text)] mb-1">
          Agent Result Blocked
        </p>
        <p className="text-xs text-[color:var(--color-text-secondary)] max-w-sm leading-relaxed">
          {reason ??
            "This agent result was blocked by a governance policy and cannot be displayed. Contact your administrator."}
        </p>
      </div>
    </div>
  );
}

// ─── Timestamp helper ─────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return "Just now";
  } catch {
    return "";
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AgentResultFrame({
  result,
  status = "SUCCESS",
  blockedReason,
  children,
  className,
  evidenceTitle,
}: AgentResultFrameProps) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const hasEvidence =
    Array.isArray(result.evidence) && result.evidence.length > 0;
  const hasScore = result.confidenceScore != null;
  const hasExecId = !!result.executionId;
  const agentLabel = result.agentName ?? result.agentId;

  return (
    <div
      className={classNames(
        "rounded-2xl border bg-[color:var(--color-surface)] border-[color:var(--color-border)] shadow-sm overflow-hidden",
        className
      )}
      data-testid="agent-result-frame"
      data-status={status}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[color:var(--color-border-light)] bg-[color:var(--color-surface-active)]">
        {/* Left: agent name + timestamp */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[color:var(--color-info-light)] flex items-center justify-center shrink-0">
            <Lightbulb size={12} className="text-[color:var(--color-info)]" />
          </div>
          <span className="text-xs font-bold text-[color:var(--color-text)] truncate">
            {agentLabel}
          </span>
          {result.createdAt && (
            <span className="text-[10px] text-[color:var(--color-text-muted)] flex items-center gap-1 shrink-0">
              <Clock size={10} />
              {relativeTime(result.createdAt)}
            </span>
          )}
        </div>

        {/* Right: confidence badge + evidence button + execution link */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Confidence badge — only when score is present */}
          {hasScore && (
            <ConfidenceBadge score={result.confidenceScore!} />
          )}

          {/* Evidence button — only when evidence.length > 0 */}
          {hasEvidence && (
            <button
              onClick={() => setEvidenceOpen(true)}
              className={classNames(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-colors",
                "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-secondary)]",
                "border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)]"
              )}
              aria-label="View evidence"
            >
              <Layers size={11} className="shrink-0" />
              View Evidence
              <span className="px-1 py-0.5 rounded-full bg-[color:var(--color-border)] text-[9px] font-bold">
                {result.evidence!.length}
              </span>
            </button>
          )}

          {/* Execution Ledger link — only when executionId is present */}
          {hasExecId && (
            <a
              href={`/executions/${result.executionId}`}
              className={classNames(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-colors",
                "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)]",
                "border-[color:var(--color-border)] hover:text-[color:var(--color-primary)] hover:bg-[color:var(--color-surface-hover)]"
              )}
              aria-label={`View execution ${result.executionId}`}
            >
              <ExternalLink size={11} className="shrink-0" />
              Exec&nbsp;#{result.executionId?.slice(-6)}
            </a>
          )}
        </div>
      </div>

      {/* ── Status banners ──────────────────────────────────────────────────── */}
      {(status === "SUGGESTION_ONLY" || status === "APPROVAL_REQUIRED") && (
        <div className="px-5 pt-4">
          {status === "SUGGESTION_ONLY" && <SuggestionBanner />}
          {status === "APPROVAL_REQUIRED" && (
            <ApprovalRequiredBanner reason={blockedReason} />
          )}
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="p-5">
        {status === "BLOCKED" ? (
          <BlockedState reason={blockedReason} />
        ) : (
          children
        )}
      </div>

      {/* ── Evidence modal ───────────────────────────────────────────────────── */}
      {hasEvidence && (
        <EvidenceModal
          isOpen={evidenceOpen}
          onClose={() => setEvidenceOpen(false)}
          items={result.evidence as AgentEvidenceItem[]}
          title={evidenceTitle ?? "Evidence & Sources"}
        />
      )}
    </div>
  );
}
