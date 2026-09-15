import type {
    Forecast,
    Demand,
    Segment,
    Conversion,
    DriverResponse,
    Recommendation,
} from "../lib/api/analyticsApi";

// ── UI Props Types ─────────────────────────────

export interface SpinnerProps {
    text?: string;
}

export interface EndpointBadgeProps {
    label: string;
}

export interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export interface CardHeaderProps {
    title: string;
    sub?: string;
    badge?: string;
}

export interface KPI {
    avgScore: number | "—";
    highProbDeals: number | "—";
}

export interface KpiRowProps {
    kpi: KPI | null;
}

export interface ForecastChartProps {
    data: Forecast | null;
}

export interface DemandChartProps {
    data: Demand | null;
}

export interface SegmentListProps {
    data: Segment[] | null;
}

export interface DriversListProps {
    data: DriverResponse | null;
}

export interface ConversionTableProps {
    data: Conversion[] | null;
}

export interface RecommendationsGridProps {
    data: Recommendation[] | null;
}

export interface SourceDonutProps {
    data: DriverResponse | null;
}