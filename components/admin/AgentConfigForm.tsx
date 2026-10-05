"use client";

/**
 * components/admin/AgentConfigForm.tsx
 * ─────────────────────────────────────────────────────────────
 * Day 7 — Agent Configuration Form
 *
 * Allows admins to configure:
 *   - System prompt (textarea with character count)
 *   - Tool access scope (checklist against AVAILABLE_TOOLS)
 *
 * Non-negotiables:
 * - Backend rejections of out-of-scope tools are SURFACED prominently,
 *   never hidden. The form shows a RejectedTools banner after save.
 * - The UI never grants or enforces permissions — it reflects what the
 *   server returns, including partial saves with rejected tool IDs.
 * - All colors via CSS variable tokens only.
 */

import { useState } from "react";
import classNames from "classnames";
import {
  Wrench,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
  ShieldCheck,
  Plus,
  Trash2,
} from "lucide-react";
import { AVAILABLE_TOOLS } from "@/lib/api/agentConfigApi";
import type {
  AgentConfig,
  SaveAgentConfigPayload,
  TrustedContentBoundary,
} from "@/lib/types/day7.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentConfigFormProps {
  config: AgentConfig;
  /** Whether privileged technical security settings may be shown */
  canViewSecurityControls: boolean;
  /** Called when the admin clicks "Save Configuration" */
  onSave: (payload: SaveAgentConfigPayload) => Promise<void>;
  /** Whether a save is in progress */
  saving: boolean;
  /** Tool IDs the backend rejected on the last save — shown in a banner */
  rejectedToolIds?: string[];
  /** Success message after a clean save */
  saveSuccessMessage?: string;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[color:var(--color-border-light)] bg-[color:var(--color-surface-active)]">
        <div className="w-7 h-7 rounded-lg bg-[color:var(--color-info-light)] flex items-center justify-center shrink-0">
          <Icon size={14} className="text-[color:var(--color-info)]" />
        </div>
        <div>
          <p className="text-sm font-bold text-[color:var(--color-text)]">{title}</p>
          {description && (
            <p className="text-xs text-[color:var(--color-text-muted)] mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Rejected tools banner ────────────────────────────────────────────────────

function RejectedToolsBanner({ toolIds }: { toolIds: string[] }) {
  const labels = toolIds.map(
    (id) => AVAILABLE_TOOLS.find((t) => t.id === id)?.label.replace(/^KB —/, "Knowledge Base —")
  ).filter((label): label is string => Boolean(label));
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[color:var(--color-error-light)] border border-[color:var(--color-error-light)]"
      role="alert"
      data-testid="rejected-tools-banner"
    >
      <XCircle size={16} className="text-[color:var(--color-error)] shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-bold text-[color:var(--color-error-foreground)]">
          {toolIds.length} tool{toolIds.length !== 1 ? "s" : ""} couldn't be added
        </p>
        <p className="text-xs text-[color:var(--color-error-foreground)] opacity-80 mt-1 leading-relaxed">
          These tools aren't available for this agent:
        </p>
        {labels.length > 0 ? (
          <ul className="mt-1.5 space-y-0.5">
            {labels.map((l) => (
              <li key={l} className="text-xs font-semibold text-[color:var(--color-error-foreground)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-error)] shrink-0" />
                {l}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs font-semibold text-[color:var(--color-error-foreground)] mt-1.5">
            Some tools were removed from this agent's scope.
          </p>
        )}
        <p className="text-xs text-[color:var(--color-error-foreground)] opacity-70 mt-2">
          Contact your administrator if this agent needs access to these tools.
        </p>
      </div>
    </div>
  );
}

// ─── Tool scope selector ──────────────────────────────────────────────────────

// Group tools by category for the checklist
const TOOL_CATEGORIES = Array.from(
  new Set(AVAILABLE_TOOLS.map((t) => t.category))
);

function ToolScopeSelector({
  selected,
  rejected,
  onChange,
}: {
  selected: string[];
  rejected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
    );
  };

  return (
    <div className="space-y-4" data-testid="tool-scope-selector">
      {TOOL_CATEGORIES.map((cat) => {
        const tools = AVAILABLE_TOOLS.filter((t) => t.category === cat);
        return (
          <div key={cat}>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-text-muted)] mb-2">
              {cat === "CRM" ? cat : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </p>
            <div className="space-y-1.5">
              {tools.map((tool) => {
                const isSelected = selected.includes(tool.id);
                const isRejected = rejected.includes(tool.id);
                return (
                  <label
                    key={tool.id}
                    className={classNames(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all",
                      isRejected
                        ? "border-[color:var(--color-error-light)] bg-[color:var(--color-error-light)] opacity-80 cursor-not-allowed"
                        : isSelected
                        ? "border-[color:var(--color-primary)] bg-[color:var(--color-info-light)]"
                        : "border-[color:var(--color-border-light)] bg-[color:var(--color-background-secondary)] hover:border-[color:var(--color-border)]"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isRejected}
                      onChange={() => toggle(tool.id)}
                      className="accent-[color:var(--color-primary)] w-3.5 h-3.5 shrink-0"
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-semibold text-[color:var(--color-text)] truncate">
                        {tool.label.replace(/^KB —/, "Knowledge Base —")}
                      </span>
                    </div>
                    {isRejected && (
                      <span className="text-[10px] font-bold text-[color:var(--color-error-foreground)] shrink-0">
                        Rejected
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function AgentConfigForm({
  config,
  canViewSecurityControls,
  onSave,
  saving,
  rejectedToolIds = [],
  saveSuccessMessage,
}: AgentConfigFormProps) {
  const [systemPrompt,      setSystemPrompt]      = useState(config.systemPrompt);
  const [allowedToolIds,    setAllowedToolIds]     = useState<string[]>(config.allowedToolIds);
  const [trustedContentBoundaries, setTrustedContentBoundaries] =
    useState<TrustedContentBoundary[]>(config.trustedContentBoundaries);
  const [maxTokensPerCall, setMaxTokensPerCall] = useState(config.maxTokensPerCall);
  const [promptInjectionDefenceEnabled, setPromptInjectionDefenceEnabled] =
    useState(config.promptInjectionDefenceEnabled);
  const [minConfidenceThreshold, setMinConfidenceThreshold] =
    useState(config.minConfidenceThreshold);
  const [dirty,             setDirty]              = useState(false);

  const markDirty = () => setDirty(true);

  const handleSave = async () => {
    await onSave({
      systemPrompt,
      allowedToolIds,
      trustedContentBoundaries: canViewSecurityControls
        ? trustedContentBoundaries
        : config.trustedContentBoundaries,
      maxTokensPerCall: canViewSecurityControls ? maxTokensPerCall : config.maxTokensPerCall,
      promptInjectionDefenceEnabled: canViewSecurityControls
        ? promptInjectionDefenceEnabled
        : config.promptInjectionDefenceEnabled,
      minConfidenceThreshold: canViewSecurityControls
        ? minConfidenceThreshold
        : config.minConfidenceThreshold,
    });
    setDirty(false);
  };

  return (
    <div className="space-y-5">
      {/* Rejected tools banner — shown after a save that had rejections */}
      {rejectedToolIds.length > 0 && (
        <RejectedToolsBanner toolIds={rejectedToolIds} />
      )}

      {/* Save success */}
      {saveSuccessMessage && rejectedToolIds.length === 0 && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[color:var(--color-success-light)] border border-[color:var(--color-success-light)]">
          <CheckCircle2 size={15} className="text-[color:var(--color-success)] shrink-0" />
          <p className="text-xs font-semibold text-[color:var(--color-success-foreground)]">
            {saveSuccessMessage}
          </p>
        </div>
      )}

      {/* ── System Prompt ────────────────────────────────────────────── */}
      <Section icon={Info} title="System Prompt" description="Defines the agent's behaviour and constraints for every invocation.">
        <div className="space-y-2">
          <textarea
            value={systemPrompt}
            onChange={(e) => { setSystemPrompt(e.target.value); markDirty(); }}
            rows={8}
            data-testid="system-prompt-input"
            className={classNames(
              "w-full px-4 py-3 text-xs font-mono text-[color:var(--color-text)] rounded-xl border resize-y",
              "bg-[color:var(--color-background-secondary)] border-[color:var(--color-border)]",
              "focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info-light)] focus:border-[color:var(--color-primary)]",
              "transition-all placeholder:text-[color:var(--color-text-muted)]"
            )}
            placeholder="Enter the system prompt…"
          />
          <p className="text-[10px] text-[color:var(--color-text-muted)] text-right">
            {systemPrompt.length} characters
          </p>
        </div>
      </Section>

      {/* ── Tool Scope ───────────────────────────────────────────────── */}
      <Section
        icon={Wrench}
        title="Tool Access Scope"
        description="Choose which tools this agent can use. Availability depends on the agent's access settings."
      >
        <ToolScopeSelector
          selected={allowedToolIds}
          rejected={rejectedToolIds}
          onChange={(ids) => { setAllowedToolIds(ids); markDirty(); }}
        />
      </Section>

      {canViewSecurityControls && (
        <>
          {/* ── Trusted-content boundaries ─────────────────────────────── */}
          <Section
            icon={ShieldCheck}
            title="Trusted-Content Boundaries"
            description="Define which sources the agent may treat as trusted, verified, or untrusted for prompt injection defence."
          >
            <div className="space-y-2">
              {trustedContentBoundaries.map((boundary, index) => (
                <div
                  key={`${boundary.label}-${index}`}
                  className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_auto_auto] gap-2 items-center rounded-xl bg-[color:var(--color-background-secondary)] p-2"
                >
                  <input
                    aria-label={`Boundary ${index + 1} label`}
                    value={boundary.label}
                    onChange={(event) => {
                      setTrustedContentBoundaries((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, label: event.target.value } : item
                        )
                      );
                      markDirty();
                    }}
                    placeholder="Source name"
                    className="min-w-0 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2.5 py-2 text-xs text-[color:var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info-light)]"
                  />
                  <input
                    aria-label={`Boundary ${index + 1} pattern`}
                    value={boundary.pattern}
                    onChange={(event) => {
                      setTrustedContentBoundaries((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, pattern: event.target.value } : item
                        )
                      );
                      markDirty();
                    }}
                    placeholder="Domain or URL pattern"
                    className="min-w-0 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2.5 py-2 text-xs font-mono text-[color:var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info-light)]"
                  />
                  <select
                    aria-label={`Boundary ${index + 1} trust level`}
                    value={boundary.trustLevel}
                    onChange={(event) => {
                      const trustLevel =
                        event.target.value === "TRUSTED"
                          ? "TRUSTED"
                          : event.target.value === "UNTRUSTED"
                          ? "UNTRUSTED"
                          : "VERIFIED";
                      setTrustedContentBoundaries((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, trustLevel } : item
                        )
                      );
                      markDirty();
                    }}
                    className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2.5 py-2 text-xs text-[color:var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info-light)]"
                  >
                    <option value="TRUSTED">Trusted</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="UNTRUSTED">Untrusted</option>
                  </select>
                  <span
                    className={classNames(
                      "rounded-full px-2.5 py-1 text-center text-[10px] font-bold",
                      boundary.trustLevel === "TRUSTED" &&
                        "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)]",
                      boundary.trustLevel === "VERIFIED" &&
                        "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)]",
                      boundary.trustLevel === "UNTRUSTED" &&
                        "bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)]"
                    )}
                  >
                    {boundary.trustLevel}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove boundary ${index + 1}`}
                    onClick={() => {
                      setTrustedContentBoundaries((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index)
                      );
                      markDirty();
                    }}
                    className="rounded-lg p-2 text-[color:var(--color-error)] transition-colors hover:bg-[color:var(--color-error-light)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setTrustedContentBoundaries((current) => [
                    ...current,
                    { label: "", pattern: "", trustLevel: "VERIFIED" },
                  ]);
                  markDirty();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--color-primary)] px-3 py-2 text-xs font-semibold text-[color:var(--color-primary)] transition-colors hover:bg-[color:var(--color-info-light)]"
              >
                <Plus size={13} /> Add Boundary
              </button>
            </div>
          </Section>

          {/* ── Safety controls ───────────────────────────────────────── */}
          <Section
            icon={ShieldCheck}
            title="Safety Controls"
            description="These parameters are advisory — the backend enforces its own hard limits regardless of these values."
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <label className="space-y-2">
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-text-muted)]">
                  Max tokens / call
                </span>
                <input
                  aria-label="Max tokens per call"
                  type="number"
                  min={256}
                  max={32768}
                  step={256}
                  value={maxTokensPerCall}
                  onChange={(event) => {
                    setMaxTokensPerCall(Number(event.target.value));
                    markDirty();
                  }}
                  className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background-secondary)] px-3 py-2.5 text-sm font-semibold text-[color:var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info-light)]"
                />
              </label>
              <label className="space-y-2">
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-text-muted)]">
                  Min confidence (0–100)
                </span>
                <div className="flex items-center gap-3">
                  <input
                    aria-label="Minimum confidence threshold"
                    type="range"
                    min={0}
                    max={100}
                    value={minConfidenceThreshold}
                    onChange={(event) => {
                      setMinConfidenceThreshold(Number(event.target.value));
                      markDirty();
                    }}
                    className="min-w-0 flex-1 accent-[color:var(--color-primary)]"
                  />
                  <span className="w-8 text-right text-sm font-bold text-[color:var(--color-text)]">
                    {minConfidenceThreshold}
                  </span>
                </div>
                <span className="block text-[10px] text-[color:var(--color-text-muted)]">
                  Responses below this threshold are flagged for human review.
                </span>
              </label>
              <div className="space-y-2">
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-text-muted)]">
                  Prompt injection defence
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={promptInjectionDefenceEnabled}
                  onClick={() => {
                    setPromptInjectionDefenceEnabled((enabled) => !enabled);
                    markDirty();
                  }}
                  className={classNames(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors",
                    promptInjectionDefenceEnabled
                      ? "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)]"
                      : "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)]"
                  )}
                >
                  <CheckCircle2 size={14} />
                  {promptInjectionDefenceEnabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>
          </Section>
        </>
      )}

      {/* ── Save button ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          data-testid="save-config-btn"
          className={classNames(
            "inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
            saving || !dirty
              ? "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border)] cursor-not-allowed"
              : "bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-[color:var(--color-primary-foreground)]"
          )}
        >
          {saving && <RefreshCw size={14} className="animate-spin" />}
          {saving ? "Saving…" : dirty ? "Save Configuration" : "No changes"}
        </button>
      </div>
    </div>
  );
}
