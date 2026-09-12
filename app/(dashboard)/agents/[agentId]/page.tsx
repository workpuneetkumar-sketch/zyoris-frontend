"use client";

/**
 * app/(dashboard)/agents/[agentId]/page.tsx
 * ─────────────────────────────────────────────────────────────
 * AgentDetail — full policy view for a single registered agent.
 *
 * Responsibilities:
 * - Fetch GET /api/agents/:id on mount and after every mutation
 * - Display the complete policy set: purpose, riskTier,
 *   permissionLevel, allowedTools, dataScope, modelPolicy,
 *   memoryPolicy, and full versionHistory
 * - Edit form (stretch goal): PUT /api/agents/:id with optional
 *   version-snapshot toggle and changelog field
 * - Explicit loading, empty, and error states
 * - Never infer or enforce permissions — render exactly what the
 *   server returns; controls only render when the backend permits
 *
 * Authorization note: the backend is the single source of truth.
 * The edit panel is rendered only when `agent.permissionLevel`
 * is not READ_ONLY — but even then the actual write is gated
 * server-side. A 403 from PUT is surfaced to the user.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getAgent, updateAgent } from "@/lib/api/agentApi";
import { toast } from "react-toastify";
import {
  Bot,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Pencil,
  X,
  Save,
  ChevronRight,
  Cpu,
  Brain,
  Database,
  Layers,
  History,
  Info,
  ToggleLeft,
  ToggleRight,
  Tag,
} from "lucide-react";
import { AgentStatusBadge } from "@/components/agents/AgentStatusBadge";
import { RiskTierBadge } from "@/components/agents/RiskTierBadge";
import { PermissionLevelBadge } from "@/components/agents/PermissionLevelBadge";
import { PolicyBlock } from "@/components/agents/PolicyBlock";
import { ToolChipList } from "@/components/agents/ToolChip";
import { ChangelogList } from "@/components/agents/ChangelogEntry";
import type { AgentDetail, UpdateAgentPayload } from "@/types/agents";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse max-w-[1400px] mx-auto">
      <div className="h-6 w-32 bg-gray-200 rounded-lg" />
      <div className="h-24 bg-gray-200 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="h-40 bg-gray-200 rounded-2xl" />
          <div className="h-40 bg-gray-200 rounded-2xl" />
          <div className="h-40 bg-gray-200 rounded-2xl" />
        </div>
        <div className="space-y-5">
          <div className="h-48 bg-gray-200 rounded-2xl" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Edit form ─────────────────────────────────────────────────────────────────

interface EditFormProps {
  agent: AgentDetail;
  onSave: (payload: UpdateAgentPayload) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function EditForm({ agent, onSave, onCancel, saving }: EditFormProps) {
  const [purpose, setPurpose] = useState(agent.purpose ?? "");
  const [allowedToolsRaw, setAllowedToolsRaw] = useState(
    (agent.allowedTools ?? []).join(", ")
  );
  const [createSnapshot, setCreateSnapshot] = useState(false);
  const [versionNumber, setVersionNumber] = useState("");
  const [changelog, setChangelog] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic client-side shape validation — real authz is server-side
    if (createSnapshot && !versionNumber.trim()) {
      toast.error("Version number is required when creating a snapshot.");
      return;
    }
    if (createSnapshot && !changelog.trim()) {
      toast.error("Changelog message is required when creating a snapshot.");
      return;
    }

    const payload: UpdateAgentPayload = {
      purpose:   purpose.trim() || undefined,
      allowedTools: allowedToolsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      ...(createSnapshot && {
        createVersionSnapshot: true,
        versionNumber: versionNumber.trim(),
        changelog:     changelog.trim(),
      }),
    };

    await onSave(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 space-y-5"
    >
      <div className="flex items-center gap-2 mb-1">
        <Pencil size={14} className="text-blue-600" />
        <h3 className="text-sm font-bold text-gray-800">Edit Agent Metadata</h3>
        <span className="ml-auto text-[10px] text-gray-400 font-medium">
          Backend validates all changes
        </span>
      </div>

      {/* Purpose */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Purpose
        </label>
        <textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          rows={2}
          className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
          placeholder="Describe what this agent does…"
        />
      </div>

      {/* Allowed tools */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Allowed Tools
          <span className="ml-1 font-normal text-gray-400">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={allowedToolsRaw}
          onChange={(e) => setAllowedToolsRaw(e.target.value)}
          className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          placeholder="web_search, crm_read, email_send…"
        />
      </div>

      {/* Version snapshot toggle */}
      <div className="pt-1 border-t border-gray-100">
        <button
          type="button"
          onClick={() => setCreateSnapshot((v) => !v)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-blue-600 transition-colors"
        >
          {createSnapshot ? (
            <ToggleRight size={18} className="text-blue-600" />
          ) : (
            <ToggleLeft size={18} className="text-gray-400" />
          )}
          Create version snapshot
        </button>

        {createSnapshot && (
          <div className="mt-3 space-y-3 pl-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Version Number
              </label>
              <input
                type="text"
                value={versionNumber}
                onChange={(e) => setVersionNumber(e.target.value)}
                className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="e.g. 1.1.0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Changelog
              </label>
              <textarea
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                rows={2}
                className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                placeholder="What changed in this version…"
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all"
        >
          {saving ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all"
        >
          <X size={14} />
          Cancel
        </button>
        <p className="ml-auto text-[11px] text-gray-400">
          Changes are applied only when the server confirms success
        </p>
      </div>
    </form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AgentDetailPage() {
  const { user, token, isInitializing } = useAuth();
  const router = useRouter();
  const params = useParams();
  const agentId = typeof params?.agentId === "string" ? params.agentId : Array.isArray(params?.agentId) ? params.agentId[0] : undefined;

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isInitializing) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ADMIN") { router.replace("/dashboard"); }
  }, [user, isInitializing, router]);

  // ── Fetch detail ───────────────────────────────────────────────────────────
  const fetchDetail = useCallback(async () => {
    if (!token || !agentId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getAgent(agentId as string);
      setAgent(data);
    } catch (err: any) {
      const msg = err.message ?? "Failed to load agent details.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token, agentId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // ── Save handler ───────────────────────────────────────────────────────────
  const handleSave = async (payload: UpdateAgentPayload) => {
    if (!agentId) return;
    try {
      setSaving(true);
      await updateAgent(agentId as string, payload);
      toast.success("Agent updated successfully.");
      setEditing(false);
      // Always re-fetch — never assume local state reflects server state
      await fetchDetail();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update agent.");
    } finally {
      setSaving(false);
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!user) return null;
  if (loading) return <DetailSkeleton />;

  if (error && !agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 max-w-[1400px] mx-auto">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Failed to Load Agent</h3>
        <p className="text-sm text-gray-500 max-w-md mb-6">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={fetchDetail}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all"
          >
            <RefreshCw size={14} /> Retry
          </button>
          <button
            onClick={() => router.push("/agents")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all"
          >
            <ArrowLeft size={14} /> Back to Registry
          </button>
        </div>
      </div>
    );
  }

  if (!agent) return null;

  // ── Derive display values ──────────────────────────────────────────────────
  const canEdit = agent.permissionLevel !== "READ_ONLY";

  const modelPolicyRows = [
    { label: "Default model",       value: agent.modelPolicy?.defaultModel,                  mono: true  },
    { label: "Allowed models",      value: agent.modelPolicy?.allowedModels?.join(", "),      mono: true  },
    { label: "Max tokens / call",   value: agent.modelPolicy?.maxTokensPerCall?.toLocaleString() },
    { label: "Notes",               value: agent.modelPolicy?.notes },
  ];

  const memoryPolicyRows = [
    { label: "Short-term memory",   value: agent.memoryPolicy?.shortTermEnabled != null
        ? (agent.memoryPolicy.shortTermEnabled ? "Enabled" : "Disabled") : undefined },
    { label: "Long-term memory",    value: agent.memoryPolicy?.longTermEnabled != null
        ? (agent.memoryPolicy.longTermEnabled ? "Enabled" : "Disabled") : undefined },
    { label: "Max memory items",    value: agent.memoryPolicy?.maxMemoryItems?.toLocaleString() },
    { label: "Retention",           value: agent.memoryPolicy?.retentionSeconds != null
        ? `${agent.memoryPolicy.retentionSeconds}s` : undefined },
    { label: "Notes",               value: agent.memoryPolicy?.notes },
  ];

  const dataScopeRows = [
    { label: "Allowed entities",    value: agent.dataScope?.allowedEntities?.join(", "),    mono: true  },
    { label: "Write access",        value: agent.dataScope?.writeAccess != null
        ? (agent.dataScope.writeAccess ? "Yes" : "No") : undefined },
    { label: "Restricted fields",   value: agent.dataScope?.restrictedFields?.join(", "),  mono: true  },
    { label: "Description",         value: agent.dataScope?.description },
  ];

  const governanceRows = [
    { label: "Agent ID",   value: agent.id,      mono: true },
    { label: "Version",    value: agent.version  ? `v${agent.version}` : undefined, mono: true },
    { label: "Created",    value: agent.createdAt
        ? new Date(agent.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
        : undefined },
    { label: "Updated",    value: agent.updatedAt
        ? new Date(agent.updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
        : undefined },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400">
        <button
          onClick={() => router.push("/agents")}
          className="hover:text-blue-600 font-medium transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={12} />
          Agent Registry
        </button>
        <ChevronRight size={12} />
        <span className="text-gray-700 font-semibold truncate max-w-[200px]">
          {agent.name}
        </span>
      </nav>

      {/* ── Hero header ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Icon */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Bot size={22} className="text-blue-600" />
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight truncate">
                {agent.name}
              </h1>
              {agent.version && (
                <span className="text-[11px] font-mono font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                  v{agent.version}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-2">
              <AgentStatusBadge status={agent.status} />
              <RiskTierBadge tier={agent.riskTier} />
              <PermissionLevelBadge level={agent.permissionLevel} variant="full" />
            </div>

            {agent.purpose && (
              <p className="mt-3 text-sm text-gray-600 leading-relaxed max-w-2xl">
                {agent.purpose}
              </p>
            )}
          </div>

          {/* Actions — only rendered when backend policy permits editing */}
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-700 hover:text-blue-700 text-sm font-semibold rounded-xl transition-all shrink-0"
            >
              <Pencil size={13} />
              Edit
            </button>
          )}

          <button
            onClick={fetchDetail}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all shrink-0"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Edit form (stretch goal) ────────────────────────────────────────── */}
      {editing && (
        <EditForm
          agent={agent}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
          saving={saving}
        />
      )}

      {/* ── Main content grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column (2/3) ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Allowed tools */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-violet-50">
                <Layers size={13} className="text-violet-600" />
              </span>
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-violet-700">
                Allowed Tools
              </h3>
              <span className="ml-auto text-[11px] text-gray-400 font-medium">
                {agent.allowedTools?.length ?? 0} tool{(agent.allowedTools?.length ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>
            <ToolChipList tools={agent.allowedTools ?? []} maxVisible={Infinity} />
          </div>

          {/* Data scope */}
          <PolicyBlock
            title="Data Scope"
            icon={<Database size={13} />}
            accent="emerald"
            rows={dataScopeRows}
          />

          {/* Model policy */}
          <PolicyBlock
            title="Model Policy"
            icon={<Brain size={13} />}
            accent="blue"
            rows={modelPolicyRows}
          />

          {/* Memory policy */}
          <PolicyBlock
            title="Memory Policy"
            icon={<Cpu size={13} />}
            accent="violet"
            rows={memoryPolicyRows}
          />
        </div>

        {/* ── Right column (1/3) ─────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Governance snapshot */}
          <PolicyBlock
            title="Governance"
            icon={<Info size={13} />}
            accent="slate"
            rows={governanceRows}
          />

          {/* Permission level detail card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-rose-50">
                <Tag size={13} className="text-rose-600" />
              </span>
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-rose-700">
                Capability Level
              </h3>
            </div>
            <PermissionLevelBadge level={agent.permissionLevel} variant="full" className="mb-3" />
            <p className="text-xs text-gray-500 leading-relaxed">
              This level is enforced server-side. The frontend renders it as
              returned by the backend and does not derive authorization logic
              from it.
            </p>
            {agent.permissionLevel === "AUTONOMOUS" && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                <p className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  Autonomous agents can act without approval. Verify this is
                  intentional and documented in the changelog.
                </p>
              </div>
            )}
          </div>

          {/* Version history */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-50">
                <History size={13} className="text-amber-600" />
              </span>
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-amber-700">
                Version History
              </h3>
              {agent.versionHistory && agent.versionHistory.length > 0 && (
                <span className="ml-auto text-[11px] text-gray-400 font-medium">
                  {agent.versionHistory.length} snapshot{agent.versionHistory.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <ChangelogList entries={agent.versionHistory ?? []} />
          </div>

        </div>
      </div>
    </div>
  );
}
