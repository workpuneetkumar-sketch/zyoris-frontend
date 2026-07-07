"use client";

// components/leads/BulkActionsToolbar.tsx
// Bulk Operations toolbar — Task 5

import { useState } from "react";
import {
  UserCheck,
  Edit3,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { useBulkOperations } from "@/hooks/useBulkOperations";
import { Lead } from "@/types/leads";
import { BulkOperationType } from "@/types/bulkOperations";

const LEAD_STATUSES = ["NEW", "WARM", "HOT", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CLOSED", "DEAD"];
const LEAD_SOURCES = ["Website", "Referral", "LinkedIn", "Cold Call"];

// ── Progress bar ─────────────────────────────────────────────────────────────

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

// ── Bulk Assign Dialog ────────────────────────────────────────────────────────

function BulkAssignDialog({
  count,
  onConfirm,
  onCancel,
  isProcessing,
  progress,
  error,
}: {
  count: number;
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
            Bulk Assign ({count} leads)
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
                <span>Assigning {count} leads…</span>
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
            {isProcessing ? <><Loader2 size={14} className="animate-spin" />Assigning…</> : <><UserCheck size={14} />Assign {count} Leads</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Update Dialog ────────────────────────────────────────────────────────

function BulkUpdateDialog({
  count,
  onConfirm,
  onCancel,
  isProcessing,
  progress,
  error,
}: {
  count: number;
  onConfirm: (updates: { status?: string; source?: string; tags?: string[] }) => void;
  onCancel: () => void;
  isProcessing: boolean;
  progress: number;
  error: string | null;
}) {
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  function handleConfirm() {
    const updates: { status?: string; source?: string; tags?: string[] } = {};
    if (status) updates.status = status;
    if (source) updates.source = source;
    if (tagsInput.trim()) updates.tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    onConfirm(updates);
  }

  const hasChanges = status !== "" || source !== "" || tagsInput.trim() !== "";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Edit3 size={18} className="text-violet-600" />
            Bulk Update ({count} leads)
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
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="">— keep existing —</option>
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="">— keep existing —</option>
              {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Tags <span className="text-gray-400">(comma separated)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. enterprise, priority, q3"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>
          {isProcessing && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Updating {count} leads…</span>
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
            onClick={handleConfirm}
            disabled={!hasChanges || isProcessing}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? <><Loader2 size={14} className="animate-spin" />Updating…</> : <><Edit3 size={14} />Update {count} Leads</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Delete Dialog ────────────────────────────────────────────────────────

function BulkDeleteDialog({
  count,
  onConfirm,
  onCancel,
  isProcessing,
  progress,
  error,
}: {
  count: number;
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
            Delete {count} Lead{count !== 1 ? "s" : ""}
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
                {count} lead{count !== 1 ? "s" : ""} will be permanently deleted from your CRM.
              </p>
            </div>
          </div>
          {isProcessing && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Deleting {count} leads…</span>
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
            {isProcessing ? <><Loader2 size={14} className="animate-spin" />Deleting…</> : <><Trash2 size={14} />Delete {count} Leads</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Success banner ────────────────────────────────────────────────────────────

function SuccessBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="text-emerald-400 hover:text-emerald-600 transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}

// ── Lead checkbox row ─────────────────────────────────────────────────────────

export function LeadCheckbox({
  leadId,
  isSelected,
  onToggle,
}: {
  leadId: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={isSelected}
      onChange={() => onToggle(leadId)}
      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
      aria-label={`Select lead ${leadId}`}
    />
  );
}

// ── Main toolbar ──────────────────────────────────────────────────────────────

export interface BulkActionsToolbarProps {
  allLeads: Lead[];
  onSuccess: (type: BulkOperationType) => void;
}

export function BulkActionsToolbar({ allLeads, onSuccess }: BulkActionsToolbarProps) {
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
  } = useBulkOperations(onSuccess);

  const allSelected = allLeads.length > 0 && allLeads.every((l) => isSelected(l.id));
  const someSelected = selectedCount > 0;

  return (
    <>
      {/* Select all row */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => (allSelected ? clearSelection() : selectAll(allLeads.map((l) => l.id)))}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          aria-label="Select all leads"
        />
        <span className="text-xs text-gray-500">
          {someSelected
            ? `${selectedCount} of ${allLeads.length} selected`
            : "Select all"}
        </span>
        {someSelected && (
          <button
            onClick={clearSelection}
            className="text-xs text-gray-400 hover:text-gray-600 underline ml-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Sticky toolbar */}
      {someSelected && (
        <div className="sticky top-0 z-30 flex items-center gap-2 flex-wrap px-4 py-2.5 bg-white border-b border-blue-100 shadow-sm">
          <span className="text-sm font-semibold text-blue-700">
            {selectedCount} lead{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <button
              onClick={() => openBulkAction("assign")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
              aria-label="Bulk assign"
            >
              <UserCheck size={13} />
              Assign
            </button>
            <button
              onClick={() => openBulkAction("update")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium hover:bg-violet-100 transition-colors"
              aria-label="Bulk update"
            >
              <Edit3 size={13} />
              Update
            </button>
            <button
              onClick={() => openBulkAction("delete")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors"
              aria-label="Bulk delete"
            >
              <Trash2 size={13} />
              Delete
            </button>
            <button
              onClick={clearSelection}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 transition-colors"
              aria-label="Clear selection"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Success banner */}
      {bulkState.result?.success && !bulkState.isOpen && (
        <div className="px-4 py-2">
          <SuccessBanner message={bulkState.result.message} onDismiss={closeBulkAction} />
        </div>
      )}

      {/* Dialogs */}
      {bulkState.isOpen && bulkState.type === "assign" && (
        <BulkAssignDialog
          count={selectedCount}
          onConfirm={(id, name) => executeBulkAssign(id, name)}
          onCancel={closeBulkAction}
          isProcessing={bulkState.isProcessing}
          progress={bulkState.progress}
          error={bulkState.error}
        />
      )}

      {bulkState.isOpen && bulkState.type === "update" && (
        <BulkUpdateDialog
          count={selectedCount}
          onConfirm={executeBulkUpdate}
          onCancel={closeBulkAction}
          isProcessing={bulkState.isProcessing}
          progress={bulkState.progress}
          error={bulkState.error}
        />
      )}

      {bulkState.isOpen && bulkState.type === "delete" && (
        <BulkDeleteDialog
          count={selectedCount}
          onConfirm={executeBulkDelete}
          onCancel={closeBulkAction}
          isProcessing={bulkState.isProcessing}
          progress={bulkState.progress}
          error={bulkState.error}
        />
      )}

      {/* Export selected IDs (for parent to use) */}
      <input
        type="hidden"
        id="bulk-selected-ids"
        value={Array.from(selectedIds).join(",")}
        readOnly
        aria-hidden="true"
      />
    </>
  );
}

// Export toggleSelect so parent rows can use it
export function useBulkContext(allLeads: Lead[], onSuccess: (type: BulkOperationType) => void) {
  return useBulkOperations(onSuccess);
}
