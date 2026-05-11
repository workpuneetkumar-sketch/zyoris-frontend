"use client";

import { AppShell } from "../Shell";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadPanel } from "../UploadPanel";
import {
    UploadAnalysisSection,
    type UploadAnalysisData,
} from "../UploadAnalysisSection";
import { DataSenseReport } from "../DataSenseReport";
import api from "@/lib/api";
import {
    Search,
    Bell,
    Plus,
    TrendingUp,
    TrendingDown,
    Minus,
    DollarSign,
    BarChart2,
    Activity,
    ChevronRight,
} from "lucide-react";

interface CEOOverview {
    revenueForecast: { stats: { trend: string } };
    riskIndicators: { demandTrend: string; marginPct: number };
    kpis: { totalRevenue: number; marketingRoi: number | null };
}

interface Recommendation {
    title: string;
    description: string;
    confidence: number;
    financialImpact: number;
    justification: string;
}

export default function Dashboard() {
    const { user, token, isLoading } = useAuth();
    const router = useRouter();

    const [ceoData, setCeoData] = useState<CEOOverview | null>(null);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [uploadAnalysis, setUploadAnalysis] = useState<UploadAnalysisData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    // ── FIX 1: Merged the two broken useEffects into one clean redirect guard ──
    useEffect(() => {
        if (isLoading) return;
        if (!user || !token) router.replace("/login");
    }, [user, token, isLoading, router]);

    useEffect(() => {
        if (isLoading) return;
        if (!token) return;
        if (hasFetched.current) return;

        hasFetched.current = true;

        async function load() {
            try {
                setLoading(true);
                const [ceoRes, recRes, analysisRes] = await Promise.all([
                    api.get("/dashboard/ceo"),
                    api.get("/recommendations"),
                    api.get("/ingestion/last-analysis").catch(() => ({ data: null })),
                ]);
                setCeoData(ceoRes.data);
                setRecommendations(recRes.data);
                if (analysisRes?.data && typeof analysisRes.data === "object") {
                    setUploadAnalysis(analysisRes.data);
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load dashboard");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [token, isLoading]);

    // ── FIX 2: Single isLoading / user guard (removed the duplicate) ──
    if (isLoading) return null;
    if (!user) return null;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f5f7fb]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-[3px] border-blue-100 border-t-[#2f66f6] rounded-full animate-spin" />
                    <div className="text-center">
                        <p className="text-[16px] font-semibold text-[#0f172a]">
                            Loading dashboard
                        </p>
                        <p className="text-sm text-[#64748b] mt-1">
                            Please wait a moment...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="bg-red-50 border border-red-100 rounded-xl px-6 py-4 text-red-500 text-sm">
                    {error}
                </div>
            </div>
        );
    }

    const revenue = ceoData?.kpis?.totalRevenue ?? 0;
    const marginPct = ceoData?.riskIndicators?.marginPct ?? 0;
    const demandTrend = ceoData?.riskIndicators?.demandTrend ?? "flat";
    const forecastTrend = ceoData?.revenueForecast?.stats?.trend;

    const getTrendText = (trend?: string) => {
        if (trend === "upward") return "Upward trajectory in next 90 days";
        if (trend === "downward") return "Forecasted softening trend";
        return "Stable near-term outlook";
    };

    const getTrendBadge = (trend?: string) => {
        if (trend === "upward") return { label: "+trend", color: "text-emerald-600 bg-emerald-50", icon: TrendingUp };
        if (trend === "downward") return { label: "-trend", color: "text-red-500 bg-red-50", icon: TrendingDown };
        return { label: "stable", color: "text-blue-600 bg-blue-50", icon: Minus };
    };

    const getDemandBadge = (trend: string) => {
        if (trend === "increasing") return { label: "↑ Strengthening", color: "text-emerald-600 bg-emerald-50" };
        if (trend === "decreasing") return { label: "↓ Softening", color: "text-red-500 bg-red-50" };
        return { label: "→ Stable", color: "text-blue-600 bg-blue-50" };
    };

    const marginBadge = marginPct >= 0.3
        ? { label: `+${Math.round(marginPct * 100)}% vs target`, color: "text-emerald-600 bg-emerald-50" }
        : { label: `${Math.round(marginPct * 100)}% vs target`, color: "text-red-500 bg-red-50" };

    const trendBadge = getTrendBadge(forecastTrend);
    const TrendIcon = trendBadge.icon;
    const demandBadge = getDemandBadge(demandTrend);

    return (
        <AppShell>
            {/* ── Topbar ── */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">Dashboard</h1>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Welcome back, <span className="text-gray-600 font-medium">{user.name.split(" ")[0]}</span>! Here's what's happening.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 w-56 shadow-sm">
                        <Search size={14} className="text-gray-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search anything..."
                            className="bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none w-full"
                        />
                    </div>
                    <button className="relative p-2.5 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all">
                        <Bell size={17} />
                        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white" />
                    </button>
                    <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200">
                        <Plus size={15} />
                        New Project
                    </button>
                </div>
            </div>

            {/* ── Section header ── */}
            <div className="mb-5">
                <h2 className="text-base font-semibold text-gray-800">Executive overview</h2>
                <p className="text-sm text-gray-400 mt-0.5">Unified signal across systems.</p>
            </div>

            {/* ── Metric Cards ── */}
            <div className="grid grid-cols-3 gap-4 mb-8">

                {/* Revenue Run-Rate */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Revenue Run-Rate</p>
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <DollarSign size={16} className="text-blue-600" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-gray-900 tracking-tight">
                            ${Math.round(revenue / 1000)}k
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{getTrendText(forecastTrend)}</p>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg w-fit ${trendBadge.color}`}>
                        <TrendIcon size={12} />
                        {trendBadge.label}
                    </div>
                </div>

                {/* Gross Margin */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Gross Margin</p>
                        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                            <BarChart2 size={16} className="text-violet-600" />
                        </div>
                    </div>
                    <div>
                        <p className={`text-3xl font-bold tracking-tight ${marginPct >= 0.3 ? "text-emerald-600" : "text-red-500"}`}>
                            {Math.round(marginPct * 100)}%
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Current gross margin percentage</p>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg w-fit ${marginBadge.color}`}>
                        {marginBadge.label}
                    </div>
                </div>

                {/* Demand Signal */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Demand Signal</p>
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <Activity size={16} className="text-emerald-600" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-gray-900 tracking-tight">
                            {demandTrend === "increasing" ? "↑" : demandTrend === "decreasing" ? "↓" : "→"}{" "}
                            {demandTrend === "increasing" ? "Strong" : demandTrend === "decreasing" ? "Soft" : "Stable"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Current market demand trend</p>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg w-fit ${demandBadge.color}`}>
                        {demandBadge.label}
                    </div>
                </div>
            </div>

            {/* ── Recommendations ── */}
            <div className="mb-8">
                {recommendations.length === 0 ? (
                    <div className="bg-white border border-dashed border-gray-200 rounded-2xl px-6 py-5">
                        <p className="text-sm text-gray-400">No recommendations yet.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                            <h3 className="text-sm font-semibold text-gray-800">Recommendations</h3>
                            <button className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline">
                                View all <ChevronRight size={13} />
                            </button>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {recommendations.map((rec) => (
                                <div key={rec.title} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800">{rec.title}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{rec.description}</p>
                                        </div>
                                        <div className="shrink-0 flex flex-col items-end gap-1">
                                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                                                {Math.round(rec.confidence * 100)}% confident
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Upload ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                    <h3 className="text-sm font-semibold text-gray-800">Upload CSV / Excel Data</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Supports exports from your CRM, ERP, or finance systems.</p>
                </div>
                <div className="p-5">
                    <UploadPanel onAnalysis={setUploadAnalysis} />
                </div>
            </div>

            {uploadAnalysis && (
                <div className="mt-4">
                    <UploadAnalysisSection analysis={uploadAnalysis} />
                </div>
            )}

            {uploadAnalysis?.dataSenseReport && (
                <div className="mt-4">
                    <DataSenseReport report={uploadAnalysis.dataSenseReport} />
                </div>
            )}
        </AppShell>
    );
}