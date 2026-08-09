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
    blue:    { bg: "bg-gray-900",    border: "border-gray-700",    text: "text-blue-400"    },
    emerald: { bg: "bg-gray-900", border: "border-gray-700", text: "text-emerald-400" },
    violet:  { bg: "bg-gray-900",  border: "border-gray-700",  text: "text-blue-400"  },
    amber:   { bg: "bg-gray-900",   border: "border-gray-700",   text: "text-amber-400"   },
  }[color];

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${colorMap.bg} ${colorMap.border}`}>
      <div className={`p-2 rounded-lg bg-gray-800 border ${colorMap.border} shrink-0`}>
        <Icon size={15} className={colorMap.text} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">{label}</p>
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
    <div className="bg-black rounded-2xl border border-gray-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 bg-gray-950">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-gray-800 rounded-lg shrink-0">
            <CalendarDays size={15} className="text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white">Weekly AI Briefing</p>
              <span className="text-[10px] font-bold text-blue-400 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded-full">
                7-Day Rollup
              </span>
              {data?.fallback && (
                <span className="text-[10px] font-bold text-amber-400 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded-full">
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
          className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
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
                <div key={i} className="h-16 animate-pulse bg-gray-800 rounded-xl" />
              ))}
            </div>
            <div className="h-24 animate-pulse bg-gray-800 rounded-xl" />
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
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                  Weekly Highlights
                </p>
                {data.highlights.map((bullet, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-900 border border-gray-700 hover:bg-gray-800 transition-colors"
                  >
                    <CheckCircle2 size={15} className="text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-white leading-relaxed">{bullet}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Key insights */}
            {data.keyInsights && data.keyInsights.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                  Key Insights
                </p>
                {data.keyInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-900 border border-gray-700 hover:bg-gray-800 transition-colors"
                  >
                    <Sparkles size={14} className="text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-white leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            )}

            {data.highlights.length === 0 && (!data.keyInsights || data.keyInsights.length === 0) && (
              <div className="py-6 text-center">
                <CalendarDays size={28} className="text-gray-600 mx-auto mb-2" />
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
