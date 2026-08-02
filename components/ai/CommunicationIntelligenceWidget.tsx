"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Brain, RefreshCw, AlertCircle, TrendingUp, Zap, Activity, MessageSquare } from "lucide-react";
import {
  getCommunicationIntelligence,
  CommunicationIntelligenceData,
} from "@/lib/api/aiInsightsApi";

interface CommunicationIntelligenceWidgetProps {
  leadId: string;
  className?: string;
}

function getMoodStyle(mood: string): { bg: string; text: string; border: string } {
  const m = mood.toLowerCase();
  if (m.includes("positive") || m.includes("happy") || m.includes("enthusiastic")) {
    return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
  }
  if (m.includes("negative") || m.includes("angry") || m.includes("frustrated")) {
    return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
  }
  if (m.includes("neutral")) {
    return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
  }
  return { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };
}

function getIntentStyle(intent: string): { bg: string; text: string; border: string } {
  const i = intent.toLowerCase();
  if (i.includes("high") || i.includes("strong") || i.includes("ready") || i.includes("buy")) {
    return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
  }
  if (i.includes("low") || i.includes("cold") || i.includes("none")) {
    return { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" };
  }
  return { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" };
}

function GaugeRing({ value, size = 80 }: { value: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;
  const color =
    clamped >= 70 ? "#10b981" : clamped >= 40 ? "#f59e0b" : "#ef4444";
  const textColor =
    clamped >= 70 ? "text-emerald-600" : clamped >= 40 ? "text-amber-600" : "text-red-600";

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-extrabold leading-none ${textColor}`}>{clamped}%</span>
        <span className="text-[9px] font-semibold text-gray-400 mt-0.5">Buy Prob.</span>
      </div>
    </div>
  );
}

export function CommunicationIntelligenceWidget({
  leadId,
  className = "",
}: CommunicationIntelligenceWidgetProps) {
  const [data, setData] = useState<CommunicationIntelligenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCommunicationIntelligence(leadId);
      setData(result);
      setFetched(true);
    } catch (err: any) {
      setError(err.message || "Failed to load communication intelligence.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  // Auto-load on mount
  useEffect(() => {
    load();
  }, [load]);

  const intentStyle = getIntentStyle(data?.intent || "");
  const moodStyle = getMoodStyle(data?.mood || "");

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-50 bg-gradient-to-r from-indigo-50/60 to-purple-50/30 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Brain size={14} className="text-indigo-600" />
          AI Communication Intelligence
        </h3>
        <button
          onClick={load}
          disabled={loading}
          title="Refresh"
          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        {loading && !fetched ? (
          <div className="space-y-3">
            <div className="h-16 animate-pulse bg-gray-50 rounded-xl" />
            <div className="h-10 animate-pulse bg-gray-50 rounded-xl" />
            <div className="h-10 animate-pulse bg-gray-50 rounded-xl" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-100">
            <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-red-700">{error}</p>
              <button
                onClick={load}
                className="text-xs text-red-600 underline mt-1 font-semibold"
              >
                Retry
              </button>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Top row: gauge + badges */}
            <div className="flex items-center gap-4">
              <GaugeRing value={data.buyingProbability} size={80} />
              <div className="flex-1 space-y-2">
                {/* Intent badge */}
                <div className="flex items-center gap-2">
                  <Zap size={13} className="text-indigo-500 shrink-0" />
                  <span className="text-[11px] font-semibold text-gray-500 shrink-0">Intent</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${intentStyle.bg} ${intentStyle.text} ${intentStyle.border}`}
                  >
                    {data.intent}
                  </span>
                </div>
                {/* Mood badge */}
                <div className="flex items-center gap-2">
                  <Activity size={13} className="text-amber-500 shrink-0" />
                  <span className="text-[11px] font-semibold text-gray-500 shrink-0">Mood</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${moodStyle.bg} ${moodStyle.text} ${moodStyle.border}`}
                  >
                    {data.mood}
                  </span>
                </div>
                {/* Engagement score if present */}
                {typeof data.engagementScore === "number" && (
                  <div className="flex items-center gap-2">
                    <TrendingUp size={13} className="text-emerald-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-gray-500 shrink-0">
                      Engagement
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(100, data.engagementScore)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600">
                        {data.engagementScore}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Next Best Action box */}
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
              <MessageSquare size={15} className="text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">
                  Next Best Action
                </p>
                <p className="text-xs font-medium text-gray-800 leading-relaxed">
                  {data.nextBestAction}
                </p>
              </div>
            </div>

            {/* Risk level if present */}
            {data.riskLevel && (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border ${
                  data.riskLevel.toLowerCase().includes("high")
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : data.riskLevel.toLowerCase().includes("medium")
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                <AlertCircle size={12} />
                Risk Level: {data.riskLevel}
              </div>
            )}

            {data.fallback && (
              <p className="text-[10px] text-amber-600 italic">
                ⚠️ AI provider returned fallback data.
              </p>
            )}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Brain size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-500">
              AI communication analysis will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
