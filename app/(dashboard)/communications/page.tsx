"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    getInbox,
    CommunicationItem,
    CommunicationType,
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
    Activity,
    TrendingUp,
    ArrowUpRight,
} from "lucide-react";

type FilterTab = "All" | "Email" | "WhatsApp" | "Call" | "Meeting";

// ── Stat card config ───────────────────────────────────────────────────────────
const STAT_CONFIG = [
    {
        key: "total" as const,
        label: "Total",
        icon: Activity,
        color: "text-blue-600",
        bg: "bg-blue-50",
        hoverBorder: "hover:border-blue-200",
        hoverShadow: "hover:shadow-blue-100/60",
        accent: "from-blue-500/10 to-transparent",
        dot: "bg-blue-500",
    },
    {
        key: "email" as const,
        label: "Emails",
        icon: Mail,
        color: "text-indigo-600",
        bg: "bg-indigo-50",
        hoverBorder: "hover:border-indigo-200",
        hoverShadow: "hover:shadow-indigo-100/60",
        accent: "from-indigo-500/10 to-transparent",
        dot: "bg-indigo-500",
    },
    {
        key: "whatsapp" as const,
        label: "WhatsApp",
        icon: MessageCircle,
        color: "text-green-600",
        bg: "bg-green-50",
        hoverBorder: "hover:border-green-200",
        hoverShadow: "hover:shadow-green-100/60",
        accent: "from-green-500/10 to-transparent",
        dot: "bg-green-500",
    },
    {
        key: "call" as const,
        label: "Calls",
        icon: Phone,
        color: "text-purple-600",
        bg: "bg-purple-50",
        hoverBorder: "hover:border-purple-200",
        hoverShadow: "hover:shadow-purple-100/60",
        accent: "from-purple-500/10 to-transparent",
        dot: "bg-purple-500",
    },
    {
        key: "meeting" as const,
        label: "Meetings",
        icon: Video,
        color: "text-pink-600",
        bg: "bg-pink-50",
        hoverBorder: "hover:border-pink-200",
        hoverShadow: "hover:shadow-pink-100/60",
        accent: "from-pink-500/10 to-transparent",
        dot: "bg-pink-500",
    },
];

// ── Stat card component ────────────────────────────────────────────────────────
function StatCard({
    label,
    value,
    total,
    icon: Icon,
    color,
    bg,
    hoverBorder,
    hoverShadow,
    accent,
    dot,
    loading,
    onClick,
    isActive,
}: {
    label: string;
    value: number;
    total: number;
    icon: React.ElementType;
    color: string;
    bg: string;
    hoverBorder: string;
    hoverShadow: string;
    accent: string;
    dot: string;
    loading: boolean;
    onClick: () => void;
    isActive: boolean;
}) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;

    return (
        <button
            onClick={onClick}
            className={`group relative bg-white rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-200 text-left overflow-hidden
                ${isActive
                    ? `border-current ${color} shadow-lg ${hoverShadow}`
                    : `border-gray-100 hover:shadow-md ${hoverBorder} ${hoverShadow}`
                }`}
        >
            {/* Gradient accent on hover / active */}
            <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-100 ${isActive ? "opacity-100" : ""} transition-opacity pointer-events-none`} />

            {/* Top row */}
            <div className="relative flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${bg}`}>
                    <Icon size={18} className={color} />
                </div>
                {!loading && value > 0 && (
                    <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <ArrowUpRight size={12} />
                        {label !== "Total" ? `${pct}%` : ""}
                    </span>
                )}
            </div>

            {/* Value */}
            <div className="relative">
                {loading ? (
                    <div className="h-8 w-14 bg-gray-100 rounded-lg animate-pulse" />
                ) : (
                    <div className={`text-3xl font-extrabold transition-colors ${isActive ? color : "text-gray-900 group-hover:" + color}`}>
                        {value.toLocaleString()}
                    </div>
                )}
                <p className="text-[12px] font-medium text-gray-400 mt-0.5">{label}</p>
            </div>

            {/* Progress bar */}
            {!loading && label !== "Total" && total > 0 && (
                <div className="relative h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${dot}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            )}

            {/* Active indicator dot */}
            {isActive && (
                <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ${dot}`} />
            )}
        </button>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CommunicationDashboard() {
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState<FilterTab>("All");
    const [allItems, setAllItems] = useState<CommunicationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch ALL items once — stats are derived from this, no extra call needed
    useEffect(() => {
        let isMounted = true;
        const fetchAll = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getInbox(); // no filter — fetch everything
                if (isMounted) setAllItems(data);
            } catch (err) {
                if (isMounted) setError("Failed to load communications. Please try again.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchAll();
        return () => { isMounted = false; };
    }, []);

    // Derive stats directly from fetched data
    const stats = useMemo(() => ({
        total: allItems.length,
        email: allItems.filter(i => i.type === "email").length,
        whatsapp: allItems.filter(i => i.type === "whatsapp").length,
        call: allItems.filter(i => i.type === "call").length,
        meeting: allItems.filter(i => i.type === "meeting").length,
    }), [allItems]);

    // Filter items for the active tab
    const items = useMemo(() => {
        if (activeTab === "All") return allItems;
        return allItems.filter(i => i.type === activeTab.toLowerCase() as CommunicationType);
    }, [allItems, activeTab]);

    const getGreeting = () => {
        const name = user?.name || user?.role || "Team Member";
        return `Welcome, ${name} — here is your Unified Inbox`;
    };

    const tabs: { label: FilterTab; icon: React.ElementType }[] = [
        { label: "All", icon: Inbox },
        { label: "Email", icon: Mail },
        { label: "WhatsApp", icon: MessageCircle },
        { label: "Call", icon: Phone },
        { label: "Meeting", icon: Video },
    ];

    const getIconForType = (type: CommunicationType) => {
        const base = "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110";
        switch (type) {
            case "email":    return <div className={`${base} bg-indigo-50`}><Mail size={16} className="text-indigo-500" /></div>;
            case "whatsapp": return <div className={`${base} bg-green-50`}><MessageCircle size={16} className="text-green-500" /></div>;
            case "call":     return <div className={`${base} bg-purple-50`}><Phone size={16} className="text-purple-500" /></div>;
            case "meeting":  return <div className={`${base} bg-pink-50`}><Video size={16} className="text-pink-500" /></div>;
            default:         return <div className={`${base} bg-gray-50`}><MessageSquareText size={16} className="text-gray-400" /></div>;
        }
    };

    const getTypeBadge = (type: CommunicationType) => {
        const map: Record<CommunicationType, { label: string; cls: string }> = {
            email:    { label: "Email",    cls: "bg-indigo-50 text-indigo-600 border-indigo-100" },
            whatsapp: { label: "WhatsApp", cls: "bg-green-50 text-green-600 border-green-100" },
            call:     { label: "Call",     cls: "bg-purple-50 text-purple-600 border-purple-100" },
            meeting:  { label: "Meeting",  cls: "bg-pink-50 text-pink-600 border-pink-100" },
        };
        const { label, cls } = map[type] ?? { label: type, cls: "bg-gray-100 text-gray-500 border-gray-200" };
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
                {label}
            </span>
        );
    };

    const formatTimestamp = (isoString: string) => {
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }).format(new Date(isoString));
    };

    return (
        <div className="flex flex-col min-h-[calc(100vh-theme(spacing.16))] p-4 md:p-6 bg-gray-50/50">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm shadow-blue-200">
                            <MessageSquareText size={22} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Communication Hub</h1>
                    </div>
                    <p className="text-sm text-gray-500">{getGreeting()}</p>
                </div>
                {/* Total badge */}
                {!loading && allItems.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm text-sm text-gray-600">
                        <TrendingUp size={15} className="text-blue-500" />
                        <span className="font-semibold text-gray-900">{allItems.length}</span> total communications
                    </div>
                )}
            </div>

            {/* ── KPI Stat Cards ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {STAT_CONFIG.map((cfg) => (
                    <StatCard
                        key={cfg.key}
                        label={cfg.label}
                        value={stats[cfg.key]}
                        total={stats.total}
                        icon={cfg.icon}
                        color={cfg.color}
                        bg={cfg.bg}
                        hoverBorder={cfg.hoverBorder}
                        hoverShadow={cfg.hoverShadow}
                        accent={cfg.accent}
                        dot={cfg.dot}
                        loading={loading}
                        onClick={() => setActiveTab(cfg.label === "Total" ? "All" : cfg.label as FilterTab)}
                        isActive={activeTab === (cfg.label === "Total" ? "All" : cfg.label)}
                    />
                ))}
            </div>

            {/* ── Main Inbox Container ─────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden">

                {/* Filter Tabs */}
                <div className="border-b border-gray-100 px-4 py-3 flex items-center overflow-x-auto no-scrollbar gap-1.5">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-400 mr-3 shrink-0">
                        <Filter size={14} />
                        <span className="hidden sm:inline">Filters:</span>
                    </div>
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.label;
                        const count = tab.label === "All"
                            ? stats.total
                            : stats[tab.label.toLowerCase() as keyof typeof stats];
                        return (
                            <button
                                key={tab.label}
                                onClick={() => setActiveTab(tab.label)}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all shrink-0
                                    ${isActive
                                        ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-200"
                                    }`}
                            >
                                <Icon size={14} />
                                {tab.label}
                                {!loading && count > 0 && (
                                    <span className={`ml-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                                        isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                                    }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Feed Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-5 bg-gray-50/30">
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3.5 bg-gray-100 rounded w-1/4" />
                                        <div className="h-3 bg-gray-100 rounded w-2/3" />
                                    </div>
                                    <div className="h-3 bg-gray-100 rounded w-20 shrink-0" />
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full py-16 text-center gap-4">
                            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
                                <AlertCircle size={28} className="text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-1">Something went wrong</h3>
                                <p className="text-sm text-gray-500 max-w-sm">{error}</p>
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-16 text-center gap-3">
                            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                                <Inbox size={26} className="text-gray-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-1">No communications found</h3>
                                <p className="text-sm text-gray-500">
                                    No {activeTab !== "All" ? activeTab.toLowerCase() : "recent"} communications in your inbox.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-200 cursor-pointer relative overflow-hidden"
                                >
                                    {/* Left accent */}
                                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-center rounded-r-full" />

                                    {getIconForType(item.type)}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                            <h4 className="text-sm font-bold text-gray-900 truncate">{item.contact}</h4>
                                            {getTypeBadge(item.type)}
                                        </div>
                                        <p className="text-sm text-gray-500 truncate">{item.preview || "No content"}</p>
                                    </div>

                                    <div className="shrink-0 text-right">
                                        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                                            {formatTimestamp(item.timestamp)}
                                        </span>
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
