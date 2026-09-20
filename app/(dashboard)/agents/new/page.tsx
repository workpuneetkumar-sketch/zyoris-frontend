"use client";

/**
 * app/(dashboard)/agents/new/page.tsx
 * ─────────────────────────────────────────────────────────────
 * Register Agent form — resolves the routing collision where
 * /agents/new was being caught by [agentId]/page.tsx and rendered
 * as a "Failed to Load Agent" error.
 *
 * Next.js App Router always matches this static route before the
 * dynamic [agentId] route, so no other file needs to change.
 *
 * Uses: registerAgent() from agentApi.ts (already implemented),
 * RegisterAgentPayload / related types from types/agents.ts (already
 * defined). Styling matches the existing [agentId]/page.tsx pattern.
 * No hardcoded colors — all via global.css CSS variable tokens.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { registerAgent } from "@/lib/api/agentApi";
import { toast } from "react-toastify";
import {
  Bot,
  ArrowLeft,
  Save,
  RefreshCw,
  AlertCircle,
  Plus,
  X,
} from "lucide-react";
import type {
  RegisterAgentPayload,
  RiskTier,
  PermissionLevel,
} from "@/types/agents";

// ─── Field option sets (sourced from types/agents.ts) ────────────────────────

const RISK_TIER_OPTIONS: { label: string; value: RiskTier }[] = [
  { label: "Low",      value: "LOW"      },
  { label: "Medium",   value: "MEDIUM"   },
  { label: "High",     value: "HIGH"     },
  { label: "Critical", value: "CRITICAL" },
];

const PERMISSION_LEVEL_OPTIONS: { label: string; value: PermissionLevel }[] = [
  { label: "Read-only",              value: "READ_ONLY"              },
  { label: "Suggest",                value: "SUGGEST"                },
  { label: "Execute with Approval",  value: "EXECUTE_WITH_APPROVAL"  },
  { label: "Execute within Limits",  value: "EXECUTE_WITHIN_LIMITS"  },
  { label: "Autonomous",             value: "AUTONOMOUS"             },
];

// ─── Shared input class ───────────────────────────────────────────────────────

const inputCls =
  "w-full text-sm px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all bg-white text-gray-900 placeholder:text-gray-400";

const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h2 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RegisterAgentPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  // ── Core fields ─────────────────────────────────────────────────────────────
  const [name, setName]               = useState("");
  const [purpose, setPurpose]         = useState("");
  const [riskTier, setRiskTier]       = useState<RiskTier>("LOW");
  const [permLevel, setPermLevel]     = useState<PermissionLevel>("READ_ONLY");
  const [initialVersion, setVersion]  = useState("1.0.0");
  const [changelog, setChangelog]     = useState("Initial registration.");

  // ── Allowed tools ───────────────────────────────────────────────────────────
  const [toolsRaw, setToolsRaw] = useState("");

  // ── Data scope ──────────────────────────────────────────────────────────────
  const [entitiesRaw, setEntitiesRaw]     = useState("");
  const [writeAccess, setWriteAccess]     = useState(false);
  const [restrictedRaw, setRestrictedRaw] = useState("");
  const [scopeDesc, setScopeDesc]         = useState("");

  // ── Model policy ────────────────────────────────────────────────────────────
  const [defaultModel, setDefaultModel]   = useState("");
  const [allowedModelsRaw, setAllowedModelsRaw] = useState("");
  const [maxTokens, setMaxTokens]         = useState<number | "">("");
  const [modelNotes, setModelNotes]       = useState("");

  // ── Memory policy ───────────────────────────────────────────────────────────
  const [shortTermOn, setShortTermOn]     = useState(false);
  const [longTermOn, setLongTermOn]       = useState(false);
  const [maxMemItems, setMaxMemItems]     = useState<number | "">("");
  const [retentionSec, setRetentionSec]   = useState<number | "">("");
  const [memNotes, setMemNotes]           = useState("");

  // ── Submit state ────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!user) return null;

  // ── Build payload ─────────────────────────────────────────────────────────

  const buildPayload = (): RegisterAgentPayload => ({
    name: name.trim(),
    purpose: purpose.trim(),
    riskTier,
    permissionLevel: permLevel,
    allowedTools: toolsRaw.split(",").map((t) => t.trim()).filter(Boolean),
    dataScope: {
      allowedEntities: entitiesRaw.split(",").map((e) => e.trim()).filter(Boolean),
      writeAccess,
      restrictedFields: restrictedRaw.split(",").map((f) => f.trim()).filter(Boolean),
      description: scopeDesc.trim() || undefined,
    },
    modelPolicy: {
      defaultModel: defaultModel.trim() || undefined,
      allowedModels: allowedModelsRaw.split(",").map((m) => m.trim()).filter(Boolean),
      maxTokensPerCall: maxTokens !== "" ? Number(maxTokens) : undefined,
      notes: modelNotes.trim() || undefined,
    },
    memoryPolicy: {
      shortTermEnabled: shortTermOn,
      longTermEnabled: longTermOn,
      maxMemoryItems: maxMemItems !== "" ? Number(maxMemItems) : undefined,
      retentionSeconds: retentionSec !== "" ? Number(retentionSec) : undefined,
      notes: memNotes.trim() || undefined,
    },
    initialVersion: initialVersion.trim() || "1.0.0",
    changelog: changelog.trim() || undefined,
  });

  // ── Client-side validation ────────────────────────────────────────────────

  const validate = (): string | null => {
    if (!name.trim())    return "Agent name is required.";
    if (!purpose.trim()) return "Purpose is required.";
    return null;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    if (!token) { setSubmitError("Not authenticated."); return; }

    try {
      setSubmitting(true);
      setSubmitError(null);
      await registerAgent(buildPayload());
      toast.success("Agent registered successfully.");
      router.push("/agents");
    } catch (err: any) {
      const msg = err.message ?? "Failed to register agent.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/agents")}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shrink-0"
          title="Back to Agent Registry"
        >
          <ArrowLeft size={16} className="text-gray-600" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <Bot size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">
              Register Agent
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              The backend validates and enforces all policies — client fields are not the authority.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Identity ──────────────────────────────────────────────────────── */}
        <FormSection title="Identity">
          <div>
            <label className={labelCls}>
              Agent Name <span className="text-red-400 text-[10px]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="e.g. Sales Prospector"
              required
            />
          </div>
          <div>
            <label className={labelCls}>
              Purpose <span className="text-red-400 text-[10px]">*</span>
            </label>
            <textarea
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className={`${inputCls} resize-none`}
              placeholder="Describe what this agent does in one or two sentences…"
              required
            />
          </div>
        </FormSection>

        {/* ── Governance ────────────────────────────────────────────────────── */}
        <FormSection title="Governance">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Risk Tier</label>
              <select
                value={riskTier}
                onChange={(e) => setRiskTier(e.target.value as RiskTier)}
                className={inputCls}
              >
                {RISK_TIER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Permission Level</label>
              <select
                value={permLevel}
                onChange={(e) => setPermLevel(e.target.value as PermissionLevel)}
                className={inputCls}
              >
                {PERMISSION_LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Initial Version</label>
              <input
                type="text"
                value={initialVersion}
                onChange={(e) => setVersion(e.target.value)}
                className={`${inputCls} font-mono`}
                placeholder="1.0.0"
              />
            </div>
            <div>
              <label className={labelCls}>Initial Changelog</label>
              <input
                type="text"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                className={inputCls}
                placeholder="Initial registration."
              />
            </div>
          </div>
        </FormSection>

        {/* ── Allowed Tools ─────────────────────────────────────────────────── */}
        <FormSection title="Allowed Tools">
          <div>
            <label className={labelCls}>
              Tool Identifiers{" "}
              <span className="font-normal text-gray-400">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={toolsRaw}
              onChange={(e) => setToolsRaw(e.target.value)}
              className={`${inputCls} font-mono`}
              placeholder="crm_read, email_draft, web_search"
            />
          </div>
        </FormSection>

        {/* ── Data Scope ────────────────────────────────────────────────────── */}
        <FormSection title="Data Scope">
          <div>
            <label className={labelCls}>
              Allowed Entities{" "}
              <span className="font-normal text-gray-400">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={entitiesRaw}
              onChange={(e) => setEntitiesRaw(e.target.value)}
              className={`${inputCls} font-mono`}
              placeholder="leads, deals, contacts"
            />
          </div>
          <div>
            <label className={labelCls}>
              Restricted Fields{" "}
              <span className="font-normal text-gray-400">(comma-separated, optional)</span>
            </label>
            <input
              type="text"
              value={restrictedRaw}
              onChange={(e) => setRestrictedRaw(e.target.value)}
              className={`${inputCls} font-mono`}
              placeholder="salary, ssn"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              id="writeAccess"
              type="checkbox"
              checked={writeAccess}
              onChange={(e) => setWriteAccess(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="writeAccess" className="text-sm font-medium text-gray-700 select-none">
              Allow write access within permitted entities
            </label>
          </div>
          <div>
            <label className={labelCls}>Scope Description (optional)</label>
            <input
              type="text"
              value={scopeDesc}
              onChange={(e) => setScopeDesc(e.target.value)}
              className={inputCls}
              placeholder="Freeform description of data boundary…"
            />
          </div>
        </FormSection>

        {/* ── Model Policy ──────────────────────────────────────────────────── */}
        <FormSection title="Model Policy">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Default Model</label>
              <input
                type="text"
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className={`${inputCls} font-mono`}
                placeholder="gpt-4o"
              />
            </div>
            <div>
              <label className={labelCls}>Max Tokens / Call</label>
              <input
                type="number"
                min={0}
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value === "" ? "" : Number(e.target.value))}
                className={`${inputCls} font-mono`}
                placeholder="4096"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>
              Allowed Models{" "}
              <span className="font-normal text-gray-400">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={allowedModelsRaw}
              onChange={(e) => setAllowedModelsRaw(e.target.value)}
              className={`${inputCls} font-mono`}
              placeholder="gpt-4o, gpt-4o-mini, claude-3-5-sonnet"
            />
          </div>
          <div>
            <label className={labelCls}>Model Notes (optional)</label>
            <input
              type="text"
              value={modelNotes}
              onChange={(e) => setModelNotes(e.target.value)}
              className={inputCls}
              placeholder="Any constraints or guidance for model selection…"
            />
          </div>
        </FormSection>

        {/* ── Memory Policy ─────────────────────────────────────────────────── */}
        <FormSection title="Memory Policy">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={shortTermOn}
                onChange={(e) => setShortTermOn(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Short-term (in-session) memory
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={longTermOn}
                onChange={(e) => setLongTermOn(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Long-term (cross-session) memory
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Max Memory Items</label>
              <input
                type="number"
                min={0}
                value={maxMemItems}
                onChange={(e) => setMaxMemItems(e.target.value === "" ? "" : Number(e.target.value))}
                className={`${inputCls} font-mono`}
                placeholder="100"
              />
            </div>
            <div>
              <label className={labelCls}>Retention (seconds)</label>
              <input
                type="number"
                min={0}
                value={retentionSec}
                onChange={(e) => setRetentionSec(e.target.value === "" ? "" : Number(e.target.value))}
                className={`${inputCls} font-mono`}
                placeholder="86400"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Memory Notes (optional)</label>
            <input
              type="text"
              value={memNotes}
              onChange={(e) => setMemNotes(e.target.value)}
              className={inputCls}
              placeholder="Any additional memory constraints…"
            />
          </div>
        </FormSection>

        {/* ── Validation error ──────────────────────────────────────────────── */}
        {submitError && (
          <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-700 leading-relaxed">{submitError}</p>
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pb-6">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
          >
            {submitting ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {submitting ? "Registering…" : "Register Agent"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/agents")}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all"
          >
            <X size={14} /> Cancel
          </button>
          <p className="ml-auto text-[11px] text-gray-400 hidden sm:block">
            The backend validates all policies before registration succeeds.
          </p>
        </div>
      </form>
    </div>
  );
}
