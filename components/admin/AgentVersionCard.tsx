"use client";

/**
 * components/admin/AgentVersionCard.tsx
 * ─────────────────────────────────────────────────────────────
 * Day 7 — Model/Version State & Promotion Card
 *
 * Chart palette applied via .zyoris-chart-scope on the GateRow
 * wrapper and the PromoteArea wrapper.
 *
 * Pass/fail gate row colors: var(--chart-success) / var(--chart-danger)
 * Warning (pending gates): var(--chart-warning)
 * All chart tokens resolved from the scoped block in globals.css.
 *
 * Non-chart structural tokens (--color-surface, --color-border, etc.)
 * are left untouched — only the pass/fail/warning delta colors change.
 *
 * Non-negotiables (unchanged):
 * - Promote button disabled when gates not all passed.
 * - Every promotion creates an auditable approvalRequestId.
 * - All layout, spacing, radius, card container: unchanged.
 */

import { useState } from "react";
import classNames from "classnames";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Rocket,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Archive,
  AlertTriangle,
  Cpu,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { promoteAgentVersion } from "@/lib/api/agentVersionsApi";
import { toast } from "react-toastify";
import type {
  AgentVersion,
  VersionState,
  RegressionGate,
} from "@/lib/types/day7.ts";

// ─── Version state badge ──────────────────────────────────────────────────────
// State badges keep their existing semantic CSS var tokens —
// they are not chart/metric elements.

interface VersionStateMeta {
  label:     string;
  icon:      React.ElementType;
  pill:      string;
  iconColor: string;
}

const VERSION_STATE_META: Record<VersionState, VersionStateMeta> = {
  PRODUCTION: {
    label:     "Production",
    icon:      ShieldCheck,
    pill:      "bg-[color:var(--color-success-light)] text-[color:var(--color-success-foreground)] border-[color:var(--color-success-light)]",
    iconColor: "text-[color:var(--color-success)]",
  },
  STAGING: {
    label:     "Staging",
    icon:      Rocket,
    pill:      "bg-[color:var(--color-info-light)] text-[color:var(--color-info-foreground)] border-[color:var(--color-info-light)]",
    iconColor: "text-[color:var(--color-info)]",
  },
  DRAFT: {
    label:     "Draft",
    icon:      Clock,
    pill:      "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]",
    iconColor: "text-[color:var(--color-text-muted)]",
  },
  RETIRED: {
    label:     "Retired",
    icon:      Archive,
    pill:      "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]",
    iconColor: "text-[color:var(--color-text-muted)]",
  },
  FAILED: {
    label:     "Failed",
    icon:      AlertTriangle,
    pill:      "bg-[color:var(--color-error-light)] text-[color:var(--color-error-foreground)] border-[color:var(--color-error-light)]",
    iconColor: "text-[color:var(--color-error)]",
  },
};

function VersionStateBadge({ state }: { state: VersionState }) {
  const m    = VERSION_STATE_META[state] ?? VERSION_STATE_META.DRAFT;
  const Icon = m.icon;
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border",
        m.pill
      )}
      data-testid="version-state-badge"
    >
      <Icon size={12} className={classNames("shrink-0", m.iconColor)} />
      {m.label}
    </span>
  );
}

// ─── Gate result row ──────────────────────────────────────────────────────────
// GateRow is the metric/delta element — wrapped in zyoris-chart-scope.
// Background tints and text use var(--chart-success/warning/danger).

function GateRow({ gate }: { gate: RegressionGate }) {
  const isPending = gate.result === "PENDING";
  const isPass    = gate.result === "PASS";
  const isFail    = gate.result === "FAIL";

  return (
    // zyoris-chart-scope makes var(--chart-*) resolve inside this element
    <div
      className="zyoris-chart-scope flex items-center gap-3 px-3 py-2.5 rounded-xl border"
      style={{
        backgroundColor: isPending
          ? "var(--color-background-secondary)"
          : isPass
          ? "color-mix(in oklch, var(--chart-success) 12%, transparent)"
          : "color-mix(in oklch, var(--chart-danger) 12%, transparent)",
        borderColor: isPending
          ? "var(--color-border-light)"
          : isPass
          ? "color-mix(in oklch, var(--chart-success) 30%, transparent)"
          : "color-mix(in oklch, var(--chart-danger) 30%, transparent)",
      }}
      data-testid="regression-gate-row"
      data-gate-result={gate.result}
    >
      {/* Result icon */}
      <div className="shrink-0">
        {isPending && (
          <Clock size={14} className="text-[color:var(--color-text-muted)]" />
        )}
        {isPass && (
          <CheckCircle2
            size={14}
            style={{ color: "var(--chart-success)" }}
          />
        )}
        {isFail && (
          <XCircle
            size={14}
            style={{ color: "var(--chart-danger)" }}
          />
        )}
      </div>

      {/* Label */}
      <p
        className="text-xs font-semibold flex-1 min-w-0 truncate"
        style={{
          color: isPending
            ? "var(--color-text-muted)"
            : isPass
            ? "var(--chart-success)"
            : "var(--chart-danger)",
        }}
      >
        {gate.label}
      </p>

      {/* Measured vs threshold */}
      {gate.measuredValue != null && (
        <span
          className="text-xs font-mono shrink-0"
          style={{
            color: isPending
              ? "var(--color-text-muted)"
              : isPass
              ? "var(--chart-success)"
              : "var(--chart-danger)",
          }}
        >
          {gate.measuredValue}
          {gate.unit && <span style={{ opacity: 0.7, marginLeft: "0.125rem" }}>{gate.unit}</span>}
          {gate.threshold != null && (
            <span style={{ opacity: 0.6, marginLeft: "0.25rem" }}>
              / {gate.threshold}{gate.unit}
            </span>
          )}
        </span>
      )}

      {/* Result label */}
      <span
        className="text-[10px] font-extrabold uppercase tracking-wide shrink-0"
        style={{
          color: isPending
            ? "var(--color-text-muted)"
            : isPass
            ? "var(--chart-success)"
            : "var(--chart-danger)",
        }}
      >
        {gate.result}
      </span>
    </div>
  );
}

// ─── Promote button / state ───────────────────────────────────────────────────
// PromoteArea warning/blocking messages use chart-warning / chart-danger.

interface PromoteAreaProps {
  version:    AgentVersion;
  onPromoted: (approvalRequestId: string) => void;
}

function PromoteArea({ version, onPromoted }: PromoteAreaProps) {
  const [promoting, setPromoting] = useState(false);

  const canPromote  = version.state === "STAGING" && version.allGatesPassed;
  const alreadySent = !!version.approvalRequestId;

  const failingGates = version.regressionGates.filter((g) => g.result === "FAIL");
  const pendingGates = version.regressionGates.filter((g) => g.result === "PENDING");

  const handlePromote = async () => {
    if (!canPromote || alreadySent || promoting) return;
    setPromoting(true);
    try {
      const res = await promoteAgentVersion(version.id, version);
      onPromoted(res.approvalRequestId);
      toast.success(res.message ?? "Promotion request sent to Approval Queue.");
    } catch (err: any) {
      toast.error(err.message ?? "Promotion failed.");
    } finally {
      setPromoting(false);
    }
  };

  if (alreadySent) {
    return (
      <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-[color:var(--color-border-light)]">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-bold"
          style={{ color: "var(--chart-success)" }}
        >
          <CheckCircle2 size={14} />
          Promotion request sent
        </span>
        <a
          href={`/approvals/${version.approvalRequestId}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-primary)] hover:underline"
          data-testid="approval-queue-link"
        >
          Review in Approval Queue <ExternalLink size={11} />
        </a>
        <span className="text-[10px] text-[color:var(--color-text-muted)]">
          This version will go live once the approval is granted.
        </span>
      </div>
    );
  }

  if (version.state !== "STAGING") return null;

  return (
    // zyoris-chart-scope so var(--chart-warning/danger) resolve in inline styles below
    <div
      className="zyoris-chart-scope flex flex-col gap-2 pt-3 border-t border-[color:var(--color-border-light)]"
      data-testid="promote-area"
    >
      {/* Failing gates banner */}
      {failingGates.length > 0 && (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded-xl border"
          style={{
            backgroundColor: "color-mix(in oklch, var(--chart-danger) 10%, transparent)",
            borderColor:      "color-mix(in oklch, var(--chart-danger) 25%, transparent)",
          }}
        >
          <XCircle size={13} className="shrink-0 mt-0.5" style={{ color: "var(--chart-danger)" }} />
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: "var(--chart-danger)" }}
          >
            <span className="font-bold">
              {failingGates.length} gate{failingGates.length !== 1 ? "s" : ""} failing
            </span>
            {" — "}
            {failingGates.map((g) => g.label).join(", ")}.
            Resolve before promotion.
          </p>
        </div>
      )}

      {/* Pending gates banner */}
      {pendingGates.length > 0 && failingGates.length === 0 && (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded-xl border"
          style={{
            backgroundColor: "color-mix(in oklch, var(--chart-warning) 10%, transparent)",
            borderColor:      "color-mix(in oklch, var(--chart-warning) 25%, transparent)",
          }}
        >
          <Clock size={13} className="shrink-0 mt-0.5" style={{ color: "var(--chart-warning)" }} />
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: "var(--chart-warning)" }}
          >
            <span className="font-bold">
              {pendingGates.length} gate{pendingGates.length !== 1 ? "s" : ""} still running
            </span>
            {" — "}promotion requires all gates to complete.
          </p>
        </div>
      )}

      {/* Promote button */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handlePromote}
          disabled={!canPromote || promoting}
          data-testid="promote-btn"
          aria-label={
            !canPromote
              ? "Promote to Production — blocked: not all regression gates have passed"
              : "Promote to Production"
          }
          className={classNames(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
            canPromote && !promoting
              ? "bg-[color:var(--color-success)] hover:opacity-90 text-[color:var(--color-primary-foreground)] shadow-sm"
              : "bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border)] cursor-not-allowed"
          )}
        >
          {promoting
            ? <><RefreshCw size={14} className="animate-spin" /> Sending…</>
            : <><Rocket size={14} /> Promote to Production</>}
        </button>

        {canPromote && !promoting && (
          <p className="text-[11px] text-[color:var(--color-text-muted)] leading-snug max-w-xs">
            This will route to the Approval Queue — a human must approve
            before the version goes live.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export interface AgentVersionCardProps {
  version:           AgentVersion;
  onPromoted?:       (approvalRequestId: string) => void;
  className?:        string;
  defaultCollapsed?: boolean;
}

export function AgentVersionCard({
  version: initialVersion,
  onPromoted,
  className,
  defaultCollapsed = false,
}: AgentVersionCardProps) {
  const [version,   setVersion]   = useState(initialVersion);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const handlePromoted = (approvalRequestId: string) => {
    setVersion((v) => ({ ...v, approvalRequestId }));
    onPromoted?.(approvalRequestId);
  };

  const isProd    = version.state === "PRODUCTION";
  const isRetired = version.state === "RETIRED";
  const isDraft   = version.state === "DRAFT";

  const outerClass = classNames(
    "bg-[color:var(--color-surface)] rounded-2xl border shadow-sm overflow-hidden",
    isProd
      ? "border-[color:var(--color-success-light)] ring-1 ring-[color:var(--color-success-light)]"
      : "border-[color:var(--color-border)]",
    className
  );

  return (
    <div className={outerClass} data-testid="agent-version-card" data-state={version.state}>

      {/* ── Card header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4 bg-[color:var(--color-surface-active)] border-b border-[color:var(--color-border-light)]">
        <div className="w-8 h-8 rounded-xl bg-[color:var(--color-background-secondary)] flex items-center justify-center shrink-0">
          <Cpu size={15} className="text-[color:var(--color-text-muted)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-[color:var(--color-text)] font-mono">
              v{version.versionNumber}
            </p>
            <VersionStateBadge state={version.state} />
            {isProd && (
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-success)] px-1.5 py-0.5 rounded-md bg-[color:var(--color-success-light)]">
                Live
              </span>
            )}
          </div>
          <p className="text-[11px] text-[color:var(--color-text-muted)] mt-0.5 font-mono truncate">
            {version.modelIdentifier}
          </p>
        </div>

        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-[10px] text-[color:var(--color-text-muted)]">
            Created {new Date(version.createdAt).toLocaleDateString()}
          </p>
          {version.promotedAt && (
            <p className="text-[10px] text-[color:var(--color-text-muted)] mt-0.5">
              Promoted {new Date(version.promotedAt).toLocaleDateString()}
              {version.promotedBy && ` by ${version.promotedBy}`}
            </p>
          )}
        </div>

        {(isRetired || isDraft) && (
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[color:var(--color-surface-hover)] transition-colors shrink-0"
            aria-label={collapsed ? "Expand version" : "Collapse version"}
          >
            {collapsed
              ? <ChevronDown size={14} className="text-[color:var(--color-text-muted)]" />
              : <ChevronUp   size={14} className="text-[color:var(--color-text-muted)]" />}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="p-5 space-y-4">

          {/* Changelog */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-text-muted)] mb-1.5">
              Changelog
            </p>
            <p className="text-xs text-[color:var(--color-text-secondary)] leading-relaxed">
              {version.changelog}
            </p>
          </div>

          {/* Regression gates */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--color-text-muted)] mb-2 flex items-center gap-1.5">
              Regression Gates
              {/* Gate summary label — uses chart tokens via inline style */}
              {version.allGatesPassed ? (
                <span
                  className="font-bold"
                  style={{ color: "var(--chart-success)" }}
                >
                  · All Passed ✓
                </span>
              ) : version.regressionGates.some((g) => g.result === "FAIL") ? (
                <span
                  className="font-bold"
                  style={{ color: "var(--chart-danger)" }}
                >
                  · {version.regressionGates.filter((g) => g.result === "FAIL").length} Failing
                </span>
              ) : (
                <span className="text-[color:var(--color-text-muted)]">
                  · Evaluation in progress
                </span>
              )}
            </p>
            <div className="space-y-1.5">
              {version.regressionGates.map((gate) => (
                <GateRow key={gate.gateId} gate={gate} />
              ))}
            </div>
            {version.regressionGates.some((g) => g.notes) && (
              <div className="mt-2 space-y-1">
                {version.regressionGates
                  .filter((g) => g.notes)
                  .map((g) => (
                    <p key={g.gateId} className="text-[10px] text-[color:var(--color-text-muted)] leading-relaxed">
                      <span className="font-semibold">{g.label}:</span> {g.notes}
                    </p>
                  ))}
              </div>
            )}
          </div>

          {/* Promote area */}
          <PromoteArea version={version} onPromoted={handlePromoted} />
        </div>
      )}
    </div>
  );
}
