import { useState, useEffect } from "react";
import api from "@/lib/api/api";
import { DollarSign, BarChart2, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";

export function CEOOverviewSection({ token }: { token: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        api.get("/dashboard/ceo")
            .then((res) => setData(res.data))
            .catch(() => console.error("CEO API Error"))
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-32 animate-pulse bg-gray-50 rounded-2xl" />;
    if (!data) return null;

    const { kpis, riskIndicators, revenueForecast } = data;

    const getTrendIcon = (trend: string) => {
        if (trend === "upward") return <TrendingUp size={14} className="text-emerald-500" />;
        if (trend === "downward") return <TrendingDown size={14} className="text-red-500" />;
        return <Minus size={14} className="text-blue-400" />;
    };

    const cards = [
        {
            title: "Revenue Run-Rate",
            value: `$${Math.round((kpis?.totalRevenue || 0) / 1000)}k`,
            icon: DollarSign,
            color: "blue",
            trend: revenueForecast?.stats?.trend || "flat",
            status: revenueForecast?.stats?.trend === "upward" ? "Growth" : "Stable"
        },
        {
            title: "Gross Margin",
            value: `${Math.round((riskIndicators?.marginPct || 0) * 100)}%`,
            icon: BarChart2,
            color: "violet",
            status: (riskIndicators?.marginPct || 0) >= 0.3 ? "Healthy" : "Below Target"
        },
        {
            title: "Demand Signal",
            value: (riskIndicators?.demandTrend || "flat").charAt(0).toUpperCase() + (riskIndicators?.demandTrend || "flat").slice(1),
            icon: Activity,
            color: "emerald",
            status: riskIndicators?.demandTrend === "increasing" ? "Strong" : "Neutral"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cards.map((card) => (
                <div key={card.title} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{card.title}</p>
                        <div className={`p-2 rounded-xl bg-${card.color}-50 group-hover:scale-110 transition-transform`}>
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
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-blue-50 text-blue-600"
                            }`}>
                            {card.status}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
