"use client";

/**
 * app/(dashboard)/revops/page.tsx
 * ─────────────────────────────────────────────────────────────
 * W4 — RevOps UI
 *
 * Insights grouped by category (COVERAGE / LEAKAGE / QUOTA / FORECAST).
 * Each insight card shows metric, benchmark bar, evidence, and a
 * preview-only proposed action that routes to the Approval Queue.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getRevOpsInsights } from "@/lib/api/revopsApi";
import { RevOpsInsightCard } from "@/components/revops/RevOpsInsightCard";
import { toast } from "react-toastify";
import { TrendingUp, RefreshCw, AlertCircle } from "lucide-react";
import type { RevOpsInsight, RevOpsCategory } from "@/lib/types/agent-results";

// ─── Category order & labels ──────────────────────────────────────────────────

const CATEGORY_ORDER: RevOpsCategory[] = ["COVERAGE", "LEAKAGE", "QUOTA", "FORECAST"];
const CATEGORY_LABELS: Record<RevOpsCategory, string> = {
  COVERAGE: "Pipeline Coverage",
  LEAKAGE:  "Deal Leakage",
  QUOTA:    "Quota Attainment",
  FORECAST: "Forecast Accuracy",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-[color:var(--color-background-secondary)] rounded-xl" />
        <div className="space-y-1.5">
          <div className="h-2.5 bg-[color:var(--color-background-secondary)] rounded w-20" />
          <div className="h-4 bg-[color:var(--color-background-secondary)] rounded w-36" />
        </div>
      </div>
      <div className="h-20 bg-[color:var(--color-background-secondary)] rounded-xl" />
      <div className="h-10 bg-[color:var(--color-background-secondary)] rounded-xl" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RevOpsPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [insights, setInsights] = useState<RevOpsInsight[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const fetchInsights = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getRevOpsInsights();
      setInsights(res.insights);
    } catch (err: any) {
      const msg = err.message ?? "Failed to load RevOps insights.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  if (!user) return null;

  // Group insights by category
  const grouped = CATEGORY_ORDER.reduce<Record<RevOpsCategory, RevOpsInsight[]>>(
    (acc, cat) => {
      acc[cat] = insights.filter((i) => i.category === cat);
      return acc;
    },
    {} as Record<RevOpsCategory, RevOpsInsight[]>
  );

  const highCount = insights.filter((i) => i.severity === "HIGH").length;

  if (error && !loading && insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertCircle size={48} className="text-[color:var(--color-error)] mb-4" />
        <h3 className="text-lg font-bold text-[color:var(--color-text)] mb-2">
          Failed to Load RevOps Insights
        </h3>
        <p className="text-sm text-[color:var(--color-text-secondary)] max-w-md mb-6">{error}</p>
        <button
          onClick={fetchInsights}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 bg-[color:var(--color-info-light)] rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp size={18} className="text-[color:var(--color-info)]" />
            </div>
            <h1 className="text-2xl font-bold text-[color:var(--color-text)] tracking-tight">
              RevOps Insights
            </h1>
            {highCount > 0 && (
              <span className="text-[11px] font-bold bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)] px-2 py-0.5 rounded-full border border-[color:var(--color-error-light)]">
                {highCount} high severity
              </span>
            )}
          </div>
          <p className="text-sm text-[color:var(--color-text-secondary)] mt-1 ml-0.5">
            Pipeline coverage, deal leakage, quota attainment, and forecast accuracy —
            with evidence and preview-only proposed actions.
          </p>
        </div>
        <button
          onClick={fetchInsights}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all shrink-0 self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Category sections */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        CATEGORY_ORDER.map((cat) => {
          const catInsights = grouped[cat];
          if (catInsights.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="text-sm font-bold text-[color:var(--color-text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-[color:var(--color-primary)] rounded-full" />
                {CATEGORY_LABELS[cat]}
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border)]">
                  {catInsights.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {catInsights.map((insight) => (
                  <RevOpsInsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* Empty state */}
      {!loading && insights.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-[color:var(--color-background-secondary)] rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp size={28} className="text-[color:var(--color-text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[color:var(--color-text)] mb-1">
            No insights yet
          </p>
          <p className="text-xs text-[color:var(--color-text-muted)] max-w-xs">
            The RevOps Agent has not generated any insights. Insights are produced on
            each pipeline analysis run.
          </p>
        </div>
      )}
    </div>
  );
}
