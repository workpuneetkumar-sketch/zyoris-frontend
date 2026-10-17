import { useState, useEffect } from "react";
import api from "@/lib/api/api";
import { DollarSign, BarChart2, Activity, TrendingUp, TrendingDown, Minus, Bell, Plus } from "lucide-react";

export function CEOOverviewSection({ token }: { token: string }) {
    const [data, setData] = useState<any>(null);
    const [forecast, setForecast] = useState<any>(null);
    const [trends, setTrends] = useState<any>(null);
    const [drivers, setDrivers] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        
        setLoading(true);
        Promise.all([
            api.get("/dashboard/ceo"),
            api.get("/analytics/revenue/forecast"),
            api.get("/analytics/demand/trends"),
            api.get("/analytics/revenue/drivers")
        ]).then(([ceoRes, forecastRes, trendsRes, driversRes]) => {
            setData(ceoRes.data);
            setForecast(forecastRes.data);
            setTrends(trendsRes.data);
            setDrivers(driversRes.data);
        }).catch((err) => {
            console.error("CEO Dashboard APIs Error:", err);
        }).finally(() => {
            setLoading(false);
        });
    }, [token]);

    if (loading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-32 animate-pulse bg-gray-50 rounded-2xl" />;
    if (!data) return null;

    const { kpis, riskIndicators } = data;
    const revenueForecast = forecast || data.revenueForecast;

    const getTrendIcon = (trend: string) => {
        if (trend === "upward" || trend === "increasing") return <TrendingUp size={14} className="text-emerald-500" />;
        if (trend === "downward" || trend === "decreasing") return <TrendingDown size={14} className="text-red-500" />;
        return <Minus size={14} className="text-blue-400" />;
    };

    const cards: Array<{
        title: string;
        value: string;
        icon: React.ElementType;
        color: string;
        trend?: string;
        status?: string;
    }> = [
        {
            title: "Revenue Forecast",
            value: revenueForecast?.projectedRevenue != null
                ? `$${Math.round(revenueForecast.projectedRevenue / 1000)}k`
                : kpis?.totalRevenue != null
                ? `$${Math.round(kpis.totalRevenue / 1000)}k`
                : "—",
            icon: DollarSign,
            color: "blue",
            trend: revenueForecast?.stats?.trend || revenueForecast?.trend,
            // Growth/Declining/Stable only when we have a definitive trend; no label otherwise
            status: (() => {
                const t = revenueForecast?.stats?.trend || revenueForecast?.trend;
                if (!t) return undefined;
                if (t === "upward" || t === "increasing") return "Growth";
                if (t === "downward" || t === "decreasing") return "Declining";
                return "Stable";
            })(),
        },
        {
            title: "Gross Margin",
            // Show raw percentage only — no threshold label (no marginTarget from backend)
            value: riskIndicators?.marginPct != null
                ? `${Math.round(riskIndicators.marginPct * 100)}%`
                : "—",
            icon: BarChart2,
            color: "violet",
            status: undefined,  // removed: 0.3 threshold label was arbitrary
        },
        {
            title: "Demand Trends",
            value: (() => {
                const raw = trends?.overallTrend || riskIndicators?.demandTrend;
                return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "—";
            })(),
            icon: Activity,
            color: "emerald",
            trend: trends?.overallTrend || riskIndicators?.demandTrend,
            // Strong/Declining/Neutral from real API field; no label when absent
            status: (() => {
                const t = trends?.overallTrend || riskIndicators?.demandTrend;
                if (!t) return undefined;
                if (t === "increasing") return "Strong";
                if (t === "decreasing") return "Declining";
                if (t === "flat" || t === "stable") return "Neutral";
                return undefined;
            })(),
        }
    ];

    // Growth Driver card — only when backend provides topDriver;
    // never fabricate trend or status
    if (drivers?.topDriver) {
        const driverTrend: string | undefined = typeof drivers.trend === "string" ? drivers.trend : undefined;
        const driverStatus: string | undefined = typeof drivers.status === "string" ? drivers.status : undefined;
        cards.push({
            title: "Growth Driver",
            value: drivers.topDriver,
            icon: TrendingUp,
            color: "amber",
            trend: driverTrend,
            status: driverStatus,
        });
    }

    return (
        <div className="space-y-8">
            {/* ── Actions ── */}
            <div className="flex items-center justify-end">
                <div className="flex items-center gap-3">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cards.map((card) => (
                <div key={card.title} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{card.title}</p>
                        <div className={`p-2 rounded-xl bg-${card.color}-50 border border-${card.color}-100 group-hover:scale-110 transition-transform`}>
                            <card.icon size={16} className={`text-${card.color}-600`} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                        {card.trend && (
                            <div className="flex items-center gap-1">
                                {getTrendIcon(card.trend)}
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        {card.status && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.status === "Healthy" || card.status === "Growth" || card.status === "Strong"
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                    : card.status === "Declining"
                                    ? "bg-red-50 text-red-600 border border-red-100"
                                    : "bg-blue-50 text-blue-600 border border-blue-100"
                                }`}>
                                {card.status}
                            </span>
                        )}
                    </div>
                </div>
            ))}
            </div>
        </div>
    );
}
