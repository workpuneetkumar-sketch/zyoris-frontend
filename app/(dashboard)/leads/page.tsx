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
import { GitMerge, SlidersHorizontal, List } from "lucide-react";
import { useBulkOperations } from "@/hooks/useBulkOperations";
import { BulkOperationType } from "@/types/bulkOperations";

type LeadsTab = "leads" | "duplicates";

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({
    active,
    onChange,
    pendingCount,
}: {
    active: LeadsTab;
    onChange: (t: LeadsTab) => void;
    pendingCount?: number;
}) {
    const tabs: Array<{ id: LeadsTab; label: string; icon: React.ReactNode }> = [
        { id: "leads",      label: "Leads",            icon: <List size={14} /> },
        { id: "duplicates", label: "Duplicates",        icon: <GitMerge size={14} /> },
    ];

    return (
        <div className="flex items-center gap-1 border-b border-gray-200 bg-white px-4 pt-1 overflow-x-auto">
            {tabs.map((tab) => (
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
                    {tab.id === "duplicates" && pendingCount !== undefined && pendingCount > 0 && (
                        <span className="ml-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold px-1">
                            {pendingCount}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

// ── Advanced filter state label ───────────────────────────────────────────────

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

    const {
        leads,
        total,
        page,
        filters,
        loading,
        error,
        openMenu,
        convertingId,
        confirmAction,
        setPage,
        setOpenMenu,
        setConfirmAction,
        handleFiltersChange,
        handleNewLead,
        handleExport,
        handleAction,
        executeConfirmedAction,
        retry,
    } = useLeads();

    // Displayed data — switch between standard and server-filtered
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
            // Fall back to standard leads on error
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
        // Sync search/status/source/owner to standard hook too
        const std: LeadsFilters = {
            status: f.status,
            source: f.source,
            owner: f.owner,
            search: f.search,
        };
        handleFiltersChange(std);
    }, [loadWithAdvancedFilters, handleFiltersChange]);

    const handleResetFilters = useCallback(() => {
        setAdvFilters(DEFAULT_ADVANCED_FILTERS);
        setUsingAdvanced(false);
        handleFiltersChange({ status: "All Status", source: "All Sources", owner: "All Owners", search: "" });
    }, [handleFiltersChange]);

    const handleBulkSuccess = useCallback((type: BulkOperationType) => {
        if (usingAdvanced) {
            void loadWithAdvancedFilters(advFilters);
        } else {
            void retry();
        }
    }, [usingAdvanced, loadWithAdvancedFilters, advFilters, retry]);

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
    } = useBulkOperations(handleBulkSuccess);

    const filterCount = activeFilterCount(advFilters);

    if (error && activeTab === "leads") {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <p className="text-red-500 text-sm">{error}</p>
                <button
                    onClick={retry}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Tab bar */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                <TabBar active={activeTab} onChange={setActiveTab} />

                {activeTab === "duplicates" ? (
                    <div className="bg-gray-50 p-4 md:p-6">
                        <DuplicateMergeUI />
                    </div>
                ) : (
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
                                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                                            {filterCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                            {usingAdvanced && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">Server-filtered view</span>
                                </div>
                            )}
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
                            />
                            <div className="mt-4">
                                <LeadsTable
                                    leads={displayLeads}
                                    total={displayTotal}
                                    page={page}
                                    perPage={PER_PAGE}
                                    filters={filters}
                                    loading={isLoading}
                                    openMenu={openMenu}
                                    convertingId={null}
                                    onPageChange={setPage}
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
            </div>

            <AdvancedFiltersDrawer
                isOpen={drawerOpen}
                filters={advFilters}
                onClose={() => setDrawerOpen(false)}
                onApply={(f) => {
                    setDrawerOpen(false);
                    handleApplyAdvancedFilters(f);
                }}
                onReset={() => {
                    setDrawerOpen(false);
                    handleResetFilters();
                }}
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
        </>
    );
}
