"use client";
// components/dashboard-builder/widgets/MarketingWidget.tsx

import { TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

const data = [
  { week: "W1", leads: 28, cost: 1200 },
  { week: "W2", leads: 42, cost: 1450 },
  { week: "W3", leads: 38, cost: 1300 },
  { week: "W4", leads: 57, cost: 1600 },
  { week: "W5", leads: 52, cost: 1550 },
  { week: "W6", leads: 68, cost: 1800 },
];

const KPIS = [
  { label: "Leads Gen.", value: "285", change: "+21%" },
  { label: "CAC", value: "$52", change: "-8%" },
  { label: "ROI", value: "4.2x", change: "+0.4x" },
];

export function MarketingWidget({ isPreview }: { isPreview?: boolean }) {
  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <div className="grid grid-cols-3 gap-2">
        {KPIS.map((k) => (
          <div key={k.label} className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-2 text-center border border-pink-100">
            <p className="text-base font-extrabold text-gray-900">{k.value}</p>
            <p className="text-[9px] text-gray-400">{k.label}</p>
            <p className="text-[10px] font-bold text-emerald-600">{k.change}</p>
          </div>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fce7f3" />
            <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
            <Line type="monotone" dataKey="leads" stroke="#ec4899" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
