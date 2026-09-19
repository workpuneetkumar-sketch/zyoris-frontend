"use client";

/**
 * components/agents/AgentResultModal.tsx
 * ─────────────────────────────────────────────────────────────
 * Shared result modal for all three Day 4 agents:
 *   - Research Agent
 *   - Lead Qualification Agent
 *   - Sales Preparation Agent
 *
 * Parameterised by agentType so labels adapt — one component,
 * not three near-duplicates.
 *
 * Reuses the existing <Modal> component from components/ui/Modal.tsx
 * for overlay, escape-key handling, accessibility, and CSS-var tokens.
 *
 * "Approve & Apply" is only rendered when a recommendation has a
 * suggestedAction field. It calls decideApproval() from the existing
 * approvalsApi — no new approval logic is introduced.
 *
 * All colors from CSS variable tokens or Tailwind semantic classes
 * mapped to those tokens.  Zero hardcoded hex/rgb values.
 */

import { useState } from "react";
import classNames from "classnames";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Lightbulb,
  BookOpen,
  Layers,
  Send,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { decideApproval } from "@/lib/api/approvalsApi";
import { toast } from "react-toastify";
import type {
  AgentExecutePayload,
  AgentExecuteResult,
  AgentRecommendation,
  AgentEvidenceItem,
} from "@/lib/api/agentApi";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentType =
  | "research"
  | "qualify_lead"
  | "prepare_meeting";

export interface AgentButtonConfig {
  agentType: AgentType;
  /** The entity ID relevant to this execution */
  entityId: string;
  /** Extra parameters merged into the payload */
  extraParams?: Record<string, unknown>;
  /** Optional override for the button label */
  label?: string;
}

interface AgentResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentType: AgentType;
  /** The result returned by executeAgent(), or null while loading / on error */
  result: AgentExecuteResult | null;
  /** True while the execute call is in-flight */
  loading: boolean;
  /** Error message if the execute call failed */
  error: string | null;
  /** Called when the user clicks "Retry" */
  onRetry: () => void;
}

// ─── Agent meta ───────────────────────────────────────────────────────────────

const AGENT_META: Record<AgentType, { title: string; description: string }> = {
  research: {
    title: "Research Agent",
    description: "AI-generated research and enrichment for this record.",
  },
  qualify_lead: {
    title: "Lead Qualification Agent",
    description: "AI scoring and qualification analysis for this lead.",
  },
  prepare_meeting: {
    title: "Sales Preparation Agent",
    description: "AI-generated meeting prep, talking points, and context.",
  },
};

// ─── Confidence score badge ───────────────────────────────────────────────────
// Colors map to existing CSS variable tokens:
//   ≥ 80 → success tokens  (--color-success-light / --color-success)
//   60–79 → warning tokens (--color-warning-light / --color-warning)
//   < 60  → neutral        (--color-background-secondary / --color-text-muted)

interface ConfidenceBadgeProps {
  score: number;
}

function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  const { pill, iconClass, Icon } =
    clamped >= 80
      ? {
          pill: "bg-[color:var(--color-success-light)] text-[color:var(--color-success)] border-[color:var(--color-success-light)]",
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
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border",
        pill
      )}
    >
      <Icon size={14} className={classNames("shrink-0", iconClass)} />
      {clamped}% Confidence
    </span>
  );
}

// ─── Evidence chips ───────────────────────────────────────────────────────────

function EvidenceChip({
  item,
  index,
}: {
  item: string | AgentEvidenceItem;
  index: number;
}) {
  const label =
    typeof item === "string"
      ? item
      : item.label ?? item.source ?? item.snippet ?? `Source ${index + 1}`;
  const url = typeof item === "object" ? item.url : undefined;

  const base = classNames(
    "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors",
    "bg-[color:var(--color-info-light)] text-[color:var(--color-info-foreground)] border-[color:var(--color-info-light)]",
    url && "cursor-pointer hover:opacity-80"
  );

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={base}>
        <BookOpen size={10} className="shrink-0" />
        {label}
      </a>
    );
  }

  return (
    <span className={base}>
      <BookOpen size={10} className="shrink-0" />
      {label}
    </span>
  );
}

// ─── Recommendation card ──────────────────────────────────────────────────────

function RecommendationCard({
  rec,
  index,
  executionId,
}: {
  rec: AgentRecommendation;
  index: number;
  executionId?: string;
}) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  // rec.recommendation (and rec.text / rec.title) may arrive from the backend
  // as a nested object — e.g. { actionTitle, detailedRationale, recommendedChannel, priority }.
  // Rendering an object directly as a JSX child throws React error #31.
  // Extract the most human-readable string from whatever shape arrives.
  function extractString(val: unknown): string | undefined {
    if (val == null) return undefined;
    if (typeof val === "string") return val || undefined;
    if (typeof val === "object") {
      const v = val as Record<string, unknown>;
      // Try known field names from various backend agent shapes
      const candidate =
        v.actionTitle ?? v.title ?? v.recommendation ?? v.text ??
        v.label ?? v.summary ?? v.description ?? v.detailedRationale;
      if (typeof candidate === "string" && candidate) return candidate;
      // Last resort: JSON so something is always shown rather than crashing
      try { return JSON.stringify(val); } catch { return undefined; }
    }
    return String(val);
  }
  const text =
    extractString(rec.recommendation) ??
    extractString(rec.text) ??
    extractString(rec.title) ??
    `Recommendation ${index + 1}`;
  const hasEvidence = rec.evidence && rec.evidence.length > 0;
  const hasSuggestedAction = !!rec.suggestedAction;

  // "Approve & Apply" uses the existing decideApproval endpoint when
  // an executionId / approvalId is present. If not, it shows a
  // confirmation and notes that server-side validation applies.
  const handleApply = async () => {
    // suggestedAction may come in various shapes from different agents.
    // Try the canonical payload.approvalId first, then fall back to executionId.
    const sa = rec.suggestedAction as Record<string, unknown> | undefined;
    const approvalId =
      (sa?.payload as Record<string, unknown> | undefined)?.approvalId as string | undefined
      ?? executionId;

    if (!approvalId) {
      toast.info("No approval ID available for this action — submit via the Approval Queue.");
      return;
    }

    try {
      setApplying(true);
      await decideApproval(approvalId, { decision: "APPROVED" });
      setApplied(true);
      toast.success("Action approved and submitted.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to apply action.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-6 h-6 rounded-full bg-[color:var(--color-info-light)] flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb size={12} className="text-[color:var(--color-info)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[color:var(--color-text)] leading-snug">
            {text}
          </p>
          {rec.reason && (
            <p className="mt-1.5 text-xs text-[color:var(--color-text-secondary)] leading-relaxed">
              {rec.reason}
            </p>
          )}
        </div>
      </div>

      {/* Evidence chips + Approve button */}
      {(hasEvidence || hasSuggestedAction) && (
        <div className="px-4 pb-4 space-y-3">
          {/* Evidence toggle */}
          {hasEvidence && (
            <div>
              <button
                onClick={() => setEvidenceOpen((v) => !v)}
                className="flex items-center gap-1 text-[11px] font-semibold text-[color:var(--color-primary)] hover:underline mb-2"
              >
                {evidenceOpen ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
                {evidenceOpen ? "Hide" : "Show"} evidence (
                {rec.evidence!.length})
              </button>
              {evidenceOpen && (
                <div className="flex flex-wrap gap-1.5">
                  {rec.evidence!.map((ev, i) => (
                    <EvidenceChip key={i} item={ev} index={i} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Approve & Apply — only when suggestedAction is present */}
          {hasSuggestedAction && (
            <div className="pt-1 border-t border-[color:var(--color-border-light)]">
              {applied ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--color-success)]">
                  <CheckCircle2 size={14} /> Applied
                </span>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 text-[color:var(--color-primary-foreground)] text-xs font-semibold rounded-xl transition-all"
                  >
                    {applying ? (
                      <RefreshCw size={11} className="animate-spin" />
                    ) : (
                      <Send size={11} />
                    )}
                    {applying ? "Applying…" : "Approve & Apply"}
                  </button>
                  <span className="text-[10px] text-[color:var(--color-text-muted)]">
                    {(() => {
                      const sa = rec.suggestedAction;
                      if (!sa) return null;
                      // label/type are the canonical fields; fall back to known
                      // backend variants so an object never reaches JSX (React #31)
                      const display =
                        sa.label ??
                        sa.type ??
                        (sa as any).actionTitle ??
                        (sa as any).recommendedChannel ??
                        (sa as any).priority;
                      if (typeof display === "string") return display;
                      // Object or undefined — don't render anything rather than crash
                      return null;
                    })()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Evidence drawer ──────────────────────────────────────────────────────────

function EvidenceDrawer({
  items,
  sources,
}: {
  items?: AgentEvidenceItem[];
  sources?: string[];
}) {
  const [open, setOpen] = useState(false);

  const allItems: (string | AgentEvidenceItem)[] = [
    ...(sources ?? []),
    ...(items ?? []),
  ];

  if (allItems.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[color:var(--color-surface-hover)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-[color:var(--color-text-muted)]" />
          <span className="text-xs font-bold text-[color:var(--color-text)]">
            Evidence & Sources
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border)]">
            {allItems.length}
          </span>
        </div>
        {open ? (
          <ChevronUp size={14} className="text-[color:var(--color-text-muted)]" />
        ) : (
          <ChevronDown size={14} className="text-[color:var(--color-text-muted)]" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 flex flex-wrap gap-1.5 border-t border-[color:var(--color-border-light)]">
          <div className="pt-3 w-full flex flex-wrap gap-1.5">
            {allItems.map((item, i) => (
              <EvidenceChip key={i} item={item} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal body states ────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-8 h-8 border-3 border-[color:var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-[color:var(--color-text-secondary)] font-medium animate-pulse">
        Agent is running…
      </p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
      <AlertCircle
        size={40}
        className="text-[color:var(--color-error)]"
      />
      <div>
        <p className="text-sm font-semibold text-[color:var(--color-text)] mb-1">
          Agent execution failed
        </p>
        <p className="text-xs text-[color:var(--color-text-secondary)] max-w-xs">
          {message}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl transition-all"
      >
        <RefreshCw size={13} /> Retry
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
      <div className="w-12 h-12 bg-[color:var(--color-background-secondary)] rounded-2xl flex items-center justify-center">
        <Lightbulb size={24} className="text-[color:var(--color-text-muted)]" />
      </div>
      <p className="text-sm font-semibold text-[color:var(--color-text)]">
        No insights returned
      </p>
      <p className="text-xs text-[color:var(--color-text-muted)] max-w-xs">
        The agent ran successfully but did not produce any recommendations or evidence for this record.
      </p>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function AgentResultModal({
  isOpen,
  onClose,
  agentType,
  result,
  loading,
  error,
  onRetry,
}: AgentResultModalProps) {
  const meta = AGENT_META[agentType] ?? AGENT_META.research;
  const output = result?.output;
  const recs = output?.recommendations ?? [];
  const hasContent =
    output &&
    (output.summary || recs.length > 0 || (output.evidence?.length ?? 0) > 0 || (output.sources?.length ?? 0) > 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={meta.title}
      description={meta.description}
      loading={loading}
      // Wider than default for the result layout
      className="max-w-2xl"
    >
      {/* Loading handled by Modal's built-in loading prop */}
      {!loading && error && (
        <ErrorState message={error} onRetry={onRetry} />
      )}

      {!loading && !error && !hasContent && result && (
        <EmptyState />
      )}

      {!loading && !error && hasContent && output && (
        <div className="space-y-5">
          {/* Confidence score */}
          {output.confidenceScore != null && (
            <div className="flex items-center gap-3">
              <ConfidenceBadge score={output.confidenceScore} />
              <span className="text-xs text-[color:var(--color-text-muted)]">
                Based on available data signals
              </span>
            </div>
          )}

          {/* Summary */}
          {output.summary && (
            <div className="bg-[color:var(--color-surface-active)] rounded-2xl p-4 border border-[color:var(--color-border-light)]">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-text-muted)] mb-2">
                Summary
              </p>
              <p className="text-sm text-[color:var(--color-text)] leading-relaxed">
                {output.summary}
              </p>
            </div>
          )}

          {/* Recommendations */}
          {recs.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-text-muted)] mb-3">
                Recommendations ({recs.length})
              </p>
              <div className="space-y-3">
                {recs.map((rec, i) => (
                  <RecommendationCard
                    key={i}
                    rec={rec}
                    index={i}
                    executionId={result.executionId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Evidence drawer */}
          <EvidenceDrawer
            items={output.evidence}
            sources={output.sources}
          />
        </div>
      )}
    </Modal>
  );
}

// ─── Trigger button (reusable across pages) ───────────────────────────────────

import { executeAgent } from "@/lib/api/agentApi";

interface AgentTriggerButtonProps {
  /** Which agent to run */
  agentType: AgentType;
  /** Full payload sent to POST /api/agents/execute */
  payload: AgentExecutePayload;
  /** Button label — defaults to the agent display name */
  label?: string;
  /** Lucide icon element shown before the label */
  icon?: React.ReactNode;
  /** Extra className on the button element */
  className?: string;
  /** Called after a successful result is received */
  onSuccess?: (result: AgentExecuteResult) => void;
}

/**
 * Self-contained trigger button + result modal.
 * Drop this onto any page with the right payload and it handles
 * the full loading → success/error → display cycle internally.
 */
export function AgentTriggerButton({
  agentType,
  payload,
  label,
  icon,
  className,
  onSuccess,
}: AgentTriggerButtonProps) {
  const [modalOpen, setModalOpen]   = useState(false);
  const [running,   setRunning]     = useState(false);
  const [result,    setResult]      = useState<AgentExecuteResult | null>(null);
  const [error,     setError]       = useState<string | null>(null);

  const meta = AGENT_META[agentType] ?? AGENT_META.research;
  const buttonLabel = label ?? meta.title;

  const run = async () => {
    setResult(null);
    setError(null);
    setRunning(true);
    setModalOpen(true);
    try {
      const res = await executeAgent(payload);
      setResult(res);
      onSuccess?.(res);
    } catch (err: any) {
      setError(err.message ?? "Agent execution failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <button
        onClick={run}
        disabled={running}
        className={classNames(
          "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
          "bg-[color:var(--color-info-light)] text-[color:var(--color-info-foreground)] border border-[color:var(--color-info-light)]",
          "hover:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed",
          className
        )}
      >
        {running ? (
          <RefreshCw size={14} className="animate-spin shrink-0" />
        ) : (
          icon ?? <Lightbulb size={14} className="shrink-0" />
        )}
        {running ? "Running…" : buttonLabel}
      </button>

      <AgentResultModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        agentType={agentType}
        result={result}
        loading={running}
        error={error}
        onRetry={run}
      />
    </>
  );
}
