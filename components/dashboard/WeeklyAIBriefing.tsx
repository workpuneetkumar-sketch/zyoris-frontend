"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Users,
  Briefcase,
  DollarSign,
  Star,
  Sparkles,
} from "lucide-react";
import { getWeeklyBriefing, WeeklyBriefingData } from "@/lib/api/aiInsightsApi";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: "blue" | "emerald" | "violet" | "amber";
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colorMap = {
    blue:    { bg: "bg-blue-50",    border: "border-blue-100",    text: "text-blue-600"    },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-600" },
    violet:  { bg: "bg-violet-50",  border: "border-violet-100",  text: "text-violet-600"  },
    amber:   { bg: "bg-amber-50",   border: "border-amber-100",   text: "text-amber-600"   },
  }[color];

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${colorMap.bg} ${colorMap.border}`}>
      <div className={`p-2 rounded-lg bg-white border ${colorMap.border} shrink-0`}>
        <Icon size={15} className={colorMap.text} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</p>
        <p className={`text-lg font-extrabold ${colorMap.text}`}>{value}</p>
      </div>
    </div>
  );
}

export function WeeklyAIBriefing() {
  const [data, setData] = useState<WeeklyBriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getWeeklyBriefing();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to load weekly briefing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-purple-50/40">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-100 rounded-lg shrink-0">
            <CalendarDays size={15} className="text-indigo-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-900">Weekly AI Briefing</p>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">
                7-Day Rollup
              </span>
              {data?.fallback && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                  Fallback
                </span>
              )}
            </div>
            {data?.period && (
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">{data.period}</p>
            )}
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
          title="Refresh weekly briefing"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        {loading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse bg-gray-50 rounded-xl" />
              ))}
            </div>
            <div className="h-24 animate-pulse bg-gray-50 rounded-xl" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
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
            {/* Stats row */}
            {(data.leadsCreated != null || data.dealsClosed != null || data.revenueGenerated != null || data.topPerformer) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.leadsCreated != null && (
                  <StatCard icon={Users} label="Leads Created" value={data.leadsCreated} color="blue" />
                )}
                {data.dealsClosed != null && (
                  <StatCard icon={Briefcase} label="Deals Closed" value={data.dealsClosed} color="emerald" />
                )}
                {data.revenueGenerated != null && (
                  <StatCard
                    icon={DollarSign}
                    label="Revenue"
                    value={`$${Math.round(data.revenueGenerated).toLocaleString()}`}
                    color="violet"
                  />
                )}
                {data.topPerformer && (
                  <StatCard icon={Star} label="Top Performer" value={data.topPerformer} color="amber" />
                )}
              </div>
            )}

            {/* Highlights */}
            {data.highlights.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                  Weekly Highlights
                </p>
                {data.highlights.map((bullet, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100/80 hover:bg-indigo-50 transition-colors"
                  >
                    <CheckCircle2 size={15} className="text-indigo-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-gray-700 leading-relaxed">{bullet}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Key insights */}
            {data.keyInsights && data.keyInsights.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                  Key Insights
                </p>
                {data.keyInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-purple-50/50 border border-purple-100/80 hover:bg-purple-50 transition-colors"
                  >
                    <Sparkles size={14} className="text-purple-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-gray-700 leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            )}

            {data.highlights.length === 0 && (!data.keyInsights || data.keyInsights.length === 0) && (
              <div className="py-6 text-center">
                <CalendarDays size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-gray-500">
                  No weekly data available yet. Check back after activity is recorded.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
