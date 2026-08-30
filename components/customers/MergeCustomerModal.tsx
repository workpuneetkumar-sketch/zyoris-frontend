"use client";

import { useState } from "react";
import {
  X,
  Loader2 as SpinnerIcon,
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  ChevronDown,
} from "lucide-react";
import { MergeCustomerPayload, MergeAuditRecord, CanonicalCustomer } from "@/types/customers";
import { mergeCustomers, fetchMergeAudit } from "@/lib/api/customersApi";
import { toast } from "react-toastify";

const INPUT_CLASS = `w-full h-10 rounded-lg border px-3 text-sm outline-none transition-all
  bg-[var(--color-surface)]
  text-[var(--color-text)]
  border-[var(--color-border)]
  placeholder:text-[var(--color-text-muted)]
  focus:border-[var(--color-primary-light)]
  focus:ring-2 focus:ring-[var(--color-primary)]/25`;

export interface MergeCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (survivorId: string) => void;
  preselectedSurvivorId?: string;
  preselectedSurvivorName?: string;
}

type ModalView = "merge" | "audit";

export function MergeCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedSurvivorId = "",
  preselectedSurvivorName = "",
}: MergeCustomerModalProps) {
  const [view, setView] = useState<ModalView>("merge");
  const [survivorId, setSurvivorId] = useState(preselectedSurvivorId);
  const [loserIds, setLoserIds] = useState<string[]>([""]);
  const [fieldOverrides, setFieldOverrides] = useState("");
  const [loading, setLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [auditRecords, setAuditRecords] = useState<MergeAuditRecord[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditCustomerId, setAuditCustomerId] = useState(preselectedSurvivorId);
  const [mergeResult, setMergeResult] = useState<{ survivorId: string; message?: string } | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const addLoser = () => setLoserIds((ids) => [...ids, ""]);
  const removeLoser = (idx: number) => {
    setLoserIds((ids) => ids.filter((_, i) => i !== idx));
    if (fieldErrors.loserIds) setFieldErrors((p) => ({ ...p, loserIds: "" }));
  };
  const setLoser = (idx: number, val: string) => {
    setLoserIds((ids) => ids.map((v, i) => (i === idx ? val : v)));
    if (fieldErrors.loserIds) setFieldErrors((p) => ({ ...p, loserIds: "" }));
    if (errorMsg) setErrorMsg(null);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const sId = survivorId.trim();
    if (!sId) {
      errs.survivorId = "Survivor customer ID is required.";
    }

    const validLosers = loserIds.map((id) => id.trim()).filter(Boolean);
    if (validLosers.length === 0) {
      errs.loserIds = "At least one loser customer ID is required.";
    } else if (sId && validLosers.includes(sId)) {
      errs.loserIds = "Self-merge is invalid: a loser ID cannot be the same as the survivor ID.";
    }

    if (fieldOverrides.trim()) {
      try {
        JSON.parse(fieldOverrides);
      } catch {
        errs.fieldOverrides = "Field overrides must be valid JSON.";
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const validLosers = loserIds.map((id) => id.trim()).filter(Boolean);
    let overrides: Record<string, unknown> = {};
    if (fieldOverrides.trim()) {
      overrides = JSON.parse(fieldOverrides);
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const payload: MergeCustomerPayload = {
        loserIds: validLosers,
        fieldOverrides: Object.keys(overrides).length > 0 ? overrides : undefined,
      };
      const result = await mergeCustomers(survivorId.trim(), payload);
      setMergeResult({ survivorId: result.survivorId, message: result.message });
      toast.success(result.message ?? "Customers merged successfully!");
      onSuccess?.(result.survivorId);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Merge failed.");
      toast.error(err?.message ?? "Merge failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAudit = async () => {
    const id = auditCustomerId.trim();
    if (!id) {
      setAuditError("Enter a customer ID to fetch merge audit.");
      return;
    }
    setAuditLoading(true);
    setAuditError(null);
    try {
      const records = await fetchMergeAudit(id);
      setAuditRecords(records);
    } catch (err: any) {
      setAuditError(err?.message ?? "Failed to fetch audit records.");
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--color-border-light)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-rose-500/20 to-pink-500/20">
              <GitMerge size={18} className="text-rose-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)]">Merge Customers</h2>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Merge duplicate records into a single surviving customer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sub-tabs */}
        <div
          className="flex border-b shrink-0"
          style={{ borderColor: "var(--color-border-light)", background: "var(--color-background-secondary)" }}
        >
          {(["merge", "audit"] as ModalView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors capitalize ${
                view === v
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              }`}
            >
              {v === "audit" ? "Merge Audit" : "Merge Records"}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* ── Merge tab ── */}
          {view === "merge" && (
            <>
              {mergeResult ? (
                <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-5 text-center">
                  <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-3" />
                  <p className="text-sm font-bold text-[var(--color-text)] mb-1">Merge Complete</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{mergeResult.message}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)] font-mono mt-1">
                    Survivor: {mergeResult.survivorId}
                  </p>
                  <button
                    onClick={() => { setMergeResult(null); setSurvivorId(""); setLoserIds([""]); setFieldOverrides(""); }}
                    className="mt-4 h-9 px-5 rounded-lg text-white text-sm font-semibold"
                    style={{ background: "var(--color-primary)" }}
                  >
                    New Merge
                  </button>
                </div>
              ) : (
                <form id="merge-form" onSubmit={handleMerge} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">
                      Survivor Customer ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={INPUT_CLASS + (fieldErrors.survivorId ? " border-[var(--color-error)] focus:ring-[var(--color-error)]/25" : "")}
                      placeholder="UUID of the record to keep"
                      value={survivorId}
                      onChange={(e) => {
                        setSurvivorId(e.target.value);
                        if (fieldErrors.survivorId) setFieldErrors((p) => ({ ...p, survivorId: "" }));
                        setErrorMsg(null);
                      }}
                    />
                    {fieldErrors.survivorId && <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>{fieldErrors.survivorId}</p>}
                    {preselectedSurvivorName && (
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                        Pre-selected: <span className="font-semibold">{preselectedSurvivorName}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">
                      Loser Customer IDs (records to absorb) <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {loserIds.map((id, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            className={INPUT_CLASS + (fieldErrors.loserIds ? " border-[var(--color-error)] focus:ring-[var(--color-error)]/25" : "")}
                            placeholder={`Loser ID ${idx + 1}`}
                            value={id}
                            onChange={(e) => setLoser(idx, e.target.value)}
                          />
                          {loserIds.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLoser(idx)}
                              className="w-9 h-9 rounded-lg flex items-center justify-center border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {fieldErrors.loserIds && <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>{fieldErrors.loserIds}</p>}
                    <button
                      type="button"
                      onClick={addLoser}
                      className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline"
                    >
                      <Plus size={12} /> Add another loser
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block">
                      Field Overrides <span className="text-[var(--color-text-muted)] font-normal">(optional JSON)</span>
                    </label>
                    <textarea
                      className={`${INPUT_CLASS} h-24 py-2 font-mono text-xs resize-none` + (fieldErrors.fieldOverrides ? " border-[var(--color-error)] focus:ring-[var(--color-error)]/25" : "")}
                      placeholder={'{ "name": "Preferred Name", "email": "primary@example.com" }'}
                      value={fieldOverrides}
                      onChange={(e) => {
                        setFieldOverrides(e.target.value);
                        if (fieldErrors.fieldOverrides) setFieldErrors((p) => ({ ...p, fieldOverrides: "" }));
                      }}
                    />
                    {fieldErrors.fieldOverrides ? (
                      <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>{fieldErrors.fieldOverrides}</p>
                    ) : (
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                        Override specific fields on the surviving record. Leave blank to use survivor's existing values.
                      </p>
                    )}
                  </div>

                  {errorMsg && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 px-3 py-2.5">
                      <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-700 dark:text-red-400">{errorMsg}</p>
                    </div>
                  )}
                </form>
              )}
            </>
          )}

          {/* ── Audit tab ── */}
          {view === "audit" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  className={`${INPUT_CLASS} flex-1`}
                  placeholder="Customer ID to fetch audit for"
                  value={auditCustomerId}
                  onChange={(e) => { setAuditCustomerId(e.target.value); setAuditError(null); }}
                />
                <button
                  type="button"
                  onClick={handleFetchAudit}
                  disabled={auditLoading}
                  className="h-10 px-4 rounded-lg text-white text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60 flex items-center gap-2 shrink-0"
                  style={{ background: "var(--color-primary)" }}
                >
                  {auditLoading ? <SpinnerIcon size={13} className="animate-spin" /> : null}
                  {auditLoading ? "Loading…" : "Fetch"}
                </button>
              </div>

              {auditError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 px-3 py-2.5">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-400">{auditError}</p>
                </div>
              )}

              {auditRecords.length === 0 && !auditLoading && !auditError && (
                <div className="text-center py-10 text-[var(--color-text-muted)] text-sm">
                  Enter a customer ID and click Fetch to view merge audit history.
                </div>
              )}

              {auditRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-xl border p-4 space-y-2"
                  style={{ borderColor: "var(--color-border-light)", background: "var(--color-background-secondary)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--color-text)] font-mono">{rec.id.slice(0, 16)}…</span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {new Date(rec.mergedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    <span className="font-medium">Survivor:</span>{" "}
                    <span className="font-mono">{rec.survivorId.slice(0, 12)}…</span>
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    <span className="font-medium">Absorbed:</span>{" "}
                    {rec.loserIds.map((id) => (
                      <span key={id} className="font-mono mr-1">{id.slice(0, 10)}…</span>
                    ))}
                  </div>
                  {rec.mergedBy && (
                    <div className="text-xs text-[var(--color-text-muted)]">By: {rec.mergedBy}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4 border-t shrink-0"
          style={{ borderColor: "var(--color-border-light)", background: "var(--color-background-secondary)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg border text-sm font-medium transition-colors text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] border-[var(--color-border)]"
          >
            Close
          </button>
          {view === "merge" && !mergeResult && (
            <button
              type="submit"
              form="merge-form"
              disabled={loading}
              className="h-9 px-5 rounded-lg text-white text-sm font-semibold transition-all shadow-sm hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, #e11d48, #be185d)" }}
            >
              {loading ? <SpinnerIcon size={14} className="animate-spin" /> : <GitMerge size={14} />}
              {loading ? "Merging…" : "Execute Merge"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
