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

export interface VelocityDisplayItem {
  id: string;
  label: string;
  category: string;
  days?: number | null;
  textValue?: string | null;
  badgeText?: string | null;
}

const IGNORED_VELOCITY_KEYS = new Set([
  "dealidd",
  "dealid",
  "id",
  "_id",
  "organizationid",
  "createdat",
  "updatedat",
  "rulesversion",
  "modelversion",
  "asofdate",
  "__v",
]);

const VELOCITY_FIELD_CONFIG: Record<string, { label: string; category: string }> = {
  currentstage: { label: "Current Stage", category: "Pipeline" },
  current_stage: { label: "Current Stage", category: "Pipeline" },
  averagestagevelocitydays: { label: "Average Stage Velocity", category: "Metric" },
  average_stage_velocity_days: { label: "Average Stage Velocity", category: "Metric" },
  averagestagevelocity: { label: "Average Stage Velocity", category: "Metric" },
  average_stage_velocity: { label: "Average Stage Velocity", category: "Metric" },
  timespentinpreviousstages: { label: "Time in Previous Stages", category: "Metric" },
  time_spent_in_previous_stages: { label: "Time in Previous Stages", category: "Metric" },
  previousstagesdwell: { label: "Time in Previous Stages", category: "Metric" },
  velocityassessment: { label: "Velocity Assessment", category: "Status" },
  velocity_assessment: { label: "Velocity Assessment", category: "Status" },
};

export function formatStageName(val: string): string {
  if (!val) return "—";
  return val
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatAssessment(val: string): string {
  if (!val) return "Normal";
  return val
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function toHumanLabel(key: string): string {
  const normalizedKey = key.toLowerCase();
  if (VELOCITY_FIELD_CONFIG[normalizedKey]) {
    return VELOCITY_FIELD_CONFIG[normalizedKey].label;
  }
  const words = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/);
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function normalizeStageVelocityEntries(rawVelocity: any): VelocityDisplayItem[] {
  const entries: VelocityDisplayItem[] = [];
  if (!rawVelocity) return entries;

  if (Array.isArray(rawVelocity)) {
    rawVelocity.forEach((item: any, idx: number) => {
      const stageName = item.stage || item.stageName || "Unknown Stage";
      const days =
        typeof item.days === "number"
          ? item.days
          : typeof item.durationDays === "number"
          ? item.durationDays
          : typeof item.dwellTimeDays === "number"
          ? item.dwellTimeDays
          : 0;
      entries.push({
        id: `stage-${idx}`,
        label: stageName,
        category: "Stage",
        days,
        badgeText: "days",
      });
    });
    return entries;
  }

  if (typeof rawVelocity === "object") {
    Object.entries(rawVelocity).forEach(([k, v], idx) => {
      const normalizedKey = k.toLowerCase();
      // Requirement 5: Ignore accidental/invalid ID fields like dealIdd and other internal database keys
      if (IGNORED_VELOCITY_KEYS.has(normalizedKey)) {
        return;
      }

      if (normalizedKey === "currentstage" || normalizedKey === "current_stage") {
        const stageStr = typeof v === "string" ? v : (v as any)?.name || (v as any)?.stage || String(v || "");
        entries.push({
          id: `current-stage-${idx}`,
          label: "Current Stage",
          category: "Pipeline",
          textValue: formatStageName(stageStr),
          badgeText: "Active",
        });
      } else if (
        normalizedKey === "averagestagevelocitydays" ||
        normalizedKey === "average_stage_velocity_days" ||
        normalizedKey === "averagestagevelocity" ||
        normalizedKey === "average_stage_velocity"
      ) {
        const numDays = typeof v === "number" ? v : parseFloat(String(v)) || 0;
        entries.push({
          id: `avg-velocity-${idx}`,
          label: "Average Stage Velocity",
          category: "Metric",
          days: Math.round(numDays * 10) / 10,
          badgeText: "days",
        });
      } else if (
        normalizedKey === "timespentinpreviousstages" ||
        normalizedKey === "time_spent_in_previous_stages" ||
        normalizedKey === "previousstagesdwell"
      ) {
        const numDays = typeof v === "number" ? v : parseFloat(String(v)) || 0;
        entries.push({
          id: `prev-stages-${idx}`,
          label: "Time in Previous Stages",
          category: "Metric",
          days: Math.round(numDays * 10) / 10,
          badgeText: "days",
        });
      } else if (
        normalizedKey === "velocityassessment" ||
        normalizedKey === "velocity_assessment"
      ) {
        const assessStr = typeof v === "string" ? v : String(v || "");
        entries.push({
          id: `velocity-assess-${idx}`,
          label: "Velocity Assessment",
          category: "Status",
          textValue: formatAssessment(assessStr),
          badgeText: "Status",
        });
      } else {
        const days =
          typeof v === "number"
            ? v
            : typeof (v as any)?.days === "number"
            ? (v as any).days
            : null;

        if (days !== null) {
          entries.push({
            id: `entry-${idx}`,
            label: toHumanLabel(k),
            category: "Stage",
            days,
            badgeText: "days",
          });
        } else if (typeof v === "string") {
          entries.push({
            id: `entry-${idx}`,
            label: toHumanLabel(k),
            category: "Metric",
            textValue: formatAssessment(v),
            badgeText: "Status",
          });
        }
      }
    });
  }

  return entries;
}

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

  // 3. Stage Velocity: backend-provided list or record normalized with customer-friendly labels
  const rawVelocity = data.stageVelocity || data.velocity || data.stageDwellTimes;
  const velocityEntries = normalizeStageVelocityEntries(rawVelocity);

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
              Pipeline Forecast • Stage Dwell & Slippage
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
            Forecast Classification
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
            Converted at Effective Rate
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
            {velocityEntries.length}{" "}
            {velocityEntries.every((e) => e.category === "Stage")
              ? `Stage${velocityEntries.length !== 1 ? "s" : ""}`
              : `Metric${velocityEntries.length !== 1 ? "s" : ""}`}{" "}
            Recorded
          </span>
        </div>

        {velocityEntries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {velocityEntries.map((v) => (
              <div
                key={v.id}
                className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                    {v.category}
                  </span>
                  <span className="text-xs font-bold text-gray-900">{v.label}</span>
                </div>
                <div className="text-right">
                  {v.days !== undefined && v.days !== null ? (
                    <>
                      <span className="text-sm font-black text-purple-600">{v.days}</span>
                      <span className="text-[10px] text-gray-400 font-semibold block">{v.badgeText || "days"}</span>
                    </>
                  ) : v.textValue ? (
                    <>
                      <span className="text-xs font-bold text-purple-600 block">{v.textValue}</span>
                      <span className="text-[10px] text-gray-400 font-semibold block">{v.badgeText || "Status"}</span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 font-medium">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic p-3 bg-gray-50/50 rounded-xl border border-gray-100">
            No stage velocity records recorded for this deal yet.
          </p>
        )}
      </div>
    </div>
  );
}
