"use client";

// components/dashboard-builder/widgets/KpiCardWidget.tsx

import { Users, DollarSign, TrendingUp, Target, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KpiCardWidgetProps {
  isPreview?: boolean;
  widgetId?: string;
}

interface KpiMetric {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ComponentType<any>;
  color: string;
}

const KPI_DATA: Record<string, KpiMetric[]> = {
  "leads-kpi": [
    { label: "Total Leads", value: "284", change: 12.4, changeLabel: "vs last month", icon: Users, color: "#6366f1" },
    { label: "New This Month", value: "48", change: 8.2, changeLabel: "vs last month", icon: TrendingUp, color: "#10b981" },
    { label: "Conversion Rate", value: "18.3%", change: -2.1, changeLabel: "vs last month", icon: Target, color: "#f59e0b" },
  ],
  "deals-kpi": [
    { label: "Open Deals", value: "67", change: 5.3, changeLabel: "vs last quarter", icon: DollarSign, color: "#6366f1" },
    { label: "Won This Quarter", value: "24", change: 14.7, changeLabel: "vs last quarter", icon: TrendingUp, color: "#10b981" },
    { label: "Avg Deal Size", value: "$12,400", change: 3.1, changeLabel: "vs last quarter", icon: Target, color: "#f59e0b" },
  ],
  "revenue-kpi": [
    { label: "Monthly Revenue", value: "$128,450", change: 9.8, changeLabel: "vs last month", icon: DollarSign, color: "#6366f1" },
    { label: "ARR", value: "$1.54M", change: 22.3, changeLabel: "vs last year", icon: TrendingUp, color: "#10b981" },
    { label: "Gross Margin", value: "68.2%", change: 1.4, changeLabel: "vs last month", icon: Target, color: "#f59e0b" },
  ],
};

const DEFAULT_KPIS: KpiMetric[] = [
  { label: "Total Revenue", value: "$284,520", change: 12.4, changeLabel: "vs last month", icon: DollarSign, color: "#6366f1" },
  { label: "Active Users", value: "1,284", change: 8.2, changeLabel: "vs last month", icon: Users, color: "#10b981" },
  { label: "Conversion", value: "24.8%", change: -2.1, changeLabel: "vs last month", icon: Target, color: "#f59e0b" },
];

export function KpiCardWidget({ isPreview, widgetId }: KpiCardWidgetProps) {
  const metrics = (widgetId && KPI_DATA[widgetId]) || DEFAULT_KPIS;

  return (
    <div className="h-full flex flex-col gap-3 p-1">
      {metrics.map((metric, i) => {
        const Icon = metric.icon;
        const positive = metric.change >= 0;
        return (
          <div key={i} className="flex-1 bg-gray-50 rounded-xl p-3 flex items-center gap-3 min-h-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: metric.color + "18" }}
            >
              <Icon size={16} style={{ color: metric.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 truncate">{metric.label}</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{metric.value}</p>
            </div>
            <div className={`flex items-center gap-0.5 text-xs font-semibold flex-shrink-0 ${positive ? "text-emerald-600" : "text-red-500"}`}>
              {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(metric.change)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
