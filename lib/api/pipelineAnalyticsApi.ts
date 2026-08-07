// lib/api/pipelineAnalyticsApi.ts
// API calls for the Pipeline Analytics Dashboard (Task 2).
//
// Endpoints used:
//   GET /analytics/revenue/forecast    — Revenue projection data
//   GET /analytics/conversion/scores   — Conversion rate + win rate data
//   GET /api/deals/pipeline-stats      — Pipeline stage performance

import api from "@/lib/api/api";
import { fetchPipelineStats, PipelineStatsResponse } from "@/lib/api/dealsApi";
import { fetchForecast, fetchConversion, Forecast, Conversion } from "@/lib/api/analyticsApi";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PipelineStageData {
  stage: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface PipelineAnalyticsSummary {
  totalPipelineValue: number;
  avgDealSize: number;
  winRate: number;
  conversionRate: number;
  avgConversionScore: number;
  highProbabilityDeals: number;
  revenueProjection: number;
  stages: PipelineStageData[];
  forecast: Forecast | null;
  conversions: Conversion[];
  isMock: boolean;
}

// ── Normalise pipeline stats ──────────────────────────────────────────────────

function normalisePipelineStages(raw: PipelineStatsResponse): PipelineStageData[] {
  const stageArr =
    raw.stages ?? raw.pipeline ?? (Array.isArray(raw.data) ? raw.data : []);

  if (!stageArr || stageArr.length === 0) return [];

  const total = stageArr.reduce(
    (sum, s) => sum + (s.amount ?? s.totalAmount ?? s.value ?? 0),
    0
  );

  return stageArr.map((s, idx) => {
    const amount = s.amount ?? s.totalAmount ?? s.value ?? 0;
    return {
      stage: s.stage ?? String(idx),
      amount,
      count: typeof s.count === "number" ? s.count : 0,
      percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
    };
  });
}

// ── Main fetch ────────────────────────────────────────────────────────────────

export async function fetchPipelineAnalytics(): Promise<PipelineAnalyticsSummary> {
  const [pipelineResult, forecastResult, conversionResult] = await Promise.allSettled([
    fetchPipelineStats(),
    fetchForecast(),
    fetchConversion(),
  ]);

  const rawPipeline = pipelineResult.status === "fulfilled" ? pipelineResult.value : null;
  const rawForecast = forecastResult.status === "fulfilled" ? forecastResult.value : null;
  const rawConversion = conversionResult.status === "fulfilled" ? conversionResult.value : null;

  const hasRealPipeline = rawPipeline !== null;
  const hasRealForecast = rawForecast !== null && (rawForecast.datapoints ?? []).length > 0;
  const hasRealConversion = rawConversion !== null && rawConversion.length > 0;

  // Compute metrics from real data
  const stages = hasRealPipeline
    ? normalisePipelineStages(rawPipeline!)
    : [];

  const totalPipelineValue = stages.reduce((s, st) => s + st.amount, 0);
  const totalDeals = stages.reduce((s, st) => s + st.count, 0);
  const avgDealSize = totalDeals > 0 ? Math.round(totalPipelineValue / totalDeals) : 0;

  const wonStage = stages.find((s) => s.stage.toUpperCase() === "WON");
  const lostStage = stages.find((s) => s.stage.toUpperCase() === "LOST");
  const closedCount = (wonStage?.count ?? 0) + (lostStage?.count ?? 0);
  const winRate = closedCount > 0 ? Math.round(((wonStage?.count ?? 0) / closedCount) * 100) : 0;

  const conversions = hasRealConversion ? rawConversion! : [];
  const avgConversionScore =
    conversions.length > 0
      ? Math.round(
          (conversions.reduce((s, c) => s + c.conversionProbability, 0) / conversions.length) * 100
        )
      : 0;

  const highProbabilityDeals = conversions.filter((c) => c.conversionProbability >= 0.7).length;
  const conversionRate = avgConversionScore;
  const revenueProjection = hasRealForecast
    ? Math.round(rawForecast!.datapoints.reduce((s, d) => s + d.forecast, 0) / rawForecast!.datapoints.length) * 30
    : Math.round(totalPipelineValue * 0.72);

  return {
    totalPipelineValue,
    avgDealSize,
    winRate,
    conversionRate,
    avgConversionScore,
    highProbabilityDeals,
    revenueProjection,
    stages,
    forecast: hasRealForecast ? rawForecast : null,
    conversions,
    isMock: false,
  };
}
