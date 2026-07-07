"use client";

// app/(dashboard)/leads/advanced/page.tsx
// Advanced Search + Filters + Saved Views + Bulk Operations — Tasks 4 & 5
// This page wraps the standard leads functionality with advanced features.

import { useState, useCallback, useEffect } from "react";
import { useLeads } from "@/hooks/useLeads";
import { PER_PAGE } from "@/types/leads";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { AdvancedFiltersDrawer } from "@/components/leads/AdvancedFiltersDrawer";
import { BulkActionsToolbar, LeadCheckbox } from "@/components/leads/BulkActionsToolbar";
import { useBulkOperations } from "@/hooks/useBulkOperations";
import {
  AdvancedLeadsFilters,
  DEFAULT_ADVANCED_FILTERS,
} from "@/types/savedViews";
import { filterLeads } from "@/lib/api/savedViewsApi";
import { Lead, LeadsFilters } from "@/types/leads";
import {
  Search,
  Filter,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  AlertCircle,
} from "lucide-react";
import { getLeadStatusInfo } from "@/utils/leadStatus";
import { useRouter } from "next/navigation";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// ── Lead status badge ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const info = getLeadStatusInfo(status ?? null);
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${info.style}`}>
      {info.emoji} {info.label}
    </span>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ score = 0 }: { score?: number }) {
  const color =
    score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-500">{score}</span>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-4 py-2.5">
          <div className="w-4 h-4 bg-gray-100 rounded" />
          <div className="w-8 h-8 bg-gray-100 rounded-full" />
          <div className="flex-1 space-y-1">
            <div className="h-3.5 bg-gray-100 rounded w-40" />
            <div className="h-2.5 bg-gray-100 rounded w-28" />
          </div>
          <div className="h-3 bg-gray-100 rounded w-20" />
          <div className="h-3 bg-gray-100 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Rows per page"
        >
          {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <p className="text-xs text-gray-400">
        {total > 0 ? `${from}–${to} of ${total}` : "0 results"}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs text-gray-600 px-2">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdvancedLeadsPage() {
  const router = useRouter();
  const {
    leads: standardLeads,
    total,
    page,
    filters: stdFilters,
    loading: stdLoading,
    error,
    confirmAction,
    setPage,
    setConfirmAction,
    handleFiltersChange: stdFiltersChange,
    handleNewLead,
    handleExport,
    handleAction,
    executeConfirmedAction,
    retry,
  } = useLeads();

  // Advanced filter state (superset of standard filters)
  const [advFilters, setAdvFilters] = useState<AdvancedLeadsFilters>(DEFAULT_ADVANCED_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [serverLeads, setServerLeads] = useState<Lead[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverLoading, setServerLoading] = useState(false);
  const [usingAdvanced, setUsingAdvanced] = useState(false);

  // Bulk operations
  const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleSelect,
    selectAll,
    clearSelection,
    bulkState,
    openBulkAction,
    closeBulkAction,
    executeBulkAssign,
    executeBulkUpdate,
    executeBulkDelete,
  } = useBulkOperations((_type) => {
    // Refresh after bulk operation
    if (usingAdvanced) {
      loadWithAdvancedFilters(advFilters);
    } else {
      retry();
    }
  });

  // Load with advanced filters
  const loadWithAdvancedFilters = useCallback(async (f: AdvancedLeadsFilters) => {
    setServerLoading(true);
    try {
      const res = await filterLeads({
        status: f.status !== "All Status" ? f.status : undefined,
        source: f.source !== "All Sources" ? f.source : undefined,
        owner: f.owner !== "All Owners" ? f.owner : undefined,
        search: f.search || undefined,
        tags: f.tags.length > 0 ? f.tags : undefined,
        dateFrom: f.dateFrom || undefined,
        dateTo: f.dateTo || undefined,
        sortBy: f.sortBy,
        sortOrder: f.sortOrder,
        page: f.page,
        limit: pageSize,
      });
      setServerLeads(res.leads);
      setServerTotal(res.total);
    } catch {
      // Fall back to standard leads
      setServerLeads(standardLeads);
      setServerTotal(total);
    } finally {
      setServerLoading(false);
    }
  }, [pageSize, standardLeads, total]);

  const handleApplyAdvancedFilters = useCallback((f: AdvancedLeadsFilters) => {
    setAdvFilters(f);
    setUsingAdvanced(true);
    loadWithAdvancedFilters(f);

    // Also sync to standard filters for compatibility
    const stdNext: LeadsFilters = {
      status: f.status,
      source: f.source,
      owner: f.owner,
      search: f.search,
    };
    stdFiltersChange(stdNext);
  }, [loadWithAdvancedFilters, stdFiltersChange]);

  const handleResetFilters = useCallback(() => {
    setAdvFilters(DEFAULT_ADVANCED_FILTERS);
    setUsingAdvanced(false);
    stdFiltersChange({
      status: "All Status",
      source: "All Sources",
      owner: "All Owners",
      search: "",
    });
    clearSelection();
  }, [stdFiltersChange, clearSelection]);

  // Displayed leads
  const displayLeads = usingAdvanced ? serverLeads : standardLeads;
  const displayTotal = usingAdvanced ? serverTotal : total;
  const isLoading = usingAdvanced ? serverLoading : stdLoading;

  const allIds = displayLeads.map((l) => l.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => isSelected(id));

  // Active filter count
  const activeFilterCount = [
    advFilters.status !== "All Status",
    advFilters.source !== "All Sources",
    advFilters.owner !== "All Owners",
    advFilters.search !== "",
    advFilters.tags.length > 0,
    advFilters.dateFrom !== "",
    advFilters.dateTo !== "",
  ].filter(Boolean).length;

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Leads</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Advanced search, filters, saved views &amp; bulk operations
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              <Download size={14} />
              Export
            </button>
            <button
              onClick={handleNewLead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} />
              New Lead
            </button>
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads…"
              value={advFilters.search}
              onChange={(e) => {
                const next = { ...advFilters, search: e.target.value };
                setAdvFilters(next);
                // Debounce applied via dependency change
              }}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search leads"
            />
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              activeFilterCount > 0
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
            aria-label="Open advanced filters"
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          {usingAdvanced && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Clear all
            </button>
          )}
          <button
            onClick={usingAdvanced ? () => loadWithAdvancedFilters(advFilters) : retry}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 transition-colors disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
            <AlertCircle size={13} className="shrink-0" />
            {error}
            <button onClick={retry} className="ml-auto underline">Retry</button>
          </div>
        )}

        {/* Leads table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Bulk actions toolbar */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => (allSelected ? clearSelection() : selectAll(allIds))}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              aria-label="Select all leads on this page"
            />
            <span className="text-xs text-gray-500">
              {selectedCount > 0
                ? `${selectedCount} selected`
                : `${displayTotal.toLocaleString()} lead${displayTotal !== 1 ? "s" : ""}`}
            </span>
            {selectedCount > 0 && (
              <div className="flex items-center gap-1.5 ml-2 flex-wrap">
                <button
                  onClick={() => openBulkAction("assign")}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium hover:bg-blue-100 transition-colors"
                >
                  Assign
                </button>
                <button
                  onClick={() => openBulkAction("update")}
                  className="px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 text-[11px] font-medium hover:bg-violet-100 transition-colors"
                >
                  Update
                </button>
                <button
                  onClick={() => openBulkAction("delete")}
                  className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          {isLoading ? (
            <TableSkeleton />
          ) : displayLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                <Search size={22} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">No leads found</p>
              <p className="text-xs text-gray-400">
                {activeFilterCount > 0 ? "Try adjusting your filters" : "Create your first lead"}
              </p>
              {activeFilterCount > 0 && (
                <button onClick={handleResetFilters} className="text-xs text-blue-600 hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="w-10 px-4 py-3" />
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Lead
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">
                      Company
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">
                      Score
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">
                      Source
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">
                      Owner
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={`hover:bg-gray-50/50 transition-colors ${
                        isSelected(lead.id) ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <LeadCheckbox
                          leadId={lead.id}
                          isSelected={isSelected(lead.id)}
                          onToggle={toggleSelect}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/leads/${lead.id}`)}
                          className="text-left group"
                        >
                          <p className="text-[13px] font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                            {lead.name}
                          </p>
                          {lead.email && (
                            <p className="text-xs text-gray-400 truncate max-w-[180px]">{lead.email}</p>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-xs text-gray-600 truncate max-w-[130px]">
                          {lead.company ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <ScoreBar score={lead.score} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-xs text-gray-500">{lead.source ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-xs text-gray-500 truncate max-w-[100px]">
                          {lead.owner ?? "Unassigned"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleAction("View", lead)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && displayTotal > 0 && (
            <Pagination
              page={page}
              total={displayTotal}
              pageSize={pageSize}
              onPageChange={(p) => {
                setPage(p);
                if (usingAdvanced) {
                  const next = { ...advFilters, page: p };
                  setAdvFilters(next);
                  loadWithAdvancedFilters(next);
                }
              }}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          )}
        </div>

        {/* Bulk operation success */}
        {bulkState.result?.success && !bulkState.isOpen && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700">
            ✓ {bulkState.result.message}
          </div>
        )}
      </div>

      {/* Advanced filters drawer */}
      <AdvancedFiltersDrawer
        isOpen={drawerOpen}
        filters={advFilters}
        onClose={() => setDrawerOpen(false)}
        onApply={handleApplyAdvancedFilters}
        onReset={handleResetFilters}
      />

      {/* Confirm action modal */}
      <ConfirmationModal
        isOpen={confirmAction.type !== null}
        title={confirmAction.type === "Delete" ? "Delete Lead" : "Convert Lead"}
        message={
          confirmAction.type === "Delete"
            ? `Are you sure you want to delete "${confirmAction.lead?.name}"?`
            : `Convert "${confirmAction.lead?.name}" to a deal?`
        }
        variant={confirmAction.type === "Delete" ? "danger" : "default"}
        confirmText={confirmAction.type === "Delete" ? "Delete" : "Convert"}
        onConfirm={executeConfirmedAction}
        onCancel={() => setConfirmAction({ type: null, lead: null })}
      />

      {/* Bulk assign dialog */}
      {bulkState.isOpen && bulkState.type === "assign" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Assign {selectedCount} Leads
              </h2>
              <button onClick={closeBulkAction} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Enter the team member ID to assign {selectedCount} selected lead(s) to.
              </p>
              <input
                id="bulk-assign-id"
                type="text"
                placeholder="Team member ID"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {bulkState.isProcessing && (
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 bg-blue-600 rounded-full transition-all" style={{ width: `${bulkState.progress}%` }} />
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeBulkAction} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600">
                Cancel
              </button>
              <button
                onClick={() => {
                  const id = (document.getElementById("bulk-assign-id") as HTMLInputElement)?.value;
                  if (id?.trim()) executeBulkAssign(id.trim());
                }}
                disabled={bulkState.isProcessing}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {bulkState.isProcessing ? <><Loader2 size={14} className="animate-spin" />Assigning…</> : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
