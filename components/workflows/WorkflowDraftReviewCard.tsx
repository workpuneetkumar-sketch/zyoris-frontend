"use client";

/**
 * components/workflows/WorkflowDraftReviewCard.tsx
 * ─────────────────────────────────────────────────────────────
 * W5 — Workflow Draft Review
 *
 * Acceptance criteria (W5):
 * ✓ Persistent unmissable "Draft — Pending Approval" banner in every state
 * ✓ No visual/functional state can be mistaken for an active/running workflow
 * ✓ "Send for Approval" hands draft to existing Approval Queue — no new logic
 * ✓ Unresolved validationIssues block "Send for Approval"
 * ✓ Once sent, card shows link into the Approval Queue entry
 * ✓ All colors via CSS variable tokens
 */

import { useState } from "react";
import classNames from "classnames";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Send,
  RefreshCw,
  ExternalLink,
  Play,
  Zap,
  ArrowRight,
} from "lucide-react";
import { submitWorkflowDraftForApproval } from "@/lib/api/workflowsApi";
import { AgentResultFrame } from "@/components/agents/AgentResultFrame";
import { ApprovalStatusBadge } from "@/components/approvals/ApprovalStatusBadge";
import { toast } from "react-toastify";
import type { WorkflowDraftReview, WorkflowDraftStep, WorkflowValidationStatus } from "@/lib/types/agent-results";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkflowDraftReviewCardProps {
  draft: WorkflowDraftReview;
  /** Called after successful "Send for Approval" so parent can re-fetch */
  onSent?: (approvalRequestId: string) => void;
  className?: string;
}

// ─── Validation status badge ──────────────────────────────────────────────────

function ValidationBadge({ status }: { status: WorkflowValidationStatus }) {
  const styles: Record<WorkflowValidationStatus, { pill: string; icon: React.ElementType; label: string }> = {
    VALID: {
      pill: "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)] border-[color:var(--color-success-light)]",
      icon: CheckCircle2,
      label: "Valid",
    },
    INVALID: {
      pill: "bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)] border-[color:var(--color-error-light)]",
      icon: XCircle,
      label: "Invalid",
    },
    NEEDS_REVIEW: {
      pill: "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]",
      icon: AlertTriangle,
      label: "Needs Review",
    },
  };
  const s = styles[status] ?? styles.NEEDS_REVIEW;
  const Icon = s.icon;
  return (
    <span className={classNames(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
      s.pill
    )}>
      <Icon size={11} className="shrink-0" />
      {s.label}
    </span>
  );
}

// ─── Step row ─────────────────────────────────────────────────────────────────

function StepRow({ step, isLast }: { step: WorkflowDraftStep; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      {/* Spine */}
      <div className="flex flex-col items-center">
        <div className="w-6 h-6 rounded-full bg-[color:var(--color-info-light)] flex items-center justify-center shrink-0 text-[10px] font-bold text-[color:var(--color-info)]">
          {step.order}
        </div>
        {!isLast && (
          <div className="w-px flex-1 min-h-[20px] bg-[color:var(--color-border-light)] mt-1" />
        )}
      </div>

      {/* Content */}
      <div className={classNames("flex-1 pb-3", isLast && "pb-0")}>
        <div className="flex items-start gap-2 flex-wrap">
          <p className="text-xs font-semibold text-[color:var(--color-text)] leading-snug flex-1">
            {step.actionLabel}
          </p>
          <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border)] shrink-0">
            {step.actionType}
          </code>
        </div>
        {step.targetEntity && (
          <p className="text-[11px] text-[color:var(--color-text-muted)] mt-0.5">
            Target: <span className="font-medium capitalize">{step.targetEntity}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function WorkflowDraftReviewCard({
  draft: initialDraft,
  onSent,
  className,
}: WorkflowDraftReviewCardProps) {
  const [draft, setDraft]     = useState(initialDraft);
  const [sending, setSending] = useState(false);

  const hasBlockingIssues =
    draft.validationStatus === "INVALID" ||
    (draft.validationIssues ?? []).filter(Boolean).length > 0;

  const alreadySent = !!draft.approvalRequestId;

  const handleSend = async () => {
    if (hasBlockingIssues || alreadySent || sending) return;
    setSending(true);
    try {
      const res = await submitWorkflowDraftForApproval(draft.id, draft);
      const updated = { ...draft, approvalRequestId: res.approvalRequestId };
      setDraft(updated);
      onSent?.(res.approvalRequestId);
      toast.success("Workflow draft sent for approval.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send for approval.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AgentResultFrame
      result={draft}
      status="APPROVAL_REQUIRED"
      blockedReason="This workflow is a DRAFT. It cannot run in production until it has been reviewed and approved."
      evidenceTitle="Workflow Evidence"
      className={className}
      data-testid="workflow-draft-card"
    >
      <div className="space-y-5" data-testid="workflow-draft-content">

        {/* ── PERSISTENT DRAFT BANNER — shown in every state ────────────── */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-[color:var(--color-warning)] bg-[color:var(--color-warning-light)]"
          data-testid="draft-pending-banner"
          role="alert"
          aria-live="polite"
        >
          <Clock size={16} className="text-[color:var(--color-warning-foreground)] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-[color:var(--color-warning-foreground)] uppercase tracking-wider">
              Draft — Pending Approval
            </p>
            <p className="text-[11px] text-[color:var(--color-warning-foreground)] opacity-80 mt-0.5">
              This workflow has <strong>not been activated</strong>. It will only run
              in production after it passes the Approval Queue.
            </p>
          </div>
        </div>

        {/* ── Workflow identity ─────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-[color:var(--color-text)]">
              {draft.workflowName}
            </h3>
            <ValidationBadge status={draft.validationStatus} />
          </div>

          {/* Trigger */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[color:var(--color-background-secondary)] border border-[color:var(--color-border-light)]">
            <Zap size={13} className="text-[color:var(--color-primary)] shrink-0" />
            <p className="text-xs font-semibold text-[color:var(--color-text)]">
              Trigger:
            </p>
            <p className="text-xs text-[color:var(--color-text-secondary)]">
              {draft.trigger.label}
            </p>
          </div>
        </div>

        {/* ── Validation issues ─────────────────────────────────────────── */}
        {(draft.validationIssues ?? []).filter(Boolean).length > 0 && (
          <div className="rounded-xl border border-[color:var(--color-error-light)] bg-[color:var(--color-error-light)] p-3 space-y-1.5"
            data-testid="validation-issues"
          >
            <p className="text-[11px] font-bold text-[color:var(--color-error-foreground)] uppercase tracking-wider flex items-center gap-1.5">
              <XCircle size={12} /> Validation Issues — must resolve before sending
            </p>
            {draft.validationIssues!.filter(Boolean).map((issue, i) => (
              <p key={i} className="text-xs text-[color:var(--color-error-foreground)] opacity-90 leading-relaxed flex items-start gap-2">
                <ArrowRight size={11} className="shrink-0 mt-0.5" />
                {issue}
              </p>
            ))}
          </div>
        )}

        {/* ── Steps ────────────────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-text-muted)] mb-3 flex items-center gap-1.5">
            <Play size={10} />
            Actions ({draft.steps.length} steps)
          </p>
          <div className="bg-[color:var(--color-surface-active)] rounded-xl border border-[color:var(--color-border-light)] p-4 space-y-0">
            {draft.steps.map((step, i) => (
              <StepRow
                key={step.order}
                step={step}
                isLast={i === draft.steps.length - 1}
              />
            ))}
          </div>
        </div>

        {/* ── Send for Approval / Already Sent ─────────────────────────── */}
        <div className="pt-1 border-t border-[color:var(--color-border-light)]">
          {alreadySent ? (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--color-success)]">
                <CheckCircle2 size={14} />
                Sent for Approval
              </span>
              <ApprovalStatusBadge status="PENDING" variant="compact" />
              <a
                href={`/approvals/${draft.approvalRequestId}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-primary)] hover:underline"
                data-testid="approval-queue-link"
              >
                View in Approval Queue
                <ExternalLink size={11} />
              </a>
            </div>
          ) : (
            <div className="flex items-start gap-4 flex-wrap">
              <button
                onClick={handleSend}
                disabled={hasBlockingIssues || sending}
                data-testid="send-for-approval-btn"
                className={classNames(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                  hasBlockingIssues
                    ? "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border)] cursor-not-allowed"
                    : "bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-[color:var(--color-primary-foreground)]",
                  "disabled:opacity-60"
                )}
                title={hasBlockingIssues ? "Resolve all validation issues first" : "Send to Approval Queue"}
              >
                {sending
                  ? <RefreshCw size={14} className="animate-spin" />
                  : <Send size={14} />}
                {sending ? "Sending…" : "Send for Approval"}
              </button>
              {hasBlockingIssues && (
                <p className="text-xs text-[color:var(--color-error-foreground)] font-semibold self-center">
                  Resolve validation issues above to enable this button.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </AgentResultFrame>
  );
}
