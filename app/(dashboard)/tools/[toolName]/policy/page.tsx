"use client";

/**
 * app/(dashboard)/tools/[toolName]/policy/page.tsx
 * ─────────────────────────────────────────────────────────────
 * ToolPermissionMatrix — per-tool policy editor.
 *
 * Shows: tool header, then a grid of all agents × their policy
 * for this tool. Each row is editable inline.
 *
 * Save flow: PUT /api/tools/:name/policy → re-fetch matrix.
 * Never stores a "locally granted" permission — every save
 * round-trips through the API.
 *
 * States: loading skeleton, empty (no agents), error banner,
 * unauthorized (403) clearly surfaced.
 *
 * All colors from CSS variable tokens — no hardcoded hex/rgb.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getToolPolicyMatrix, updateToolPolicy } from "@/lib/api/toolsApi";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Save,
  Pencil,
  X,
  ShieldCheck,
  Bot,
  Wrench,
} from "lucide-react";
import { ToolCategoryBadge } from "@/components/tools/ToolCategoryBadge";
import { RiskTierBadge } from "@/components/agents/RiskTierBadge";
import { PermissionLevelBadge } from "@/components/agents/PermissionLevelBadge";
import type { Tool, AgentToolPolicy, UpdateToolPolicyPayload } from "@/types/tools";
import type { PermissionLevel } from "@/types/agents";

// ─── Constants ────────────────────────────────────────────────────────────────

const PERMISSION_LEVELS: { label: string; value: PermissionLevel }[] = [
  { label: "Read-only",              value: "READ_ONLY"              },
  { label: "Suggest",                value: "SUGGEST"                },
  { label: "Execute + Approval",     value: "EXECUTE_WITH_APPROVAL"  },
  { label: "Execute (limited)",      value: "EXECUTE_WITHIN_LIMITS"  },
  { label: "Autonomous",             value: "AUTONOMOUS"             },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MatrixSkeleton() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-pulse">
      <div className="h-5 w-24 bg-[color:var(--color-background-secondary)] rounded-lg" />
      <div className="h-28 bg-[color:var(--color-background-secondary)] rounded-2xl" />
      <div className="h-64 bg-[color:var(--color-background-secondary)] rounded-2xl" />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyAgents() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 bg-[color:var(--color-background-secondary)] rounded-2xl flex items-center justify-center mb-3">
        <Bot size={24} className="text-[color:var(--color-text-muted)]" />
      </div>
      <p className="text-sm font-semibold text-[color:var(--color-text)] mb-1">No agents assigned</p>
      <p className="text-xs text-[color:var(--color-text-muted)] max-w-xs">
        No agents have been configured for this tool yet. Register an agent and assign this tool to see policy rows here.
      </p>
    </div>
  );
}

// ─── Inline edit row ──────────────────────────────────────────────────────────

interface PolicyRowProps {
  toolName: string;
  policy: AgentToolPolicy;
  onSaved: () => void;
}

function PolicyRow({ toolName, policy, onSaved }: PolicyRowProps) {
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Local form state — only used during edit, never assumed as server state
  const [permLevel, setPermLevel]   = useState<PermissionLevel>(policy.permissionLevel);
  const [reqApproval, setReqApproval] = useState(policy.requireApproval);
  const [maxDaily, setMaxDaily]       = useState(policy.maxDailyExecutions ?? 0);
  const [allowedActionsRaw, setAllowedActionsRaw] = useState(
    (policy.allowedActions ?? []).join(", ")
  );

  const resetForm = () => {
    setPermLevel(policy.permissionLevel);
    setReqApproval(policy.requireApproval);
    setMaxDaily(policy.maxDailyExecutions ?? 0);
    setAllowedActionsRaw((policy.allowedActions ?? []).join(", "));
    setSaveError(null);
  };

  const handleSave = async () => {
    const payload: UpdateToolPolicyPayload = {
      agentId:          policy.agentId,
      permissionLevel:  permLevel,
      requireApproval:  reqApproval,
      maxDailyExecutions: maxDaily > 0 ? maxDaily : undefined,
      allowedActions: allowedActionsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      setSaving(true);
      setSaveError(null);
      await updateToolPolicy(toolName, payload);
      toast.success(`Policy saved for ${policy.agentName || policy.agentId}.`);
      setEditing(false);
      // Re-fetch matrix so UI reflects server state
      onSaved();
    } catch (err: any) {
      const msg = err.message ?? "Failed to save policy.";
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    setEditing(false);
  };

  return (
    <>
      <tr className={`border-b border-[color:var(--color-border-light)] transition-colors ${editing ? "bg-[color:var(--color-surface-active)]" : "hover:bg-[color:var(--color-surface-hover)]"}`}>
        {/* Agent */}
        <td className="px-5 py-4 whitespace-nowrap">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[color:var(--color-info-light)] flex items-center justify-center shrink-0">
              <Bot size={13} className="text-[color:var(--color-info)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[color:var(--color-text)]">
                {policy.agentName || policy.agentId}
              </p>
              {policy.agentName && (
                <p className="text-[10px] font-mono text-[color:var(--color-text-muted)]">{policy.agentId}</p>
              )}
            </div>
          </div>
        </td>

        {/* Permission level */}
        <td className="px-5 py-4 whitespace-nowrap">
          {editing ? (
            <select
              value={permLevel}
              onChange={(e) => setPermLevel(e.target.value as PermissionLevel)}
              className="text-xs font-semibold rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] px-2 py-1 focus:outline-none focus:border-[color:var(--color-primary)]"
            >
              {PERMISSION_LEVELS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          ) : (
            <PermissionLevelBadge level={policy.permissionLevel} variant="compact" />
          )}
        </td>

        {/* Require approval */}
        <td className="px-5 py-4 whitespace-nowrap">
          {editing ? (
            <button
              type="button"
              onClick={() => setReqApproval((v) => !v)}
              className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
                reqApproval
                  ? "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]"
                  : "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]"
              }`}
            >
              {reqApproval ? "Required" : "Not required"}
            </button>
          ) : (
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              policy.requireApproval
                ? "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]"
                : "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)] border-[color:var(--color-success-light)]"
            }`}>
              {policy.requireApproval ? "Required" : "Not required"}
            </span>
          )}
        </td>

        {/* Max daily */}
        <td className="px-5 py-4 whitespace-nowrap">
          {editing ? (
            <input
              type="number"
              min={0}
              value={maxDaily}
              onChange={(e) => setMaxDaily(Number(e.target.value))}
              className="w-20 text-xs rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] px-2 py-1 focus:outline-none focus:border-[color:var(--color-primary)]"
              placeholder="0 = ∞"
            />
          ) : (
            <span className="text-xs text-[color:var(--color-text-secondary)] font-medium">
              {policy.maxDailyExecutions ? `${policy.maxDailyExecutions}/day` : "Unlimited"}
            </span>
          )}
        </td>

        {/* Allowed actions */}
        <td className="px-5 py-4">
          {editing ? (
            <input
              type="text"
              value={allowedActionsRaw}
              onChange={(e) => setAllowedActionsRaw(e.target.value)}
              className="w-full text-xs font-mono rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] px-2 py-1 focus:outline-none focus:border-[color:var(--color-primary)]"
              placeholder="read, write, delete (comma-separated)"
            />
          ) : (
            <span className="text-xs text-[color:var(--color-text-muted)] font-mono">
              {policy.allowedActions?.length
                ? policy.allowedActions.join(", ")
                : <span className="italic">All actions</span>
              }
            </span>
          )}
        </td>

        {/* Actions */}
        <td className="px-5 py-4 text-right whitespace-nowrap">
          {editing ? (
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 text-[color:var(--color-primary-foreground)] rounded-xl transition-all"
              >
                {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] rounded-xl transition-all"
              >
                <X size={11} /> Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-primary)] hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Pencil size={11} /> Edit
            </button>
          )}
        </td>
      </tr>

      {/* Inline save-error row */}
      {saveError && editing && (
        <tr className="border-b border-[color:var(--color-border-light)]">
          <td colSpan={6} className="px-5 py-2">
            <p className="text-xs font-medium text-[color:var(--color-error)] flex items-center gap-1.5">
              <AlertCircle size={12} /> {saveError}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ToolPermissionMatrixPage() {
  const { user, token, isInitializing } = useAuth();
  const router = useRouter();
  const params = useParams();
  const toolName = typeof params?.toolName === "string"
    ? decodeURIComponent(params.toolName)
    : Array.isArray(params?.toolName)
      ? decodeURIComponent(params.toolName[0])
      : undefined;

  const [tool, setTool]               = useState<Tool | null>(null);
  const [policies, setPolicies]       = useState<AgentToolPolicy[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Auth guard — wait for initialisation before checking role
  useEffect(() => {
    if (isInitializing) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ADMIN") router.replace("/dashboard");
  }, [user, isInitializing, router]);

  const fetchMatrix = useCallback(async () => {
    if (!token || !toolName) return;
    try {
      setLoading(true);
      setError(null);
      const matrix = await getToolPolicyMatrix(toolName);
      setTool(matrix.tool);
      setPolicies(matrix.agentPolicies ?? []);
    } catch (err: any) {
      setError(err.message ?? "Failed to load tool matrix.");
    } finally {
      setLoading(false);
    }
  }, [token, toolName]);

  useEffect(() => { fetchMatrix(); }, [fetchMatrix]);

  if (!user) return null;
  if (loading) return <MatrixSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 max-w-[1400px] mx-auto">
        <AlertCircle size={48} className="text-[color:var(--color-error)] mb-4" />
        <h3 className="text-lg font-bold text-[color:var(--color-text)] mb-2">Failed to Load Matrix</h3>
        <p className="text-sm text-[color:var(--color-text-secondary)] max-w-md mb-6">{error}</p>
        <div className="flex gap-3">
          <button onClick={fetchMatrix} className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-[color:var(--color-primary-foreground)] text-sm font-semibold rounded-xl transition-all">
            <RefreshCw size={14} /> Retry
          </button>
          <button onClick={() => router.push("/tools")} className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all">
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[color:var(--color-text-muted)]">
        <button onClick={() => router.push("/tools")} className="hover:text-[color:var(--color-primary)] font-medium transition-colors flex items-center gap-1">
          <ArrowLeft size={12} /> Tool Registry
        </button>
        <ChevronRight size={12} />
        <span className="text-[color:var(--color-text)] font-semibold truncate max-w-[200px]">
          {tool?.displayName || toolName}
        </span>
        <ChevronRight size={12} />
        <span className="text-[color:var(--color-text-muted)]">Permission Matrix</span>
      </nav>

      {/* Tool header card */}
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[color:var(--color-background-secondary)] border border-[color:var(--color-border)] flex items-center justify-center shrink-0">
            <Wrench size={22} className="text-[color:var(--color-text-secondary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-[color:var(--color-text)] tracking-tight">
                {tool?.displayName || toolName}
              </h1>
              {tool?.name && tool.displayName && (
                <span className="text-[11px] font-mono text-[color:var(--color-text-muted)] bg-[color:var(--color-background-secondary)] px-2 py-0.5 rounded-md border border-[color:var(--color-border)]">
                  {tool.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {tool?.category && <ToolCategoryBadge category={tool.category} />}
              {tool?.riskTier && <RiskTierBadge tier={tool.riskTier} showLabel />}
              {tool?.enabled === false && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)] border-[color:var(--color-error-light)]">
                  Disabled
                </span>
              )}
            </div>
            {tool?.description && (
              <p className="mt-2 text-sm text-[color:var(--color-text-secondary)] leading-relaxed max-w-2xl">
                {tool.description}
              </p>
            )}
          </div>
          <button
            onClick={fetchMatrix}
            className="p-2 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-hover)] rounded-lg transition-all shrink-0"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 bg-[color:var(--color-info-light)] border border-[color:var(--color-info-light)] rounded-xl text-xs text-[color:var(--color-info-foreground)]">
        <ShieldCheck size={14} className="shrink-0 mt-0.5" />
        <p>
          Policies here are enforced server-side. Saving a row sends{" "}
          <span className="font-mono font-bold">PUT /api/tools/{toolName}/policy</span> — the backend
          re-validates and is the single source of truth. The matrix re-fetches after every save.
        </p>
      </div>

      {/* Matrix table */}
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[color:var(--color-border)]">
          <ShieldCheck size={15} className="text-[color:var(--color-primary)]" />
          <h2 className="text-sm font-bold text-[color:var(--color-text)]">Agent Permission Matrix</h2>
          <span className="ml-2 text-[11px] text-[color:var(--color-text-muted)] bg-[color:var(--color-background-secondary)] px-2 py-0.5 rounded-full border border-[color:var(--color-border)]">
            {policies.length} agent{policies.length !== 1 ? "s" : ""}
          </span>
        </div>

        {policies.length === 0 ? (
          <EmptyAgents />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-active)]">
                  {["Agent", "Permission Level", "Approval Required", "Daily Limit", "Allowed Actions", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-[color:var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="group">
                {policies.map((p) => (
                  <PolicyRow
                    key={p.agentId}
                    toolName={toolName as string}
                    policy={p}
                    onSaved={fetchMatrix}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
