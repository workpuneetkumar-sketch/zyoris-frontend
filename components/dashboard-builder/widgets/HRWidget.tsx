"use client";
// components/dashboard-builder/widgets/HRWidget.tsx
// Real data: GET /hr/employees/get-employees via useHREmployees hook.
// Mock STATS (248/12/7) and DEPT_DATA (Engineering 35% etc.) removed entirely.

import { RefreshCw, AlertCircle, Users } from "lucide-react";
import { useHREmployees } from "@/hooks/useDashboard";
import type { HREmployee } from "@/lib/api/dashboardApi";

const DEPT_COLORS: Record<string, string> = {
  Engineering:  "#6366f1",
  Sales:        "#10b981",
  Marketing:    "#f59e0b",
  Operations:   "#8b5cf6",
  Finance:      "#ec4899",
  HR:           "#06b6d4",
  Support:      "#f97316",
};
function deptColor(dept: string): string {
  return DEPT_COLORS[dept] ?? "#94a3b8";
}

export function HRWidget({ isPreview }: { isPreview?: boolean }) {
  const { data: employees, loading, error, refetch } = useHREmployees();

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-2 text-center animate-pulse">
              <div className="h-6 w-10 mx-auto bg-gray-200 rounded mb-1" />
              <div className="h-2.5 w-14 mx-auto bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-2 flex-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="w-20 h-2.5 bg-gray-200 rounded flex-shrink-0" />
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full" />
              <div className="w-7 h-2.5 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
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

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (!employees || employees.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1 p-3 text-center">
        <Users size={20} className="text-gray-300" />
        <p className="text-xs text-gray-400">No employee data available</p>
      </div>
    );
  }

  // ── Compute stats from real data ──────────────────────────────────────────────
  const total   = employees.length;
  const onLeave = employees.filter((e: HREmployee) =>
    e.isOnLeave === true ||
    (e.status ?? "").toString().toUpperCase().includes("LEAVE")
  ).length;

  // Open positions: backend may not return this; show "—" rather than fake number
  // We do not fabricate this metric.

  // Department breakdown
  const deptMap = new Map<string, number>();
  employees.forEach((e: HREmployee) => {
    const dept = (e.department as string) || "Other";
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
  });
  const depts = Array.from(deptMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([dept, count]) => ({
      dept,
      count,
      pct: Math.round((count / total) * 100),
      color: deptColor(dept),
    }));

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-xl p-2 text-center">
          <p className="text-xl font-extrabold" style={{ color: "#6366f1" }}>{total}</p>
          <p className="text-[9px] text-gray-400 leading-tight mt-0.5">Total Employees</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2 text-center">
          <p className="text-xl font-extrabold" style={{ color: "#f59e0b" }}>{onLeave}</p>
          <p className="text-[9px] text-gray-400 leading-tight mt-0.5">On Leave</p>
        </div>
      </div>

      {/* Department breakdown */}
      {depts.length > 0 && (
        <>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">By Department</p>
          <div className="flex-1 space-y-1.5 overflow-hidden">
            {depts.map((d) => (
              <div key={d.dept} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <p className="text-[10px] text-gray-600 w-20 flex-shrink-0 truncate">{d.dept}</p>
                <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                  <div className="h-full rounded-full" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
                </div>
                <p className="text-[10px] font-bold text-gray-600 w-7 text-right">{d.pct}%</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
