"use client";

import React, { useMemo } from "react";
import { Campaign } from "@/lib/api/marketingApi";
import { Megaphone, TrendingUp, DollarSign, Activity, Wallet } from "lucide-react";

interface Props {
  campaigns: Campaign[];
}

const CampaignStatsCards: React.FC<Props> = ({ campaigns }) => {
  const stats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter((c) => c.status === "ACTIVE").length;
    const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
    const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
    const remaining = totalBudget - totalSpent;
    return { total, active, totalBudget, totalSpent, remaining };
  }, [campaigns]);

  const cards = [
    {
      label: "Total Campaigns",
      value: stats.total,
      icon: Megaphone,
      gradient: "from-purple-500 to-indigo-600",
    },
    {
      label: "Active",
      value: stats.active,
      icon: TrendingUp,
      gradient: "from-green-500 to-emerald-600",
    },
    {
      label: "Total Budget",
      value: `$${stats.totalBudget.toLocaleString()}`,
      icon: DollarSign,
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      label: "Total Spent",
      value: `$${stats.totalSpent.toLocaleString()}`,
      icon: Activity,
      gradient: "from-orange-500 to-red-600",
    },
    {
      label: "Remaining",
      value: `$${stats.remaining.toLocaleString()}`,
      icon: Wallet,
      gradient: "from-teal-500 to-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {card.value}
              </p>
            </div>
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}
            >
              <card.icon size={20} className="text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CampaignStatsCards;