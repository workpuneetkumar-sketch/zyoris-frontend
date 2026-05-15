import { useState, useEffect } from "react";
import api from "@/lib/api/api";
import { DollarSign, BarChart2, ShieldCheck, PieChart, Wallet, ClipboardCheck } from "lucide-react";

export interface CFODashboardData {
    marginTrends: {
        margin: number;
        marginPct: number;
    };
    expensesSummary: {
        totalExpenses: number;
    };
    marketingPerformance: any[];
    approvalWorkflows: {
        pendingApprovals: number;
    };
}

export function CFOOverviewSection({ token }: { token: string }) {
    const [data, setData] = useState<CFODashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        api.get("/dashboard/cfo")
            .then((res) => setData(res.data))
            .catch(() => console.error("CFO API Error"))
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-32 animate-pulse bg-gray-50 rounded-2xl" />;
    if (!data) return null;

    const { marginTrends, expensesSummary, approvalWorkflows } = data;

    const cards = [
        {
            title: "Gross Margin",
            value: `${Math.round(marginTrends.marginPct * 100)}%`,
            subValue: `$${Math.round(marginTrends.margin).toLocaleString()}`,
            icon: BarChart2,
            color: "blue",
            status: marginTrends.marginPct >= 0.3 ? "Positive" : "Review Required"
        },
        {
            title: "Total Expenses",
            value: `$${Math.round(expensesSummary.totalExpenses / 1000)}k`,
            subValue: "Current Period",
            icon: Wallet,
            color: "violet",
            status: "On Track"
        },
        {
            title: "Pending Approvals",
            value: approvalWorkflows.pendingApprovals.toString(),
            subValue: "Actions Required",
            icon: ClipboardCheck,
            color: "amber",
            status: approvalWorkflows.pendingApprovals > 0 ? "Pending" : "Cleared"
        }
    ];

    return (
        <div className="space-y-6">
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
                            <p className="text-sm text-gray-400 font-medium">{card.subValue}</p>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.status === "Positive" || card.status === "Cleared" || card.status === "On Track"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-amber-50 text-amber-600"
                                }`}>
                                {card.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Marketing Performance Table if exists */}
            {data.marketingPerformance && data.marketingPerformance.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50">
                        <h3 className="text-sm font-semibold text-gray-800">Marketing ROI Analysis</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Channel</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Spend</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Revenue</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">ROI</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {data.marketingPerformance.map((item: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-5 py-4 text-sm font-medium text-gray-700">{item.channel}</td>
                                        <td className="px-5 py-4 text-sm text-gray-600 text-right font-mono">${Math.round(item.spend).toLocaleString()}</td>
                                        <td className="px-5 py-4 text-sm text-gray-600 text-right font-mono">${Math.round(item.attributedRevenue).toLocaleString()}</td>
                                        <td className="px-5 py-4 text-right">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${(item.roi || 0) >= 3 ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                                                }`}>
                                                {item.roi != null ? `${item.roi.toFixed(2)}x` : "N/A"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
