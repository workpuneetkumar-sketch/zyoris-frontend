// app/(dashboard)/deals/page.tsx
"use client";

import { useCallback } from "react";
import { DealsUI } from "@/components/deals/DealsUI";
import { useDeals } from "@/hooks/useDeals";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import {
    bulkAssignDeals,
    bulkUpdateDeals,
    bulkDeleteDeals,
} from "@/lib/api/bulkOperationsApi";
import {
    BulkAssignDialog,
    BulkUpdateDialog,
    BulkDeleteDialog,
} from "@/components/ui/BulkActionsBar";
import { DEFAULT_DEAL_STAGES } from "@/types/deals";
import { useState } from "react";

export default function DealsPage() {
    const [bulkUpdateStage, setBulkUpdateStage]                     = useState("");
    const [bulkUpdateAssignedToId, setBulkUpdateAssignedToId]       = useState("");
    const [bulkUpdateContactId, setBulkUpdateContactId]             = useState("");
    const [bulkUpdateCompanyId, setBulkUpdateCompanyId]             = useState("");

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

    const handleBulkAssign = useCallback(
        (assignedToId: string, _assignedToName?: string) => {
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
        <>
            {/* Main Deals UI — owns both Pipeline View and Table View tabs */}
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

            {/* ── Bulk Dialogs (rendered at page level, outside DealsUI) ── */}
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
        </>
    );
}
