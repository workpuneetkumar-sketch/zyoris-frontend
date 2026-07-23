"use client";
// components/leads/assignment/AssignmentHistoryTable.tsx

import { useState } from "react";
import { Search, Download, RefreshCw, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import classNames from "classnames";
import type {
  AssignmentHistoryEntry, AssignmentHistoryFilters,
  ConversionStatus, AssignmentCurrentStatus,
} from "@/types/assignmentRules";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

const STRATEGIES = ["All", "ROUND_ROBIN", "LEAST_LOADED", "RANDOM", "MANUAL", "AI_BASED"];
const STATUSES = ["All", "ACTIVE", "CLOSED", "DEAD", "REASSIGNED"];
const CONV_STATUSES = ["All", "CONVERTED", "NOT_CONVERTED", "PENDING"];
const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function ConversionBadge({ status }: { status: ConversionStatus | string }) {
  const map: Record<string, string> = {
    CONVERTED: "bg-success-light text-success",
    NOT_CONVERTED: "bg-error-light text-error",
    PENDING: "bg-warning-light text-warning",
  };
  const label: Record<string, string> = { CONVERTED: "Converted", NOT_CONVERTED: "Not Converted", PENDING: "Pending" };
  return (
    <span className={classNames("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", map[status] ?? "bg-background-secondary text-text-muted")}>
      {label[status] ?? status}
    </span>
  );
}

function CurrentStatusBadge({ status }: { status: AssignmentCurrentStatus | string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-primary/10 text-primary",
    CLOSED: "bg-success-light text-success",
    DEAD: "bg-background-tertiary text-text-muted",
    REASSIGNED: "bg-warning-light text-warning",
  };
  return (
    <span className={classNames("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize", map[status] ?? "bg-background-secondary text-text-muted")}>
      {status.toLowerCase().replace("_", " ")}
    </span>
  );
}

function strategyLabel(s: string) {
  const map: Record<string, string> = {
    ROUND_ROBIN: "Round Robin", LEAST_LOADED: "Least Loaded",
    RANDOM: "Random", MANUAL: "Manual", AI_BASED: "AI Based",
  };
  return map[s] ?? s;
}

interface AssignmentHistoryTableProps {
  history: AssignmentHistoryEntry[];
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
  filters: AssignmentHistoryFilters;
  onFiltersChange: (f: AssignmentHistoryFilters) => void;
  onPageChange: (p: number) => void;
  onRefresh: () => void;
}

export function AssignmentHistoryTable({
  history, total, page, loading, error,
  filters, onFiltersChange, onPageChange, onRefresh,
}: AssignmentHistoryTableProps) {
  const [showFilters, setShowFilters] = useState(false);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function update<K extends keyof AssignmentHistoryFilters>(key: K, val: AssignmentHistoryFilters[K]) {
    onFiltersChange({ ...filters, [key]: val });
  }

  function exportCsv() {
    if (!history.length) return;
    const headers = ["Lead", "Assigned To", "Assigned By", "Strategy", "Date", "Response Time (min)", "Conversion", "Current Status"];
    const rows = history.map((h) => [
      h.leadName ?? h.leadId,
      h.assignedToName ?? h.assignedToId,
      h.assignedByName ?? h.assignedById ?? "—",
      strategyLabel(h.strategy),
      formatDate(h.assignedAt),
      h.responseTime != null ? String(h.responseTime) : "—",
      h.conversionStatus,
      h.currentStatus,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `assignment-history-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
            <input
              value={filters.search}
              onChange={(e) => update("search", e.target.value)}
              placeholder="Search leads or reps…"
              className="pl-9 pr-3 py-2 rounded-lg border border-border bg-background-secondary text-sm text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 w-56"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={classNames(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[13px] font-medium transition-colors",
              showFilters ? "border-primary bg-primary/5 text-primary" : "border-border text-text-muted hover:bg-surface-hover"
            )}
          >
            <Filter size={14} />
            Filters
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onRefresh} className="p-2 rounded-lg border border-border hover:bg-surface-hover text-text-muted transition-colors" title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button
            onClick={exportCsv}
            disabled={!history.length}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-[13px] font-medium text-text-secondary hover:bg-surface-hover transition-colors disabled:opacity-40"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters row */}
      {showFilters && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-background-secondary border border-border">
          <div>
            <label className="text-[11px] font-semibold text-text-muted uppercase mb-1.5 block">Strategy</label>
            <select value={filters.strategy} onChange={(e) => update("strategy", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20">
              {STRATEGIES.map((s) => <option key={s} value={s}>{s === "All" ? "All Strategies" : strategyLabel(s)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-text-muted uppercase mb-1.5 block">Status</label>
            <select value={filters.status} onChange={(e) => update("status", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20">
              {STATUSES.map((s) => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-text-muted uppercase mb-1.5 block">From</label>
            <input type="date" value={filters.dateFrom} onChange={(e) => update("dateFrom", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-text-muted uppercase mb-1.5 block">To</label>
            <input type="date" value={filters.dateTo} onChange={(e) => update("dateTo", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        {loading ? (
          <div className="p-6"><Skeleton variant="table" /></div>
        ) : error ? (
          <EmptyState title="Failed to load history" description={error} button={<button onClick={onRefresh} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Retry</button>} />
        ) : history.length === 0 ? (
          <EmptyState title="No assignment history" description="Assignments will appear here once leads are assigned." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-background-secondary/50">
                <tr>
                  {["Lead", "Assigned To", "Assigned By", "Strategy", "Date", "Response Time", "Conversion", "Status"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wide text-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-3 text-text font-medium text-[13px] whitespace-nowrap">{entry.leadName ?? entry.leadId}</td>
                    <td className="px-4 py-3 text-text-secondary text-[13px] whitespace-nowrap">{entry.assignedToName ?? entry.assignedToId}</td>
                    <td className="px-4 py-3 text-text-muted text-[13px] whitespace-nowrap">{entry.assignedByName ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                        {strategyLabel(entry.strategy)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-[12px] whitespace-nowrap">{formatDate(entry.assignedAt)}</td>
                    <td className="px-4 py-3 text-text-secondary text-[13px] whitespace-nowrap">
                      {entry.responseTime != null ? `${entry.responseTime}m` : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><ConversionBadge status={entry.conversionStatus} /></td>
                    <td className="px-4 py-3 whitespace-nowrap"><CurrentStatusBadge status={entry.currentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-text-muted">
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg border border-border text-text-muted hover:bg-surface-hover disabled:opacity-40 transition-colors">
              <ChevronLeft size={15} />
            </button>
            <span className="text-[13px] font-medium text-text px-2">Page {page} of {totalPages}</span>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="p-1.5 rounded-lg border border-border text-text-muted hover:bg-surface-hover disabled:opacity-40 transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
