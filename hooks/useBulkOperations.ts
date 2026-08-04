// hooks/useBulkOperations.ts
"use client";

import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import {
  bulkAssignLeads,
  bulkUpdateLeads,
  bulkDeleteLeads,
} from "@/lib/api/bulkOperationsApi";
import { executeAssignmentRule } from "@/lib/api/leadsApi";
import {
  BulkOperationType,
  BulkOperationState,
  BulkOperationResult,
  INITIAL_BULK_STATE,
} from "@/types/bulkOperations";

export function useBulkOperations(onSuccess?: (type: BulkOperationType) => void) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkState, setBulkState] = useState<BulkOperationState>(INITIAL_BULK_STATE);
  const [undoStack, setUndoStack] = useState<Array<{ type: BulkOperationType; ids: string[] }>>([]);

  // ── Selection ───────────────────────────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  // ── Open / close dialog ─────────────────────────────────────────────────────

  const openBulkAction = useCallback((type: BulkOperationType) => {
    setBulkState((prev) => ({
      ...prev,
      type,
      isOpen: true,
      error: null,
      result: null,
      progress: 0,
    }));
  }, []);

  const closeBulkAction = useCallback(() => {
    setBulkState(INITIAL_BULK_STATE);
  }, []);

  // ── Execute bulk operations ─────────────────────────────────────────────────

  const executeBulkAssign = useCallback(
    async (assignedToId: string, assignedToName?: string) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;

      setBulkState((prev) => ({ ...prev, isProcessing: true, progress: 0, error: null }));

      try {
        const result = await bulkAssignLeads(
          { ids, assignedToId, assignedToName },
          (pct) => setBulkState((prev) => ({ ...prev, progress: pct }))
        );
        setUndoStack((prev) => [...prev, { type: "assign", ids }]);
        setBulkState((prev) => ({
          ...prev,
          isProcessing: false,
          progress: 100,
          result,
        }));
        toast.success(result.message);
        onSuccess?.("assign");
        clearSelection();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Bulk assign failed.";
        setBulkState((prev) => ({ ...prev, isProcessing: false, error: msg }));
        toast.error(msg);
      }
    },
    [selectedIds, onSuccess, clearSelection]
  );

  const executeBulkUpdate = useCallback(
    async (data: {
      name?: string;
      phone?: string | null;
      email?: string | null;
      company?: string | null;
      city?: string | null;
      source?: string | null;
      status?: string;
      assignedToId?: string | null;
      tags?: string[];
    }) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;

      setBulkState((prev) => ({ ...prev, isProcessing: true, progress: 0, error: null }));

      try {
        const result = await bulkUpdateLeads(
          { ids, data },
          (pct) => setBulkState((prev) => ({ ...prev, progress: pct }))
        );
        setUndoStack((prev) => [...prev, { type: "update", ids }]);
        setBulkState((prev) => ({
          ...prev,
          isProcessing: false,
          progress: 100,
          result,
        }));
        toast.success(result.message);
        onSuccess?.("update");
        clearSelection();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Bulk update failed.";
        setBulkState((prev) => ({ ...prev, isProcessing: false, error: msg }));
        toast.error(msg);
      }
    },
    [selectedIds, onSuccess, clearSelection]
  );

  const executeBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setBulkState((prev) => ({ ...prev, isProcessing: true, progress: 0, error: null }));

    try {
      const result = await bulkDeleteLeads(
        { ids },
        (pct) => setBulkState((prev) => ({ ...prev, progress: pct }))
      );
      setUndoStack((prev) => [...prev, { type: "delete", ids }]);
      setBulkState((prev) => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        result,
        isOpen: false,
      }));
      toast.success(result.message);
      onSuccess?.("delete");
      clearSelection();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bulk delete failed.";
      setBulkState((prev) => ({ ...prev, isProcessing: false, error: msg }));
      toast.error(msg);
    }
  }, [selectedIds, onSuccess, clearSelection]);

  // Apply the configured assignment rule to each selected lead one-by-one,
  // reporting progress as we go. Uses executeAssignmentRule (POST /leads/:id/execute-assignment-rule)
  // which honours the active rule strategy (round_robin, load_balanced, etc.)
  // — NOT AI recommendation.
  const executeBulkApplyRule = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setBulkState((prev) => ({ ...prev, isProcessing: true, progress: 0, error: null }));

    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (let i = 0; i < ids.length; i++) {
      try {
        await executeAssignmentRule(ids[i]);
      } catch (err) {
        failed++;
        errors.push({
          id: ids[i],
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
      setBulkState((prev) => ({
        ...prev,
        progress: Math.round(((i + 1) / ids.length) * 100),
      }));
    }

    const processed = ids.length - failed;
    const result: BulkOperationResult = {
      success: processed > 0,
      processedCount: processed,
      failedCount: failed,
      message: failed === 0
        ? `Assignment rule applied to ${processed} lead${processed !== 1 ? "s" : ""}.`
        : `${processed} lead${processed !== 1 ? "s" : ""} assigned via rule, ${failed} failed.`,
      errors: errors.length ? errors : undefined,
    };

    setUndoStack((prev) => [...prev, { type: "apply-rule", ids }]);
    setBulkState((prev) => ({
      ...prev,
      isProcessing: false,
      progress: 100,
      result,
    }));
    if (result.success) {
      toast.success(result.message);
      onSuccess?.("apply-rule");
      clearSelection();
    } else {
      toast.error(result.message);
      setBulkState((prev) => ({ ...prev, error: result.message }));
    }
  }, [selectedIds, onSuccess, clearSelection]);

  return {
    // Selection state
    selectedIds,
    selectedCount: selectedIds.size,
    isSelected,
    toggleSelect,
    selectAll,
    clearSelection,
    // Bulk action dialog state
    bulkState,
    undoStack,
    // Handlers
    openBulkAction,
    closeBulkAction,
    executeBulkAssign,
    executeBulkUpdate,
    executeBulkDelete,
    executeBulkApplyRule,
  };
}
