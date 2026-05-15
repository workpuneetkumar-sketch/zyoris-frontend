import { TrendingUp, DollarSign, Database, Package } from "lucide-react";

type Props = { summary: any };

const CARDS = [
    { key: "leads", label: "Leads", icon: TrendingUp, color: "#3B82F6" },
    { key: "deals", label: "Deals", icon: DollarSign, color: "#10B981" },
    { key: "expenses", label: "Expenses", icon: Database, color: "#F59E0B" },
    { key: "inventory", label: "Inventory", icon: Package, color: "#8B5CF6" },
];

export function IngestionSummaryCards({ summary }: Props) {
    if (!summary) return null;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CARDS.map(({ key, label, icon: Icon, color }) => (
                <div
                    key={key}
                    className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: `${color}15` }}
                        >
                            <Icon size={16} style={{ color }} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">{label}</p>
                            <p className="text-lg font-bold text-gray-800">
                                {(summary[key] ?? 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}