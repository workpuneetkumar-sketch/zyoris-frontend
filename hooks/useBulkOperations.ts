// hooks/useBulkOperations.ts
"use client";

import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import {
  bulkAssignLeads,
  bulkUpdateLeads,
  bulkDeleteLeads,
} from "@/lib/api/bulkOperationsApi";
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
          { leadIds: ids, assignedToId, assignedToName },
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
    async (updates: {
      status?: string;
      source?: string;
      tags?: string[];
      owner?: string;
    }) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;

      setBulkState((prev) => ({ ...prev, isProcessing: true, progress: 0, error: null }));

      try {
        const result = await bulkUpdateLeads(
          { leadIds: ids, updates },
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
        { leadIds: ids },
        (pct) => setBulkState((prev) => ({ ...prev, progress: pct }))
      );
      setUndoStack((prev) => [...prev, { type: "delete", ids }]);
      setBulkState((prev) => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        result,
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
  };
}
