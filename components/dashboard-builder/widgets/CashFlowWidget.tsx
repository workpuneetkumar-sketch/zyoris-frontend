"use client";

// components/dashboard-builder/widgets/CashFlowWidget.tsx

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CASHFLOW_DATA = [
  { month: "Jan", inflow: 142000, outflow: 98000 },
  { month: "Feb", inflow: 128000, outflow: 105000 },
  { month: "Mar", inflow: 168000, outflow: 112000 },
  { month: "Apr", inflow: 155000, outflow: 118000 },
  { month: "May", inflow: 184000, outflow: 124000 },
  { month: "Jun", inflow: 176000, outflow: 131000 },
  { month: "Jul", inflow: 198000, outflow: 138000 },
];

function fmt(v: number) {
  return `$${(v / 1000).toFixed(0)}K`;
}

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-600 mb-1">{label}</p>
        <p className="text-indigo-600">Inflow: {fmt(payload[0]?.value ?? 0)}</p>
        <p className="text-rose-500">Outflow: {fmt(payload[1]?.value ?? 0)}</p>
      </div>
    );
  }
  return null;
}

export function CashFlowWidget({ isPreview }: { isPreview?: boolean }) {
  const latest = CASHFLOW_DATA[CASHFLOW_DATA.length - 1];
  const netCashFlow = latest.inflow - latest.outflow;

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-4 mb-2 px-1">
        <div>
          <p className="text-xs text-gray-500">Net Cash Flow (Jul)</p>
          <p className="text-xl font-bold text-emerald-600">{fmt(netCashFlow)}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-500">Inflow / Outflow</p>
          <p className="text-sm font-semibold text-gray-700">
            <span className="text-indigo-600">{fmt(latest.inflow)}</span>
            {" / "}
            <span className="text-rose-500">{fmt(latest.outflow)}</span>
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={CASHFLOW_DATA} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={fmt} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="inflow" stroke="#6366f1" strokeWidth={2} fill="url(#inflowGrad)" />
            <Area type="monotone" dataKey="outflow" stroke="#f43f5e" strokeWidth={2} fill="url(#outflowGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
