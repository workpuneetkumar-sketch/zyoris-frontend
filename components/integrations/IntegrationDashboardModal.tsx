"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Connector,
  IntegrationDashboardResponse,
  SyncErrorDetailResponse,
  SyncErrorItem,
  SyncRun,
} from "@/types/integrations";
import {
  getIntegrationDashboardByIdApi,
  retrySyncErrorApi,
} from "@/lib/api/integrationsApi";
import {
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Database,
  Calendar,
  Layers,
  RotateCcw,
  Loader2,
  Check,
  ShieldAlert,
  BarChart3,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface IntegrationDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  connector: Connector | null;
  integrationId?: string | null;
}

export function IntegrationDashboardModal({
  isOpen,
  onClose,
  connector,
  integrationId: propIntegrationId,
}: IntegrationDashboardModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "runs" | "errors">("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<IntegrationDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryingErrorId, setRetryingErrorId] = useState<string | null>(null);

  const targetIntegrationId =
    propIntegrationId ||
    connector?.connectionId ||
    connector?.connectionState?.id ||
    (connector?.isConnected ? connector.id : null);

  const fetchDashboard = useCallback(async () => {
    if (!targetIntegrationId) {
      setError("No active integration instance ID found for this connector.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getIntegrationDashboardByIdApi(targetIntegrationId);
      setDashboardData(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load integration dashboard data from backend.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [targetIntegrationId]);

  useEffect(() => {
    if (isOpen && targetIntegrationId) {
      fetchDashboard();
    } else {
      setDashboardData(null);
      setError(null);
    }
  }, [isOpen, targetIntegrationId, fetchDashboard]);

  const handleRetryError = async (errorId: string) => {
    if (!targetIntegrationId) return;
    setRetryingErrorId(errorId);
    try {
      const res = await retrySyncErrorApi(targetIntegrationId, errorId);
      toast.success(res?.message || "Sync error retry initiated successfully.");
      await fetchDashboard();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to retry sync error. Error may be non-retryable.";
      toast.error(msg);
    } finally {
      setRetryingErrorId(null);
    }
  };

  if (!isOpen) return null;

  const integration = dashboardData?.integration;
  const metrics = dashboardData?.metrics;
  const health = integration?.health || "INACTIVE";
  const successRate = metrics?.successRate ?? 0;
  const counters = metrics?.aggregateCounters;

  const healthColor =
    health === "HEALTHY"
      ? "bg-success/10 text-success border-success/20"
      : health === "DEGRADED"
      ? "bg-warning/10 text-warning border-warning/20"
      : health === "UNHEALTHY"
      ? "bg-error/10 text-error border-error/20"
      : "bg-surface-secondary text-text-muted border-border";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all duration-200 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold flex-shrink-0">
              {connector?.iconUrl ? (
                <img src={connector.iconUrl} alt={connector.name} className="w-6 h-6 object-contain" />
              ) : (
                <Activity className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-text">
                  {integration?.name || connector?.name || "Integration"} Dashboard
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${healthColor}`}>
                  {health}
                </span>
                {integration?.status && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface-secondary text-text-secondary border border-border">
                    {integration.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5 font-mono">
                Instance ID: {targetIntegrationId || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDashboard}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover text-xs font-semibold transition-colors disabled:opacity-50"
              title="Refresh live metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-primary" : "text-text-muted"}`} />
              <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-border bg-surface-secondary/30 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Overview & Health</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("runs")}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "runs"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Recent Runs ({dashboardData?.recentRuns?.length || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("errors")}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "errors"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text"
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>Recent Failures ({dashboardData?.recentFailures?.length || 0})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading && !dashboardData ? (
            <div className="p-16 flex flex-col items-center justify-center space-y-3 text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-xs font-semibold text-text">Loading live integration dashboard...</p>
            </div>
          ) : error ? (
            <div className="p-8 rounded-xl border border-error/20 bg-error/5 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-error mx-auto" />
              <h4 className="text-sm font-bold text-text">Unable to Load Dashboard</h4>
              <p className="text-xs text-text-secondary max-w-md mx-auto">{error}</p>
              <button
                type="button"
                onClick={fetchDashboard}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:bg-primary-dark transition-all"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-5">
                  {/* Top KPIs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl border border-border bg-surface shadow-xs space-y-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                        Success Rate
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-text">{successRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-surface-secondary rounded-full h-1.5 overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            successRate >= 90 ? "bg-success" : successRate >= 70 ? "bg-warning" : "bg-error"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, successRate))}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-surface shadow-xs space-y-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                        Total Runs
                      </span>
                      <div className="text-2xl font-black text-text">{metrics?.totalRuns ?? 0}</div>
                      <span className="text-[10px] text-text-muted">
                        {metrics?.successfulRuns ?? 0} succeeded / {metrics?.failedRuns ?? 0} failed
                      </span>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-surface shadow-xs space-y-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                        Records Processed
                      </span>
                      <div className="text-2xl font-black text-primary">
                        {(counters?.created ?? 0) + (counters?.updated ?? 0)}
                      </div>
                      <span className="text-[10px] text-text-muted font-mono">
                        +{counters?.created ?? 0} created / +{counters?.updated ?? 0} updated
                      </span>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-surface shadow-xs space-y-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                        Active Failures
                      </span>
                      <div className={`text-2xl font-black ${(counters?.failed ?? 0) > 0 ? "text-error" : "text-text"}`}>
                        {counters?.failed ?? 0}
                      </div>
                      <span className="text-[10px] text-text-muted">
                        {counters?.skipped ?? 0} skipped records
                      </span>
                    </div>
                  </div>

                  {/* Sync Schedule & Timestamps */}
                  <div className="p-4 rounded-xl border border-border bg-surface grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-lg bg-info/10 text-info border border-info/20 mt-0.5">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                          Last Synced
                        </span>
                        <span className="text-xs font-medium text-text mt-0.5 block">
                          {integration?.lastSyncedAt
                            ? new Date(integration.lastSyncedAt).toLocaleString()
                            : "Never synced"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-lg bg-success/10 text-success border border-success/20 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                          Last Successful Sync
                        </span>
                        <span className="text-xs font-medium text-text mt-0.5 block">
                          {integration?.lastSuccessfulSync
                            ? new Date(integration.lastSuccessfulSync).toLocaleString()
                            : "None"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 mt-0.5">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                          Next Scheduled Run
                        </span>
                        <span className="text-xs font-medium text-text mt-0.5 block">
                          {integration?.nextScheduledSync
                            ? new Date(integration.nextScheduledSync).toLocaleString()
                            : "On-demand"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: RECENT RUNS */}
              {activeTab === "runs" && (
                <div className="space-y-3">
                  {!dashboardData?.recentRuns || dashboardData.recentRuns.length === 0 ? (
                    <div className="p-10 text-center text-xs text-text-muted space-y-2 border border-dashed border-border rounded-xl">
                      <Activity className="w-6 h-6 mx-auto opacity-40" />
                      <p className="font-semibold text-text">No Recent Sync Runs</p>
                      <p>No execution history recorded for this integration instance yet.</p>
                    </div>
                  ) : (
                    <div className="border border-border rounded-xl bg-surface overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-surface-secondary/70 text-text-muted border-b border-border">
                          <tr>
                            <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Run ID & Status</th>
                            <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Throughput</th>
                            <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Duration</th>
                            <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Started At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {dashboardData.recentRuns.map((run) => (
                            <tr key={run.id} className="hover:bg-surface-hover transition-colors">
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-semibold text-text text-[11px]">
                                    {run.id}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                      run.status === "SUCCESS" || run.status === "COMPLETED"
                                        ? "bg-success/15 text-success border border-success/30"
                                        : run.status === "RUNNING"
                                        ? "bg-primary/15 text-primary border border-primary/30"
                                        : run.status === "FAILED"
                                        ? "bg-error/15 text-error border border-error/30"
                                        : "bg-surface-secondary text-text-muted border border-border"
                                    }`}
                                  >
                                    {run.status}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px]">
                                <span className="text-success font-semibold">
                                  +{run.recordsWritten ?? run.recordsProcessed ?? 0}
                                </span>{" "}
                                /{" "}
                                <span className="text-error font-semibold">
                                  {run.recordsFailed ?? run.errorCount ?? 0} err
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-text-secondary text-[11px]">
                                {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : "—"}
                              </td>
                              <td className="py-2.5 px-3 text-text-muted text-[11px]">
                                {run.startedAt ? new Date(run.startedAt).toLocaleString() : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: RECENT FAILURES & RETRIES */}
              {activeTab === "errors" && (
                <div className="space-y-3">
                  {!dashboardData?.recentFailures || dashboardData.recentFailures.length === 0 ? (
                    <div className="p-10 text-center text-xs text-text-muted space-y-2 border border-dashed border-border rounded-xl">
                      <CheckCircle2 className="w-6 h-6 mx-auto text-success" />
                      <p className="font-semibold text-text">No Sync Failures Detected</p>
                      <p>All recorded sync operations completed without persistent errors.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dashboardData.recentFailures.map((errItem) => {
                        const err = errItem as any;
                        const errorId = err.id;
                        const isRetryable = err.retryable === true;
                        const isRetrying = retryingErrorId === errorId;

                        return (
                          <div
                            key={errorId}
                            className="p-3.5 rounded-xl border border-error/20 bg-error/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-error">
                                  {err.errorCode || err.field || "FIELD_ERROR"}
                                </span>
                                {isRetryable ? (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-warning/15 text-warning border border-warning/30">
                                    Retryable
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-surface-secondary text-text-muted border border-border">
                                    Permanent
                                  </span>
                                )}
                                <span className="text-[10px] text-text-muted font-mono">
                                  {err.createdAt ? new Date(err.createdAt).toLocaleTimeString() : ""}
                                </span>
                              </div>
                              <p className="text-text font-medium text-[11px]">{err.reason || err.errorMessage}</p>
                              {err.record && (
                                <p className="text-[10px] font-mono text-text-secondary">
                                  Record: {err.record}
                                </p>
                              )}
                            </div>

                            <div className="flex-shrink-0">
                              {isRetryable && (
                                <button
                                  type="button"
                                  onClick={() => handleRetryError(errorId)}
                                  disabled={isRetrying}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
                                >
                                  {isRetrying ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-3 h-3" />
                                  )}
                                  <span>{isRetrying ? "Retrying..." : "Retry Error"}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-5 border-t border-border bg-surface flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover text-xs font-semibold transition-colors"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
