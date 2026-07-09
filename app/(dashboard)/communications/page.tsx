"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
    getInbox, 
    getStats,
    CommunicationItem, 
    CommunicationType,
    CommunicationStats
} from "@/lib/api/communicationsApi";
import { 
    MessageSquareText, 
    Mail, 
    MessageCircle, 
    Phone, 
    Video, 
    Filter,
    AlertCircle,
    Inbox,
    Activity
} from "lucide-react";

type FilterTab = "All" | "Email" | "WhatsApp" | "Call" | "Meeting";

export default function CommunicationDashboard() {
    const { user } = useAuth();
    
    const [activeTab, setActiveTab] = useState<FilterTab>("All");
    const [items, setItems] = useState<CommunicationItem[]>([]);
    const [stats, setStats] = useState<CommunicationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch Stats (Live Widgets)
    useEffect(() => {
        let isMounted = true;
        const fetchStats = async () => {
            setLoadingStats(true);
            try {
                const data = await getStats();
                if (isMounted) setStats(data);
            } catch (err) {
                console.error("Failed to load stats", err);
            } finally {
                if (isMounted) setLoadingStats(false);
            }
        };
        fetchStats();
        return () => { isMounted = false; };
    }, []);

    // Fetch Feed
    useEffect(() => {
        let isMounted = true;
        const fetchFeed = async () => {
            setLoading(true);
            setError(null);
            try {
                const typeParam = activeTab === "All" ? undefined : activeTab.toLowerCase();
                const data = await getInbox(typeParam);
                if (isMounted) setItems(data);
            } catch (err) {
                if (isMounted) setError("Failed to load communications. Please try again.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchFeed();
        return () => { isMounted = false; };
    }, [activeTab]);

    const getGreeting = () => {
        const role = user?.role || "Team Member";
        return `Welcome, ${role} - Here is your Unified Inbox`;
    };

    const tabs: { label: FilterTab; icon: React.ElementType }[] = [
        { label: "All", icon: Inbox },
        { label: "Email", icon: Mail },
        { label: "WhatsApp", icon: MessageCircle },
        { label: "Call", icon: Phone },
        { label: "Meeting", icon: Video },
    ];

    const getIconForType = (type: CommunicationType) => {
        switch (type) {
            case "email": return <Mail size={16} className="text-blue-500" />;
            case "whatsapp": return <MessageCircle size={16} className="text-green-500" />;
            case "call": return <Phone size={16} className="text-indigo-500" />;
            case "meeting": return <Video size={16} className="text-purple-500" />;
            default: return <MessageSquareText size={16} className="text-gray-500" />;
        }
    };

    const formatTimestamp = (isoString: string) => {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }).format(date);
    };

    return (
        <div className="flex flex-col min-h-[calc(100vh-theme(spacing.16))] p-4 md:p-6 bg-gray-50/50">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
                            <MessageSquareText size={22} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Communication Hub</h1>
                    </div>
                    <p className="text-sm text-gray-500">{getGreeting()}</p>
                </div>
            </div>

            {/* Live Stats Widgets */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {[
                    { label: "Total", value: stats?.total, icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Emails", value: stats?.email, icon: Mail, color: "text-indigo-600", bg: "bg-indigo-50" },
                    { label: "WhatsApp", value: stats?.whatsapp, icon: MessageCircle, color: "text-green-600", bg: "bg-green-50" },
                    { label: "Calls", value: stats?.call, icon: Phone, color: "text-purple-600", bg: "bg-purple-50" },
                    { label: "Meetings", value: stats?.meeting, icon: Video, color: "text-pink-600", bg: "bg-pink-50" }
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-500">{stat.label}</span>
                            <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>
                                <stat.icon size={16} />
                            </div>
                        </div>
                        {loadingStats ? (
                            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                        ) : (
                            <div className="text-2xl font-bold text-gray-900">{stat.value || 0}</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Main Inbox Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden">
                {/* Filter Tabs */}
                <div className="border-b border-gray-100 p-2 md:px-4 flex items-center overflow-x-auto no-scrollbar gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mr-2 shrink-0">
                        <Filter size={16} /> Filters:
                    </div>
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.label;
                        return (
                            <button
                                key={tab.label}
                                onClick={() => setActiveTab(tab.label)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${
                                    isActive 
                                    ? "bg-blue-50 text-blue-700 shadow-sm" 
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Feed Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/30">
                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0"></div>
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                    </div>
                                    <div className="h-3 bg-gray-200 rounded w-16 mt-1 shrink-0"></div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">Something went wrong</h3>
                            <p className="text-gray-500 max-w-sm mb-4">{error}</p>
                            <button 
                                onClick={() => setActiveTab(activeTab)} 
                                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
                                <Inbox size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">No communications found</h3>
                            <p className="text-gray-500 max-w-sm">
                                You don't have any {activeTab !== "All" ? activeTab.toLowerCase() : "recent"} communications in your inbox.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item) => (
                                <div 
                                    key={item.id} 
                                    className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer relative overflow-hidden"
                                >
                                    {/* Accent border on hover */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            {getIconForType(item.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h4 className="text-sm font-bold text-gray-900 truncate pr-4">
                                                    {item.contact}
                                                </h4>
                                                <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:block font-medium">
                                                    {formatTimestamp(item.timestamp)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 truncate">
                                                {item.preview || "No content"}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Mobile Timestamp */}
                                    <div className="sm:hidden text-xs text-gray-400 pl-14 font-medium">
                                        {formatTimestamp(item.timestamp)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
