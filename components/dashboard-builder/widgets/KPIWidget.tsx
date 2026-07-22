"use client";

import { DollarSign, TrendingUp, TrendingDown, IndianRupee } from "lucide-react";

interface KPIWidgetProps {
  title: string;
  value: string | number;
  trend?: number;
  format?: "currency" | "number" | "percentage";
}

function formatValue(
  val: string | number,
  format?: "currency" | "number" | "percentage"
): string {
  if (typeof val === "string") return val;
  switch (format) {
    case "currency":
      return `₹${val.toLocaleString("en-IN")}`;
    case "percentage":
      return `${val.toFixed(1)}%`;
    case "number":
    default:
      return val.toLocaleString("en-IN");
  }
}

// Mock KPI data used when no value is provided
const MOCK_KPI_DATA: Record<string, { value: number; trend: number; format: "currency" | "number" | "percentage"; label: string }> = {
  "kpi-revenue": { value: 1245000, trend: 12.5, format: "currency", label: "Total Revenue" },
  "kpi-leads": { value: 1247, trend: 23.4, format: "number", label: "Total Leads" },
  "kpi-deal-value": { value: 8750000, trend: -3.2, format: "currency", label: "Deal Value" },
};

const DEFAULT_KPI = { value: 0, trend: 0, format: "number" as const };

export function KPIWidget({ title, value, trend, format }: KPIWidgetProps) {
  // Use mock data if default props passed
  const mockData = MOCK_KPI_DATA[title];
  const finalValue = (typeof value === "number" && value !== 0) ? value : (mockData?.value ?? DEFAULT_KPI.value);
  const finalTrend = (trend != null && trend !== 0) ? trend : (mockData?.trend ?? DEFAULT_KPI.trend);
  const finalFormat = format ?? mockData?.format ?? DEFAULT_KPI.format;

  const formatted = formatValue(finalValue, finalFormat);
  const isPositive = finalTrend >= 0;

  return (
    <div className="h-full flex flex-col justify-center px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          {mockData?.label ?? title}
        </span>
        <div className={`p-1.5 rounded-lg ${isPositive ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>
          {finalFormat === "currency" ? <IndianRupee size={14} strokeWidth={2.5} /> : <DollarSign size={14} strokeWidth={2.5} />}
        </div>
      </div>
      <p className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
        {formatted}
      </p>
      {finalTrend !== 0 && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className={`flex items-center gap-0.5 text-xs font-bold ${
            isPositive ? "text-emerald-600" : "text-red-500"
          }`}>
            {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            <span>{isPositive ? "+" : ""}{finalTrend.toFixed(1)}%</span>
          </div>
          <span className="text-[10px] text-gray-400">vs last month</span>
        </div>
      )}
    </div>
  );
}
