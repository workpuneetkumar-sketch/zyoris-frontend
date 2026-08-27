"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Save,
  X,
  User,
  Mail,
  Phone,
  Building2,
  Hash,
  Database,
  UserCheck,
  LifeBuoy,
  Briefcase,
  Loader2 as SpinnerIcon,
} from "lucide-react";
import {
  LifecycleState,
  CanonicalType,
  LIFECYCLE_STATES,
  CANONICAL_TYPES,
  LIFECYCLE_STATE_LABELS,
  CANONICAL_TYPE_LABELS,
  CreateCustomerPayload,
} from "@/types/customers";
import { createCustomer, fetchCustomerOwners } from "@/lib/api/customersApi";

const EMPTY_FORM: CreateCustomerPayload = {
  name: "",
  email: "",
  phone: "",
  externalId: "",
  externalSystem: "",
  canonicalType: "INDIVIDUAL",
  ownerId: "",
  lifecycleState: "PROSPECT",
  companyId: "",
  contactId: "",
  leadId: "",
  metadata: {},
};

function FieldLabel({ required, children, icon, hint }: { required?: boolean; children: React.ReactNode; hint?: string; icon?: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: "var(--color-text)" }}>
      {icon && <span className="opacity-70">{icon}</span>}
      <span>{children}{required && <span style={{ color: "var(--color-error)" }}> *</span>}</span>
      {hint && <span className="text-[11px] ml-auto" style={{ color: "var(--color-text-muted)" }}>{hint}</span>}
    </label>
  );
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

export default function NewCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState<CreateCustomerPayload>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateCustomerPayload, string>>>({});
  const [saving, setSaving] = useState(false);
  const [owners, setOwners] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);

  useEffect(() => {
    setOwnersLoading(true);
    fetchCustomerOwners()
      .then(setOwners)
      .catch(() => setOwners([]))
      .finally(() => setOwnersLoading(false));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof CreateCustomerPayload]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CreateCustomerPayload, string>> = {};
    if (!form.name.trim()) newErrors.name = "Customer name is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: CreateCustomerPayload = { ...form };
      if (!payload.email?.trim()) delete (payload as any).email;
      if (!payload.phone?.trim()) delete (payload as any).phone;
      if (!payload.externalId?.trim()) delete (payload as any).externalId;
      if (!payload.externalSystem?.trim()) delete (payload as any).externalSystem;
      if (!payload.ownerId?.trim()) delete (payload as any).ownerId;
      if (!payload.companyId?.trim()) delete (payload as any).companyId;
      if (!payload.contactId?.trim()) delete (payload as any).contactId;
      if (!payload.leadId?.trim()) delete (payload as any).leadId;
      if (!payload.metadata || Object.keys(payload.metadata).length === 0) delete (payload as any).metadata;

      const created = await createCustomer(payload);
      toast.success(`Customer "${created.name}" created successfully`);
      router.push(`/customers/${created.id}`);
    } catch (err: any) {
      console.error("Create customer error:", err);
      toast.error(err.message || "Failed to create customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-9 w-9 rounded-lg border flex items-center justify-center transition-colors
                bg-[var(--color-surface)]
                border-[var(--color-border)]
                text-[var(--color-text-secondary)]
                hover:bg-[var(--color-surface-hover)]"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text)] leading-tight">
                New Customer
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                Create a new canonical customer record.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg border text-sm font-medium transition-colors
                bg-[var(--color-surface)]
                border-[var(--color-border)]
                text-[var(--color-text-secondary)]
                hover:bg-[var(--color-surface-hover)]"
            >
              <X size={14} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-white text-sm font-semibold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed
                bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)]
                hover:from-[var(--color-primary)] hover:to-[var(--color-primary-light)]"
            >
              {saving ? <SpinnerIcon size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Creating…" : "Create Customer"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Basic Info */}
          <div className="lg:col-span-2 space-y-4">
            <div
              className="rounded-xl border p-5 space-y-4
                bg-[var(--color-surface)]
                border-[var(--color-border)]"
            >
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5"
                  style={{ color: "var(--color-text-muted)" }}>
                  <User size={12} /> Basic Information
                </h2>
                <p className="text-[11px] mb-4" style={{ color: "var(--color-text-muted)" }}>
                  Core identity of the canonical record.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FieldLabel required icon={<User size={13} />}>Customer Name</FieldLabel>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Acme Corporation"
                    className={errors.name ? INPUT_ERROR_CLASS : INPUT_CLASS}
                  />
                  {errors.name && (
                    <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>{errors.name}</p>
                  )}
                </div>
                <div>
                  <FieldLabel icon={<Mail size={13} />} hint="Unique">Email</FieldLabel>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="hello@acme.com"
                    className={errors.email ? INPUT_ERROR_CLASS : INPUT_CLASS}
                  />
                  {errors.email && (
                    <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>{errors.email}</p>
                  )}
                </div>
                <div>
                  <FieldLabel icon={<Phone size={13} />}>Phone</FieldLabel>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+1 555 000 0000"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <FieldLabel icon={<Briefcase size={13} />}>Canonical Type</FieldLabel>
                  <div className="relative">
                    <select name="canonicalType" value={form.canonicalType} onChange={handleChange} className={SELECT_CLASS}>
                      {CANONICAL_TYPES.map((t) => (
                        <option key={t} value={t}>{CANONICAL_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }}>
                      <ChevronDownIcon />
                    </div>
                  </div>
                </div>
                <div>
                  <FieldLabel icon={<LifeBuoy size={13} />}>Lifecycle State</FieldLabel>
                  <div className="relative">
                    <select name="lifecycleState" value={form.lifecycleState} onChange={handleChange} className={SELECT_CLASS}>
                      {LIFECYCLE_STATES.map((s) => (
                        <option key={s} value={s}>{LIFECYCLE_STATE_LABELS[s]}</option>
                      ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }}>
                      <ChevronDownIcon />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Source / System Links */}
            <div
              className="rounded-xl border p-5 space-y-4
                bg-[var(--color-surface)]
                border-[var(--color-border)]"
            >
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5"
                  style={{ color: "var(--color-text-muted)" }}>
                  <Database size={12} /> CRM &amp; System Links
                </h2>
                <p className="text-[11px] mb-4" style={{ color: "var(--color-text-muted)" }}>
                  Map this record to its origin systems and existing CRM entities.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel icon={<Hash size={13} />}>External ID</FieldLabel>
                  <input
                    name="externalId"
                    value={form.externalId}
                    onChange={handleChange}
                    placeholder="SF-10023"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <FieldLabel icon={<Database size={13} />}>External System</FieldLabel>
                  <input
                    name="externalSystem"
                    value={form.externalSystem}
                    onChange={handleChange}
                    placeholder="SALESFORCE / HUBSPOT / …"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <FieldLabel icon={<Building2 size={13} />}>Company ID (CRM link)</FieldLabel>
                  <input
                    name="companyId"
                    value={form.companyId}
                    onChange={handleChange}
                    placeholder="company_…"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <FieldLabel icon={<UserCheck size={13} />}>Contact ID (CRM link)</FieldLabel>
                  <input
                    name="contactId"
                    value={form.contactId}
                    onChange={handleChange}
                    placeholder="contact_…"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel icon={<Briefcase size={13} />}>Lead ID (if this record came from a Lead)</FieldLabel>
                  <input
                    name="leadId"
                    value={form.leadId}
                    onChange={handleChange}
                    placeholder="lead_…"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ownership & Metadata */}
          <div className="space-y-4">
            <div
              className="rounded-xl border p-5 space-y-4
                bg-[var(--color-surface)]
                border-[var(--color-border)]"
            >
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{ color: "var(--color-text-muted)" }}>
                  Ownership
                </h2>
              </div>
              <div>
                <FieldLabel icon={<UserCheck size={13} />}>Owner</FieldLabel>
                <div className="relative">
                  <select
                    name="ownerId"
                    value={form.ownerId}
                    onChange={handleChange}
                    disabled={ownersLoading}
                    className={SELECT_CLASS + (ownersLoading ? " opacity-60" : "")}
                  >
                    <option value="">Unassigned</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}{o.email ? ` (${o.email})` : ""}</option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }}>
                    <ChevronDownIcon />
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-xl border p-5
                bg-gradient-to-br from-blue-500/5 to-cyan-500/5
                border-[var(--color-border)]"
            >
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--color-text-muted)" }}>
                Tip
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                After saving, this customer will receive a canonical ID that other modules
                (Deals, Contacts, Activities, Tickets) can be linked to. Use the{" "}
                <span className="font-semibold" style={{ color: "var(--color-primary)" }}>Identity Resolve</span>{" "}
                tool to merge duplicates or find existing matches before creating.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
  );
}
