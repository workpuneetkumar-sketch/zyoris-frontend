// app/(dashboard)/leads/page.tsx
"use client";

import { useState, useCallback } from "react";
import { LeadsTable } from "@/components/leads/LeadsUI";
import { useLeads } from "@/hooks/useLeads";
import { PER_PAGE } from "@/types/leads";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { DuplicateMergeUI } from "@/components/leads/DuplicateMergeUI";
import { AdvancedFiltersDrawer } from "@/components/leads/AdvancedFiltersDrawer";
import { BulkActionsToolbar } from "@/components/leads/BulkActionsToolbar";
import { AdvancedLeadsFilters, DEFAULT_ADVANCED_FILTERS } from "@/types/savedViews";
import { filterLeads } from "@/lib/api/savedViewsApi";
import { Lead, LeadsFilters } from "@/types/leads";
import { GitMerge, SlidersHorizontal, List, Zap, BarChart2, Clock } from "lucide-react";
import { useBulkOperations } from "@/hooks/useBulkOperations";
import { BulkOperationType } from "@/types/bulkOperations";
import { useAssignmentRules } from "@/hooks/useAssignmentRules";
import { useAssignmentHistory } from "@/hooks/useAssignmentHistory";
import { useAssignmentAnalytics } from "@/hooks/useAssignmentAnalytics";
import { RulesList } from "@/components/leads/assignment/RulesList";
import { RuleFormModal } from "@/components/leads/assignment/RuleFormModal";
import { AssignmentHistoryTable } from "@/components/leads/assignment/AssignmentHistoryTable";
import { AssignmentAnalyticsDashboard } from "@/components/leads/assignment/AssignmentAnalyticsDashboard";
import type {
  AssignmentRule,
  CreateAssignmentRulePayload,
  UpdateAssignmentRulePayload,
} from "@/types/assignmentRules";
import { getTeamMembers, TeamMember } from "@/lib/api/organizationsApi";
import { useEffect } from "react";

type LeadsTab = "leads" | "assignment-rules" | "assignment-history" | "assignment-analytics" | "duplicates";

// ── Tab bar ───────────────────────────────────────────────────────────────────

const TABS: { id: LeadsTab; label: string; icon: React.ReactNode }[] = [
  { id: "leads",                 label: "Leads",             icon: <List size={14} /> },
  { id: "assignment-rules",      label: "Assignment Rules",  icon: <Zap size={14} /> },
  { id: "assignment-history",    label: "History",           icon: <Clock size={14} /> },
  { id: "assignment-analytics",  label: "Analytics",         icon: <BarChart2 size={14} /> },
  { id: "duplicates",            label: "Duplicates",        icon: <GitMerge size={14} /> },
];

function TabBar({ active, onChange }: { active: LeadsTab; onChange: (t: LeadsTab) => void }) {
  return (
    <div className="flex items-center gap-0 border-b border-gray-200 bg-white px-4 pt-1 overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
            active === tab.id
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          aria-current={active === tab.id ? "page" : undefined}
        >
          {tab.icon}
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

  // Assignment rules state
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    getTeamMembers()
      .then(setTeam)
      .catch(() => setTeam([]));
  }, []);

  // ── Leads hook ────────────────────────────────────────────────────────────
  const {
    leads, total, page, filters, loading, error, openMenu,
    convertingId, confirmAction, setPage, setOpenMenu, setConfirmAction,
    handleFiltersChange, handleNewLead, handleExport, handleAction,
    executeConfirmedAction, retry,
  } = useLeads();

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
  }, [activeTab]);

  const displayLeads = usingAdvanced ? serverLeads : leads;
  const displayTotal = usingAdvanced ? serverTotal : total;
  const isLoading = usingAdvanced ? serverLoading : loading;

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
        limit: f.pageSize,
      });
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
      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* ── Leads tab ──────────────────────────────────── */}
        {activeTab === "leads" && (
          <div className="bg-gray-50">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <SlidersHorizontal size={16} />
                  Advanced filters
                  {filterCount > 0 && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">{filterCount}</span>
                  )}
                </button>
              </div>
              {usingAdvanced && <span className="text-sm text-gray-500">Server-filtered view</span>}
            </div>
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
              <div className="mt-4">
                <LeadsTable
                  leads={displayLeads}
                  total={displayTotal}
                  page={usingAdvanced ? (advFilters.page ?? 1) : page}
                  perPage={usingAdvanced ? advFilters.pageSize : PER_PAGE}
                  filters={filters}
                  loading={isLoading}
                  openMenu={openMenu}
                  convertingId={null}
                  onPageChange={handlePageChange}
                  onRefreshLeads={retry}
                  onFiltersChange={handleFiltersChange}
                  onNewLead={handleNewLead}
                  onExport={handleExport}
                  onAction={handleAction}
                  setOpenMenu={setOpenMenu}
                  isSelected={isSelected}
                  onToggleSelect={toggleSelect}
                  onOpenAdvancedFilters={() => setDrawerOpen(true)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Assignment Rules tab ────────────────────────── */}
        {activeTab === "assignment-rules" && (
          <div className="p-4 md:p-5 bg-gray-50">
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
          <div className="p-4 md:p-5 bg-gray-50">
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
          <div className="p-4 md:p-5 bg-gray-50">
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
          <div className="bg-gray-50 p-4 md:p-6">
            <DuplicateMergeUI />
          </div>
        )}
      </div>

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
    </>
  );
}
