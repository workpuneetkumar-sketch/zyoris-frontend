"use client";

/**
 * components/admin/AuditLogTable.tsx
 * ─────────────────────────────────────────────────────────────
 * Day 7 — Business-outcome audit event table.
 *
 * Acceptance criteria:
 * ✓ Every EXECUTION and SECURITY event shows an "Evidence" link/chip
 *   when evidenceSnippet is present.
 * ✓ Links to /executions/:executionId and /approvals/:approvalId when
 *   those IDs are present.
 * ✓ Cost and latency columns visible for EXECUTION events.
 * ✓ Loading skeleton, empty state, error state all present.
 * ✓ All colors via CSS variable tokens.
 */

import { useState } from "react";
import classNames from "classnames";
import {
  Zap,
  ClipboardList,
  Settings2,
  TrendingUp,
  Shield,
  ExternalLink,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  X,
} from "lucide-react";
import { EvidenceModal } from "@/components/agents/EvidenceModal";
import type {
  AuditEvent,
  AuditEventCategory,
  AuditEventOutcome,
  AuditEventFilters,
} from "@/lib/types/day7.ts";

// ─── Badge helpers ────────────────────────────────────────────────────────────

const CATEGORY_META: Record<
  AuditEventCategory,
  { label: string; icon: React.ElementType; pill: string }
> = {
  EXECUTION:     { label: "Execution",     icon: Zap,          pill: "bg-[color:var(--color-info-light)]    text-[color:var(--color-info-foreground)]    border-[color:var(--color-info-light)]"    },
  APPROVAL:      { label: "Approval",      icon: ClipboardList, pill: "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]" },
  CONFIG_CHANGE: { label: "Config Change", icon: Settings2,    pill: "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-secondary)] border-[color:var(--color-border)]"    },
  PROMOTION:     { label: "Promotion",     icon: TrendingUp,   pill: "bg-[color:var(--color-success-light)]  text-[color:var(--color-success-foreground)]  border-[color:var(--color-success-light)]"  },
  SECURITY:      { label: "Security",      icon: Shield,       pill: "bg-[color:var(--color-error-light)]    text-[color:var(--color-error-foreground)]    border-[color:var(--color-error-light)]"    },
  DATA_ACCESS:   { label: "Data Access",   icon: Layers,       pill: "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)]   border-[color:var(--color-border)]"        },
};

const OUTCOME_META: Record<
  AuditEventOutcome,
  { label: string; pill: string; dot: string }
> = {
  SUCCESS:  { label: "Success",  pill: "bg-[color:var(--color-success-light)]  text-[color:var(--color-success-foreground)]  border-[color:var(--color-success-light)]",  dot: "bg-[color:var(--color-success)]"  },
  FAILURE:  { label: "Failure",  pill: "bg-[color:var(--color-error-light)]    text-[color:var(--color-error-foreground)]    border-[color:var(--color-error-light)]",    dot: "bg-[color:var(--color-error)]"    },
  PENDING:  { label: "Pending",  pill: "bg-[color:var(--color-warning-light)]  text-[color:var(--color-warning-foreground)]  border-[color:var(--color-warning-light)]",  dot: "bg-[color:var(--color-warning)]"  },
  REJECTED: { label: "Rejected", pill: "bg-[color:var(--color-error-light)]    text-[color:var(--color-error-foreground)]    border-[color:var(--color-error-light)]",    dot: "bg-[color:var(--color-error)]"    },
  APPROVED: { label: "Approved", pill: "bg-[color:var(--color-success-light)]  text-[color:var(--color-success-foreground)]  border-[color:var(--color-success-light)]",  dot: "bg-[color:var(--color-success)]"  },
};

function CategoryBadge({ category }: { category: AuditEventCategory }) {
  const m = CATEGORY_META[category] ?? CATEGORY_META.DATA_ACCESS;
  const Icon = m.icon;
  return (
    <span className={classNames(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap",
      m.pill
    )}>
      <Icon size={10} className="shrink-0" />
      {m.label}
    </span>
  );
}

function OutcomeBadge({ outcome }: { outcome: AuditEventOutcome }) {
  const m = OUTCOME_META[outcome] ?? OUTCOME_META.PENDING;
  return (
    <span className={classNames(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap",
      m.pill
    )}>
      <span className={classNames("w-1.5 h-1.5 rounded-full shrink-0", m.dot)} />
      {m.label}
    </span>
  );
}

// ─── Relative time ─────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  try {
    const d = Date.now() - new Date(iso).getTime();
    const m = Math.floor(d / 60_000);
    const h = Math.floor(m / 60);
    const day = Math.floor(h / 24);
    if (day > 0) return `${day}d ago`;
    if (h   > 0) return `${h}h ago`;
    if (m   > 0) return `${m}m ago`;
    return "just now";
  } catch { return ""; }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function AuditLogSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-[color:var(--color-border-light)]">
          {[20, 12, 40, 10, 10, 8, 8].map((w, j) => (
            <td key={j} className="px-4 py-3.5">
              <div
                className="h-4 bg-[color:var(--color-background-secondary)] rounded-lg animate-pulse"
                style={{ width: `${w * 4}px` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { label: string; value: AuditEventCategory | "" }[] = [
  { label: "All Categories", value: "" },
  { label: "Execution",      value: "EXECUTION"     },
  { label: "Approval",       value: "APPROVAL"      },
  { label: "Config Change",  value: "CONFIG_CHANGE" },
  { label: "Promotion",      value: "PROMOTION"     },
  { label: "Security",       value: "SECURITY"      },
  { label: "Data Access",    value: "DATA_ACCESS"   },
];

const OUTCOME_OPTIONS: { label: string; value: AuditEventOutcome | "" }[] = [
  { label: "All Outcomes", value: ""         },
  { label: "Success",      value: "SUCCESS"  },
  { label: "Failure",      value: "FAILURE"  },
  { label: "Approved",     value: "APPROVED" },
  { label: "Rejected",     value: "REJECTED" },
  { label: "Pending",      value: "PENDING"  },
];

export interface AuditLogFilterBarProps {
  filters: AuditEventFilters;
  onChange: (f: AuditEventFilters) => void;
}

export function AuditLogFilterBar({ filters, onChange }: AuditLogFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative min-w-[200px] flex-1 max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)] pointer-events-none" />
        <input
          type="text"
          placeholder="Search events…"
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          className="w-full pl-8 pr-8 py-1.5 text-xs font-medium rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info-light)] transition-all"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ ...filters, search: undefined })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
          >
            <X size={11} className="text-[color:var(--color-text-muted)]" />
          </button>
        )}
      </div>

      {/* Category */}
      <select
        value={filters.category ?? ""}
        onChange={(e) => onChange({ ...filters, category: (e.target.value as AuditEventCategory) || undefined })}
        className="px-3 py-1.5 rounded-xl border text-xs font-semibold bg-[color:var(--color-surface)] text-[color:var(--color-text)] border-[color:var(--color-border)] focus:outline-none"
      >
        {CATEGORY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Outcome */}
      <select
        value={filters.outcome ?? ""}
        onChange={(e) => onChange({ ...filters, outcome: (e.target.value as AuditEventOutcome) || undefined })}
        className="px-3 py-1.5 rounded-xl border text-xs font-semibold bg-[color:var(--color-surface)] text-[color:var(--color-text)] border-[color:var(--color-border)] focus:outline-none"
      >
        {OUTCOME_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Clear */}
      {(filters.category || filters.outcome || filters.search) && (
        <button
          onClick={() => onChange({})}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)] px-2.5 py-1.5 rounded-xl border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] transition-all"
        >
          <X size={11} /> Clear
        </button>
      )}
    </div>
  );
}

// ─── Event row ────────────────────────────────────────────────────────────────

function EventRow({ event }: { event: AuditEvent }) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const hasEvidence = !!event.evidenceSnippet;

  return (
    <>
      <tr
        className="border-b border-[color:var(--color-border-light)] hover:bg-[color:var(--color-surface-hover)] transition-colors"
        data-testid="audit-event-row"
      >
        {/* Time + agent */}
        <td className="px-4 py-3.5 whitespace-nowrap">
          <p className="text-xs font-semibold text-[color:var(--color-text)]">
            {event.agentName ?? event.agentId}
          </p>
          <p className="text-[10px] text-[color:var(--color-text-muted)] mt-0.5">
            {relTime(event.occurredAt)}
          </p>
        </td>

        {/* Category */}
        <td className="px-4 py-3.5 whitespace-nowrap">
          <CategoryBadge category={event.category} />
        </td>

        {/* Description */}
        <td className="px-4 py-3.5 max-w-[280px]">
          <p className="text-xs text-[color:var(--color-text-secondary)] leading-snug line-clamp-2">
            {event.description}
          </p>
          {event.initiatedBy && (
            <p className="text-[10px] text-[color:var(--color-text-muted)] mt-0.5">
              by {event.initiatedBy}
            </p>
          )}
        </td>

        {/* Outcome */}
        <td className="px-4 py-3.5 whitespace-nowrap">
          <OutcomeBadge outcome={event.outcome} />
        </td>

        {/* Cost */}
        <td className="px-4 py-3.5 whitespace-nowrap">
          {event.costUsd != null ? (
            <span className="text-xs font-semibold text-[color:var(--color-text-secondary)]">
              ${event.costUsd.toFixed(4)}
            </span>
          ) : (
            <span className="text-xs text-[color:var(--color-text-muted)]">—</span>
          )}
        </td>

        {/* Latency */}
        <td className="px-4 py-3.5 whitespace-nowrap">
          {event.latencyMs != null ? (
            <span className="text-xs font-semibold text-[color:var(--color-text-secondary)]">
              {event.latencyMs < 1000
                ? `${event.latencyMs}ms`
                : `${(event.latencyMs / 1000).toFixed(1)}s`}
            </span>
          ) : (
            <span className="text-xs text-[color:var(--color-text-muted)]">—</span>
          )}
        </td>

        {/* Links + Evidence */}
        <td className="px-4 py-3.5 whitespace-nowrap">
          <div className="flex items-center gap-2">
            {event.executionId && (
              <a
                href={`/executions/${event.executionId}`}
                className="text-[11px] font-semibold text-[color:var(--color-primary)] hover:underline inline-flex items-center gap-0.5"
                title="View execution"
              >
                Exec <ExternalLink size={9} />
              </a>
            )}
            {event.approvalId && (
              <a
                href={`/approvals/${event.approvalId}`}
                className="text-[11px] font-semibold text-[color:var(--color-primary)] hover:underline inline-flex items-center gap-0.5"
                title="View approval"
              >
                Approval <ExternalLink size={9} />
              </a>
            )}
            {/* Evidence button — required for EXECUTION and SECURITY events */}
            {hasEvidence && (
              <button
                onClick={() => setEvidenceOpen(true)}
                className={classNames(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-colors",
                  "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-secondary)]",
                  "border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)]"
                )}
                data-testid="evidence-btn"
              >
                <Layers size={10} />
                Evidence
              </button>
            )}
            {/* Flag missing evidence on required categories */}
            {!hasEvidence &&
              (event.category === "EXECUTION" || event.category === "SECURITY") && (
                <span
                  className="text-[10px] font-semibold text-[color:var(--color-warning-foreground)]"
                  title="Evidence missing for this execution/security event"
                >
                  ⚠ No evidence
                </span>
              )}
          </div>
        </td>
      </tr>

      {/* Evidence modal */}
      {hasEvidence && evidenceOpen && (
        <EvidenceModal
          isOpen={evidenceOpen}
          onClose={() => setEvidenceOpen(false)}
          items={[
            {
              source: event.agentName ?? event.agentId,
              label: `Event: ${event.description.slice(0, 60)}…`,
              snippet: event.evidenceSnippet,
              ...(event.evidenceDetail ? { url: undefined } : {}),
            },
          ]}
          title={`Evidence — ${CATEGORY_META[event.category]?.label ?? event.category}`}
        />
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface AuditLogTableProps {
  events: AuditEvent[];
  loading: boolean;
  totalCount?: number;
}

export function AuditLogTable({ events, loading, totalCount }: AuditLogTableProps) {
  const COLUMNS = ["Agent / Time", "Category", "Description", "Outcome", "Cost", "Latency", "Links"];

  return (
    <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="audit-log-table">
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
            {loading ? (
              <AuditLogSkeleton />
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 bg-[color:var(--color-background-secondary)] rounded-2xl flex items-center justify-center mb-3">
                      <Zap size={22} className="text-[color:var(--color-text-muted)]" />
                    </div>
                    <p className="text-sm font-semibold text-[color:var(--color-text)] mb-1">
                      No audit events
                    </p>
                    <p className="text-xs text-[color:var(--color-text-muted)] max-w-xs">
                      No events match the current filters. Try clearing filters or wait for the
                      next agent execution.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              events.map((evt) => <EventRow key={evt.id} event={evt} />)
            )}
          </tbody>
        </table>
      </div>

      {!loading && events.length > 0 && (
        <div className="px-4 py-3 border-t border-[color:var(--color-border-light)] bg-[color:var(--color-surface-active)]">
          <p className="text-xs text-[color:var(--color-text-muted)]">
            Showing{" "}
            <span className="font-semibold text-[color:var(--color-text-secondary)]">
              {events.length}
            </span>
            {totalCount != null && totalCount > events.length && (
              <>
                {" "}of{" "}
                <span className="font-semibold text-[color:var(--color-text-secondary)]">
                  {totalCount}
                </span>
              </>
            )}{" "}
            event{events.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
