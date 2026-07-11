"use client";
// components/ui/BulkActionsBar.tsx
// Generic reusable bulk-selection bar + dialogs for Contacts, Companies, Deals.
// Supports: assign (optional), update, delete.

import { useState, ReactNode } from "react";
import {
  UserCheck,
  Edit3,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  BulkOperationType,
  BulkOperationState,
} from "@/types/bulkOperations";

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-1.5 bg-blue-600 rounded-full transition-all duration-300"
        style={{ width: `${value}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

// ── Assign Dialog ─────────────────────────────────────────────────────────────

export function BulkAssignDialog({
  count,
  entityLabel,
  onConfirm,
  onCancel,
  isProcessing,
  progress,
  error,
}: {
  count: number;
  entityLabel: string;
  onConfirm: (assignedToId: string, name: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
  progress: number;
  error: string | null;
}) {
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneeName, setAssigneeName] = useState("");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <UserCheck size={18} className="text-blue-600" />
            Bulk Assign ({count} {entityLabel})
          </h2>
          <button onClick={onCancel} disabled={isProcessing} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100 text-xs text-red-600">
              <AlertTriangle size={13} className="shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Assignee Name <span className="text-gray-400">(optional — for display)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Morgan"
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Assignee ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Team member ID"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>
          {isProcessing && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Assigning {count} {entityLabel}…</span>
                <span>{progress}%</span>
              </div>
              <ProgressBar value={progress} />
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onCancel} disabled={isProcessing} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-white transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={() => assigneeId.trim() && onConfirm(assigneeId.trim(), assigneeName.trim())}
            disabled={!assigneeId.trim() || isProcessing}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing
              ? <><Loader2 size={14} className="animate-spin" />Assigning…</>
              : <><UserCheck size={14} />Assign {count} {entityLabel}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Update Dialog ─────────────────────────────────────────────────────────────

export function BulkUpdateDialog({
  count,
  entityLabel,
  fields,
  onConfirm,
  onCancel,
  isProcessing,
  progress,
  error,
}: {
  count: number;
  entityLabel: string;
  /** Render custom update fields inside the form */
  fields: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
  progress: number;
  error: string | null;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Edit3 size={18} className="text-violet-600" />
            Bulk Update ({count} {entityLabel})
          </h2>
          <button onClick={onCancel} disabled={isProcessing} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100 text-xs text-red-600">
              <AlertTriangle size={13} className="shrink-0" />
              {error}
            </div>
          )}
          <p className="text-xs text-gray-400">Leave a field empty to keep existing values.</p>
          {fields}
          {isProcessing && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Updating {count} {entityLabel}…</span>
                <span>{progress}%</span>
              </div>
              <ProgressBar value={progress} />
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onCancel} disabled={isProcessing} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-white transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing
              ? <><Loader2 size={14} className="animate-spin" />Updating…</>
              : <><Edit3 size={14} />Update {count} {entityLabel}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Dialog ─────────────────────────────────────────────────────────────

export function BulkDeleteDialog({
  count,
  entityLabel,
  onConfirm,
  onCancel,
  isProcessing,
  progress,
  error,
}: {
  count: number;
  entityLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
  progress: number;
  error: string | null;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Trash2 size={18} className="text-red-600" />
            Delete {count} {entityLabel}
          </h2>
          <button onClick={onCancel} disabled={isProcessing} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100 text-xs text-red-600">
              <AlertTriangle size={13} className="shrink-0" />
              {error}
            </div>
          )}
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">This action cannot be undone</p>
              <p className="text-xs text-red-600 mt-0.5">
                {count} {entityLabel} will be permanently deleted.
              </p>
            </div>
          </div>
          {isProcessing && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Deleting {count} {entityLabel}…</span>
                <span>{progress}%</span>
              </div>
              <ProgressBar value={progress} />
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onCancel} disabled={isProcessing} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-white transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing
              ? <><Loader2 size={14} className="animate-spin" />Deleting…</>
              : <><Trash2 size={14} />Delete {count} {entityLabel}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sticky action toolbar ─────────────────────────────────────────────────────

export function BulkActionsBar({
  selectedCount,
  entityLabel,
  showAssign,
  onAssign,
  onUpdate,
  onDelete,
  onClear,
  bulkState,
  onDismissResult,
}: {
  selectedCount: number;
  entityLabel: string;
  showAssign?: boolean;
  onAssign?: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  onClear: () => void;
  bulkState: BulkOperationState;
  onDismissResult: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <>
      {/* Success banner */}
      {bulkState.result?.success && !bulkState.isOpen && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 mb-2">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <span className="flex-1">{bulkState.result.message}</span>
          <button onClick={onDismissResult} className="text-emerald-400 hover:text-emerald-600 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="sticky top-0 z-30 flex items-center gap-2 flex-wrap px-4 py-2.5 bg-white border-b border-blue-100 shadow-sm rounded-t-xl">
        <span className="text-sm font-semibold text-blue-700">
          {selectedCount} {entityLabel} selected
        </span>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {showAssign && onAssign && (
            <button
              onClick={onAssign}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
            >
              <UserCheck size={13} />
              Assign
            </button>
          )}
          <button
            onClick={onUpdate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium hover:bg-violet-100 transition-colors"
          >
            <Edit3 size={13} />
            Update
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors"
          >
            <Trash2 size={13} />
            Delete
          </button>
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </>
  );
}

// ── Row checkbox ──────────────────────────────────────────────────────────────

export function BulkCheckbox({
  id,
  isSelected,
  onToggle,
  label,
}: {
  id: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
  label?: string;
}) {
  return (
    <input
      type="checkbox"
      checked={isSelected}
      onChange={() => onToggle(id)}
      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
      aria-label={label ?? `Select item ${id}`}
    />
  );
}

// ── Select-all row ────────────────────────────────────────────────────────────

export function BulkSelectAllRow({
  allIds,
  selectedCount,
  totalCount,
  isSelected,
  onSelectAll,
  onClear,
}: {
  allIds: string[];
  selectedCount: number;
  totalCount: number;
  isSelected: (id: string) => boolean;
  onSelectAll: (ids: string[]) => void;
  onClear: () => void;
}) {
  const allSelected = totalCount > 0 && allIds.every((id) => isSelected(id));
  const someSelected = selectedCount > 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
      <input
        type="checkbox"
        checked={allSelected}
        onChange={() => (allSelected ? onClear() : onSelectAll(allIds))}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        aria-label="Select all"
      />
      <span className="text-xs text-gray-500">
        {someSelected
          ? `${selectedCount} of ${totalCount} selected`
          : "Select all"}
      </span>
      {someSelected && (
        <button onClick={onClear} className="text-xs text-gray-400 hover:text-gray-600 underline ml-1">
          Clear
        </button>
      )}
    </div>
  );
}
