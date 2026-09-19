"use client";

/**
 * app/(dashboard)/workflows/drafts/[draftId]/page.tsx
 * ─────────────────────────────────────────────────────────────
 * W5 — Workflow Draft Review — Single draft detail page
 *
 * Bug-3 check: static segment is /workflows/drafts/page.tsx.
 * This [draftId] dynamic segment is one level deeper — no collision.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getWorkflowDraft } from "@/lib/api/workflowsApi";
import { WorkflowDraftReviewCard } from "@/components/workflows/WorkflowDraftReviewCard";
import { toast } from "react-toastify";
import { RefreshCw, AlertCircle, GitBranch, ArrowLeft } from "lucide-react";
import type { WorkflowDraftReview } from "@/lib/types/agent-results";

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse max-w-[900px] mx-auto">
      <div className="h-5 bg-[color:var(--color-background-secondary)] rounded-lg w-32" />
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] p-5 space-y-4">
        <div className="h-10 bg-[color:var(--color-warning-light)] rounded-xl" />
        <div className="h-5 bg-[color:var(--color-background-secondary)] rounded w-2/3" />
        <div className="h-8 bg-[color:var(--color-background-secondary)] rounded-xl" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-6 h-6 bg-[color:var(--color-background-secondary)] rounded-full shrink-0" />
            <div className="h-4 bg-[color:var(--color-background-secondary)] rounded flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WorkflowDraftDetailPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const draftId = typeof params?.draftId === "string" ? params.draftId : "";

  const [draft, setDraft]     = useState<WorkflowDraftReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const fetch = useCallback(async () => {
    if (!token || !draftId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getWorkflowDraft(draftId);
      setDraft(data);
    } catch (err: any) {
      const msg = err.message ?? "Failed to load workflow draft.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token, draftId]);

  useEffect(() => { fetch(); }, [fetch]);

  if (!user) return null;
  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertCircle size={48} className="text-[color:var(--color-error)] mb-4" />
        <h3 className="text-lg font-bold text-[color:var(--color-text)] mb-2">Failed to Load Draft</h3>
        <p className="text-sm text-[color:var(--color-text-secondary)] max-w-md mb-6">{error}</p>
        <button onClick={fetch} className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  if (!draft) return null;

  return (
    <div className="max-w-[900px] mx-auto space-y-5">
      {/* Back link */}
      <button
        onClick={() => router.push("/workflows/drafts")}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)] transition-colors"
      >
        <ArrowLeft size={13} />
        Back to drafts
      </button>

      {/* Page header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-[color:var(--color-warning-light)] rounded-xl flex items-center justify-center shrink-0">
          <GitBranch size={16} className="text-[color:var(--color-warning-foreground)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[color:var(--color-text)] tracking-tight">
            {draft.workflowName}
          </h1>
          <p className="text-xs text-[color:var(--color-text-muted)] font-mono mt-0.5">{draft.id}</p>
        </div>
      </div>

      <WorkflowDraftReviewCard
        draft={draft}
        onSent={(approvalId) => {
          setDraft((prev) => prev ? { ...prev, approvalRequestId: approvalId } : prev);
          fetch(); // re-fetch for server truth
        }}
      />
    </div>
  );
}
