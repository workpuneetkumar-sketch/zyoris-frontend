// useAnalytics.ts
// Custom React hook — owns all data-fetching, loading, and
// error state for the Analytics page.
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { fetchAllAnalytics } from "../lib/api/analyticsApi";

// ─────────────────────────────────────────────────────────
import {
    Forecast,
    Demand,
    Segment,
    Conversion,
    Driver,
    Recommendation,
} from "../lib/api/analyticsApi";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface KPI {
    totalRevenue: number;
    avgScore: number;
    highProbDeals: number;
    avgDealValue: number;
    forecastPeak: number;
    activeDeals: number;
}

interface AnalyticsState {
    loading: boolean;
    error: string | null;
    forecast: Forecast | null;
    demand: Demand | null;
    segments: Segment[] | null;
    conversion: Conversion[] | null;
    drivers: Driver[] | null;
    recommendations: Recommendation[] | null;
    kpi: KPI | null;
}

// ─────────────────────────────────────────────────────────
// Derive KPI
// ─────────────────────────────────────────────────────────

/**
 * Derives the KPI values from raw API data
 */
function deriveKPI(
    forecast: Forecast | null,
    drivers: Driver[] | null,
    conversion: Conversion[] | null
): KPI | null {
    if (!forecast || !drivers || !conversion) return null;

    const totalRevenue = drivers.reduce(
        (sum, d) => sum + d.impact,
        0
    );

    const avgScore = Math.round(
        (conversion.reduce((sum, c) => sum + c.score, 0) /
            conversion.length) *
        100
    );

    const highProbDeals = conversion.filter(
        (c) => c.score >= 0.75
    ).length;

    const avgDealValue = Math.round(
        conversion.reduce((sum, c) => sum + c.value, 0) /
        conversion.length
    );

    const forecastPeak =
        forecast.datapoints[
            forecast.datapoints.length - 1
        ].forecast;

    return {
        totalRevenue,
        avgScore,
        highProbDeals,
        avgDealValue,
        forecastPeak,
        activeDeals: conversion.length,
    };
}

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────

/**
 * useAnalytics
 *
 * Usage:
 * const { loading, error, forecast, kpi, refetch } = useAnalytics();
 */
export function useAnalytics() {
    const [state, setState] = useState<AnalyticsState>({
        loading: true,
        error: null,
        forecast: null,
        demand: null,
        segments: null,
        conversion: null,
        drivers: null,
        recommendations: null,
        kpi: null,
    });

    const load = useCallback(async () => {
        setState((prev) => ({
            ...prev,
            loading: true,
            error: null,
        }));

        try {
            const data = await fetchAllAnalytics();

            setState({
                loading: false,
                error: null,
                forecast: data.forecast,
                demand: data.demand,
                segments: data.segments,
                conversion: data.conversion,
                drivers: data.drivers,
                recommendations: data.recommendations,
                kpi: deriveKPI(
                    data.forecast,
                    data.drivers,
                    data.conversion
                ),
            });
        } catch (err: any) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: err.message ?? "Unknown error",
            }));
        }
    }, []);

    // Fetch on mount
    useEffect(() => {
        load();
    }, [load]);

    return {
        ...state,
        refetch: load,
    };
}