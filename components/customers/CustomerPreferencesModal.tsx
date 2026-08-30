"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2 as SpinnerIcon,
  Settings2,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Clock,
  MessageSquare,
  ShieldCheck,
  BellOff,
  Calendar,
} from "lucide-react";
import { CustomerPreferences } from "@/types/customers";
import { fetchCustomerPreferences, updateCustomerPreferences } from "@/lib/api/customersApi";
import { toast } from "react-toastify";

const INPUT_CLASS = `w-full h-10 rounded-lg border px-3 text-sm outline-none transition-all
  bg-[var(--color-surface)]
  text-[var(--color-text)]
  border-[var(--color-border)]
  placeholder:text-[var(--color-text-muted)]
  focus:border-[var(--color-primary-light)]
  focus:ring-2 focus:ring-[var(--color-primary)]/25`;

const CONSENT_OPTIONS = ["GRANTED", "PENDING", "WITHDRAWN", "NOT_SET"];
const CHANNEL_OPTIONS = ["EMAIL", "PHONE", "SMS", "WHATSAPP", "IN_APP", "NONE"];

const COMMON_TIMEZONES = [
  "UTC", "America/New_York", "America/Los_Angeles", "America/Chicago",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Kolkata",
  "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney",
];

const COMMON_LANGS = [
  "en", "es", "fr", "de", "it", "pt", "ja", "zh", "hi", "ar", "ru",
];

export interface CustomerPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
}

type ModalView = "view" | "edit";

export function CustomerPreferencesModal({
  isOpen,
  onClose,
  customerId,
  customerName,
}: CustomerPreferencesModalProps) {
  const [view, setView] = useState<ModalView>("view");
  const [prefs, setPrefs] = useState<CustomerPreferences>({});
  const [editPrefs, setEditPrefs] = useState<CustomerPreferences>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen && customerId) {
      loadPreferences();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  async function loadPreferences() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchCustomerPreferences(customerId);
      setPrefs(data);
      setEditPrefs(data);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to load preferences.");
    } finally {
      setLoading(false);
    }
  }

  const setField = <K extends keyof CustomerPreferences>(k: K, v: CustomerPreferences[K]) => {
    setEditPrefs((p) => ({ ...p, [k]: v }));
    if (errorMsg) setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const updated = await updateCustomerPreferences(customerId, editPrefs);
      setPrefs(updated);
      setEditPrefs(updated);
      setSaved(true);
      toast.success("Preferences updated successfully!");
      setTimeout(() => setSaved(false), 2500);
      setView("view");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to save preferences.");
      toast.error(err?.message ?? "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const Row = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-b-0" style={{ borderColor: "var(--color-border-light)" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "var(--color-background-secondary)" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-[var(--color-text-muted)] font-medium">{label}</p>
        <div className="text-sm font-medium text-[var(--color-text)] mt-0.5">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--color-border-light)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-teal-500/20 to-cyan-500/20">
              <Settings2 size={18} className="text-teal-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)]">Customer Preferences</h2>
              {customerName && (
                <p className="text-[11px] text-[var(--color-text-muted)]">{customerName}</p>
              )}
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
          {(["view", "edit"] as ModalView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors capitalize ${
                view === v
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              }`}
            >
              {v === "view" ? "View" : "Edit Preferences"}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <SpinnerIcon size={24} className="animate-spin text-[var(--color-primary)]" />
            </div>
          ) : errorMsg && view === "view" ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 px-3 py-2.5 m-2">
              <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-400">{errorMsg}</p>
            </div>
          ) : view === "view" ? (
            <div>
              <Row
                icon={<Globe size={14} className="text-blue-500" />}
                label="Language"
                value={prefs.language ?? <span className="text-[var(--color-text-muted)]">—</span>}
              />
              <Row
                icon={<Clock size={14} className="text-violet-500" />}
                label="Timezone"
                value={prefs.timezone ?? <span className="text-[var(--color-text-muted)]">—</span>}
              />
              <Row
                icon={<MessageSquare size={14} className="text-emerald-500" />}
                label="Preferred Channel"
                value={prefs.preferredChannel ?? <span className="text-[var(--color-text-muted)]">—</span>}
              />
              <Row
                icon={<ShieldCheck size={14} className="text-cyan-500" />}
                label="Consent Status"
                value={
                  prefs.consentStatus ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                      prefs.consentStatus === "GRANTED" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" :
                      prefs.consentStatus === "WITHDRAWN" ? "bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-300" :
                      "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                    }`}>{prefs.consentStatus}</span>
                  ) : <span className="text-[var(--color-text-muted)]">—</span>
                }
              />
              <Row
                icon={<BellOff size={14} className="text-rose-500" />}
                label="Do Not Contact"
                value={
                  prefs.doNotContact != null ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                      prefs.doNotContact
                        ? "bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                    }`}>
                      {prefs.doNotContact ? "Yes — Do Not Contact" : "No — Can Contact"}
                    </span>
                  ) : <span className="text-[var(--color-text-muted)]">—</span>
                }
              />
              {prefs.importantDates && Object.keys(prefs.importantDates).length > 0 && (
                <Row
                  icon={<Calendar size={14} className="text-amber-500" />}
                  label="Important Dates"
                  value={
                    <pre className="text-[10px] font-mono text-[var(--color-text-secondary)] whitespace-pre-wrap">
                      {JSON.stringify(prefs.importantDates, null, 2)}
                    </pre>
                  }
                />
              )}
            </div>
          ) : (
            /* Edit view */
            <form id="prefs-form" onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block flex items-center gap-1">
                    <Globe size={11} /> Language
                  </label>
                  <select
                    className={INPUT_CLASS}
                    value={editPrefs.language ?? ""}
                    onChange={(e) => setField("language", e.target.value || null)}
                  >
                    <option value="">— Not set —</option>
                    {COMMON_LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block flex items-center gap-1">
                    <Clock size={11} /> Timezone
                  </label>
                  <select
                    className={INPUT_CLASS}
                    value={editPrefs.timezone ?? ""}
                    onChange={(e) => setField("timezone", e.target.value || null)}
                  >
                    <option value="">— Not set —</option>
                    {COMMON_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block flex items-center gap-1">
                    <MessageSquare size={11} /> Preferred Channel
                  </label>
                  <select
                    className={INPUT_CLASS}
                    value={editPrefs.preferredChannel ?? ""}
                    onChange={(e) => setField("preferredChannel", e.target.value || null)}
                  >
                    <option value="">— Not set —</option>
                    {CHANNEL_OPTIONS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1 block flex items-center gap-1">
                    <ShieldCheck size={11} /> Consent Status
                  </label>
                  <select
                    className={INPUT_CLASS}
                    value={editPrefs.consentStatus ?? ""}
                    onChange={(e) => setField("consentStatus", e.target.value || null)}
                  >
                    <option value="">— Not set —</option>
                    {CONSENT_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer select-none"
                style={{ borderColor: "var(--color-border)", background: "var(--color-background-secondary)" }}
                onClick={() => setField("doNotContact", !editPrefs.doNotContact)}
              >
                <div className={`w-10 h-6 rounded-full relative transition-colors ${editPrefs.doNotContact ? "bg-red-500" : "bg-[var(--color-border)]"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${editPrefs.doNotContact ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">Do Not Contact</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {editPrefs.doNotContact ? "This customer will not be contacted." : "Customer can receive communications."}
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 px-3 py-2.5">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-400">{errorMsg}</p>
                </div>
              )}
            </form>
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
          {view === "view" ? (
            <button
              type="button"
              onClick={() => setView("edit")}
              className="h-9 px-5 rounded-lg text-white text-sm font-semibold transition-all shadow-sm hover:brightness-110 flex items-center gap-2"
              style={{ background: "var(--color-primary)" }}
            >
              <Settings2 size={14} /> Edit Preferences
            </button>
          ) : (
            <button
              type="submit"
              form="prefs-form"
              disabled={saving}
              className="h-9 px-5 rounded-lg text-white text-sm font-semibold transition-all shadow-sm hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ background: "var(--color-primary)" }}
            >
              {saving ? <SpinnerIcon size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Settings2 size={14} />}
              {saving ? "Saving…" : saved ? "Saved!" : "Save Preferences"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
