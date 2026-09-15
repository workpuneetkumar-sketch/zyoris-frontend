import React from "react";
import { Layers, Link2, Activity, AlertTriangle } from "lucide-react";

interface MarketplaceStatsProps {
  stats: {
    total: number;
    connected: number;
    active: number;
    errors: number;
  };
}

export function MarketplaceStats({ stats }: MarketplaceStatsProps) {
  const statItems = [
    {
      label: "Total Connectors",
      value: stats.total,
      icon: Layers,
      colorClass: "text-info",
      bgClass: "bg-info/10",
      borderClass: "border-info/20",
    },
    {
      label: "Connected Services",
      value: stats.connected,
      icon: Link2,
      colorClass: "text-primary",
      bgClass: "bg-primary/10",
      borderClass: "border-primary/20",
    },
    {
      label: "Active Syncs",
      value: stats.active,
      icon: Activity,
      colorClass: "text-success",
      bgClass: "bg-success/10",
      borderClass: "border-success/20",
    },
    {
      label: "Needs Attention",
      value: stats.errors,
      icon: AlertTriangle,
      colorClass: "text-warning",
      bgClass: "bg-warning/10",
      borderClass: "border-warning/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="p-4 rounded-xl border border-border bg-surface hover:border-border-light transition-all flex items-center justify-between shadow-sm"
          >
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                {item.label}
              </p>
              <h3 className="text-2xl font-bold text-text mt-1">
                {item.value}
              </h3>
            </div>
            <div
              className={`p-2.5 rounded-xl ${item.bgClass} ${item.colorClass} border ${item.borderClass}`}
            >
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
