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
// Derive KPI (only from conversion scores)
// ─────────────────────────────────────────────────────────

function deriveKPI(conversion: Conversion[] | null): KPI {
    let avgScore: number | "—" = "—";
    let highProbDeals: number | "—" = "—";

    if (conversion && conversion.length > 0) {
        const sum = conversion.reduce((sum, c) => sum + c.score, 0);
        avgScore = Math.round((sum / conversion.length) * 100);
        if (isNaN(avgScore) || !isFinite(avgScore)) avgScore = "—";

        highProbDeals = conversion.filter(c => c.score >= 0.75).length;
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

    // Compute filtered/demo data based on date range
    const {
        filteredForecast,
        isForecastDemo,
        filteredDemand,
        isDemandDemo,
        filteredSegments,
        isSegmentsDemo,
        filteredDrivers,
        isDriversDemo,
    } = useMemo(() => {
        let f = state.realData.forecast;
        const isFDemo = isForecastEmpty(f);
        let filteredF = f ? filterForecastByDateRange(f, state.dateRange) : null;
        if (isFDemo) {
            filteredF = getDemoForecast(state.dateRange);
        }

        let d = state.realData.demand;
        const isDDemo = isDemandEmpty(d);
        let filteredD = d;
        if (isDDemo) {
            filteredD = DEMO_DEMAND;
        }

        let s = state.realData.segments;
        const isSDemo = isSegmentsEmpty(s);
        let filteredS = s;
        if (isSDemo) {
            filteredS = DEMO_SEGMENTS;
        }

        let dr = state.realData.drivers;
        const isDrDemo = isDriversEmpty(dr);
        let filteredDr = dr;
        if (isDrDemo) {
            filteredDr = DEMO_DRIVERS;
        }

        return {
            filteredForecast: filteredF,
            isForecastDemo: isFDemo,
            filteredDemand: filteredD,
            isDemandDemo: isDDemo,
            filteredSegments: filteredS,
            isSegmentsDemo: isSDemo,
            filteredDrivers: filteredDr,
            isDriversDemo: isDrDemo,
        };
    }, [state.realData, state.dateRange]);

    return {
        ...state,
        forecast: filteredForecast,
        isForecastDemo,
        demand: filteredDemand,
        isDemandDemo,
        segments: filteredSegments,
        isSegmentsDemo,
        drivers: filteredDrivers,
        isDriversDemo,
        conversion: state.realData.conversion,
        recommendations: state.realData.recommendations,
        refetch: load,
        setDateRange,
    };
}
