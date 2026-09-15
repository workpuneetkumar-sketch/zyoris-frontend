// useAnalytics.ts
// Custom React hook — owns all data-fetching, loading, and
// error state for the Analytics page.
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchAllAnalytics } from "../lib/api/analyticsApi";
import {
    Forecast,
    Demand,
    Segment,
    Conversion,
    DriverResponse,
    Recommendation,
} from "../lib/api/analyticsApi";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface KPI {
    avgScore: number | "—";
    highProbDeals: number | "—";
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
// Derive KPI (only from real conversion scores)
// ─────────────────────────────────────────────────────────

function deriveKPI(conversion: Conversion[] | null): KPI {
    let avgScore: number | "—" = "—";
    let highProbDeals: number | "—" = "—";

    if (conversion && conversion.length > 0) {
        const sum = conversion.reduce((acc, c) => acc + c.conversionProbability, 0);
        avgScore = Math.round((sum / conversion.length) * 100);
        if (isNaN(avgScore) || !isFinite(avgScore)) avgScore = "—";
        highProbDeals = conversion.filter(c => c.conversionProbability >= 0.7).length;
    }

    return { avgScore, highProbDeals };
}

// ─────────────────────────────────────────────────────────
// In-memory date range filtering
// ─────────────────────────────────────────────────────────

function getDateRangeDays(range: DateRange): number {
    switch (range) {
        case "7D": return 7;
        case "30D": return 30;
        case "1Y": return 365;
        case "90D":
        default: return 90;
    }
}

function filterForecastByDateRange(forecast: Forecast, range: DateRange): Forecast {
    const days = getDateRangeDays(range);
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - days);

    const filteredDatapoints = forecast.datapoints.filter(d => {
        const date = new Date(d.label);
        return date >= cutoff;
    });

    return {
        ...forecast,
        datapoints: filteredDatapoints.length > 0 ? filteredDatapoints : forecast.datapoints,
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
            const kpi = deriveKPI(data.conversion);
            setState(prev => ({
                loading: false,
                error: null,
                dateRange: prev.dateRange,
                realData: data,
                kpi,
            }));
        } catch (err: any) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: err.message ?? "Unknown error",
            }));
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const setDateRange = useCallback((range: DateRange) => {
        setState(prev => ({ ...prev, dateRange: range }));
    }, []);

    // Filter real forecast by selected date range (no demo fallback)
    const filteredForecast = useMemo(() => {
        const f = state.realData.forecast;
        if (!f) return null;
        return filterForecastByDateRange(f, state.dateRange);
    }, [state.realData.forecast, state.dateRange]);

    return {
        ...state,
        forecast: filteredForecast,
        isForecastDemo: false,
        demand: state.realData.demand,
        isDemandDemo: false,
        segments: state.realData.segments,
        isSegmentsDemo: false,
        drivers: state.realData.drivers,
        isDriversDemo: false,
        conversion: state.realData.conversion,
        recommendations: state.realData.recommendations,
        refetch: load,
        setDateRange,
    };
}
