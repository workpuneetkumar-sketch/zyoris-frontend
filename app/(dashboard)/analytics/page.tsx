"use client";

// ─────────────────────────────────────────────────────────
// AnalyticsPage.tsx
// Clean TypeScript version (NO SIDEBAR)
// ─────────────────────────────────────────────────────────

import { useState } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";

import {
    KpiRow,
    ForecastChart,
    DemandChart,
    SegmentList,
    DriversList,
    ConversionTable,
    RecommendationsGrid,
    SourceDonut,
    Card,
    CardHeader,
    EndpointBadge,
    Spinner,
} from "../../../components/analytics/AnalyticsComponents";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface TopbarProps {
    activeTab: string;
    onTab: (tab: string) => void;
    onRefetch: () => void;
}

// ─────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────

const TABS: string[] = [
    "Overview",
    "Revenue",
    "Deals",
    "Conversions",
    "Segments",
    "Forecast",
    "Recommendations",
];

// ─────────────────────────────────────────────────────────
// Topbar
// ─────────────────────────────────────────────────────────

function Topbar({ activeTab, onTab, onRefetch }: TopbarProps) {
    return (
        <div className="bg-white border-b border-gray-200 px-6 pt-4">

            {/* Header */}
            <div className="flex items-start justify-between mb-3.5">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        Dashboard
                    </h1>

                    <p className="text-xs text-gray-500 mt-0.5">
                        Overview & Insights
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-700 bg-white hover:bg-gray-50">
                        Date Range
                    </button>

                    <button
                        onClick={onRefetch}
                        className="flex items-center gap-1.5 border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Export
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => onTab(tab)}
                        className={`px-4 py-2 text-[13px] border-b-2 mb-[-1px] transition-colors
                            ${activeTab === tab
                                ? "border-blue-600 text-blue-600 font-semibold"
                                : "border-transparent text-gray-500 hover:text-gray-800"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Main Page (NO SIDEBAR)
// ─────────────────────────────────────────────────────────

export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState("Overview");

    const {
        loading,
        error,
        kpi,
        forecast,
        demand,
        segments,
        drivers,
        conversion,
        recommendations,
        refetch,
    } = useAnalytics();

    return (
        <div className="h-screen overflow-hidden font-sans bg-gray-50 text-gray-900 text-[13px]">

            {/* TOPBAR */}
            <Topbar
                activeTab={activeTab}
                onTab={setActiveTab}
                onRefetch={refetch}
            />

            {/* CONTENT */}
            <main className="h-full overflow-y-auto px-6 py-5 pb-10">

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

                {loading ? (
                    <Spinner text="Loading metrics…" />
                ) : (
                    <KpiRow kpi={kpi} />
                )}

                {/* CHARTS */}
                <div className="grid grid-cols-[1.2fr_1fr] gap-3.5 mb-4">
                    <Card>
                        <CardHeader title="Revenue Forecast" />
                        <ForecastChart data={forecast} />
                    </Card>

                    <Card>
                        <CardHeader title="Demand Trends" />
                        <DemandChart data={demand} />
                    </Card>
                </div>

                {/* SEGMENTS + DRIVERS */}
                <div className="grid grid-cols-[1.2fr_1fr] gap-3.5 mb-4">
                    <Card>
                        <CardHeader title="Segments" />
                        <SegmentList data={segments} />
                    </Card>

                    <Card>
                        <CardHeader title="Drivers" />
                        <DriversList data={drivers} />
                    </Card>
                </div>

                {/* CONVERSION */}
                <Card className="mb-4">
                    <CardHeader title="Conversion Scores" />
                    <ConversionTable data={conversion} />
                </Card>

                {/* RECOMMENDATIONS */}
                <p className="text-[11px] font-semibold text-gray-400 uppercase mb-2">
                    Recommendations
                </p>

                <EndpointBadge label="GET /recommendations" />

                <div className="mt-3 mb-4">
                    <RecommendationsGrid data={recommendations} />
                </div>

                {/* SOURCE */}
                <Card>
                    <CardHeader title="Revenue Sources" />
                    <SourceDonut data={drivers} />
                </Card>

            </main>
        </div>
    );
}