"use client";

/**
 * app/(dashboard)/admin/agents/versions/page.tsx
 * ─────────────────────────────────────────────────────────────
 * Day 7 — Model/Version State & Promotion Workflow
 * Route: /admin/agents/versions
 *
 * Shows all agent versions grouped by agent, ordered:
 *   PRODUCTION → STAGING → DRAFT → RETIRED → FAILED
 *
 * Acceptance criteria:
 * ✓ Current production version clearly differentiated from staging/draft
 * ✓ Regression gate pass/fail visible per version
 * ✓ "Promote to Production" only active when all gates pass
 * ✓ Promotion routes through Approval Queue — link shown after send
 * ✓ Production models never silently change — every promotion
 *   creates an auditable approvalRequestId
 * ✓ Loading / empty / error states present
 * ✓ All colors via CSS variable tokens
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getAgentVersions } from "@/lib/api/agentVersionsApi";
import { AgentVersionCard } from "@/components/admin/AgentVersionCard";
import { toast } from "react-toastify";
import {
  GitBranch,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Rocket,
} from "lucide-react";
import type { AgentVersion, VersionState } from "@/lib/types/day7.ts";

// ─── Version state order ───────────────────────────────────────────────────────

const STATE_ORDER: Record<VersionState, number> = {
  PRODUCTION: 0,
  STAGING:    1,
  DRAFT:      2,
  RETIRED:    3,
  FAILED:     4,
};

function sortVersions(versions: AgentVersion[]): AgentVersion[] {
  return [...versions].sort(
    (a, b) =>
      (STATE_ORDER[a.state] ?? 99) - (STATE_ORDER[b.state] ?? 99) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] p-5 space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[color:var(--color-background-secondary)]" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 bg-[color:var(--color-background-secondary)] rounded w-24" />
              <div className="h-3 bg-[color:var(--color-background-secondary)] rounded w-40" />
            </div>
          </div>
          <div className="space-y-1.5">
            {[1, 2, 3].map((j) => (
              <div
                key={j}
                className="h-9 bg-[color:var(--color-background-secondary)] rounded-xl"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Summary banner ────────────────────────────────────────────────────────────

function SummaryBanner({
  versions,
}: {
  versions: AgentVersion[];
}) {
  const prodCount    = versions.filter((v) => v.state === "PRODUCTION").length;
  const stagingCount = versions.filter((v) => v.state === "STAGING").length;
  const readyCount   = versions.filter(
    (v) => v.state === "STAGING" && v.allGatesPassed && !v.approvalRequestId
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[
        {
          label: "Production Versions",
          value: prodCount,
          icon: ShieldCheck,
          bg: "bg-[color:var(--color-success-light)]",
          text: "text-[color:var(--color-success)]",
        },
        {
          label: "Staging Candidates",
          value: stagingCount,
          icon: Rocket,
          bg: "bg-[color:var(--color-info-light)]",
          text: "text-[color:var(--color-info)]",
        },
        {
          label: "Ready to Promote",
          value: readyCount,
          icon: GitBranch,
          bg: readyCount > 0
            ? "bg-[color:var(--color-warning-light)]"
            : "bg-[color:var(--color-background-secondary)]",
          text: readyCount > 0
            ? "text-[color:var(--color-warning-foreground)]"
            : "text-[color:var(--color-text-muted)]",
        },
      ].map(({ label, value, icon: Icon, bg, text }) => (
        <div
          key={label}
          className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm p-4 flex items-center gap-3"
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
            <Icon size={17} className={text} />
          </div>
          <div>
            <p className="text-xl font-black text-[color:var(--color-text)]">{value}</p>
            <p className="text-[11px] text-[color:var(--color-text-muted)] font-medium">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Module-level StrictMode guard ────────────────────────────────────────────

let _versionsFetchInFlight = false;

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AgentVersionsPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ADMIN") { router.replace("/dashboard"); }
  }, [user, router]);

  const fetchVersions = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAgentVersions();
      setVersions(res.versions);
    } catch (err: any) {
      const msg = err.message ?? "Failed to load agent versions.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (_versionsFetchInFlight) return;
    _versionsFetchInFlight = true;
    fetchVersions().finally(() => { _versionsFetchInFlight = false; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!user) return null;

  // Group by agent
  const agentGroups = versions.reduce<Record<string, AgentVersion[]>>((acc, v) => {
    const key = `${v.agentId}__${v.agentName ?? v.agentId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  const groupEntries = Object.entries(agentGroups).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="space-y-8 max-w-[1100px] mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[color:var(--color-info-light)] rounded-xl flex items-center justify-center shrink-0">
            <GitBranch size={20} className="text-[color:var(--color-info)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--color-text)] tracking-tight">
              Model Versions
            </h1>
            <p className="text-sm text-[color:var(--color-text-secondary)] mt-0.5">
              Production models never silently change. Every promotion requires
              all regression gates to pass and an explicit approval.
            </p>
          </div>
        </div>
        <button
          onClick={fetchVersions}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all shrink-0 self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && <Skeleton />}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[color:var(--color-error-light)] border border-[color:var(--color-error-light)]">
          <AlertCircle size={18} className="text-[color:var(--color-error)] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-[color:var(--color-error-foreground)]">
              Failed to load versions
            </p>
            <p className="text-xs opacity-80 text-[color:var(--color-error-foreground)] mt-1">
              {error}
            </p>
          </div>
          <button
            onClick={fetchVersions}
            className="text-xs font-semibold text-[color:var(--color-error-foreground)] hover:underline shrink-0 inline-flex items-center gap-1"
          >
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && versions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)]">
          <GitBranch size={28} className="text-[color:var(--color-text-muted)] mb-3" />
          <p className="text-sm font-semibold text-[color:var(--color-text)] mb-1">
            No versions found
          </p>
          <p className="text-xs text-[color:var(--color-text-muted)] max-w-xs">
            Agent versions appear here once a model has been registered and evaluated.
          </p>
        </div>
      )}

      {!loading && !error && versions.length > 0 && (
        <>
          {/* Summary */}
          <SummaryBanner versions={versions} />

          {/* Per-agent version groups */}
          {groupEntries.map(([groupKey, groupVersions]) => {
            const [agentId, agentName] = groupKey.split("__");
            const sorted = sortVersions(groupVersions);
            return (
              <section key={groupKey} className="space-y-3">
                {/* Group header */}
                <h2 className="text-sm font-bold text-[color:var(--color-text-secondary)] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-4 bg-[color:var(--color-primary)] rounded-full" />
                  {agentName}
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border)] normal-case">
                    {sorted.length} version{sorted.length !== 1 ? "s" : ""}
                  </span>
                </h2>

                {/* Version cards */}
                <div className="space-y-3">
                  {sorted.map((v) => (
                    <AgentVersionCard
                      key={v.id}
                      version={v}
                      defaultCollapsed={
                        v.state === "RETIRED" || v.state === "FAILED"
                      }
                      onPromoted={(approvalId) => {
                        // Optimistically update the approvalRequestId so the
                        // card immediately shows the approval link, then re-fetch
                        // for server truth
                        setVersions((prev) =>
                          prev.map((x) =>
                            x.id === v.id
                              ? { ...x, approvalRequestId: approvalId }
                              : x
                          )
                        );
                        fetchVersions();
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
