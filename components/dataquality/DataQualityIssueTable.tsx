"use client";

/**
 * components/dataquality/DataQualityIssueTable.tsx
 * ─────────────────────────────────────────────────────────────
 * W3 — Data Quality UI — Issue Table
 *
 * Filterable table of DataQualityIssue records.
 * Filters: issueType, objectType, severity, status — synced to URL
 * params by the parent page (this component is uncontrolled re: URL).
 *
 * Acceptance criteria (W3):
 * ✓ No row ever shows a bare "duplicate"/"stale"/"conflicting" label
 *   without its evidence being accessible on drill-down
 * ✓ Empty state when no issues match filters
 * ✓ All colors via CSS variable tokens
 */

import classNames from "classnames";
import {
  Copy,
  Clock,
  AlertTriangle,
  GitMerge,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  MinusCircle,
} from "lucide-react";
import type {
  DataQualityIssue,
  DataQualityIssueType,
  DataQualityObjectType,
  DataQualityIssueSeverity,
  DataQualityIssueStatus,
  DataQualityListFilters,
} from "@/lib/types/agent-results";

// ─── Badge helpers ────────────────────────────────────────────────────────────

const ISSUE_TYPE_META: Record<
  DataQualityIssueType,
  { label: string; icon: React.ElementType; pill: string }
> = {
  DUPLICATE: {
    label: "Duplicate",
    icon: Copy,
    pill: "bg-[color:var(--color-info-light)] text-[color:var(--color-info-foreground)] border-[color:var(--color-info-light)]",
  },
  STALE: {
    label: "Stale",
    icon: Clock,
    pill: "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]",
  },
  MISSING: {
    label: "Missing Field",
    icon: AlertTriangle,
    pill: "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]",
  },
  CONFLICTING: {
    label: "Conflicting",
    icon: GitMerge,
    pill: "bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)] border-[color:var(--color-error-light)]",
  },
};

const SEVERITY_META: Record<
  DataQualityIssueSeverity,
  { label: string; pill: string; dot: string }
> = {
  HIGH: {
    label: "High",
    pill: "bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)] border-[color:var(--color-error-light)]",
    dot: "bg-[color:var(--color-error)]",
  },
  MEDIUM: {
    label: "Medium",
    pill: "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]",
    dot: "bg-[color:var(--color-warning)]",
  },
  LOW: {
    label: "Low",
    pill: "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]",
    dot: "bg-[color:var(--color-text-muted)]",
  },
};

const STATUS_META: Record<
  DataQualityIssueStatus,
  { label: string; icon: React.ElementType; pill: string }
> = {
  OPEN: {
    label: "Open",
    icon: ShieldAlert,
    pill: "bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)] border-[color:var(--color-error-light)]",
  },
  RESOLVED: {
    label: "Resolved",
    icon: CheckCircle2,
    pill: "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)] border-[color:var(--color-success-light)]",
  },
  IGNORED: {
    label: "Ignored",
    icon: MinusCircle,
    pill: "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]",
  },
};

export function IssueTypeBadge({ type }: { type: DataQualityIssueType }) {
  const meta = ISSUE_TYPE_META[type] ?? ISSUE_TYPE_META.MISSING;
  const Icon = meta.icon;
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
        meta.pill
      )}
    >
      <Icon size={11} className="shrink-0" />
      {meta.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: DataQualityIssueSeverity }) {
  const meta = SEVERITY_META[severity] ?? SEVERITY_META.LOW;
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
        meta.pill
      )}
    >
      <span className={classNames("w-1.5 h-1.5 rounded-full shrink-0", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function IssueStatusBadge({ status }: { status: DataQualityIssueStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.OPEN;
  const Icon = meta.icon;
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
        meta.pill
      )}
    >
      <Icon size={11} className="shrink-0" />
      {meta.label}
    </span>
  );
}

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return "Just now";
  } catch {
    return "";
  }
}

// ─── Filter bar (exported so page can compose it) ─────────────────────────────

const ISSUE_TYPES: { label: string; value: DataQualityIssueType | "" }[] = [
  { label: "All Types",   value: "" },
  { label: "Duplicate",   value: "DUPLICATE" },
  { label: "Stale",       value: "STALE" },
  { label: "Missing",     value: "MISSING" },
  { label: "Conflicting", value: "CONFLICTING" },
];

const OBJECT_TYPES: { label: string; value: DataQualityObjectType | "" }[] = [
  { label: "All Objects", value: "" },
  { label: "Lead",        value: "lead" },
  { label: "Deal",        value: "deal" },
  { label: "Contact",     value: "contact" },
  { label: "Account",     value: "account" },
];

const SEVERITIES: { label: string; value: DataQualityIssueSeverity | "" }[] = [
  { label: "All Severities", value: "" },
  { label: "High",           value: "HIGH" },
  { label: "Medium",         value: "MEDIUM" },
  { label: "Low",            value: "LOW" },
];

const STATUSES: { label: string; value: DataQualityIssueStatus | "" }[] = [
  { label: "All Statuses", value: "" },
  { label: "Open",         value: "OPEN" },
  { label: "Resolved",     value: "RESOLVED" },
  { label: "Ignored",      value: "IGNORED" },
];

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  className?: string;
}

function SelectPill({ value, onChange, options, className }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={classNames(
        "px-3 py-1.5 rounded-xl border text-xs font-semibold bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info-light)] transition-all",
        value
          ? "border-[color:var(--color-primary)] text-[color:var(--color-primary)]"
          : "border-[color:var(--color-border)] text-[color:var(--color-text-secondary)]",
        className
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export interface DataQualityFilterBarProps {
  filters: DataQualityListFilters;
  onChange: (f: DataQualityListFilters) => void;
}

export function DataQualityFilterBar({ filters, onChange }: DataQualityFilterBarProps) {
  const set = (key: keyof DataQualityListFilters, val: string) =>
    onChange({ ...filters, [key]: val || undefined });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SelectPill
        value={filters.issueType ?? ""}
        onChange={(v) => set("issueType", v)}
        options={ISSUE_TYPES as { label: string; value: string }[]}
      />
      <SelectPill
        value={filters.objectType ?? ""}
        onChange={(v) => set("objectType", v)}
        options={OBJECT_TYPES as { label: string; value: string }[]}
      />
      <SelectPill
        value={filters.severity ?? ""}
        onChange={(v) => set("severity", v)}
        options={SEVERITIES as { label: string; value: string }[]}
      />
      <SelectPill
        value={filters.status ?? ""}
        onChange={(v) => set("status", v)}
        options={STATUSES as { label: string; value: string }[]}
      />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function DataQualitySkeletonRow() {
  return (
    <tr className="border-b border-[color:var(--color-border-light)]">
      {[20, 12, 12, 12, 12, 30, 8].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div
            className="h-4 bg-[color:var(--color-background-secondary)] rounded-lg animate-pulse"
            style={{ width: `${w * 3}px` }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function DataQualityEmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <tr>
      <td colSpan={7}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-[color:var(--color-background-secondary)] rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle2 size={28} className="text-[color:var(--color-success)]" />
          </div>
          <p className="text-sm font-semibold text-[color:var(--color-text)] mb-1">
            {hasFilters ? "No issues match your filters" : "No open data quality issues"}
          </p>
          <p className="text-xs text-[color:var(--color-text-muted)] max-w-xs">
            {hasFilters
              ? "Try clearing the filters to see all issues."
              : "The Data Quality Agent has not detected any issues. Check back after the next scan."}
          </p>
          {hasFilters && (
            <button
              onClick={onClear}
              className="mt-4 text-xs font-semibold text-[color:var(--color-primary)] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function IssueRow({
  issue,
  onClick,
}: {
  issue: DataQualityIssue;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      data-testid="dq-issue-row"
      className="border-b border-[color:var(--color-border-light)] hover:bg-[color:var(--color-surface-hover)] cursor-pointer transition-colors group"
    >
      {/* Type */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <IssueTypeBadge type={issue.issueType} />
      </td>

      {/* Object */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className="text-xs font-semibold text-[color:var(--color-text)] capitalize">
          {issue.objectType}
        </span>
      </td>

      {/* Field */}
      <td className="px-4 py-3.5 max-w-[140px]">
        {issue.fieldName ? (
          <code className="text-[11px] font-mono text-[color:var(--color-text-secondary)] bg-[color:var(--color-background-secondary)] px-1.5 py-0.5 rounded">
            {issue.fieldName}
          </code>
        ) : (
          <span className="text-xs text-[color:var(--color-text-muted)]">—</span>
        )}
      </td>

      {/* Severity */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <SeverityBadge severity={issue.severity} />
      </td>

      {/* Status */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <IssueStatusBadge status={issue.status} />
      </td>

      {/* Summary */}
      <td className="px-4 py-3.5 max-w-[260px]">
        <p className="text-xs text-[color:var(--color-text-secondary)] truncate leading-snug">
          {issue.conflictDetail ?? `${issue.affectedRecordIds.length} record(s) affected`}
        </p>
        <p className="text-[10px] text-[color:var(--color-text-muted)] mt-0.5">
          {relativeTime(issue.detectedAt)}
          {" · "}
          <span className="font-semibold">{issue.evidence.length}</span> evidence
          {issue.evidence.length !== 1 ? " items" : " item"}
        </p>
      </td>

      {/* Action */}
      <td className="px-4 py-3.5 text-right whitespace-nowrap">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
          View <ChevronRight size={13} />
        </span>
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface DataQualityIssueTableProps {
  issues: DataQualityIssue[];
  loading: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
  onRowClick: (issue: DataQualityIssue) => void;
  totalCount?: number;
}

export function DataQualityIssueTable({
  issues,
  loading,
  hasFilters,
  onClearFilters,
  onRowClick,
  totalCount,
}: DataQualityIssueTableProps) {
  const COLUMNS = ["Type", "Object", "Field", "Severity", "Status", "Details", ""];

  return (
    <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="dq-issue-table">
          <thead>
            <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-active)]">
              {COLUMNS.map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-[11px] font-semibold text-[color:var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <DataQualitySkeletonRow key={i} />
                ))
              : issues.length === 0
              ? (
                  <DataQualityEmptyState
                    hasFilters={hasFilters}
                    onClear={onClearFilters}
                  />
                )
              : issues.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    onClick={() => onRowClick(issue)}
                  />
                ))}
          </tbody>
        </table>
      </div>

      {!loading && issues.length > 0 && (
        <div className="px-4 py-3 border-t border-[color:var(--color-border-light)] bg-[color:var(--color-surface-active)]">
          <p className="text-xs text-[color:var(--color-text-muted)]">
            Showing{" "}
            <span className="font-semibold text-[color:var(--color-text-secondary)]">
              {issues.length}
            </span>
            {totalCount != null && totalCount > issues.length && (
              <>
                {" "}of{" "}
                <span className="font-semibold text-[color:var(--color-text-secondary)]">
                  {totalCount}
                </span>
              </>
            )}{" "}
            issue{issues.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
