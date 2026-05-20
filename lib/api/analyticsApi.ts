// ─────────────────────────────────────────────────────────
// analyticsApi.ts
// All network calls for the Analytics module.
// Uses the shared axios instance from api.ts — which
// handles auth headers, token refresh, and logout
// automatically via interceptors.
// ─────────────────────────────────────────────────────────

import api from "./api";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface ForecastDatapoint {
    label: string;
    forecast: number;
    upper: number;
    lower: number;
}

export interface Forecast {
    currency: string;
    period_days: number;
    datapoints: ForecastDatapoint[];
}

export interface Demand {
    months: string[];
    demand: number[];
    inventory: number[];
}

export interface Segment {
    name: string;
    share: number;
    color: string;
}

export interface Conversion {
    deal: string;
    company: string;
    stage: "Negotiation" | "Proposal" | "Qualified" | "Demo";
    value: number;
    score: number;
}

export interface DriverTotals {
    totalRevenue: number;
    totalMarketing: number;
    totalExpenses: number;
    margin: number;
    marginPct: number;
    marketingRoi: number | null;
}

export interface DriverChannel {
    name: string;
    revenue: number;
    marketing: number;
    expenses: number;
}

export interface DriverResponse {
    totals: DriverTotals;
    channels: DriverChannel[];
}
export interface Recommendation {
    priority: "high" | "med" | "low";
    icon: string;
    title: string;
    body: string;
}

export interface AnalyticsData {
    forecast: Forecast;
    demand: Demand;
    segments: Segment[];
    conversion: Conversion[];
    drivers: DriverResponse;
    recommendations: Recommendation[];
}

// ─────────────────────────────────────────────────────────
// Core Fetch Helper
// ─────────────────────────────────────────────────────────

/**
 * Calls an analytics endpoint via the shared axios instance.
 *
 * The axios instance (api.ts) handles:
 *   - Authorization header
 *   - Token refresh
 *   - Automatic retry on 401
 *   - Redirect to login if refresh fails
 */
async function apiFetch<T>(path: string): Promise<T> {
    const response = await api.get<T>(path);
    return response.data;
}

// ─────────────────────────────────────────────────────────
// Named Endpoint Functions
// ─────────────────────────────────────────────────────────

/** GET /analytics/revenue/forecast */
/** GET /analytics/revenue/forecast */
export const fetchForecast = async (): Promise<Forecast> => {
    const raw = await apiFetch<any>("/analytics/revenue/forecast");
    return {
        currency: raw.currency ?? "USD",
        period_days: raw.period_days ?? 90,
        datapoints: (raw.forecast ?? []).map((d: any) => ({
            label: d.date,
            forecast: d.value ?? 0,
            upper: d.upper ?? d.value ?? 0,
            lower: d.lower ?? d.value ?? 0,
        })),
    };
};


/** GET /analytics/demand/trends */
export const fetchDemand = async (): Promise<Demand> => {
    const raw = await apiFetch<any>("/analytics/demand/trends");
    return {
        months: (raw.inventoryRisk ?? []).map((d: any) => d.date ?? d.month ?? ""),
        demand: (raw.inventoryRisk ?? []).map((d: any) => d.demand ?? 0),
        inventory: (raw.inventoryRisk ?? []).map((d: any) => d.inventory ?? 0),
    };
};

/** GET /analytics/segments */
export const fetchSegments = async (): Promise<Segment[]> => {
    const raw = await apiFetch<any>("/analytics/segments");
    return (raw.clusters ?? []).map((s: any) => ({
        name: s.name ?? s.label ?? "Unknown",
        share: s.share ?? s.percentage ?? 0,
        color: s.color ?? "#6366f1",
    }));
};

/** GET /analytics/conversion/scores */
export const fetchConversion = (): Promise<Conversion[]> =>
    apiFetch("/analytics/conversion/scores");

/** GET /analytics/revenue/drivers */
export const fetchDrivers = (): Promise<DriverResponse> =>
    apiFetch("/analytics/revenue/drivers");
/** GET /recommendations */
export const fetchRecommendations = (): Promise<Recommendation[]> =>
    apiFetch("/recommendations");

// ─────────────────────────────────────────────────────────
// Fetch All Analytics
// ─────────────────────────────────────────────────────────

/** Fetches all analytics endpoints in parallel */
export async function fetchAllAnalytics(): Promise<AnalyticsData> {
    const [
        forecast,
        demand,
        segments,
        conversion,
        drivers,
        recommendations,
    ] = await Promise.all([
        fetchForecast(),
        fetchDemand(),
        fetchSegments(),
        fetchConversion(),
        fetchDrivers(),
        fetchRecommendations(),
    ]);

    return {
        forecast,
        demand,
        segments,
        conversion,
        drivers,
        recommendations,
    };
}