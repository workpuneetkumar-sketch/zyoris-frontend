"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Brain,
  RefreshCw,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  Zap,
  TrendingDown,
} from "lucide-react";
import {
  getDashboardInsights,
  DashboardInsights,
  LeadFollowUp,
  DealInsight,
} from "@/lib/api/aiInsightsApi";

// ─── Sub-components ────────────────────────────────────────────────────

const LeadItem = ({ lead }: { lead: LeadFollowUp }) => (
  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100 hover:bg-amber-100/50 transition-colors">
    <div className="flex-shrink-0 mt-0.5">
      <AlertCircle className="w-4 h-4 text-amber-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
      <p className="text-xs text-gray-600 mt-0.5">{lead.reason}</p>
    </div>
  </div>
);

const DealItem = ({ deal }: { deal: DealInsight }) => {
  const probability = Math.round(deal.winProbability * 100);
  const isHigh = probability >= 70;
  const isMedium = probability >= 40 && probability < 70;
  const isLow = probability < 40;

  const getColor = () => {
    if (isHigh) return "bg-emerald-500";
    if (isMedium) return "bg-amber-500";
    return "bg-red-500";
  };

  const getLabel = () => {
    if (isHigh) return "High";
    if (isMedium) return "Medium";
    return "Low";
  };

  return (
    <div className="p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {deal.name}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-0.5">
                <span>Win Probability</span>
                <span className="font-medium">{probability}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getColor()}`}
                  style={{ width: `${probability}%` }}
                />
              </div>
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                isHigh
                  ? "bg-emerald-100 text-emerald-700"
                  : isMedium
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {getLabel()}
            </span>
          </div>
        </div>
      </div>
      {deal.reason && (
        <p className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">
          <span className="font-medium">AI Reason:</span> {deal.reason}
        </p>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────

interface AIInsightsWidgetProps {
  className?: string;
}

export default function AIInsightsWidget({ className = "" }: AIInsightsWidgetProps) {
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getDashboardInsights();
      setInsights(data);
    } catch (err: any) {
      setError(err.message || "Unable to load AI insights. Please try again.");
      setInsights(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleRefresh = () => {
    fetchInsights(true);
  };

  // ─── Format timestamp ────────────────────────────────────────────────

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Just now";
    }
  };

  // ─── Loading skeleton ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-200 p-5 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Brain className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────

  if (error) {
    return (
      <div className={`bg-white rounded-2xl border border-red-200 p-6 ${className}`}>
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-medium">{error}</p>
            <button
              onClick={handleRefresh}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-1"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Empty / Fallback state ─────────────────────────────────────────

  const hasData =
    insights &&
    (insights.leadsNeedingFollowUp.length > 0 || insights.dealInsights.length > 0);

  if (!hasData) {
    const isFallback = insights?.fallback === true;
    return (
      <div className={`bg-white rounded-2xl border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Brain className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-900">AI Insights</h3>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-3">
            {isFallback ? (
              <TrendingDown className="w-8 h-8 text-amber-500" />
            ) : (
              <Brain className="w-8 h-8 text-gray-300" />
            )}
          </div>
          <p className="text-gray-500 font-medium">
            {isFallback
              ? "AI provider unavailable. Showing empty insights."
              : "No AI insights available."}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isFallback
              ? "Please check back later."
              : "Insights will appear once AI analysis is complete."}
          </p>
          {insights?.generatedAt && (
            <p className="text-xs text-gray-400 mt-2">
              Last checked: {formatTime(insights.generatedAt)}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Data present – render insights ─────────────────────────────────

  const { leadsNeedingFollowUp, dealInsights, generatedAt, fallback } = insights!;

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Brain className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="font-semibold text-gray-900">AI Insights</h3>
          {fallback && (
            <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              Fallback
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {formatTime(generatedAt)}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg">
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Follow-up</p>
            <p className="text-lg font-bold text-gray-900">{leadsNeedingFollowUp.length}</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Deal Insights</p>
            <p className="text-lg font-bold text-gray-900">{dealInsights.length}</p>
          </div>
        </div>
      </div>

      {/* Leads needing follow-up */}
      {leadsNeedingFollowUp.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            Leads Needing Follow-up
          </h4>
          <div className="space-y-2">
            {leadsNeedingFollowUp.map((lead) => (
              <LeadItem key={lead.id} lead={lead} />
            ))}
          </div>
        </div>
      )}

      {/* Deal insights */}
      {dealInsights.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-indigo-500" />
            Deal Insights
          </h4>
          <div className="space-y-2">
            {dealInsights.map((deal) => (
              <DealItem key={deal.id} deal={deal} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}