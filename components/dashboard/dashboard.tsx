"use client";

import { useEffect } from "react";
import { Search, Bell, Plus } from "lucide-react";

// Sub-components
import { CEOOverviewSection } from "./compoents/CEOOverviewSection";
import { CFOOverviewSection } from "./compoents/CFOOverviewSection";
import { RecommendationsSection } from "./compoents/RecommendationsSection";
import { DataIngestionSection } from "./compoents/DataIngestionSection";
import { useAuth } from "../../context/AuthContext";

export default function Dashboard() {
    const { user, token, isInitializing } = useAuth();

    if (isInitializing || !user || !token) {
        return <div className="min-h-screen bg-[#f5f7fb]" />;
    }

    return (
        <div>

            {/* ── Dashboard Sections ── */}
            <div className="space-y-8">
                {user.role === "CFO" ? (
                    <CFOOverviewSection token={token!} />
                ) : (
                    <CEOOverviewSection token={token!} />
                )}

                <div className="flex flex-col gap-8">
                    <div className="">
                        <RecommendationsSection token={token!} />
                    </div>
                </div>
            </div>
        </div>
    );
}