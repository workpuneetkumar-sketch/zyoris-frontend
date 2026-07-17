"use client";

import { useState, useEffect } from "react";
import {
  getMorningBriefing,
  getDashboardAnomalies,
  MorningBriefingData,
  AnomalyAlertItem,
} from "@/lib/api/aiBriefingApi";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkles,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function DashboardAiInsightsBox() {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [briefing, setBriefing] = useState<MorningBriefingData | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    Promise.all([
      getMorningBriefing().catch((err) => {
        console.error("Briefing error:", err);
        return null;
      }),
      getDashboardAnomalies()
        .then((res) => res.anomalies || [])
        .catch((err) => {
          console.error("Anomalies error:", err);
          return [];
        }),
    ])
      .then(([briefingData, anomaliesData]) => {
        setBriefing(briefingData);
        setAnomalies(Array.isArray(anomaliesData) ? anomaliesData : []);
      })
      .catch(() => {
        setError("Unable to load AI insights.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const bullets = briefing?.summaryBullets || [];
  const hasAnyData = bullets.length > 0 || anomalies.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 transition-all duration-300">
      {/* Header / Dropdown Toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none transition-all ${
          isOpen ? "pb-6 border-b border-gray-100" : ""
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles size={20} className="text-white animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">
              AI Executive Briefing &amp; Anomaly Detection
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">
              Real-time role-tailored insights and 7-day metric baselines powered by Groq LPUs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-800 flex items-center gap-2 transition-all shadow-2xs"
          >
            <span>{isOpen ? "Hide AI Insights" : "View AI Insights"}</span>
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Body / Dropdown Content */}
      {isOpen && (
        <div className="pt-6 animate-in fade-in slide-in-from-top-3 duration-300">
          {loading ? (
            <div className="space-y-4">
              <div className="h-14 bg-gray-50/80 rounded-xl animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-32 bg-gray-50/80 rounded-xl animate-pulse" />
                <div className="h-32 bg-gray-50/80 rounded-xl animate-pulse" />
              </div>
            </div>
          ) : error && !hasAnyData ? (
            <div className="py-8 text-center text-sm font-medium text-gray-500">
              {error}
            </div>
          ) : !hasAnyData ? (
            <div className="py-8 text-center text-sm font-medium text-gray-500">
              No real-time AI insights generated yet. Seed data to view active intelligence.
            </div>
          ) : (
            <div className="space-y-8">
              {/* Executive Briefing Section */}
              {bullets.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">
                      Overnight Executive Summary
                    </p>
                    {briefing?.confidenceScore && (
                      <span className="text-[11px] font-bold text-gray-500">
                        Confidence: {Math.round(briefing.confidenceScore * 100)}%
                      </span>
                    )}
                  </div>

                  {briefing?.greeting && (
                    <p className="text-sm font-semibold text-gray-800 tracking-tight pb-1">
                      {briefing.greeting}
                    </p>
                  )}

                  <div className="grid grid-cols-1 gap-2.5">
                    {bullets.map((bullet, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-4 rounded-xl bg-gray-50/80 border border-gray-100 hover:border-gray-200/80 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4 text-gray-900 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-medium text-gray-800 leading-relaxed">
                          {bullet}
                        </p>
                      </div>
                    ))}
                  </div>

                  {briefing?.topPriorityAction && (
                    <div className="mt-4 p-4 rounded-xl bg-gray-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            Top Priority Action Today
                          </p>
                          <p className="text-sm font-bold text-white tracking-tight mt-0.5">
                            {briefing.topPriorityAction}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 bg-white text-gray-900 rounded-lg shrink-0 text-center">
                        Immediate Focus
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Proactive Anomaly Alerts Section */}
              {anomalies.length > 0 && (
                <div className="space-y-3 pt-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">
                    Proactive Anomaly Alerts (7-Day Baseline Variance)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {anomalies.map((alert) => {
                      const isHigh = alert.severity?.toUpperCase() === "HIGH";
                      const isMed = alert.severity?.toUpperCase() === "MEDIUM";
                      const isNegative = alert.change?.startsWith("-");

                      return (
                        <div
                          key={alert.id}
                          className="p-5 rounded-xl border border-gray-200/80 bg-white hover:border-gray-300 transition-all flex flex-col justify-between gap-4 shadow-2xs group"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                                  isHigh
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : isMed
                                    ? "bg-gray-100 text-gray-900 border-gray-200"
                                    : "bg-gray-50 text-gray-600 border-gray-100"
                                }`}
                              >
                                {alert.severity} Severity
                              </span>
                              <div className="flex items-center gap-1 font-extrabold text-xs text-gray-900">
                                {isNegative ? (
                                  <TrendingDown className="w-3.5 h-3.5 text-gray-700" />
                                ) : (
                                  <TrendingUp className="w-3.5 h-3.5 text-gray-700" />
                                )}
                                <span>{alert.change}</span>
                              </div>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 tracking-tight mb-1.5">
                              {alert.title}
                            </h4>
                            <p className="text-xs font-medium text-gray-600 leading-relaxed">
                              {alert.description}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-gray-900 truncate">
                              <ArrowRight className="w-3.5 h-3.5 shrink-0 text-gray-500 group-hover:translate-x-0.5 transition-transform" />
                              <span className="truncate">{alert.recommendation}</span>
                            </div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 shrink-0">
                              Action
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
