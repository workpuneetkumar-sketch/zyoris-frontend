// hooks/useBulkSelection.ts
// Generic selection state for any bulk-operations table.
// Used by Contacts, Companies, Deals pages in addition to Leads.
"use client";

import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import {
  BulkOperationType,
  BulkOperationState,
  BulkOperationResult,
  INITIAL_BULK_STATE,
} from "@/types/bulkOperations";

export function useBulkSelection(onSuccess?: (type: BulkOperationType) => void) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkState, setBulkState] = useState<BulkOperationState>(INITIAL_BULK_STATE);

  // ── Selection ───────────────────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
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

  // ── Dialog ──────────────────────────────────────────────────────────────────
  const openBulkAction = useCallback((type: BulkOperationType) => {
    setBulkState({ type, isOpen: true, isProcessing: false, progress: 0, result: null, error: null });
  }, []);

  const closeBulkAction = useCallback(() => {
    setBulkState(INITIAL_BULK_STATE);
  }, []);

  // ── Execute any bulk API call ───────────────────────────────────────────────
  const executeBulkCall = useCallback(
    async (
      type: BulkOperationType,
      apiFn: (onProgress: (pct: number) => void) => Promise<BulkOperationResult>
    ) => {
      setBulkState((prev) => ({ ...prev, isProcessing: true, progress: 0, error: null }));
      try {
        const result = await apiFn((pct) =>
          setBulkState((prev) => ({ ...prev, progress: pct }))
        );
        setBulkState((prev) => ({ ...prev, isProcessing: false, progress: 100, result, isOpen: false }));
        toast.success(result.message);
        onSuccess?.(type);
        clearSelection();
      } catch (err) {
        const msg = err instanceof Error ? err.message : `Bulk ${type} failed.`;
        setBulkState((prev) => ({ ...prev, isProcessing: false, error: msg }));
        toast.error(msg);
      }
    },
    [onSuccess, clearSelection]
  );

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isSelected,
    toggleSelect,
    selectAll,
    clearSelection,
    bulkState,
    openBulkAction,
    closeBulkAction,
    executeBulkCall,
  };
}
