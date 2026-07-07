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

// ── MOCK DATA ─────────────────────────────────────────────────────────────────

function generateMockForecast(): Forecast {
  const now = new Date();
  const datapoints = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - 29 + i);
    const base = 120000 + i * 2500 + Math.sin(i / 5) * 18000;
    return {
      label: d.toISOString().split("T")[0],
      forecast: Math.round(base),
      upper: Math.round(base * 1.1),
      lower: Math.round(base * 0.9),
    };
  });
  return { currency: "USD", period_days: 30, datapoints };
}

// MOCK DATA — pipeline analytics fallback
const MOCK_PIPELINE_SUMMARY: PipelineAnalyticsSummary = {
  totalPipelineValue: 1_250_000,
  avgDealSize: 42_500,
  winRate: 34,
  conversionRate: 62,
  avgConversionScore: 71,
  highProbabilityDeals: 8,
  revenueProjection: 890_000,
  stages: [
    { stage: "NEW", amount: 320_000, count: 12, percentage: 25.6 },
    { stage: "HOT", amount: 280_000, count: 8, percentage: 22.4 },
    { stage: "WARM", amount: 210_000, count: 7, percentage: 16.8 },
    { stage: "WON", amount: 290_000, count: 6, percentage: 23.2 },
    { stage: "LOST", amount: 110_000, count: 4, percentage: 8.8 },
    { stage: "DEAD", amount: 40_000, count: 2, percentage: 3.2 },
  ],
  forecast: generateMockForecast(),
  conversions: [
    { dealId: "d1", name: "Acme Corp Enterprise", stage: "HOT", amount: 85000, conversionProbability: 0.88 },
    { dealId: "d2", name: "Vertex Solutions Pro", stage: "WARM", amount: 62000, conversionProbability: 0.74 },
    { dealId: "d3", name: "TechWave Platform", stage: "WON", amount: 120000, conversionProbability: 0.96 },
    { dealId: "d4", name: "CloudFirst Deal", stage: "NEW", amount: 45000, conversionProbability: 0.55 },
    { dealId: "d5", name: "Nimbus Partnership", stage: "HOT", amount: 78000, conversionProbability: 0.81 },
  ],
  isMock: true,
};

// ── Normalise pipeline stats ──────────────────────────────────────────────────

function normalisePipelineStages(raw: PipelineStatsResponse): PipelineStageData[] {
  const stageArr =
    raw.stages ?? raw.pipeline ?? (Array.isArray(raw.data) ? raw.data : []);

  if (!stageArr || stageArr.length === 0) return MOCK_PIPELINE_SUMMARY.stages;

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

  // Determine if we have real data
  const hasRealPipeline = rawPipeline !== null;
  const hasRealForecast = rawForecast !== null && (rawForecast.datapoints ?? []).length > 0;
  const hasRealConversion = rawConversion !== null && rawConversion.length > 0;
  const isMock = !hasRealPipeline && !hasRealConversion;

  if (isMock) {
    return MOCK_PIPELINE_SUMMARY;
  }

  // Compute metrics from real data
  const stages = hasRealPipeline
    ? normalisePipelineStages(rawPipeline!)
    : MOCK_PIPELINE_SUMMARY.stages;

  const totalPipelineValue = stages.reduce((s, st) => s + st.amount, 0);
  const totalDeals = stages.reduce((s, st) => s + st.count, 0);
  const avgDealSize = totalDeals > 0 ? Math.round(totalPipelineValue / totalDeals) : 0;

  const wonStage = stages.find((s) => s.stage.toUpperCase() === "WON");
  const lostStage = stages.find((s) => s.stage.toUpperCase() === "LOST");
  const closedCount = (wonStage?.count ?? 0) + (lostStage?.count ?? 0);
  const winRate = closedCount > 0 ? Math.round(((wonStage?.count ?? 0) / closedCount) * 100) : 0;

  const conversions = hasRealConversion ? rawConversion! : MOCK_PIPELINE_SUMMARY.conversions;
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
    forecast: hasRealForecast ? rawForecast : MOCK_PIPELINE_SUMMARY.forecast,
    conversions,
    isMock,
  };
}
