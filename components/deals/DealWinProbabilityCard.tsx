// components/deals/DealWinProbabilityCard.tsx
// FE-2 Day 3: Win Probability, Confidence, Factor Breakdown, and Historical Snapshots.
// Source of truth: GET /api/deals/:id/win-probability & GET /api/deals/:id/win-probability/snapshots

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  RotateCw,
  AlertCircle,
  Loader2,
  Calendar,
  History,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import {
  WinProbabilityResponse,
  WinProbabilitySnapshot,
} from "@/types/winProbability";
import {
  fetchDealWinProbability,
  fetchDealWinProbabilitySnapshots,
} from "@/lib/api/winProbabilityApi";

interface DealWinProbabilityCardProps {
  dealId: string;
  onProbabilityLoaded?: (data: WinProbabilityResponse) => void;
}

export function DealWinProbabilityCard({
  dealId,
  onProbabilityLoaded,
}: DealWinProbabilityCardProps) {
  const [data, setData] = useState<WinProbabilityResponse | null>(null);
  const [snapshots, setSnapshots] = useState<WinProbabilitySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadProbabilityData = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    setError(null);
    try {
      const probData = await fetchDealWinProbability(dealId);
      setData(probData);
      if (onProbabilityLoaded) onProbabilityLoaded(probData);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load win probability assessment"
      );
    } finally {
      setLoading(false);
    }
  }, [dealId, onProbabilityLoaded]);

  const loadSnapshots = useCallback(async () => {
    if (!dealId) return;
    setSnapshotsLoading(true);
    try {
      const res = await fetchDealWinProbabilitySnapshots(dealId);
      setSnapshots(res.snapshots || []);
    } catch (err) {
      console.error("Failed to load win probability snapshots:", err);
    } finally {
      setSnapshotsLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    loadProbabilityData();
  }, [loadProbabilityData]);

  useEffect(() => {
    if (showSnapshots) {
      loadSnapshots();
    }
  }, [showSnapshots, loadSnapshots]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadProbabilityData();
      if (showSnapshots) await loadSnapshots();
    } finally {
      setRefreshing(false);
    }
  };

  const formatTimestamp = (ts?: string | null): string => {
    if (!ts) return "N/A";
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return "N/A";
      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center min-h-[220px] gap-3">
        <Loader2 className="animate-spin text-blue-600" size={24} />
        <p className="text-xs text-gray-400 font-medium">Loading win probability assessment...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-gray-900">Deal Win Probability</h3>
          </div>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            title="Retry"
          >
            <RotateCw size={13} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-xl flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-amber-900">
              Win probability assessment currently unavailable
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              {error || "Deal outcome probability is currently being evaluated."}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-white border border-amber-200 text-amber-900 text-xs font-semibold rounded-lg hover:bg-amber-50 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Backend provided values directly
  const probability = typeof data.probability === "number" ? Math.round(data.probability * 10) / 10 : 0;
  const confidenceScore = typeof data.confidence === "number" ? data.confidence : 0;
  const confidencePercent = Math.round(confidenceScore * 100);
  const confidenceLevel =
    confidenceScore >= 0.8
      ? { label: "High Confidence", color: "text-emerald-700 bg-emerald-50 border-emerald-200" }
      : confidenceScore >= 0.5
      ? { label: "Moderate Confidence", color: "text-amber-700 bg-amber-50 border-amber-200" }
      : { label: "Low Confidence", color: "text-gray-600 bg-gray-50 border-gray-200" };

  const predictedOutcome = (data.predictedOutcome || (probability >= 50 ? "WON" : "LOST")).toUpperCase();

  // Normalize factor breakdown preserving names and human-friendly impact, omitting technical model weights
  const factors: Array<{ name: string; impact?: string; description?: string }> = [];
  if (data.factorBreakdown && typeof data.factorBreakdown === "object") {
    if (Array.isArray(data.factorBreakdown)) {
      data.factorBreakdown.forEach((f: any, idx) => {
        factors.push({
          name: f.name || f.factor || `Factor ${idx + 1}`,
          impact: f.impact || f.direction,
          description: f.description,
        });
      });
    } else {
      Object.entries(data.factorBreakdown).forEach(([k, v]) => {
        const friendlyName = k
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .replace(/_/g, " ")
          .trim()
          .replace(/^./, (s) => s.toUpperCase());

        if (typeof v === "object" && v !== null) {
          const obj = v as Record<string, any>;
          factors.push({
            name: obj.name || friendlyName,
            impact: obj.impact || obj.direction,
            description: obj.description,
          });
        } else {
          factors.push({
            name: friendlyName,
          });
        }
      });
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Deal Win Probability</h3>
            <p className="text-[11px] text-gray-400">
              Win Probability &amp; Forecast Assessment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-50"
            title="Refresh assessment"
          >
            <RotateCw size={13} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Main Score & Confidence Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Probability Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Win Probability
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-black ${
                probability >= 70
                  ? "text-emerald-600"
                  : probability >= 40
                  ? "text-amber-600"
                  : "text-red-500"
              }`}
            >
              {probability}%
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                predictedOutcome === "WON"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              Outcome: {predictedOutcome}
            </span>
          </div>

          {/* Probability Bar */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full rounded-full transition-all duration-700 deal-fill-bar ${
                probability >= 70
                  ? "bg-emerald-500"
                  : probability >= 40
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ "--fill": `${Math.min(100, Math.max(0, probability))}%` } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Confidence Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Prediction Confidence
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">{confidencePercent}%</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${confidenceLevel.color}`}
            >
              {confidenceLevel.label}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-2 block">
            Confidence score: {confidenceScore.toFixed(2)} / 1.00
          </span>
        </div>

        {/* Deal Assessment Status */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Assessment Status
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-base font-bold ${
                predictedOutcome === "WON" ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {predictedOutcome === "WON" ? "Favorable Trend" : "Attention Recommended"}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
            <span className="text-gray-400 font-medium flex items-center gap-1">
              <Calendar size={12} className="text-blue-500" /> Evaluated
            </span>
            <span className="font-semibold text-gray-700">
              {formatTimestamp(data.predictionTimestamp)}
            </span>
          </div>
        </div>
      </div>

      {/* Factor Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Info size={13} className="text-blue-500" />
            Key Influencing Factors
          </h4>
          <span className="text-[11px] text-gray-400">
            {factors.length} Factor{factors.length !== 1 ? "s" : ""}
          </span>
        </div>

        {factors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {factors.map((f, i) => (
              <div
                key={i}
                className="p-3 bg-gray-50/70 border border-gray-100 rounded-xl flex items-center justify-between"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-semibold text-gray-800 truncate">{f.name}</p>
                  {f.description && (
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{f.description}</p>
                  )}
                </div>
                {f.impact && (
                  <div className="shrink-0">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        String(f.impact).toUpperCase().includes("POS")
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : String(f.impact).toUpperCase().includes("NEG")
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {String(f.impact).toUpperCase().includes("POS")
                        ? "Positive Impact"
                        : String(f.impact).toUpperCase().includes("NEG")
                        ? "Risk Factor"
                        : "Neutral"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic p-3 bg-gray-50/50 rounded-xl border border-gray-100">
            No specific influencing factors recorded for this deal.
          </p>
        )}
      </div>

      {/* Historical Probability Snapshots Accordion */}
      <div className="border-t border-gray-100 pt-4">
        <button
          onClick={() => setShowSnapshots(!showSnapshots)}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <History size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-gray-800">
              Historical Probability Snapshots
            </span>
            {snapshots.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-full">
                {snapshots.length}
              </span>
            )}
          </div>
          {showSnapshots ? (
            <ChevronUp size={15} className="text-gray-400" />
          ) : (
            <ChevronDown size={15} className="text-gray-400" />
          )}
        </button>

        {showSnapshots && (
          <div className="mt-3 animate-in fade-in duration-200">
            {snapshotsLoading ? (
              <div className="p-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                <Loader2 size={16} className="animate-spin text-blue-600" />
                Loading prediction history...
              </div>
            ) : snapshots.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4 bg-gray-50/50 rounded-xl border border-gray-100">
                No prediction history available
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-3.5 py-2.5">Date / Time</th>
                      <th className="px-3.5 py-2.5">Probability</th>
                      <th className="px-3.5 py-2.5">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {snapshots.map((snap, idx) => {
                      const prob = typeof snap.probability === "number" ? Math.round(snap.probability) : 0;
                      const conf = typeof snap.confidence === "number" ? Math.round(snap.confidence * 100) : 0;
                      return (
                        <tr key={snap.id || idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-3.5 py-2.5 font-medium text-gray-800">
                            {formatTimestamp(snap.predictionTimestamp)}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span
                              className={`font-bold ${
                                prob >= 70
                                  ? "text-emerald-600"
                                  : prob >= 40
                                  ? "text-amber-600"
                                  : "text-red-500"
                              }`}
                            >
                              {prob}%
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 font-semibold text-gray-700">
                            {conf}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

