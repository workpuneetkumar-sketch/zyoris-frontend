"use client";
// components/dashboard-builder/widgets/AnalyticsWidget.tsx

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

const data = [
  { month: "Feb", visitors: 3200, conversions: 640 },
  { month: "Mar", visitors: 4100, conversions: 820 },
  { month: "Apr", visitors: 3800, conversions: 760 },
  { month: "May", visitors: 5200, conversions: 1040 },
  { month: "Jun", visitors: 4700, conversions: 940 },
  { month: "Jul", visitors: 6100, conversions: 1220 },
];

export function AnalyticsWidget({ isPreview }: { isPreview?: boolean }) {
  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-[10px] text-gray-400">Visitors</p>
          <p className="text-base font-extrabold text-gray-900">27,100</p>
        </div>
        <div className="w-px h-8 bg-gray-100" />
        <div>
          <p className="text-[10px] text-gray-400">Conversions</p>
          <p className="text-base font-extrabold text-violet-600">5,420</p>
        </div>
        <div className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          +18.4% MoM
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={14} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
            <Bar dataKey="visitors" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
            <Bar dataKey="conversions" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
