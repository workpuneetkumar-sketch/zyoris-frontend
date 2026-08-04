"use client";

// components/leads/BulkActionsToolbar.tsx
// Bulk Operations toolbar — Task 5

import { useState, useEffect, useRef } from "react";
import {
  UserCheck,
  Edit3,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Search,
} from "lucide-react";
import { getTeamMembers, TeamMember } from "@/lib/api/organizationsApi";
import { useBulkOperations } from "@/hooks/useBulkOperations";
import { Lead } from "@/types/leads";
import { BulkOperationType } from "@/types/bulkOperations";

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

function memberColor(name: string) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function MemberAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const color = memberColor(name);
  const dim = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return (
    <div className={`${dim} ${color} rounded-full font-bold flex items-center justify-center shrink-0`}>
      {initials}
    </div>
  );
}

// ── Team-member picker ────────────────────────────────────────────────────────

function TeamMemberPicker({
  value,
  onChange,
  disabled,
}: {
  value: TeamMember | null;
  onChange: (member: TeamMember | null) => void;
  disabled?: boolean;
}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    getTeamMembers()
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Focus the search input whenever the list opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.email.toLowerCase().includes(query.toLowerCase())
  );

  function select(member: TeamMember) {
    onChange(member);
    setQuery("");
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      {/* ── Trigger ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`
          w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-sm text-left
          transition-all duration-150 outline-none
          ${open
            ? "border-blue-500 ring-2 ring-blue-100 bg-white shadow-sm"
            : value
              ? "border-blue-200 bg-blue-50/40 hover:border-blue-300"
              : "border-gray-200 bg-white hover:border-gray-300"
          }
          ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        {value ? (
          <>
            <MemberAvatar name={value.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate text-sm leading-tight">{value.name}</p>
              <p className="text-[11px] text-gray-400 truncate leading-tight mt-0.5">{value.email}</p>
            </div>
            {value.role && (
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wide">
                {value.role}
              </span>
            )}
            <button
              type="button"
              onClick={clear}
              disabled={disabled}
              aria-label="Clear selection"
              className="ml-1 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
            >
              <X size={11} />
            </button>
          </>
        ) : (
          <>
            <Search size={14} className="text-gray-400 shrink-0" />
            <span className="flex-1 text-gray-400 text-sm">Search team member…</span>
            <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[200] bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          {/* Search bar */}
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Search size={13} className="text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search by name or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600">
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <ul role="listbox" className="max-h-52 overflow-y-auto pb-2 px-1.5">
            {loading ? (
              <li className="flex items-center justify-center gap-2 py-6 text-xs text-gray-400">
                <Loader2 size={13} className="animate-spin text-blue-500" />
                <span>Loading team members…</span>
              </li>
            ) : filtered.length === 0 ? (
              <li className="py-6 text-center text-sm text-gray-400">
                <p>No members match "{query}"</p>
              </li>
            ) : (
              filtered.map((m) => {
                const isActive = value?.id === m.id;
                return (
                  <li
                    key={m.id}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => select(m)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-100 my-0.5
                      ${isActive
                        ? "bg-blue-50 border border-blue-100"
                        : "hover:bg-gray-50 border border-transparent"
                      }
                    `}
                  >
                    <MemberAvatar name={m.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate leading-tight ${isActive ? "text-blue-700" : "text-gray-800"}`}>
                        {m.name}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate leading-tight mt-0.5">{m.email}</p>
                    </div>
                    {m.role && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wide ${isActive ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                        {m.role}
                      </span>
                    )}
                    {isActive && (
                      <CheckCircle2 size={14} className="text-blue-500 shrink-0" />
                    )}
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer count */}
          {!loading && filtered.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/60">
              <p className="text-[11px] text-gray-400">{filtered.length} member{filtered.length !== 1 ? "s" : ""} available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [selected, setSelected] = useState<TeamMember | null>(null);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <UserCheck size={16} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-tight">Bulk Assign</h2>
              <p className="text-[11px] text-gray-400 leading-tight">{count} leads selected</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pt-5 pb-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 p-3 bg-red-50 rounded-xl border border-red-100 text-xs text-red-600">
              <AlertTriangle size={13} className="shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              Assign to
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <TeamMemberPicker
              value={selected}
              onChange={setSelected}
              disabled={isProcessing}
            />
          </div>

          {/* Selected member summary card */}
          {selected && !isProcessing && (
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
              <MemberAvatar name={selected.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-800 truncate">{selected.name}</p>
                <p className="text-[11px] text-blue-500 truncate">{selected.email}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">{count} leads</p>
                <p className="text-[10px] text-blue-400">will be assigned</p>
              </div>
            </div>
          )}

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin text-blue-500" />
                  Assigning {count} leads…
                </span>
                <span className="font-semibold text-blue-600">{progress}%</span>
              </div>
              <ProgressBar value={progress} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onConfirm(selected.id, selected.name)}
            disabled={!selected || isProcessing}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-40 flex items-center gap-2 shadow-sm shadow-blue-200"
          >
            {isProcessing
              ? <><Loader2 size={14} className="animate-spin" />Assigning…</>
              : <><UserCheck size={14} />Assign {count} Leads</>
            }
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
    selectedIds: Set<string>;
    selectedCount: number;
    isSelected: (id: string) => boolean;
    toggleSelect: (id: string) => void;
    selectAll: (ids: string[]) => void;
    clearSelection: () => void;
    bulkState: any;
    openBulkAction: (type: BulkOperationType) => void;
    closeBulkAction: () => void;
    executeBulkAssign: (assignedToId: string, assignedToName?: string) => Promise<void>;
    executeBulkUpdate: (updates: { status?: string; source?: string; tags?: string[]; owner?: string }) => Promise<void>;
    executeBulkDelete: () => Promise<void>;
}

export function BulkActionsToolbar({
    allLeads,
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
}: BulkActionsToolbarProps) {
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
