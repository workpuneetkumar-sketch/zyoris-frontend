"use client";

/**
 * app/(dashboard)/approvals/[approvalId]/page.tsx
 * ─────────────────────────────────────────────────────────────
 * ApprovalDetail — full view for a single approval request.
 *
 * Shows: action preview, tool/agent info, evidence + reasoning,
 * impact summary, expiry countdown.
 *
 * Decide flow:
 * - APPROVE: shows a confirmation modal with "you are approving X"
 *   preview before the POST fires — no accidental single-click.
 * - REJECT: requires a non-empty rejectionReason before the
 *   submit button is enabled.
 * - Both paths call POST /api/approvals/:id/decide and re-fetch.
 *
 * Once APPROVED / REJECTED / EXPIRED the decide panel is
 * disabled with a clear status banner explaining why.
 *
 * Non-negotiable: no local-only approval state. Every decision
 * goes through the real endpoint.
 *
 * All colors via CSS variable tokens — no hardcoded hex/rgb.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getApproval, decideApproval } from "@/lib/api/approvalsApi";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Bot,
  Wrench,
  ShieldAlert,
  Info,
  Zap,
  FileText,
  Eye,
  Send,
  X,
} from "lucide-react";
import { ApprovalStatusBadge } from "@/components/approvals/ApprovalStatusBadge";
import { RiskTierBadge } from "@/components/agents/RiskTierBadge";
import type { ApprovalDetail } from "@/types/approvals";

// ─── Live countdown ───────────────────────────────────────────────────────────

function useCountdown(expiresAt?: string) {
  const [label, setLabel] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("Expired");
        setIsExpired(true);
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setLabel(h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`);
      setIsExpired(false);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return { label, isExpired };
}

// ─── Detail skeleton ──────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-pulse">
      <div className="h-5 w-24 bg-[color:var(--color-background-secondary)] rounded-lg" />
      <div className="h-32 bg-[color:var(--color-background-secondary)] rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="h-48 bg-[color:var(--color-background-secondary)] rounded-2xl" />
          <div className="h-36 bg-[color:var(--color-background-secondary)] rounded-2xl" />
        </div>
        <div className="space-y-5">
          <div className="h-56 bg-[color:var(--color-background-secondary)] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Info block ───────────────────────────────────────────────────────────────

function InfoBlock({
  icon,
  title,
  children,
  accent = "slate",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: "slate" | "blue" | "amber" | "red" | "green";
}) {
  const headerCls = {
    slate: "text-[color:var(--color-text-secondary)] border-[color:var(--color-border)]",
    blue:  "text-[color:var(--color-info-foreground)] border-[color:var(--color-info-light)]",
    amber: "text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]",
    red:   "text-[color:var(--color-error-foreground)] border-[color:var(--color-error-light)]",
    green: "text-[color:var(--color-success-foreground)] border-[color:var(--color-success-light)]",
  }[accent];

  return (
    <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden">
      <div className={`flex items-center gap-2 px-5 py-3.5 border-b ${headerCls}`}>
        {icon}
        <h3 className="text-xs font-extrabold uppercase tracking-widest">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Approve confirmation modal ───────────────────────────────────────────────

interface ConfirmApproveModalProps {
  approval: ApprovalDetail;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}

function ConfirmApproveModal({ approval, onConfirm, onCancel, submitting }: ConfirmApproveModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[color:var(--color-success-light)] flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} className="text-[color:var(--color-success)]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[color:var(--color-text)]">Confirm Approval</h3>
            <p className="text-xs text-[color:var(--color-text-muted)] mt-0.5">This action will be sent to the backend for final validation.</p>
          </div>
        </div>

        <div className="bg-[color:var(--color-background-secondary)] rounded-xl p-4 space-y-2 text-xs">
          <p className="text-[color:var(--color-text-muted)] font-semibold uppercase tracking-widest text-[10px]">You are approving:</p>
          <p className="font-semibold text-[color:var(--color-text)]">
            {approval.agentName || approval.agentId} → {approval.toolDisplayName || approval.toolName}
          </p>
          <p className="text-[color:var(--color-text-secondary)] leading-relaxed">{approval.actionSummary}</p>
          {approval.actionPreview && (
            <p className="text-[color:var(--color-text-muted)] italic border-t border-[color:var(--color-border)] pt-2 mt-2">
              {approval.actionPreview}
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[color:var(--color-success)] hover:opacity-90 disabled:opacity-60 text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl transition-all"
          >
            {submitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {submitting ? "Submitting…" : "Confirm Approve"}
          </button>
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Decide panel ──────────────────────────────────────────────────────────────

interface DecidePanelProps {
  approval: ApprovalDetail;
  onDecided: () => void;
}

function DecidePanel({ approval, onDecided }: DecidePanelProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const rejectRef = useRef<HTMLTextAreaElement>(null);

  const isClosed =
    approval.status === "APPROVED" ||
    approval.status === "REJECTED" ||
    approval.status === "EXPIRED";

  const handleApprove = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await decideApproval(approval.id, { decision: "APPROVED" });
      toast.success("Approval granted.");
      setShowApproveModal(false);
      onDecided();
    } catch (err: any) {
      setSubmitError(err.message ?? "Failed to approve.");
      toast.error(err.message ?? "Failed to approve.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      rejectRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await decideApproval(approval.id, { decision: "REJECTED", rejectionReason: rejectionReason.trim() });
      toast.success("Request rejected.");
      onDecided();
    } catch (err: any) {
      setSubmitError(err.message ?? "Failed to reject.");
      toast.error(err.message ?? "Failed to reject.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Closed state — decide UI is disabled ──────────────────────────────────
  if (isClosed) {
    const bannerCls = {
      APPROVED: { bg: "bg-[color:var(--color-success-light)]", text: "text-[color:var(--color-success-foreground)]", icon: <CheckCircle2 size={16} /> },
      REJECTED: { bg: "bg-[color:var(--color-error-light)]",   text: "text-[color:var(--color-error-foreground)]",   icon: <XCircle size={16} /> },
      EXPIRED:  { bg: "bg-[color:var(--color-background-secondary)]", text: "text-[color:var(--color-text-muted)]", icon: <Clock size={16} /> },
    }[approval.status as "APPROVED" | "REJECTED" | "EXPIRED"] ?? {
      bg: "bg-[color:var(--color-background-secondary)]", text: "text-[color:var(--color-text-muted)]", icon: <Info size={16} />
    };

    return (
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden">
        <div className={`px-5 py-4 flex items-center gap-3 ${bannerCls.bg} ${bannerCls.text}`}>
          {bannerCls.icon}
          <div>
            <p className="text-sm font-bold">
              {approval.status === "APPROVED" && "This request was approved"}
              {approval.status === "REJECTED" && "This request was rejected"}
              {approval.status === "EXPIRED"  && "This request has expired"}
            </p>
            <p className="text-xs mt-0.5 opacity-80">
              {approval.decidedAt
                ? `Decided ${new Date(approval.decidedAt).toLocaleString()}${approval.decidedBy ? ` by ${approval.decidedBy}` : ""}`
                : "No further action is possible."}
            </p>
          </div>
        </div>
        {approval.rejectionReason && (
          <div className="px-5 py-4 border-t border-[color:var(--color-border)]">
            <p className="text-[10px] font-bold text-[color:var(--color-text-muted)] uppercase tracking-widest mb-1">Rejection Reason</p>
            <p className="text-sm text-[color:var(--color-text-secondary)] leading-relaxed">{approval.rejectionReason}</p>
          </div>
        )}
        <div className="px-5 py-3 border-t border-[color:var(--color-border-light)]">
          <p className="text-[11px] text-[color:var(--color-text-muted)]">
            Decide controls are disabled — this approval is no longer open.
          </p>
        </div>
      </div>
    );
  }

  // ── Open PENDING state — show decide controls ─────────────────────────────
  return (
    <>
      {showApproveModal && (
        <ConfirmApproveModal
          approval={approval}
          onConfirm={handleApprove}
          onCancel={() => setShowApproveModal(false)}
          submitting={submitting}
        />
      )}

      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[color:var(--color-border)]">
          <Send size={14} className="text-[color:var(--color-primary)]" />
          <h3 className="text-sm font-bold text-[color:var(--color-text)]">Decision</h3>
          <span className="ml-auto text-[10px] text-[color:var(--color-text-muted)]">
            Backend validates the final decision
          </span>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Reject reason */}
          <div>
            <label className="block text-xs font-semibold text-[color:var(--color-text-secondary)] mb-1.5">
              Rejection Reason
              <span className="ml-1 text-[color:var(--color-error)] text-[10px]">(required to reject)</span>
            </label>
            <textarea
              ref={rejectRef}
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this action should not be permitted…"
              className="w-full text-sm px-3 py-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info-light)] transition-all resize-none"
            />
          </div>

          {/* Error */}
          {submitError && (
            <p className="text-xs font-medium text-[color:var(--color-error)] flex items-center gap-1.5">
              <AlertCircle size={12} /> {submitError}
            </p>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleReject}
              disabled={submitting || !rejectionReason.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[color:var(--color-error-light)] hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-[color:var(--color-error-foreground)] text-sm font-semibold rounded-xl transition-all"
            >
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} />}
              Reject
            </button>

            <button
              onClick={() => setShowApproveModal(true)}
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[color:var(--color-success)] hover:opacity-90 disabled:opacity-60 text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl transition-all"
            >
              <CheckCircle2 size={14} />
              Approve
            </button>
          </div>

          <p className="text-[11px] text-[color:var(--color-text-muted)] text-center leading-relaxed">
            Approve only if you have reviewed the action and evidence.
            Rejection requires a reason before the button activates.
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApprovalDetailPage() {
  const { user, token, isInitializing } = useAuth();
  const router = useRouter();
  const params = useParams();
  const approvalId = typeof params?.approvalId === "string"
    ? params.approvalId
    : Array.isArray(params?.approvalId)
      ? params.approvalId[0]
      : undefined;

  const [approval, setApproval] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const { label: countdown, isExpired } = useCountdown(
    approval?.status === "PENDING" ? approval.expiresAt : undefined
  );

  // Auth guard — wait for initialisation before checking role
  useEffect(() => {
    if (isInitializing) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ADMIN") router.replace("/dashboard");
  }, [user, isInitializing, router]);

  const fetchDetail = useCallback(async () => {
    if (!token || !approvalId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getApproval(approvalId as string);
      setApproval(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load approval.");
    } finally {
      setLoading(false);
    }
  }, [token, approvalId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  if (!user) return null;
  if (loading) return <DetailSkeleton />;

  if (error && !approval) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 max-w-[1400px] mx-auto">
        <AlertCircle size={48} className="text-[color:var(--color-error)] mb-4" />
        <h3 className="text-lg font-bold text-[color:var(--color-text)] mb-2">Failed to Load Approval</h3>
        <p className="text-sm text-[color:var(--color-text-secondary)] max-w-md mb-6">{error}</p>
        <div className="flex gap-3">
          <button onClick={fetchDetail} className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl transition-all">
            <RefreshCw size={14} /> Retry
          </button>
          <button onClick={() => router.push("/approvals")} className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all">
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>
    );
  }

  if (!approval) return null;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[color:var(--color-text-muted)]">
        <button onClick={() => router.push("/approvals")} className="hover:text-[color:var(--color-primary)] font-medium transition-colors flex items-center gap-1">
          <ArrowLeft size={12} /> Approval Queue
        </button>
        <ChevronRight size={12} />
        <span className="text-[color:var(--color-text)] font-semibold truncate max-w-[200px]">
          {approval.agentName || approval.agentId}
        </span>
      </nav>

      {/* Hero header */}
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[color:var(--color-warning-light)] border border-[color:var(--color-warning-light)] flex items-center justify-center shrink-0">
            <ShieldAlert size={22} className="text-[color:var(--color-warning-foreground)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-[color:var(--color-text)] tracking-tight">
                Approval Request
              </h1>
              <span className="text-[11px] font-mono text-[color:var(--color-text-muted)] bg-[color:var(--color-background-secondary)] px-2 py-0.5 rounded-md border border-[color:var(--color-border)]">
                {approval.id}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <ApprovalStatusBadge status={approval.status} />
              <RiskTierBadge tier={approval.riskTier} showLabel />
              {approval.status === "PENDING" && countdown && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  isExpired
                    ? "bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)] border-[color:var(--color-error-light)]"
                    : "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]"
                }`}>
                  <Clock size={11} />
                  {isExpired ? "Expired" : `Expires in ${countdown}`}
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl">
              {approval.actionSummary}
            </p>
          </div>
          <button onClick={fetchDetail} className="p-2 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-hover)] rounded-lg transition-all shrink-0" title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 2/3 + 1/3 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Action preview */}
          <InfoBlock icon={<Eye size={13} />} title="Action Preview" accent="blue">
            <p className="text-sm text-[color:var(--color-text)] leading-relaxed">
              {approval.actionPreview || approval.actionSummary || <span className="italic text-[color:var(--color-text-muted)]">No preview available.</span>}
            </p>
            {approval.actionPayload && (
              <pre className="mt-3 text-[11px] font-mono bg-[color:var(--color-background-secondary)] border border-[color:var(--color-border)] rounded-xl p-3 overflow-x-auto text-[color:var(--color-text-secondary)] leading-relaxed">
                {JSON.stringify(approval.actionPayload, null, 2)}
              </pre>
            )}
          </InfoBlock>

          {/* Evidence / reasoning */}
          <InfoBlock icon={<FileText size={13} />} title="Agent Evidence & Reasoning" accent="slate">
            {approval.evidence ? (
              <div className="space-y-3">
                {approval.evidence.reasoning && (
                  <p className="text-sm text-[color:var(--color-text)] leading-relaxed">{approval.evidence.reasoning}</p>
                )}
                {approval.evidence.confidenceScore != null && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[color:var(--color-text-muted)] font-medium">Confidence</span>
                    <div className="flex-1 h-2 bg-[color:var(--color-background-secondary)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[color:var(--color-primary)] rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(approval.evidence.confidenceScore, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[color:var(--color-text)]">
                      {approval.evidence.confidenceScore}%
                    </span>
                  </div>
                )}
                {approval.evidence.sources && approval.evidence.sources.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-[color:var(--color-text-muted)] uppercase tracking-widest mb-1.5">Sources consulted</p>
                    <div className="flex flex-wrap gap-1.5">
                      {approval.evidence.sources.map((s) => (
                        <span key={s} className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-[color:var(--color-background-secondary)] border border-[color:var(--color-border)] text-[color:var(--color-text-secondary)]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-[color:var(--color-text-muted)] italic">No evidence provided by the agent.</p>
            )}
          </InfoBlock>

          {/* Impact */}
          <InfoBlock icon={<Zap size={13} />} title="Predicted Impact" accent="amber">
            {approval.impact ? (
              <div className="space-y-3">
                {approval.impact.summary && (
                  <p className="text-sm text-[color:var(--color-text)] leading-relaxed">{approval.impact.summary}</p>
                )}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {approval.impact.reversible != null && (
                    <div>
                      <p className="text-[color:var(--color-text-muted)] font-medium mb-0.5">Reversible?</p>
                      <p className={`font-semibold ${approval.impact.reversible ? "text-[color:var(--color-success-foreground)]" : "text-[color:var(--color-error-foreground)]"}`}>
                        {approval.impact.reversible ? "Yes" : "No — irreversible action"}
                      </p>
                    </div>
                  )}
                  {approval.impact.estimatedScope && (
                    <div>
                      <p className="text-[color:var(--color-text-muted)] font-medium mb-0.5">Estimated scope</p>
                      <p className="font-semibold text-[color:var(--color-text)]">{approval.impact.estimatedScope}</p>
                    </div>
                  )}
                </div>
                {approval.impact.affectedEntities && approval.impact.affectedEntities.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-[color:var(--color-text-muted)] uppercase tracking-widest mb-1.5">Affected entities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {approval.impact.affectedEntities.map((e) => (
                        <span key={e} className="text-[11px] px-2 py-0.5 rounded-lg bg-[color:var(--color-warning-light)] border border-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] font-medium">
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-[color:var(--color-text-muted)] italic">No impact analysis provided.</p>
            )}
          </InfoBlock>
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Agent + tool info */}
          <InfoBlock icon={<Bot size={13} />} title="Request Details" accent="slate">
            <dl className="space-y-2.5 text-xs">
              {[
                { label: "Agent",       value: approval.agentName || approval.agentId },
                { label: "Agent ID",    value: approval.agentId,     mono: true },
                { label: "Tool",        value: approval.toolDisplayName || approval.toolName },
                { label: "Tool ID",     value: approval.toolName,    mono: true },
                { label: "Requested",   value: approval.requestedAt ? new Date(approval.requestedAt).toLocaleString() : undefined },
                { label: "Expires",     value: approval.expiresAt   ? new Date(approval.expiresAt).toLocaleString()  : undefined },
              ].filter((r) => r.value).map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt className="text-[color:var(--color-text-muted)] font-medium shrink-0">{row.label}</dt>
                  <dd className={`text-[color:var(--color-text)] text-right break-all ${row.mono ? "font-mono text-[11px]" : ""}`}>
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </InfoBlock>

          {/* Tool badge row */}
          <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench size={13} className="text-[color:var(--color-text-muted)]" />
              <span className="text-xs font-bold text-[color:var(--color-text-muted)] uppercase tracking-widest">Tool Risk</span>
            </div>
            <RiskTierBadge tier={approval.riskTier} showLabel />
            {(approval.riskTier === "HIGH" || approval.riskTier === "CRITICAL") && (
              <p className="mt-3 text-[11px] text-[color:var(--color-error-foreground)] bg-[color:var(--color-error-light)] border border-[color:var(--color-error-light)] rounded-xl px-3 py-2 leading-relaxed">
                High-risk action. Review the evidence and impact carefully before approving.
              </p>
            )}
          </div>

          {/* Decide panel */}
          <DecidePanel approval={approval} onDecided={fetchDetail} />

        </div>
      </div>
    </div>
  );
}
