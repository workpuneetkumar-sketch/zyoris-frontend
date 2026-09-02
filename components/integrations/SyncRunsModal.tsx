import React, { useState, useEffect, useCallback } from "react";
import {
  Connector,
  SyncRun,
  SyncRunStatus,
  SyncErrorItem,
} from "@/types/integrations";
import {
  getSyncRunsApi,
  getSyncRunByIdApi,
  cancelSyncRunApi,
  getSyncRunErrorsApi,
  getIntegrationSyncErrorsApi,
} from "@/lib/api/integrationsApi";
import {
  X,
  RefreshCw,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  AlertTriangle,
  Loader2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle,
  XCircle,
  Database,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

interface SyncRunsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connector: Connector | null;
}

export function SyncRunsModal({
  isOpen,
  onClose,
  connector,
}: SyncRunsModalProps) {
  const [activeTab, setActiveTab] = useState<"runs" | "errors">("runs");

  // Runs State
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [runsTotal, setRunsTotal] = useState<number>(0);
  const [runsPage, setRunsPage] = useState<number>(1);
  const [runsLimit] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isLoadingRuns, setIsLoadingRuns] = useState<boolean>(false);
  const [runsError, setRunsError] = useState<string | null>(null);

  // Selected Run Detail State
  const [selectedRun, setSelectedRun] = useState<SyncRun | null>(null);
  const [selectedRunErrors, setSelectedRunErrors] = useState<SyncErrorItem[]>([]);
  const [isLoadingRunDetail, setIsLoadingRunDetail] = useState<boolean>(false);

  // All Integration Errors State
  const [allErrors, setAllErrors] = useState<SyncErrorItem[]>([]);
  const [errorsTotal, setErrorsTotal] = useState<number>(0);
  const [errorsPage, setErrorsPage] = useState<number>(1);
  const [errorsLimit] = useState<number>(10);
  const [retryableFilter, setRetryableFilter] = useState<string>("ALL");
  const [isLoadingErrors, setIsLoadingErrors] = useState<boolean>(false);
  const [errorsError, setErrorsError] = useState<string | null>(null);

  // Cancelling run state
  const [cancellingRunId, setCancellingRunId] = useState<string | null>(null);

  const integrationId =
    connector?.connectionId || connector?.connectionState?.id || connector?.id;

  // 1. Fetch Sync Runs
  const fetchRuns = useCallback(async () => {
    if (!integrationId) return;
    setIsLoadingRuns(true);
    setRunsError(null);
    try {
      const res = await getSyncRunsApi(integrationId, {
        page: runsPage,
        limit: runsLimit,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });
      setRuns(res.data || []);
      setRunsTotal(res.total || res.data?.length || 0);
    } catch (err: any) {
      setRunsError(
        err?.response?.data?.message || err?.message || "Failed to load sync runs"
      );
    } finally {
      setIsLoadingRuns(false);
    }
  }, [integrationId, runsPage, runsLimit, statusFilter]);

  // 2. Fetch All Integration Sync Errors
  const fetchAllErrors = useCallback(async () => {
    if (!integrationId) return;
    setIsLoadingErrors(true);
    setErrorsError(null);
    try {
      const retryableParam =
        retryableFilter === "YES" ? true : retryableFilter === "NO" ? false : undefined;
      const res = await getIntegrationSyncErrorsApi(integrationId, {
        page: errorsPage,
        limit: errorsLimit,
        retryable: retryableParam,
      });
      setAllErrors(res.data || []);
      setErrorsTotal(res.total || res.data?.length || 0);
    } catch (err: any) {
      setErrorsError(
        err?.response?.data?.message || err?.message || "Failed to load sync errors"
      );
    } finally {
      setIsLoadingErrors(false);
    }
  }, [integrationId, errorsPage, errorsLimit, retryableFilter]);

  useEffect(() => {
    if (isOpen && integrationId) {
      if (activeTab === "runs") {
        fetchRuns();
      } else {
        fetchAllErrors();
      }
    }
  }, [isOpen, integrationId, activeTab, fetchRuns, fetchAllErrors]);

  // 3. Select & inspect run details + run errors
  const handleSelectRun = async (run: SyncRun) => {
    setSelectedRun(run);
    if (!integrationId) return;
    setIsLoadingRunDetail(true);
    try {
      const [fullRun, runErrorsRes] = await Promise.allSettled([
        getSyncRunByIdApi(integrationId, run.id),
        getSyncRunErrorsApi(integrationId, run.id, { page: 1, limit: 20 }),
      ]);

      if (fullRun.status === "fulfilled") {
        setSelectedRun(fullRun.value);
      }
      if (runErrorsRes.status === "fulfilled") {
        setSelectedRunErrors(runErrorsRes.value.data || []);
      }
    } catch {
      // Keep selected run from list as fallback
    } finally {
      setIsLoadingRunDetail(false);
    }
  };

  // 4. Cancel ongoing sync run
  const handleCancelRun = async (runId: string) => {
    if (!integrationId) return;
    setCancellingRunId(runId);
    try {
      await cancelSyncRunApi(integrationId, runId);
      toast.success("Sync run cancellation requested");
      await fetchRuns();
      if (selectedRun?.id === runId) {
        setSelectedRun((prev) => (prev ? { ...prev, status: "CANCELLED" } : null));
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to cancel sync run"
      );
    } finally {
      setCancellingRunId(null);
    }
  };

  if (!isOpen || !connector) return null;

  const getStatusBadge = (status?: string) => {
    const s = (status || "UNKNOWN").toUpperCase();
    switch (s) {
      case "SUCCESS":
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success/15 text-success border border-success/30">
            <CheckCircle2 className="w-3 h-3" />
            {s}
          </span>
        );
      case "RUNNING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/15 text-primary border border-primary/30 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            RUNNING
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning/15 text-warning border border-warning/30">
            <Clock className="w-3 h-3" />
            PENDING
          </span>
        );
      case "PARTIAL_SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning/15 text-warning border border-warning/30">
            <AlertTriangle className="w-3 h-3" />
            PARTIAL
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-secondary text-text-muted border border-border">
            <Ban className="w-3 h-3" />
            CANCELLED
          </span>
        );
      case "FAILED":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-error/15 text-error border border-error/30">
            <XCircle className="w-3 h-3" />
            FAILED
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-secondary/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">
                Sync History & Runs — {connector.name}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Real-time execution logs, record throughput, cancellation, and error diagnostics
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-5 pt-3 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("runs");
                setSelectedRun(null);
              }}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "runs"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Sync Runs ({runsTotal})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("errors");
                setSelectedRun(null);
              }}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "errors"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span>All Sync Errors ({errorsTotal})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={activeTab === "runs" ? fetchRuns : fetchAllErrors}
            disabled={isLoadingRuns || isLoadingErrors}
            className="mb-2 p-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:bg-surface-secondary transition-colors"
            title="Refresh logs"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isLoadingRuns || isLoadingErrors ? "animate-spin text-primary" : ""
              }`}
            />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === "runs" && (
            <>
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-text-muted" />
                  <span className="font-semibold text-text-secondary">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setRunsPage(1);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-border text-text text-xs focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="RUNNING">Running</option>
                    <option value="PENDING">Pending</option>
                    <option value="SUCCESS">Success / Completed</option>
                    <option value="PARTIAL_SUCCESS">Partial Success</option>
                    <option value="FAILED">Failed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                {selectedRun && (
                  <button
                    type="button"
                    onClick={() => setSelectedRun(null)}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    ← Back to all runs
                  </button>
                )}
              </div>

              {/* Selected Run Details View */}
              {selectedRun ? (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-xl border border-border bg-surface-secondary/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-text">
                          Run #{selectedRun.id}
                        </span>
                        {getStatusBadge(selectedRun.status)}
                      </div>

                      {(selectedRun.status === "RUNNING" || selectedRun.status === "PENDING") && (
                        <button
                          type="button"
                          onClick={() => handleCancelRun(selectedRun.id)}
                          disabled={cancellingRunId === selectedRun.id}
                          className="px-3 py-1 rounded-lg bg-error/10 text-error border border-error/30 hover:bg-error/20 font-semibold text-xs transition-colors flex items-center gap-1.5"
                        >
                          {cancellingRunId === selectedRun.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Ban className="w-3.5 h-3.5" />
                          )}
                          <span>Cancel Run</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-surface border border-border">
                        <span className="text-[11px] text-text-muted block">Records Read</span>
                        <span className="text-sm font-bold text-text">
                          {selectedRun.recordsRead ?? selectedRun.recordsProcessed ?? 0}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface border border-border">
                        <span className="text-[11px] text-text-muted block">Records Written</span>
                        <span className="text-sm font-bold text-success">
                          {selectedRun.recordsWritten ?? 0}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface border border-border">
                        <span className="text-[11px] text-text-muted block">Records Failed</span>
                        <span className="text-sm font-bold text-error">
                          {selectedRun.recordsFailed ?? selectedRun.errorCount ?? 0}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface border border-border">
                        <span className="text-[11px] text-text-muted block">Started At</span>
                        <span className="text-xs font-medium text-text">
                          {selectedRun.startedAt ? new Date(selectedRun.startedAt).toLocaleString() : "—"}
                        </span>
                      </div>
                    </div>

                    {selectedRun.errorMessage && (
                      <div className="p-3 rounded-lg bg-error/10 border border-error/30 text-error text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-bold">Error: </span>
                          <span>{selectedRun.errorMessage}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Record-level Errors in Selected Run */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-text flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                      Record-Level Errors ({selectedRunErrors.length})
                    </h4>

                    {isLoadingRunDetail ? (
                      <div className="p-6 text-center text-xs text-text-muted">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                        Loading error diagnostics...
                      </div>
                    ) : selectedRunErrors.length === 0 ? (
                      <div className="p-4 rounded-xl border border-border bg-surface text-center text-xs text-text-muted">
                        No record-level errors reported for this sync run.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedRunErrors.map((err) => (
                          <div
                            key={err.id}
                            className="p-3 rounded-xl border border-error/30 bg-error/5 space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-error">
                                {err.errorCode || "SYNC_ERROR"}
                              </span>
                              {err.retryable ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/20 text-warning border border-warning/30">
                                  Retryable
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-secondary text-text-muted border border-border">
                                  Non-Retryable
                                </span>
                              )}
                            </div>
                            <p className="text-text font-medium">{err.errorMessage}</p>
                            {err.fieldPath && (
                              <p className="text-[11px] font-mono text-text-muted">
                                Field: {err.fieldPath}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Runs List Table */
                <div className="space-y-3">
                  {isLoadingRuns ? (
                    <div className="p-12 text-center text-xs text-text-muted space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                      <p>Loading sync run history...</p>
                    </div>
                  ) : runsError ? (
                    <div className="p-6 rounded-xl border border-error/30 bg-error/10 text-error text-xs flex items-center justify-between">
                      <span>{runsError}</span>
                      <button
                        type="button"
                        onClick={fetchRuns}
                        className="px-3 py-1 bg-error text-white rounded-lg font-semibold"
                      >
                        Retry
                      </button>
                    </div>
                  ) : runs.length === 0 ? (
                    <div className="p-12 rounded-xl border border-border bg-surface-secondary/20 text-center text-xs text-text-muted space-y-1">
                      <Clock className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-text">No sync runs recorded yet</p>
                      <p>Trigger a manual sync or wait for scheduled sync executions.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-border rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-surface-secondary text-text-muted uppercase text-[10px] border-b border-border">
                          <tr>
                            <th className="py-2.5 px-3">Run ID</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Records (Read / Written / Failed)</th>
                            <th className="py-2.5 px-3">Started At</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {runs.map((r) => (
                            <tr
                              key={r.id}
                              className="hover:bg-surface-hover transition-colors cursor-pointer"
                              onClick={() => handleSelectRun(r)}
                            >
                              <td className="py-3 px-3 font-mono font-semibold text-text">
                                {r.id.slice(0, 12)}...
                              </td>
                              <td className="py-3 px-3">{getStatusBadge(r.status)}</td>
                              <td className="py-3 px-3 text-text-secondary">
                                <span className="font-semibold text-text">
                                  {r.recordsRead ?? r.recordsProcessed ?? 0}
                                </span>{" "}
                                /{" "}
                                <span className="text-success font-semibold">
                                  {r.recordsWritten ?? 0}
                                </span>{" "}
                                /{" "}
                                <span className="text-error font-semibold">
                                  {r.recordsFailed ?? r.errorCount ?? 0}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-text-muted">
                                {r.startedAt
                                  ? new Date(r.startedAt).toLocaleString()
                                  : r.createdAt
                                  ? new Date(r.createdAt).toLocaleString()
                                  : "—"}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectRun(r);
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-surface-secondary border border-border hover:bg-surface-hover text-text font-semibold text-[11px]"
                                >
                                  Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination */}
                  {runsTotal > runsLimit && (
                    <div className="flex items-center justify-between text-xs text-text-muted pt-2">
                      <span>
                        Showing {(runsPage - 1) * runsLimit + 1} to{" "}
                        {Math.min(runsPage * runsLimit, runsTotal)} of {runsTotal} runs
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setRunsPage((p) => Math.max(1, p - 1))}
                          disabled={runsPage === 1}
                          className="p-1 rounded-md border border-border bg-surface text-text disabled:opacity-40"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRunsPage((p) => p + 1)}
                          disabled={runsPage * runsLimit >= runsTotal}
                          className="p-1 rounded-md border border-border bg-surface text-text disabled:opacity-40"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === "errors" && (
            <div className="space-y-3">
              {/* Errors Filter Bar */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-text-muted" />
                  <span className="font-semibold text-text-secondary">Retryable:</span>
                  <select
                    value={retryableFilter}
                    onChange={(e) => {
                      setRetryableFilter(e.target.value);
                      setErrorsPage(1);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-border text-text text-xs focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">All Errors</option>
                    <option value="YES">Retryable Only</option>
                    <option value="NO">Non-Retryable Only</option>
                  </select>
                </div>
              </div>

              {isLoadingErrors ? (
                <div className="p-12 text-center text-xs text-text-muted space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                  <p>Loading integration error records...</p>
                </div>
              ) : errorsError ? (
                <div className="p-6 rounded-xl border border-error/30 bg-error/10 text-error text-xs flex items-center justify-between">
                  <span>{errorsError}</span>
                  <button
                    type="button"
                    onClick={fetchAllErrors}
                    className="px-3 py-1 bg-error text-white rounded-lg font-semibold"
                  >
                    Retry
                  </button>
                </div>
              ) : allErrors.length === 0 ? (
                <div className="p-12 rounded-xl border border-border bg-surface-secondary/20 text-center text-xs text-text-muted space-y-1">
                  <CheckCircle className="w-8 h-8 text-success mx-auto mb-2 opacity-60" />
                  <p className="font-semibold text-text">No sync errors found</p>
                  <p>All recorded synchronization tasks succeeded without record errors.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allErrors.map((err) => (
                    <div
                      key={err.id}
                      className="p-3.5 rounded-xl border border-error/30 bg-surface space-y-2 text-xs shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-error">
                            {err.errorCode || "SYNC_ERROR"}
                          </span>
                          {err.syncRunId && (
                            <span className="text-[10px] font-mono text-text-muted">
                              Run #{err.syncRunId.slice(0, 8)}
                            </span>
                          )}
                        </div>
                        {err.retryable ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/20 text-warning border border-warning/30">
                            Retryable
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-secondary text-text-muted border border-border">
                            Permanent
                          </span>
                        )}
                      </div>
                      <p className="text-text font-medium">{err.errorMessage}</p>
                      <div className="flex items-center justify-between text-[11px] text-text-muted font-mono pt-1 border-t border-border">
                        <span>Field: {err.fieldPath || "—"}</span>
                        <span>{new Date(err.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Errors Pagination */}
              {errorsTotal > errorsLimit && (
                <div className="flex items-center justify-between text-xs text-text-muted pt-2">
                  <span>
                    Showing {(errorsPage - 1) * errorsLimit + 1} to{" "}
                    {Math.min(errorsPage * errorsLimit, errorsTotal)} of {errorsTotal} errors
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setErrorsPage((p) => Math.max(1, p - 1))}
                      disabled={errorsPage === 1}
                      className="p-1 rounded-md border border-border bg-surface text-text disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setErrorsPage((p) => p + 1)}
                      disabled={errorsPage * errorsLimit >= errorsTotal}
                      className="p-1 rounded-md border border-border bg-surface text-text disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border flex justify-end bg-surface-secondary/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface border border-border hover:bg-surface-hover text-text font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
