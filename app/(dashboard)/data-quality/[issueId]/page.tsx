"use client";

/**
 * app/(dashboard)/data-quality/[issueId]/page.tsx
 * ─────────────────────────────────────────────────────────────
 * W3 — Data Quality UI — Issue Detail page
 *
 * Static segment /data-quality exists; [issueId] is dynamic below it.
 * No collision with /data-quality (the list page).
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getDataQualityIssue } from "@/lib/api/dataQualityApi";
import { DataQualityIssueDetail } from "@/components/dataquality/DataQualityIssueDetail";
import { toast } from "react-toastify";
import { RefreshCw, AlertCircle, ShieldAlert } from "lucide-react";
import type { DataQualityIssue } from "@/lib/types/agent-results";

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse max-w-[1100px] mx-auto">
      <div className="h-5 bg-[color:var(--color-background-secondary)] rounded-lg w-32" />
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] p-5 space-y-3">
        <div className="flex gap-2">
          {[80, 60, 70].map((w, i) => (
            <div key={i} className="h-5 bg-[color:var(--color-background-secondary)] rounded-full" style={{ width: w }} />
          ))}
        </div>
        <div className="h-5 bg-[color:var(--color-background-secondary)] rounded-lg w-3/5" />
        <div className="h-4 bg-[color:var(--color-background-secondary)] rounded-lg w-full" />
        <div className="h-4 bg-[color:var(--color-background-secondary)] rounded-lg w-4/5" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] p-4 space-y-3">
            <div className="h-4 bg-[color:var(--color-background-secondary)] rounded-lg w-24" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-16 bg-[color:var(--color-background-secondary)] rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DataQualityIssuePage() {
  const { user, token } = useAuth();
  const router          = useRouter();
  const params          = useParams();
  const issueId         = typeof params?.issueId === "string" ? params.issueId : "";

  const [issue, setIssue]   = useState<DataQualityIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const fetch = useCallback(async () => {
    if (!token || !issueId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDataQualityIssue(issueId);
      setIssue(data);
    } catch (err: any) {
      const msg = err.message ?? "Failed to load issue.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token, issueId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  if (!user) return null;
  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertCircle size={48} className="text-[color:var(--color-error)] mb-4" />
        <h3 className="text-lg font-bold text-[color:var(--color-text)] mb-2">
          Failed to Load Issue
        </h3>
        <p className="text-sm text-[color:var(--color-text-secondary)] max-w-md mb-6">{error}</p>
        <button
          onClick={fetch}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  if (!issue) return null;

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 bg-[color:var(--color-error-light)] rounded-xl flex items-center justify-center shrink-0">
          <ShieldAlert size={16} className="text-[color:var(--color-error)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[color:var(--color-text)] tracking-tight">
            Data Quality Issue
          </h1>
          <p className="text-xs text-[color:var(--color-text-muted)] font-mono mt-0.5">
            {issue.id}
          </p>
        </div>
      </div>

      <DataQualityIssueDetail
        issue={issue}
        onResolved={fetch}          // re-fetch after mutation — no optimistic state
        onBack={() => router.push("/data-quality")}
      />
    </div>
  );
}
