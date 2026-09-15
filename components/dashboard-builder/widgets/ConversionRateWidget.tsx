"use client";

// components/dashboard-builder/widgets/ConversionRateWidget.tsx

import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

const CONVERSION_DATA = [
  { name: "Leads → Qualified", rate: 62, color: "#6366f1" },
  { name: "Qualified → Proposal", rate: 44, color: "#10b981" },
  { name: "Proposal → Won", rate: 28, color: "#f59e0b" },
];

export function ConversionRateWidget({ isPreview }: { isPreview?: boolean }) {
  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <p className="text-2xl font-bold text-gray-900">18.3%</p>
          <p className="text-xs text-gray-500">Overall conversion</p>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-lg">
          <TrendingDown size={12} />
          -2.1% this month
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-2 justify-center">
        {CONVERSION_DATA.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 truncate">{item.name}</span>
                <span className="text-xs font-bold text-gray-800 ml-2 flex-shrink-0">{item.rate}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${item.rate}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
