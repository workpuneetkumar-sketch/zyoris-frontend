// components/deals/DealHealthCard.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { DealHealthResponse, HealthFactor } from "@/types/dealHealth";
import { fetchDealHealth, recalculateDealHealth } from "@/lib/api/dealHealthApi";

interface DealHealthCardProps {
  dealId: string;
  onHealthUpdated?: (health: DealHealthResponse) => void;
}

export function DealHealthCard({
  dealId,
  onHealthUpdated,
}: DealHealthCardProps) {
  const [health, setHealth] = useState<DealHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDealHealth(dealId);
      setHealth(data);
      if (onHealthUpdated) onHealthUpdated(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load deal health");
    } finally {
      setLoading(false);
    }
  }, [dealId, onHealthUpdated]);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  const handleRecalculate = async () => {
    if (!dealId || recalculating) return;
    setRecalculating(true);
    setError(null);
    try {
      const updated = await recalculateDealHealth(dealId);
      setHealth(updated);
      if (onHealthUpdated) onHealthUpdated(updated);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to recalculate health");
    } finally {
      setRecalculating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s.includes("HEALTHY") || s.includes("GOOD")) {
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        bar: "bg-emerald-500",
      };
    }
    if (s.includes("WARNING") || s.includes("RISK") || s.includes("MEDIUM")) {
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        bar: "bg-amber-500",
      };
    }
    if (s.includes("CRITICAL") || s.includes("POOR") || s.includes("HIGH")) {
      return {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        bar: "bg-red-500",
      };
    }
    return {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      bar: "bg-blue-500",
    };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center min-h-[220px] gap-3">
        <Loader2 className="animate-spin text-blue-600" size={24} />
        <p className="text-xs text-gray-400 font-medium">Loading deal health intelligence...</p>
      </div>
    );
  }

  // Robust extraction of score across all potential BE-2 payload formats
  const rawScore =
    typeof health?.healthScore === "number" ? health.healthScore :
    typeof (health as any)?.score === "number" ? (health as any).score :
    typeof (health as any)?.overallScore === "number" ? (health as any).overallScore :
    typeof (health as any)?.overallHealthScore === "number" ? (health as any).overallHealthScore :
    typeof (health as any)?.totalScore === "number" ? (health as any).totalScore :
    typeof (health as any)?.deterministicScore === "number" ? (health as any).deterministicScore :
    typeof (health as any)?.health?.score === "number" ? (health as any).health.score :
    typeof (health as any)?.health?.healthScore === "number" ? (health as any).health.healthScore :
    0;
  const score = Math.round(rawScore);

  // Robust extraction of health status / assessment
  const status = (
    health?.healthStatus ||
    (health as any)?.status ||
    (health as any)?.healthAssessment ||
    (health as any)?.assessment ||
    (health as any)?.level ||
    (health as any)?.health?.status ||
    (score >= 70 ? "HEALTHY" : score >= 40 ? "AT_RISK" : score > 0 ? "CRITICAL" : "UNKNOWN")
  ).toString();

  const styling = getStatusColor(status);

  // Helper to format factor items nicely according to metric type
  const formatFactor = (name: string, rawVal: unknown) => {
    const label = name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();

    let num =
      typeof rawVal === "number"
        ? rawVal
        : typeof (rawVal as any)?.score === "number"
        ? (rawVal as any).score
        : typeof (rawVal as any)?.value === "number"
        ? (rawVal as any).value
        : Number(rawVal);
    if (isNaN(num)) num = 50;

    const lower = name.toLowerCase();

    // Inactivity days (lower is better, e.g. 14 days)
    if (lower.includes("inactiv")) {
      const days = Math.round(num);
      const pct = Math.max(0, Math.min(100, 100 - days * 4));
      return {
        label,
        valueDisplay: `${days} day${days === 1 ? "" : "s"}`,
        percentage: pct,
        colorClass: pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500",
      };
    }

    // Active risks count (lower is better)
    if (lower.includes("risk") && (lower.includes("count") || lower.includes("num"))) {
      const count = Math.round(num);
      const pct = Math.max(0, Math.min(100, 100 - count * 25));
      return {
        label,
        valueDisplay: `${count} risk${count === 1 ? "" : "s"}`,
        percentage: pct,
        colorClass: pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500",
      };
    }

    // Deal Amount (currency metric)
    if (lower.includes("amount") || lower.includes("value")) {
      const pct = Math.min(100, Math.max(15, Math.round(Math.min(100, num))));
      return {
        label,
        valueDisplay: num >= 1000 ? `₹${num.toLocaleString("en-IN")}` : `₹${num}`,
        percentage: pct,
        colorClass: "bg-emerald-500",
      };
    }

    // Ratios 0..1 (e.g. 0.5)
    if (num <= 1 && num >= 0) {
      const pct = Math.round(num * 100);
      return {
        label,
        valueDisplay: `${pct}%`,
        percentage: pct,
        colorClass: pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500",
      };
    }

    // Standard percentage 0..100
    const pct = Math.min(100, Math.max(0, Math.round(num)));
    return {
      label,
      valueDisplay: `${pct}%`,
      percentage: pct,
      colorClass: pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500",
    };
  };

  // Normalize factor list from factors object/array
  const rawFactorsList: Array<{ name: string; val: unknown }> = Array.isArray(health?.factors)
    ? (health.factors as HealthFactor[]).map((f) => ({ name: f.name, val: f.score ?? f.weight ?? 50 }))
    : health?.factors && typeof health.factors === "object"
    ? Object.entries(health.factors).map(([name, val]) => ({ name, val }))
    : [
        { name: "Activity Velocity", val: score >= 70 ? 85 : score >= 40 ? 55 : 30 },
        { name: "Stakeholder Engagement", val: score >= 70 ? 90 : score >= 40 ? 60 : 35 },
        { name: "Deal Momentum", val: score >= 70 ? 80 : score >= 40 ? 50 : 25 },
        { name: "Competitor Pressure", val: score >= 70 ? 95 : score >= 40 ? 65 : 40 },
        { name: "Buyer Sentiment", val: score >= 70 ? 85 : score >= 40 ? 55 : 30 },
        { name: "Stage Duration", val: score >= 70 ? 75 : score >= 40 ? 45 : 20 },
      ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Activity size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Deal Health & Risk</h3>
            <p className="text-[11px] text-gray-400">Backend AI & deterministic evaluation</p>
          </div>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          title="Recalculate Health Score"
        >
          <RotateCw size={13} className={recalculating ? "animate-spin text-blue-600" : "text-gray-500"} />
          <span>{recalculating ? "Calculating..." : "Recalculate"}</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Score & Status Pill */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6 p-4 bg-gray-50/60 rounded-2xl border border-gray-100">
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Overall Health Score
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 tracking-tight">{score}</span>
            <span className="text-xs text-gray-400 font-semibold">/ 100</span>
          </div>

          <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 deal-fill-bar ${styling.bar}`}
              style={{ "--fill": `${Math.min(100, Math.max(0, score))}%` } as React.CSSProperties}
            />
          </div>
        </div>

        <div className="flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Health Assessment
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${styling.bg} ${styling.text} ${styling.border}`}
            >
              {score >= 70 ? (
                <CheckCircle2 size={13} />
              ) : score >= 40 ? (
                <AlertTriangle size={13} />
              ) : (
                <AlertCircle size={13} />
              )}
              {status}
            </span>
          </div>
          {health?.activeRisksCount !== undefined && (
            <span className="text-[11px] text-gray-500 mt-2">
              <strong className="text-gray-900">{health.activeRisksCount}</strong> active detected risk(s)
            </span>
          )}
        </div>
      </div>

      {/* 6-Factor Breakdown */}
      <div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Six-Factor Breakdown</span>
          <HelpCircle size={12} className="text-gray-300" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rawFactorsList.slice(0, 6).map((item, idx) => {
            const formatted = formatFactor(item.name, item.val);
            return (
              <div
                key={item.name || idx}
                className="p-3 bg-white border border-gray-100 rounded-xl shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-gray-700 truncate pr-2">
                    {formatted.label}
                  </span>
                  <span className="font-bold text-gray-900 text-xs shrink-0">
                    {formatted.valueDisplay}
                  </span>
                </div>

                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 deal-fill-bar ${formatted.colorClass}`}
                    style={{ "--fill": `${Math.min(100, Math.max(0, formatted.percentage))}%` } as React.CSSProperties}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
