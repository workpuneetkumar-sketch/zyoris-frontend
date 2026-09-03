"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  SyncLogItem,
  SyncLogsQuery,
  SyncErrorItem,
  SyncErrorsQuery,
  IntegrationMonitoringStats,
  IntegrationInstance,
} from "@/types/integrations";
import {
  getIntegrationLogsApi,
  getIntegrationErrorsApi,
  getIntegrationStatsApi,
} from "@/lib/api/integrationsApi";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Code,
  Database,
  Eye,
  Filter,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Sliders,
  X,
  Zap,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import classNames from "classnames";
import { toast } from "sonner";

export interface IntegrationMonitoringDashboardProps {
  integrationId?: string;
  integrations?: IntegrationInstance[];
  onTriggerSync?: (id: string) => Promise<void>;
  className?: string;
}

export const IntegrationMonitoringDashboard: React.FC<IntegrationMonitoringDashboardProps> = ({
  integrationId,
  integrations = [],
  onTriggerSync,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<"LOGS" | "ERRORS">("LOGS");
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>(
    integrationId || ""
  );

  // Statistics State
  const [stats, setStats] = useState<IntegrationMonitoringStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Logs State
  const [logs, setLogs] = useState<SyncLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsStatusFilter, setLogsStatusFilter] = useState<string>("");
  const [logsSearchQuery, setLogsSearchQuery] = useState("");

  // Errors State
  const [errors, setErrors] = useState<SyncErrorItem[]>([]);
  const [isLoadingErrors, setIsLoadingErrors] = useState(false);
  const [errorsPage, setErrorsPage] = useState(1);
  const [errorsTotalPages, setErrorsTotalPages] = useState(1);
  const [errorsResolvedFilter, setErrorsResolvedFilter] = useState<string>("");
  const [selectedErrorForDetail, setSelectedErrorForDetail] = useState<SyncErrorItem | null>(null);

  // 1. Fetch Aggregate Statistics
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const res = await getIntegrationStatsApi(
        selectedIntegrationId || undefined
      );
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err: any) {
      console.warn("Failed to fetch monitoring stats:", err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [selectedIntegrationId]);

  // 2. Fetch Sync Logs
  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const query: SyncLogsQuery = {
        page: logsPage,
        limit: 10,
        integrationId: selectedIntegrationId || undefined,
        status: logsStatusFilter || undefined,
      };
      const res = await getIntegrationLogsApi(query);
      if (res.success && Array.isArray(res.data)) {
        setLogs(res.data);
        if (res.pagination) {
          setLogsTotalPages(res.pagination.totalPages || 1);
        }
      }
    } catch (err: any) {
      console.warn("Failed to fetch sync logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [logsPage, selectedIntegrationId, logsStatusFilter]);

  // 3. Fetch Sync Errors
  const fetchErrors = useCallback(async () => {
    setIsLoadingErrors(true);
    try {
      const query: SyncErrorsQuery = {
        page: errorsPage,
        limit: 10,
        integrationId: selectedIntegrationId || undefined,
        resolved:
          errorsResolvedFilter === "resolved"
            ? true
            : errorsResolvedFilter === "unresolved"
            ? false
            : undefined,
      };
      const res = await getIntegrationErrorsApi(query);
      if (res.success && Array.isArray(res.data)) {
        setErrors(res.data);
        if (res.pagination) {
          setErrorsTotalPages(res.pagination.totalPages || 1);
        }
      }
    } catch (err: any) {
      console.warn("Failed to fetch sync errors:", err);
    } finally {
      setIsLoadingErrors(false);
    }
  }, [errorsPage, selectedIntegrationId, errorsResolvedFilter]);

  // Initial Load & on filter changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === "LOGS") {
      fetchLogs();
    } else {
      fetchErrors();
    }
  }, [activeTab, fetchLogs, fetchErrors]);

  const handleRefreshAll = () => {
    fetchStats();
    if (activeTab === "LOGS") fetchLogs();
    else fetchErrors();
    toast.success("Monitoring logs refreshed.");
  };

  // Filter logs locally if search query is provided
  const filteredLogs = logs.filter((log) => {
    if (!logsSearchQuery.trim()) return true;
    const q = logsSearchQuery.toLowerCase().trim();
    return (
      (log.integrationName && log.integrationName.toLowerCase().includes(q)) ||
      (log.provider && log.provider.toLowerCase().includes(q)) ||
      (log.entityType && log.entityType.toLowerCase().includes(q)) ||
      (log.status && log.status.toLowerCase().includes(q))
    );
  });

  return (
    <div className={classNames("space-y-4", className)}>
      {/* Dashboard Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-surface shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-text">
              Integration Monitoring & Audit Logs
            </h3>
            <p className="text-xs text-text-muted">
              Live telemetry, sync execution history, error diagnostics, and operational metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Integration Scope Filter */}
          <select
            value={selectedIntegrationId}
            onChange={(e) => setSelectedIntegrationId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
          >
            <option value="">All Connected Integrations</option>
            {integrations.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name || i.displayName || i.provider}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isLoadingStats || isLoadingLogs || isLoadingErrors}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text text-xs font-semibold transition-colors shadow-xs"
          >
            <RefreshCw
              className={classNames(
                "w-3.5 h-3.5",
                (isLoadingStats || isLoadingLogs || isLoadingErrors) &&
                  "animate-spin text-primary"
              )}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Aggregate Statistics Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Runs */}
        <div className="p-3.5 rounded-2xl border border-border bg-surface shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-text-muted block">Total Runs</span>
          <p className="text-lg font-bold text-text font-mono">
            {stats ? stats.totalRuns : isLoadingStats ? "..." : "0"}
          </p>
          <span className="text-[10px] text-text-muted">All recorded syncs</span>
        </div>

        {/* Successful */}
        <div className="p-3.5 rounded-2xl border border-success/20 bg-success/5 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-success block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Success</span>
          </span>
          <p className="text-lg font-bold text-success font-mono">
            {stats ? stats.totalSuccessful : isLoadingStats ? "..." : "0"}
          </p>
          <span className="text-[10px] text-success/80">Completed cleanly</span>
        </div>

        {/* Failed */}
        <div className="p-3.5 rounded-2xl border border-error/20 bg-error/5 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-error block flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
          <p className="text-lg font-bold text-error font-mono">
            {stats ? stats.totalFailed : isLoadingStats ? "..." : "0"}
          </p>
          <span className="text-[10px] text-error/80">Require inspection</span>
        </div>

        {/* Records Synced */}
        <div className="p-3.5 rounded-2xl border border-border bg-surface shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-text-muted block flex items-center gap-1">
            <Database className="w-3 h-3 text-info" />
            <span>Records Synced</span>
          </span>
          <p className="text-lg font-bold text-text font-mono">
            {stats ? stats.totalRecordsSynced.toLocaleString() : isLoadingStats ? "..." : "0"}
          </p>
          <span className="text-[10px] text-text-muted">Delivered to Zyoris</span>
        </div>

        {/* Failure Rate */}
        <div className="p-3.5 rounded-2xl border border-border bg-surface shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-text-muted block">Failure Rate</span>
          <p className="text-lg font-bold text-text font-mono">
            {stats?.failureRate !== null && stats?.failureRate !== undefined
              ? `${stats.failureRate.toFixed(1)}%`
              : "0%"}
          </p>
          <span className="text-[10px] text-text-muted">Error frequency</span>
        </div>

        {/* Active Integrations */}
        <div className="p-3.5 rounded-2xl border border-border bg-surface shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-text-muted block">Active Targets</span>
          <p className="text-lg font-bold text-text font-mono">
            {stats ? stats.activeIntegrations : isLoadingStats ? "..." : "0"}
          </p>
          <span className="text-[10px] text-text-muted">Integrations with runs</span>
        </div>
      </div>

      {/* Tabs: Sync Logs vs Sync Errors */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("LOGS")}
            className={classNames(
              "px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5",
              activeTab === "LOGS"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-text-muted hover:text-text hover:bg-surface-secondary"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Sync Run History ({logs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ERRORS")}
            className={classNames(
              "px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5",
              activeTab === "ERRORS"
                ? "bg-error text-error-foreground shadow-xs"
                : "text-text-muted hover:text-text hover:bg-surface-secondary"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Error Records ({stats?.totalErrors ?? errors.length})</span>
          </button>
        </div>

        {/* Filters */}
        {activeTab === "LOGS" ? (
          <div className="flex items-center gap-2">
            <div className="relative w-48 hidden sm:block">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={logsSearchQuery}
                onChange={(e) => setLogsSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-8 pr-2.5 py-1 rounded-xl border border-border bg-surface text-xs text-text placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <select
              value={logsStatusFilter}
              onChange={(e) => {
                setLogsStatusFilter(e.target.value);
                setLogsPage(1);
              }}
              className="px-2.5 py-1 rounded-xl border border-border bg-surface text-xs text-text focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">Success Only</option>
              <option value="FAILED">Failed Only</option>
              <option value="RUNNING">Running</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={errorsResolvedFilter}
              onChange={(e) => {
                setErrorsResolvedFilter(e.target.value);
                setErrorsPage(1);
              }}
              className="px-2.5 py-1 rounded-xl border border-border bg-surface text-xs text-text focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="">All Errors</option>
              <option value="unresolved">Unresolved Only</option>
              <option value="resolved">Resolved Only</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === "LOGS" ? (
        <div className="border border-border rounded-2xl bg-surface overflow-hidden shadow-2xs">
          {isLoadingLogs ? (
            <div className="p-12 text-center text-xs text-text-muted space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p>Loading sync run history...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-text-muted space-y-2">
              <Clock className="w-8 h-8 opacity-40 mx-auto" />
              <h4 className="font-bold text-sm text-text">No Sync Runs Recorded</h4>
              <p>Trigger a manual sync or connect a live webhook to start streaming logs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-secondary/70 text-text-muted border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Timestamp / Run ID</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Integration</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Direction / Trigger</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Duration</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Processed / Records</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-text block">
                          {new Date(log.startedAt).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">
                          {log.id.substring(0, 12)}...
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-text">
                        <span>{log.integrationName || log.provider || "Connector"}</span>
                        {log.entityType && (
                          <span className="text-[10px] text-text-muted block font-mono">
                            {log.entityType}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {log.direction === "INBOUND" ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-info" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
                          )}
                          <span className="font-medium">{log.direction || "INBOUND"}</span>
                        </div>
                        <span className="text-[10px] text-text-muted font-mono">{log.trigger}</span>
                      </td>

                      <td className="py-2.5 px-3 font-mono">
                        {log.durationMs !== undefined ? `${log.durationMs}ms` : "-"}
                      </td>

                      <td className="py-2.5 px-3 font-mono">
                        <span className="text-success font-semibold">
                          +{log.successfulRecords ?? log.recordsProcessed ?? 0}
                        </span>
                        {Boolean(log.failedRecords) && (
                          <span className="text-error font-semibold ml-1.5">
                            -{log.failedRecords}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={classNames(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            log.status === "SUCCESS"
                              ? "bg-success/10 text-success border border-success/20"
                              : log.status === "FAILED"
                              ? "bg-error/10 text-error border border-error/20"
                              : log.status === "RUNNING"
                              ? "bg-info/10 text-info border border-info/20 animate-pulse"
                              : "bg-surface-secondary text-text-muted border border-border"
                          )}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Logs Pagination Footer */}
          {logsTotalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-border text-xs text-text-muted">
              <span>Page {logsPage} of {logsTotalPages}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={logsPage === 1}
                  onClick={() => setLogsPage((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={logsPage === logsTotalPages}
                  onClick={() => setLogsPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Sync Errors Table */
        <div className="border border-border rounded-2xl bg-surface overflow-hidden shadow-2xs">
          {isLoadingErrors ? (
            <div className="p-12 text-center text-xs text-text-muted space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p>Loading sync error records...</p>
            </div>
          ) : errors.length === 0 ? (
            <div className="p-12 text-center text-xs text-text-muted space-y-2">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto" />
              <h4 className="font-bold text-sm text-text">No Sync Errors Detected</h4>
              <p>All sync pipelines and webhook ingestion processes are executing normally.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-secondary/70 text-text-muted border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Timestamp</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Error Code / Entity</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Error Message</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Retryable</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Status</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {errors.map((err) => (
                    <tr key={err.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-text-muted">
                        {new Date(err.createdAt).toLocaleString()}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="font-bold text-error font-mono">
                          {err.errorCode || "SYNC_ERROR"}
                        </span>
                        {err.entityType && (
                          <span className="text-[10px] text-text-muted block font-mono">
                            {err.entityType}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 max-w-xs">
                        <p className="text-text font-medium line-clamp-2">{err.errorMessage}</p>
                      </td>

                      <td className="py-2.5 px-3">
                        {err.retryable ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-warning/10 text-warning border border-warning/20">
                            Retryable ({err.retryCount})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-secondary text-text-muted border border-border">
                            Fatal
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {err.resolved ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success border border-success/20">
                            Resolved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-error/10 text-error border border-error/20">
                            Unresolved
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => setSelectedErrorForDetail(err)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-hover text-text text-xs font-medium"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Errors Pagination Footer */}
          {errorsTotalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-border text-xs text-text-muted">
              <span>Page {errorsPage} of {errorsTotalPages}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={errorsPage === 1}
                  onClick={() => setErrorsPage((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={errorsPage === errorsTotalPages}
                  onClick={() => setErrorsPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Detail / Stack Trace Modal */}
      {selectedErrorForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-error font-bold text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Error Diagnostics: {selectedErrorForDetail.errorCode || "SYNC_ERROR"}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedErrorForDetail(null)}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 text-xs">
              <div>
                <span className="font-semibold text-text block mb-1">Error Message</span>
                <div className="p-3 rounded-xl bg-error/5 border border-error/20 text-error font-medium">
                  {selectedErrorForDetail.errorMessage}
                </div>
              </div>

              {selectedErrorForDetail.errorStack && (
                <div>
                  <span className="font-semibold text-text block mb-1">Stack Trace</span>
                  <pre className="p-3 rounded-xl bg-surface-secondary border border-border text-[11px] font-mono overflow-x-auto max-h-40">
                    {selectedErrorForDetail.errorStack}
                  </pre>
                </div>
              )}

              {selectedErrorForDetail.rawPayload && (
                <div>
                  <span className="font-semibold text-text block mb-1">Payload Context</span>
                  <pre className="p-3 rounded-xl bg-surface-secondary border border-border text-[11px] font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(selectedErrorForDetail.rawPayload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedErrorForDetail(null)}
                className="px-4 py-1.5 rounded-xl bg-surface border border-border text-text hover:bg-surface-hover text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
