"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  getSyncRunErrorsApi,
  startIntegrationSyncJobApi,
  cancelSyncRunApi,
  resolveIntegrationErrorApi,
  retrySyncErrorRecordApi,
} from "@/lib/api/integrationsApi";
import { getAuditLogs, AuditLog } from "@/lib/api/auditApi";
import { WebhookConfigurationPanel } from "./WebhookConfigurationPanel";
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
  Play,
  StopCircle,
  ShieldCheck,
  FileText,
  Check,
  Radio,
  Calendar,
  AlertOctagon,
  Webhook,
  ExternalLink,
  FileCode,
  RotateCcw,
} from "lucide-react";
import classNames from "classnames";
import { toast } from "sonner";

export interface IntegrationMonitoringDashboardProps {
  integrationId?: string;
  integrations?: IntegrationInstance[];
  onTriggerSync?: (id: string) => Promise<void>;
  onNavigateToMapping?: (integrationId: string, entityType?: string) => void;
  className?: string;
}

export const IntegrationMonitoringDashboard: React.FC<IntegrationMonitoringDashboardProps> = ({
  integrationId,
  integrations = [],
  onTriggerSync,
  onNavigateToMapping,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<"LOGS" | "ERRORS" | "WEBHOOKS" | "AUDIT">("LOGS");
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
  const [isRetryingErrorId, setIsRetryingErrorId] = useState<string | null>(null);
  const [isResolvingErrorId, setIsResolvingErrorId] = useState<string | null>(null);
  const [errorNotes, setErrorNotes] = useState<string>("");

  const handleToggleErrorResolution = async (errItem: SyncErrorItem, customNotes?: string) => {
    setIsResolvingErrorId(errItem.id);
    const nextResolvedState = !errItem.resolved;
    try {
      const res = await resolveIntegrationErrorApi(errItem.integrationId, errItem.id, {
        resolved: nextResolvedState,
        notes: customNotes || errorNotes,
        resolvedBy: "Operations User",
      });
      // Optimistically update errors list
      setErrors((prev) =>
        prev.map((e) =>
          e.id === errItem.id
            ? { ...e, resolved: nextResolvedState, resolvedAt: nextResolvedState ? new Date().toISOString() : undefined }
            : e
        )
      );
      if (selectedErrorForDetail?.id === errItem.id) {
        setSelectedErrorForDetail((prev) =>
          prev
            ? { ...prev, resolved: nextResolvedState, resolvedAt: nextResolvedState ? new Date().toISOString() : undefined }
            : null
        );
      }
      toast.success(res.message || `Error marked as ${nextResolvedState ? "resolved" : "unresolved"}.`);
      fetchStats();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update error resolution.");
    } finally {
      setIsResolvingErrorId(null);
    }
  };

  const handleRetryErrorRecord = async (errItem: SyncErrorItem) => {
    if (!errItem.retryable) {
      toast.error("This error is non-retryable. Please resolve schema or mapping rule first.");
      return;
    }
    setIsRetryingErrorId(errItem.id);
    try {
      const res = await retrySyncErrorRecordApi(errItem.integrationId, errItem.id);
      toast.success(res.message || "Retry job enqueued for this record.");
      fetchLogs();
      fetchErrors();
      fetchStats();
    } catch (err: any) {
      toast.error(err?.message || "Failed to retry error record.");
    } finally {
      setIsRetryingErrorId(null);
    }
  };

  const handleNavigateToMapping = (errItem: SyncErrorItem) => {
    if (onNavigateToMapping) {
      onNavigateToMapping(errItem.integrationId, errItem.entityType || "contacts");
    } else {
      toast.info(`Opening mapping configuration for entity: ${errItem.entityType || "contacts"}`);
    }
  };

  // Audit Events State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);

  // Run Details & Record Errors State
  const [selectedRunForDetail, setSelectedRunForDetail] = useState<SyncLogItem | null>(null);
  const [runErrors, setRunErrors] = useState<any[]>([]);
  const [isLoadingRunErrors, setIsLoadingRunErrors] = useState(false);
  const [isRetryingRun, setIsRetryingRun] = useState(false);
  const [cancellingRunId, setCancellingRunId] = useState<string | null>(null);
  const [runIdFilter, setRunIdFilter] = useState("");

  // Start Sync Job Modal State
  const [isStartSyncModalOpen, setIsStartSyncModalOpen] = useState(false);
  const [syncTargetId, setSyncTargetId] = useState<string>(selectedIntegrationId || integrations[0]?.id || "");
  const [syncEntityType, setSyncEntityType] = useState<string>("contacts");
  const [isStartingSync, setIsStartingSync] = useState(false);

  // Safe Single-Flight Polling State & Mutex Ref
  const [isLivePollingEnabled, setIsLivePollingEnabled] = useState(true);
  const isPollingFlightRef = useRef(false);

  // Determine if any sync job is currently active
  const hasActiveJob = useMemo(() => {
    return logs.some((l) => l.status === "RUNNING" || l.status === "PENDING");
  }, [logs]);

  const handleOpenRunDetail = async (run: SyncLogItem) => {
    setSelectedRunForDetail(run);
    setIsLoadingRunErrors(true);
    try {
      const res = await getSyncRunErrorsApi(run.integrationId, run.id);
      if (res && Array.isArray(res.data)) {
        setRunErrors(res.data);
      } else {
        setRunErrors([]);
      }
    } catch (err) {
      console.warn("Could not query run specific errors via API, using fallback:", err);
      const matching = errors.filter(
        (e) => (e as any).runId === run.id || (e as any).syncRunId === run.id
      );
      setRunErrors(matching);
    } finally {
      setIsLoadingRunErrors(false);
    }
  };

  const handleRetryRun = async (integrationIdToRetry: string) => {
    setIsRetryingRun(true);
    try {
      if (onTriggerSync) {
        await onTriggerSync(integrationIdToRetry);
      } else {
        await startIntegrationSyncJobApi(integrationIdToRetry, { entityType: "contacts" });
      }
      toast.success("Sync job successfully re-queued for execution.");
      setIsLivePollingEnabled(true);
      fetchLogs();
      fetchStats();
    } catch (err: any) {
      toast.error(err?.message || "Failed to trigger retry for sync run.");
    } finally {
      setIsRetryingRun(false);
    }
  };

  const handleCancelRun = async (run: SyncLogItem) => {
    setCancellingRunId(run.id);
    try {
      await cancelSyncRunApi(run.integrationId, run.id);
      toast.success(`Sync run ${run.id.substring(0, 8)}... cancelled.`);
      fetchLogs();
      fetchStats();
      if (selectedRunForDetail?.id === run.id) {
        setSelectedRunForDetail((prev) => (prev ? { ...prev, status: "CANCELLED" } : null));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel sync run.");
    } finally {
      setCancellingRunId(null);
    }
  };

  const handleStartSync = async () => {
    const target = syncTargetId || selectedIntegrationId || integrations[0]?.id;
    if (!target) {
      toast.error("Please select an integration to start sync.");
      return;
    }
    setIsStartingSync(true);
    try {
      const res = await startIntegrationSyncJobApi(target, { entityType: syncEntityType });
      const jobId = res?.data?.jobId;
      toast.success(
        jobId
          ? `Background sync job enqueued! Job ID: ${jobId.substring(0, 18)}...`
          : "Background sync job enqueued successfully."
      );
      setIsStartSyncModalOpen(false);
      setIsLivePollingEnabled(true);
      fetchLogs();
      fetchStats();
      if (activeTab === "AUDIT") fetchAudit();
    } catch (err: any) {
      toast.error(err?.message || "Failed to start sync job.");
    } finally {
      setIsStartingSync(false);
    }
  };

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

  // 4. Fetch Audit Logs
  const fetchAudit = useCallback(async () => {
    setIsLoadingAudit(true);
    try {
      const res = await getAuditLogs(auditPage, 15);
      if (res && Array.isArray(res.logs)) {
        setAuditLogs(res.logs);
        if (res.pagination) {
          setAuditTotalPages(res.pagination.totalPages || 1);
        }
      }
    } catch (err: any) {
      console.warn("Failed to fetch audit logs:", err);
    } finally {
      setIsLoadingAudit(false);
    }
  }, [auditPage]);

  // 5. Safe Single-Flight Background Polling
  const pollActiveJobsSilently = useCallback(async () => {
    if (isPollingFlightRef.current) return; // Prevent request storms
    isPollingFlightRef.current = true;
    try {
      const query: SyncLogsQuery = {
        page: logsPage,
        limit: 10,
        integrationId: selectedIntegrationId || undefined,
        status: logsStatusFilter || undefined,
      };
      const [logsRes, statsRes] = await Promise.allSettled([
        getIntegrationLogsApi(query),
        getIntegrationStatsApi(selectedIntegrationId || undefined),
      ]);
      if (logsRes.status === "fulfilled" && logsRes.value?.success && Array.isArray(logsRes.value.data)) {
        setLogs(logsRes.value.data);
      }
      if (statsRes.status === "fulfilled" && statsRes.value?.success && statsRes.value.data) {
        setStats(statsRes.value.data);
      }
    } catch (err) {
      console.warn("Silent polling error:", err);
    } finally {
      isPollingFlightRef.current = false;
    }
  }, [logsPage, selectedIntegrationId, logsStatusFilter]);

  // Active Job Polling Timer Effect (3.5s interval with single-flight mutex lock)
  useEffect(() => {
    if (!isLivePollingEnabled || !hasActiveJob) return;
    const intervalId = setInterval(() => {
      pollActiveJobsSilently();
    }, 3500);
    return () => clearInterval(intervalId);
  }, [isLivePollingEnabled, hasActiveJob, pollActiveJobsSilently]);

  // Initial Load & on filter changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === "LOGS") {
      fetchLogs();
    } else if (activeTab === "ERRORS") {
      fetchErrors();
    } else if (activeTab === "AUDIT") {
      fetchAudit();
    }
  }, [activeTab, fetchLogs, fetchErrors, fetchAudit]);

  const handleRefreshAll = () => {
    fetchStats();
    if (activeTab === "LOGS") fetchLogs();
    else if (activeTab === "ERRORS") fetchErrors();
    else fetchAudit();
    toast.success("Monitoring logs refreshed.");
  };

  // Day 10 Computed Metrics to guarantee live counters & status consistency
  const computedMetrics = useMemo(() => {
    const fetched =
      stats?.totalFetched ??
      logs.reduce((acc, l) => acc + (l.fetched ?? l.recordsProcessed ?? 0), 0);
    const created =
      stats?.totalCreated ??
      logs.reduce((acc, l) => acc + (l.created ?? l.successfulRecords ?? 0), 0);
    const updated =
      stats?.totalUpdated ??
      logs.reduce((acc, l) => acc + (l.updated ?? 0), 0);
    const skipped =
      stats?.totalSkipped ??
      logs.reduce((acc, l) => acc + (l.skipped ?? 0), 0);
    const failed =
      stats?.totalFailed ??
      stats?.totalRecordsFailed ??
      logs.reduce((acc, l) => acc + (l.failed ?? l.failedRecords ?? 0), 0);

    const lastSuccessful =
      stats?.lastSuccessfulSyncAt ||
      logs.find((l) => l.status === "SUCCESS")?.completedAt ||
      stats?.lastSyncAt ||
      null;

    const nextScheduled =
      stats?.nextScheduledSyncAt ||
      (lastSuccessful
        ? new Date(new Date(lastSuccessful).getTime() + 3600000).toISOString()
        : null);

    let health: "HEALTHY" | "DEGRADED" | "CRITICAL" | "SYNCING" | "IDLE" = "HEALTHY";
    if (hasActiveJob) {
      health = "SYNCING";
    } else if (stats && stats.totalRuns > 0) {
      const failRate =
        stats.failureRate ??
        (stats.totalRuns > 0 ? (stats.totalFailed / stats.totalRuns) * 100 : 0);
      if (failRate > 25) health = "CRITICAL";
      else if (failRate > 5) health = "DEGRADED";
      else health = "HEALTHY";
    } else if (logs.length === 0) {
      health = "IDLE";
    }

    return {
      fetched,
      created,
      updated,
      skipped,
      failed,
      lastSuccessful,
      nextScheduled,
      health,
      recentErrors: stats?.totalErrors ?? errors.length,
    };
  }, [stats, logs, errors, hasActiveJob]);

  // Filter logs locally if search query or run ID filter is provided
  const filteredLogs = logs.filter((log) => {
    if (runIdFilter.trim() && !log.id.toLowerCase().includes(runIdFilter.toLowerCase().trim())) {
      return false;
    }
    if (!logsSearchQuery.trim()) return true;
    const q = logsSearchQuery.toLowerCase().trim();
    return (
      (log.integrationName && log.integrationName.toLowerCase().includes(q)) ||
      (log.provider && log.provider.toLowerCase().includes(q)) ||
      (log.entityType && log.entityType.toLowerCase().includes(q)) ||
      (log.status && log.status.toLowerCase().includes(q)) ||
      (log.id && log.id.toLowerCase().includes(q))
    );
  });

  const filteredErrors = errors.filter((err) => {
    if (
      runIdFilter.trim() &&
      !((err as any).runId || (err as any).syncRunId || "").toLowerCase().includes(runIdFilter.toLowerCase().trim())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className={classNames("space-y-4", className)}>
      {/* Dashboard Top Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-surface shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-text">
                Integration Monitoring & Audit Dashboard
              </h3>
              {/* Operational Health Badge */}
              <span
                className={classNames(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                  computedMetrics.health === "HEALTHY" &&
                    "bg-success/10 text-success border-success/20",
                  computedMetrics.health === "SYNCING" &&
                    "bg-primary/10 text-primary border-primary/20 animate-pulse",
                  computedMetrics.health === "DEGRADED" &&
                    "bg-warning/10 text-warning border-warning/20",
                  computedMetrics.health === "CRITICAL" &&
                    "bg-error/10 text-error border-error/20",
                  computedMetrics.health === "IDLE" &&
                    "bg-surface-secondary text-text-muted border-border"
                )}
              >
                <span
                  className={classNames(
                    "w-1.5 h-1.5 rounded-full",
                    computedMetrics.health === "HEALTHY" && "bg-success",
                    computedMetrics.health === "SYNCING" && "bg-primary animate-ping",
                    computedMetrics.health === "DEGRADED" && "bg-warning",
                    computedMetrics.health === "CRITICAL" && "bg-error",
                    computedMetrics.health === "IDLE" && "bg-text-muted"
                  )}
                />
                {computedMetrics.health}
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Live telemetry, BullMQ execution workers, live counters, error retryability, and lifecycle audit events.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          {/* Polling Activity Indicator / Toggle */}
          <button
            type="button"
            onClick={() => setIsLivePollingEnabled((prev) => !prev)}
            title={isLivePollingEnabled ? "Click to pause background polling" : "Click to enable background polling"}
            className={classNames(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-colors",
              isLivePollingEnabled && hasActiveJob
                ? "bg-primary/10 border-primary/30 text-primary animate-pulse"
                : isLivePollingEnabled
                ? "bg-surface border-border text-text-muted hover:text-text"
                : "bg-surface-secondary border-border text-text-muted line-through"
            )}
          >
            <Radio className={classNames("w-3 h-3", isLivePollingEnabled && hasActiveJob && "text-primary")} />
            <span>{isLivePollingEnabled ? (hasActiveJob ? "Live Polling Active" : "Polling Ready") : "Polling Paused"}</span>
          </button>

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

          {/* Start Sync Job Button */}
          <button
            type="button"
            onClick={() => {
              setSyncTargetId(selectedIntegrationId || integrations[0]?.id || "");
              setIsStartSyncModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Sync Job</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isLoadingStats || isLoadingLogs || isLoadingErrors || isLoadingAudit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text text-xs font-semibold transition-colors shadow-xs"
          >
            <RefreshCw
              className={classNames(
                "w-3.5 h-3.5",
                (isLoadingStats || isLoadingLogs || isLoadingErrors || isLoadingAudit) &&
                  "animate-spin text-primary"
              )}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tier 1: Operational Health & Schedule Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Pipeline Health */}
        <div className="p-3.5 rounded-2xl border border-border bg-surface shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-text-muted">Health Status</span>
            <ShieldCheck className={classNames("w-3.5 h-3.5", computedMetrics.health === "HEALTHY" ? "text-success" : "text-warning")} />
          </div>
          <p className="text-base font-bold text-text font-mono">
            {computedMetrics.health}
          </p>
          <span className="text-[10px] text-text-muted block truncate">
            Failure Rate: {stats?.failureRate !== null && stats?.failureRate !== undefined ? `${stats.failureRate.toFixed(1)}%` : "0%"}
          </span>
        </div>

        {/* Last Successful Sync */}
        <div className="p-3.5 rounded-2xl border border-border bg-surface shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-text-muted">Last Successful Sync</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          </div>
          <p className="text-base font-bold text-text font-mono truncate">
            {computedMetrics.lastSuccessful
              ? new Date(computedMetrics.lastSuccessful).toLocaleTimeString()
              : "Never"}
          </p>
          <span className="text-[10px] text-text-muted block truncate">
            {computedMetrics.lastSuccessful
              ? new Date(computedMetrics.lastSuccessful).toLocaleDateString()
              : "No completed syncs"}
          </span>
        </div>

        {/* Next Scheduled Sync */}
        <div className="p-3.5 rounded-2xl border border-border bg-surface shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-text-muted">Next Scheduled Sync</span>
            <Calendar className="w-3.5 h-3.5 text-info" />
          </div>
          <p className="text-base font-bold text-text font-mono truncate">
            {computedMetrics.nextScheduled
              ? new Date(computedMetrics.nextScheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : "Automatic / Webhook"}
          </p>
          <span className="text-[10px] text-text-muted block truncate">
            Cadence: 1 hour interval
          </span>
        </div>

        {/* Recent Errors */}
        <div className={classNames(
          "p-3.5 rounded-2xl border shadow-2xs space-y-1",
          computedMetrics.recentErrors > 0
            ? "border-error/20 bg-error/5"
            : "border-border bg-surface"
        )}>
          <div className="flex items-center justify-between">
            <span className={classNames("text-[11px] font-semibold", computedMetrics.recentErrors > 0 ? "text-error" : "text-text-muted")}>Recent Errors</span>
            <AlertCircle className={classNames("w-3.5 h-3.5", computedMetrics.recentErrors > 0 ? "text-error" : "text-text-muted")} />
          </div>
          <p className={classNames("text-base font-bold font-mono", computedMetrics.recentErrors > 0 ? "text-error" : "text-text")}>
            {computedMetrics.recentErrors}
          </p>
          <span className={classNames("text-[10px]", computedMetrics.recentErrors > 0 ? "text-error/80" : "text-text-muted")}>
            {stats?.unresolvedErrors ?? 0} unresolved issues
          </span>
        </div>
      </div>

      {/* Tier 2: Live Record Breakdown Counters (Day 10 Requirement) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Fetched Records */}
        <div className="p-3 rounded-2xl border border-border bg-surface shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-text-muted flex items-center gap-1">
            <Database className="w-3 h-3 text-primary" />
            <span>Fetched</span>
          </span>
          <p className="text-lg font-bold text-text font-mono">
            {computedMetrics.fetched.toLocaleString()}
          </p>
          <span className="text-[10px] text-text-muted">Retrieved from source</span>
        </div>

        {/* Created Records */}
        <div className="p-3 rounded-2xl border border-success/20 bg-success/5 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-success flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Created</span>
          </span>
          <p className="text-lg font-bold text-success font-mono">
            +{computedMetrics.created.toLocaleString()}
          </p>
          <span className="text-[10px] text-success/80">New records added</span>
        </div>

        {/* Updated Records */}
        <div className="p-3 rounded-2xl border border-info/20 bg-info/5 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-info flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            <span>Updated</span>
          </span>
          <p className="text-lg font-bold text-info font-mono">
            ~{computedMetrics.updated.toLocaleString()}
          </p>
          <span className="text-[10px] text-info/80">Existing records modified</span>
        </div>

        {/* Skipped Records */}
        <div className="p-3 rounded-2xl border border-border bg-surface shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-text-muted flex items-center gap-1">
            <Sliders className="w-3 h-3 text-text-muted" />
            <span>Skipped</span>
          </span>
          <p className="text-lg font-bold text-text-muted font-mono">
            {computedMetrics.skipped.toLocaleString()}
          </p>
          <span className="text-[10px] text-text-muted">Unchanged / Deduplicated</span>
        </div>

        {/* Failed Records */}
        <div className="p-3 rounded-2xl border border-error/20 bg-error/5 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-error flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Failed</span>
          </span>
          <p className="text-lg font-bold text-error font-mono">
            -{computedMetrics.failed.toLocaleString()}
          </p>
          <span className="text-[10px] text-error/80">Require retry / review</span>
        </div>
      </div>

      {/* Tabs: Sync Logs vs Sync Errors vs Audit Events */}
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
            {errors.some((e) => !e.resolved) && (
              <span className="px-1.5 py-0.2 rounded-full bg-surface/20 text-[10px] font-bold">
                {errors.filter((e) => !e.resolved).length} unaddressed
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("WEBHOOKS")}
            className={classNames(
              "px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5",
              activeTab === "WEBHOOKS"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-text-muted hover:text-text hover:bg-surface-secondary"
            )}
          >
            <Webhook className="w-3.5 h-3.5" />
            <span>Webhooks & Ingress</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("AUDIT")}
            className={classNames(
              "px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5",
              activeTab === "AUDIT"
                ? "bg-text text-surface shadow-xs"
                : "text-text-muted hover:text-text hover:bg-surface-secondary"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit Events ({auditLogs.length})</span>
          </button>
        </div>

        {/* Filters */}
        {activeTab === "LOGS" ? (
          <div className="flex items-center gap-2">
            <div className="relative w-40 hidden sm:block">
              <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={runIdFilter}
                onChange={(e) => setRunIdFilter(e.target.value)}
                placeholder="Filter by Run ID..."
                className="w-full pl-8 pr-2.5 py-1 rounded-xl border border-border bg-surface text-xs text-text placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-primary font-mono text-[11px]"
              />
            </div>

            <div className="relative w-44 hidden sm:block">
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
              <option value="RUNNING">Running Only</option>
              <option value="PENDING">Pending Only</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        ) : activeTab === "ERRORS" ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl bg-surface-secondary p-0.5 border border-border text-xs">
              <button
                type="button"
                onClick={() => {
                  setErrorsResolvedFilter("");
                  setErrorsPage(1);
                }}
                className={classNames(
                  "px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors",
                  errorsResolvedFilter === ""
                    ? "bg-surface text-text shadow-2xs font-bold"
                    : "text-text-muted hover:text-text"
                )}
              >
                All ({errors.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorsResolvedFilter("unresolved");
                  setErrorsPage(1);
                }}
                className={classNames(
                  "px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors flex items-center gap-1",
                  errorsResolvedFilter === "unresolved"
                    ? "bg-error/15 text-error font-bold shadow-2xs"
                    : "text-text-muted hover:text-text"
                )}
              >
                <span>Unresolved</span>
                <span className="px-1.5 py-0.2 rounded-full bg-error/20 text-error text-[10px]">
                  {errors.filter((e) => !e.resolved).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorsResolvedFilter("resolved");
                  setErrorsPage(1);
                }}
                className={classNames(
                  "px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors",
                  errorsResolvedFilter === "resolved"
                    ? "bg-success/15 text-success font-bold shadow-2xs"
                    : "text-text-muted hover:text-text"
                )}
              >
                Resolved ({errors.filter((e) => e.resolved).length})
              </button>
            </div>

            <div className="relative w-36 hidden md:block">
              <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={runIdFilter}
                onChange={(e) => setRunIdFilter(e.target.value)}
                placeholder="Run ID..."
                className="w-full pl-8 pr-2.5 py-1 rounded-xl border border-border bg-surface text-xs text-text placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-primary font-mono text-[11px]"
              />
            </div>
          </div>
        ) : activeTab === "WEBHOOKS" ? (
          <div className="text-xs text-text-muted flex items-center gap-1.5 font-mono">
            <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span>Real-time Ingress Listener</span>
          </div>
        ) : (
          <div className="text-xs text-text-muted font-mono">
            {auditLogs.length} audit trail records recorded
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
              <p>Trigger a manual sync job above to stream live BullMQ execution telemetry.</p>
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
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Record Counters</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Status</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-text block">
                          {new Date(log.startedAt).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted block">
                          Run: {log.id.substring(0, 10)}...
                        </span>
                        {log.jobId && (
                          <span className="text-[9px] font-mono text-primary/80 block">
                            Job: {log.jobId.substring(0, 16)}...
                          </span>
                        )}
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
                        {log.durationMs !== undefined
                          ? `${log.durationMs}ms`
                          : log.duration !== undefined
                          ? `${log.duration}ms`
                          : "-"}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-primary font-semibold" title="Fetched Records">
                            F:{log.fetched ?? log.recordsProcessed ?? 0}
                          </span>
                          <span className="text-success font-semibold" title="Created Records">
                            +C:{log.created ?? log.successfulRecords ?? 0}
                          </span>
                          {Boolean(log.updated) && (
                            <span className="text-info font-semibold" title="Updated Records">
                              ~U:{log.updated}
                            </span>
                          )}
                          {Boolean(log.skipped) && (
                            <span className="text-text-muted font-semibold" title="Skipped Records">
                              -S:{log.skipped}
                            </span>
                          )}
                          {Boolean(log.failed || log.failedRecords) && (
                            <span className="text-error font-semibold" title="Failed Records">
                              !E:{log.failed ?? log.failedRecords}
                            </span>
                          )}
                        </div>
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
                              : log.status === "PENDING"
                              ? "bg-warning/10 text-warning border border-warning/20"
                              : "bg-surface-secondary text-text-muted border border-border"
                          )}
                        >
                          {log.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenRunDetail(log)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-hover text-text text-[11px] font-semibold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                            <span>Inspect</span>
                          </button>

                          {(log.status === "RUNNING" || log.status === "PENDING") && (
                            <button
                              type="button"
                              onClick={() => handleCancelRun(log)}
                              disabled={cancellingRunId === log.id}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-error/30 bg-error/10 hover:bg-error/20 text-error text-[11px] font-semibold transition-colors"
                            >
                              {cancellingRunId === log.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <StopCircle className="w-3 h-3" />
                              )}
                              <span>Cancel</span>
                            </button>
                          )}
                        </div>
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
      ) : activeTab === "ERRORS" ? (
        /* Sync Errors Table */
        <div className="border border-border rounded-2xl bg-surface overflow-hidden shadow-2xs">
          {isLoadingErrors ? (
            <div className="p-12 text-center text-xs text-text-muted space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p>Loading sync error records...</p>
            </div>
          ) : filteredErrors.length === 0 ? (
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
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Record / Field Context</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Error Message</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Retryable</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Status</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredErrors.map((err) => (
                    <tr key={err.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-text-muted whitespace-nowrap">
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

                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5 font-mono text-[11px]">
                          <div className="flex items-center gap-1 text-text">
                            <Database className="w-3 h-3 text-text-muted shrink-0" />
                            <span className="truncate max-w-[130px]" title={`Record ID: ${err.sourceRecordId || err.targetRecordId || err.id}`}>
                              {err.sourceRecordId || err.targetRecordId || `#${err.id.slice(-6)}`}
                            </span>
                          </div>
                          {err.fieldPath && (
                            <div className="flex items-center gap-1">
                              <Code className="w-2.5 h-2.5 text-primary shrink-0" />
                              <span className="px-1.5 py-0.2 rounded bg-surface-secondary border border-border text-[10px] text-primary font-semibold truncate max-w-[130px]">
                                {err.fieldPath}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 max-w-xs">
                        <p className="text-text font-medium line-clamp-2">{err.errorMessage}</p>
                      </td>

                      <td className="py-2.5 px-3">
                        {err.retryable ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-warning/10 text-warning border border-warning/20">
                            Retryable ({err.retryCount ?? 0})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-secondary text-text-muted border border-border">
                            Fatal / Non-retryable
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Conditional Retry: STRICTLY RENDERED ONLY WHEN retryable === true */}
                          {err.retryable ? (
                            <button
                              type="button"
                              onClick={() => handleRetryErrorRecord(err)}
                              disabled={isRetryingErrorId === err.id}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-warning/30 bg-warning/10 hover:bg-warning/20 text-warning text-xs font-semibold transition-colors"
                              title="Retry sync for this failed record"
                            >
                              <RotateCcw className={classNames("w-3 h-3", isRetryingErrorId === err.id && "animate-spin")} />
                              <span>{isRetryingErrorId === err.id ? "Retrying..." : "Retry"}</span>
                            </button>
                          ) : (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-medium text-text-muted bg-surface-secondary border border-border cursor-not-allowed select-none"
                              title="This error cannot be retried automatically (schema or rule constraint failure)"
                            >
                              Non-Retryable
                            </span>
                          )}

                          {/* Navigation to Affected Integration & Mapping */}
                          <button
                            type="button"
                            onClick={() => handleNavigateToMapping(err)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-hover text-text text-xs font-medium transition-colors"
                            title="Open and fix in mapping workspace"
                          >
                            <ExternalLink className="w-3 h-3 text-info" />
                            <span>Fix Mapping</span>
                          </button>

                          {/* Quick Resolution Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleErrorResolution(err)}
                            disabled={isResolvingErrorId === err.id}
                            className={classNames(
                              "flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-colors",
                              err.resolved
                                ? "border-border bg-surface hover:bg-surface-hover text-text-muted"
                                : "border-success/30 bg-success/10 hover:bg-success/20 text-success"
                            )}
                            title={err.resolved ? "Reopen this error" : "Mark error as resolved"}
                          >
                            <Check className="w-3 h-3" />
                            <span>{err.resolved ? "Reopen" : "Resolve"}</span>
                          </button>

                          {/* Inspect Deep Diagnostics */}
                          <button
                            type="button"
                            onClick={() => setSelectedErrorForDetail(err)}
                            className="p-1 rounded-lg border border-border bg-surface hover:bg-surface-hover text-text"
                            title="Inspect deep diagnostics, stack trace, and payload"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                          </button>
                        </div>
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
      ) : activeTab === "WEBHOOKS" ? (
        /* Webhooks Ingress & Subscriptions Panel */
        <WebhookConfigurationPanel
          integrationId={selectedIntegrationId || integrations[0]?.id || "crm_default"}
          defaultProvider="CRM"
        />
      ) : (
        /* Lifecycle Audit Events View */
        <div className="border border-border rounded-2xl bg-surface overflow-hidden shadow-2xs">
          {isLoadingAudit ? (
            <div className="p-12 text-center text-xs text-text-muted space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p>Loading lifecycle audit events...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-text-muted space-y-2">
              <FileText className="w-8 h-8 opacity-40 mx-auto" />
              <h4 className="font-bold text-sm text-text">No Audit Events Recorded</h4>
              <p>Lifecycle changes such as sync jobs and integration modifications will produce immutable audit records here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-secondary/70 text-text-muted border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Timestamp</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Action</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Actor / User</th>
                    <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">Event Details / Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-text-muted whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={classNames(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            log.action.includes("STARTED")
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : log.action.includes("COMPLETED") || log.action.includes("SUCCESS")
                              ? "bg-success/10 text-success border border-success/20"
                              : log.action.includes("FAILED") || log.action.includes("ERROR")
                              ? "bg-error/10 text-error border border-error/20"
                              : log.action.includes("CANCEL")
                              ? "bg-warning/10 text-warning border border-warning/20"
                              : "bg-surface-secondary text-text border border-border"
                          )}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-text">
                        <span className="font-medium block">
                          {log.user?.name || log.user?.email || "System Worker / BullMQ"}
                        </span>
                        {log.user?.email && (
                          <span className="text-[10px] text-text-muted font-mono block">
                            {log.user.email}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <div className="font-mono text-[10px] bg-surface-secondary/70 p-1.5 rounded-lg border border-border text-text-muted max-w-md truncate">
                            {JSON.stringify(log.metadata)}
                          </div>
                        ) : (
                          <span className="text-text-muted text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Audit Pagination Footer */}
          {auditTotalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-border text-xs text-text-muted">
              <span>Page {auditPage} of {auditTotalPages}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={auditPage === 1}
                  onClick={() => setAuditPage((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={auditPage === auditTotalPages}
                  onClick={() => setAuditPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-border bg-surface text-text hover:bg-surface-hover disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Start Sync Job Modal (Day 10 Requirement) */}
      {isStartSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Play className="w-4 h-4 fill-current" />
                <span>Start Integration Sync Job</span>
              </div>
              <button
                type="button"
                onClick={() => setIsStartSyncModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-text-muted">
                Enqueues a background sync execution job via BullMQ (<strong className="font-mono text-text">POST /integrations/:id/sync/start</strong>). The worker loads credentials, retrieves records, applies transformation rules, and produces a SyncRun telemetry record.
              </p>

              <div>
                <label className="font-semibold text-text block mb-1">Target Integration</label>
                <select
                  value={syncTargetId}
                  onChange={(e) => setSyncTargetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text focus:ring-1 focus:ring-primary focus:outline-hidden font-medium"
                >
                  {integrations.length === 0 ? (
                    <option value="">No integrations configured</option>
                  ) : (
                    integrations.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name || i.displayName || i.provider} ({i.id})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="font-semibold text-text block mb-1">Entity Type to Sync</label>
                <select
                  value={syncEntityType}
                  onChange={(e) => setSyncEntityType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs text-text focus:ring-1 focus:ring-primary focus:outline-hidden font-medium"
                >
                  <option value="contacts">contacts (Standard CRM Contacts)</option>
                  <option value="deals">deals (Sales Pipeline & Opportunities)</option>
                  <option value="leads">leads (Inbound Leads & Prospects)</option>
                  <option value="companies">companies (Account Organizations)</option>
                  <option value="all">all (Full Workspace Sync)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsStartSyncModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-border bg-surface text-text hover:bg-surface-hover text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isStartingSync || !syncTargetId}
                onClick={handleStartSync}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
              >
                {isStartingSync ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>{isStartingSync ? "Enqueuing..." : "Start Sync"}</span>
              </button>
            </div>
          </div>
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

      {/* Sync Run Details, Job Progress & Error Retryability Modal */}
      {selectedRunForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl p-5 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text">
                    Sync Run Telemetry & Execution Progress
                  </h4>
                  <p className="text-[11px] text-text-muted font-mono">
                    Run ID: {selectedRunForDetail.id} {selectedRunForDetail.jobId ? `• BullMQ Job: ${selectedRunForDetail.jobId}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRunForDetail(null)}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 text-xs pr-1">
              {/* Job Progress & Execution Status Bar */}
              <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-text">Job Execution Progress</span>
                  <div className="flex items-center gap-2">
                    {(selectedRunForDetail.status === "RUNNING" || selectedRunForDetail.status === "PENDING") && (
                      <button
                        type="button"
                        onClick={() => handleCancelRun(selectedRunForDetail)}
                        disabled={cancellingRunId === selectedRunForDetail.id}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-error/10 hover:bg-error/20 text-error border border-error/20 transition-colors"
                      >
                        {cancellingRunId === selectedRunForDetail.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <StopCircle className="w-3 h-3" />
                        )}
                        <span>Cancel Run</span>
                      </button>
                    )}

                    <span
                      className={classNames(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        selectedRunForDetail.status === "SUCCESS"
                          ? "bg-success/10 text-success border border-success/20"
                          : selectedRunForDetail.status === "FAILED"
                          ? "bg-error/10 text-error border border-error/20"
                          : selectedRunForDetail.status === "RUNNING"
                          ? "bg-info/10 text-info border border-info/20 animate-pulse"
                          : selectedRunForDetail.status === "PENDING"
                          ? "bg-warning/10 text-warning border border-warning/20"
                          : "bg-surface-secondary text-text-muted border border-border"
                      )}
                    >
                      {selectedRunForDetail.status}
                    </span>
                  </div>
                </div>

                {/* Progress Bar calculation */}
                {(() => {
                  const fetched = selectedRunForDetail.fetched ?? selectedRunForDetail.recordsProcessed ?? 0;
                  const created = selectedRunForDetail.created ?? selectedRunForDetail.successfulRecords ?? 0;
                  const updated = selectedRunForDetail.updated ?? 0;
                  const skipped = selectedRunForDetail.skipped ?? 0;
                  const failed = selectedRunForDetail.failed ?? selectedRunForDetail.failedRecords ?? 0;
                  const processed = created + updated + skipped + failed;
                  const total = Math.max(1, fetched || processed || 1);
                  const pct =
                    selectedRunForDetail.status === "SUCCESS"
                      ? 100
                      : selectedRunForDetail.status === "RUNNING"
                      ? Math.min(95, Math.max(5, Math.round((processed / total) * 100)))
                      : Math.min(100, Math.round((processed / total) * 100));

                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-text-muted font-mono">
                        <span>Completion Rate: {pct}%</span>
                        <span>
                          Duration: {selectedRunForDetail.durationMs !== undefined
                            ? `${selectedRunForDetail.durationMs}ms`
                            : selectedRunForDetail.duration !== undefined
                            ? `${selectedRunForDetail.duration}ms`
                            : "—"}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                        <div
                          className={classNames(
                            "h-full transition-all duration-500",
                            selectedRunForDetail.status === "SUCCESS"
                              ? "bg-success"
                              : selectedRunForDetail.status === "FAILED"
                              ? "bg-error"
                              : "bg-primary"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Day 10 Record Counters Breakdown Grid (Fetched, Created, Updated, Skipped, Failed) */}
                <div className="grid grid-cols-5 gap-2 pt-1 font-mono text-[11px]">
                  <div className="p-2 rounded-lg bg-surface border border-border">
                    <span className="text-[10px] text-text-muted block font-sans">Fetched</span>
                    <span className="text-text font-bold">
                      {selectedRunForDetail.fetched ?? selectedRunForDetail.recordsProcessed ?? 0}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-success/5 border border-success/20">
                    <span className="text-[10px] text-success block font-sans">Created</span>
                    <span className="text-success font-bold">
                      +{selectedRunForDetail.created ?? selectedRunForDetail.successfulRecords ?? 0}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-info/5 border border-info/20">
                    <span className="text-[10px] text-info block font-sans">Updated</span>
                    <span className="text-info font-bold">
                      ~{selectedRunForDetail.updated ?? 0}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface border border-border">
                    <span className="text-[10px] text-text-muted block font-sans">Skipped</span>
                    <span className="text-text-muted font-bold">
                      {selectedRunForDetail.skipped ?? 0}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-error/5 border border-error/20">
                    <span className="text-[10px] text-error block font-sans">Failed</span>
                    <span className="text-error font-bold">
                      -{selectedRunForDetail.failed ?? selectedRunForDetail.failedRecords ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Record-Level Errors Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs text-text flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                    <span>Record-Level Sync Errors & Retryability ({runErrors.length})</span>
                  </h5>
                  {Boolean(selectedRunForDetail.failedRecords || runErrors.length > 0) && (
                    <button
                      type="button"
                      onClick={() => handleRetryRun(selectedRunForDetail.integrationId)}
                      disabled={isRetryingRun}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-warning/10 hover:bg-warning/20 border border-warning/30 text-warning font-semibold text-[11px] transition-colors shadow-2xs"
                    >
                      {isRetryingRun ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      <span>Retry Sync Run</span>
                    </button>
                  )}
                </div>

                {isLoadingRunErrors ? (
                  <div className="p-6 text-center text-xs text-text-muted space-y-1.5">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-primary" />
                    <p>Querying record-level sync errors for this run...</p>
                  </div>
                ) : runErrors.length === 0 ? (
                  <div className="p-5 text-center text-xs text-text-muted border border-border rounded-xl bg-surface-secondary/30 space-y-1">
                    <CheckCircle2 className="w-5 h-5 text-success mx-auto opacity-70" />
                    <p className="font-semibold text-text">No Sync Errors Detected</p>
                    <p className="text-[11px]">All records in this run processed and persisted successfully.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
                    {runErrors.map((err: any, idx: number) => (
                      <div key={err.id || idx} className="p-3 space-y-1.5 hover:bg-surface-hover transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-error text-[11px]">
                            {err.errorCode || "SYNC_ERROR"}
                          </span>
                          <span
                            className={classNames(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              err.retryable
                                ? "bg-warning/10 text-warning border border-warning/20"
                                : "bg-surface-secondary text-text-muted border border-border"
                            )}
                          >
                            {err.retryable ? `Retryable (Attempts: ${err.retryCount ?? 0})` : "Fatal / Non-retryable"}
                          </span>
                        </div>
                        <p className="text-text font-medium text-xs">{err.errorMessage}</p>
                        {err.entityType && (
                          <span className="text-[10px] font-mono text-text-muted block">
                            Entity: {err.entityType} {err.recordId ? `• ID: ${err.recordId}` : ""}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-[11px] text-text-muted">
                Trigger: <strong className="text-text">{selectedRunForDetail.trigger || "MANUAL"}</strong> • Direction:{" "}
                <strong className="text-text">{selectedRunForDetail.direction || "INBOUND"}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedRunForDetail(null)}
                className="px-4 py-1.5 rounded-xl bg-surface border border-border text-text hover:bg-surface-hover text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day 11: Error Diagnostics & Record Context Modal */}
      {selectedErrorForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div
                  className={classNames(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                    selectedErrorForDetail.retryable
                      ? "bg-warning/10 border-warning/20 text-warning"
                      : "bg-error/10 border-error/20 text-error"
                  )}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text">
                    Sync Error Diagnostics & Record Context
                  </h4>
                  <p className="text-[11px] text-text-muted font-mono">
                    ID: {selectedErrorForDetail.id} • Integration: {selectedErrorForDetail.integrationName || selectedErrorForDetail.integrationId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedErrorForDetail(null)}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 overflow-y-auto flex-1 text-xs pr-1">
              {/* Status & Retryability Banner */}
              <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/50 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-mono font-bold text-sm text-error">
                    {selectedErrorForDetail.errorCode || "RECORD_TRANSFORMATION_ERROR"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={classNames(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        selectedErrorForDetail.retryable
                          ? "bg-warning/10 text-warning border border-warning/20"
                          : "bg-surface text-text-muted border border-border"
                      )}
                    >
                      {selectedErrorForDetail.retryable
                        ? `Retryable (Attempts: ${selectedErrorForDetail.retryCount ?? 0})`
                        : "Fatal / Non-retryable"}
                    </span>
                    <span
                      className={classNames(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        selectedErrorForDetail.resolved
                          ? "bg-success/10 text-success border border-success/20"
                          : "bg-error/10 text-error border border-error/20"
                      )}
                    >
                      {selectedErrorForDetail.resolved ? "Resolved" : "Unresolved"}
                    </span>
                  </div>
                </div>
                <p className="text-text font-medium text-xs">
                  {selectedErrorForDetail.errorMessage}
                </p>
              </div>

              {/* Record & Field Context Grid */}
              <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2">
                <h5 className="font-bold text-xs text-text flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-primary" />
                  <span>Record & Field Diagnostics</span>
                </h5>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-surface-secondary">
                    <span className="text-text-muted block text-[10px] font-sans">Entity Type</span>
                    <span className="text-text font-bold">
                      {selectedErrorForDetail.entityType || "contacts"}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-surface-secondary">
                    <span className="text-text-muted block text-[10px] font-sans">Failing Field Path</span>
                    <span className="text-primary font-bold">
                      {selectedErrorForDetail.fieldPath || "schema-level validation"}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-surface-secondary">
                    <span className="text-text-muted block text-[10px] font-sans">Source Record ID</span>
                    <span className="text-text truncate block select-all">
                      {selectedErrorForDetail.sourceRecordId || "src_record_" + selectedErrorForDetail.id.slice(0, 6)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-surface-secondary">
                    <span className="text-text-muted block text-[10px] font-sans">Target Record ID</span>
                    <span className="text-text truncate block select-all">
                      {selectedErrorForDetail.targetRecordId || "tgt_unpersisted"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resolution Notes Input */}
              <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs text-text flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-success" />
                    <span>Resolution State & Audit Notes</span>
                  </h5>
                  {selectedErrorForDetail.resolvedAt && (
                    <span className="text-[10px] text-text-muted">
                      Resolved on: {new Date(selectedErrorForDetail.resolvedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <textarea
                  value={errorNotes}
                  onChange={(e) => setErrorNotes(e.target.value)}
                  placeholder="Add resolution notes or rationale (e.g. Added phone normalizer rule in mapping workspace)..."
                  className="w-full p-2.5 rounded-xl border border-border bg-surface-secondary text-xs text-text placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-primary font-sans resize-none h-16"
                />
              </div>

              {/* Raw Record / Payload Viewer */}
              {(selectedErrorForDetail.rawPayload || selectedErrorForDetail.payload) && (
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-text flex items-center gap-1.5 font-mono">
                      <Code className="w-3.5 h-3.5 text-primary" />
                      <span>Failing Record Raw Payload</span>
                    </h5>
                  </div>
                  <pre className="p-2.5 rounded-xl bg-surface-secondary border border-border text-[10px] font-mono text-text overflow-x-auto max-h-36 select-all">
                    {JSON.stringify(selectedErrorForDetail.rawPayload || selectedErrorForDetail.payload, null, 2)}
                  </pre>
                </div>
              )}

              {/* Stack Trace / Error Stack */}
              {(selectedErrorForDetail.errorStack || selectedErrorForDetail.stackTrace) && (
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2">
                  <h5 className="font-bold text-xs text-text flex items-center gap-1.5 font-mono">
                    <AlertOctagon className="w-3.5 h-3.5 text-error" />
                    <span>Error Stack Trace</span>
                  </h5>
                  <pre className="p-2.5 rounded-xl bg-surface-secondary border border-border text-[10px] font-mono text-error/90 overflow-x-auto max-h-28 whitespace-pre-wrap select-all">
                    {selectedErrorForDetail.errorStack || selectedErrorForDetail.stackTrace}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {/* Strict Retry Enforcement: Only if retryable === true */}
                {selectedErrorForDetail.retryable ? (
                  <button
                    type="button"
                    onClick={() => handleRetryErrorRecord(selectedErrorForDetail)}
                    disabled={isRetryingErrorId === selectedErrorForDetail.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-warning hover:bg-warning/90 text-warning-foreground font-bold text-xs transition-colors shadow-xs"
                  >
                    <RotateCcw className={classNames("w-3.5 h-3.5", isRetryingErrorId === selectedErrorForDetail.id && "animate-spin")} />
                    <span>{isRetryingErrorId === selectedErrorForDetail.id ? "Retrying Record..." : "Retry Failed Record"}</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-text-muted italic">
                    Non-retryable constraint error. Fix field mapping first.
                  </span>
                )}

                {/* Fix in Mapping Button */}
                <button
                  type="button"
                  onClick={() => {
                    handleNavigateToMapping(selectedErrorForDetail);
                    setSelectedErrorForDetail(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text font-semibold text-xs transition-colors shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-info" />
                  <span>Fix in Mapping</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Resolution State Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleErrorResolution(selectedErrorForDetail)}
                  disabled={isResolvingErrorId === selectedErrorForDetail.id}
                  className={classNames(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors shadow-xs",
                    selectedErrorForDetail.resolved
                      ? "border border-border bg-surface hover:bg-surface-hover text-text"
                      : "bg-success hover:bg-success/90 text-success-foreground"
                  )}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {isResolvingErrorId === selectedErrorForDetail.id
                      ? "Updating..."
                      : selectedErrorForDetail.resolved
                      ? "Reopen Error"
                      : "Mark as Resolved"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedErrorForDetail(null)}
                  className="px-4 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text font-semibold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
