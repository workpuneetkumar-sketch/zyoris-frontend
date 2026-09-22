"use client";

/**
 * components/admin/AgentConfigForm.tsx
 * ─────────────────────────────────────────────────────────────
 * Day 7 — Agent Configuration Form
 *
 * Allows admins to configure:
 *   - System prompt (textarea with character count)
 *   - Tool access scope (checklist against AVAILABLE_TOOLS)
 *   - Trusted-content boundaries (add/remove/edit trust level)
 *   - Safety controls (maxTokens, promptInjectionDefence, minConfidence)
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
  ShieldCheck,
  AlertTriangle,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
  Lock,
  ChevronDown,
} from "lucide-react";
import { AVAILABLE_TOOLS } from "@/lib/api/agentConfigApi";
import type {
  AgentConfig,
  SaveAgentConfigPayload,
  TrustedContentBoundary,
  ContentTrustLevel,
} from "@/lib/types/day7.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentConfigFormProps {
  config: AgentConfig;
  /** Called when the admin clicks "Save Configuration" */
  onSave: (payload: SaveAgentConfigPayload) => Promise<void>;
  /** Whether a save is in progress */
  saving: boolean;
  /** Tool IDs the backend rejected on the last save — shown in a banner */
  rejectedToolIds?: string[];
  /** Success message after a clean save */
  saveSuccessMessage?: string;
}

// ─── Trust level badge ────────────────────────────────────────────────────────

const TRUST_STYLES: Record<ContentTrustLevel, { pill: string; label: string }> = {
  TRUSTED:   { pill: "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)] border-[color:var(--color-success-light)]",  label: "Trusted"   },
  VERIFIED:  { pill: "bg-[color:var(--color-warning-light)] text-[color:var(--color-warning-foreground)] border-[color:var(--color-warning-light)]",  label: "Verified"  },
  UNTRUSTED: { pill: "bg-[color:var(--color-error-light)]   text-[color:var(--color-error-foreground)]   border-[color:var(--color-error-light)]",    label: "Untrusted" },
};

function TrustBadge({ level }: { level: ContentTrustLevel }) {
  const s = TRUST_STYLES[level] ?? TRUST_STYLES.UNTRUSTED;
  return (
    <span className={classNames(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
      s.pill
    )}>
      {s.label}
    </span>
  );
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
    (id) => AVAILABLE_TOOLS.find((t) => t.id === id)?.label ?? id
  );
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[color:var(--color-error-light)] border border-[color:var(--color-error-light)]"
      role="alert"
      data-testid="rejected-tools-banner"
    >
      <XCircle size={16} className="text-[color:var(--color-error)] shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-bold text-[color:var(--color-error-foreground)]">
          {toolIds.length} tool{toolIds.length !== 1 ? "s" : ""} rejected by the backend
        </p>
        <p className="text-xs text-[color:var(--color-error-foreground)] opacity-80 mt-1 leading-relaxed">
          The following tools were removed from this agent's scope because they exceed its
          permission tier or are not registered in the Tool Registry:
        </p>
        <ul className="mt-1.5 space-y-0.5">
          {labels.map((l) => (
            <li key={l} className="text-xs font-semibold text-[color:var(--color-error-foreground)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-error)] shrink-0" />
              {l}
            </li>
          ))}
        </ul>
        <p className="text-xs text-[color:var(--color-error-foreground)] opacity-70 mt-2">
          To grant access to these tools, raise the agent's permission tier in the
          Agent Registry first, then re-save this configuration.
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

const RISK_DOT: Record<string, string> = {
  LOW:      "bg-[color:var(--color-success)]",
  MEDIUM:   "bg-[color:var(--color-warning)]",
  HIGH:     "bg-[color:var(--color-error)]",
  CRITICAL: "bg-[color:var(--color-error)]",
};

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
              {cat}
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
                      <span
                        className={classNames(
                          "w-2 h-2 rounded-full shrink-0",
                          RISK_DOT[tool.riskTier] ?? "bg-gray-400"
                        )}
                        title={`Risk: ${tool.riskTier}`}
                      />
                      <span className="text-xs font-semibold text-[color:var(--color-text)] truncate">
                        {tool.label}
                      </span>
                      <code className="text-[10px] font-mono text-[color:var(--color-text-muted)] shrink-0">
                        {tool.id}
                      </code>
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
      <p className="text-[10px] text-[color:var(--color-text-muted)] flex items-center gap-1.5 mt-2">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[color:var(--color-success)]" /> LOW
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[color:var(--color-warning)]" /> MEDIUM
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[color:var(--color-error)]" /> HIGH / CRITICAL
        </span>
        <span className="ml-1">— risk tiers</span>
      </p>
    </div>
  );
}

// ─── Trusted content boundaries ───────────────────────────────────────────────

function BoundaryRow({
  boundary,
  onChange,
  onRemove,
}: {
  boundary: TrustedContentBoundary;
  onChange: (b: TrustedContentBoundary) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl border border-[color:var(--color-border-light)] bg-[color:var(--color-background-secondary)]">
      <input
        type="text"
        value={boundary.label}
        onChange={(e) => onChange({ ...boundary, label: e.target.value })}
        placeholder="Label…"
        className="flex-1 min-w-0 text-xs font-semibold bg-transparent text-[color:var(--color-text)] focus:outline-none placeholder:text-[color:var(--color-text-muted)]"
      />
      <input
        type="text"
        value={boundary.pattern}
        onChange={(e) => onChange({ ...boundary, pattern: e.target.value })}
        placeholder="*.domain.com"
        className="flex-1 min-w-0 text-xs font-mono bg-transparent text-[color:var(--color-text-secondary)] focus:outline-none placeholder:text-[color:var(--color-text-muted)]"
      />
      <div className="relative">
        <select
          value={boundary.trustLevel}
          onChange={(e) =>
            onChange({ ...boundary, trustLevel: e.target.value as ContentTrustLevel })
          }
          className="appearance-none text-xs font-semibold pr-5 bg-transparent text-[color:var(--color-text)] focus:outline-none cursor-pointer"
        >
          <option value="TRUSTED">Trusted</option>
          <option value="VERIFIED">Verified</option>
          <option value="UNTRUSTED">Untrusted</option>
        </select>
        <ChevronDown size={11} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--color-text-muted)]" />
      </div>
      <TrustBadge level={boundary.trustLevel} />
      <button
        onClick={onRemove}
        className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-[color:var(--color-error-light)] transition-colors shrink-0"
        title="Remove boundary"
      >
        <Trash2 size={11} className="text-[color:var(--color-error)]" />
      </button>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function AgentConfigForm({
  config,
  onSave,
  saving,
  rejectedToolIds = [],
  saveSuccessMessage,
}: AgentConfigFormProps) {
  const [systemPrompt,      setSystemPrompt]      = useState(config.systemPrompt);
  const [allowedToolIds,    setAllowedToolIds]     = useState<string[]>(config.allowedToolIds);
  const [boundaries,        setBoundaries]         = useState<TrustedContentBoundary[]>(
    config.trustedContentBoundaries
  );
  const [maxTokens,         setMaxTokens]          = useState(config.maxTokensPerCall);
  const [injectionDefence,  setInjectionDefence]   = useState(config.promptInjectionDefenceEnabled);
  const [minConfidence,     setMinConfidence]       = useState(config.minConfidenceThreshold);
  const [dirty,             setDirty]              = useState(false);

  const markDirty = () => setDirty(true);

  const addBoundary = () => {
    setBoundaries((prev) => [
      ...prev,
      { label: "", pattern: "", trustLevel: "VERIFIED" },
    ]);
    markDirty();
  };

  const handleSave = async () => {
    await onSave({
      systemPrompt,
      allowedToolIds,
      trustedContentBoundaries: boundaries,
      maxTokensPerCall: maxTokens,
      promptInjectionDefenceEnabled: injectionDefence,
      minConfidenceThreshold: minConfidence,
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

      {/* Safety controls note */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[color:var(--color-background-secondary)] border border-[color:var(--color-border-light)]">
        <Lock size={14} className="text-[color:var(--color-text-muted)] shrink-0 mt-0.5" />
        <p className="text-xs text-[color:var(--color-text-secondary)] leading-relaxed">
          This form configures advisory parameters. Backend safety controls, permission
          enforcement, and tool-scope validation are <strong>always enforced server-side</strong> —
          the UI never bypasses them. Rejected tools will be surfaced here after save.
        </p>
      </div>

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
        description="Select which tools this agent may invoke. Backend validates against the Tool Registry and the agent's permission tier."
      >
        <ToolScopeSelector
          selected={allowedToolIds}
          rejected={rejectedToolIds}
          onChange={(ids) => { setAllowedToolIds(ids); markDirty(); }}
        />
      </Section>

      {/* ── Trusted Content Boundaries ───────────────────────────────── */}
      <Section
        icon={ShieldCheck}
        title="Trusted-Content Boundaries"
        description="Define which sources the agent may treat as trusted, verified, or untrusted for prompt injection defence."
      >
        <div className="space-y-2">
          {boundaries.length === 0 && (
            <p className="text-xs text-[color:var(--color-text-muted)] py-3 text-center">
              No boundaries configured. All external content will be treated as UNTRUSTED.
            </p>
          )}
          {boundaries.map((b, i) => (
            <BoundaryRow
              key={i}
              boundary={b}
              onChange={(updated) => {
                setBoundaries((prev) => prev.map((x, j) => (j === i ? updated : x)));
                markDirty();
              }}
              onRemove={() => {
                setBoundaries((prev) => prev.filter((_, j) => j !== i));
                markDirty();
              }}
            />
          ))}
          <button
            onClick={addBoundary}
            className={classNames(
              "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all",
              "text-[color:var(--color-primary)] border-[color:var(--color-primary)]",
              "hover:bg-[color:var(--color-info-light)]"
            )}
          >
            <Plus size={12} /> Add Boundary
          </button>
        </div>
      </Section>

      {/* ── Safety Controls ──────────────────────────────────────────── */}
      <Section
        icon={AlertTriangle}
        title="Safety Controls"
        description="These parameters are advisory — the backend enforces its own hard limits regardless of these values."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Max tokens */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[color:var(--color-text-muted)] uppercase tracking-wide">
              Max Tokens / Call
            </label>
            <input
              type="number"
              min={256}
              max={32768}
              step={256}
              value={maxTokens}
              data-testid="max-tokens-input"
              onChange={(e) => { setMaxTokens(Number(e.target.value)); markDirty(); }}
              className={classNames(
                "w-full px-3 py-2 text-sm font-semibold rounded-xl border",
                "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text)]",
                "border-[color:var(--color-border)] focus:outline-none focus:ring-2",
                "focus:ring-[color:var(--color-info-light)] focus:border-[color:var(--color-primary)]"
              )}
            />
          </div>

          {/* Min confidence */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[color:var(--color-text-muted)] uppercase tracking-wide">
              Min Confidence (0–100)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={minConfidence}
                data-testid="min-confidence-slider"
                onChange={(e) => { setMinConfidence(Number(e.target.value)); markDirty(); }}
                className="flex-1 accent-[color:var(--color-primary)]"
              />
              <span className="text-sm font-bold text-[color:var(--color-text)] w-8 text-right">
                {minConfidence}
              </span>
            </div>
            <p className="text-[10px] text-[color:var(--color-text-muted)]">
              Responses below this threshold are flagged for human review.
            </p>
          </div>

          {/* Prompt injection defence */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[color:var(--color-text-muted)] uppercase tracking-wide">
              Prompt Injection Defence
            </label>
            <button
              onClick={() => { setInjectionDefence((v) => !v); markDirty(); }}
              data-testid="injection-defence-toggle"
              className={classNames(
                "flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all w-full",
                injectionDefence
                  ? "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)] border-[color:var(--color-success-light)]"
                  : "bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)] border-[color:var(--color-error-light)]"
              )}
            >
              {injectionDefence
                ? <><CheckCircle2 size={13} /> Enabled</>
                : <><XCircle size={13} /> Disabled</>}
            </button>
            {!injectionDefence && (
              <p className="text-[10px] text-[color:var(--color-error-foreground)] font-semibold">
                ⚠ Disabling injection defence is a security risk.
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* ── Save button ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-[color:var(--color-text-muted)]">
          Last saved by{" "}
          <span className="font-semibold text-[color:var(--color-text-secondary)]">
            {config.updatedBy ?? "unknown"}
          </span>{" "}
          · {new Date(config.updatedAt).toLocaleString()}
        </p>
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
