"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sparkles,
  Brain,
  MessageSquare,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Calendar,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import {
  fetchDealAISummary,
  fetchDealNextAction,
  DealAISummaryResponse,
  DealNextActionResponse
} from "@/lib/api/dealsApi";

interface DealAISummaryCardProps {
  dealId: string;
  className?: string;
}

export function DealAISummaryCard({ dealId, className = "" }: DealAISummaryCardProps) {
  const [summaryData, setSummaryData] = useState<DealAISummaryResponse | null>(null);
  const [nextActionData, setNextActionData] = useState<DealNextActionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    setError(null);
    try {
      const [sumRes, actionRes] = await Promise.all([
        fetchDealAISummary(dealId),
        fetchDealNextAction(dealId)
      ]);
      setSummaryData(sumRes);
      setNextActionData(actionRes);
    } catch (err: any) {
      setError(err?.message || "Failed to load deal AI context");
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getChannelBadge = (channel?: string) => {
    const ch = (channel || "").toUpperCase();
    if (ch === "WHATSAPP") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <MessageSquare size={12} className="text-emerald-600" /> WhatsApp
        </span>
      );
    }
    if (ch === "CALL") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Phone size={12} className="text-blue-600" /> Phone Call
        </span>
      );
    }
    if (ch === "EMAIL") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Mail size={12} className="text-purple-600" /> Email
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <Calendar size={12} className="text-indigo-600" /> Meeting
      </span>
    );
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-sm tracking-tight">CRM Deal AI Summary & Next Action</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                <ShieldCheck size={11} className="text-blue-700" /> WhatsApp AI Context
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">ActivityCapture Pipeline & CRM Intelligence</p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh Deal AI Insights"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
        </button>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {loading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-blue-700 font-medium bg-blue-50/30 rounded-xl border border-blue-100">
            <RefreshCw size={14} className="animate-spin text-blue-600" />
            <span>Retrieving WhatsApp conversation history & deal context...</span>
          </div>
        ) : error ? (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{error}</p>
              <button onClick={loadData} className="text-[11px] font-bold underline text-rose-700 mt-1">
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* AI Summary Block */}
            <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Brain size={14} className="text-blue-600" /> Deal Executive Summary
                </span>
                {summaryData?.whatsAppIncluded && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                    💬 WhatsApp Context ({summaryData.whatsAppEvidenceCount || 1} msgs)
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-700 leading-relaxed font-normal bg-white p-3 rounded-lg border border-gray-200/80 shadow-xs">
                {summaryData?.summary}
              </p>

              {summaryData?.keyRiskFactors && summaryData.keyRiskFactors.length > 0 && (
                <div className="pt-1.5 space-y-1">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Key Considerations & Risks:</p>
                  <ul className="space-y-1">
                    {summaryData.keyRiskFactors.map((rf, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-gray-700 font-medium">
                        <TrendingUp size={13} className="text-amber-500 shrink-0 mt-0.5" />
                        <span>{rf}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* AI Recommended Next Action */}
            {nextActionData && (
              <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/40 p-4 rounded-xl border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Zap size={14} className="text-blue-600" />
                    <span className="text-xs font-bold text-gray-900">Recommended Deal Action</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getChannelBadge(nextActionData.recommendedChannel)}
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-blue-600 text-white shadow-2xs">
                      {nextActionData.priority || "NORMAL"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 bg-white p-3.5 rounded-lg border border-blue-200/80 shadow-xs">
                  <h4 className="text-xs font-bold text-gray-900">{nextActionData.actionTitle}</h4>
                  <p className="text-xs text-gray-700 leading-relaxed font-medium">
                    {nextActionData.detailedRationale}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
