"use client";

/**
 * components/dataquality/DataQualityIssueDetail.tsx
 * ─────────────────────────────────────────────────────────────
 * W3 — Data Quality UI — Issue Detail
 *
 * Side-by-side conflict view with evidence and action buttons.
 *
 * Acceptance criteria (W3):
 * ✓ Never shows a bare "duplicate"/"stale"/"conflicting" label without
 *   its evidence entries also rendered
 * ✓ Resolving/ignoring calls the real API and triggers onResolved —
 *   no optimistic state
 * ✓ 1-click Resolve / Ignore action buttons
 */

import { useState } from "react";
import classNames from "classnames";
import {
  GitMerge,
  Clock,
  AlertTriangle,
  Copy,
  CheckCircle2,
  MinusCircle,
  RefreshCw,
  ExternalLink,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { updateDataQualityIssue } from "@/lib/api/dataQualityApi";
import { toast } from "react-toastify";
import {
  IssueTypeBadge,
  SeverityBadge,
  IssueStatusBadge,
} from "@/components/dataquality/DataQualityIssueTable";
import type { DataQualityIssue } from "@/lib/types/agent-results";
import type { AgentEvidenceItem } from "@/lib/api/agentApi";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataQualityIssueDetailProps {
  issue: DataQualityIssue;
  onResolved: () => void;
  onBack?: () => void;
  className?: string;
}

// ─── Evidence panel ───────────────────────────────────────────────────────────

function EvidencePanel({ items }: { items: AgentEvidenceItem[] }) {
  return (
    <div className="rounded-xl border border-[color:var(--color-border-light)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-[color:var(--color-surface-active)] border-b border-[color:var(--color-border-light)]">
        <Layers size={14} className="text-[color:var(--color-text-muted)]" />
        <p className="text-xs font-bold text-[color:var(--color-text)] uppercase tracking-wider">
          Evidence
        </p>
        <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[color:var(--color-border)] text-[color:var(--color-text-muted)]">
          {items.length}
        </span>
      </div>
      <div className="p-3 space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="p-3 rounded-xl bg-[color:var(--color-background-secondary)] border border-[color:var(--color-border-light)]"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-[color:var(--color-text)] leading-snug">
                {item.label ?? item.source ?? `Evidence ${i + 1}`}
              </p>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <ExternalLink
                    size={11}
                    className="text-[color:var(--color-primary)]"
                  />
                </a>
              )}
            </div>
            {item.source && item.source !== item.label && (
              <p className="text-[10px] text-[color:var(--color-text-muted)] mt-0.5 font-medium uppercase tracking-wide">
                {item.source}
              </p>
            )}
            {item.snippet && (
              <p className="text-xs text-[color:var(--color-text-secondary)] mt-1.5 leading-relaxed">
                {item.snippet}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Affected records panel ────────────────────────────────────────────────────

function AffectedRecordsPanel({
  recordIds,
  objectType,
}: {
  recordIds: string[];
  objectType: string;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--color-border-light)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-[color:var(--color-surface-active)] border-b border-[color:var(--color-border-light)]">
        <p className="text-xs font-bold text-[color:var(--color-text)] uppercase tracking-wider">
          Affected Records
        </p>
        <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[color:var(--color-border)] text-[color:var(--color-text-muted)]">
          {recordIds.length}
        </span>
      </div>
      <div className="p-3 space-y-1.5">
        {recordIds.map((id) => (
          <a
            key={id}
            href={`/${objectType}s/${id}`}
            className={classNames(
              "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold",
              "bg-[color:var(--color-background-secondary)] border border-[color:var(--color-border-light)]",
              "text-[color:var(--color-primary)] hover:bg-[color:var(--color-surface-hover)] transition-colors"
            )}
          >
            <code className="font-mono">{id}</code>
            <ExternalLink size={11} className="shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DataQualityIssueDetail({
  issue,
  onResolved,
  onBack,
  className,
}: DataQualityIssueDetailProps) {
  const [resolving, setResolving] = useState(false);
  const [ignoring, setIgnoring]   = useState(false);

  const isClosed = issue.status === "RESOLVED" || issue.status === "IGNORED";

  const handleAction = async (action: "RESOLVED" | "IGNORED") => {
    const setter = action === "RESOLVED" ? setResolving : setIgnoring;
    setter(true);
    try {
      await updateDataQualityIssue(issue.id, action);
      toast.success(
        action === "RESOLVED" ? "Issue marked as resolved." : "Issue ignored."
      );
      onResolved(); // triggers parent re-fetch — no optimistic state
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update issue.");
    } finally {
      setter(false);
    }
  };

  return (
    <div className={classNames("space-y-5", className)}>

      {/* ── Breadcrumb / back ────────────────────────────────────────────── */}
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)] transition-colors"
        >
          <ArrowLeft size={13} />
          Back to issues
        </button>
      )}

      {/* ── Header card ──────────────────────────────────────────────────── */}
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <IssueTypeBadge type={issue.issueType} />
              <SeverityBadge severity={issue.severity} />
              <IssueStatusBadge status={issue.status} />
            </div>
            <p className="text-sm font-bold text-[color:var(--color-text)] capitalize">
              {issue.issueType.charAt(0) + issue.issueType.slice(1).toLowerCase()} on{" "}
              <span className="capitalize">{issue.objectType}</span>
              {issue.fieldName && (
                <> —{" "}
                  <code className="font-mono text-[color:var(--color-primary)] bg-[color:var(--color-info-light)] px-1.5 py-0.5 rounded text-xs">
                    {issue.fieldName}
                  </code>
                </>
              )}
            </p>
            {issue.conflictDetail && (
              <p className="text-sm text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl">
                {issue.conflictDetail}
              </p>
            )}
          </div>

          {/* Action buttons — disabled once issue is closed */}
          {!isClosed && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleAction("IGNORED")}
                disabled={resolving || ignoring}
                className={classNames(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all",
                  "bg-[color:var(--color-surface)] border-[color:var(--color-border)]",
                  "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-hover)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {ignoring ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <MinusCircle size={12} />
                )}
                Ignore
              </button>
              <button
                onClick={() => handleAction("RESOLVED")}
                disabled={resolving || ignoring}
                className={classNames(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all",
                  "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)]",
                  "border border-[color:var(--color-success-light)] hover:opacity-80",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {resolving ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={12} />
                )}
                Mark Resolved
              </button>
            </div>
          )}

          {isClosed && (
            <div className="flex items-center gap-2 shrink-0">
              <IssueStatusBadge status={issue.status} />
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column detail ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evidence — required, always shown */}
        <EvidencePanel items={issue.evidence} />

        {/* Affected records */}
        <AffectedRecordsPanel
          recordIds={issue.affectedRecordIds}
          objectType={issue.objectType}
        />
      </div>
    </div>
  );
}
