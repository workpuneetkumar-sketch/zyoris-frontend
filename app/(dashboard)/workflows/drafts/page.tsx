"use client";

/**
 * app/(dashboard)/workflows/drafts/page.tsx
 * ─────────────────────────────────────────────────────────────
 * W5 — Workflow Draft Review — List page
 *
 * Static segment: /workflows/drafts
 * Dynamic child:  /workflows/drafts/[draftId]
 * No collision — static list is at this depth, dynamic is one level deeper.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getWorkflowDrafts } from "@/lib/api/workflowsApi";
import { WorkflowDraftReviewCard } from "@/components/workflows/WorkflowDraftReviewCard";
import { toast } from "react-toastify";
import { GitBranch, RefreshCw, AlertCircle, ChevronRight } from "lucide-react";
import type { WorkflowDraftReview } from "@/lib/types/agent-results";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm p-5 space-y-4 animate-pulse">
      <div className="h-10 bg-[color:var(--color-warning-light)] rounded-xl" />
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="h-5 bg-[color:var(--color-background-secondary)] rounded w-48" />
          <div className="h-5 bg-[color:var(--color-background-secondary)] rounded w-20" />
        </div>
        <div className="h-8 bg-[color:var(--color-background-secondary)] rounded-xl" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-[color:var(--color-background-secondary)] shrink-0" />
            <div className="h-4 bg-[color:var(--color-background-secondary)] rounded flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Draft summary row (compact list view) ────────────────────────────────────

function DraftSummaryRow({
  draft,
  onClick,
}: {
  draft: WorkflowDraftReview;
  onClick: () => void;
}) {
  const statusColor =
    draft.validationStatus === "VALID"
      ? "text-[color:var(--color-success)]"
      : draft.validationStatus === "INVALID"
      ? "text-[color:var(--color-error)]"
      : "text-[color:var(--color-warning-foreground)]";

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-4 px-5 py-4 border-b border-[color:var(--color-border-light)] hover:bg-[color:var(--color-surface-hover)] transition-colors group text-left"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-[color:var(--color-warning-light)] flex items-center justify-center shrink-0">
          <GitBranch size={14} className="text-[color:var(--color-warning-foreground)]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[color:var(--color-text)] truncate">
            {draft.workflowName}
          </p>
          <p className="text-[11px] text-[color:var(--color-text-muted)] mt-0.5">
            {draft.steps.length} steps · Trigger: {draft.trigger.label}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={classNames("text-[11px] font-bold", statusColor)}>
          {draft.validationStatus.replace("_", " ")}
        </span>
        {draft.approvalRequestId && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)] rounded-full border border-[color:var(--color-success-light)]">
            Sent
          </span>
        )}
        <ChevronRight
          size={14}
          className="text-[color:var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
    </button>
  );
}

import classNames from "classnames";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkflowDraftsPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [drafts, setDrafts]   = useState<WorkflowDraftReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const fetchDrafts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getWorkflowDrafts();
      setDrafts(data);
    } catch (err: any) {
      const msg = err.message ?? "Failed to load workflow drafts.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  if (!user) return null;

  const pendingCount = drafts.filter((d) => !d.approvalRequestId).length;

  if (error && !loading && drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertCircle size={48} className="text-[color:var(--color-error)] mb-4" />
        <h3 className="text-lg font-bold text-[color:var(--color-text)] mb-2">Failed to Load Drafts</h3>
        <p className="text-sm text-[color:var(--color-text-secondary)] max-w-md mb-6">{error}</p>
        <button onClick={fetchDrafts} className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 bg-[color:var(--color-warning-light)] rounded-xl flex items-center justify-center shrink-0">
              <GitBranch size={18} className="text-[color:var(--color-warning-foreground)]" />
            </div>
            <h1 className="text-2xl font-bold text-[color:var(--color-text)] tracking-tight">
              Workflow Drafts
            </h1>
            {pendingCount > 0 && (
              <span className="text-[11px] font-bold bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] px-2 py-0.5 rounded-full border border-[color:var(--color-warning-light)]">
                {pendingCount} pending review
              </span>
            )}
          </div>
          <p className="text-sm text-[color:var(--color-text-secondary)] mt-1 ml-0.5">
            AI-generated workflow drafts awaiting review. None of these workflows are
            active until approved.
          </p>
        </div>
        <button
          onClick={fetchDrafts}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all shrink-0 self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-[color:var(--color-background-secondary)] rounded-2xl flex items-center justify-center mb-4">
            <GitBranch size={28} className="text-[color:var(--color-text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[color:var(--color-text)] mb-1">No workflow drafts</p>
          <p className="text-xs text-[color:var(--color-text-muted)] max-w-xs">
            The Workflow-building Agent has not generated any drafts yet.
          </p>
        </div>
      ) : (
        <>
          {/* Compact list */}
          <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-active)]">
              <p className="text-[11px] font-semibold text-[color:var(--color-text-muted)] uppercase tracking-wider">
                {drafts.length} draft{drafts.length !== 1 ? "s" : ""} — click to expand
              </p>
            </div>
            {drafts.map((d) => (
              <DraftSummaryRow
                key={d.id}
                draft={d}
                onClick={() =>
                  setExpanded((prev) => (prev === d.id ? null : d.id))
                }
              />
            ))}
          </div>

          {/* Expanded full card */}
          {expanded && (() => {
            const d = drafts.find((x) => x.id === expanded);
            if (!d) return null;
            return (
              <WorkflowDraftReviewCard
                key={d.id}
                draft={d}
                onSent={(approvalId) => {
                  setDrafts((prev) =>
                    prev.map((x) =>
                      x.id === d.id ? { ...x, approvalRequestId: approvalId } : x
                    )
                  );
                  fetchDrafts(); // re-fetch for server truth
                }}
              />
            );
          })()}
        </>
      )}
    </div>
  );
}
