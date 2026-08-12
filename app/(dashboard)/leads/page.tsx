// app/(dashboard)/leads/page.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { LeadsTable } from "@/components/leads/LeadsUI";
import { useLeads } from "@/hooks/useLeads";
import { Lead, LeadsFilters } from "@/types/leads";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { DuplicateMergeUI } from "@/components/leads/DuplicateMergeUI";
import { AdvancedFiltersDrawer } from "@/components/leads/AdvancedFiltersDrawer";
import { BulkActionsToolbar } from "@/components/leads/BulkActionsToolbar";
import { AdvancedLeadsFilters, DEFAULT_ADVANCED_FILTERS } from "@/types/savedViews";
import { fetchLeads } from "@/lib/api/leadsApi";
import { Upload, Download, Plus, Users, TrendingUp, PhoneCall, CheckCircle2, Target } from "lucide-react";
import { useBulkOperations } from "@/hooks/useBulkOperations";
import { BulkOperationType } from "@/types/bulkOperations";
import { useAssignmentRules } from "@/hooks/useAssignmentRules";
import { useAssignmentHistory } from "@/hooks/useAssignmentHistory";
import { useAssignmentAnalytics } from "@/hooks/useAssignmentAnalytics";
import { RulesList } from "@/components/leads/assignment/RulesList";
import { RuleFormModal } from "@/components/leads/assignment/RuleFormModal";
import { AssignmentHistoryTable } from "@/components/leads/assignment/AssignmentHistoryTable";
import { AssignmentAnalyticsDashboard } from "@/components/leads/assignment/AssignmentAnalyticsDashboard";
import UploadLeadsModal from "@/components/leads/UploadLeadsModal";
import type {
  AssignmentRule,
  CreateAssignmentRulePayload,
  UpdateAssignmentRulePayload,
} from "@/types/assignmentRules";
import { getTeamMembers, TeamMember } from "@/lib/api/organizationsApi";
import api from "@/lib/api/api";
import { toast } from "react-toastify";

type LeadsTab = "leads" | "assignment-rules" | "assignment-history" | "assignment-analytics" | "duplicates";

// ── Summary stats ────────────────────────────────────────────────────────────

interface LeadsStats {
  total: number;
  newLeads: number;
  contacted: number;
  converted: number;
  avgScore: number | null; // null = not available from API
}

/**
 * Derives summary card values strictly from the /leads/stats API response.
 * Schema per swagger: statusStats: [{ status: "NEW"|"WARM"|"HOT"|"DEAD"|"WON"|"LOST", count }]
 *
 * - Total Leads  : sum of all statusStats counts
 * - New Leads    : status === "NEW"
 * - Contacted    : status === "WARM" + "HOT"  (actively engaged leads)
 * - Converted    : status === "WON"            (API uses WON, not CLOSED)
 * - Avg Score    : not provided by this endpoint — caller must supply separately
 */
function deriveStatsFromStatusStats(statusStats: { status: string; count: number }[]): Omit<LeadsStats, "avgScore"> {
  const find = (...statuses: string[]) =>
    statuses.reduce(
      (sum, s) =>
        sum + (statusStats.find((x) => x.status?.toUpperCase() === s.toUpperCase())?.count ?? 0),
      0
    );

  const total = statusStats.reduce((sum, x) => sum + (x.count ?? 0), 0);
  const newLeads = find("NEW");
  const contacted = find("WARM", "HOT");   // engaged/active — best real mapping
  const converted = find("WON");           // API enum uses WON for converted leads

  return { total, newLeads, contacted, converted };
}

// ── Summary card ──────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: number | string | null;
  icon: React.ReactNode;
  iconBg: string;
  loading?: boolean;
}

function SummaryCard({ label, value, icon, iconBg, loading }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between gap-4 min-w-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 mb-1 truncate">{label}</p>
        {loading ? (
          <div className="h-8 w-16 bg-gray-100 rounded-md animate-pulse mb-1" />
        ) : (
          <p className="text-3xl font-bold text-gray-900 leading-none tracking-tight">
            {value ?? "—"}
          </p>
        )}
        {!loading && <p className="text-xs text-gray-400 mt-1.5">All time</p>}
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

const TABS: { id: LeadsTab; label: string }[] = [
  { id: "leads",                 label: "All Leads" },
  { id: "assignment-rules",      label: "Assignment Rules" },
  { id: "assignment-history",    label: "History" },
  { id: "assignment-analytics",  label: "Analytics" },
  { id: "duplicates",            label: "Duplicates" },
];

function TabBar({ active, onChange }: { active: LeadsTab; onChange: (t: LeadsTab) => void }) {
  return (
    <div className="flex items-center gap-0 border-b border-gray-200 bg-white px-4 pt-1 overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
            active === tab.id
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          aria-current={active === tab.id ? "page" : undefined}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function activeFilterCount(f: AdvancedLeadsFilters): number {
  return [
    f.status !== "All Status",
    f.source !== "All Sources",
    f.owner !== "All Owners",
    f.search !== "",
    f.tags.length > 0,
    f.dateFrom !== "",
    f.dateTo !== "",
  ].filter(Boolean).length;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState<LeadsTab>("leads");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [advFilters, setAdvFilters] = useState<AdvancedLeadsFilters>(DEFAULT_ADVANCED_FILTERS);
  const [serverLeads, setServerLeads] = useState<Lead[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverLoading, setServerLoading] = useState(false);
  const [usingAdvanced, setUsingAdvanced] = useState(false);

  // Upload modal (import)
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Stats for summary cards
  const [statsLoading, setStatsLoading] = useState(true);
  const [leadsStats, setLeadsStats] = useState<LeadsStats>({
    total: 0, newLeads: 0, contacted: 0, converted: 0, avgScore: null,
  });

  // Assignment rules state
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    getTeamMembers()
      .then(setTeam)
      .catch(() => setTeam([]));
  }, []);

  // ── Load summary stats from /leads/stats ──────────────────────────────────
  // The endpoint returns: { statusStats: [{ status, count }], sourceStats: [...] }
  // There is no total, averageScore, or change-percentage in this response.
  useEffect(() => {
    setStatsLoading(true);
    api
      .get("/leads/stats")
      .then((res) => {
        const d = res.data;
        // Normalise both possible envelope shapes:
        // Shape A (direct): { statusStats: [...], sourceStats: [...] }
        // Shape B (wrapped): { data: { statusStats: [...] } }
        const statusStats: { status: string; count: number }[] =
          Array.isArray(d?.statusStats)       ? d.statusStats :
          Array.isArray(d?.data?.statusStats) ? d.data.statusStats :
          [];

        const derived = deriveStatsFromStatusStats(statusStats);
        setLeadsStats((prev) => ({ ...derived, avgScore: prev.avgScore }));
      })
      .catch(() => {
        // Endpoint unavailable — values stay at 0 until lead list loads (fallback below)
      })
      .finally(() => setStatsLoading(false));
  }, []);

  // ── Leads hook ────────────────────────────────────────────────────────────
  const {
    leads, total, page, pageSize, filters, loading, error, openMenu,
    convertingId, confirmAction, setPage, setPageSize, setOpenMenu, setConfirmAction,
    handleFiltersChange, handleNewLead, handleExport, handleAction,
    executeConfirmedAction, retry,
  } = useLeads();

  // ── Fallback: when /leads/stats is unavailable, derive counts from loaded leads ──
  // Also computes avgScore from the loaded leads' real score values (the only
  // source of truth we have — individual scores are fetched per-lead in leadsApi).
  useEffect(() => {
    if (statsLoading) return;

    setLeadsStats((prev) => {
      const next = { ...prev };

      // Total: use stats API total when available; fall back to the paginated total
      if (next.total === 0 && total > 0) {
        next.total = total;
      }

      // Avg score: compute from current page's loaded leads (real fetched scores)
      if (leads.length > 0) {
        const scoredLeads = leads.filter((l) => typeof l.score === "number" && l.score > 0);
        if (scoredLeads.length > 0) {
          const avg = scoredLeads.reduce((sum, l) => sum + (l.score as number), 0) / scoredLeads.length;
          next.avgScore = Math.round(avg);
        }
      }

      return next;
    });
  }, [statsLoading, total, leads]);

  // ── Assignment hooks (lazy — only load when tab active) ───────────────────
  const rulesHook = useAssignmentRules();
  const historyHook = useAssignmentHistory();
  const analyticsHook = useAssignmentAnalytics();

  useEffect(() => {
    if (activeTab === "assignment-history") {
      void historyHook.refresh();
    } else if (activeTab === "assignment-analytics") {
      void analyticsHook.refresh();
    } else if (activeTab === "assignment-rules") {
      void rulesHook.refresh();
    }
  }, [activeTab, analyticsHook, historyHook, rulesHook]);

  const displayLeads = usingAdvanced ? serverLeads : leads;
  const displayTotal = usingAdvanced ? serverTotal : total;
  const isLoading = usingAdvanced ? serverLoading : loading;

  const loadWithAdvancedFilters = useCallback(async (f: AdvancedLeadsFilters) => {
    setServerLoading(true);
    try {
      const res = await fetchLeads(
        f.page ?? 1,
        {
          status: f.status,
          source: f.source,
          owner: f.owner,
          search: f.search,
        },
        f.pageSize
      );
      setServerLeads(res.leads);
      setServerTotal(res.total);
    } catch {
      setServerLeads(leads);
      setServerTotal(total);
    } finally {
      setServerLoading(false);
    }
  }, [leads, total]);

  const handleApplyAdvancedFilters = useCallback((f: AdvancedLeadsFilters) => {
    setAdvFilters(f);
    setUsingAdvanced(true);
    loadWithAdvancedFilters(f);
    const std: LeadsFilters = { status: f.status, source: f.source, owner: f.owner, search: f.search };
    handleFiltersChange(std);
  }, [loadWithAdvancedFilters, handleFiltersChange]);

  const handleResetFilters = useCallback(() => {
    setAdvFilters(DEFAULT_ADVANCED_FILTERS);
    setUsingAdvanced(false);
    handleFiltersChange({ status: "All Status", source: "All Sources", owner: "All Owners", search: "" });
  }, [handleFiltersChange]);

  // Single page-change handler that works for both normal and advanced-filter modes
  const handlePageChange = useCallback((newPage: number) => {
    if (usingAdvanced) {
      const updated = { ...advFilters, page: newPage };
      setAdvFilters(updated);
      loadWithAdvancedFilters(updated);
    } else {
      setPage(newPage);
    }
  }, [usingAdvanced, advFilters, loadWithAdvancedFilters, setPage]);

  // Per-page change — resets to page 1 so pagination stays valid
  const handlePerPageChange = useCallback((newSize: number) => {
    if (usingAdvanced) {
      const updated = { ...advFilters, pageSize: newSize, page: 1 };
      setAdvFilters(updated);
      loadWithAdvancedFilters(updated);
    } else {
      setPageSize(newSize);
      setPage(1);
    }
  }, [usingAdvanced, advFilters, loadWithAdvancedFilters, setPageSize, setPage]);

  // Date range — threads dateFrom/dateTo into LeadsFilters so useLeads fires
  // the API with createdFrom/createdTo params; resets to page 1
  const handleDateRangeChange = useCallback((from: string, to: string) => {
    handleFiltersChange({ ...filters, dateFrom: from, dateTo: to });
    setPage(1);
  }, [filters, handleFiltersChange, setPage]);

  const handleBulkSuccess = useCallback((type: BulkOperationType) => {
    if (usingAdvanced) void loadWithAdvancedFilters(advFilters);
    else void retry();
  }, [usingAdvanced, loadWithAdvancedFilters, advFilters, retry]);

  const {
    selectedIds, selectedCount, isSelected, toggleSelect, selectAll,
    clearSelection, bulkState, openBulkAction, closeBulkAction,
    executeBulkAssign, executeBulkUpdate, executeBulkDelete, executeBulkApplyRule,
  } = useBulkOperations(handleBulkSuccess);

  // ── Assignment handlers ───────────────────────────────────────────────────
  const handleNewRule = useCallback(() => { setEditingRule(null); setRuleFormOpen(true); }, []);
  const handleEditRule = useCallback((rule: AssignmentRule) => { setEditingRule(rule); setRuleFormOpen(true); }, []);

  const handleToggleStatus = useCallback(async (rule: AssignmentRule) => {
    await rulesHook.updateRule({
      id: rule.id,
      status: rule.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
    });
  }, [rulesHook]);

  const handleDeleteRule = useCallback(async (rule: AssignmentRule) => {
    if (window.confirm(`Are you sure you want to delete assignment rule "${rule.name}"?`)) {
      await rulesHook.deleteRule(rule.id);
    }
  }, [rulesHook]);

  const handleSaveRule = useCallback(async (payload: CreateAssignmentRulePayload | UpdateAssignmentRulePayload) => {
    let result: AssignmentRule | null = null;
    if ("id" in payload && payload.id) {
      result = await rulesHook.updateRule(payload as UpdateAssignmentRulePayload);
    } else {
      result = await rulesHook.createRule(payload as CreateAssignmentRulePayload);
    }
    if (result) setRuleFormOpen(false);
  }, [rulesHook]);

  const filterCount = activeFilterCount(advFilters);

  if (error && activeTab === "leads") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-red-500 text-sm">{error}</p>
        <button onClick={retry} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">Leads</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage and track all incoming leads in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Upload size={15} />
              Import
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Download size={15} />
              Export
            </button>
            <button
              onClick={handleNewLead}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm"
            >
              <Plus size={16} />
              New Lead
            </button>
          </div>
        </div>

        {/* ── Summary Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryCard
            label="Total Leads"
            value={statsLoading ? null : (leadsStats.total || total)}
            icon={<Users size={20} className="text-blue-600" />}
            iconBg="bg-blue-50"
            loading={statsLoading}
          />
          <SummaryCard
            label="New Leads"
            value={statsLoading ? null : leadsStats.newLeads}
            icon={<TrendingUp size={20} className="text-emerald-600" />}
            iconBg="bg-emerald-50"
            loading={statsLoading}
          />
          <SummaryCard
            label="Contacted"
            value={statsLoading ? null : leadsStats.contacted}
            icon={<PhoneCall size={20} className="text-violet-600" />}
            iconBg="bg-violet-50"
            loading={statsLoading}
          />
          <SummaryCard
            label="Converted"
            value={statsLoading ? null : leadsStats.converted}
            icon={<CheckCircle2 size={20} className="text-blue-500" />}
            iconBg="bg-blue-50"
            loading={statsLoading}
          />
          <SummaryCard
            label="Avg Lead Score"
            value={statsLoading ? null : leadsStats.avgScore}
            icon={<Target size={20} className="text-cyan-600" />}
            iconBg="bg-cyan-50"
            loading={statsLoading}
          />
        </div>

        {/* ── Tabbed card ─────────────────────────────────────────────────── */}
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
          <TabBar active={activeTab} onChange={setActiveTab} />

          {/* ── Leads tab ──────────────────────────────────── */}
          {activeTab === "leads" && (
            <div className="bg-gray-50/50">
              <div className="p-4 md:p-5">
                <BulkActionsToolbar
                  allLeads={displayLeads}
                  selectedIds={selectedIds}
                  selectedCount={selectedCount}
                  isSelected={isSelected}
                  toggleSelect={toggleSelect}
                  selectAll={selectAll}
                  clearSelection={clearSelection}
                  bulkState={bulkState}
                  openBulkAction={openBulkAction}
                  closeBulkAction={closeBulkAction}
                  executeBulkAssign={executeBulkAssign}
                  executeBulkUpdate={executeBulkUpdate}
                  executeBulkDelete={executeBulkDelete}
                  executeBulkApplyRule={executeBulkApplyRule}
                />
                <div className="mt-3">
                  <LeadsTable
                    leads={displayLeads}
                    total={displayTotal}
                    page={usingAdvanced ? (advFilters.page ?? 1) : page}
                    perPage={usingAdvanced ? advFilters.pageSize : pageSize}
                    filters={filters}
                    loading={isLoading}
                    openMenu={openMenu}
                    convertingId={null}
                    onPageChange={handlePageChange}
                    onPerPageChange={handlePerPageChange}
                    onRefreshLeads={retry}
                    onFiltersChange={handleFiltersChange}
                    onNewLead={handleNewLead}
                    onExport={handleExport}
                    onAction={handleAction}
                    setOpenMenu={setOpenMenu}
                    isSelected={isSelected}
                    onToggleSelect={toggleSelect}
                    onOpenAdvancedFilters={() => setDrawerOpen(true)}
                    filterCount={filterCount}
                    usingAdvanced={usingAdvanced}
                    dateFrom={filters.dateFrom ?? ""}
                    dateTo={filters.dateTo ?? ""}
                    onDateRangeChange={handleDateRangeChange}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Assignment Rules tab ────────────────────────── */}
          {activeTab === "assignment-rules" && (
            <div className="p-4 md:p-5 bg-gray-50/50">
              <RulesList
                rules={rulesHook.rules}
                filteredRules={rulesHook.filteredRules}
                loading={rulesHook.loading}
                error={rulesHook.error}
                searchQuery={rulesHook.searchQuery}
                onSearchChange={rulesHook.setSearchQuery}
                statusFilter={rulesHook.statusFilter}
                onStatusFilterChange={rulesHook.setStatusFilter}
                onNewRule={handleNewRule}
                onEditRule={handleEditRule}
                onDeleteRule={handleDeleteRule}
                onToggleStatus={handleToggleStatus}
                onRefresh={rulesHook.refresh}
                team={team}
              />
            </div>
          )}

          {/* ── Assignment History tab ──────────────────────── */}
          {activeTab === "assignment-history" && (
            <div className="p-4 md:p-5 bg-gray-50/50">
              <AssignmentHistoryTable
                history={historyHook.history}
                total={historyHook.total}
                page={historyHook.page}
                loading={historyHook.loading}
                error={historyHook.error}
                filters={historyHook.filters}
                onFiltersChange={historyHook.setFilters}
                onPageChange={historyHook.setPage}
                onRefresh={historyHook.refresh}
              />
            </div>
          )}

          {/* ── Analytics tab ───────────────────────────────── */}
          {activeTab === "assignment-analytics" && (
            <div className="p-4 md:p-5 bg-gray-50/50">
              <AssignmentAnalyticsDashboard
                analytics={analyticsHook.analytics}
                loading={analyticsHook.loading}
                error={analyticsHook.error}
                backendAvailable={analyticsHook.backendAvailable}
                filters={analyticsHook.filters}
                onFiltersChange={analyticsHook.setFilters}
                onRefresh={analyticsHook.refresh}
              />
            </div>
          )}

          {/* ── Duplicates tab ──────────────────────────────── */}
          {activeTab === "duplicates" && (
            <div className="bg-gray-50/50 p-4 md:p-6">
              <DuplicateMergeUI />
            </div>
          )}
        </div>
      </div>

      {/* ── Drawers & Modals ──────────────────────────────────────────────── */}
      <AdvancedFiltersDrawer
        isOpen={drawerOpen}
        filters={advFilters}
        onClose={() => setDrawerOpen(false)}
        onApply={(f) => { setDrawerOpen(false); handleApplyAdvancedFilters(f); }}
        onReset={() => { setDrawerOpen(false); handleResetFilters(); }}
      />

      <ConfirmationModal
        isOpen={confirmAction.type !== null && confirmAction.lead !== null}
        title={confirmAction.type === "Delete" ? "Delete Lead" : "Convert Lead"}
        message={
          confirmAction.type === "Delete"
            ? `Are you sure you want to delete lead "${confirmAction.lead?.name}"?`
            : `Convert lead "${confirmAction.lead?.name}" to a deal?`
        }
        variant={confirmAction.type === "Delete" ? "danger" : "default"}
        confirmText={confirmAction.type === "Delete" ? "Delete" : "Convert"}
        onConfirm={executeConfirmedAction}
        onCancel={() => setConfirmAction({ type: null, lead: null })}
      />

      <RuleFormModal
        isOpen={ruleFormOpen}
        editRule={editingRule}
        isSaving={rulesHook.creating || rulesHook.updating}
        onSave={handleSaveRule}
        onCancel={() => setRuleFormOpen(false)}
        team={team}
      />

      {isUploadOpen && (
        <UploadLeadsModal
          onClose={() => setIsUploadOpen(false)}
          onSuccess={async () => {
            await retry();
            toast.success("Leads imported! Applying assignment rules…");
            try {
              const { fetchLeads: fetchLeadsApi, executeAssignmentRule } = await import("@/lib/api/leadsApi");
              const data = await fetchLeadsApi(1, { status: "All Status", source: "All Sources", owner: "All Owners", search: "" });
              const unassigned = data.leads.filter((l: any) => !l.assignedToId && !l.assignedTo);
              await Promise.allSettled(
                unassigned.slice(0, 50).map((l: any) => executeAssignmentRule(l.id))
              );
              if (unassigned.length > 0) {
                toast.success(`Assignment rules applied to ${Math.min(unassigned.length, 50)} leads.`);
              }
            } catch (err) {
              console.warn("[BulkUpload] Assignment rule run failed (non-fatal):", err);
            }
          }}
        />
      )}
    </>
  );
}
