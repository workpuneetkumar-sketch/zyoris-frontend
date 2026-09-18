// components/deals/DealForecastDetailsCard.tsx
// FE-2 Day 4: Deal Forecast Details, Aging, Stage Velocity, Slippage, Forecast Category, Converted Amount.
// Source of truth: GET /api/deals/:id/forecast

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Hourglass,
  Clock,
  AlertTriangle,
  RotateCw,
  Loader2,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Tag,
  Calendar,
} from "lucide-react";
import { DealForecastResponse, StageVelocityItem } from "@/types/forecast";
import { fetchDealForecast } from "@/lib/api/forecastApi";
import { formatCurrencyAmount } from "@/utils/currencyFormat";

interface DealForecastDetailsCardProps {
  dealId: string;
  onForecastLoaded?: (data: DealForecastResponse) => void;
}

export function DealForecastDetailsCard({
  dealId,
  onForecastLoaded,
}: DealForecastDetailsCardProps) {
  const [data, setData] = useState<DealForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reportingCurrency, setReportingCurrency] = useState<string>("USD");

  const loadForecastDetails = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDealForecast(dealId, { reportingCurrency });
      setData(res);
      if (onForecastLoaded) onForecastLoaded(res);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Forecast details unavailable"
      );
    } finally {
      setLoading(false);
    }
  }, [dealId, reportingCurrency, onForecastLoaded]);

  useEffect(() => {
    loadForecastDetails();
  }, [loadForecastDetails]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadForecastDetails();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center min-h-[220px] gap-3">
        <Loader2 className="animate-spin text-blue-600" size={24} />
        <p className="text-xs text-gray-400 font-medium">Loading deal forecast intelligence...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Hourglass size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-gray-900">Forecast & Velocity</h3>
          </div>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            title="Retry"
          >
            <RotateCw size={13} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-800">
              Forecast details unavailable
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {error || "No forecast metrics or velocity data calculated for this deal yet."}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // 1. Forecast Category
  const category = (
    data.forecastCategory ||
    data.category ||
    "Pipeline"
  ).toString();

  // 2. Deal Aging: backend-provided values directly
  const agingVal =
    typeof data.dealAging === "number"
      ? data.dealAging
      : typeof data.aging === "number"
      ? data.aging
      : typeof data.agingDays === "number"
      ? data.agingDays
      : typeof (data.dealAging as any)?.days === "number"
      ? (data.dealAging as any).days
      : typeof (data.aging as any)?.days === "number"
      ? (data.aging as any).days
      : typeof (data.aging as any)?.ageInDays === "number"
      ? (data.aging as any).ageInDays
      : null;

  // 3. Stage Velocity: backend-provided list or record
  const velocityEntries: Array<{ stage: string; days: number }> = [];
  const rawVelocity = data.stageVelocity || data.velocity || data.stageDwellTimes;
  if (rawVelocity) {
    if (Array.isArray(rawVelocity)) {
      rawVelocity.forEach((item: any) => {
        const stageName = item.stage || item.stageName || "Unknown Stage";
        const days =
          typeof item.days === "number"
            ? item.days
            : typeof item.durationDays === "number"
            ? item.durationDays
            : typeof item.dwellTimeDays === "number"
            ? item.dwellTimeDays
            : 0;
        velocityEntries.push({ stage: stageName, days });
      });
    } else if (typeof rawVelocity === "object") {
      Object.entries(rawVelocity).forEach(([k, v]) => {
        const days =
          typeof v === "number"
            ? v
            : typeof (v as any)?.days === "number"
            ? (v as any).days
            : 0;
        velocityEntries.push({ stage: k, days });
      });
    }
  }

  // 4. Slippage: backend-provided information
  const rawSlippage = data.slippageInfo || data.slippage;
  let hasSlippage = false;
  let slippageDays: number | null = null;
  let slippageMessage: string | null = null;

  if (typeof rawSlippage === "boolean") {
    hasSlippage = rawSlippage;
  } else if (typeof rawSlippage === "number") {
    hasSlippage = rawSlippage > 0;
    slippageDays = rawSlippage;
  } else if (typeof rawSlippage === "string") {
    hasSlippage = !rawSlippage.toLowerCase().includes("no");
    slippageMessage = rawSlippage;
  } else if (rawSlippage && typeof rawSlippage === "object") {
    hasSlippage =
      Boolean((rawSlippage as any).hasSlippage) ||
      Boolean((rawSlippage as any).isSlipped) ||
      Number((rawSlippage as any).slippageDays || (rawSlippage as any).daysSlipped || 0) > 0;
    slippageDays =
      (rawSlippage as any).slippageDays ?? (rawSlippage as any).daysSlipped ?? null;
    slippageMessage = (rawSlippage as any).message ?? null;
  }
  if (data.hasSlippage !== undefined) {
    hasSlippage = Boolean(data.hasSlippage);
  }

  // 5. Converted Amount & Currency presentation
  const originalCurrency = data.currency || "USD";
  const repCurrency = data.reportingCurrency || reportingCurrency;
  const originalAmount = data.originalAmount ?? data.amount;
  const convertedAmount = data.convertedAmount;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      {/* Header with Currency Selector & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Hourglass size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Forecast & Deal Velocity</h3>
            <p className="text-[11px] text-gray-400">
              BE-2 Forecast Rollups • Stage Dwell & Slippage
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Currency:</span>
            <select
              value={reportingCurrency}
              onChange={(e) => setReportingCurrency(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-50"
            title="Refresh forecast details"
          >
            <RotateCw size={13} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Top 4 Key Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Forecast Category */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Forecast Category
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-xl font-black ${
                category.toUpperCase() === "COMMIT"
                  ? "text-purple-600"
                  : category.toUpperCase() === "BEST CASE" || category.toUpperCase() === "BESTCASE"
                  ? "text-blue-600"
                  : "text-emerald-600"
              }`}
            >
              {category}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-2 block">
            Backend Rollup Bucket
          </span>
        </div>

        {/* Metric 2: Deal Aging */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Deal Aging
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-gray-900">
              {agingVal !== null ? agingVal : "—"}
            </span>
            <span className="text-xs font-semibold text-gray-500">days</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-2 block">
            Total Pipeline Lifespan
          </span>
        </div>

        {/* Metric 3: Slippage Status */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Close Date Slippage
          </span>
          <div className="flex items-center gap-2">
            {hasSlippage ? (
              <span className="text-sm font-bold text-red-600 flex items-center gap-1">
                <AlertTriangle size={14} className="shrink-0" />
                {slippageDays ? `${slippageDays}d Slipped` : "Slippage Detected"}
              </span>
            ) : (
              <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={14} className="shrink-0" />
                No Slippage
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400 mt-2 block truncate" title={slippageMessage || "On schedule"}>
            {slippageMessage || (hasSlippage ? "Close date slipped" : "Within scheduled timeframe")}
          </span>
        </div>

        {/* Metric 4: Multi-Currency Converted Amount */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Converted Amount ({repCurrency})
          </span>
          <div>
            <p className="text-xl font-black text-emerald-600">
              {formatCurrencyAmount(
                convertedAmount !== undefined ? convertedAmount : originalAmount,
                repCurrency
              )}
            </p>
            {originalAmount !== undefined && originalCurrency !== repCurrency && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                Original: {formatCurrencyAmount(originalAmount, originalCurrency)}
              </p>
            )}
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
            Frozen Rates Preserved
          </span>
        </div>
      </div>

      {/* Stage Velocity Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={13} className="text-purple-500" />
            Stage Velocity (Dwell Time)
          </h4>
          <span className="text-[11px] text-gray-400">
            {velocityEntries.length} Stage{velocityEntries.length !== 1 ? "s" : ""} Recorded
          </span>
        </div>

        {velocityEntries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {velocityEntries.map((v, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                    Stage
                  </span>
                  <span className="text-xs font-bold text-gray-900">{v.stage}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-purple-600">{v.days}</span>
                  <span className="text-[10px] text-gray-400 font-semibold block">days</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic p-3 bg-gray-50/50 rounded-xl border border-gray-100">
            No stage velocity dwell records reported by backend for this deal yet.
          </p>
        )}
      </div>
    </div>
  );
}
