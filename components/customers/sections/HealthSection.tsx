"use client";

import React, { useState } from "react";
import {
  HeartPulse,
  Activity,
  TrendingDown,
  TrendingUp,
  Minus,
  HelpCircle,
  Clock,
  Zap,
  RotateCw,
  History,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { AsyncResource } from "@/hooks/useCustomer360";
import { useCustomerScoreHistory } from "@/hooks/useCustomerScoreHistory";
import type {
  CustomerHealth,
  CustomerHealthFactor,
  EngagementContribution,
  EngagementScore,
  Provenance,
  HealthHistoryItem,
  EngagementHistoryItem,
} from "@/types/customer360";
import { provenanceOf, unwrap } from "@/types/customer360";
import { SectionCard } from "../SectionCard";
import { SectionEmpty, SectionError, SectionLoading } from "../SectionStates";
import { ProvenanceBadge } from "../ProvenanceBadge";

const BAND_STYLES: Record<string, string> = {
  healthy: "bg-success-light text-success-foreground border-success/30",
  neutral: "bg-background-secondary text-text-secondary border-border",
  at_risk: "bg-warning-light text-warning-foreground border-warning/30",
  critical: "bg-error-light text-error-foreground border-error/30",
};

const TREND_ICON = {
  up: { icon: TrendingUp, color: "text-success", label: "Improving" },
  down: { icon: TrendingDown, color: "text-error", label: "Declining" },
  flat: { icon: Minus, color: "text-text-muted", label: "Stable" },
} as const;

export interface HealthSectionProps {
  customerId?: string;
  health?: AsyncResource<CustomerHealth> | CustomerHealth | null;
  engagement?: AsyncResource<EngagementScore> | null;
  fallbackHealth?: CustomerHealth | null;
}

function isAsyncResource<T>(val: unknown): val is AsyncResource<T> {
  return Boolean(val && typeof val === "object" && "loading" in val && "reload" in val);
}

export function HealthSection({
  customerId,
  health,
  engagement,
  fallbackHealth,
}: HealthSectionProps) {
  const [activeTab, setActiveTab] = useState<"health" | "engagement" | "history">("health");
  const [historyType, setHistoryType] = useState<"health" | "engagement">("health");
  const [recalculateMessage, setRecalculateMessage] = useState<string | null>(null);

  const isHealthAsync = isAsyncResource<CustomerHealth>(health);
  const healthData: CustomerHealth | null =
    (isHealthAsync ? health.data : health) ?? fallbackHealth ?? null;
  const healthLoading = isHealthAsync ? health.loading : false;
  const healthError = isHealthAsync && !fallbackHealth ? health.error : null;

  const isEngagementAsync = isAsyncResource<EngagementScore>(engagement);
  const engagementData: EngagementScore | null = isEngagementAsync ? engagement.data : null;
  const engagementLoading = isEngagementAsync ? engagement.loading : false;
  const engagementError = isEngagementAsync ? engagement.error : null;

  const {
    healthHistory,
    healthLoading: historyHealthLoading,
    healthError: historyHealthError,
    engagementHistory,
    engagementLoading: historyEngagementLoading,
    engagementError: historyEngagementError,
    recalculating,
    triggerRecalculate,
    setHealthPage,
    setEngagementPage,
  } = useCustomerScoreHistory(customerId);

  const onReload = () => {
    if (activeTab === "health" && isHealthAsync) {
      health.reload();
    } else if (activeTab === "engagement" && isEngagementAsync) {
      engagement.reload();
    }
  };

  const handleRecalculate = async () => {
    setRecalculateMessage(null);
    try {
      const res = await triggerRecalculate();
      if (isHealthAsync) health.reload();
      const snapshotMsg = res?.snapshotId
        ? `Recalculation complete! Persisted snapshot ID: ${res.snapshotId}`
        : "Health score recalculated and snapshot persisted successfully.";
      setRecalculateMessage(snapshotMsg);
      setTimeout(() => setRecalculateMessage(null), 5000);
    } catch (err: any) {
      setRecalculateMessage(`Recalculation failed: ${err?.message || "Unknown error"}`);
    }
  };

  return (
    <SectionCard
      id="health"
      title="Health & Engagement"
      icon={HeartPulse}
      description="Explainable customer health scoring, recency decay, and historical snapshots"
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex rounded-lg border border-border bg-background-secondary p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("health")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 font-semibold transition-colors ${
                activeTab === "health"
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              <HeartPulse size={13} />
              Health
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("engagement")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 font-semibold transition-colors ${
                activeTab === "engagement"
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              <Activity size={13} />
              Engagement
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 font-semibold transition-colors ${
                activeTab === "history"
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              <History size={13} />
              History
            </button>
          </div>

          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalculating || !customerId}
            title="Force recalculation of health score and persist snapshot (POST /api/customers/:id/health/calculate)"
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text hover:bg-surface-hover disabled:opacity-50 transition-colors"
          >
            <RotateCw size={12} className={recalculating ? "animate-spin" : ""} />
            {recalculating ? "Recalculating…" : "Force Recalculate"}
          </button>

          {(isHealthAsync || isEngagementAsync) && activeTab !== "history" && (
            <button
              type="button"
              onClick={onReload}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text hover:bg-surface-hover"
            >
              Refresh
            </button>
          )}
        </div>
      }
    >
      {recalculateMessage && (
        <div
          className={`mb-3 flex items-center gap-2 rounded-lg p-2.5 text-xs font-medium ${
            recalculateMessage.includes("failed")
              ? "bg-error-light text-error-foreground border border-error/30"
              : "bg-success-light text-success-foreground border border-success/30"
          }`}
        >
          {recalculateMessage.includes("failed") ? (
            <AlertCircle size={15} />
          ) : (
            <CheckCircle2 size={15} />
          )}
          <span>{recalculateMessage}</span>
        </div>
      )}

      {activeTab === "health" ? (
        <HealthScoreView
          data={healthData}
          loading={healthLoading}
          error={healthError}
          onRetry={() => isHealthAsync && health.reload()}
        />
      ) : activeTab === "engagement" ? (
        <EngagementScoreView
          data={engagementData}
          loading={engagementLoading}
          error={engagementError}
          onRetry={() => isEngagementAsync && engagement.reload()}
        />
      ) : (
        <ScoreHistoryView
          historyType={historyType}
          setHistoryType={setHistoryType}
          healthHistory={healthHistory}
          healthLoading={historyHealthLoading}
          healthError={historyHealthError}
          engagementHistory={engagementHistory}
          engagementLoading={historyEngagementLoading}
          engagementError={historyEngagementError}
          onSetHealthPage={setHealthPage}
          onSetEngagementPage={setEngagementPage}
        />
      )}
    </SectionCard>
  );
}

// ── Health Score View ─────────────────────────────────────────────────────────

function HealthScoreView({
  data,
  loading,
  error,
  onRetry,
}: {
  data: CustomerHealth | null;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  if (loading) {
    return <SectionLoading label="Loading health score and signals…" />;
  }

  if (error) {
    return <SectionError message={error.message} onRetry={onRetry} />;
  }

  const rawScore = unwrap(data?.score ?? null);
  const score = typeof rawScore === "number" ? rawScore : null;
  const band = data?.band ?? null;
  const factors = data?.factors ?? [];
  const timestamp = data?.lastEvaluatedAt ?? data?.lastCalculatedAt ?? null;
  const trendConfig = data?.trend ? TREND_ICON[data.trend] : null;

  const hasContent = score != null || band != null || factors.length > 0;

  if (!hasContent) {
    return (
      <SectionEmpty
        title="No health score available"
        description="A health score will appear once the scoring model has enough signal for this account."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Primary Score Surface */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border-light bg-background-secondary/40 p-3.5">
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black tracking-tight text-text">
              {score != null ? Math.round(score) : "—"}
            </span>
            {score != null && <span className="text-sm font-medium text-text-muted">/ 100</span>}
          </div>

          {band && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${
                BAND_STYLES[band] ?? BAND_STYLES.neutral
              }`}
            >
              {band.replace(/_/g, " ")}
            </span>
          )}

          {trendConfig && (
            <div
              className={`inline-flex items-center gap-1 text-xs font-semibold ${trendConfig.color}`}
              title={`Trend: ${trendConfig.label}`}
            >
              <trendConfig.icon size={16} />
              <span>{trendConfig.label}</span>
            </div>
          )}
        </div>

        {data?.score != null && typeof data.score === "object" && (
          <ProvenanceBadge provenance={provenanceOf(data.score)} />
        )}
      </div>

      {/* Supporting Factor Evidence */}
      {factors.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-text-muted font-semibold uppercase tracking-wider">
            <span>Supporting Signals ({factors.length})</span>
            <span>Impact</span>
          </div>

          <ul className="flex flex-col gap-1.5">
            {factors.map((factorItem, i) => {
              const f: CustomerHealthFactor =
                "value" in factorItem && factorItem.value
                  ? (factorItem.value as CustomerHealthFactor)
                  : (factorItem as CustomerHealthFactor);

              const provenance =
                "provenance" in factorItem && factorItem.provenance
                  ? factorItem.provenance
                  : f.provenance ?? (f.source ? { source: f.source } : null);

              const impactColor =
                f.impact === "positive"
                  ? "bg-success"
                  : f.impact === "negative"
                  ? "bg-error"
                  : "bg-text-muted";

              const impactBadge =
                f.impact === "positive"
                  ? "bg-success-light text-success-foreground"
                  : f.impact === "negative"
                  ? "bg-error-light text-error-foreground"
                  : "bg-background-secondary text-text-secondary";

              return (
                <li
                  key={`${f.label}-${i}`}
                  className="flex flex-col gap-1 rounded-lg border border-border-light bg-surface px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${impactColor}`} />
                      <span className="font-semibold text-text">{f.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {f.weight != null && (
                        <span className="text-[11px] font-medium text-text-muted">
                          wt: {typeof f.weight === "number" ? f.weight.toFixed(2) : f.weight}
                        </span>
                      )}
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold capitalize ${impactBadge}`}
                      >
                        {f.impact}
                      </span>
                    </div>
                  </div>

                  {f.detail && (
                    <p className="pl-4 text-xs text-text-secondary">{f.detail}</p>
                  )}

                  {provenance && (
                    <div className="mt-1 flex justify-end pl-4">
                      <ProvenanceBadge provenance={provenance} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-text-muted">No individual contributing factors reported.</p>
      )}

      {/* Timestamp */}
      {timestamp && (
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <Clock size={12} />
          <span>Last evaluated {new Date(timestamp).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

// ── Engagement Score View ─────────────────────────────────────────────────────

function EngagementScoreView({
  data,
  loading,
  error,
  onRetry,
}: {
  data: EngagementScore | null;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  if (loading) {
    return <SectionLoading label="Loading engagement score and activity contributions…" />;
  }

  if (error) {
    return <SectionError message={error.message} onRetry={onRetry} />;
  }

  const score = data?.score;
  const contributions = data?.contributions ?? [];
  const lambda = data?.lambda;
  const timestamp = data?.lastCalculatedAt ?? data?.calculatedAt ?? null;

  const hasContent = data != null && (score != null || contributions.length > 0);

  if (!hasContent) {
    return (
      <SectionEmpty
        title="No engagement score available"
        description="Engagement score is computed from customer interaction cadence and activity frequency."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Primary Engagement Metric Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border-light bg-background-secondary/40 p-3.5">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight text-text">
            {score != null ? score.toFixed(1) : "—"}
          </span>
          <span className="text-xs font-semibold uppercase text-text-muted">
            Engagement Index
          </span>
        </div>

        {lambda != null && (
          <div
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-text-secondary"
            title="Cadence decay parameter (λ)"
          >
            <Zap size={13} className="text-primary" />
            <span className="font-semibold text-text">λ = {lambda}</span>
            <span className="text-[11px] text-text-muted">(decay rate)</span>
          </div>
        )}
      </div>

      {/* Formula Explanation Banner */}
      <div className="flex items-start gap-2 rounded-lg border border-border-light bg-surface p-2.5 text-xs text-text-secondary">
        <HelpCircle size={15} className="mt-0.5 shrink-0 text-text-muted" />
        <div>
          <span className="font-semibold text-text">Model Calculation: </span>
          <span>Score = Σ activityWeight × e^(−λ × daysSince)</span>
          <p className="mt-0.5 text-[11px] text-text-muted">
            Recent activities carry higher weight, decaying exponentially with time according to the organization&apos;s cadence configuration.
          </p>
        </div>
      </div>

      {/* Supporting Activity Contributions */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-text-muted font-semibold uppercase tracking-wider">
          <span>Activity Contributions ({contributions.length})</span>
          <span>Computed Value</span>
        </div>

        {contributions.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {contributions.map((c: EngagementContribution, i: number) => {
              const activityName = (c.activityType ?? c.type ?? "Activity").replace(/_/g, " ");
              const weightVal = c.activityWeight ?? c.weight;
              const days = c.daysSince;
              const value = c.contribution;
              const prov: Provenance | null =
                c.provenance ?? (c.source ? { source: c.source } : null);

              return (
                <li
                  key={c.id ?? `${activityName}-${i}`}
                  className="flex flex-col gap-1 rounded-lg border border-border-light bg-surface px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary uppercase">
                        {activityName}
                      </span>
                      {days != null && (
                        <span className="text-xs text-text-muted">
                          {days === 0 ? "today" : `${days}d ago`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {weightVal != null && (
                        <span className="text-[11px] text-text-muted">
                          wt: {weightVal}
                        </span>
                      )}
                      {value != null ? (
                        <span className="font-semibold text-text">
                          +{value.toFixed(2)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {c.occurredAt && (
                    <span className="text-[11px] text-text-muted">
                      Occurred {new Date(c.occurredAt).toLocaleString()}
                    </span>
                  )}

                  {prov && (
                    <div className="mt-0.5 flex justify-end">
                      <ProvenanceBadge provenance={prov} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-text-muted">No individual activity contributions recorded.</p>
        )}
      </div>

      {/* Timestamp */}
      {timestamp && (
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <Clock size={12} />
          <span>Last calculated {new Date(timestamp).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

// ── Score History View (Health & Engagement Snapshots) ─────────────────────────

function ScoreHistoryView({
  historyType,
  setHistoryType,
  healthHistory,
  healthLoading,
  healthError,
  engagementHistory,
  engagementLoading,
  engagementError,
  onSetHealthPage,
  onSetEngagementPage,
}: {
  historyType: "health" | "engagement";
  setHistoryType: (t: "health" | "engagement") => void;
  healthHistory: any;
  healthLoading: boolean;
  healthError: Error | null;
  engagementHistory: any;
  engagementLoading: boolean;
  engagementError: Error | null;
  onSetHealthPage: (offset: number, limit?: number) => void;
  onSetEngagementPage: (offset: number, limit?: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Sub tab selector for Health vs Engagement History */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setHistoryType("health")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
              historyType === "health"
                ? "bg-primary text-white"
                : "bg-surface border border-border text-text-secondary hover:text-text"
            }`}
          >
            Health Score Snapshots
          </button>
          <button
            type="button"
            onClick={() => setHistoryType("engagement")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
              historyType === "engagement"
                ? "bg-primary text-white"
                : "bg-surface border border-border text-text-secondary hover:text-text"
            }`}
          >
            Engagement Snapshots
          </button>
        </div>
      </div>

      {historyType === "health" ? (
        <HealthHistoryList
          data={healthHistory}
          loading={healthLoading}
          error={healthError}
          onSetPage={onSetHealthPage}
        />
      ) : (
        <EngagementHistoryList
          data={engagementHistory}
          loading={engagementLoading}
          error={engagementError}
          onSetPage={onSetEngagementPage}
        />
      )}
    </div>
  );
}

function HealthHistoryList({
  data,
  loading,
  error,
  onSetPage,
}: {
  data: any;
  loading: boolean;
  error: Error | null;
  onSetPage: (offset: number) => void;
}) {
  if (loading) return <SectionLoading label="Loading historical health snapshots…" />;
  if (error) return <SectionError message={error.message} />;

  const items: HealthHistoryItem[] = data?.items ?? data?.snapshots ?? [];
  const total = data?.total ?? items.length;
  const limit = data?.limit ?? 10;
  const offset = data?.offset ?? 0;

  if (items.length === 0) {
    return (
      <SectionEmpty
        title="No historical health snapshots"
        description="Historical health snapshots are created automatically when health recalculations occur."
      />
    );
  }

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {items.map((item, idx) => {
          const score = item.score ?? null;
          const band = item.band ?? null;
          const trendConfig = item.trend ? TREND_ICON[item.trend] : null;
          const dateStr = item.calculatedAt ?? item.createdAt;

          return (
            <li
              key={item.snapshotId ?? item.id ?? idx}
              className="flex items-center justify-between gap-3 rounded-lg border border-border-light bg-surface p-3 text-sm hover:border-border transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-text">
                  {score != null ? Math.round(score) : "—"}
                </span>
                {band && (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${
                      BAND_STYLES[band] ?? BAND_STYLES.neutral
                    }`}
                  >
                    {band.replace(/_/g, " ")}
                  </span>
                )}
                {trendConfig && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${trendConfig.color}`}
                  >
                    <trendConfig.icon size={14} />
                    {trendConfig.label}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-text-muted">
                {item.snapshotId && (
                  <span className="font-mono text-[10px] text-text-secondary bg-background-secondary px-1.5 py-0.5 rounded">
                    ID: {item.snapshotId.slice(0, 8)}
                  </span>
                )}
                {dateStr && (
                  <span>{new Date(dateStr).toLocaleString()}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-text-secondary">
        <span>
          Showing {offset + 1}–{Math.min(offset + limit, total)} of {total} snapshots
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => onSetPage(Math.max(0, offset - limit))}
            className="flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 disabled:opacity-40 hover:bg-surface-hover"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={offset + limit >= total}
            onClick={() => onSetPage(offset + limit)}
            className="flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 disabled:opacity-40 hover:bg-surface-hover"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function EngagementHistoryList({
  data,
  loading,
  error,
  onSetPage,
}: {
  data: any;
  loading: boolean;
  error: Error | null;
  onSetPage: (offset: number) => void;
}) {
  if (loading) return <SectionLoading label="Loading historical engagement snapshots…" />;
  if (error) return <SectionError message={error.message} />;

  const items: EngagementHistoryItem[] = data?.items ?? data?.snapshots ?? [];
  const total = data?.total ?? items.length;
  const limit = data?.limit ?? 10;
  const offset = data?.offset ?? 0;

  if (items.length === 0) {
    return (
      <SectionEmpty
        title="No historical engagement snapshots"
        description="Historical engagement score snapshots are recorded periodically."
      />
    );
  }

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {items.map((item, idx) => {
          const score = item.score;
          const lambda = item.lambda;
          const dateStr = item.calculatedAt ?? item.createdAt;

          return (
            <li
              key={item.snapshotId ?? item.id ?? idx}
              className="flex items-center justify-between gap-3 rounded-lg border border-border-light bg-surface p-3 text-sm hover:border-border transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-text">
                  {score != null ? score.toFixed(1) : "—"}
                </span>
                <span className="text-xs text-text-muted uppercase">Engagement Score</span>
                {lambda != null && (
                  <span className="text-xs font-semibold text-text-secondary bg-background-secondary px-2 py-0.5 rounded">
                    λ = {lambda}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-text-muted">
                {item.snapshotId && (
                  <span className="font-mono text-[10px] text-text-secondary bg-background-secondary px-1.5 py-0.5 rounded">
                    ID: {item.snapshotId.slice(0, 8)}
                  </span>
                )}
                {dateStr && (
                  <span>{new Date(dateStr).toLocaleString()}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-text-secondary">
        <span>
          Showing {offset + 1}–{Math.min(offset + limit, total)} of {total} snapshots
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => onSetPage(Math.max(0, offset - limit))}
            className="flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 disabled:opacity-40 hover:bg-surface-hover"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={offset + limit >= total}
            onClick={() => onSetPage(offset + limit)}
            className="flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 disabled:opacity-40 hover:bg-surface-hover"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
