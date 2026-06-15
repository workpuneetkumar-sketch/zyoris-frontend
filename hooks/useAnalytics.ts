// useAnalytics.ts
// Custom React hook — owns all data-fetching, loading, and
// error state for the Analytics page.
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { fetchAllAnalytics } from "../lib/api/analyticsApi";
import {
    Forecast,
    Demand,
    Segment,
    Conversion,
    DriverResponse,
    Recommendation,
} from "../lib/api/analyticsApi";
import {
    DEMO_FORECAST_7D,
    DEMO_FORECAST_30D,
    DEMO_FORECAST_90D,
    DEMO_FORECAST_1Y,
    DEMO_DEMAND,
    DEMO_SEGMENTS,
    DEMO_DRIVERS,
} from "../constants/analytics.constants";

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

type DateRange = "7D" | "30D" | "90D" | "1Y";

interface AnalyticsState {
    loading: boolean;
    error: string | null;
    dateRange: DateRange;
    realData: {
        forecast: Forecast | null;
        demand: Demand | null;
        segments: Segment[] | null;
        conversion: Conversion[] | null;
        drivers: DriverResponse | null;
        recommendations: Recommendation[] | null;
    };
    kpi: KPI | null;
}

// ─────────────────────────────────────────────────────────
// Helpers to check if data is empty/zero
// ─────────────────────────────────────────────────────────

function isForecastEmpty(f: Forecast | null): boolean {
    if (!f || !f.datapoints || f.datapoints.length === 0) return true;
    const allZero = f.datapoints.every(d =>
        d.forecast === 0 && d.upper === 0 && d.lower === 0
    );
    return allZero;
}

function isDemandEmpty(d: Demand | null): boolean {
    if (!d || !d.months || d.months.length === 0) return true;
    const allZero = d.demand.every(v => v === 0) && d.inventory.every(v => v === 0);
    return allZero;
}

function isSegmentsEmpty(s: Segment[] | null): boolean {
    return !s || s.length === 0;
}

function isDriversEmpty(d: DriverResponse | null): boolean {
    if (!d || !d.totals || !d.channels) return true;
    if (d.channels.length === 0) return true;
    const totals = d.totals;
    return totals.totalRevenue === 0 && totals.totalMarketing === 0 && totals.totalExpenses === 0;
}

// ─────────────────────────────────────────────────────────
// Derive KPI
// ─────────────────────────────────────────────────────────

function deriveKPI(
    forecast: Forecast | null,
    drivers: DriverResponse | null,
    conversion: Conversion[] | null
): KPI {
    // Fallback to demo KPI values if data is missing
    const fallbackKPI: KPI = {
        totalRevenue: 4500000,
        avgScore: 78,
        highProbDeals: 12,
        avgDealValue: 125000,
        forecastPeak: 300000,
        activeDeals: 24,
    };

    const hasForecast = forecast && forecast.datapoints && forecast.datapoints.length > 0;
    const hasDrivers = drivers && drivers.totals;
    const hasConversion = conversion && conversion.length > 0;

    if (!hasForecast && !hasDrivers && !hasConversion) {
        return fallbackKPI;
    }

    const totalRevenue = hasDrivers && drivers.totals.totalRevenue !== 0
        ? drivers.totals.totalRevenue
        : fallbackKPI.totalRevenue;

    let avgScore = fallbackKPI.avgScore;
    if (hasConversion) {
        const sum = conversion.reduce((sum, c) => sum + c.score, 0);
        avgScore = Math.round((sum / conversion.length) * 100);
        if (isNaN(avgScore) || !isFinite(avgScore)) avgScore = fallbackKPI.avgScore;
    }

    let highProbDeals = fallbackKPI.highProbDeals;
    if (hasConversion) {
        highProbDeals = conversion.filter(c => c.score >= 0.75).length;
    }

    let avgDealValue = fallbackKPI.avgDealValue;
    if (hasConversion) {
        const sum = conversion.reduce((sum, c) => sum + c.value, 0);
        avgDealValue = Math.round(sum / conversion.length);
        if (isNaN(avgDealValue) || !isFinite(avgDealValue)) avgDealValue = fallbackKPI.avgDealValue;
    }

    let forecastPeak = fallbackKPI.forecastPeak;
    if (hasForecast) {
        const lastPoint = forecast.datapoints[forecast.datapoints.length - 1];
        forecastPeak = lastPoint.forecast;
        if (isNaN(forecastPeak) || !isFinite(forecastPeak)) forecastPeak = fallbackKPI.forecastPeak;
    }

    const activeDeals = hasConversion ? conversion.length : fallbackKPI.activeDeals;

    return {
        totalRevenue,
        avgScore,
        highProbDeals,
        avgDealValue,
        forecastPeak,
        activeDeals,
    };
}

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────

export function useAnalytics() {
    const [state, setState] = useState<AnalyticsState>({
        loading: true,
        error: null,
        dateRange: "90D",
        realData: {
            forecast: null,
            demand: null,
            segments: null,
            conversion: null,
            drivers: null,
            recommendations: null,
        },
        kpi: null,
    });

    const load = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const data = await fetchAllAnalytics();
            const kpi = deriveKPI(data.forecast, data.drivers, data.conversion);
            setState({
                loading: false,
                error: null,
                dateRange: state.dateRange,
                realData: data,
                kpi,
            });
        } catch (err: any) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: err.message ?? "Unknown error",
            }));
        }
    }, [state.dateRange]);

    useEffect(() => {
        load();
    }, [load]);

    const setDateRange = useCallback((range: DateRange) => {
        setState(prev => ({ ...prev, dateRange: range }));
    }, []);

    // Get demo data based on date range
    const getDemoForecast = (range: DateRange) => {
        switch (range) {
            case "7D": return DEMO_FORECAST_7D;
            case "30D": return DEMO_FORECAST_30D;
            case "1Y": return DEMO_FORECAST_1Y;
            case "90D":
            default: return DEMO_FORECAST_90D;
        }
    };

    const forecast = isForecastEmpty(state.realData.forecast)
        ? getDemoForecast(state.dateRange)
        : state.realData.forecast;
    const isForecastDemo = isForecastEmpty(state.realData.forecast);

    const demand = isDemandEmpty(state.realData.demand) ? DEMO_DEMAND : state.realData.demand;
    const isDemandDemo = isDemandEmpty(state.realData.demand);

    const segments = isSegmentsEmpty(state.realData.segments) ? DEMO_SEGMENTS : state.realData.segments;
    const isSegmentsDemo = isSegmentsEmpty(state.realData.segments);

    const drivers = isDriversEmpty(state.realData.drivers) ? DEMO_DRIVERS : state.realData.drivers;
    const isDriversDemo = isDriversEmpty(state.realData.drivers);

    const conversion = state.realData.conversion;
    const recommendations = state.realData.recommendations;

    return {
        ...state,
        forecast,
        isForecastDemo,
        demand,
        isDemandDemo,
        segments,
        isSegmentsDemo,
        drivers,
        isDriversDemo,
        conversion,
        recommendations,
        refetch: load,
        setDateRange,
    };
}
