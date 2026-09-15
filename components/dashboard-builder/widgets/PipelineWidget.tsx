"use client";

// components/dashboard-builder/widgets/PipelineWidget.tsx

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PIPELINE_DATA = [
  { stage: "Prospect", count: 42, value: 840000 },
  { stage: "Qualified", count: 28, value: 1120000 },
  { stage: "Proposal", count: 16, value: 960000 },
  { stage: "Negotiation", count: 9, value: 720000 },
  { stage: "Closed Won", count: 12, value: 480000 },
];

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#10b981"];

function formatValue(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        <p className="text-indigo-600">{payload[0]?.value} deals</p>
        <p className="text-gray-500">{formatValue(PIPELINE_DATA.find(d => d.stage === label)?.value ?? 0)}</p>
      </div>
    );
  }
  return null;
}

export function PipelineWidget({ isPreview }: { isPreview?: boolean }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex gap-4 text-xs text-gray-500">
          <span><span className="font-bold text-gray-800">107</span> total deals</span>
          <span><span className="font-bold text-emerald-600">$4.12M</span> pipeline value</span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={PIPELINE_DATA} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="stage"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {PIPELINE_DATA.map((_, idx) => (
                <rect key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
