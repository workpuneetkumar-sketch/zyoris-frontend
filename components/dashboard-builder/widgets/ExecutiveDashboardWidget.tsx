"use client";
// components/dashboard-builder/widgets/ExecutiveDashboardWidget.tsx

import { TrendingUp, TrendingDown, DollarSign, Users, Briefcase, Target } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

const sparkData = [40, 55, 45, 70, 65, 80, 72, 90, 85, 95, 88, 100];

const METRICS = [
  { label: "Total Revenue", value: "$2.84M", change: 12.4, up: true, icon: DollarSign, color: "#6366f1" },
  { label: "Active Deals", value: "67", change: 8.3, up: true, icon: Briefcase, color: "#10b981" },
  { label: "New Clients", value: "24", change: 5.1, up: true, icon: Users, color: "#f59e0b" },
  { label: "Target Hit", value: "91%", change: -2.1, up: false, icon: Target, color: "#8b5cf6" },
];

const sparkPoints = sparkData.map((v, i) => ({ i, v }));

export function ExecutiveDashboardWidget({ isPreview }: { isPreview?: boolean }) {
  return (
    <div className="h-full flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {METRICS.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="bg-gray-50 rounded-xl p-2.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: m.color + "18" }}>
                <Icon size={13} style={{ color: m.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 truncate">{m.label}</p>
                <p className="text-sm font-extrabold text-gray-900">{m.value}</p>
              </div>
              <div className={`ml-auto flex items-center gap-0.5 text-[10px] font-bold ${m.up ? "text-emerald-600" : "text-red-500"}`}>
                {m.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {Math.abs(m.change)}%
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkPoints} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="execGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip formatter={(v: number) => [`${v}`, "Score"]} contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
            <Area type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} fill="url(#execGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
