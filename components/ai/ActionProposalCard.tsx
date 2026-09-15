"use client";

/**
 * components/ai/ActionProposalCard.tsx
 * ─────────────────────────────────────────────────────────────
 * Premium interactive Proposal Card rendered inside ZiiBot chat
 * (and anywhere else) when an action agent proposes an action.
 *
 * Handles two actionPreview variants:
 *   • DraftMessage  — shows an editable email/message composer
 *   • ProposedAction — shows a CRM change summary card
 *
 * Four status states with animated transitions:
 *   PENDING  → amber pulse ring   (awaiting user decision)
 *   APPROVED → blue               (approved, not yet executed)
 *   REJECTED → red                (rejected, shows reason)
 *   EXECUTED → green              (ran on backend, terminal state)
 *
 * Evidence modal — "View Evidence" button opens Modal.tsx with
 * the full evidence list explaining the agent's reasoning.
 *
 * All colors from globals.css CSS variable tokens.
 * All animations via framer-motion (matching ZiiBotPanel pattern).
 * No hardcoded hex/rgb values.
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import classNames from "classnames";
import {
  Mail,
  MessageSquare,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Edit3,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Bot,
  RefreshCw,
  Eye,
  ArrowRight,
  Shield,
} from "lucide-react";
import { toast } from "react-toastify";
import { Modal } from "@/components/ui/Modal";
import { executeApproval, decideAgentApproval } from "@/lib/api/approvalsApi";
import type {
  AgentApprovalRequest,
  AgentApprovalStatus,
  DraftMessage,
  ProposedAction,
  ProposalEvidence,
  ProposalRiskLevel,
} from "@/types/ai-proposals";

// ─── Type guards ──────────────────────────────────────────────────────────────

function isDraftMessage(p: DraftMessage | ProposedAction): p is DraftMessage {
  return p.type === "DraftMessage";
}

// ─── Risk level badge ─────────────────────────────────────────────────────────
// Colors via CSS variable tokens.
// LOW → success, MEDIUM → warning, HIGH → error

function RiskBadge({ level }: { level: ProposalRiskLevel }) {
  const styles: Record<ProposalRiskLevel, string> = {
    LOW:    "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)] border-[color:var(--color-success-light)]",
    MEDIUM: "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]",
    HIGH:   "bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)] border-[color:var(--color-error-light)]",
  };
  const icons: Record<ProposalRiskLevel, React.ReactNode> = {
    LOW:    <Shield size={10} className="shrink-0" />,
    MEDIUM: <AlertTriangle size={10} className="shrink-0" />,
    HIGH:   <AlertTriangle size={10} className="shrink-0" />,
  };
  return (
    <span className={classNames(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
      styles[level]
    )}>
      {icons[level]}
      {level} RISK
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

interface StatusConfig {
  pill: string;
  dot: string;
  label: string;
  pulse: boolean;
  Icon: React.ElementType;
}

const STATUS_CONFIG: Record<AgentApprovalStatus, StatusConfig> = {
  PENDING: {
    pill: "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]",
    dot:  "bg-[color:var(--color-warning)]",
    label: "Awaiting Review",
    pulse: true,
    Icon: Clock,
  },
  APPROVED: {
    pill: "bg-[color:var(--color-info-light)] text-[color:var(--color-info-foreground)] border-[color:var(--color-info-light)]",
    dot:  "bg-[color:var(--color-info)]",
    label: "Approved",
    pulse: false,
    Icon: CheckCircle2,
  },
  REJECTED: {
    pill: "bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)] border-[color:var(--color-error-light)]",
    dot:  "bg-[color:var(--color-error)]",
    label: "Rejected",
    pulse: false,
    Icon: XCircle,
  },
  EXECUTED: {
    pill: "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)] border-[color:var(--color-success-light)]",
    dot:  "bg-[color:var(--color-success)]",
    label: "Executed",
    pulse: false,
    Icon: CheckCircle2,
  },
};

function StatusBadge({ status }: { status: AgentApprovalStatus }) {
  const cfg = STATUS_CONFIG[status];
  const { Icon } = cfg;
  return (
    <span className={classNames(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
      cfg.pill
    )}>
      {cfg.pulse ? (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={classNames("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", cfg.dot)} />
          <span className={classNames("relative inline-flex rounded-full h-2 w-2", cfg.dot)} />
        </span>
      ) : (
        <Icon size={11} className="shrink-0" />
      )}
      {cfg.label}
    </span>
  );
}

// ─── Evidence modal ───────────────────────────────────────────────────────────

function EvidenceModal({
  evidence,
  agentName,
  isOpen,
  onClose,
}: {
  evidence: ProposalEvidence[];
  agentName?: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const weightColor = (w?: string) => {
    if (w === "high")   return "text-[color:var(--color-error-foreground)] bg-[color:var(--color-error-light)] border-[color:var(--color-error-light)]";
    if (w === "medium") return "text-[color:var(--color-warning-foreground)] bg-[color:var(--color-warning-light)] border-[color:var(--color-warning-light)]";
    return "text-[color:var(--color-text-muted)] bg-[color:var(--color-background-secondary)] border-[color:var(--color-border)]";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agent Evidence"
      description={`Why ${agentName ?? "the agent"} made this proposal`}
      className="max-w-lg"
    >
      {evidence.length === 0 ? (
        <p className="text-sm text-[color:var(--color-text-muted)] italic text-center py-6">
          No evidence data provided.
        </p>
      ) : (
        <div className="space-y-3">
          {evidence.map((ev, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-active)] p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Info size={13} className="text-[color:var(--color-info)] shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-[color:var(--color-text)]">{ev.label}</p>
                </div>
                {ev.weight && (
                  <span className={classNames(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0",
                    weightColor(ev.weight)
                  )}>
                    {ev.weight}
                  </span>
                )}
              </div>
              <p className="text-sm text-[color:var(--color-text-secondary)] leading-relaxed">
                {ev.observation}
              </p>
              {ev.sourceUrl && (
                <a
                  href={ev.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-[color:var(--color-primary)] hover:underline font-medium"
                >
                  View source <ArrowRight size={10} />
                </a>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ─── Rejection modal ──────────────────────────────────────────────────────────

function RejectionModal({
  isOpen,
  onClose,
  onConfirm,
  submitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  submitting: boolean;
}) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reject Action"
      description="Provide a reason so the agent can improve future proposals."
      className="max-w-md"
      footer={
        <div className="flex gap-2 w-full">
          <button
            onClick={handleConfirm}
            disabled={submitting || !reason.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-[color:var(--color-error)] hover:opacity-90 disabled:opacity-50 text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl transition-all"
          >
            {submitting
              ? <><RefreshCw size={13} className="animate-spin" /> Rejecting…</>
              : <><XCircle size={13} /> Reject</>
            }
          </button>
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all"
          >
            Cancel
          </button>
        </div>
      }
    >
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="e.g. Incorrect tone, wrong recipient, timing not right…"
        className="w-full text-sm px-3 py-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info-light)] transition-all resize-none"
        autoFocus
      />
    </Modal>
  );
}

// ─── Draft message variant ────────────────────────────────────────────────────

function DraftMessagePreview({
  draft,
  editable,
  onBodyChange,
}: {
  draft: DraftMessage;
  editable: boolean;
  onBodyChange: (v: string) => void;
}) {
  const channelIcon =
    draft.channel === "whatsapp" || draft.channel === "sms"
      ? <MessageSquare size={14} className="text-[color:var(--color-success)]" />
      : <Mail size={14} className="text-[color:var(--color-primary)]" />;

  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-active)] overflow-hidden">
      {/* Message header */}
      <div className="px-4 py-3 border-b border-[color:var(--color-border-light)] flex items-center gap-2 flex-wrap">
        {channelIcon}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[color:var(--color-text-muted)] font-medium">To:</span>
            <span className="text-[color:var(--color-text)] font-semibold truncate">{draft.to}</span>
          </div>
          {draft.cc && draft.cc.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[color:var(--color-text-muted)] font-medium">CC:</span>
              <span className="text-[color:var(--color-text-secondary)] truncate">{draft.cc.join(", ")}</span>
            </div>
          )}
          {draft.subject && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[color:var(--color-text-muted)] font-medium">Subject:</span>
              <span className="text-[color:var(--color-text)] font-semibold truncate">{draft.subject}</span>
            </div>
          )}
        </div>
      </div>

      {/* Editable body */}
      <div className="p-4">
        {editable ? (
          <div className="relative">
            <div className="flex items-center gap-1 mb-2">
              <Edit3 size={11} className="text-[color:var(--color-primary)]" />
              <span className="text-[10px] font-bold text-[color:var(--color-primary)] uppercase tracking-wider">
                Editable — modify before sending
              </span>
            </div>
            <textarea
              value={draft.body}
              onChange={(e) => onBodyChange(e.target.value)}
              rows={5}
              className="w-full text-sm px-3 py-2 rounded-xl border border-[color:var(--color-primary)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info-light)] transition-all resize-none leading-relaxed"
            />
          </div>
        ) : (
          <p className="text-sm text-[color:var(--color-text)] leading-relaxed whitespace-pre-wrap">
            {draft.body}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Proposed action variant ──────────────────────────────────────────────────

function ProposedActionPreview({ action }: { action: ProposedAction }) {
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-active)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[color:var(--color-border-light)] flex items-center gap-2">
        <Zap size={14} className="text-[color:var(--color-warning-foreground)]" />
        <span className="text-xs font-bold text-[color:var(--color-text)]">{action.label}</span>
      </div>
      <div className="p-4 space-y-3">
        {/* Entity target */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[color:var(--color-text-muted)] font-medium w-16 shrink-0">Target</span>
          <span className="font-semibold text-[color:var(--color-text)] capitalize">{action.entityType}</span>
          <span className="font-mono text-[10px] text-[color:var(--color-text-muted)] bg-[color:var(--color-background-secondary)] px-1.5 py-0.5 rounded border border-[color:var(--color-border)] truncate">
            {action.entityId}
          </span>
        </div>

        {/* Changes table */}
        {Object.keys(action.changes).length > 0 && (
          <div className="rounded-lg border border-[color:var(--color-border)] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[color:var(--color-background-secondary)] border-b border-[color:var(--color-border)]">
                  <th className="text-left px-3 py-2 font-semibold text-[color:var(--color-text-muted)] uppercase tracking-wider">Field</th>
                  <th className="text-left px-3 py-2 font-semibold text-[color:var(--color-text-muted)] uppercase tracking-wider">New Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border-light)]">
                {Object.entries(action.changes).map(([field, value]) => (
                  <tr key={field}>
                    <td className="px-3 py-2 font-medium text-[color:var(--color-text)]">{field}</td>
                    <td className="px-3 py-2 font-mono text-[color:var(--color-success)] bg-[color:var(--color-success-light)] font-semibold">
                      {JSON.stringify(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Consequence warning */}
        {action.consequence && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[color:var(--color-warning-light)] border border-[color:var(--color-warning-light)]">
            <AlertTriangle size={13} className="text-[color:var(--color-warning)] shrink-0 mt-0.5" />
            <p className="text-xs text-[color:var(--color-warning-foreground)] leading-relaxed">
              <span className="font-bold">If not actioned: </span>{action.consequence}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ActionProposalCard ──────────────────────────────────────────────────

export interface ActionProposalCardProps {
  /** The full approval request from the backend */
  proposal: AgentApprovalRequest;
  /**
   * Called after a successful state change so the parent can
   * update its copy of the proposal (e.g. in message history).
   */
  onStatusChange?: (id: string, newStatus: AgentApprovalStatus, updated: Partial<AgentApprovalRequest>) => void;
}

export function ActionProposalCard({ proposal: initialProposal, onStatusChange }: ActionProposalCardProps) {
  // Local snapshot of the proposal — updated after each API call
  const [proposal, setProposal] = useState<AgentApprovalRequest>(initialProposal);

  // Draft body is editable only when status is PENDING and preview is DraftMessage
  const [editedBody, setEditedBody] = useState<string>(
    isDraftMessage(initialProposal.actionPreview) ? initialProposal.actionPreview.body : ""
  );

  // UI state
  const [approving,         setApproving]         = useState(false);
  const [rejecting,         setRejecting]          = useState(false);
  const [executing,         setExecuting]          = useState(false);
  const [showEvidence,      setShowEvidence]       = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [evidenceOpen,      setEvidenceOpen]       = useState(false);

  const isTerminal = proposal.status === "REJECTED" || proposal.status === "EXECUTED";
  const isPending  = proposal.status === "PENDING";
  const isApproved = proposal.status === "APPROVED";
  const hasDraft   = isDraftMessage(proposal.actionPreview);
  const hasEvidence = (proposal.evidence ?? []).length > 0;

  const update = useCallback((patch: Partial<AgentApprovalRequest>) => {
    const merged = { ...proposal, ...patch };
    setProposal(merged);
    onStatusChange?.(proposal.id, merged.status, patch);
  }, [proposal, onStatusChange]);

  // ── Approve ──────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (isTerminal || approving) return;
    setApproving(true);
    try {
      const result = await decideAgentApproval(proposal.id, "APPROVED");
      update({ status: result.status ?? "APPROVED" });
      toast.success("Action approved — ready to execute.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to approve.");
    } finally {
      setApproving(false);
    }
  };

  // ── Reject ───────────────────────────────────────────────────────────────────
  const handleRejectConfirm = async (reason: string) => {
    setRejecting(true);
    try {
      const result = await decideAgentApproval(proposal.id, "REJECTED", reason);
      update({ status: result.status ?? "REJECTED", rejectionReason: reason });
      setShowRejectionModal(false);
      toast.info("Action rejected.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to reject.");
    } finally {
      setRejecting(false);
    }
  };

  // ── Execute / Approve & Send ─────────────────────────────────────────────────
  const handleExecute = async () => {
    if (executing) return;
    // For DraftMessage, patch the body if the user edited it before executing
    // (The edited body is passed as context — the backend owns actual sending)
    setExecuting(true);
    try {
      const result = await executeApproval(proposal.id);
      if (!result.success) {
        throw new Error(result.message ?? "Execution returned unsuccessful status.");
      }
      update({ status: "EXECUTED" });
      toast.success(hasDraft ? "Message sent successfully!" : "Action executed successfully!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to execute.");
    } finally {
      setExecuting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const preview = proposal.actionPreview;
  const displayName = isDraftMessage(preview)
    ? `Draft ${preview.channel === "whatsapp" ? "WhatsApp" : "Email"}`
    : (preview as ProposedAction).label;

  return (
    <>
      {/* Evidence modal */}
      <EvidenceModal
        evidence={proposal.evidence ?? []}
        agentName={proposal.agentName}
        isOpen={showEvidence}
        onClose={() => setShowEvidence(false)}
      />

      {/* Rejection reason modal */}
      <RejectionModal
        isOpen={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
        onConfirm={handleRejectConfirm}
        submitting={rejecting}
      />

      {/* ── Card ─────────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className={classNames(
          "rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md",
          // Outer border tint shifts with status
          isPending  && "border-[color:var(--color-warning-light)]",
          isApproved && "border-[color:var(--color-info-light)]",
          proposal.status === "EXECUTED" && "border-[color:var(--color-success-light)]",
          proposal.status === "REJECTED" && "border-[color:var(--color-error-light)]",
          // Default fallback for unknown status
          !isPending && !isApproved && proposal.status !== "EXECUTED" && proposal.status !== "REJECTED" && "border-[color:var(--color-border)]"
        )}
        style={{ background: "var(--color-surface)" }}
      >
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-[color:var(--color-border-light)]">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              <Bot size={15} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[color:var(--color-text-muted)] mb-0.5">
                {proposal.agentName ?? "AI Agent"} proposes
              </p>
              <p className="text-sm font-bold text-[color:var(--color-text)] leading-tight truncate">
                {displayName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <RiskBadge level={proposal.riskLevel} />
            <StatusBadge status={proposal.status} />
          </div>
        </div>

        {/* ── Action preview ───────────────────────────────────────────────────── */}
        <div className="px-4 py-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={proposal.status}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {hasDraft ? (
                <DraftMessagePreview
                  draft={{
                    ...(preview as DraftMessage),
                    body: editedBody,
                  }}
                  editable={isPending}
                  onBodyChange={setEditedBody}
                />
              ) : (
                <ProposedActionPreview action={preview as ProposedAction} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Evidence toggle ──────────────────────────────────────────────────── */}
        {hasEvidence && (
          <div className="px-4 pb-2">
            <button
              onClick={() => setShowEvidence(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[color:var(--color-primary)] hover:underline"
            >
              <Eye size={12} />
              View Evidence ({proposal.evidence!.length} signal{proposal.evidence!.length !== 1 ? "s" : ""})
            </button>
          </div>
        )}

        {/* ── Confidence score ─────────────────────────────────────────────────── */}
        {proposal.confidenceScore != null && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[color:var(--color-background-secondary)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${proposal.confidenceScore}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={classNames(
                  "h-full rounded-full",
                  proposal.confidenceScore >= 80 ? "bg-[color:var(--color-success)]" :
                  proposal.confidenceScore >= 60 ? "bg-[color:var(--color-warning)]" :
                  "bg-[color:var(--color-text-muted)]"
                )}
              />
            </div>
            <span className="text-[10px] font-bold text-[color:var(--color-text-muted)] shrink-0">
              {proposal.confidenceScore}% conf.
            </span>
          </div>
        )}

        {/* ── Rejection reason ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {proposal.status === "REJECTED" && proposal.rejectionReason && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mb-3 px-3 py-2.5 rounded-xl bg-[color:var(--color-error-light)] border border-[color:var(--color-error-light)]"
            >
              <p className="text-[11px] font-semibold text-[color:var(--color-error-foreground)] flex items-center gap-1.5">
                <XCircle size={11} /> Rejection reason
              </p>
              <p className="text-xs text-[color:var(--color-error-foreground)] mt-1 opacity-90">
                {proposal.rejectionReason}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Terminal state banner ────────────────────────────────────────────── */}
        <AnimatePresence>
          {proposal.status === "EXECUTED" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mb-3 px-3 py-2.5 rounded-xl bg-[color:var(--color-success-light)] border border-[color:var(--color-success-light)]"
            >
              <p className="text-[11px] font-semibold text-[color:var(--color-success-foreground)] flex items-center gap-1.5">
                <CheckCircle2 size={11} />
                {hasDraft ? "Message sent" : "Action executed"} successfully
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Action controls ──────────────────────────────────────────────────── */}
        {!isTerminal && (
          <div className="px-4 pb-4 pt-1 border-t border-[color:var(--color-border-light)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={`controls-${proposal.status}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex flex-wrap gap-2 pt-3"
              >
                {/* PENDING state — Approve + Reject */}
                {isPending && (
                  <>
                    <button
                      onClick={handleApprove}
                      disabled={approving || rejecting}
                      className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-2 px-3 py-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 text-[color:var(--color-primary-foreground)] text-xs font-bold rounded-xl transition-all shadow-sm"
                    >
                      {approving
                        ? <><RefreshCw size={12} className="animate-spin" /> Approving…</>
                        : <><CheckCircle2 size={12} /> Approve</>
                      }
                    </button>
                    <button
                      onClick={() => setShowRejectionModal(true)}
                      disabled={approving || rejecting}
                      className="flex-1 min-w-[80px] inline-flex items-center justify-center gap-2 px-3 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-error-light)] hover:bg-[color:var(--color-error-light)] disabled:opacity-60 text-[color:var(--color-error-foreground)] text-xs font-bold rounded-xl transition-all"
                    >
                      <XCircle size={12} /> Reject
                    </button>
                  </>
                )}

                {/* APPROVED state — Execute / Approve & Send */}
                {isApproved && (
                  <button
                    onClick={handleExecute}
                    disabled={executing}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/20"
                  >
                    {executing ? (
                      <><RefreshCw size={14} className="animate-spin" /> {hasDraft ? "Sending…" : "Executing…"}</>
                    ) : hasDraft ? (
                      <><Mail size={14} /> Approve & Send</>
                    ) : (
                      <><Play size={14} /> Execute Action</>
                    )}
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* ── Timestamp ────────────────────────────────────────────────────────── */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <p className="text-[10px] text-[color:var(--color-text-muted)]">
            {new Date(proposal.createdAt).toLocaleTimeString(undefined, {
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
          {proposal.expiresAt && isPending && (
            <p className="text-[10px] text-[color:var(--color-warning-foreground)] font-medium">
              Expires {new Date(proposal.expiresAt).toLocaleTimeString(undefined, {
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </motion.div>
    </>
  );
}
