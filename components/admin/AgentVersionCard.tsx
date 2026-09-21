"use client";

/**
 * components/admin/AgentVersionCard.tsx
 * ─────────────────────────────────────────────────────────────
 * Day 7 — Model/Version State & Promotion Card
 *
 * Displays one AgentVersion with:
 *   - Version state badge (PRODUCTION / STAGING / DRAFT / RETIRED / FAILED)
 *   - Regression gate results table (PASS / FAIL / PENDING per gate)
 *   - "Promote to Production" button — ONLY active when:
 *       (a) version.state === "STAGING", AND
 *       (b) version.allGatesPassed === true
 *   - Post-promote: shows approval queue link (promotion routes through
 *     the existing Approval Queue — no new approval logic)
 *
 * Non-negotiables:
 * - The Promote button is structurally disabled (not just styled) when
 *   gates have not all passed — enforced at the component level and
 *   redundantly guarded in the API layer.
 * - Production models never silently change — every promotion creates
 *   an auditable approvalRequestId shown as a link here.
 * - All colors via CSS variable tokens only.
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

interface VersionStateMeta {
  label: string;
  icon: React.ElementType;
  pill: string;
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
  const m = VERSION_STATE_META[state] ?? VERSION_STATE_META.DRAFT;
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

function GateRow({ gate }: { gate: RegressionGate }) {
  const isPending = gate.result === "PENDING";
  const isPass    = gate.result === "PASS";
  const isFail    = gate.result === "FAIL";

  return (
    <div
      className={classNames(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl border",
        isPending ? "bg-[color:var(--color-background-secondary)] border-[color:var(--color-border-light)]"  :
        isPass    ? "bg-[color:var(--color-success-light)]         border-[color:var(--color-success-light)]" :
                    "bg-[color:var(--color-error-light)]           border-[color:var(--color-error-light)]"
      )}
      data-testid="regression-gate-row"
      data-gate-result={gate.result}
    >
      {/* Result icon */}
      <div className="shrink-0">
        {isPending && <Clock       size={14} className="text-[color:var(--color-text-muted)]" />}
        {isPass    && <CheckCircle2 size={14} className="text-[color:var(--color-success)]"    />}
        {isFail    && <XCircle      size={14} className="text-[color:var(--color-error)]"      />}
      </div>

      {/* Label */}
      <p className={classNames(
        "text-xs font-semibold flex-1 min-w-0 truncate",
        isPending ? "text-[color:var(--color-text-muted)]"        :
        isPass    ? "text-[color:var(--color-success-foreground)]" :
                    "text-[color:var(--color-error-foreground)]"
      )}>
        {gate.label}
      </p>

      {/* Measured vs threshold */}
      {gate.measuredValue != null && (
        <span className={classNames(
          "text-xs font-mono shrink-0",
          isPass ? "text-[color:var(--color-success-foreground)]" :
          isFail ? "text-[color:var(--color-error-foreground)]"   :
                   "text-[color:var(--color-text-muted)]"
        )}>
          {gate.measuredValue}
          {gate.unit && <span className="opacity-70 ml-0.5">{gate.unit}</span>}
          {gate.threshold != null && (
            <span className="opacity-60 ml-1">
              / {gate.threshold}{gate.unit}
            </span>
          )}
        </span>
      )}

      {/* Result label */}
      <span className={classNames(
        "text-[10px] font-extrabold uppercase tracking-wide shrink-0",
        isPending ? "text-[color:var(--color-text-muted)]"        :
        isPass    ? "text-[color:var(--color-success-foreground)]" :
                    "text-[color:var(--color-error-foreground)]"
      )}>
        {gate.result}
      </span>
    </div>
  );
}

// ─── Promote button / state ───────────────────────────────────────────────────

interface PromoteAreaProps {
  version: AgentVersion;
  onPromoted: (approvalRequestId: string) => void;
}

function PromoteArea({ version, onPromoted }: PromoteAreaProps) {
  const [promoting, setPromoting] = useState(false);

  // Derived: can this version be promoted?
  const canPromote = version.state === "STAGING" && version.allGatesPassed;
  const alreadySent = !!version.approvalRequestId;

  const failingGates = version.regressionGates.filter(
    (g) => g.result === "FAIL"
  );
  const pendingGates = version.regressionGates.filter(
    (g) => g.result === "PENDING"
  );

  const handlePromote = async () => {
    if (!canPromote || alreadySent || promoting) return;
    setPromoting(true);
    try {
      const res = await promoteAgentVersion(version.id, version);
      onPromoted(res.approvalRequestId);
      toast.success(
        res.message ?? "Promotion request sent to Approval Queue."
      );
    } catch (err: any) {
      toast.error(err.message ?? "Promotion failed.");
    } finally {
      setPromoting(false);
    }
  };

  // Already sent for approval
  if (alreadySent) {
    return (
      <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-[color:var(--color-border-light)]">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--color-success)]">
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

  // Not a STAGING version — no promote action available
  if (version.state !== "STAGING") {
    return null;
  }

  // STAGING — show promote button (disabled when gates not all passed)
  return (
    <div
      className="flex flex-col gap-2 pt-3 border-t border-[color:var(--color-border-light)]"
      data-testid="promote-area"
    >
      {/* Gate blockers */}
      {failingGates.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[color:var(--color-error-light)] border border-[color:var(--color-error-light)]">
          <XCircle size={13} className="text-[color:var(--color-error)] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[color:var(--color-error-foreground)] leading-relaxed">
            <span className="font-bold">
              {failingGates.length} gate{failingGates.length !== 1 ? "s" : ""} failing
            </span>
            {" — "}
            {failingGates.map((g) => g.label).join(", ")}.
            Resolve before promotion.
          </p>
        </div>
      )}
      {pendingGates.length > 0 && failingGates.length === 0 && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[color:var(--color-warning-light)] border border-[color:var(--color-warning-light)]">
          <Clock size={13} className="text-[color:var(--color-warning-foreground)] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[color:var(--color-warning-foreground)] leading-relaxed">
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
              ? "bg-[color:var(--color-success)] hover:opacity-90 text-white shadow-sm"
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
  version: AgentVersion;
  /** Called after a successful promotion request */
  onPromoted?: (approvalRequestId: string) => void;
  className?: string;
  /** Start collapsed (for RETIRED / FAILED versions) */
  defaultCollapsed?: boolean;
}

export function AgentVersionCard({
  version: initialVersion,
  onPromoted,
  className,
  defaultCollapsed = false,
}: AgentVersionCardProps) {
  const [version, setVersion] = useState(initialVersion);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const handlePromoted = (approvalRequestId: string) => {
    setVersion((v) => ({ ...v, approvalRequestId }));
    onPromoted?.(approvalRequestId);
  };

  const isProd    = version.state === "PRODUCTION";
  const isRetired = version.state === "RETIRED";
  const isDraft   = version.state === "DRAFT";

  // Border accent for production version
  const outerClass = classNames(
    "bg-[color:var(--color-surface)] rounded-2xl border shadow-sm overflow-hidden",
    isProd
      ? "border-[color:var(--color-success-light)] ring-1 ring-[color:var(--color-success-light)]"
      : "border-[color:var(--color-border)]",
    className
  );

  return (
    <div className={outerClass} data-testid="agent-version-card" data-state={version.state}>

      {/* ── Card header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4 bg-[color:var(--color-surface-active)] border-b border-[color:var(--color-border-light)]">
        {/* Version number + state */}
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

        {/* Meta */}
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

        {/* Collapse toggle for retired/draft cards */}
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
              {version.allGatesPassed ? (
                <span className="text-[color:var(--color-success)] font-bold">
                  · All Passed ✓
                </span>
              ) : version.regressionGates.some((g) => g.result === "FAIL") ? (
                <span className="text-[color:var(--color-error)] font-bold">
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

          {/* Promote area — only for STAGING */}
          <PromoteArea version={version} onPromoted={handlePromoted} />
        </div>
      )}
    </div>
  );
}
