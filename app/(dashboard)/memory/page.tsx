"use client";

/**
 * app/(dashboard)/memory/page.tsx
 * ─────────────────────────────────────────────────────────────
 * MemorySettings — view, create/update, delete, and set
 * retention policies for scoped agent memories.
 *
 * Sensitive actions (delete, retention update) always show
 * a confirmation modal and display the backend's actual
 * response — never assumed success.
 *
 * All colors via CSS variable tokens — zero hardcoded hex/rgb.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  getMemories,
  createMemory,
  deleteMemory,
  updateRetention,
} from "@/lib/api/agentMemoryApi";
import { toast } from "react-toastify";
import {
  Brain,
  Search,
  RefreshCw,
  AlertCircle,
  PlusCircle,
  Trash2,
  X,
  Save,
  Clock,
  ChevronDown,
  ChevronUp,
  Settings,
  Shield,
} from "lucide-react";
import { MemoryScopeBadge, ScopeSelector } from "@/components/memory/MemoryScopeBadge";
import type {
  AgentMemory,
  AgentMemoryListFilters,
  CreateMemoryPayload,
  UpdateRetentionPayload,
  DeleteMemoryResult,
  RetentionUpdateResult,
  MemoryScope,
} from "@/types/agentMemory";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const diff = new Date(iso).getTime() - Date.now();
    const d = Math.floor(Math.abs(diff) / 86_400_000);
    return diff > 0 ? `in ${d}d` : `${d}d ago`;
  } catch { return "—"; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[color:var(--color-border-light)]">
      {[20, 25, 30, 15, 15, 10].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div
            className="h-4 bg-[color:var(--color-background-secondary)] rounded-lg animate-pulse"
            style={{ width: `${w}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <tr>
      <td colSpan={7}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-[color:var(--color-background-secondary)] rounded-2xl flex items-center justify-center mb-4">
            <Brain size={28} className="text-[color:var(--color-text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[color:var(--color-text)] mb-1">
            {hasFilters ? "No memories match your filters" : "No memories stored yet"}
          </p>
          <p className="text-xs text-[color:var(--color-text-muted)] max-w-xs">
            {hasFilters
              ? "Try clearing the scope or category filter."
              : "Create the first memory entry using the form above."}
          </p>
          {hasFilters && (
            <button onClick={onClear} className="mt-4 text-xs font-semibold text-[color:var(--color-primary)] hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
      <AlertCircle size={48} className="text-[color:var(--color-error)] mb-4" />
      <h3 className="text-lg font-bold text-[color:var(--color-text)] mb-2">Failed to Load Memories</h3>
      <p className="text-sm text-[color:var(--color-text-secondary)] max-w-md mb-6">{message}</p>
      <button onClick={onRetry} className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl transition-all">
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );
}

// ─── Delete confirmation modal ────────────────────────────────────────────────

interface DeleteModalProps {
  memory: AgentMemory;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  result: DeleteMemoryResult | null;
}

function DeleteModal({ memory, onConfirm, onCancel, submitting, result }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-xl w-full max-w-md p-6 space-y-4">
        {result ? (
          // ── Result view ──────────────────────────────────────────────────
          <>
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${
              result.success
                ? "bg-[color:var(--color-success-light)] border-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)]"
                : "bg-[color:var(--color-error-light)] border-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)]"
            }`}>
              {result.success
                ? <Shield size={18} className="shrink-0" />
                : <AlertCircle size={18} className="shrink-0" />}
              <div>
                <p className="text-sm font-bold">{result.success ? "Memory deleted" : "Deletion failed"}</p>
                {result.message && <p className="text-xs mt-0.5 opacity-80">{result.message}</p>}
              </div>
            </div>
            <button onClick={onCancel} className="w-full px-4 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all">
              Close
            </button>
          </>
        ) : (
          // ── Confirm view ─────────────────────────────────────────────────
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[color:var(--color-error-light)] flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-[color:var(--color-error)]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[color:var(--color-text)]">Delete Memory</h3>
                <p className="text-xs text-[color:var(--color-text-muted)] mt-0.5">This action is auditable but not reversible from the UI.</p>
              </div>
            </div>
            <div className="bg-[color:var(--color-background-secondary)] rounded-xl p-4 space-y-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-[color:var(--color-text-muted)]">Key</span>
                <span className="font-mono font-semibold text-[color:var(--color-text)]">{memory.memoryKey}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[color:var(--color-text-muted)]">Scope</span>
                <MemoryScopeBadge scope={memory.scope} variant="full" />
              </div>
              {memory.memoryValue && (
                <div className="flex justify-between gap-2">
                  <span className="text-[color:var(--color-text-muted)]">Value</span>
                  <span className="text-[color:var(--color-text-secondary)] truncate max-w-[180px]">{memory.memoryValue}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onConfirm}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[color:var(--color-error)] hover:opacity-90 disabled:opacity-60 text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl transition-all"
              >
                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {submitting ? "Deleting…" : "Delete"}
              </button>
              <button onClick={onCancel} disabled={submitting} className="flex-1 px-4 py-2.5 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Retention update modal ───────────────────────────────────────────────────

interface RetentionModalProps {
  onConfirm: (payload: UpdateRetentionPayload) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  result: RetentionUpdateResult | null;
}

function RetentionModal({ onConfirm, onCancel, submitting, result }: RetentionModalProps) {
  const [scope, setScope]         = useState<MemoryScope>("ORGANIZATION");
  const [targetId, setTargetId]   = useState("");
  const [days, setDays]           = useState(30);
  const [formError, setFormError] = useState("");

  const scopeNeedsId = scope !== "ORGANIZATION";

  const handleSubmit = async () => {
    if (scopeNeedsId && !targetId.trim()) {
      setFormError(`Target ID is required for ${scope} scope.`);
      return;
    }
    if (days < 0) { setFormError("Retention days must be 0 or greater."); return; }
    setFormError("");
    await onConfirm({ scope, targetId: targetId.trim() || "org", retentionDays: days });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-xl w-full max-w-md p-6 space-y-4">
        {result ? (
          <>
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${
              result.success
                ? "bg-[color:var(--color-success-light)] border-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)]"
                : "bg-[color:var(--color-error-light)] border-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)]"
            }`}>
              <Settings size={18} className="shrink-0" />
              <div>
                <p className="text-sm font-bold">{result.success ? "Retention updated" : "Update failed"}</p>
                {result.message && <p className="text-xs mt-0.5 opacity-80">{result.message}</p>}
                {result.affectedCount != null && (
                  <p className="text-xs mt-0.5 opacity-80">{result.affectedCount} memor{result.affectedCount !== 1 ? "ies" : "y"} affected.</p>
                )}
              </div>
            </div>
            <button onClick={onCancel} className="w-full px-4 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all">
              Close
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[color:var(--color-warning-light)] flex items-center justify-center shrink-0">
                <Clock size={18} className="text-[color:var(--color-warning-foreground)]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[color:var(--color-text)]">Update Retention Policy</h3>
                <p className="text-xs text-[color:var(--color-text-muted)] mt-0.5">Applies to all memories matching the selected scope and target.</p>
              </div>
            </div>

            {/* Scope selector */}
            <div>
              <p className="text-xs font-semibold text-[color:var(--color-text-secondary)] mb-2">Scope</p>
              <ScopeSelector value={scope} onChange={(v) => { setScope(v as MemoryScope); setTargetId(""); }} includeAll={false} />
            </div>

            {/* Target ID */}
            {scopeNeedsId && (
              <div>
                <label className="block text-xs font-semibold text-[color:var(--color-text-secondary)] mb-1.5">
                  {scope === "USER" ? "User ID" : scope === "CUSTOMER" ? "Customer ID" : "Agent ID"}
                  <span className="ml-1 text-[color:var(--color-error)] text-[10px]">(required)</span>
                </label>
                <input
                  type="text"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none transition-all"
                  placeholder={`Enter ${scope.toLowerCase()} ID…`}
                />
              </div>
            )}

            {/* Days */}
            <div>
              <label className="block text-xs font-semibold text-[color:var(--color-text-secondary)] mb-1.5">
                Retention Days <span className="font-normal text-[color:var(--color-text-muted)]">(0 = indefinite)</span>
              </label>
              <input
                type="number" min={0}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full text-sm px-3 py-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none transition-all"
              />
            </div>

            {formError && (
              <p className="text-xs font-medium text-[color:var(--color-error)] flex items-center gap-1">
                <AlertCircle size={12} /> {formError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[color:var(--color-warning-foreground)] hover:opacity-90 disabled:opacity-60 text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl transition-all"
              >
                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Clock size={14} />}
                {submitting ? "Applying…" : "Apply Policy"}
              </button>
              <button onClick={onCancel} disabled={submitting} className="flex-1 px-4 py-2.5 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Create / update form ─────────────────────────────────────────────────────

interface MemoryFormProps {
  onSaved: () => void;
}

function MemoryForm({ onSaved }: MemoryFormProps) {
  const [open, setOpen]               = useState(false);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);

  const [scope, setScope]             = useState<MemoryScope>("ORGANIZATION");
  const [memoryKey, setMemoryKey]     = useState("");
  const [memoryValue, setMemoryValue] = useState("");
  const [category, setCategory]       = useState("");
  const [retentionDays, setRetention] = useState<number | "">("");
  const [scopeId, setScopeId]         = useState("");

  const scopeNeedsId = scope !== "ORGANIZATION";
  const scopeIdLabel = scope === "USER" ? "User ID" : scope === "CUSTOMER" ? "Customer ID" : "Agent ID";

  const reset = () => {
    setScope("ORGANIZATION"); setMemoryKey(""); setMemoryValue("");
    setCategory(""); setRetention(""); setScopeId(""); setFormError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoryKey.trim()) { setFormError("Memory key is required."); return; }
    if (!memoryValue.trim()) { setFormError("Memory value is required."); return; }
    if (scopeNeedsId && !scopeId.trim()) { setFormError(`${scopeIdLabel} is required for ${scope} scope.`); return; }

    const payload: CreateMemoryPayload = {
      scope,
      memoryKey: memoryKey.trim(),
      memoryValue: memoryValue.trim(),
      category: category.trim() || undefined,
      retentionDays: retentionDays !== "" ? Number(retentionDays) : null,
      userId:     scope === "USER"     ? scopeId.trim() : undefined,
      customerId: scope === "CUSTOMER" ? scopeId.trim() : undefined,
      agentId:    scope === "AGENT"    ? scopeId.trim() : undefined,
    };

    try {
      setSaving(true);
      setFormError(null);
      await createMemory(payload);
      toast.success("Memory saved.");
      reset();
      setOpen(false);
      onSaved();
    } catch (err: any) {
      setFormError(err.message ?? "Failed to save memory.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[color:var(--color-surface-hover)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <PlusCircle size={15} className="text-[color:var(--color-primary)]" />
          <span className="text-sm font-bold text-[color:var(--color-text)]">Create / Update Memory</span>
        </div>
        {open ? <ChevronUp size={15} className="text-[color:var(--color-text-muted)]" /> : <ChevronDown size={15} className="text-[color:var(--color-text-muted)]" />}
      </button>

      {open && (
        <form onSubmit={handleSave} className="px-5 pb-5 space-y-4 border-t border-[color:var(--color-border)]">
          <div className="pt-4">
            <p className="text-xs font-semibold text-[color:var(--color-text-secondary)] mb-2">Scope</p>
            <ScopeSelector value={scope} onChange={(v) => { setScope(v as MemoryScope || "ORGANIZATION"); setScopeId(""); }} includeAll={false} />
          </div>

          {scopeNeedsId && (
            <div>
              <label className="block text-xs font-semibold text-[color:var(--color-text-secondary)] mb-1.5">
                {scopeIdLabel} <span className="text-[color:var(--color-error)] text-[10px]">(required)</span>
              </label>
              <input
                type="text" value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none transition-all"
                placeholder={`Enter ${scope.toLowerCase()} ID…`}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[color:var(--color-text-secondary)] mb-1.5">
                Memory Key <span className="text-[color:var(--color-error)] text-[10px]">*</span>
              </label>
              <input
                type="text" value={memoryKey}
                onChange={(e) => setMemoryKey(e.target.value)}
                className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none transition-all"
                placeholder="e.g. preferred_language"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--color-text-secondary)] mb-1.5">Category</label>
              <input
                type="text" value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none transition-all"
                placeholder="e.g. preference, context, fact"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[color:var(--color-text-secondary)] mb-1.5">
              Memory Value <span className="text-[color:var(--color-error)] text-[10px]">*</span>
            </label>
            <textarea
              rows={2} value={memoryValue}
              onChange={(e) => setMemoryValue(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none transition-all resize-none"
              placeholder="The value to store…"
            />
          </div>

          <div className="w-40">
            <label className="block text-xs font-semibold text-[color:var(--color-text-secondary)] mb-1.5">
              Retention Days <span className="font-normal text-[color:var(--color-text-muted)]">(blank = indefinite)</span>
            </label>
            <input
              type="number" min={0} value={retentionDays}
              onChange={(e) => setRetention(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full text-sm px-3 py-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none transition-all"
              placeholder="30"
            />
          </div>

          {formError && (
            <p className="text-xs font-medium text-[color:var(--color-error)] flex items-center gap-1.5">
              <AlertCircle size={12} /> {formError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl transition-all"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving…" : "Save Memory"}
            </button>
            <button
              type="button" onClick={() => { reset(); setOpen(false); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Memory row ────────────────────────────────────────────────────────────────

function MemoryRow({
  memory,
  onDelete,
}: {
  memory: AgentMemory;
  onDelete: (m: AgentMemory) => void;
}) {
  const scopeId =
    memory.userId ?? memory.customerId ?? memory.agentId ?? "—";

  return (
    <tr className="border-b border-[color:var(--color-border-light)] hover:bg-[color:var(--color-surface-hover)] transition-colors group">
      {/* Scope */}
      <td className="px-5 py-4 whitespace-nowrap">
        <MemoryScopeBadge scope={memory.scope} variant="full" />
      </td>

      {/* Key */}
      <td className="px-5 py-4 whitespace-nowrap">
        <span className="text-xs font-mono font-semibold text-[color:var(--color-text)]">{memory.memoryKey}</span>
      </td>

      {/* Value */}
      <td className="px-5 py-4 max-w-[220px]">
        <p className="text-xs text-[color:var(--color-text-secondary)] truncate">{memory.memoryValue}</p>
      </td>

      {/* Category */}
      <td className="px-5 py-4 whitespace-nowrap">
        {memory.category ? (
          <span className="text-[11px] px-2 py-0.5 rounded-lg bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border)] font-medium">
            {memory.category}
          </span>
        ) : (
          <span className="text-xs text-[color:var(--color-text-muted)]">—</span>
        )}
      </td>

      {/* Scope target */}
      <td className="px-5 py-4 whitespace-nowrap">
        <span className="text-[11px] font-mono text-[color:var(--color-text-muted)]">{scopeId}</span>
      </td>

      {/* Retention / expiry */}
      <td className="px-5 py-4 whitespace-nowrap">
        {memory.retentionDays != null ? (
          <div>
            <p className="text-xs text-[color:var(--color-text-secondary)] font-medium">{memory.retentionDays}d</p>
            {memory.expiresAt && (
              <p className="text-[10px] text-[color:var(--color-text-muted)] mt-0.5">
                {relativeDate(memory.expiresAt)}
              </p>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-[color:var(--color-success-foreground)] font-semibold">Indefinite</span>
        )}
      </td>

      {/* Delete action */}
      <td className="px-5 py-4 text-right whitespace-nowrap">
        <button
          onClick={() => onDelete(memory)}
          className="p-1.5 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-error)] hover:bg-[color:var(--color-error-light)] rounded-lg transition-all opacity-0 group-hover:opacity-100"
          title="Delete memory"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MemorySettingsPage() {
  const { user, token, isInitializing } = useAuth();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const pathnameRaw  = usePathname();
  const pathname     = pathnameRaw ?? "/memory";

  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Filters
  const [scope,    setScope]    = useState<MemoryScope | "">((searchParams?.get("scope") as MemoryScope) ?? "");
  const [category, setCategory] = useState(searchParams?.get("category") ?? "");
  const [scopeId,  setScopeId]  = useState(searchParams?.get("scopeId") ?? "");

  // Modals
  const [deleteTarget,    setDeleteTarget]    = useState<AgentMemory | null>(null);
  const [deleting,        setDeleting]        = useState(false);
  const [deleteResult,    setDeleteResult]    = useState<DeleteMemoryResult | null>(null);
  const [showRetention,   setShowRetention]   = useState(false);
  const [retentionBusy,   setRetentionBusy]   = useState(false);
  const [retentionResult, setRetentionResult] = useState<RetentionUpdateResult | null>(null);

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMount = useRef(true);

  // Auth guard
  useEffect(() => {
    if (isInitializing) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ADMIN") router.replace("/dashboard");
  }, [user, isInitializing, router]);

  const buildFilters = useCallback((): AgentMemoryListFilters => {
    const f: AgentMemoryListFilters = {};
    if (scope)    f.scope    = scope as MemoryScope;
    if (category) f.category = category;
    if (scopeId && scope === "USER")     f.userId     = scopeId;
    if (scopeId && scope === "CUSTOMER") f.customerId = scopeId;
    if (scopeId && scope === "AGENT")    f.agentId    = scopeId;
    return f;
  }, [scope, category, scopeId]);

  const syncUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (scope)    p.set("scope",    scope);
    if (category) p.set("category", category);
    if (scopeId)  p.set("scopeId",  scopeId);
    const qs = p.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [scope, category, scopeId, pathname, router]);

  const fetchMemories = useCallback(async (filters: AgentMemoryListFilters) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getMemories(filters);
      setMemories(res.memories);
      setTotal(res.total ?? res.memories.length);
    } catch (err: any) {
      const msg = err.message ?? "Failed to load memories.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    if (!token) return;
    fetchMemories(buildFilters());
    isFirstMount.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Debounced category / scopeId re-fetch
  useEffect(() => {
    if (isFirstMount.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      syncUrl();
      fetchMemories(buildFilters());
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, scopeId]);

  // Immediate scope switch
  const switchScope = (s: MemoryScope | "") => {
    setScope(s);
    setScopeId("");
    const f: AgentMemoryListFilters = {};
    if (s)        f.scope    = s as MemoryScope;
    if (category) f.category = category;
    fetchMemories(f);
  };

  // Delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteMemory(deleteTarget.id);
      setDeleteResult(result);
      if (result.success) {
        setMemories((prev) => prev.filter((m) => m.id !== deleteTarget.id));
        setTotal((t) => Math.max(0, t - 1));
      }
    } catch (err: any) {
      setDeleteResult({ success: false, deletedId: deleteTarget.id, message: err.message });
    } finally {
      setDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteResult(null);
  };

  // Retention
  const handleRetentionConfirm = async (payload: UpdateRetentionPayload) => {
    setRetentionBusy(true);
    try {
      const result = await updateRetention(payload);
      setRetentionResult(result);
      if (result.success) fetchMemories(buildFilters());
    } catch (err: any) {
      setRetentionResult({ success: false, scope: payload.scope, targetId: payload.targetId, retentionDays: payload.retentionDays, message: err.message });
    } finally {
      setRetentionBusy(false);
    }
  };

  const closeRetentionModal = () => {
    setShowRetention(false);
    setRetentionResult(null);
  };

  const clearAll = () => {
    setScope(""); setCategory(""); setScopeId("");
    router.replace(pathname, { scroll: false });
    fetchMemories({});
  };

  const hasFilters = !!(scope || category || scopeId);

  if (!user) return null;
  if (error && !loading && memories.length === 0) {
    return <ErrorState message={error} onRetry={() => fetchMemories(buildFilters())} />;
  }

  return (
    <>
      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal
          memory={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={closeDeleteModal}
          submitting={deleting}
          result={deleteResult}
        />
      )}

      {/* Retention modal */}
      {showRetention && (
        <RetentionModal
          onConfirm={handleRetentionConfirm}
          onCancel={closeRetentionModal}
          submitting={retentionBusy}
          result={retentionResult}
        />
      )}

      <div className="space-y-6 max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-9 h-9 bg-[color:var(--color-cat-comm-bg)] border border-[color:var(--color-cat-comm-bg)] rounded-xl flex items-center justify-center shrink-0">
                <Brain size={18} className="text-[color:var(--color-cat-comm)]" />
              </div>
              <h1 className="text-2xl font-bold text-[color:var(--color-text)] tracking-tight">Memory Settings</h1>
              {!loading && (
                <span className="text-[11px] font-bold text-[color:var(--color-text-muted)] bg-[color:var(--color-background-secondary)] px-2 py-0.5 rounded-full border border-[color:var(--color-border)]">
                  {total} entr{total !== 1 ? "ies" : "y"}
                </span>
              )}
            </div>
            <p className="text-sm text-[color:var(--color-text-secondary)] mt-1 ml-0.5">
              Scoped memory entries for agents, users, customers, and the organization.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => { setShowRetention(true); setRetentionResult(null); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-warning-light)] border border-[color:var(--color-warning-light)] hover:opacity-80 text-[color:var(--color-warning-foreground)] text-sm font-semibold rounded-xl transition-all"
            >
              <Clock size={14} /> Retention Policy
            </button>
            <button
              onClick={() => fetchMemories(buildFilters())}
              className="p-2 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-hover)] rounded-xl border border-[color:var(--color-border)] transition-all"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Create/update form */}
        <MemoryForm onSaved={() => fetchMemories(buildFilters())} />

        {/* Scope filter + category/ID search */}
        <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm p-4 space-y-3">
          <ScopeSelector value={scope} onChange={switchScope} includeAll />

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)] pointer-events-none" />
              <input
                type="text" placeholder="Filter by category…"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs font-medium rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none transition-all"
              />
            </div>
            {scope && scope !== "ORGANIZATION" && (
              <div className="relative flex-1 min-w-[160px] max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)] pointer-events-none" />
                <input
                  type="text"
                  placeholder={`Filter by ${scope === "USER" ? "user" : scope === "CUSTOMER" ? "customer" : "agent"} ID…`}
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-xs font-medium rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none transition-all"
                />
              </div>
            )}
            {hasFilters && (
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)] px-2.5 py-1.5 rounded-xl border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] transition-all"
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-active)]">
                  {["Scope", "Key", "Value", "Category", "Target ID", "Retention", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-[color:var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  : memories.length === 0
                    ? <EmptyState hasFilters={hasFilters} onClear={clearAll} />
                    : memories.map((m) => (
                        <MemoryRow key={m.id} memory={m} onDelete={setDeleteTarget} />
                      ))
                }
              </tbody>
            </table>
          </div>
          {!loading && memories.length > 0 && (
            <div className="px-5 py-3 border-t border-[color:var(--color-border-light)] bg-[color:var(--color-surface-active)]">
              <p className="text-xs text-[color:var(--color-text-muted)]">
                Showing <span className="font-semibold text-[color:var(--color-text-secondary)]">{memories.length}</span>
                {total > memories.length && <> of <span className="font-semibold text-[color:var(--color-text-secondary)]">{total}</span></>} entr{memories.length !== 1 ? "ies" : "y"}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
