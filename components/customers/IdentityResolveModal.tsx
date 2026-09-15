"use client";

import { useState } from "react";
import { X, Search, Loader2 as SpinnerIcon, CheckCircle2, AlertCircle, GitBranch, ExternalLink, Mail, Phone, Hash, Building2, UserCheck, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";
import { IdentityResolvePayload, IdentityResolveResult, LIFECYCLE_STATE_LABELS, CANONICAL_TYPE_LABELS } from "@/types/customers";
import { resolveCustomerIdentity } from "@/lib/api/customersApi";
import { toast } from "react-toastify";

const EMPTY_PAYLOAD: IdentityResolvePayload = {
  email: "",
  phone: "",
  externalId: "",
  externalSystem: "",
  contactId: "",
  companyId: "",
  leadId: "",
};

export interface IdentityResolveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INPUT_CLASS = `w-full h-10 rounded-lg border px-3 text-sm outline-none transition-all
  bg-[var(--color-surface)]
  text-[var(--color-text)]
  border-[var(--color-border)]
  placeholder:text-[var(--color-text-muted)]
  focus:border-[var(--color-primary-light)]
  focus:ring-2 focus:ring-[var(--color-primary)]/25`;

function ConfidenceBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  const color =
    pct >= 80 ? "bg-emerald-500" :
    pct >= 50 ? "bg-amber-500" :
    "bg-red-500";
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
          {label ?? "Confidence"}
        </span>
        <span className="text-[11px] font-bold text-[var(--color-text)]">{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-background-tertiary)" }}>
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function IdentityResolveModal({ isOpen, onClose }: IdentityResolveModalProps) {
  const router = useRouter();
  const [payload, setPayload] = useState<IdentityResolvePayload>(EMPTY_PAYLOAD);
  const [result, setResult] = useState<IdentityResolveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const setField = (k: keyof IdentityResolvePayload, v: string) => {
    setPayload((p) => ({ ...p, [k]: v }));
    if (errorMsg) setErrorMsg(null);
    if (result) setResult(null);
    if (fieldErrors[k]) setFieldErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const hasAny = Object.values(payload).some((v) => typeof v === "string" && v.trim() !== "");
    if (!hasAny) {
      setErrorMsg("Please fill in at least one identifier (email, phone, external ID, or CRM link).");
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

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const r = await resolveCustomerIdentity(payload);
      setResult(r);
      if (r.resolved) {
        toast.success("Identity resolved successfully");
      } else {
        toast.info("No confident match — consider creating a new customer.");
      }
    } catch (err: any) {
      console.error("Identity resolve error:", err);
      setErrorMsg(err.message || "Identity resolution failed. Please try again.");
      toast.error("Identity resolution failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPayload(EMPTY_PAYLOAD);
    setResult(null);
    setErrorMsg(null);
  };

  const goToCreate = () => {
    onClose();
    router.push("/customers/new");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div
        className="w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col
          bg-[var(--color-surface)]
          border border-[var(--color-border)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center
                bg-gradient-to-br from-cyan-500/20 to-blue-500/20"
            >
              <GitBranch size={16} className="text-cyan-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)]">Resolve Identity</h2>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Match identifiers against canonical customer records.
              </p>
            </div>
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

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Input form */}
            <div className="md:col-span-2 space-y-4">
              <form onSubmit={handleResolve} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                    Identifiers
                  </h3>
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-500/20">
                    At least 1 required *
                  </span>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                    <Mail size={12} /> Email
                  </label>
                  <input
                    type="email"
                    value={payload.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="jane@acme.com"
                    className={INPUT_CLASS + (fieldErrors.email ? " border-[var(--color-error)] focus:ring-[var(--color-error)]/25" : "")}
                  />
                  {fieldErrors.email && <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>{fieldErrors.email}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                    <Phone size={12} /> Phone
                  </label>
                  <input
                    value={payload.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="+1 555 000 0000"
                    className={INPUT_CLASS + (fieldErrors.phone ? " border-[var(--color-error)] focus:ring-[var(--color-error)]/25" : "")}
                  />
                  {fieldErrors.phone && <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>{fieldErrors.phone}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                    <Hash size={12} /> External ID
                  </label>
                  <input
                    value={payload.externalId}
                    onChange={(e) => setField("externalId", e.target.value)}
                    placeholder="SF-10023"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
                    External System
                  </label>
                  <input
                    value={payload.externalSystem}
                    onChange={(e) => setField("externalSystem", e.target.value)}
                    placeholder="SALESFORCE"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                    <UserCheck size={12} /> Contact ID
                  </label>
                  <input
                    value={payload.contactId}
                    onChange={(e) => setField("contactId", e.target.value)}
                    placeholder="contact_…"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                    <Building2 size={12} /> Company ID
                  </label>
                  <input
                    value={payload.companyId}
                    onChange={(e) => setField("companyId", e.target.value)}
                    placeholder="company_…"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                    <Briefcase size={12} /> Lead ID
                  </label>
                  <input
                    value={payload.leadId}
                    onChange={(e) => setField("leadId", e.target.value)}
                    placeholder="lead_…"
                    className={INPUT_CLASS}
                  />
                </div>

                {errorMsg && (
                  <div
                    className="rounded-lg p-3 border text-xs flex items-start gap-2
                      border-[var(--color-error)]/40"
                    style={{ background: "var(--color-error-light)", color: "var(--color-error)" }}
                  >
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-9 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed
                      bg-gradient-to-r from-[var(--color-primary-dark)] to-cyan-500
                      hover:shadow-lg
                      flex items-center justify-center gap-1.5"
                  >
                    {loading ? (
                      <><SpinnerIcon size={14} className="animate-spin" /> Resolving…</>
                    ) : (
                      <><Search size={14} /> Resolve Identity</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="h-9 px-3 rounded-lg border text-sm font-medium transition-colors
                      border-[var(--color-border)]
                      text-[var(--color-text-secondary)]
                      hover:bg-[var(--color-surface-hover)]"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>

            {/* Result pane */}
            <div className="md:col-span-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
                Resolution Result
              </h3>

              {!loading && !result && !errorMsg && (
                <div
                  className="h-full min-h-[360px] rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center
                    border-[var(--color-border)]"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: "var(--color-background-secondary)" }}
                  >
                    <Search size={24} style={{ color: "var(--color-text-muted)" }} />
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text)] mb-1">Run a resolution</p>
                  <p className="text-xs max-w-xs" style={{ color: "var(--color-text-muted)" }}>
                    Provide identifiers on the left and hit Resolve Identity to find a
                    matching canonical customer with a confidence score.
                  </p>
                </div>
              )}

              {loading && (
                <div
                  className="h-full min-h-[360px] rounded-xl border p-6 flex flex-col items-center justify-center text-center gap-3
                    border-[var(--color-border)]
                    bg-[var(--color-background-secondary)]/40"
                >
                  <SpinnerIcon size={28} className="animate-spin" style={{ color: "var(--color-primary)" }} />
                  <p className="text-sm font-medium text-[var(--color-text)]">Resolving identity…</p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Matching identifiers across canonical records…
                  </p>
                </div>
              )}

              {!loading && result && (
                <div className="space-y-3">
                  {/* Resolved match */}
                  {result.resolved && result.customer ? (
                    <div
                      className="rounded-xl border p-4
                        bg-emerald-500/5 border-emerald-500/30
                        dark:bg-emerald-500/10"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                              Customer Matched
                            </p>
                            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                              Found an existing canonical record.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg p-3 mb-3 border"
                        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-[var(--color-text)]">
                              {(result.customer as any).name || "Unnamed"}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {(result.customer as any).canonicalType && (
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium
                                    bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30"
                                >
                                  {CANONICAL_TYPE_LABELS[(result.customer as any).canonicalType as keyof typeof CANONICAL_TYPE_LABELS] ?? (result.customer as any).canonicalType}
                                </span>
                              )}
                              {(result.customer as any).lifecycleState && (
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium
                                    bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                                >
                                  {LIFECYCLE_STATE_LABELS[(result.customer as any).lifecycleState as keyof typeof LIFECYCLE_STATE_LABELS] ?? (result.customer as any).lifecycleState}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 space-y-1 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                              {(result.customer as any).email && (
                                <p className="flex items-center gap-1.5"><Mail size={11} className="opacity-70" /> {(result.customer as any).email}</p>
                              )}
                              {(result.customer as any).phone && (
                                <p className="flex items-center gap-1.5"><Phone size={11} className="opacity-70" /> {(result.customer as any).phone}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => { onClose(); router.push(`/customers/${(result.customer as any).id}`); }}
                            className="shrink-0 flex items-center gap-1 h-8 px-3 rounded-lg text-[11px] font-semibold text-white transition-all
                              bg-[var(--color-primary)]
                              hover:brightness-110"
                          >
                            <ExternalLink size={12} /> Open
                          </button>
                        </div>
                      </div>

                      {typeof result.confidence === "number" && (
                        <ConfidenceBar value={result.confidence} label="Match confidence" />
                      )}
                    </div>
                  ) : (
                    <div
                      className="rounded-xl border p-4
                        bg-amber-500/5 border-amber-500/30
                        dark:bg-amber-500/10"
                    >
                      <div className="flex items-start gap-2 mb-3">
                        <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                            No Confident Match
                          </p>
                          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                            No canonical customer matched your provided identifiers with sufficient confidence.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={goToCreate}
                        className="w-full h-9 rounded-lg text-white text-sm font-semibold transition-all
                          bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)]
                          hover:shadow-lg flex items-center justify-center gap-1.5"
                      >
                        <UserCheck size={14} /> Create New Customer
                      </button>
                    </div>
                  )}

                  {/* Additional matches */}
                  {Array.isArray(result.matches) && result.matches.length > 0 && (
                    <div
                      className="rounded-xl border p-4 space-y-2
                        bg-[var(--color-surface)]
                        border-[var(--color-border)]"
                    >
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                        Additional candidates ({result.matches.length})
                      </h4>
                      {result.matches.slice(0, 4).map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-colors hover:brightness-95 cursor-pointer
                            border-[var(--color-border-light)]
                            bg-[var(--color-background-secondary)]/40"
                          onClick={() => { onClose(); router.push(`/customers/${m.customerId}`); }}
                        >
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-[var(--color-text)] truncate">{m.customerName}</p>
                            {m.matchedFields?.length > 0 && (
                              <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                                Matched: {m.matchedFields.join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 w-20">
                            <ConfidenceBar value={m.confidence ?? 0} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IdentityResolveModal;
