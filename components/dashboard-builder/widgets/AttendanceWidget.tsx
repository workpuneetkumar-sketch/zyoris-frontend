"use client";
// components/dashboard-builder/widgets/AttendanceWidget.tsx
// Real data: GET /hr/employees/get-employees via useHREmployees hook.
// Mock ATTENDANCE_DATA (Present 87%, Late 8%, Absent 5%) and TEAM_DATA (Engineering 24/25 etc.)
// removed entirely. We derive attendance from real employee status fields.
// If the backend does not return attendance status per employee, we show an honest empty state.

import { RefreshCw, AlertCircle, Users } from "lucide-react";
import { useHREmployees } from "@/hooks/useDashboard";
import type { HREmployee } from "@/lib/api/dashboardApi";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const STATUS_COLORS = {
  present: "#10b981",
  leave:   "#f59e0b",
  absent:  "#ef4444",
};

interface TooltipProps { active?: boolean; payload?: any[]; }
function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-2 text-xs">
      <p className="font-semibold" style={{ color: payload[0]?.payload?.color }}>
        {payload[0]?.name}: {payload[0]?.value}
      </p>
    </div>
  );
}

function classifyEmployee(e: HREmployee): "present" | "leave" | "absent" | null {
  const status = (e.status ?? "").toString().toUpperCase();
  if (e.isOnLeave === true || status.includes("LEAVE")) return "leave";
  if (status === "INACTIVE" || status === "ABSENT") return "absent";
  if (status === "ACTIVE" || status === "PRESENT") return "present";
  // No explicit attendance status — cannot classify; caller decides how to handle
  return null;
}

export function AttendanceWidget({ isPreview }: { isPreview?: boolean }) {
  const { data: employees, loading, error, refetch } = useHREmployees();

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-28 h-28 rounded-full bg-gray-100 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 w-16 bg-gray-100 rounded" />
                <div className="h-3 w-8 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 p-3 text-center">
        <AlertCircle size={20} className="text-red-400" />
        <p className="text-xs text-gray-500">{error}</p>
        <button onClick={refetch} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
          <RefreshCw size={11} /> Retry
        </button>
      </div>
    );
  }

  if (!employees || employees.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1 p-3 text-center">
        <Users size={20} className="text-gray-300" />
        <p className="text-xs text-gray-400">No attendance data available</p>
      </div>
    );
  }

  // Classify employees — only count those with explicit attendance status
  const counts = { present: 0, leave: 0, absent: 0 };
  let unclassified = 0;
  employees.forEach((e: HREmployee) => {
    const cls = classifyEmployee(e);
    if (cls === null) {
      unclassified++;
    } else {
      counts[cls]++;
    }
  });
  const total = employees.length;
  const classifiedCount = total - unclassified;

  const pieData = [
    { name: "Present", value: counts.present, color: STATUS_COLORS.present },
    { name: "On Leave", value: counts.leave,   color: STATUS_COLORS.leave   },
    { name: "Absent",  value: counts.absent,  color: STATUS_COLORS.absent  },
  ].filter((d) => d.value > 0);

  // If no employee has an explicit attendance status, show honest empty state
  if (classifiedCount === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1 p-3 text-center">
        <Users size={20} className="text-gray-300" />
        <p className="text-xs text-gray-400">Attendance data not available</p>
        <p className="text-[10px] text-gray-300">({total} employees — no attendance status returned by API)</p>
      </div>
    );
  }

  // Department breakdown from real data.
  // The /hr/employees/get-employees endpoint returns individual employees with a department field.
  // We can count total per department from the list.
  // We cannot compute a present/absent split per department — the API gives one record per
  // employee, not a per-department attendance aggregate. So we show total headcount per dept
  // and do NOT show a progress bar (there is no real present/total per dept ratio).
  const deptMap = new Map<string, number>();
  employees.forEach((e: HREmployee) => {
    const dept = (e.department as string) || "Other";
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
  });
  const depts = Array.from(deptMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }));

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="w-28 h-28 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1">
          {pieData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.name}</span>
              </div>
              <span className="font-semibold text-gray-800">
                {item.value} ({Math.round((item.value / classifiedCount) * 100)}%)
              </span>
            </div>
          ))}
          <p className="text-[10px] text-gray-400 pt-0.5">Total: {total} employees{unclassified > 0 ? ` (${unclassified} unclassified)` : ""}</p>
        </div>
      </div>

      {depts.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">By Department</p>
          {depts.map((dept) => (
            <div key={dept.name} className="flex items-center justify-between text-xs">
              <span className="text-gray-500 truncate w-28">{dept.name}</span>
              <span className="text-gray-700 font-semibold flex-shrink-0">
                {dept.count} staff
              </span>
            </div>
          ))}
          <p className="text-[10px] text-gray-400 pt-0.5">
            Per-department attendance not available from API.
          </p>
        </div>
      )}
    </div>
  );
}
