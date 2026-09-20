// components/deals/ForecastDashboard.tsx
// FE-2 Day 4: Forecast Dashboard, Rollups, Multi-Currency, Historical Snapshots, Deal Breakdown.
// Source of truth: GET /api/deals/forecast & GET /api/deals/forecast/snapshots

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  BarChart3,
  Calendar,
  DollarSign,
  Layers,
  History,
  AlertCircle,
  RotateCw,
  Loader2,
  Filter,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Globe,
  Coins,
} from "lucide-react";
import {
  ForecastRollupResponse,
  ForecastSnapshot,
  ForecastFilterParams,
} from "@/types/forecast";
import { Deal } from "@/types/deals";
import { fetchForecastRollups, fetchForecastSnapshots } from "@/lib/api/forecastApi";
import { fetchDeals } from "@/lib/api/dealsApi";
import { formatCurrencyAmount } from "@/utils/currencyFormat";

interface ForecastDashboardProps {
  initialDeals?: Deal[];
}

export function ForecastDashboard({ initialDeals }: ForecastDashboardProps) {
  const [rollups, setRollups] = useState<ForecastRollupResponse | null>(null);
  const [snapshots, setSnapshots] = useState<ForecastSnapshot[]>([]);
  const [deals, setDeals] = useState<Deal[]>(initialDeals || []);
  const [loading, setLoading] = useState(true);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters supported by Swagger: reportingCurrency, asOfDate
  const [reportingCurrency, setReportingCurrency] = useState<string>("USD");
  const [asOfDate, setAsOfDate] = useState<string>("");

  // Category filter for deal breakdown table
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "COMMIT" | "BEST_CASE" | "PIPELINE">("ALL");

  // Show snapshots section
  const [showSnapshots, setShowSnapshots] = useState(true);

  // Load Forecast Rollups
  const loadForecastData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: ForecastFilterParams = {
        reportingCurrency,
        ...(asOfDate ? { asOfDate: new Date(asOfDate).toISOString() } : {}),
      };
      const [forecastData, fetchedDeals] = await Promise.all([
        fetchForecastRollups(filters),
        initialDeals && initialDeals.length > 0 ? Promise.resolve(initialDeals) : fetchDeals().catch(() => []),
      ]);
      setRollups(forecastData);
      setDeals(fetchedDeals);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load organization forecast rollups"
      );
    } finally {
      setLoading(false);
    }
  }, [reportingCurrency, asOfDate, initialDeals]);

  // Load Historical Snapshots
  const loadSnapshots = useCallback(async () => {
    setSnapshotsLoading(true);
    try {
      const list = await fetchForecastSnapshots(50);
      setSnapshots(list || []);
    } catch (err) {
      console.error("Failed to load forecast snapshots:", err);
    } finally {
      setSnapshotsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForecastData();
    loadSnapshots();
  }, [loadForecastData, loadSnapshots]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadForecastData(), loadSnapshots()]);
    } finally {
      setRefreshing(false);
    }
  };

  const formatTimestamp = (ts?: string | null): string => {
    if (!ts) return "N/A";
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return "N/A";
      return d.toLocaleDateString("en-US", {
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

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "N/A";
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  // Map deals to their assigned category based on backend rollups dealIds
  const categorizedDeals = useMemo(() => {
    if (!rollups) return deals;

    const commitIds = new Set(rollups.commit?.dealIds || []);
    const bestCaseIds = new Set(rollups.bestCase?.dealIds || []);
    const pipelineIds = new Set(rollups.pipeline?.dealIds || []);

    return deals.map((d) => {
      let cat = d.forecastCategory || "Pipeline";
      if (commitIds.has(d.dealId) || commitIds.has((d as any).id)) {
        cat = "Commit";
      } else if (bestCaseIds.has(d.dealId) || bestCaseIds.has((d as any).id)) {
        cat = "Best Case";
      } else if (pipelineIds.has(d.dealId) || pipelineIds.has((d as any).id)) {
        cat = "Pipeline";
      }
      return {
        ...d,
        computedCategory: cat,
      };
    });
  }, [deals, rollups]);

  // Filter deals for the breakdown table
  const filteredDeals = useMemo(() => {
    return categorizedDeals.filter((d: any) => {
      if (categoryFilter === "ALL") return true;
      const cat = (d.computedCategory || d.forecastCategory || "").toUpperCase();
      if (categoryFilter === "COMMIT") return cat.includes("COMMIT");
      if (categoryFilter === "BEST_CASE") return cat.includes("BEST");
      if (categoryFilter === "PIPELINE") return cat.includes("PIPELINE");
      return true;
    });
  }, [categorizedDeals, categoryFilter]);

  if (loading && !rollups) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center min-h-[350px] gap-3">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="text-sm text-gray-500 font-medium">
          Loading organization forecast rollups...
        </p>
      </div>
    );
  }

  if (error && !rollups) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="max-w-md mx-auto text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-base font-bold text-gray-900">
            Failed to Load Forecast
          </h3>
          <p className="text-xs text-gray-500">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const currency = rollups?.reportingCurrency || reportingCurrency;
  const commit = rollups?.commit;
  const bestCase = rollups?.bestCase;
  const pipeline = rollups?.pipeline;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* ── Top Header & Filter Controls ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Forecast Engine
            </span>
            {rollups?.rulesVersion && (
              <span className="text-[10px] text-gray-400 font-mono">
                Rules: v{rollups.rulesVersion}
              </span>
            )}
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">
            Revenue & Pipeline Forecast
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Commit, Best Case, and Pipeline rollups reconciling with frozen exchange rates
          </p>
        </div>

        {/* Filter Controls: Currency, asOfDate, Refresh */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Target Reporting Currency Selector */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Globe size={14} className="text-gray-400" />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Reporting:
            </span>
            <select
              value={reportingCurrency}
              onChange={(e) => setReportingCurrency(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>

          {/* asOfDate Selector */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Calendar size={14} className="text-gray-400" />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              As Of:
            </span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-gray-900 focus:outline-none cursor-pointer"
            />
            {asOfDate && (
              <button
                onClick={() => setAsOfDate("")}
                className="text-[10px] text-gray-400 hover:text-gray-600 ml-1 font-bold"
                title="Clear date"
              >
                ✕
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50"
            title="Refresh forecast data"
          >
            <RotateCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Forecast Rollup Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Commit Rollup Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden border-t-4 border-t-purple-600">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Commit</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Highest Certainty
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold bg-purple-50 text-purple-700 rounded-lg">
              {commit?.dealCount ?? 0} Deal{(commit?.dealCount ?? 0) !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Converted Forecast Amount ({currency})
            </span>
            <p className="text-3xl font-black text-gray-900">
              {formatCurrencyAmount(commit?.convertedAmount ?? commit?.totalAmount ?? 0, currency)}
            </p>
            {commit?.totalAmount !== undefined && commit?.convertedAmount !== undefined && commit.totalAmount !== commit.convertedAmount && (
              <p className="text-[11px] text-gray-400">
                Unconverted Total: {formatCurrencyAmount(commit.totalAmount, "USD")}
              </p>
            )}
          </div>
        </div>

        {/* 2. Best Case Rollup Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden border-t-4 border-t-blue-600">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Best Case</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Upside + Commit
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 rounded-lg">
              {bestCase?.dealCount ?? 0} Deal{(bestCase?.dealCount ?? 0) !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Converted Forecast Amount ({currency})
            </span>
            <p className="text-3xl font-black text-blue-600">
              {formatCurrencyAmount(bestCase?.convertedAmount ?? bestCase?.totalAmount ?? 0, currency)}
            </p>
            {bestCase?.totalAmount !== undefined && bestCase?.convertedAmount !== undefined && bestCase.totalAmount !== bestCase.convertedAmount && (
              <p className="text-[11px] text-gray-400">
                Unconverted Total: {formatCurrencyAmount(bestCase.totalAmount, "USD")}
              </p>
            )}
          </div>
        </div>

        {/* 3. Pipeline Rollup Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden border-t-4 border-t-emerald-600">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Layers size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Pipeline</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Total Active Opportunity
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-lg">
              {pipeline?.dealCount ?? 0} Deal{(pipeline?.dealCount ?? 0) !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Converted Forecast Amount ({currency})
            </span>
            <p className="text-3xl font-black text-emerald-600">
              {formatCurrencyAmount(pipeline?.convertedAmount ?? pipeline?.totalAmount ?? 0, currency)}
            </p>
            {pipeline?.totalAmount !== undefined && pipeline?.convertedAmount !== undefined && pipeline.totalAmount !== pipeline.convertedAmount && (
              <p className="text-[11px] text-gray-400">
                Unconverted Total: {formatCurrencyAmount(pipeline.totalAmount, "USD")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Exchange Rates & Conversion Info Banner ── */}
      {rollups?.exchangeRates && Object.keys(rollups.exchangeRates).length > 0 && (
        <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Coins size={15} className="text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-gray-800">Preserved Exchange Rates:</span>
              <span className="text-gray-500 ml-1.5 font-mono">
                {Object.entries(rollups.exchangeRates)
                  .map(([c, r]) => `1 ${c} = ${typeof r === "number" ? r.toFixed(3) : r}`)
                  .join(" • ")}
              </span>
            </div>
          </div>
          {rollups.ratesTimestamp && (
            <span className="text-[11px] text-gray-400 shrink-0">
              Frozen as of {formatTimestamp(rollups.ratesTimestamp)}
            </span>
          )}
        </div>
      )}

      {/* ── Deal Breakdown Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Forecast Deal Breakdown</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Individual deals mapped into forecast categories
            </p>
          </div>

          {/* Filter Tabs by Category */}
          <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200">
            {(
              [
                { id: "ALL", label: "All Deals" },
                { id: "COMMIT", label: "Commit" },
                { id: "BEST_CASE", label: "Best Case" },
                { id: "PIPELINE", label: "Pipeline" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setCategoryFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  categoryFilter === t.id
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {filteredDeals.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            No forecast deals found for category &quot;{categoryFilter}&quot;
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3.5">Deal Name</th>
                  <th className="px-6 py-3.5">Owner</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Forecast Category</th>
                  <th className="px-6 py-3.5">Close Date</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDeals.map((deal: any) => {
                  const cat = (deal.computedCategory || deal.forecastCategory || "Pipeline").toString();
                  const catColor =
                    cat.toUpperCase() === "COMMIT"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : cat.toUpperCase().includes("BEST")
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200";

                  return (
                    <tr key={deal.dealId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/deals/${deal.dealId}`}
                          className="font-bold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {deal.name}
                        </Link>
                        {deal.companyName && (
                          <span className="block text-[11px] text-gray-400 mt-0.5">
                            {deal.companyName}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {deal.owner || "Unassigned"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900">
                          {formatCurrencyAmount(deal.amount, deal.currency || "INR")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border ${catColor}`}>
                          {cat}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {formatDate(deal.closeDate)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/deals/${deal.dealId}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Details <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Historical Forecast Snapshots Accordion ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <button
          onClick={() => setShowSnapshots(!showSnapshots)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <History size={16} className="text-blue-600" />
            <h3 className="text-base font-bold text-gray-900">
              Historical Forecast Snapshots
            </h3>
            {snapshots.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-full">
                {snapshots.length}
              </span>
            )}
          </div>
          {showSnapshots ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </button>

        {showSnapshots && (
          <div className="mt-4 animate-in fade-in duration-200">
            {snapshotsLoading ? (
              <div className="p-8 flex items-center justify-center gap-2 text-xs text-gray-400">
                <Loader2 size={16} className="animate-spin text-blue-600" />
                Loading historical snapshots...
              </div>
            ) : snapshots.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6 bg-gray-50/50 rounded-xl border border-gray-100">
                No forecast snapshot history recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50/80 text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Snapshot Date</th>
                      <th className="px-4 py-3">Reporting Currency</th>
                      <th className="px-4 py-3">Commit Converted</th>
                      <th className="px-4 py-3">Best Case Converted</th>
                      <th className="px-4 py-3">Pipeline Converted</th>
                      <th className="px-4 py-3">Total Converted</th>
                      <th className="px-4 py-3">Exchange Rate State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {snapshots.map((snap, idx) => {
                      const snapCurrency = snap.reportingCurrency || snap.currency || "USD";
                      return (
                        <tr key={snap.id || snap.snapshotId || idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {formatTimestamp(snap.asOfDate || snap.createdAt || snap.timestamp)}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-700">
                            {snapCurrency}
                          </td>
                          <td className="px-4 py-3 font-bold text-purple-600">
                            {formatCurrencyAmount(
                              snap.commit?.convertedAmount ?? snap.commit?.totalAmount ?? 0,
                              snapCurrency
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-blue-600">
                            {formatCurrencyAmount(
                              snap.bestCase?.convertedAmount ?? snap.bestCase?.totalAmount ?? 0,
                              snapCurrency
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-emerald-600">
                            {formatCurrencyAmount(
                              snap.pipeline?.convertedAmount ?? snap.pipeline?.totalAmount ?? 0,
                              snapCurrency
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900">
                            {formatCurrencyAmount(
                              snap.totalConvertedAmount ?? 0,
                              snapCurrency
                            )}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-gray-400 font-mono">
                            {snap.exchangeRates
                              ? Object.keys(snap.exchangeRates).join(", ")
                              : "Standard"}
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
