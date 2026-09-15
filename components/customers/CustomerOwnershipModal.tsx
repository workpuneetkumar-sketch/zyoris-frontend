"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2 as SpinnerIcon,
  Crown,
  AlertTriangle,
  CheckCircle2,
  User,
  Users,
  Briefcase,
  ChevronDown,
} from "lucide-react";
import { CustomerOwnershipPayload, CanonicalCustomer } from "@/types/customers";
import {
  updateCustomerOwnership,
  fetchCustomerOwners,
} from "@/lib/api/customersApi";
import { toast } from "react-toastify";

const INPUT_CLASS = `w-full h-10 rounded-lg border px-3 text-sm outline-none transition-all
  bg-[var(--color-surface)]
  text-[var(--color-text)]
  border-[var(--color-border)]
  placeholder:text-[var(--color-text-muted)]
  focus:border-[var(--color-primary-light)]
  focus:ring-2 focus:ring-[var(--color-primary)]/25`;

const ACCOUNT_PLANS = [
  "Free", "Starter", "Professional", "Enterprise", "Strategic",
];

const TEAM_OPTIONS = [
  "Sales", "Customer Success", "Support", "Partnerships", "Marketing", "Engineering",
];

export interface CustomerOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updated: CanonicalCustomer) => void;
  customer: CanonicalCustomer | null;
}

export function CustomerOwnershipModal({
  isOpen,
  onClose,
  onSuccess,
  customer,
}: CustomerOwnershipModalProps) {
  const [payload, setPayload] = useState<CustomerOwnershipPayload>({});
  const [owners, setOwners] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPayload({
        ownerId: customer?.ownerId ?? "",
        team: "",
        accountPlan: "",
      });
      setErrorMsg(null);
      setSaved(false);
      loadOwners();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  async function loadOwners() {
    setOwnersLoading(true);
    try {
      const list = await fetchCustomerOwners();
      setOwners(list);
    } catch {
      // non-blocking
    } finally {
      setOwnersLoading(false);
    }
  }

  const setField = <K extends keyof CustomerOwnershipPayload>(k: K, v: CustomerOwnershipPayload[K]) => {
    setPayload((p) => ({ ...p, [k]: v }));
    if (errorMsg) setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: CustomerOwnershipPayload = {};
    if (payload.ownerId?.trim()) cleaned.ownerId = payload.ownerId.trim();
    if (payload.team?.trim()) cleaned.team = payload.team.trim();
    if (payload.accountPlan?.trim()) cleaned.accountPlan = payload.accountPlan.trim();

    if (Object.keys(cleaned).length === 0) {
      setErrorMsg("Fill in at least one ownership field to update.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const updated = await updateCustomerOwnership(customer.id, cleaned);
      setSaved(true);
      toast.success("Ownership updated successfully!");
      onSuccess?.(updated);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to update ownership.");
      toast.error(err?.message ?? "Failed to update ownership.");
    } finally {
      setSaving(false);
    }
  };

  const currentOwner = owners.find((o) => o.id === customer.ownerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--color-border-light)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <Crown size={18} className="text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)]">Update Ownership</h2>
              <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[200px]">
                {customer.name}
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

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Current ownership info */}
          <div
            className="rounded-xl border p-4 space-y-2"
            style={{ borderColor: "var(--color-border-light)", background: "var(--color-background-secondary)" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Current Ownership
            </p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 shrink-0">
                {(currentOwner?.name ?? customer.owner?.name ?? "?")[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {currentOwner?.name ?? customer.owner?.name ?? "Unassigned"}
                </p>
                {(currentOwner?.email ?? customer.owner?.email) && (
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {currentOwner?.email ?? customer.owner?.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <form id="ownership-form" onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                <User size={11} /> New Owner <span className="text-amber-500 text-[10px] font-normal">(at least 1 ownership field required *)</span>
              </label>
              <div className="relative">
                <select
                  className={`${INPUT_CLASS} appearance-none pr-9`}
                  value={payload.ownerId ?? ""}
                  onChange={(e) => setField("ownerId", e.target.value || undefined)}
                  disabled={ownersLoading}
                >
                  <option value="">— Keep current owner —</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}{o.email ? ` (${o.email})` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
                {ownersLoading && (
                  <SpinnerIcon size={13} className="absolute right-8 top-1/2 -translate-y-1/2 animate-spin text-[var(--color-text-muted)] pointer-events-none" />
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                <Users size={11} /> Team
              </label>
              <div className="relative">
                <select
                  className={`${INPUT_CLASS} appearance-none pr-9`}
                  value={payload.team ?? ""}
                  onChange={(e) => setField("team", e.target.value || undefined)}
                >
                  <option value="">— Not set —</option>
                  {TEAM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                <Briefcase size={11} /> Account Plan
              </label>
              <div className="relative">
                <select
                  className={`${INPUT_CLASS} appearance-none pr-9`}
                  value={payload.accountPlan ?? ""}
                  onChange={(e) => setField("accountPlan", e.target.value || undefined)}
                >
                  <option value="">— Not set —</option>
                  {ACCOUNT_PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 px-3 py-2.5">
                <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-400">{errorMsg}</p>
              </div>
            )}
          </form>
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
            Cancel
          </button>
          <button
            type="submit"
            form="ownership-form"
            disabled={saving || saved}
            className="h-9 px-5 rounded-lg text-white text-sm font-semibold transition-all shadow-sm hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ background: saved ? "var(--color-success)" : "linear-gradient(135deg, #d97706, #f59e0b)" }}
          >
            {saving ? <SpinnerIcon size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Crown size={14} />}
            {saving ? "Saving…" : saved ? "Updated!" : "Save Ownership"}
          </button>
        </div>
      </div>
    </div>
  );
}
