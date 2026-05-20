import { useEffect, useRef } from "react";

import {
    SpinnerProps,
    EndpointBadgeProps,
    CardProps,
    CardHeaderProps,
    KPI,
    KpiRowProps,
    ForecastChartProps,
    DemandChartProps,
    SegmentListProps,
    DriversListProps,
    ConversionTableProps,
    RecommendationsGridProps,
    SourceDonutProps,
} from "../../types/analytics.types";

import {
    STAGE_CHIP,
    PRIORITY_BORDER,
    PRIORITY_TAG,
    SOURCE_COLORS,
} from "../../constants/analytics.constants";

import { fmt$, fmtK } from "../../utils/analytics.format";

import type {
    Forecast,
    Demand,
    Segment,
    Conversion,
    Driver,
    Recommendation,
} from "../../lib/api/analyticsApi";

// keep your components EXACTLY same below
// only imports moved out

declare global {
    interface Window {
        Chart: any;
    }
}

export function Spinner({ text = "Loading…" }: SpinnerProps) {
    return (
        <div className="flex items-center justify-center h-32 gap-2 text-gray-400 text-xs">
            <span className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-blue-600 animate-spin" />
            {text}
        </div>
    );
}

export function EndpointBadge({ label }: EndpointBadgeProps) {
    return (
        <span className="text-[10.5px] font-mono bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded">
            {label}
        </span>
    );
}

export function Card({ children, className = "" }: CardProps) {
    return (
        <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>
            {children}
        </div>
    );
}

export function CardHeader({ title, sub, badge }: CardHeaderProps) {
    return (
        <div className="flex items-start justify-between mb-4">
            <div>
                <p className="text-[13.5px] font-bold text-gray-900">{title}</p>
                {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
            </div>
            {badge && <EndpointBadge label={badge} />}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// KPI ROW
// ══════════════════════════════════════════════════════════

const KPI_CONFIGS = [
    {
        key: "totalRevenue",
        label: "Total Revenue",
        fmt: fmt$,
        iconCls: "bg-blue-50 text-blue-600",
        icon: "fa-dollar-sign",
        delta: "↑ 12.5%",
        deltaSub: "vs Apr 1 – Apr 30",
    },
    {
        key: "activeDeals",
        label: "Active Deals",
        fmt: (v: number) => v,
        iconCls: "bg-green-50 text-green-600",
        icon: "fa-handshake",
        delta: "↑ 8.3%",
        deltaSub: "vs Apr 1 – Apr 30",
    },
    {
        key: "highProbDeals",
        label: "High-prob Deals",
        fmt: (v: number) => v,
        iconCls: "bg-amber-50 text-amber-500",
        icon: "fa-trophy",
        delta: "↑ 20.0%",
        deltaSub: "score ≥ 75%",
    },
    {
        key: "avgScore",
        label: "Avg Conv. Score",
        fmt: (v: number) => v + "%",
        iconCls: "bg-purple-50 text-purple-600",
        icon: "fa-bullseye",
        delta: "↑ 3.6%",
        deltaSub: "vs Apr 1 – Apr 30",
    },
    {
        key: "forecastPeak",
        label: "90-day Peak Rev.",
        fmt: fmtK,
        iconCls: "bg-sky-50 text-sky-500",
        icon: "fa-chart-line",
        delta: "↑ 10.2%",
        deltaSub: "forecast ceiling",
    },
];

export function KpiRow({ kpi }: KpiRowProps) {
    if (!kpi) {
        return <Spinner text="Loading metrics…" />;
    }

    return (
        <div className="grid grid-cols-5 gap-3 mb-4">
            {KPI_CONFIGS.map(
                ({
                    key,
                    label,
                    fmt,
                    iconCls,
                    icon,
                    delta,
                    deltaSub,
                }) => (
                    <div
                        key={key}
                        className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-start gap-3"
                    >
                        <div
                            className={`w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0 text-base ${iconCls}`}
                        >
                            <i className={`fa-solid ${icon}`} />
                        </div>

                        <div>
                            <p className="text-[11px] text-gray-500 mb-1">
                                {label}
                            </p>

                            <p className="text-xl font-bold text-gray-900 leading-none">
                                {fmt(
                                    kpi[key as keyof KPI] as number
                                )}
                            </p>

                            <p className="text-[11px] text-gray-400 mt-1.5">
                                {deltaSub}&nbsp;
                                <span className="text-green-600 font-semibold">
                                    {delta}
                                </span>
                            </p>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// FORECAST CHART
// ══════════════════════════════════════════════════════════

export function ForecastChart({
    data,
}: ForecastChartProps) {
    const canvasRef =
        useRef<HTMLCanvasElement | null>(null);

    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (!data || !canvasRef.current) return;

        chartRef.current?.destroy();

        const labels = data.datapoints.map(
            (d) => d.label
        );

        const forecast = data.datapoints.map(
            (d) => d.forecast
        );

        const upper = data.datapoints.map(
            (d) => d.upper
        );

        const lower = data.datapoints.map(
            (d) => d.lower
        );

        chartRef.current = new window.Chart(
            canvasRef.current,
            {
                type: "line",
                data: {
                    labels,
                    datasets: [
                        {
                            label: "Upper",
                            data: upper,
                            borderColor: "transparent",
                            backgroundColor:
                                "rgba(26,79,196,0.10)",
                            fill: "+1",
                            tension: 0.4,
                            pointRadius: 0,
                        },
                        {
                            label: "Forecast",
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
                            label: "Lower",
                            data: lower,
                            borderColor: "transparent",
                            backgroundColor:
                                "rgba(26,79,196,0.10)",
                            fill: false,
                            tension: 0.4,
                            pointRadius: 0,
                        },
                    ],
                },
            }
        );

        return () => chartRef.current?.destroy();
    }, [data]);

    if (!data) {
        return <Spinner text="Fetching forecast…" />;
    }

    return (
        <>
            <div className="relative h-48">
                <canvas
                    ref={canvasRef}
                    aria-label="90-day revenue forecast"
                />
            </div>
        </>
    );
}

// ══════════════════════════════════════════════════════════
// DEMAND CHART
// ══════════════════════════════════════════════════════════

export function DemandChart({ data }: DemandChartProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (!data || !canvasRef.current) return;

        chartRef.current?.destroy();

        chartRef.current = new window.Chart(
            canvasRef.current,
            {
                type: "line",
                data: {
                    labels: data.months,
                    datasets: [
                        {
                            label: "Demand",
                            data: data.demand,
                            borderColor: "#1a4fc4",
                            backgroundColor: "rgba(26, 79, 196, 0.05)",
                            borderWidth: 2.5,
                            tension: 0.4,
                            pointRadius: 4,
                            pointBackgroundColor: "#1a4fc4",
                            pointBorderColor: "#fff",
                            pointBorderWidth: 2,
                        },
                        {
                            label: "Inventory",
                            data: data.inventory,
                            borderColor: "#1e9e5a",
                            backgroundColor: "rgba(30, 158, 90, 0.05)",
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
                    scales: {
                        y: {
                            beginAtZero: true,
                        },
                    },
                },
            }
        );

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
                <div key={seg.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="font-medium text-gray-700">{seg.name}</span>
                    </div>
                    <div className="flex items-center gap-3 w-1/2 justify-end">
                        <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-1.5 rounded-full" style={{ width: `${seg.share * 100}%`, backgroundColor: seg.color }} />
                        </div>
                        <span className="w-8 text-right font-bold text-gray-900">{(seg.share * 100).toFixed(0)}%</span>
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
            {data.map((drv) => (
                <div key={drv.name} className="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
                            <i className={`fa-solid fa-${drv.icon}`} />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 text-[13px]">{drv.name}</p>
                            <p className="text-[11px] text-gray-400">{drv.roi}x ROI</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-gray-900 text-[14px]">{fmt$(drv.impact)}</p>
                        <p className="text-[11px] text-green-600 font-medium">Impact</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// CONVERSION TABLE
// ══════════════════════════════════════════════════════════

export function ConversionTable({ data }: ConversionTableProps) {
    if (!data) {
        return <Spinner text="Loading conversion scores…" />;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12.5px]">
                <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider text-[10.5px]">
                        <th className="py-2.5 px-3">Deal & Company</th>
                        <th className="py-2.5 px-3">Stage</th>
                        <th className="py-2.5 px-3 text-right">Value</th>
                        <th className="py-2.5 px-3 text-right">AI Score</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {data.map((c, i) => (
                        <tr key={i} className="hover:bg-gray-50/55 transition-colors">
                            <td className="py-3 px-3">
                                <p className="font-semibold text-gray-900">{c.deal}</p>
                                <p className="text-[11px] text-gray-400">{c.company}</p>
                            </td>
                            <td className="py-3 px-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${STAGE_CHIP[c.stage] || "bg-gray-100 text-gray-600"}`}>
                                    {c.stage}
                                </span>
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-gray-900">
                                {fmt$(c.value)}
                            </td>
                            <td className="py-3 px-3">
                                <div className="flex items-center justify-end gap-2">
                                    <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                        <div className={`h-1.5 rounded-full ${c.score >= 0.75 ? "bg-green-500" : c.score >= 0.5 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${c.score * 100}%` }} />
                                    </div>
                                    <span className="font-bold text-gray-900 w-8 text-right">{(c.score * 100).toFixed(0)}%</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// RECOMMENDATIONS GRID
// ══════════════════════════════════════════════════════════

export function RecommendationsGrid({ data }: RecommendationsGridProps) {
    if (!data) {
        return <Spinner text="Loading recommendations…" />;
    }

    return (
        <div className="grid grid-cols-3 gap-3.5">
            {data.map((rec, i) => {
                const tag = PRIORITY_TAG[rec.priority] || { cls: "bg-gray-100 text-gray-600", label: "Normal" };
                return (
                    <div key={i} className={`bg-white border border-gray-200 border-l-4 ${PRIORITY_BORDER[rec.priority] || "border-l-gray-300"} rounded-r-xl p-4 flex flex-col justify-between h-full hover:shadow-sm transition-shadow`}>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{rec.icon}</span>
                                <h4 className="font-bold text-gray-900 text-[13px]">{rec.title}</h4>
                            </div>
                            <p className="text-[11.5px] text-gray-500 leading-relaxed mb-4">{rec.body}</p>
                        </div>
                        <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${tag.cls}`}>
                                {tag.label}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// SOURCE DONUT
// ══════════════════════════════════════════════════════════

export function SourceDonut({ data }: SourceDonutProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (!data || !canvasRef.current) return;

        chartRef.current?.destroy();

        const labels = data.map((drv) => drv.name);
        const impacts = data.map((drv) => drv.impact);

        chartRef.current = new window.Chart(
            canvasRef.current,
            {
                type: "doughnut",
                data: {
                    labels,
                    datasets: [
                        {
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
                            position: "right",
                            labels: {
                                boxWidth: 12,
                                font: {
                                    size: 11,
                                },
                            },
                        },
                    },
                    cutout: "70%",
                },
            }
        );

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