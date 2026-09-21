"use client";

/**
 * app/(dashboard)/admin/agents/observability/page.tsx
 * ─────────────────────────────────────────────────────────────
 * Day 7 — Evaluation & Metrics Dashboard
 * Route: /admin/agents/observability
 *
 * Displays for each agent:
 *   - Recommendation Acceptance Rate (useful)
 *   - Action Success Rate (useful)
 *   - Hallucination / Grounding Failure count (grounded)
 *   - Grounded Response Rate (grounded)
 *   - Prompt Injection Attempts Blocked (safe)
 *   - Cost per Execution (affordable)
 *   - Avg / P95 Latency (affordable)
 *
 * Plus the auditable business-outcome event log with evidence links.
 *
 * Acceptance criteria:
 * ✓ Cost, latency, outcome metrics visible on the dashboard
 * ✓ Execution Ledger links for cost/latency events
 * ✓ Evidence links on every critical recommendation
 * ✓ Loading / empty / error states on all surfaces
 * ✓ All colors via CSS variable tokens
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getObservabilityMetrics, getAuditEvents } from "@/lib/api/observabilityApi";
import { ObservabilityMetricCard } from "@/components/admin/ObservabilityMetricCard";
import {
  AuditLogTable,
  AuditLogFilterBar,
} from "@/components/admin/AuditLogTable";
import { toast } from "react-toastify";
import {
  Activity,
  RefreshCw,
  AlertCircle,
  Bot,
  ChevronDown,
} from "lucide-react";
import type {
  AgentObservabilityMetrics,
  AuditEvent,
  AuditEventFilters,
} from "@/lib/types/day7.ts";

// ─── Skeleton ────────────────────────────────────────────────────────────────

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-28 bg-[color:var(--color-background-secondary)] rounded-2xl" />
      ))}
    </div>
  );
}

// ─── Agent metrics section ────────────────────────────────────────────────────

function AgentMetricsSection({ m }: { m: AgentObservabilityMetrics }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-[color:var(--color-info-light)] flex items-center justify-center shrink-0">
          <Bot size={12} className="text-[color:var(--color-info)]" />
        </div>
        <p className="text-sm font-bold text-[color:var(--color-text)]">{m.agentName}</p>
        <span className="text-[10px] text-[color:var(--color-text-muted)] font-medium">
          {m.totalExecutions} executions in period
        </span>
      </div>

      {/* Metrics grid — 4 columns on wide, 2 on narrow */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Usefulness */}
        <ObservabilityMetricCard
          label="Acceptance Rate"
          value={m.recommendationAcceptanceRate}
          unit="%"
          sub="Recommendations accepted"
          variant="success"
          trend={m.acceptanceTrend}
          threshold={70}
        />
        <ObservabilityMetricCard
          label="Action Success Rate"
          value={m.actionSuccessRate}
          unit="%"
          sub="Approved actions succeeded"
          variant="success"
          trend={m.successTrend}
          threshold={85}
        />

        {/* Groundedness */}
        <ObservabilityMetricCard
          label="Grounded Response Rate"
          value={m.groundedResponseRate}
          unit="%"
          sub="Responses with citations"
          variant="success"
          threshold={80}
        />
        <ObservabilityMetricCard
          label="Hallucinations"
          value={m.hallucinationCount}
          sub="Grounding failures in period"
          variant="danger"
          threshold={5}
        />

        {/* Safety */}
        <ObservabilityMetricCard
          label="Injection Attempts Blocked"
          value={m.injectionAttemptsBlocked}
          sub="Prompt injection attempts detected"
          variant="neutral"
        />

        {/* Cost / Latency */}
        <ObservabilityMetricCard
          label="Avg Cost / Exec"
          value={`$${m.avgCostPerExecutionUsd.toFixed(4)}`}
          sub={`Total: $${m.totalCostUsd.toFixed(2)}`}
          variant="cost"
          trend={m.costTrend}
        />
        <ObservabilityMetricCard
          label="Avg Latency"
          value={m.avgLatencyMs < 1000
            ? `${m.avgLatencyMs}ms`
            : `${(m.avgLatencyMs / 1000).toFixed(1)}s`}
          sub={`P95: ${m.p95LatencyMs < 1000 ? `${m.p95LatencyMs}ms` : `${(m.p95LatencyMs / 1000).toFixed(1)}s`}`}
          variant="latency"
          trend={m.latencyTrend}
        />
        <ObservabilityMetricCard
          label="Total Executions"
          value={m.totalExecutions}
          sub="In current period"
          variant="neutral"
        />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

// Module-level guard against StrictMode double-invoke
let _obsFetchInFlight = false;

export default function ObservabilityPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [metrics,       setMetrics]       = useState<AgentObservabilityMetrics[]>([]);
  const [events,        setEvents]        = useState<AuditEvent[]>([]);
  const [totalEvents,   setTotalEvents]   = useState(0);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [eventsLoading,  setEventsLoading]  = useState(true);
  const [metricsError,   setMetricsError]   = useState<string | null>(null);
  const [eventsError,    setEventsError]    = useState<string | null>(null);

  // Agent filter for metrics section
  const [selectedAgent, setSelectedAgent] = useState<string>("all");

  // Audit log filters
  const [auditFilters, setAuditFilters] = useState<AuditEventFilters>({});

  const isFirst = useRef(true);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "ADMIN") { router.replace("/dashboard"); }
  }, [user, router]);

  const loadMetrics = useCallback(async () => {
    if (!token) return;
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const res = await getObservabilityMetrics();
      setMetrics(res.metrics);
    } catch (err: any) {
      const msg = err.message ?? "Failed to load metrics.";
      setMetricsError(msg);
      toast.error(msg);
    } finally {
      setMetricsLoading(false);
    }
  }, [token]);

  const loadEvents = useCallback(async (filters: AuditEventFilters) => {
    if (!token) return;
    setEventsLoading(true);
    setEventsError(null);
    try {
      const res = await getAuditEvents(filters);
      setEvents(res.events);
      setTotalEvents(res.totalCount);
    } catch (err: any) {
      const msg = err.message ?? "Failed to load audit events.";
      setEventsError(msg);
      toast.error(msg);
    } finally {
      setEventsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (_obsFetchInFlight) return;
    _obsFetchInFlight = true;
    Promise.all([loadMetrics(), loadEvents({})]).finally(() => {
      _obsFetchInFlight = false;
    });
    isFirst.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Re-fetch events when filters change (after first mount)
  useEffect(() => {
    if (isFirst.current) return;
    loadEvents(auditFilters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditFilters]);

  if (!user) return null;

  const visibleMetrics = selectedAgent === "all"
    ? metrics
    : metrics.filter((m) => m.agentId === selectedAgent);

  const hasFilters = !!(auditFilters.category || auditFilters.outcome || auditFilters.search);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[color:var(--color-info-light)] rounded-xl flex items-center justify-center shrink-0">
            <Activity size={20} className="text-[color:var(--color-info)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--color-text)] tracking-tight">
              Agent Observability
            </h1>
            <p className="text-sm text-[color:var(--color-text-secondary)] mt-0.5">
              Measurable evidence that agents are useful, grounded, safe, and affordable.
            </p>
          </div>
        </div>
        <button
          onClick={() => { loadMetrics(); loadEvents(auditFilters); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-surface)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)] text-sm font-semibold rounded-xl transition-all shrink-0 self-start md:self-auto"
        >
          <RefreshCw size={14} className={(metricsLoading || eventsLoading) ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Metrics ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-[color:var(--color-text-secondary)] uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-4 bg-[color:var(--color-primary)] rounded-full" />
            Performance Metrics
          </h2>

          {/* Agent filter */}
          {metrics.length > 1 && (
            <div className="relative">
              <Bot size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--color-text-muted)] pointer-events-none" />
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="pl-7 pr-7 py-1.5 text-xs font-semibold rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] appearance-none focus:outline-none"
              >
                <option value="all">All Agents</option>
                {metrics.map((m) => (
                  <option key={m.agentId} value={m.agentId}>{m.agentName}</option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--color-text-muted)]" />
            </div>
          )}
        </div>

        {metricsLoading ? (
          <MetricsSkeleton />
        ) : metricsError ? (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[color:var(--color-error-light)] border border-[color:var(--color-error-light)]">
            <AlertCircle size={16} className="text-[color:var(--color-error)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-[color:var(--color-error-foreground)]">Failed to load metrics</p>
              <p className="text-xs opacity-80 text-[color:var(--color-error-foreground)] mt-1">{metricsError}</p>
            </div>
            <button onClick={loadMetrics} className="text-xs font-semibold text-[color:var(--color-error-foreground)] hover:underline shrink-0 inline-flex items-center gap-1">
              <RefreshCw size={11} /> Retry
            </button>
          </div>
        ) : visibleMetrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)]">
            <Activity size={28} className="text-[color:var(--color-text-muted)] mb-3" />
            <p className="text-sm font-semibold text-[color:var(--color-text)]">No metrics available</p>
            <p className="text-xs text-[color:var(--color-text-muted)] max-w-xs mt-1">
              Metrics appear after the first agent execution in the current period.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {visibleMetrics.map((m) => (
              <AgentMetricsSection key={m.agentId} m={m} />
            ))}
          </div>
        )}
      </section>

      {/* ── Audit Log ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-[color:var(--color-text-secondary)] uppercase tracking-wider flex items-center gap-2">
          <span className="w-1 h-4 bg-[color:var(--color-primary)] rounded-full" />
          Business Outcome Audit Log
          {totalEvents > 0 && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-[color:var(--color-background-secondary)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border)]">
              {totalEvents}
            </span>
          )}
        </h2>

        <div className="bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-border)] shadow-sm p-4">
          <AuditLogFilterBar
            filters={auditFilters}
            onChange={(f) => {
              setAuditFilters(f);
              loadEvents(f);
            }}
          />
        </div>

        {eventsError ? (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[color:var(--color-error-light)] border border-[color:var(--color-error-light)]">
            <AlertCircle size={16} className="text-[color:var(--color-error)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-[color:var(--color-error-foreground)]">Failed to load audit events</p>
              <p className="text-xs opacity-80 text-[color:var(--color-error-foreground)] mt-1">{eventsError}</p>
            </div>
            <button onClick={() => loadEvents(auditFilters)} className="text-xs font-semibold text-[color:var(--color-error-foreground)] hover:underline shrink-0 inline-flex items-center gap-1">
              <RefreshCw size={11} /> Retry
            </button>
          </div>
        ) : (
          <AuditLogTable
            events={events}
            loading={eventsLoading}
            totalCount={totalEvents}
          />
        )}
      </section>
    </div>
  );
}
