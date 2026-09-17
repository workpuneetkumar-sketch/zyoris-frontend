// app/(dashboard)/deals/page.tsx
"use client";

import { useCallback, useState, useEffect } from "react";
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
import {
    Pipeline,
    PipelineStage,
    CreatePipelinePayload,
    UpdatePipelinePayload,
    CreateStagePayload,
    UpdateStagePayload,
} from "@/types/pipelines";
import {
    fetchPipelines,
    createPipeline,
    updatePipeline,
    deletePipeline,
    fetchStages,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
} from "@/lib/api/pipelinesApi";

export default function DealsPage() {
    const [bulkUpdateStage, setBulkUpdateStage]                     = useState("");
    const [bulkUpdateAssignedToId, setBulkUpdateAssignedToId]       = useState("");
    const [bulkUpdateContactId, setBulkUpdateContactId]             = useState("");
    const [bulkUpdateCompanyId, setBulkUpdateCompanyId]             = useState("");

    // ── Pipelines and Stages State (FE-2 Day 1) ──
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
    const [pipelinesLoading, setPipelinesLoading] = useState(true);
    const [pipelinesError, setPipelinesError] = useState<string | null>(null);
    const [stages, setStages] = useState<PipelineStage[]>([]);

    const customStageNames = stages.length > 0 ? stages.map((s) => s.name) : undefined;

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
    } = useDeals(customStageNames);

    // ── Load Pipelines ──
    const loadPipelines = useCallback(async () => {
        setPipelinesLoading(true);
        setPipelinesError(null);
        try {
            const list = await fetchPipelines();
            setPipelines(list);
            if (list.length > 0) {
                setSelectedPipeline((prev) => {
                    if (prev && list.some((p) => p.id === prev.id)) {
                        return list.find((p) => p.id === prev.id) || list[0];
                    }
                    return list[0];
                });
            } else {
                setSelectedPipeline(null);
                setStages([]);
            }
        } catch (err: any) {
            setPipelinesError(err.response?.data?.message || err.message || "Failed to load pipelines");
        } finally {
            setPipelinesLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPipelines();
    }, [loadPipelines]);

    // ── Load Stages for Selected Pipeline ──
    const loadStages = useCallback(async () => {
        if (!selectedPipeline?.id) {
            setStages([]);
            return;
        }
        try {
            const stageList = await fetchStages(selectedPipeline.id);
            setStages(stageList);
        } catch (err) {
            console.error("Failed to load stages for pipeline:", err);
        }
    }, [selectedPipeline?.id]);

    useEffect(() => {
        loadStages();
    }, [loadStages]);

    // ── Pipeline Mutation Handlers ──
    const handleCreatePipeline = async (payload: CreatePipelinePayload): Promise<boolean> => {
        const created = await createPipeline(payload);
        await loadPipelines();
        if (created?.id) {
            setSelectedPipeline(created);
        }
        return true;
    };

    const handleUpdatePipeline = async (id: string, payload: UpdatePipelinePayload): Promise<boolean> => {
        await updatePipeline(id, payload);
        await loadPipelines();
        return true;
    };

    const handleDeletePipeline = async (id: string): Promise<boolean> => {
        await deletePipeline(id);
        setSelectedPipeline(null);
        await loadPipelines();
        return true;
    };

    // ── Stage Mutation Handlers ──
    const handleCreateStage = async (payload: CreateStagePayload): Promise<boolean> => {
        if (!selectedPipeline?.id) return false;
        await createStage(selectedPipeline.id, payload);
        await loadStages();
        return true;
    };

    const handleUpdateStage = async (stageId: string, payload: UpdateStagePayload): Promise<boolean> => {
        if (!selectedPipeline?.id) return false;
        await updateStage(selectedPipeline.id, stageId, payload);
        await loadStages();
        return true;
    };

    const handleDeleteStage = async (stageId: string): Promise<boolean> => {
        if (!selectedPipeline?.id) return false;
        await deleteStage(selectedPipeline.id, stageId);
        await loadStages();
        return true;
    };

    const handleReorderStages = async (stageOrders: Array<{ stageId: string; order: number }>): Promise<boolean> => {
        if (!selectedPipeline?.id) return false;
        const reordered = await reorderStages(selectedPipeline.id, { stageOrders });
        setStages(reordered);
        return true;
    };

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
                // FE-2 Pipeline & Stage Integration
                pipelines={pipelines}
                selectedPipeline={selectedPipeline}
                pipelinesLoading={pipelinesLoading}
                pipelinesError={pipelinesError}
                stages={stages}
                onSelectPipeline={setSelectedPipeline}
                onCreatePipeline={handleCreatePipeline}
                onUpdatePipeline={handleUpdatePipeline}
                onDeletePipeline={handleDeletePipeline}
                onCreateStage={handleCreateStage}
                onUpdateStage={handleUpdateStage}
                onDeleteStage={handleDeleteStage}
                onReorderStages={handleReorderStages}
                onRetryPipelines={loadPipelines}
                onRefreshWorkspace={async () => {
                    await retry();
                    await loadStages();
                }}
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
