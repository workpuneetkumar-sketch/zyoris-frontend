"use client";

// components/dashboard-builder/widgets/AttendanceWidget.tsx

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Users } from "lucide-react";

const ATTENDANCE_DATA = [
  { name: "Present", value: 87, color: "#10b981" },
  { name: "Late", value: 8, color: "#f59e0b" },
  { name: "Absent", value: 5, color: "#ef4444" },
];

const TEAM_DATA = [
  { name: "Engineering", present: 24, total: 25 },
  { name: "Sales", present: 18, total: 20 },
  { name: "Support", present: 12, total: 15 },
  { name: "Finance", present: 8, total: 8 },
];

interface TooltipProps { active?: boolean; payload?: any[]; }
function CustomTooltip({ active, payload }: TooltipProps) {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-2 text-xs">
        <p className="font-semibold" style={{ color: payload[0]?.payload?.color }}>
          {payload[0]?.name}: {payload[0]?.value}%
        </p>
      </div>
    );
  }
  return null;
}

export function AttendanceWidget({ isPreview }: { isPreview?: boolean }) {
  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="w-28 h-28 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={ATTENDANCE_DATA} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" dataKey="value">
                {ATTENDANCE_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1">
          {ATTENDANCE_DATA.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.name}</span>
              </div>
              <span className="font-semibold text-gray-800">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
        {TEAM_DATA.map((dept) => (
          <div key={dept.name} className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 w-24 truncate">{dept.name}</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${(dept.present / dept.total) * 100}%` }}
              />
            </div>
            <span className="text-gray-700 font-semibold flex-shrink-0 w-10 text-right">
              {dept.present}/{dept.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
