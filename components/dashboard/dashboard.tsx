"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { AppShell } from "../Shell";
import { Search, Bell, Plus } from "lucide-react";

// Sub-components
import { CEOOverviewSection } from "./compoents/CEOOverviewSection";
import { CFOOverviewSection } from "./compoents/CFOOverviewSection";
import { RecommendationsSection } from "./compoents/RecommendationsSection";
import { DataIngestionSection } from "./compoents/DataIngestionSection";

export default function Dashboard() {
    const { user, token, isLoading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && (!user || !token)) {
            router.replace("/login");
        }
    }, [user, token, authLoading, router]);

    if (authLoading || !user) {
        return <div className="min-h-screen bg-[#f5f7fb]" />;
    }

    return (
        <div>
            {/* ── Topbar ── */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Welcome back, <span className="text-gray-600 font-medium">{user.name?.split(" ")[0]}</span>!
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 w-64 shadow-sm">
                        <Search size={14} className="text-gray-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search insights..."
                            className="bg-transparent text-sm text-gray-600 outline-none w-full"
                        />
                    </div>
                    <button className="relative p-2.5 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-700">
                        <Bell size={17} />
                        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white" />
                    </button>
                    <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm">
                        <Plus size={15} />
                        New Project
                    </button>
                </div>
            </div>

            {/* ── Dashboard Sections ── */}
            <div className="space-y-8">
                {user.role === "CFO" ? (
                    <CFOOverviewSection token={token!} />
                ) : (
                    <CEOOverviewSection token={token!} />
                )}

                <div className="flex flex-col gap-8">
                    <div className="">
                        <DataIngestionSection token={token!} />
                    </div>
                    <div className="">
                        <RecommendationsSection token={token!} />
                    </div>
                </div>
            </div>
        </div>
    );
}