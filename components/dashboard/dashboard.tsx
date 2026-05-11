"use client";

import { AppShell } from "../Shell";
import { useAuth } from "../../context/AuthContext"; // ❌ removed useAuthorizedClient
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadPanel } from "../UploadPanel";
import {
    UploadAnalysisSection,
    type UploadAnalysisData,
} from "../UploadAnalysisSection";
import { DataSenseReport } from "../DataSenseReport";
import api from "@/lib/api"; // ✅ NEW

interface CEOOverview {
    revenueForecast: {
        stats: { trend: string };
    };
    riskIndicators: {
        demandTrend: string;
        marginPct: number;
    };
    kpis: {
        totalRevenue: number;
        marketingRoi: number | null;
    };
}

interface Recommendation {
    title: string;
    description: string;
    confidence: number;
    financialImpact: number;
    justification: string;
}

export default function Dashboard() {
    const { user } = useAuth();
    const router = useRouter();

    const [ceoData, setCeoData] = useState<CEOOverview | null>(null);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [uploadAnalysis, setUploadAnalysis] =
        useState<UploadAnalysisData | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // prevents double API call (Strict Mode safe)
    const hasFetched = useRef(false);

    // Auth guard
    useEffect(() => {
        if (!user) router.replace("/login");
    }, [user, router]);

    //  Fetch data
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        async function load() {
            try {
                setLoading(true);

                // ✅ using api instead of client
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
    }, []);

    if (!user) return null;

    // ⏳ Loading state
    if (loading) {
        return <div className="p-6">Loading dashboard...</div>;
    }

    //  Error state
    if (error) {
        return <div className="p-6 text-red-500">{error}</div>;
    }

    // 📊 Safe values
    const revenue = ceoData?.kpis?.totalRevenue ?? 0;
    const marginPct = ceoData?.riskIndicators?.marginPct ?? 0;
    const demandTrend = ceoData?.riskIndicators?.demandTrend ?? "flat";

    const marginClass =
        marginPct >= 0.3 ? "metric-positive" : "metric-negative";

    const getTrendText = (trend?: string) => {
        if (trend === "upward") return "Upward trajectory in next 90 days";
        if (trend === "downward") return "Forecasted softening trend";
        return "Stable near-term outlook";
    };

    return (
        <AppShell>
            {/* HEADER */}
            <div className="topbar">
                <div>
                    <div className="topbar-title">Executive overview</div>
                    <div className="topbar-subtitle">
                        Unified signal across systems.
                    </div>
                </div>
            </div>

            {/* CARDS */}
            <div className="cards-grid">
                <div className="card">
                    <div className="card-title">Revenue run-rate</div>
                    <div className="card-metric">
                        ${Math.round(revenue / 1000)}k
                    </div>
                    <div className="card-trend metric-positive">
                        {getTrendText(ceoData?.revenueForecast?.stats?.trend)}
                    </div>
                </div>

                <div className="card">
                    <div className="card-title">Gross margin</div>
                    <div className={`card-metric ${marginClass}`}>
                        {Math.round(marginPct * 100)}%
                    </div>
                </div>

                <div className="card">
                    <div className="card-title">Demand signal</div>
                    <div className="card-metric">
                        {demandTrend === "increasing"
                            ? "↑ Strengthening"
                            : demandTrend === "decreasing"
                                ? "↓ Softening"
                                : "→ Stable"}
                    </div>
                </div>
            </div>

            {/* RECOMMENDATIONS */}
            <div className="recommendations-panel">
                {recommendations.length === 0 ? (
                    <div className="text-sm text-gray-400">
                        No recommendations yet.
                    </div>
                ) : (
                    recommendations.map((rec) => (
                        <div key={rec.title} className="recommendation-item">
                            <div className="font-semibold">{rec.title}</div>
                            <div>{rec.description}</div>
                            <div className="text-sm text-gray-400">
                                Confidence: {Math.round(rec.confidence * 100)}%
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* UPLOAD */}
            <UploadPanel onAnalysis={setUploadAnalysis} />

            {uploadAnalysis && (
                <UploadAnalysisSection analysis={uploadAnalysis} />
            )}

            {uploadAnalysis?.dataSenseReport && (
                <DataSenseReport report={uploadAnalysis.dataSenseReport} />
            )}
        </AppShell>
    );
}