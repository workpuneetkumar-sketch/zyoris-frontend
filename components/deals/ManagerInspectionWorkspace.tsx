// components/deals/ManagerInspectionWorkspace.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ShieldAlert,
  TrendingDown,
  Clock,
  Sparkles,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  RefreshCw,
  Search,
  Eye,
  Check,
  X,
  Bot,
  Layers,
  Calendar,
  Zap,
} from "lucide-react";
import {
  ManagerInspectionDeal,
  ManagerInspectionFilters,
  PipelineSummary,
  ManagerDealSummary,
  NbaProposal,
} from "@/types/enterpriseDeals";
import {
  fetchManagerInspectionQueue,
  fetchPipelineSummary,
  fetchManagerDealSummary,
  decideNbaProposal,
} from "@/lib/api/enterpriseDealsApi";
import { formatCurrencyWithSnapshot } from "@/utils/currencyFormat";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

interface ManagerInspectionWorkspaceProps {
  pipelineId?: string;
  onSelectDeal?: (dealId: string) => void;
}

export function ManagerInspectionWorkspace({
  pipelineId,
  onSelectDeal,
}: ManagerInspectionWorkspaceProps) {
  // Summary state
  const [pipelineSummary, setPipelineSummary] = useState<PipelineSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Queue state
  const [queue, setQueue] = useState<ManagerInspectionDeal[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [filters, setFilters] = useState<ManagerInspectionFilters>({
    riskSeverity: undefined,
    stage: undefined,
    minScore: undefined,
    maxScore: undefined,
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Inspect deal drawer state
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [dealSummary, setDealSummary] = useState<ManagerDealSummary | null>(null);
  const [summaryLoadingDeal, setSummaryLoadingDeal] = useState(false);

  // NBA decision confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"ACCEPT" | "REJECT">("ACCEPT");
  const [confirmProposal, setConfirmProposal] = useState<NbaProposal | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [decisionFeedback, setDecisionFeedback] = useState<{
    proposalId: string;
    msg: string;
    isError?: boolean;
  } | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Load Pipeline Summary ──────────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await fetchPipelineSummary();
      setPipelineSummary(data);
    } catch {
      setPipelineSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // ── Load Inspection Queue ──────────────────────────────────────────────────
  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await fetchManagerInspectionQueue({
        ...filters,
        pipelineId: pipelineId || filters.pipelineId,
      });
      setQueue(res.deals || []);
    } catch {
      setQueue([]);
    } finally {
      setQueueLoading(false);
    }
  }, [filters, pipelineId]);

  useEffect(() => {
    loadSummary();
    loadQueue();
  }, [loadSummary, loadQueue]);

  // ── Load Deal Summary when inspecting a deal ──────────────────────────────
  const handleInspectDeal = async (dealId: string) => {
    setSelectedDealId(dealId);
    setSummaryLoadingDeal(true);
    setDecisionFeedback(null);
    try {
      const data = await fetchManagerDealSummary(dealId);
      setDealSummary(data);
    } catch {
      setDealSummary(null);
    } finally {
      setSummaryLoadingDeal(false);
    }
  };

  // ── NBA Confirmation & Execution ──────────────────────────────────────────
  const promptDecision = (proposal: NbaProposal, action: "ACCEPT" | "REJECT") => {
    setConfirmProposal(proposal);
    setConfirmAction(action);
    setDecisionNotes("");
    setConfirmModalOpen(true);
  };

  const handleExecuteDecision = async () => {
    if (!confirmProposal) return;
    setDeciding(true);
    setDecisionFeedback(null);

    try {
      const res = await decideNbaProposal(confirmProposal.id, {
        action: confirmAction,
        notes: decisionNotes.trim() || undefined,
      });

      if (res.success) {
        setDecisionFeedback({
          proposalId: confirmProposal.id,
          msg: res.message || `Action ${confirmAction.toLowerCase()}ed successfully.`,
        });
        // Update local proposal status
        if (dealSummary) {
          setDealSummary({
            ...dealSummary,
            nbaProposals: dealSummary.nbaProposals.map((p) =>
              p.id === confirmProposal.id
                ? { ...p, status: confirmAction === "ACCEPT" ? "ACCEPTED" : "REJECTED" }
                : p
            ),
          });
        }
      } else if (res.alreadyDecided) {
        setDecisionFeedback({
          proposalId: confirmProposal.id,
          msg: res.message || "Proposal has already been decided.",
          isError: true,
        });
      }
      setConfirmModalOpen(false);
    } catch (err: any) {
      setDecisionFeedback({
        proposalId: confirmProposal.id,
        msg: err?.response?.data?.message || err?.message || "Failed to execute decision.",
        isError: true,
      });
      setConfirmModalOpen(false);
    } finally {
      setDeciding(false);
    }
  };

  // ── Client-side search filtering ──────────────────────────────────────────
  const filteredQueue = queue.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.owner && d.owner.toLowerCase().includes(q)) ||
      (d.opportunityType && d.opportunityType.toLowerCase().includes(q)) ||
      d.stage.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Executive Pipeline Summary Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Manager Pipeline Inspection</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Executive Health & Risk Radar
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {summaryLoading ? (
                "Loading live pipeline telemetry..."
              ) : pipelineSummary?.executiveNarrative ? (
                pipelineSummary.executiveNarrative
              ) : (
                "Risk-prioritized workspace for sales leadership to inspect exceptions, evaluate stalled velocity, and confirm Next Best Actions."
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                loadSummary();
                loadQueue();
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-xs font-semibold rounded-xl border border-white/15 transition backdrop-blur-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Radar</span>
            </button>
          </div>
        </div>

        {/* Aggregate Stats & Risk Breakdown */}
        {pipelineSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
            <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Pipeline
              </span>
              <div className="text-lg sm:text-xl font-extrabold text-white mt-1">
                {formatCurrencyWithSnapshot(
                  pipelineSummary.totalPipelineAmount,
                  pipelineSummary.currency
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Across {pipelineSummary.totalDeals} opportunities
              </div>
            </div>

            <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Opportunity Types
              </span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {pipelineSummary.opportunityTypeBreakdown.slice(0, 3).map((item) => (
                  <span
                    key={item.type}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/20"
                  >
                    {item.type}: {item.count}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 md:col-span-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Primary Risk Drivers
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {pipelineSummary.riskDrivers.length > 0 ? (
                  pipelineSummary.riskDrivers.slice(0, 3).map((rd, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium bg-red-500/20 text-red-200 border border-red-500/30"
                    >
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      <span>{rd.risk}</span>
                      <strong className="text-red-300">({rd.affectedDealsCount})</strong>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No critical risk drivers detected.</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by deal name, owner, type, stage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Risk Level:</span>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
            {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() =>
                  setFilters({
                    ...filters,
                    riskSeverity: lvl === "ALL" ? undefined : lvl,
                  })
                }
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  (lvl === "ALL" && !filters.riskSeverity) || filters.riskSeverity === lvl
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Showing <strong>{filteredQueue.length}</strong> prioritized opportunities
        </div>
      </div>

      {/* 3. Risk-Prioritized Inspection Queue Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Prioritized Inspection Queue
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Ranked by Risk Severity, Slippage & Stalled Velocity
          </span>
        </div>

        {queueLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-xs">Loading inspection queue...</span>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No opportunities match current inspection filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Deal / Opportunity</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Risk Severity</th>
                  <th className="py-3 px-4">Health Score</th>
                  <th className="py-3 px-4">Days Slipped</th>
                  <th className="py-3 px-4">Stage Dwell</th>
                  <th className="py-3 px-4 text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredQueue.map((deal) => {
                  const isHigh = deal.riskSeverity === "HIGH";
                  const isMedium = deal.riskSeverity === "MEDIUM";

                  return (
                    <tr
                      key={deal.id || deal.dealId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{deal.name}</span>
                          {deal.opportunityType && deal.opportunityType !== "NEW_BUSINESS" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {deal.opportunityType}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {deal.owner || "Unassigned"}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrencyWithSnapshot(deal.amount, deal.currency)}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {deal.stage}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isHigh
                              ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border-red-200 dark:border-red-900"
                              : isMedium
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                          }`}
                        >
                          {deal.riskSeverity}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {typeof deal.healthScore === "number" ? `${deal.healthScore}/100` : "N/A"}
                      </td>

                      <td className="py-3 px-4">
                        {deal.daysSlipped && deal.daysSlipped > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            +{deal.daysSlipped}d
                          </span>
                        ) : (
                          <span className="text-slate-400">On Track</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {deal.stageDwellDays ? `${deal.stageDwellDays}d` : "0d"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleInspectDeal(deal.dealId)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>Inspect Summary</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Deal Manager Summary & NBA Drawer / Modal */}
      {selectedDealId && mounted && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedDealId(null);
          }}
        >
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Manager Inspection & Next Best Actions
                  </h3>
                  <p className="text-xs text-slate-400">
                    Deal: {dealSummary?.dealName || selectedDealId}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {onSelectDeal && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectDeal(selectedDealId);
                      setSelectedDealId(null);
                    }}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 transition"
                  >
                    <span>Open Full Deal</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedDealId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {summaryLoadingDeal ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="text-xs">Generating deal inspection narrative & proposals...</span>
                </div>
              ) : !dealSummary ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Could not retrieve manager summary for this opportunity.
                </div>
              ) : (
                <>
                  {/* Executive Narrative */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        Executive Deal Narrative
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {dealSummary.timestamp ? new Date(dealSummary.timestamp).toLocaleString() : ""}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {dealSummary.summaryNarrative}
                    </p>
                  </div>

                  {/* Signals & Active Risks Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Signals */}
                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-500" />
                        Key Signals ({dealSummary.keySignals?.length || 0})
                      </span>
                      {(!dealSummary.keySignals || dealSummary.keySignals.length === 0) ? (
                        <p className="text-xs text-slate-400">No active signals recorded.</p>
                      ) : (
                        <div className="space-y-2">
                          {dealSummary.keySignals.map((s: any, idx) => {
                            const signalName =
                              s.signal ||
                              s.name ||
                              s.title ||
                              s.type ||
                              (typeof s === "string" ? s : `Signal #${idx + 1}`);
                            const formattedSignal = typeof signalName === "string" ? signalName.replace(/_/g, " ") : String(signalName);
                            return (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                              >
                                <span className="font-medium">{formattedSignal}</span>
                                {s.sentiment && (
                                  <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">
                                    {s.sentiment}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Active Risks */}
                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        Active Risks ({dealSummary.activeRisks?.length || 0})
                      </span>
                      {(!dealSummary.activeRisks || dealSummary.activeRisks.length === 0) ? (
                        <p className="text-xs text-slate-400">No open risk triggers detected.</p>
                      ) : (
                        <div className="space-y-2">
                          {dealSummary.activeRisks.map((r: any, idx) => {
                            const riskName =
                              r.riskType ||
                              r.risk ||
                              r.name ||
                              r.title ||
                              r.type ||
                              r.driver ||
                              r.detector ||
                              (typeof r === "string" ? r : `Risk #${idx + 1}`);
                            const formattedName = typeof riskName === "string" ? riskName.replace(/_/g, " ") : String(riskName);
                            const severity = r.severity || "MEDIUM";
                            return (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-red-50/50 dark:bg-red-950/20 text-xs text-red-800 dark:text-red-300 border border-red-100 dark:border-red-900/40 flex items-center justify-between gap-3"
                              >
                                <span className="font-semibold">{formattedName}</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 uppercase shrink-0">
                                  {severity}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Next Best Action (NBA) Recommendation Cards */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Bot className="w-4 h-4 text-blue-600" />
                        Next Best Action Recommendations ({dealSummary.nbaProposals.length})
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Confirmation required before execution
                      </span>
                    </div>

                    {decisionFeedback && (
                      <div
                        className={`p-3 rounded-xl text-xs flex items-center space-x-2 border ${
                          decisionFeedback.isError
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {decisionFeedback.isError ? (
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span>{decisionFeedback.msg}</span>
                      </div>
                    )}

                    {dealSummary.nbaProposals.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
                        No pending NBA proposals for this deal at this time.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dealSummary.nbaProposals.map((proposal) => {
                          const isDecided = proposal.status === "ACCEPTED" || proposal.status === "REJECTED";
                          return (
                            <div
                              key={proposal.id}
                              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                      {proposal.title || proposal.action}
                                    </h4>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                                      Priority: {String(proposal.priority)}
                                    </span>
                                    {isDecided && (
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          proposal.status === "ACCEPTED"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-slate-100 text-slate-600 border border-slate-200"
                                        }`}
                                      >
                                        Status: {proposal.status}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                    {proposal.rationale}
                                  </p>
                                </div>

                                {typeof proposal.confidence === "number" && (
                                  <div className="text-right flex-shrink-0">
                                    <span className="text-[10px] font-bold text-slate-400 block">
                                      Confidence
                                    </span>
                                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                                      {Math.round(proposal.confidence * 100)}%
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Decision Buttons with Confirmation Requirement */}
                              {!isDecided ? (
                                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => promptDecision(proposal, "REJECT")}
                                    className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => promptDecision(proposal, "ACCEPT")}
                                    className="inline-flex items-center space-x-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Accept Action</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                                  This recommendation has been finalized. Duplicate-execution protection active.
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDealId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 5. Confirmation Modal for NBA Decisions */}
      {confirmProposal && (
        <ConfirmationModal
          isOpen={confirmModalOpen}
          title={`Confirm ${confirmAction === "ACCEPT" ? "Accepting" : "Rejecting"} Action`}
          message={`Are you sure you want to ${confirmAction.toLowerCase()} this Next Best Action proposal: "${
            confirmProposal.title || confirmProposal.action
          }"? This business decision will be logged directly to the opportunity record.`}
          confirmText={confirmAction === "ACCEPT" ? "Confirm & Accept" : "Confirm & Reject"}
          cancelText="Cancel"
          variant={confirmAction === "ACCEPT" ? "default" : "danger"}
          onConfirm={handleExecuteDecision}
          onCancel={() => setConfirmModalOpen(false)}
        />
      )}
    </div>
  );
}
