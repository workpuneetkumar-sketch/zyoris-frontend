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
 * Enhanced with modern premium aesthetic styling for AI score cards,
 * recommendation badges, and evidence chips.
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
  Sparkles,
  Bot,
  Brain,
  ShieldAlert,
  Target,
  Zap,
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

const AGENT_META: Record<AgentType, { title: string; description: string; icon: any }> = {
  research: {
    title: "Research Agent",
    description: "AI-generated research and enrichment for this record.",
    icon: Sparkles,
  },
  qualify_lead: {
    title: "Lead Qualification Agent",
    description: "AI scoring and qualification analysis for this lead.",
    icon: Brain,
  },
  prepare_meeting: {
    title: "Sales Preparation Agent",
    description: "AI-generated meeting prep, talking points, and context.",
    icon: Bot,
  },
};

// ─── Confidence score badge ───────────────────────────────────────────────────

interface ConfidenceBadgeProps {
  score: number;
}

function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  const { pill, iconClass, Icon } =
    clamped >= 80
      ? {
          pill: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60",
          iconClass: "text-emerald-600 dark:text-emerald-400",
          Icon: TrendingUp,
        }
      : clamped >= 60
      ? {
          pill: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60",
          iconClass: "text-amber-600 dark:text-amber-400",
          Icon: Minus,
        }
      : {
          pill: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60",
          iconClass: "text-rose-600 dark:text-rose-400",
          Icon: TrendingDown,
        };

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs",
        pill
      )}
    >
      <Icon size={13} className={classNames("shrink-0", iconClass)} />
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
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-150",
    "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80",
    url && "cursor-pointer hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
  );

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={base}>
        <BookOpen size={11} className="shrink-0 text-blue-500" />
        {label}
      </a>
    );
  }

  return (
    <span className={base}>
      <BookOpen size={11} className="shrink-0 text-slate-400" />
      {label}
    </span>
  );
}

// ─── Evaluation Summary Card ──────────────────────────────────────────────────

function EvaluationSummaryCard({ summary }: { summary: string }) {
  // Regex parsing for Lead Qualification Agent evaluation summary strings
  const scoreMatch = summary.match(/evaluated as ([A-Z_\s]+)\s*\(Score:\s*([\d\.]+)\/100\)/i);
  const statusStr = scoreMatch ? scoreMatch[1].trim() : null;
  const scoreVal = scoreMatch ? parseFloat(scoreMatch[2]) : null;

  const fitMatch = summary.match(/Fit:\s*([\d\.]+|[A-Z\s\(\)]+)/i);
  const intentMatch = summary.match(/Intent:\s*([\d\.]+\s*\([A-Z]+\)|[\d\.]+|[A-Z\s]+)/i);
  const engagementMatch = summary.match(/Engagement:\s*([\d\.]+)/i);

  const isQualified = statusStr
    ? statusStr.toUpperCase().includes("QUALIFIED") && !statusStr.toUpperCase().includes("UNQUALIFIED")
    : false;

  if (scoreVal !== null || statusStr !== null) {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-slate-800 relative overflow-hidden">
        {/* Soft glow background accent */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border shadow-xs ${
                isQualified
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40"
              }`}
            >
              {statusStr || "EVALUATED"}
            </span>
            <span className="text-xs text-slate-400 font-medium">AI Qualification Evaluation</span>
          </div>

          {scoreVal !== null && (
            <div className="flex items-baseline gap-1.5 bg-slate-800/90 px-3.5 py-1.5 rounded-xl border border-slate-700/80 shadow-xs">
              <span className="text-xl font-black text-white">{scoreVal}</span>
              <span className="text-xs text-slate-400 font-bold">/ 100</span>
            </div>
          )}
        </div>

        {/* Structured 3-Column Metrics Breakdown */}
        <div className="grid grid-cols-3 gap-3 pt-4">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 text-center">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 block mb-0.5 tracking-wider">ICP Fit</span>
            <span className="text-xs font-bold text-slate-100">{fitMatch ? fitMatch[1] : "0"}</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 text-center">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 block mb-0.5 tracking-wider">Buyer Intent</span>
            <span className="text-xs font-bold text-slate-100">{intentMatch ? intentMatch[1] : "Low"}</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 text-center">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 block mb-0.5 tracking-wider">Engagement</span>
            <span className="text-xs font-bold text-slate-100">{engagementMatch ? engagementMatch[1] : "100"}</span>
          </div>
        </div>

        {/* Narrative text */}
        <p className="mt-3.5 text-xs text-slate-300 leading-relaxed font-normal bg-slate-950/40 p-3 rounded-xl border border-slate-800/70">
          {summary}
        </p>
      </div>
    );
  }

  // Fallback for generic summary text
  return (
    <div className="bg-slate-50 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
        Summary
      </p>
      <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
        {summary}
      </p>
    </div>
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

  function extractString(val: unknown): string | undefined {
    if (val == null) return undefined;
    if (typeof val === "string") return val || undefined;
    if (typeof val === "object") {
      const v = val as Record<string, unknown>;
      const candidate =
        v.actionTitle ?? v.title ?? v.recommendation ?? v.text ??
        v.label ?? v.summary ?? v.description ?? v.detailedRationale;
      if (typeof candidate === "string" && candidate) return candidate;
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

  const isFactorNote = text.toLowerCase().includes("factor note");

  const handleApply = async () => {
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
    <div
      className={`rounded-2xl border bg-white dark:bg-slate-900 overflow-hidden shadow-2xs hover:shadow-xs transition-all duration-150 ${
        isFactorNote
          ? "border-slate-200/90 dark:border-slate-800"
          : "border-slate-200 dark:border-slate-800 border-l-4 border-l-blue-600"
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3.5 p-4">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
            isFactorNote
              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              : "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
          }`}
        >
          {isFactorNote ? <Target size={15} /> : <Lightbulb size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {text}
          </h4>
          {rec.reason && (
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {rec.reason}
            </p>
          )}
        </div>
      </div>

      {/* Evidence chips + Approve button */}
      {(hasEvidence || hasSuggestedAction) && (
        <div className="px-4 pb-4 pt-1 space-y-3">
          {/* Evidence toggle */}
          {hasEvidence && (
            <div>
              <button
                onClick={() => setEvidenceOpen((v) => !v)}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-2"
              >
                {evidenceOpen ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
                {evidenceOpen ? "Hide" : "Show"} evidence ({rec.evidence!.length})
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
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              {applied ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={14} /> Applied
                </span>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                  >
                    {applying ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Send size={12} />
                    )}
                    {applying ? "Applying…" : "Approve & Apply"}
                  </button>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {(() => {
                      const sa = rec.suggestedAction;
                      if (!sa) return null;
                      const display =
                        sa.label ??
                        sa.type ??
                        (sa as any).actionTitle ??
                        (sa as any).recommendedChannel ??
                        (sa as any).priority;
                      if (typeof display === "string") return display;
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
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Evidence & Sources
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {allItems.length}
          </span>
        </div>
        {open ? (
          <ChevronUp size={14} className="text-slate-400" />
        ) : (
          <ChevronDown size={14} className="text-slate-400" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-200/80 dark:border-slate-800">
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
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold animate-pulse">
        AI Agent is evaluating signals…
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
        className="text-rose-500"
      />
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
          Agent execution failed
        </p>
        <p className="text-xs text-slate-500 max-w-xs">
          {message}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
      >
        <RefreshCw size={13} /> Retry Execution
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
        <Lightbulb size={24} className="text-slate-400" />
      </div>
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
        No insights returned
      </p>
      <p className="text-xs text-slate-500 max-w-xs">
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
  const AgentIcon = meta.icon;
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
              <span className="text-xs text-slate-500 font-medium">
                Based on active database signals & evidence
              </span>
            </div>
          )}

          {/* Summary Card */}
          {output.summary && (
            <EvaluationSummaryCard summary={output.summary} />
          )}

          {/* Recommendations */}
          {recs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Recommendations ({recs.length})
                </p>
              </div>
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
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-2xs",
          "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300",
          running && "opacity-60 cursor-not-allowed",
          className
        )}
      >
        {running ? (
          <RefreshCw size={13} className="animate-spin text-blue-600" />
        ) : (
          icon
        )}
        {running ? "Evaluating…" : buttonLabel}
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
