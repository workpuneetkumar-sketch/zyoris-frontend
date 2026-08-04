"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

export function DashboardAiInsightsBox({
  prefetched,
}: {
  prefetched?: {
    briefing: MorningBriefingData | null;
    anomalies: AnomalyAlertItem[];
    loading: boolean;
    error: string | null;
  };
}) {
  const { token } = useAuth();
  const [briefing, setBriefing] = useState<MorningBriefingData | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefetched) return;
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
  }, [token, prefetched]);

  const resolvedBriefing = prefetched ? prefetched.briefing : briefing;
  const resolvedAnomalies = prefetched ? prefetched.anomalies : anomalies;
  const resolvedLoading = prefetched ? prefetched.loading : loading;
  const resolvedError = prefetched ? prefetched.error : error;

  const bullets = resolvedBriefing?.summaryBullets || [];
  const hasAnyData = bullets.length > 0 || resolvedAnomalies.length > 0;

  return (
    <div className="bg-surface/70 backdrop-blur-xl rounded-2xl border border-border shadow-sm p-6 md:p-8 transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-sm border border-border/60">
            <Sparkles size={20} className="text-primary animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-text tracking-tight">
              AI Executive Briefing &amp; Anomaly Detection
            </h3>
            <p className="text-xs text-text-muted mt-0.5 font-medium">
            </p>
          </div>
        </div>
      </div>

      <div className="pt-6 animate-in fade-in slide-in-from-top-3 duration-300">
        {resolvedLoading ? (
          <div className="space-y-4">
            <div className="h-14 bg-surface-hover/60 rounded-xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-32 bg-surface-hover/60 rounded-xl animate-pulse" />
              <div className="h-32 bg-surface-hover/60 rounded-xl animate-pulse" />
            </div>
          </div>
        ) : resolvedError && !hasAnyData ? (
          <div className="py-8 text-center text-sm font-medium text-text-muted">
            {resolvedError}
          </div>
        ) : !hasAnyData ? (
          <div className="py-8 text-center text-sm font-medium text-text-muted">
            No real-time AI insights generated yet. Seed data to view active intelligence.
          </div>
        ) : (
          <div className="space-y-8">
            {bullets.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-text-muted">
                    Overnight Executive Summary
                  </p>
                  {resolvedBriefing?.confidenceScore && (
                    <span className="text-[11px] font-bold text-text-muted">
                      Confidence: {Math.round(resolvedBriefing.confidenceScore * 100)}%
                    </span>
                  )}
                </div>

                {resolvedBriefing?.greeting && (
                  <p className="text-sm font-semibold text-text tracking-tight pb-1">
                    {resolvedBriefing.greeting}
                  </p>
                )}

                <div className="grid grid-cols-1 gap-2.5">
                  {bullets.map((bullet, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-4 rounded-xl bg-surface/70 border border-border/60 hover:border-border transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 text-text flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-text leading-relaxed">
                        {bullet}
                      </p>
                    </div>
                  ))}
                </div>

                {resolvedBriefing?.topPriorityAction && (
                  <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-border/60">
                        <AlertTriangle className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                          Top Priority Action Today
                        </p>
                        <p className="text-sm font-bold text-text tracking-tight mt-0.5">
                          {resolvedBriefing.topPriorityAction}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 bg-surface text-text rounded-lg shrink-0 text-center border border-border/60">
                      Immediate Focus
                    </span>
                  </div>
                )}
              </div>
            )}

            {resolvedAnomalies.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-text-muted">
                  Proactive Anomaly Alerts (7-Day Baseline Variance)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resolvedAnomalies.map((alert) => {
                    const isHigh = alert.severity?.toUpperCase() === "HIGH";
                    const isMed = alert.severity?.toUpperCase() === "MEDIUM";
                    const isNegative = alert.change?.startsWith("-");

                    return (
                      <div
                        key={alert.id}
                        className="p-5 rounded-xl border border-border/60 bg-surface/70 hover:border-border transition-all flex flex-col justify-between gap-4 shadow-2xs group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${isHigh
                                  ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                  : isMed
                                    ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                                    : "bg-surface-hover/70 text-text-muted border-border/60"
                                }`}
                            >
                              {alert.severity} Severity
                            </span>
                            <div className="flex items-center gap-1 font-extrabold text-xs text-text">
                              {isNegative ? (
                                <TrendingDown className="w-3.5 h-3.5 text-text-secondary" />
                              ) : (
                                <TrendingUp className="w-3.5 h-3.5 text-text-secondary" />
                              )}
                              <span>{alert.change}</span>
                            </div>
                          </div>
                          <h4 className="text-sm font-bold text-text tracking-tight mb-1.5">
                            {alert.title}
                          </h4>
                          <p className="text-xs font-medium text-text-secondary leading-relaxed">
                            {alert.description}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 font-semibold text-text truncate">
                            <ArrowRight className="w-3.5 h-3.5 shrink-0 text-text-muted group-hover:translate-x-0.5 transition-transform" />
                            <span className="truncate">{alert.recommendation}</span>
                          </div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted shrink-0">
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
    </div>
  );
}
