"use client";

import { useState, useEffect } from "react";
import { X, Loader2 as SpinnerIcon, ArrowRightLeft, CheckCircle2, Briefcase, User, Building2, DollarSign, ToggleLeft, ToggleRight, UserPlus, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { ConvertLeadPayload, ConvertLeadResult } from "@/types/customers";
import { convertLeadToCustomer, fetchCustomerOwners } from "@/lib/api/customersApi";
import { fetchLeads } from "@/lib/api/leadsApi";
import { fetchCompanies } from "@/lib/api/companiesApi";
import { toast } from "react-toastify";
import type { Lead } from "@/types/leads";

export interface ConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: ConvertLeadResult) => void;
  prefillLeadId?: string;
}

const INPUT_CLASS = `w-full h-10 rounded-lg border px-3 text-sm outline-none transition-all
  bg-[var(--color-surface)]
  text-[var(--color-text)]
  border-[var(--color-border)]
  placeholder:text-[var(--color-text-muted)]
  focus:border-[var(--color-primary-light)]
  focus:ring-2 focus:ring-[var(--color-primary)]/25`;

export function ConvertLeadModal({ isOpen, onClose, onSuccess, prefillLeadId }: ConvertLeadModalProps) {
  const router = useRouter();

  const [payload, setPayload] = useState<ConvertLeadPayload>({
    leadId: "",
    companyId: "",
    ownerId: "",
    createDeal: true,
    dealName: "",
    dealAmount: 0,
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<ConvertLeadResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setResult(null);
    setLoadingLists(true);
    Promise.allSettled([
      fetchLeads(1, { status: "All Status", source: "All Sources", owner: "All Owners", search: "" }, 50),
      fetchCompanies(1, { status: "All Status", industry: "All Industries", search: "", owner: "All Owners" } as any),
      fetchCustomerOwners(),
    ]).then(([leadsRes, compRes, ownersRes]) => {
      let loadedLeads: Lead[] = [];
      if (leadsRes.status === "fulfilled") {
        loadedLeads = leadsRes.value.leads ?? [];
        setLeads(loadedLeads);
      }
      if (compRes.status === "fulfilled") {
        const raw: any = compRes.value as any;
        const arr = Array.isArray(raw?.companies) ? raw.companies : Array.isArray(raw?.data) ? raw.data : [];
        setCompanies(arr.map((c: any) => ({ id: c.id, name: c.name || c.companyName || "Unnamed" })));
      }
      if (ownersRes.status === "fulfilled") setOwners(ownersRes.value);
      // apply prefill after lists are loaded
      const targetLeadId = prefillLeadId;
      if (targetLeadId) {
        const l = loadedLeads.find((x) => x.id === targetLeadId);
        setPayload((prev) => ({
          ...prev,
          leadId: targetLeadId,
          dealName: prev.dealName || (l ? `${l.name} - New Deal` : ""),
          dealAmount: prev.dealAmount || (l && typeof l.estimatedValue === "number" ? l.estimatedValue : 0),
        }));
      }
    }).finally(() => setLoadingLists(false));
  }, [isOpen, prefillLeadId]);

  if (!isOpen) return null;

  const setField = <K extends keyof ConvertLeadPayload>(k: K, v: ConvertLeadPayload[K]) => {
    setPayload((p) => ({ ...p, [k]: v }));
  };

  const handleSelectLead = (id: string) => {
    const l = leads.find((x) => x.id === id);
    setPayload((prev) => ({
      ...prev,
      leadId: id,
      dealName: prev.dealName || (l ? `${l.name} - New Deal` : ""),
      dealAmount: prev.dealAmount || (l && typeof l.estimatedValue === "number" ? l.estimatedValue : 0),
    }));
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payload.leadId) {
      toast.warning("Please select a lead to convert.");
      return;
    }
    setConverting(true);
    try {
      const finalPayload: ConvertLeadPayload = { ...payload };
      if (!finalPayload.companyId?.trim()) delete (finalPayload as any).companyId;
      if (!finalPayload.ownerId?.trim()) delete (finalPayload as any).ownerId;
      if (!finalPayload.createDeal) {
        delete (finalPayload as any).dealName;
        delete (finalPayload as any).dealAmount;
      } else {
        if (!finalPayload.dealName?.trim()) delete (finalPayload as any).dealName;
        if (!finalPayload.dealAmount) delete (finalPayload as any).dealAmount;
      }

      const r = await convertLeadToCustomer(finalPayload);
      setResult(r);
      toast.success(r.message || "Lead converted successfully");
      onSuccess?.(r);
    } catch (err: any) {
      console.error("Convert lead error:", err);
      toast.error(err.message || "Failed to convert lead");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div
        className="w-full max-w-xl max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col
          bg-[var(--color-surface)]
          border border-[var(--color-border)]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center
                bg-gradient-to-br from-blue-500/20 to-violet-500/20"
            >
              <ArrowRightLeft size={16} style={{ color: "var(--color-primary)" }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)]">Convert Lead to Customer</h2>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Promote a lead into a contact + canonical customer.
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
                  Conversion Successful
                </p>
                <p className="text-xs mb-5" style={{ color: "var(--color-text-muted)" }}>
                  {result.message || "The lead has been promoted to a canonical customer."}
                </p>

                <div className="grid grid-cols-3 gap-2 w-full max-w-md mb-5">
                  {result.customerId && (
                    <button
                      onClick={() => { onClose(); router.push(`/customers/${result.customerId}`); }}
                      className="rounded-xl border p-3 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all hover:brightness-95
                        border-[var(--color-border)]
                        bg-[var(--color-surface)]
                        text-[var(--color-primary)]"
                    >
                      <UserPlus size={18} />
                      <div>Open Customer</div>
                      <div className="text-[10px] font-normal text-[var(--color-text-muted)] truncate max-w-full">{result.customerId.slice(0, 8)}…</div>
                    </button>
                  )}
                  {result.contactId && (
                    <button
                      onClick={() => { onClose(); router.push(`/contacts`); }}
                      className="rounded-xl border p-3 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all hover:brightness-95
                        border-[var(--color-border)]
                        bg-[var(--color-surface)]
                        text-[var(--color-text-secondary)]"
                    >
                      <User size={18} />
                      <div>View Contacts</div>
                    </button>
                  )}
                  {result.dealId && (
                    <button
                      onClick={() => { onClose(); router.push(`/deals/${result.dealId}`); }}
                      className="rounded-xl border p-3 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all hover:brightness-95
                        border-[var(--color-border)]
                        bg-[var(--color-surface)]
                        text-[var(--color-primary)]"
                    >
                      <Briefcase size={18} />
                      <div>Open Deal</div>
                      <div className="text-[10px] font-normal text-[var(--color-text-muted)] truncate max-w-full">{result.dealId.slice(0, 8)}…</div>
                    </button>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="h-9 px-5 rounded-lg text-white text-sm font-semibold transition-all
                    bg-[var(--color-primary)]
                    hover:brightness-110"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConvert} className="p-5 space-y-4">
              {/* Lead */}
              <div>
                <label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                  <Briefcase size={12} /> Lead to Convert
                  <span style={{ color: "var(--color-error)" }}> *</span>
                </label>
                <div className="relative">
                  <select
                    disabled={loadingLists || converting}
                    value={payload.leadId}
                    onChange={(e) => handleSelectLead(e.target.value)}
                    className={INPUT_CLASS + " appearance-none pr-9 cursor-pointer" + (loadingLists ? " opacity-60" : "")}
                  >
                    <option value="">Select a lead…</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}{l.email ? ` (${l.email})` : ""}{l.status ? ` — ${l.status}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Company + Owner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <Building2 size={12} /> Company
                  </label>
                  <div className="relative">
                    <select
                      disabled={loadingLists || converting}
                      value={payload.companyId}
                      onChange={(e) => setField("companyId", e.target.value)}
                      className={INPUT_CLASS + " appearance-none pr-9 cursor-pointer"}
                    >
                      <option value="">(None / New)</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
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
                      <option value="">(Inherit from lead)</option>
                      {owners.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Create deal toggle */}
              <div
                className="rounded-xl border p-3.5
                  bg-[var(--color-background-secondary)]/40
                  border-[var(--color-border)]"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => setField("createDeal", !payload.createDeal)}
                      className="mt-0.5"
                      style={{ color: payload.createDeal ? "var(--color-primary)" : "var(--color-text-muted)" }}
                    >
                      {payload.createDeal ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text)]">Create a Deal</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                        Optionally generate a new deal record for this conversion.
                      </p>
                    </div>
                  </div>
                </div>

                {payload.createDeal && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-9">
                    <div>
                      <label className="text-[11px] font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
                        Deal Name
                      </label>
                      <input
                        value={payload.dealName}
                        onChange={(e) => setField("dealName", e.target.value)}
                        placeholder="[Lead Name] - New Deal"
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium mb-1 flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                        <DollarSign size={12} /> Deal Amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={payload.dealAmount ?? 0}
                        onChange={(e) => setField("dealAmount", Number(e.target.value) || 0)}
                        placeholder="0"
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
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
                  disabled={converting || !payload.leadId}
                  className="h-9 px-4 rounded-lg text-white text-sm font-semibold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed
                    bg-gradient-to-r from-[var(--color-primary-dark)] to-violet-500
                    hover:shadow-lg
                    flex items-center gap-1.5"
                >
                  {converting ? (
                    <><SpinnerIcon size={14} className="animate-spin" /> Converting…</>
                  ) : (
                    <><ArrowRightLeft size={14} /> Convert Lead</>
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

export default ConvertLeadModal;
