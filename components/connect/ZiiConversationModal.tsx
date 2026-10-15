"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  X,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  CheckSquare,
  FileText,
  UserCheck,
  TrendingUp,
  Tag,
  Clock,
} from "lucide-react";
import {
  getSessionSummary,
  executeZiiAction,
  ZiiConversationSummary,
  ZiiStructuredAction,
  ZiiExecuteActionResponse,
} from "@/lib/api/ziiApi";

interface ZiiConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle: string;
  isChannel?: boolean;
}

export default function ZiiConversationModal({
  isOpen,
  onClose,
  sessionId,
  sessionTitle,
  isChannel = true,
}: ZiiConversationModalProps) {
  const [summaryData, setSummaryData] = useState<ZiiConversationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Structured Action execution states: actionId -> { loading, completed, error, result }
  const [actionStates, setActionStates] = useState<
    Record<
      string,
      {
        loading: boolean;
        completed: boolean;
        error?: string | null;
        result?: ZiiExecuteActionResponse | null;
      }
    >
  >({});

  useEffect(() => {
    if (isOpen && sessionId) {
      loadSummary();
    } else {
      setSummaryData(null);
      setError(null);
      setActionStates({});
    }
  }, [isOpen, sessionId]);

  const loadSummary = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getSessionSummary(sessionId, {
        channelId: isChannel ? sessionId : undefined,
        conversationId: !isChannel ? sessionId : undefined,
        messageLimit: 50,
      });
      setSummaryData(data);
    } catch (err: any) {
      console.error("Failed to generate ZII conversation summary:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to generate conversation summary. Please verify communication history exists."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (action: ZiiStructuredAction) => {
    const actionKey = action.id || action.actionType;
    if (actionStates[actionKey]?.loading || actionStates[actionKey]?.completed) {
      return; // Prevent duplicate submission
    }

    setActionStates((prev) => ({
      ...prev,
      [actionKey]: { loading: true, completed: false, error: null },
    }));

    try {
      const res = await executeZiiAction({
        sessionId,
        actionType: action.actionType,
        targetEntityType: action.targetEntityType,
        targetEntityId: action.targetEntityId,
        parameters: action.parameters,
        confirmed: true,
        channelId: isChannel ? sessionId : undefined,
        conversationId: !isChannel ? sessionId : undefined,
      });

      setActionStates((prev) => ({
        ...prev,
        [actionKey]: {
          loading: false,
          completed: true,
          result: res,
          error: null,
        },
      }));
    } catch (err: any) {
      console.error("Failed to execute ZII action:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Action execution failed. Please verify your permissions.";
      setActionStates((prev) => ({
        ...prev,
        [actionKey]: {
          loading: false,
          completed: false,
          error: msg,
        },
      }));
    }
  };

  const getActionIcon = (type: string) => {
    const upper = (type || "").toUpperCase();
    if (upper.includes("TASK")) return <CheckSquare size={16} className="text-primary shrink-0" />;
    if (upper.includes("MEETING")) return <Calendar size={16} className="text-warning shrink-0" />;
    if (upper.includes("LEAD")) return <UserCheck size={16} className="text-success shrink-0" />;
    if (upper.includes("DEAL")) return <TrendingUp size={16} className="text-primary shrink-0" />;
    if (upper.includes("NOTE")) return <FileText size={16} className="text-text-muted shrink-0" />;
    return <Tag size={16} className="text-primary shrink-0" />;
  };

  if (!isOpen) return null;

  return (
    <div
      id="zii-summary-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="zii-summary-modal-card"
        className="relative w-full max-w-2xl bg-surface rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border bg-surface flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text tracking-tight">
                  ZII Conversation Intelligence
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 uppercase tracking-wider">
                  AI Summary & Actions
                </span>
              </div>
              <p className="text-xs text-text-muted truncate max-w-md">
                Analyzing discussion context for <span className="font-semibold text-text">{sessionTitle}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="refresh-zii-summary-btn"
              type="button"
              onClick={loadSummary}
              disabled={loading}
              className="p-2 text-text-muted hover:text-primary hover:bg-surface-hover rounded-xl border border-border transition-colors disabled:opacity-50"
              title="Regenerate Summary"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              id="close-zii-summary-btn"
              type="button"
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text hover:bg-surface-hover rounded-xl transition-colors"
              title="Close Modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-surface">
          {/* Loading State */}
          {loading && !summaryData ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-sm font-semibold text-text">Synthesizing discussion...</p>
              <p className="text-xs text-text-muted max-w-xs">
                Extracting key takeaways, decisions, and actionable tasks from message history.
              </p>
            </div>
          ) : error ? (
            /* Error State */
            <div className="p-4 rounded-2xl bg-error-light border border-error text-error text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle size={16} />
                <span>Failed to generate conversation summary</span>
              </div>
              <p className="leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={loadSummary}
                className="mt-2 px-3 py-1.5 rounded-xl bg-error text-surface font-semibold text-xs hover:opacity-90 transition-opacity"
              >
                Retry Analysis
              </button>
            </div>
          ) : summaryData ? (
            <>
              {/* Executive Summary Card */}
              <div className="p-4 rounded-2xl bg-surface-hover border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Executive Summary
                  </span>
                  {summaryData.sentiment && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border">
                      Sentiment: {summaryData.sentiment}
                    </span>
                  )}
                </div>
                <p className="text-sm text-text leading-relaxed font-normal">
                  {summaryData.summary}
                </p>
              </div>

              {/* Key Decisions */}
              {summaryData.decisions && summaryData.decisions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-success" />
                    <span>Decisions Made</span>
                  </h3>
                  <div className="space-y-1.5">
                    {summaryData.decisions.map((dec, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2.5 rounded-xl bg-surface-hover/60 border border-border text-xs text-text"
                      >
                        <CheckCircle2 size={14} className="text-success mt-0.5 shrink-0" />
                        <span>{dec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Discussion Points */}
              {summaryData.keyPoints && summaryData.keyPoints.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={14} className="text-primary" />
                    <span>Discussion Highlights</span>
                  </h3>
                  <ul className="space-y-1.5">
                    {summaryData.keyPoints.map((pt, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-text-muted flex items-start gap-2 bg-surface p-2 rounded-lg border border-border"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span className="text-text">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Structured Action Items */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-primary" />
                    <span>Structured Actions ({summaryData.actionItems?.length || 0})</span>
                  </h3>
                  <span className="text-[10px] text-text-muted">
                    Click to review & execute directly into CRM
                  </span>
                </div>

                {(!summaryData.actionItems || summaryData.actionItems.length === 0) ? (
                  <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-text-muted">
                    No immediate action items detected from this conversation.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {summaryData.actionItems.map((act) => {
                      const actKey = act.id || act.actionType;
                      const actState = actionStates[actKey] || {
                        loading: false,
                        completed: false,
                      };

                      return (
                        <div
                          key={actKey}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            actState.completed
                              ? "bg-success/5 border-success/30 shadow-xs"
                              : "bg-surface-hover border-border hover:border-primary/40 shadow-xs"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center border border-border shrink-0 mt-0.5">
                                {getActionIcon(act.actionType)}
                              </div>
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-text truncate">
                                    {act.title}
                                  </span>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface text-text-muted border border-border">
                                    {act.actionType}
                                  </span>
                                  {act.requiresApproval && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-warning-light text-warning border border-warning">
                                      Requires Approval
                                    </span>
                                  )}
                                </div>
                                {act.description && (
                                  <p className="text-[11px] text-text-muted leading-relaxed">
                                    {act.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Execution Button */}
                            <div className="shrink-0 flex items-center gap-2">
                              {actState.completed ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success text-surface text-xs font-semibold shadow-xs">
                                  <CheckCircle2 size={14} />
                                  <span>Executed</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleExecuteAction(act)}
                                  disabled={actState.loading}
                                  className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 active:scale-98 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                                >
                                  {actState.loading ? (
                                    <>
                                      <Loader2 size={13} className="animate-spin" />
                                      <span>Submitting...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>Execute Action</span>
                                      <ArrowRight size={13} />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Success or Error Alert for Action */}
                          {actState.completed && actState.result?.message && (
                            <div className="mt-2.5 pt-2 border-t border-success/20 text-[11px] text-success flex items-center gap-1.5 font-medium">
                              <CheckCircle2 size={12} />
                              <span>{actState.result.message}</span>
                            </div>
                          )}

                          {actState.error && (
                            <div className="mt-2.5 pt-2 border-t border-error/20 text-[11px] text-error flex items-center gap-1.5 font-medium">
                              <AlertCircle size={12} />
                              <span>{actState.error}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-hover/50 flex items-center justify-between text-xs text-text-muted shrink-0">
          <span>Powered by ZII Core Intelligence</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-hover text-text font-semibold border border-border transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
