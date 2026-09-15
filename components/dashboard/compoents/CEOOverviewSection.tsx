import { useState, useEffect } from "react";
import api from "@/lib/api/api";
import { DollarSign, BarChart2, Activity, TrendingUp, TrendingDown, Minus, Search, Bell, Plus } from "lucide-react";

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

    const cards = [
        {
            title: "Revenue Forecast",
            value: `$${Math.round((revenueForecast?.projectedRevenue || kpis?.totalRevenue || 0) / 1000)}k`,
            icon: DollarSign,
            color: "blue",
            trend: revenueForecast?.stats?.trend || revenueForecast?.trend || "flat",
            status: (revenueForecast?.stats?.trend === "upward" || revenueForecast?.trend === "upward") ? "Growth" : "Stable"
        },
        {
            title: "Gross Margin",
            value: `${Math.round((riskIndicators?.marginPct || 0) * 100)}%`,
            icon: BarChart2,
            color: "violet",
            status: (riskIndicators?.marginPct || 0) >= 0.3 ? "Healthy" : "Below Target"
        },
        {
            title: "Demand Trends",
            value: (trends?.overallTrend || riskIndicators?.demandTrend || "flat").charAt(0).toUpperCase() + (trends?.overallTrend || riskIndicators?.demandTrend || "flat").slice(1),
            icon: Activity,
            color: "emerald",
            trend: trends?.overallTrend || riskIndicators?.demandTrend || "flat",
            status: (trends?.overallTrend === "increasing" || riskIndicators?.demandTrend === "increasing") ? "Strong" : "Neutral"
        }
    ];

    // Optional: add a fourth card for drivers if space permits or just keep 3 for layout consistency
    if (drivers?.topDriver) {
        cards.push({
            title: "Growth Driver",
            value: drivers.topDriver,
            icon: TrendingUp,
            color: "amber",
            trend: "upward",
            status: "Primary"
        });
    }

    return (
        <div className="space-y-8">
            {/* ── Search & Actions ── */}
            <div className="flex items-center justify-end">
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
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.status === "Healthy" || card.status === "Growth" || card.status === "Strong"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : "bg-blue-50 text-blue-600 border border-blue-100"
                            }`}>
                            {card.status}
                        </span>
                    </div>
                </div>
            ))}
            </div>
        </div>
    );
}
