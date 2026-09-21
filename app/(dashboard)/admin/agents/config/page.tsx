"use client";

/**
 * app/(dashboard)/admin/agents/config/page.tsx
 * ─────────────────────────────────────────────────────────────
 * Day 7 — Admin Agent Configuration Dashboard
 * Route: /admin/agents/config
 *
 * Allows ADMIN users to select an agent and configure its:
 * - System prompt
 * - Tool access scope (with backend-rejection surfacing)
 * - Trusted-content boundaries
 * - Safety controls
 *
 * Non-negotiable: backend rejections of out-of-scope tools are
 * always surfaced — never silently hidden.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  getAgentConfig,
  saveAgentConfig,
  listConfigurableAgents,
} from "@/lib/api/agentConfigApi";
import { AgentConfigForm } from "@/components/admin/AgentConfigForm";
import { toast } from "react-toastify";
import {
  Settings2,
  Bot,
  RefreshCw,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import type { AgentConfig, SaveAgentConfigPayload } from "@/lib/types/day7.ts";

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-9 bg-[color:var(--color-background-secondary)] rounded-xl w-64" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] p-5 space-y-3">
          <div className="h-4 bg-[color:var(--color-background-secondary)] rounded w-40" />
          <div className="h-24 bg-[color:var(--color-background-secondary)] rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AgentConfigPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [agents, setAgents]                   = useState<{ id: string; name: string }[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState(searchParams?.get("agentId") ?? "");
  const [config, setConfig]                   = useState<AgentConfig | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [agentsLoading, setAgentsLoading]     = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [rejectedToolIds, setRejectedToolIds] = useState<string[]>([]);
  const [saveMessage, setSaveMessage]         = useState<string | undefined>();

  // Auth + role guard
  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ADMIN") { router.replace("/dashboard"); }
  }, [user, router]);

  // Load agent list
  useEffect(() => {
    if (!token) return;
    setAgentsLoading(true);
    listConfigurableAgents()
      .then((list) => {
        setAgents(list);
        if (!selectedAgentId && list.length > 0) {
          setSelectedAgentId(list[0].id);
        }
      })
      .catch((err: any) => toast.error(err.message ?? "Failed to load agents."))
      .finally(() => setAgentsLoading(false));
  }, [token]);

  // Load config whenever selected agent changes
  const loadConfig = useCallback(async () => {
    if (!selectedAgentId || !token) return;
    setLoading(true);
    setError(null);
    setConfig(null);
    setRejectedToolIds([]);
    setSaveMessage(undefined);
    try {
      const c = await getAgentConfig(selectedAgentId);
      setConfig(c);
      // Sync agentId to URL
      router.replace(`/admin/agents/config?agentId=${selectedAgentId}`, { scroll: false });
    } catch (err: any) {
      const msg = err.message ?? "Failed to load configuration.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId, token, router]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async (payload: SaveAgentConfigPayload) => {
    setSaving(true);
    setRejectedToolIds([]);
    setSaveMessage(undefined);
    try {
      const res = await saveAgentConfig(selectedAgentId, payload);
      setConfig(res.config);
      if (res.rejectedToolIds && res.rejectedToolIds.length > 0) {
        setRejectedToolIds(res.rejectedToolIds);
        toast.warn(
          `Config saved with ${res.rejectedToolIds.length} rejected tool(s). See the form for details.`
        );
      } else {
        setSaveMessage(res.message ?? "Configuration saved successfully.");
        toast.success("Configuration saved.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[color:var(--color-info-light)] rounded-xl flex items-center justify-center shrink-0">
            <Settings2 size={20} className="text-[color:var(--color-info)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--color-text)] tracking-tight">
              Agent Configuration
            </h1>
            <p className="text-sm text-[color:var(--color-text-secondary)] mt-0.5">
              Configure system prompts, tool scopes, and safety controls per agent.
              Backend safety controls are always enforced — the UI surfaces rejections.
            </p>
          </div>
        </div>
      </div>

      {/* Agent selector */}
      <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm p-4">
        <label className="text-[11px] font-bold text-[color:var(--color-text-muted)] uppercase tracking-wider block mb-2">
          Select Agent
        </label>
        <div className="relative w-full max-w-sm">
          <Bot size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)] pointer-events-none" />
          <select
            value={selectedAgentId}
            disabled={agentsLoading}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-full pl-8 pr-8 py-2 text-sm font-semibold rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] appearance-none focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info-light)] focus:border-[color:var(--color-primary)] transition-all"
          >
            {agentsLoading ? (
              <option>Loading agents…</option>
            ) : agents.length === 0 ? (
              <option>No agents available</option>
            ) : (
              agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))
            )}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--color-text-muted)]" />
        </div>
      </div>

      {/* Loading */}
      {loading && <Skeleton />}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[color:var(--color-error-light)] border border-[color:var(--color-error-light)]">
          <AlertCircle size={18} className="text-[color:var(--color-error)] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-[color:var(--color-error-foreground)]">
              Failed to load configuration
            </p>
            <p className="text-xs text-[color:var(--color-error-foreground)] opacity-80 mt-1">{error}</p>
          </div>
          <button
            onClick={loadConfig}
            className="text-xs font-semibold text-[color:var(--color-error-foreground)] hover:underline shrink-0 inline-flex items-center gap-1"
          >
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}

      {/* Config form */}
      {!loading && !error && config && (
        <AgentConfigForm
          config={config}
          onSave={handleSave}
          saving={saving}
          rejectedToolIds={rejectedToolIds}
          saveSuccessMessage={saveMessage}
        />
      )}
    </div>
  );
}
