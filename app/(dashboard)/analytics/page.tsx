"use client";

// ─────────────────────────────────────────────────────────
// AnalyticsPage.tsx
// Clean TypeScript version (NO SIDEBAR)
// ─────────────────────────────────────────────────────────

import { useState } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";

import {
    ForecastChart,
    DemandChart,
    SegmentList,
    DriversList,
    SourceDonut,
    Card,
    CardHeader,
    EndpointBadge,
    Spinner,
    KpiRow,
} from "@/components/analytics/AnalyticsComponents";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface TopbarProps {
    activeTab: string;
    onTab: (tab: string) => void;
    onRefetch: () => void;
    dateRange: "7D" | "30D" | "90D" | "1Y";
    setDateRange: (range: "7D" | "30D" | "90D" | "1Y") => void;
    onExport: () => void;
}

// ─────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────

const TABS: string[] = [
    "Revenue Forecast",
    "Demand Trends",
    "Segments",
    "Drivers",
];

// ─────────────────────────────────────────────────────────
// Topbar
// ─────────────────────────────────────────────────────────

function Topbar({ activeTab, onTab, onRefetch, dateRange, setDateRange, onExport }: TopbarProps) {
    const [showDateRange, setShowDateRange] = useState(false);
    return (
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 pt-4">

            {/* Header */}
            <div className="flex items-start justify-between mb-3.5 flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        Dashboard
                    </h1>

                    <p className="text-xs text-gray-500 mt-0.5">
                        Overview & Insights
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                        <button
                            onClick={() => setShowDateRange(!showDateRange)}
                            className="flex items-center gap-1.5 border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                            {dateRange}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {showDateRange && (
                            <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                                {["7D", "30D", "90D", "1Y"].map(range => (
                                    <button
                                        key={range}
                                        onClick={() => {
                                            setDateRange(range as any);
                                            setShowDateRange(false);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${dateRange === range ? "text-blue-600 font-semibold" : "text-gray-700"}`}
                                    >
                                        {range}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onExport}
                        className="flex items-center gap-1.5 border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                        Export
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="overflow-x-auto">
                <div className="flex">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => onTab(tab)}
                            className={`px-4 py-2 text-[13px] border-b-2 mb-[-1px] transition-colors whitespace-nowrap ${activeTab === tab
                                ? "border-blue-600 text-blue-600 font-semibold"
                                : "border-transparent text-gray-500 hover:text-gray-800"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Export helper
// ─────────────────────────────────────────────────────────

function exportCSV(filename: string, headers: string[], rows: string[][]) {
    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ─────────────────────────────────────────────────────────
// Main Page (NO SIDEBAR)
// ─────────────────────────────────────────────────────────

export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState("Revenue Forecast");

    const {
        loading,
        error,
        kpi,
        forecast,
        isForecastDemo,
        demand,
        isDemandDemo,
        segments,
        isSegmentsDemo,
        drivers,
        isDriversDemo,
        dateRange,
        setDateRange,
        refetch,
    } = useAnalytics();

    const handleExport = () => {
        const timestamp = new Date().toISOString().split('T')[0];
        let filename = `analytics-${activeTab.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.csv`;

        if (activeTab === "Revenue Forecast" && forecast) {
            exportCSV(
                filename,
                ["Date", "Forecast", "Upper Bound", "Lower Bound", "Data Source"],
                forecast.datapoints.map(d => [
                    d.label,
                    d.forecast.toString(),
                    d.upper.toString(),
                    d.lower.toString(),
                    isForecastDemo ? "Demo" : "Real"
                ])
            );
        } else if (activeTab === "Demand Trends" && demand) {
            exportCSV(
                filename,
                ["Month", "Demand", "Inventory", "Data Source"],
                demand.months.map((month, i) => [
                    month,
                    demand.demand[i]?.toString() || "",
                    demand.inventory[i]?.toString() || "",
                    isDemandDemo ? "Demo" : "Real"
                ])
            );
        } else if (activeTab === "Segments" && segments) {
            exportCSV(
                filename,
                ["Segment Name", "Share", "Color", "Data Source"],
                segments.map(s => [
                    s.name,
                    (s.share * 100).toFixed(0) + "%",
                    s.color,
                    isSegmentsDemo ? "Demo" : "Real"
                ])
            );
        } else if (activeTab === "Drivers" && drivers) {
            exportCSV(
                filename,
                ["Channel", "Revenue", "Marketing", "Expenses", "Data Source"],
                drivers.channels.map(c => [
                    c.name,
                    c.revenue.toString(),
                    c.marketing.toString(),
                    c.expenses.toString(),
                    isDriversDemo ? "Demo" : "Real"
                ])
            );
        }
    };

    return (
        <div className="h-screen overflow-hidden font-sans bg-gray-50 text-gray-900 text-[13px]">

            {/* TOPBAR */}
            <Topbar
                activeTab={activeTab}
                onTab={setActiveTab}
                onRefetch={refetch}
                dateRange={dateRange}
                setDateRange={setDateRange}
                onExport={handleExport}
            />

            {/* CONTENT */}
            <main className="h-full overflow-y-auto px-4 sm:px-6 py-5 pb-10">

                {/* ERROR */}
                {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md px-3.5 py-2.5 text-xs text-red-700 mb-4">
                        <i className="fa-solid fa-circle-exclamation" />
                        {error} — showing fallback data.
                    </div>
                )}

                {/* KPI */}
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                    Key Metrics
                </p>
                {kpi ? <KpiRow kpi={kpi} /> : <Spinner />}

                {/* CHARTS BASED ON ACTIVE TAB */}
                <div className="mt-6">
                    {loading && <Spinner text="Loading analytics..." />}
                    {!loading && activeTab === "Revenue Forecast" && forecast && (
                        <Card>
                            <CardHeader title="Revenue Forecast" isDemo={isForecastDemo} />
                            <ForecastChart data={forecast} />
                        </Card>
                    )}

                    {!loading && activeTab === "Demand Trends" && demand && (
                        <Card>
                            <CardHeader title="Demand Trends" isDemo={isDemandDemo} />
                            <DemandChart data={demand} />
                        </Card>
                    )}

                    {!loading && activeTab === "Segments" && segments && (
                        <Card>
                            <CardHeader title="Segments" isDemo={isSegmentsDemo} />
                            <SegmentList data={segments} />
                        </Card>
                    )}

                    {!loading && activeTab === "Drivers" && drivers && (
                        <div className="space-y-4">
                            <Card>
                                <CardHeader title="Drivers" isDemo={isDriversDemo} />
                                <DriversList data={drivers} />
                            </Card>
                            <Card>
                                <CardHeader title="Revenue Sources" isDemo={isDriversDemo} />
                                <SourceDonut data={drivers} />
                            </Card>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}
