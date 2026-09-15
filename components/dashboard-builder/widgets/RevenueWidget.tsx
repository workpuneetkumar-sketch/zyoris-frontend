"use client";

// components/dashboard-builder/widgets/RevenueWidget.tsx

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

const REVENUE_DATA = [
  { month: "Feb", actual: 98000, target: 105000 },
  { month: "Mar", actual: 112000, target: 108000 },
  { month: "Apr", actual: 107000, target: 112000 },
  { month: "May", actual: 124000, target: 115000 },
  { month: "Jun", actual: 138000, target: 120000 },
  { month: "Jul", actual: 128450, target: 125000 },
];

function fmt(v: number) {
  return `$${(v / 1000).toFixed(0)}K`;
}

interface TooltipProps { active?: boolean; payload?: any[]; label?: string; }
function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-600 mb-1">{label}</p>
        <p className="text-indigo-600">Actual: {fmt(payload[0]?.value ?? 0)}</p>
        <p className="text-gray-400">Target: {fmt(payload[1]?.value ?? 0)}</p>
      </div>
    );
  }
  return null;
}

export function RevenueWidget({ isPreview }: { isPreview?: boolean }) {
  const latest = REVENUE_DATA[REVENUE_DATA.length - 1];
  const pct = ((latest.actual / latest.target) * 100).toFixed(0);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start gap-3 mb-2 px-1">
        <div>
          <p className="text-xl font-bold text-gray-900">{fmt(latest.actual)}</p>
          <p className="text-xs text-gray-500">Revenue this month</p>
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
          <TrendingUp size={12} />
          {pct}% of target
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={REVENUE_DATA} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={fmt} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: "#6366f1" }} />
            <Line type="monotone" dataKey="target" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
