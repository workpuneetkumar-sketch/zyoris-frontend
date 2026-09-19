"use client";

/**
 * components/reporting/ReportDrilldownPanel.tsx
 * ─────────────────────────────────────────────────────────────
 * W6 — Reporting / Analysis UI — In-place drill-down panel
 *
 * Opens in place (no navigation away), dismissible back to summary.
 * Renders a dynamic table built from the schema in ReportDrilldownData.
 * Row cells with drillDownReferences render as CRM deep-links.
 *
 * Acceptance criteria (W6):
 * ✓ Dismissible without losing original question/answer
 * ✓ Metrics with no drilldownQuery are non-interactive
 * ✓ Failed fetches offer retry
 * ✓ drillDownReferences render as clickable CRM links
 */

import { useCallback, useEffect, useState } from "react";
import classNames from "classnames";
import {
  X,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Table2,
  ArrowLeft,
} from "lucide-react";
import { getReportDrilldown } from "@/lib/api/reportingApi";
import type { ReportDrilldownData } from "@/lib/types/agent-results";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportDrilldownPanelProps {
  reportId: string;
  drilldownQuery: string;
  metricLabel: string;
  onDismiss: () => void;
}

// ─── Column display name ──────────────────────────────────────────────────────

function toDisplayName(col: string): string {
  return col
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}

// ─── Dynamic table ────────────────────────────────────────────────────────────

function DrilldownTable({ data }: { data: ReportDrilldownData }) {
  if (data.rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Table2 size={32} className="text-[color:var(--color-text-muted)] mb-3" />
        <p className="text-sm font-semibold text-[color:var(--color-text)]">No records found</p>
        <p className="text-xs text-[color:var(--color-text-muted)] mt-1 max-w-xs">
          No records match this drill-down query.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid="drilldown-table">
        <thead>
          <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-active)]">
            {data.columns.map((col) => (
              <th
                key={col}
                className="text-left px-4 py-3 text-[11px] font-semibold text-[color:var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap"
              >
                {toDisplayName(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => {
            // First column is treated as the record-ID column for link lookup
            const rowId = String(row.id ?? row[data.columns[0]] ?? "");
            const recordLink = data.drillDownReferences?.[rowId];

            return (
              <tr
                key={ri}
                className="border-b border-[color:var(--color-border-light)] hover:bg-[color:var(--color-surface-hover)] transition-colors"
              >
                {data.columns.map((col, ci) => {
                  const val = row[col];
                  const displayVal =
                    val !== undefined && val !== null ? String(val) : "—";

                  // First cell: if we have a deep-link reference, make it clickable
                  if (ci === 0 && recordLink) {
                    return (
                      <td key={col} className="px-4 py-3 whitespace-nowrap">
                        <a
                          href={recordLink}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--color-primary)] hover:underline"
                        >
                          {displayVal}
                          <ExternalLink size={11} className="shrink-0" />
                        </a>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={col}
                      className="px-4 py-3 text-sm text-[color:var(--color-text-secondary)] max-w-[200px] truncate"
                      title={displayVal}
                    >
                      {displayVal}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReportDrilldownPanel({
  reportId,
  drilldownQuery,
  metricLabel,
  onDismiss,
}: ReportDrilldownPanelProps) {
  const [data, setData]       = useState<ReportDrilldownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReportDrilldown(reportId, drilldownQuery);
      setData(result);
    } catch (err: any) {
      setError(err.message ?? "Failed to load drill-down data.");
    } finally {
      setLoading(false);
    }
  }, [reportId, drilldownQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div
      className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden"
      data-testid="drilldown-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[color:var(--color-border-light)] bg-[color:var(--color-surface-active)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onDismiss}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)] transition-colors shrink-0"
            aria-label="Close drill-down panel"
          >
            <ArrowLeft size={13} />
            Back
          </button>
          <span className="text-[color:var(--color-border)] text-sm">·</span>
          <div className="flex items-center gap-2 min-w-0">
            <Table2 size={14} className="text-[color:var(--color-text-muted)] shrink-0" />
            <p className="text-sm font-bold text-[color:var(--color-text)] truncate">
              {metricLabel}
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="w-7 h-7 rounded-xl bg-[color:var(--color-background-secondary)] hover:bg-[color:var(--color-surface-active)] flex items-center justify-center transition-colors shrink-0"
          aria-label="Dismiss drill-down"
        >
          <X size={13} className="text-[color:var(--color-text-muted)]" />
        </button>
      </div>

      {/* Body */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <RefreshCw size={24} className="text-[color:var(--color-primary)] animate-spin" />
          <p className="text-sm text-[color:var(--color-text-secondary)] font-medium animate-pulse">
            Loading records…
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center px-6">
          <AlertCircle size={36} className="text-[color:var(--color-error)]" />
          <div>
            <p className="text-sm font-semibold text-[color:var(--color-text)] mb-1">
              Failed to load drill-down
            </p>
            <p className="text-xs text-[color:var(--color-text-secondary)]">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-[color:var(--color-primary-foreground)] text-xs font-semibold rounded-xl"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="px-5 py-2 bg-[color:var(--color-background-secondary)] border-b border-[color:var(--color-border-light)]">
            <p className="text-xs text-[color:var(--color-text-muted)]">
              <span className="font-semibold text-[color:var(--color-text-secondary)]">
                {data.total}
              </span>{" "}
              record{data.total !== 1 ? "s" : ""}
              {data.drillDownReferences &&
                Object.keys(data.drillDownReferences).length > 0 && (
                  <span className="ml-2 text-[color:var(--color-info)]">
                    · Click a row name to open in CRM
                  </span>
                )}
            </p>
          </div>
          <DrilldownTable data={data} />
        </>
      )}
    </div>
  );
}
