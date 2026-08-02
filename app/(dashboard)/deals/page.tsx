// app/(dashboard)/deals/page.tsx
"use client";

import { useState, useCallback } from "react";
import { DealsUI } from "@/components/deals/DealsUI";
import { useDeals } from "@/hooks/useDeals";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import {
    bulkAssignDeals,
    bulkUpdateDeals,
    bulkDeleteDeals,
} from "@/lib/api/bulkOperationsApi";
import {
    BulkActionsBar,
    BulkCheckbox,
    BulkSelectAllRow,
    BulkAssignDialog,
    BulkUpdateDialog,
    BulkDeleteDialog,
} from "@/components/ui/BulkActionsBar";
import { DEFAULT_DEAL_STAGES } from "@/types/deals";
import { List, Kanban } from "lucide-react";

type DealsView = "kanban" | "list";

export default function DealsPage() {
    const [view, setView] = useState<DealsView>("kanban");
    const [bulkStage, setBulkStage] = useState("");

    const {
        deals,
        allDeals,
        dealsByStage,
        loading,
        error,
        filters,
        totalPipeline,
        avgDealSize,
        winRate,
        conversionRate,
        isCreateOpen,
        creating,
        createError,
        defaultStage,
        handleFiltersChange,
        handleOpenCreate,
        handleCloseCreate,
        handleCreate,
        updateDealStage,
        retry,
    } = useDeals();

    const bulk = useBulkSelection(useCallback(() => retry(), [retry]));

    const [bulkAssignedToId, setBulkAssignedToId] = useState("");
    const [bulkUpdateStage, setBulkUpdateStage] = useState("");
    const [bulkUpdateAssignedToId, setBulkUpdateAssignedToId] = useState("");
    const [bulkUpdateContactId, setBulkUpdateContactId] = useState("");
    const [bulkUpdateCompanyId, setBulkUpdateCompanyId] = useState("");

    const handleBulkAssign = useCallback(
        (assignedToId: string, assignedToName?: string) => {
            void bulk.executeBulkCall("assign", (onProgress) =>
                bulkAssignDeals(
                    { ids: Array.from(bulk.selectedIds), assignedToId },
                    onProgress
                )
            );
        },
        [bulk]
    );

    const handleBulkUpdate = useCallback(() => {
        void bulk.executeBulkCall("update", (onProgress) =>
            bulkUpdateDeals(
                {
                    ids: Array.from(bulk.selectedIds),
                    data: {
                        ...(bulkUpdateStage && { stage: bulkUpdateStage }),
                        ...(bulkUpdateAssignedToId && { assignedToId: bulkUpdateAssignedToId }),
                        ...(bulkUpdateContactId && { contactId: bulkUpdateContactId }),
                        ...(bulkUpdateCompanyId && { companyId: bulkUpdateCompanyId }),
                    },
                },
                onProgress
            )
        );
    }, [bulk, bulkUpdateStage, bulkUpdateAssignedToId, bulkUpdateContactId, bulkUpdateCompanyId]);

    const handleBulkDelete = useCallback(() => {
        void bulk.executeBulkCall("delete", (onProgress) =>
            bulkDeleteDeals({ ids: Array.from(bulk.selectedIds) }, onProgress)
        );
    }, [bulk]);

    if (error) {
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
        <div className="space-y-4">
            {/* View toggle */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setView("kanban")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        view === "kanban"
                            ? "bg-blue-600 text-white"
                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <Kanban size={14} />
                    Kanban
                </button>
                <button
                    onClick={() => setView("list")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        view === "list"
                            ? "bg-blue-600 text-white"
                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <List size={14} />
                    List
                </button>
            </div>

            {view === "kanban" ? (
                <DealsUI
                    deals={deals}
                    dealsByStage={dealsByStage}
                    loading={loading}
                    filters={filters}
                    totalPipeline={totalPipeline}
                    avgDealSize={avgDealSize}
                    winRate={winRate}
                    conversionRate={conversionRate}
                    isCreateOpen={isCreateOpen}
                    creating={creating}
                    createError={createError}
                    defaultStage={defaultStage}
                    onFiltersChange={handleFiltersChange}
                    onStageChange={updateDealStage}
                    onOpenCreate={handleOpenCreate}
                    onCloseCreate={handleCloseCreate}
                    onCreateDeal={handleCreate}
                />
            ) : (
                /* ── List view with bulk operations ── */
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Deals</h2>
                            <p className="text-sm text-gray-400 mt-0.5">{deals.length} total deals</p>
                        </div>
                        <button
                            onClick={() => handleOpenCreate()}
                            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                        >
                            + New Deal
                        </button>
                    </div>

                    {/* Bulk select-all row */}
                    <BulkSelectAllRow
                        allIds={deals.map((d) => d.dealId)}
                        selectedCount={bulk.selectedCount}
                        totalCount={deals.length}
                        isSelected={bulk.isSelected}
                        onSelectAll={bulk.selectAll}
                        onClear={bulk.clearSelection}
                    />

                    {/* Bulk action toolbar */}
                    <BulkActionsBar
                        selectedCount={bulk.selectedCount}
                        entityLabel={bulk.selectedCount === 1 ? "deal" : "deals"}
                        showAssign
                        onAssign={() => bulk.openBulkAction("assign")}
                        onUpdate={() => bulk.openBulkAction("update")}
                        onDelete={() => bulk.openBulkAction("delete")}
                        onClear={bulk.clearSelection}
                        bulkState={bulk.bulkState}
                        onDismissResult={bulk.closeBulkAction}
                    />

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left px-3 py-3 w-8"></th>
                                    {["Deal Name", "Stage", "Amount", "Created"].map((h) => (
                                        <th key={h} className="text-left px-5 py-3 text-[12px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="border-b border-gray-50">
                                            <td className="px-3 py-4"></td>
                                            {Array.from({ length: 4 }).map((_, j) => (
                                                <td key={j} className="px-5 py-4">
                                                    <div className="h-3.5 bg-gray-100 rounded-md animate-pulse w-3/4" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : deals.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-16 text-gray-400 text-sm">
                                            No deals found.
                                        </td>
                                    </tr>
                                ) : (
                                    deals.map((deal) => (
                                        <tr
                                            key={deal.dealId}
                                            className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${
                                                bulk.isSelected(deal.dealId) ? "bg-blue-50/40" : ""
                                            }`}
                                        >
                                            <td className="px-3 py-3.5">
                                                <BulkCheckbox
                                                    id={deal.dealId}
                                                    isSelected={bulk.isSelected(deal.dealId)}
                                                    onToggle={bulk.toggleSelect}
                                                    label={`Select ${deal.name}`}
                                                />
                                            </td>
                                            <td className="px-5 py-3.5 font-medium text-gray-800 whitespace-nowrap">
                                                {deal.name}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                    {deal.stage}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-700 whitespace-nowrap font-medium">
                                                ${deal.amount.toLocaleString()}
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap text-[13px]">
                                                {deal.createdAt ? new Date(deal.createdAt).toLocaleDateString() : "—"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Bulk Dialogs ── */}
            {bulk.bulkState.isOpen && bulk.bulkState.type === "assign" && (
                <BulkAssignDialog
                    count={bulk.selectedCount}
                    entityLabel={bulk.selectedCount === 1 ? "deal" : "deals"}
                    onConfirm={handleBulkAssign}
                    onCancel={bulk.closeBulkAction}
                    isProcessing={bulk.bulkState.isProcessing}
                    progress={bulk.bulkState.progress}
                    error={bulk.bulkState.error}
                />
            )}
            {bulk.bulkState.isOpen && bulk.bulkState.type === "update" && (
                <BulkUpdateDialog
                    count={bulk.selectedCount}
                    entityLabel={bulk.selectedCount === 1 ? "deal" : "deals"}
                    fields={
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Stage</label>
                                <select
                                    value={bulkUpdateStage}
                                    onChange={(e) => setBulkUpdateStage(e.target.value)}
                                    disabled={bulk.bulkState.isProcessing}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                                >
                                    <option value="">— keep existing —</option>
                                    {DEFAULT_DEAL_STAGES.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Assigned To ID</label>
                                <input
                                    type="text"
                                    value={bulkUpdateAssignedToId}
                                    onChange={(e) => setBulkUpdateAssignedToId(e.target.value)}
                                    disabled={bulk.bulkState.isProcessing}
                                    placeholder="Enter user ID"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Contact ID</label>
                                <input
                                    type="text"
                                    value={bulkUpdateContactId}
                                    onChange={(e) => setBulkUpdateContactId(e.target.value)}
                                    disabled={bulk.bulkState.isProcessing}
                                    placeholder="Enter contact ID"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Company ID</label>
                                <input
                                    type="text"
                                    value={bulkUpdateCompanyId}
                                    onChange={(e) => setBulkUpdateCompanyId(e.target.value)}
                                    disabled={bulk.bulkState.isProcessing}
                                    placeholder="Enter company ID"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                                />
                            </div>
                        </div>
                    }
                    onConfirm={handleBulkUpdate}
                    onCancel={bulk.closeBulkAction}
                    isProcessing={bulk.bulkState.isProcessing}
                    progress={bulk.bulkState.progress}
                    error={bulk.bulkState.error}
                />
            )}
            {bulk.bulkState.isOpen && bulk.bulkState.type === "delete" && (
                <BulkDeleteDialog
                    count={bulk.selectedCount}
                    entityLabel={bulk.selectedCount === 1 ? "deal" : "deals"}
                    onConfirm={handleBulkDelete}
                    onCancel={bulk.closeBulkAction}
                    isProcessing={bulk.bulkState.isProcessing}
                    progress={bulk.bulkState.progress}
                    error={bulk.bulkState.error}
                />
            )}
        </div>
    );
}
