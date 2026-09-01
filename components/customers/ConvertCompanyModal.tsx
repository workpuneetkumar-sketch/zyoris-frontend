"use client";

import { useState, useEffect } from "react";
import { X, Loader2 as SpinnerIcon, CheckCircle2, Factory, Building2, User, LifeBuoy, ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ConvertCompanyPayload, ConvertCompanyResult, LIFECYCLE_STATES, CANONICAL_TYPES, LIFECYCLE_STATE_LABELS, CANONICAL_TYPE_LABELS } from "@/types/customers";
import { convertCompanyToCustomer, fetchCustomerOwners } from "@/lib/api/customersApi";
import { fetchCompanies } from "@/lib/api/companiesApi";
import { toast } from "react-toastify";

export interface ConvertCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: ConvertCompanyResult) => void;
}

const INPUT_CLASS = `w-full h-10 rounded-lg border px-3 text-sm outline-none transition-all
  bg-[var(--color-surface)]
  text-[var(--color-text)]
  border-[var(--color-border)]
  placeholder:text-[var(--color-text-muted)]
  focus:border-[var(--color-primary-light)]
  focus:ring-2 focus:ring-[var(--color-primary)]/25`;

export function ConvertCompanyModal({ isOpen, onClose, onSuccess }: ConvertCompanyModalProps) {
  const router = useRouter();

  const [payload, setPayload] = useState<ConvertCompanyPayload>({
    companyId: "",
    ownerId: "",
    lifecycleState: "ACTIVE",
    canonicalType: "ORGANIZATION",
  });
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<ConvertCompanyResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setResult(null);
    setLoadingLists(true);
    Promise.allSettled([
      fetchCompanies(1, { status: "All Status", industry: "All Industries", search: "" }, 50),
      fetchCustomerOwners(),
    ]).then(([compRes, ownersRes]) => {
      if (compRes.status === "fulfilled") {
        const raw: any = compRes.value as any;
        const arr = Array.isArray(raw?.companies) ? raw.companies : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        setCompanies(arr.map((c: any) => ({
          id: c.id || c._id || c.companyId,
          name: c.name || c.companyName || c.company_name || c.title || "Unnamed Company",
        })));
      } else {
        console.error("Failed to fetch companies:", compRes.reason);
      }
      if (ownersRes.status === "fulfilled") setOwners(ownersRes.value);
    }).finally(() => setLoadingLists(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const setField = <K extends keyof ConvertCompanyPayload>(k: K, v: ConvertCompanyPayload[K]) => {
    setPayload((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!payload.companyId) {
      newErrors.companyId = "Please select a company to convert";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setConverting(true);
    try {
      const finalPayload: ConvertCompanyPayload = { ...payload };
      if (!finalPayload.ownerId?.trim()) delete (finalPayload as any).ownerId;

      const r = await convertCompanyToCustomer(finalPayload);
      setResult(r);
      toast.success(r.message || "Company converted successfully");
      onSuccess?.(r);
    } catch (err: any) {
      console.error("Convert company error:", err);
      toast.error(err.message || "Failed to convert company");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div
        className="w-full max-w-lg max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col
          bg-[var(--color-surface)]
          border border-[var(--color-border)]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center
                bg-gradient-to-br from-amber-500/20 to-emerald-500/20"
            >
              <Factory size={16} className="text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)]">Convert Company to Customer</h2>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Promote a Company into a canonical customer.
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
          {result ? (
            <div className="p-6">
              <div
                className="rounded-xl border p-5 flex flex-col items-center text-center
                  border-emerald-500/30
                  bg-emerald-500/5 dark:bg-emerald-500/10"
              >
                <CheckCircle2 size={42} className="text-emerald-500 mb-3" />
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                  Company Converted
                </p>
                <p className="text-xs mb-5" style={{ color: "var(--color-text-muted)" }}>
                  {result.message || "The company has been promoted to a canonical customer."}
                </p>

                {result.customerId && (
                  <button
                    onClick={() => { onClose(); router.push(`/customers/${result.customerId}`); }}
                    className="h-9 px-5 rounded-lg text-white text-sm font-semibold transition-all shadow-sm
                      bg-gradient-to-r from-amber-500 to-emerald-500
                      hover:shadow-lg flex items-center gap-1.5 mb-2"
                  >
                    <Building2 size={14} /> Open Created Customer
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="h-9 px-4 rounded-lg border text-sm font-medium transition-colors
                    border-[var(--color-border)]
                    text-[var(--color-text-secondary)]
                    hover:bg-[var(--color-surface-hover)]"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConvert} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                  <Building2 size={12} /> Company
                  <span style={{ color: "var(--color-error)" }}> *</span>
                </label>
                <div className="relative">
                  <select
                    disabled={loadingLists || converting}
                    value={payload.companyId}
                    onChange={(e) => setField("companyId", e.target.value)}
                    className={INPUT_CLASS + " appearance-none pr-9 cursor-pointer" + (loadingLists ? " opacity-60" : "") + (errors.companyId ? " border-[var(--color-error)] focus:ring-[var(--color-error)]/25" : "")}
                  >
                    <option value="">Select a company…</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {errors.companyId && <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>{errors.companyId}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                  <User size={12} /> Owner
                </label>
                <div className="relative">
                  <select
                    disabled={loadingLists || converting}
                    value={payload.ownerId}
                    onChange={(e) => setField("ownerId", e.target.value)}
                    className={INPUT_CLASS + " appearance-none pr-9 cursor-pointer"}
                  >
                    <option value="">(Unassigned)</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <LifeBuoy size={12} /> Lifecycle State
                  </label>
                  <div className="relative">
                    <select
                      disabled={converting}
                      value={payload.lifecycleState}
                      onChange={(e) => setField("lifecycleState", e.target.value)}
                      className={INPUT_CLASS + " appearance-none pr-9 cursor-pointer"}
                    >
                      {LIFECYCLE_STATES.map((s) => (
                        <option key={s} value={s}>{LIFECYCLE_STATE_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <Factory size={12} /> Canonical Type
                  </label>
                  <div className="relative">
                    <select
                      disabled={converting}
                      value={payload.canonicalType}
                      onChange={(e) => setField("canonicalType", e.target.value)}
                      className={INPUT_CLASS + " appearance-none pr-9 cursor-pointer"}
                    >
                      {CANONICAL_TYPES.map((t) => (
                        <option key={t} value={t}>{CANONICAL_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl border p-3.5 text-xs
                  bg-[var(--color-background-secondary)]/40
                  border-[var(--color-border)]"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <p className="font-semibold mb-1 text-[var(--color-text)]">What happens next?</p>
                <ul className="list-disc list-inside space-y-0.5" style={{ color: "var(--color-text-muted)" }}>
                  <li>A canonical customer record is created.</li>
                  <li>The company record is linked via <code className="text-[10px] px-1 py-0.5 rounded" style={{ background: "var(--color-surface)" }}>companyId</code>.</li>
                  <li>Deals, contacts and activities can be linked to the new customer.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
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
                  disabled={converting || !payload.companyId}
                  className="h-9 px-4 rounded-lg text-white text-sm font-semibold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed
                    bg-gradient-to-r from-amber-500 to-emerald-500
                    hover:shadow-lg
                    flex items-center gap-1.5"
                >
                  {converting ? (
                    <><SpinnerIcon size={14} className="animate-spin" /> Converting…</>
                  ) : (
                    <><ArrowRightLeft size={14} /> Convert Company</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConvertCompanyModal;
