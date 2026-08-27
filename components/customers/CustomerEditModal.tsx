"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2 as SpinnerIcon, User, Mail, Phone, Hash, Database, UserCheck, LifeBuoy, Briefcase } from "lucide-react";
import {
  CanonicalCustomer,
  UpdateCustomerPayload,
  LIFECYCLE_STATES,
  CANONICAL_TYPES,
  LIFECYCLE_STATE_LABELS,
  CANONICAL_TYPE_LABELS,
} from "@/types/customers";
import { updateCustomer, fetchCustomerOwners } from "@/lib/api/customersApi";
import { toast } from "react-toastify";

export interface CustomerEditModalProps {
  isOpen: boolean;
  customer: CanonicalCustomer | null;
  onClose: () => void;
  onSaved?: (updated: CanonicalCustomer) => void;
}

const INPUT_CLASS = `w-full h-10 rounded-lg border px-3 text-sm outline-none transition-all
  bg-[var(--color-surface)]
  text-[var(--color-text)]
  border-[var(--color-border)]
  placeholder:text-[var(--color-text-muted)]
  focus:border-[var(--color-primary-light)]
  focus:ring-2 focus:ring-[var(--color-primary)]/25`;

const SELECT_CLASS = INPUT_CLASS + " appearance-none cursor-pointer pr-9";

const INPUT_ERROR_CLASS = `w-full h-10 rounded-lg border px-3 text-sm outline-none transition-all
  bg-[var(--color-surface)]
  text-[var(--color-text)]
  border-[var(--color-error)]
  focus:ring-2 focus:ring-[var(--color-error)]/25`;

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}

export function CustomerEditModal({ isOpen, customer, onClose, onSaved }: CustomerEditModalProps) {
  const [form, setForm] = useState<UpdateCustomerPayload>({});
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [owners, setOwners] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !customer) return;
    setForm({
      name: customer.name ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      externalId: customer.externalId ?? "",
      externalSystem: customer.externalSystem ?? "",
      canonicalType: customer.canonicalType ?? "INDIVIDUAL",
      ownerId: customer.ownerId ?? "",
      lifecycleState: customer.lifecycleState ?? "PROSPECT",
    });
    setErrors({});
    setOwnersLoading(true);
    fetchCustomerOwners()
      .then(setOwners)
      .catch(() => setOwners([]))
      .finally(() => setOwnersLoading(false));
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const setField = (k: keyof UpdateCustomerPayload, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k as string]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};
    if (!form.name?.trim()) newErrors.name = "Customer name is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: UpdateCustomerPayload = { ...form };
      if (!payload.email?.trim()) payload.email = "";
      if (!payload.phone?.trim()) payload.phone = "";
      if (!payload.externalId?.trim()) payload.externalId = "";
      if (!payload.externalSystem?.trim()) payload.externalSystem = "";
      if (!payload.ownerId?.trim()) payload.ownerId = "";

      const updated = await updateCustomer(customer.id, payload);
      toast.success("Customer updated successfully");
      onSaved?.(updated);
      onClose();
    } catch (err: any) {
      console.error("Update customer error:", err);
      toast.error(err.message || "Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div
        className="w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col
          bg-[var(--color-surface)]
          border border-[var(--color-border)]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div>
            <h2 className="text-base font-bold text-[var(--color-text)]">Edit Customer</h2>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Update canonical customer fields.
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg border flex items-center justify-center transition-colors
              border-[var(--color-border)]
              text-[var(--color-text-muted)]
              hover:bg-[var(--color-surface-hover)]"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            <div
              className="rounded-xl border p-4 space-y-3.5
                bg-[var(--color-background-secondary)]/40
                border-[var(--color-border)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                Basic Information
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <User size={12} /> Name <span style={{ color: "var(--color-error)" }}>*</span>
                  </label>
                  <input
                    value={form.name || ""}
                    onChange={(e) => setField("name", e.target.value)}
                    className={errors.name ? INPUT_ERROR_CLASS : INPUT_CLASS}
                  />
                  {errors.name && <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>{errors.name}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <Mail size={12} /> Email
                  </label>
                  <input
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => setField("email", e.target.value)}
                    className={errors.email ? INPUT_ERROR_CLASS : INPUT_CLASS}
                  />
                  {errors.email && <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>{errors.email}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <Phone size={12} /> Phone
                  </label>
                  <input
                    value={form.phone || ""}
                    onChange={(e) => setField("phone", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <Briefcase size={12} /> Canonical Type
                  </label>
                  <div className="relative">
                    <select value={form.canonicalType || ""} onChange={(e) => setField("canonicalType", e.target.value)} className={SELECT_CLASS}>
                      {CANONICAL_TYPES.map((t) => (
                        <option key={t} value={t}>{CANONICAL_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }}>
                      <ChevronDown />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <LifeBuoy size={12} /> Lifecycle State
                  </label>
                  <div className="relative">
                    <select value={form.lifecycleState || ""} onChange={(e) => setField("lifecycleState", e.target.value)} className={SELECT_CLASS}>
                      {LIFECYCLE_STATES.map((s) => (
                        <option key={s} value={s}>{LIFECYCLE_STATE_LABELS[s]}</option>
                      ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }}>
                      <ChevronDown />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-xl border p-4 space-y-3.5
                bg-[var(--color-background-secondary)]/40
                border-[var(--color-border)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                System &amp; Ownership
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <Hash size={12} /> External ID
                  </label>
                  <input value={form.externalId || ""} onChange={(e) => setField("externalId", e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <Database size={12} /> External System
                  </label>
                  <input value={form.externalSystem || ""} onChange={(e) => setField("externalSystem", e.target.value)} className={INPUT_CLASS} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <UserCheck size={12} /> Owner
                  </label>
                  <div className="relative">
                    <select
                      disabled={ownersLoading}
                      value={form.ownerId || ""}
                      onChange={(e) => setField("ownerId", e.target.value)}
                      className={SELECT_CLASS + (ownersLoading ? " opacity-60" : "")}
                    >
                      <option value="">Unassigned</option>
                      {owners.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}{o.email ? ` (${o.email})` : ""}</option>
                      ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }}>
                      <ChevronDown />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--color-border)" }}>
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border text-sm font-medium transition-colors
                border-[var(--color-border)]
                text-[var(--color-text-secondary)]
                hover:bg-[var(--color-surface-hover)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-4 rounded-lg text-white text-sm font-semibold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed
                bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)]
                hover:from-[var(--color-primary)] hover:to-[var(--color-primary-light)]
                hover:shadow-lg
                flex items-center gap-1.5"
            >
              {saving ? (
                <><SpinnerIcon size={14} className="animate-spin" /> Saving…</>
              ) : (
                <><Save size={14} /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomerEditModal;
