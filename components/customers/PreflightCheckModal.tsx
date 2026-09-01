"use client";

import { useState } from "react";
import {
  X,
  Loader2 as SpinnerIcon,
  CheckCircle2,
  AlertTriangle,
  GitMerge,
  UserPlus,
  Link2,
  Mail,
  Phone,
  Hash,
  Building2,
  UserCheck,
  Briefcase,
  User,
} from "lucide-react";
import { PreflightPayload, PreflightResult } from "@/types/customers";
import { preflightCustomer } from "@/lib/api/customersApi";
import { toast } from "react-toastify";

const EMPTY: PreflightPayload = {
  email: "",
  phone: "",
  externalId: "",
  externalSystem: "",
  contactId: "",
  companyId: "",
  leadId: "",
  name: "",
};

const INPUT_CLASS = `w-full h-10 rounded-lg border px-3 text-sm outline-none transition-all
  bg-[var(--color-surface)]
  text-[var(--color-text)]
  border-[var(--color-border)]
  placeholder:text-[var(--color-text-muted)]
  focus:border-[var(--color-primary-light)]
  focus:ring-2 focus:ring-[var(--color-primary)]/25`;

const ACTION_META = {
  allow_create: {
    icon: <UserPlus size={22} className="text-emerald-500" />,
    label: "Allow Create",
    desc: "No existing customer matched. You can safely create a new record.",
    bg: "from-emerald-500/15 to-emerald-500/5",
    border: "border-emerald-500/30",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  link_existing: {
    icon: <Link2 size={22} className="text-blue-500" />,
    label: "Link Existing",
    desc: "A matching customer was found. Link the new record to the existing one.",
    bg: "from-blue-500/15 to-blue-500/5",
    border: "border-blue-500/30",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  },
  merge_required: {
    icon: <GitMerge size={22} className="text-amber-500" />,
    label: "Merge Required",
    desc: "Duplicate records detected. A merge is recommended before creating a new record.",
    bg: "from-amber-500/15 to-amber-500/5",
    border: "border-amber-500/30",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-[var(--color-text-muted)]">Confidence</span>
        <span className="text-[11px] font-bold text-[var(--color-text)]">{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden bg-[var(--color-background-tertiary)]">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export interface PreflightCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PreflightCheckModal({ isOpen, onClose }: PreflightCheckModalProps) {
  const [payload, setPayload] = useState<PreflightPayload>(EMPTY);
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const setField = (k: keyof PreflightPayload, v: string) => {
    setPayload((p) => ({ ...p, [k]: v }));
    if (errorMsg) setErrorMsg(null);
    if (result) setResult(null);
    if (fieldErrors[k]) setFieldErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const hasAny = Object.values(payload).some((v) => typeof v === "string" && v.trim() !== "");
    if (!hasAny) {
      setErrorMsg("Fill in at least one field (Email, Phone, Name, External ID, etc.) to run a preflight check.");
      return false;
    }
    if (payload.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
      errs.email = "Please enter a valid email address";
    }
    if (payload.phone?.trim() && !/^[+0-9\s\-()]{7,20}$/.test(payload.phone.trim())) {
      errs.phone = "Please enter a valid phone number (min 7 digits)";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const r = await preflightCustomer(payload);
      setResult(r);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Preflight check failed.");
      toast.error(err?.message ?? "Preflight check failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPayload(EMPTY);
    setResult(null);
    setErrorMsg(null);
  };

  const actionMeta = result ? ACTION_META[result.action] ?? ACTION_META.allow_create : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-indigo-500/20">
              <CheckCircle2 size={18} className="text-violet-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)]">Preflight Check</h2>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Check before creating / converting a customer record
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
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 px-3 py-2 rounded-lg">
            <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
              Enter details below to check for matches before record creation.
            </span>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider shrink-0">
              At least 1 required *
            </span>
          </div>

          {/* Form */}
          <form id="preflight-form" onSubmit={handleCheck} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                  <Mail size={11} /> Email
                </label>
                <input
                  className={INPUT_CLASS + (fieldErrors.email ? " border-[var(--color-error)] focus:ring-[var(--color-error)]/25" : "")}
                  placeholder="customer@example.com"
                  value={payload.email ?? ""}
                  onChange={(e) => setField("email", e.target.value)}
                />
                {fieldErrors.email && <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>{fieldErrors.email}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                  <Phone size={11} /> Phone
                </label>
                <input
                  className={INPUT_CLASS + (fieldErrors.phone ? " border-[var(--color-error)] focus:ring-[var(--color-error)]/25" : "")}
                  placeholder="+1 555 000 0000"
                  value={payload.phone ?? ""}
                  onChange={(e) => setField("phone", e.target.value)}
                />
                {fieldErrors.phone && <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>{fieldErrors.phone}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                  <User size={11} /> Name
                </label>
                <input
                  className={INPUT_CLASS}
                  placeholder="Full name"
                  value={payload.name ?? ""}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                  <Hash size={11} /> External ID
                </label>
                <input
                  className={INPUT_CLASS}
                  placeholder="ext-12345"
                  value={payload.externalId ?? ""}
                  onChange={(e) => setField("externalId", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                  <Hash size={11} /> External System
                </label>
                <input
                  className={INPUT_CLASS}
                  placeholder="Salesforce, HubSpot…"
                  value={payload.externalSystem ?? ""}
                  onChange={(e) => setField("externalSystem", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                  <UserCheck size={11} /> Contact ID
                </label>
                <input
                  className={INPUT_CLASS}
                  placeholder="Contact UUID"
                  value={payload.contactId ?? ""}
                  onChange={(e) => setField("contactId", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                  <Building2 size={11} /> Company ID
                </label>
                <input
                  className={INPUT_CLASS}
                  placeholder="Company UUID"
                  value={payload.companyId ?? ""}
                  onChange={(e) => setField("companyId", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                  <Briefcase size={11} /> Lead ID
                </label>
                <input
                  className={INPUT_CLASS}
                  placeholder="Lead UUID"
                  value={payload.leadId ?? ""}
                  onChange={(e) => setField("leadId", e.target.value)}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 px-3 py-2.5">
                <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-400">{errorMsg}</p>
              </div>
            )}
          </form>

          {/* Result */}
          {result && actionMeta && (
            <div
              className={`rounded-xl border p-4 bg-gradient-to-br ${actionMeta.bg} ${actionMeta.border}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 dark:bg-black/10">
                  {actionMeta.icon}
                </div>
                <div>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${actionMeta.badge}`}>
                    {actionMeta.label}
                  </span>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">{actionMeta.desc}</p>
                </div>
              </div>

              {result.confidence != null && (
                <ConfidenceBar value={result.confidence} />
              )}

              {result.existingCustomerName && (
                <div className="mt-3 rounded-lg bg-white/30 dark:bg-black/20 px-3 py-2 text-xs">
                  <span className="text-[var(--color-text-muted)]">Matched: </span>
                  <span className="font-semibold text-[var(--color-text)]">{result.existingCustomerName}</span>
                  {result.existingCustomerId && (
                    <span className="ml-1 text-[var(--color-text-muted)] font-mono">
                      ({result.existingCustomerId.slice(0, 8)}…)
                    </span>
                  )}
                </div>
              )}

              {result.message && (
                <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{result.message}</p>
              )}

              {Array.isArray(result.matches) && result.matches.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Candidate Matches
                  </p>
                  {result.matches.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-white/30 dark:bg-black/20 px-3 py-2"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[var(--color-text)]">{m.customerName}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-mono">{m.customerId.slice(0, 12)}…</p>
                        {m.matchedFields?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {m.matchedFields.map((f) => (
                              <span key={f} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/40 dark:bg-black/20 text-[var(--color-text-secondary)] font-medium">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-[var(--color-text)]">
                          {Math.round(m.confidence * 100)}%
                        </span>
                        <p className="text-[10px] text-[var(--color-text-muted)]">match</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            onClick={handleReset}
            className="h-9 px-4 rounded-lg border text-sm font-medium transition-colors text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] border-[var(--color-border)]"
          >
            Reset
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border text-sm font-medium transition-colors text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] border-[var(--color-border)]"
            >
              Close
            </button>
            <button
              type="submit"
              form="preflight-form"
              disabled={loading}
              className="h-9 px-5 rounded-lg text-white text-sm font-semibold transition-all shadow-sm hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ background: "var(--color-primary)" }}
            >
              {loading ? <SpinnerIcon size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {loading ? "Checking…" : "Run Preflight"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
