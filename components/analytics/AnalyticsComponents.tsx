// ─────────────────────────────────────────────────────────
//  AnalyticsComponents.tsx
//  Fixes applied:
//    1. KPI_CONFIGS fmt functions return React-renderable values
//    2. Chart labels: ISO timestamps formatted to "MMM D" before render
//    3. Dataset `label` fields added (fixes "undefined" in legend)
//    4. Chart options block added (responsive, axes, tooltip)
// ─────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";

import {
    SpinnerProps,
    EndpointBadgeProps,
    CardProps,
    CardHeaderProps,
    KPI,

    ForecastChartProps,
    DemandChartProps,
    SegmentListProps,
    DriversListProps,
    SourceDonutProps,
} from "../../types/analytics.types";

import {
    STAGE_CHIP,
    PRIORITY_BORDER,
    PRIORITY_TAG,
    SOURCE_COLORS,
} from "../../constants/analytics.constants";

import { fmt$, fmtK } from "../../utils/analytics.format";

declare global {
    interface Window {
        Chart: any;
    }
}

// ─────────────────────────────────────────────────────────
// Date label helper
// Converts ISO string OR plain label to a short display label.
// "2026-05-21T14:32:33.307Z"  →  "May 21"
// "May 1" (already plain)      →  "May 1"   (unchanged)
// ─────────────────────────────────────────────────────────

function formatLabel(raw: string): string {
    // If it looks like an ISO date, parse and format it
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
        const date = new Date(raw);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    }
    return raw; // already human-readable
}

// ══════════════════════════════════════════════════════════
// SPINNER
// ══════════════════════════════════════════════════════════

export function Spinner({ text = "Loading…" }: SpinnerProps) {
    return (
        <div className="flex items-center justify-center h-32 gap-2 text-gray-400 text-xs">
            <span className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-blue-600 animate-spin" />
            {text}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// ENDPOINT BADGE
// ══════════════════════════════════════════════════════════

export function EndpointBadge({ label }: EndpointBadgeProps) {
    return (
        <span className="text-[10.5px] font-mono bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded">
            {label}
        </span>
    );
}

// ══════════════════════════════════════════════════════════
// CARD
// ══════════════════════════════════════════════════════════

export function Card({ children, className = "" }: CardProps) {
    return (
        <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>
            {children}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// CARD HEADER
// ══════════════════════════════════════════════════════════

interface CardHeaderWithDemoProps extends CardHeaderProps {
    isDemo?: boolean;
}

export function CardHeader({ title, sub, badge, isDemo }: CardHeaderWithDemoProps) {
    return (
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
                <p className="text-[13.5px] font-bold text-gray-900">{title}</p>
                {isDemo && (
                    <span className="text-[10px] px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-100">
                        Demo Data
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2">
                {sub && (
                    <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>
                )}
                {badge && <EndpointBadge label={badge} />}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// KPI ROW
// FIX: fmt functions now return string (React-renderable).
//      Previously (v: number) => v returned a raw number which
//      can cause type errors and silent render failures.
// ══════════════════════════════════════════════════════════

const KPI_CONFIGS: {
    key: keyof KPI;
    label: string;
    fmt: (v: number) => string;
    iconCls: string;
    icon: string;
}[] = [
        {
            key: "totalRevenue",
            label: "Total Revenue",
            fmt: fmt$,
            iconCls: "bg-blue-50 text-blue-600",
            icon: "fa-dollar-sign",
        },
        {
            key: "activeDeals",
            label: "Active Deals",
            fmt: (v) => String(v),           // ← was (v) => v (number, not string)
            iconCls: "bg-green-50 text-green-600",
            icon: "fa-handshake",
        },
        {
            key: "highProbDeals",
            label: "High-prob Deals",
            fmt: (v) => String(v),           // ← same fix
            iconCls: "bg-amber-50 text-amber-500",
            icon: "fa-trophy",
        },
        {
            key: "avgScore",
            label: "Avg Conv. Score",
            fmt: (v) => `${v}%`,
            iconCls: "bg-purple-50 text-purple-600",
            icon: "fa-bullseye",
        },
        {
            key: "forecastPeak",
            label: "90-day Peak Rev.",
            fmt: fmtK,
            iconCls: "bg-sky-50 text-sky-500",
            icon: "fa-chart-line",
        },
    ];

export function KpiRow({ kpi }: { kpi: KPI | null }) {
    if (!kpi) return <Spinner text="Loading KPIs…" />;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
            {KPI_CONFIGS.map((cfg) => (
                <Card key={cfg.key}>
                    <div className="flex items-start gap-2.5">
                        <div className={`w-7 h-7 rounded flex items-center justify-center ${cfg.iconCls}`}>
                            <i className={`fa-solid ${cfg.icon} text-xs`} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10.5px] text-gray-400 uppercase tracking-wide">{cfg.label}</p>
                            <p className="text-lg font-bold text-gray-900 mt-0.5 truncate">{cfg.fmt(kpi[cfg.key])}</p>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// FORECAST CHART
// FIX 1: labels run through formatLabel() → no more raw ISO strings
// FIX 2: dataset `label` fields added → no more "undefined" in legend
// FIX 3: options block added (responsive, axes, tooltip)
// ══════════════════════════════════════════════════════════

export function ForecastChart({ data }: ForecastChartProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (!data || !canvasRef.current) return;

        chartRef.current?.destroy();

        // ← FIX: format ISO timestamps to "May 21" etc.
        const labels = data.datapoints.map((d) => formatLabel(d.label));
        const forecast = data.datapoints.map((d) => d.forecast);
        const upper = data.datapoints.map((d) => d.upper);
        const lower = data.datapoints.map((d) => d.lower);

        chartRef.current = new window.Chart(canvasRef.current, {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: "Upper bound",              // ← FIX: was missing
                        data: upper,
                        borderColor: "transparent",
                        backgroundColor: "rgba(26,79,196,0.10)",
                        fill: "+1",
                        tension: 0.4,
                        pointRadius: 0,
                    },
                    {
                        label: "Forecast",                 // ← FIX: was missing
                        data: forecast,
                        borderColor: "#1a4fc4",
                        backgroundColor: "transparent",
                        borderWidth: 2.5,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: "#1a4fc4",
                        pointBorderColor: "#fff",
                        pointBorderWidth: 2,
                    },
                    {
                        label: "Lower bound",              // ← FIX: was missing
                        data: lower,
                        borderColor: "transparent",
                        backgroundColor: "rgba(26,79,196,0.10)",
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },            // hide legend (we use custom HTML legend)
                    tooltip: {
                        mode: "index",
                        intersect: false,
                        callbacks: {
                            label: (ctx: any) =>
                                ` $${ctx.parsed.y.toLocaleString()}`,
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 10 },
                            color: "#adb5bd",
                            maxRotation: 0,
                        },
                    },
                    y: {
                        grid: { color: "rgba(0,0,0,0.04)" },
                        ticks: {
                            font: { size: 10 },
                            color: "#adb5bd",
                            callback: (v: number) => `$${(v / 1000).toFixed(0)}k`,
                        },
                    },
                },
            },
        });

        return () => chartRef.current?.destroy();
    }, [data]);

    if (!data) {
        return <Spinner text="Fetching forecast…" />;
    }

    return (
        <>
            <div className="relative h-48">
                <canvas ref={canvasRef} aria-label="90-day revenue forecast" />
            </div>
            <div className="flex gap-4 mt-2.5 text-[11.5px] text-gray-500">
                <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-0.5 bg-blue-600 rounded" />
                    Forecast
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-2.5 bg-blue-100 rounded" />
                    Confidence band
                </span>
            </div>
        </>
    );
}

// ══════════════════════════════════════════════════════════
// DEMAND CHART
// FIX 1: labels run through formatLabel()
// FIX 2: dataset `label` fields added
// FIX 3: options block added
// ══════════════════════════════════════════════════════════

export function DemandChart({ data }: DemandChartProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (!data || !canvasRef.current) return;

        chartRef.current?.destroy();

        // ← FIX: format any ISO month labels
        const labels = data.months.map(formatLabel);

        chartRef.current = new window.Chart(canvasRef.current, {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: "Demand",                   // ← FIX: was missing
                        data: data.demand,
                        borderColor: "#1a4fc4",
                        backgroundColor: "rgba(26,79,196,0.05)",
                        borderWidth: 2.5,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: "#1a4fc4",
                        pointBorderColor: "#fff",
                        pointBorderWidth: 2,
                    },
                    {
                        label: "Inventory",                // ← FIX: was missing
                        data: data.inventory,
                        borderColor: "#1e9e5a",
                        backgroundColor: "rgba(30,158,90,0.05)",
                        borderWidth: 2.5,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: "#1e9e5a",
                        pointBorderColor: "#fff",
                        pointBorderWidth: 2,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: "bottom" as const,
                        labels: {
                            font: { size: 11 },
                            color: "#6b7280",
                            boxWidth: 10,
                            boxHeight: 10,
                        },
                    },
                    tooltip: {
                        mode: "index",
                        intersect: false,
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 }, color: "#adb5bd" },
                    },
                    y: {
                        grid: { color: "rgba(0,0,0,0.04)" },
                        ticks: { font: { size: 10 }, color: "#adb5bd" },
                    },
                },
            },
        });

        return () => chartRef.current?.destroy();
    }, [data]);

    if (!data) {
        return <Spinner text="Fetching demand trends…" />;
    }

    return (
        <div className="relative h-48">
            <canvas ref={canvasRef} aria-label="Demand and inventory trends" />
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// SEGMENT LIST
// ══════════════════════════════════════════════════════════

export function SegmentList({ data }: SegmentListProps) {
    if (!data) {
        return <Spinner text="Loading segments…" />;
    }

    return (
        <div className="space-y-3.5 text-[12.5px]">
            {data.map((seg) => (
                <div
                    key={seg.name}
                    className="flex items-center justify-between text-xs"
                >
                    <div className="flex items-center gap-2">
                        <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: seg.color }}
                        />
                        <span className="font-medium text-gray-700">
                            {seg.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 w-1/2 justify-end">
                        <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="h-1.5 rounded-full"
                                style={{
                                    width: `${seg.share * 100}%`,
                                    backgroundColor: seg.color,
                                }}
                            />
                        </div>
                        <span className="w-8 text-right font-bold text-gray-900">
                            {(seg.share * 100).toFixed(0)}%
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// DRIVERS LIST
// ══════════════════════════════════════════════════════════

export function DriversList({ data }: DriversListProps) {
    if (!data) {
        return <Spinner text="Loading drivers…" />;
    }

    return (
        <div className="space-y-3 text-[12.5px]">
            {data.channels.map((drv, index) => (
                <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <div>
                        <p className="font-semibold text-gray-800 text-[13px]">
                            {drv.name}
                        </p>
                        <p className="text-[11px] text-gray-400">
                            Marketing: {fmt$(drv.marketing)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-gray-900 text-[14px]">
                            {fmt$(drv.revenue)}
                        </p>
                        <p className="text-[11px] text-red-500">
                            Expenses: {fmt$(drv.expenses)}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// SOURCE DONUT
// FIX: dataset `label` added; legend now shows channel names
// ══════════════════════════════════════════════════════════

export function SourceDonut({ data }: SourceDonutProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (!data || !canvasRef.current) return;

        chartRef.current?.destroy();

        const labels = data.channels.map((drv) => drv.name);
        const impacts = data.channels.map((drv) => drv.revenue);

        chartRef.current = new window.Chart(canvasRef.current, {
            type: "doughnut",
            data: {
                labels,
                datasets: [
                    {
                        label: "Revenue by source",        // ← FIX: was missing
                        data: impacts,
                        backgroundColor: SOURCE_COLORS,
                        borderWidth: 1.5,
                        borderColor: "#fff",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "right" as const,
                        labels: {
                            font: { size: 11 },
                            color: "#6b7280",
                            boxWidth: 10,
                            boxHeight: 10,
                            padding: 12,
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx: any) =>
                                ` $${ctx.parsed.toLocaleString()}`,
                        },
                    },
                },
                cutout: "70%",
            },
        });

        return () => chartRef.current?.destroy();
    }, [data]);

    if (!data) {
        return <Spinner text="Loading source data…" />;
    }

    return (
        <div className="relative h-44 flex items-center justify-center">
            <canvas ref={canvasRef} />
        </div>
    );
}