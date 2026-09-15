// components/HREmployeeAttendanceList.tsx

"use client";

import { useMemo } from "react";
import { Calendar, Users } from "lucide-react";

// ── Types ────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  email?: string;
  department?: string;
  position?: string;
}

interface Attendance {
  id?: string;
  employeeId?: string;
  attendanceDate?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
}

// ── Sub-component ────────────────────────────────────────

function EmployeeRowSkeleton() {
  return (
    <div className="animate-pulse flex items-center gap-3 py-2 px-3">
      <div className="h-8 w-8 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
        <div className="h-3 w-16 bg-gray-100 rounded" />
      </div>
      <div className="h-5 w-16 bg-gray-200 rounded-full" />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────

function getStatusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "present") return "bg-emerald-100 text-emerald-700";
  if (normalized === "checked in") return "bg-blue-100 text-blue-700";
  if (normalized === "late") return "bg-amber-100 text-amber-700";
  if (normalized === "absent") return "bg-red-100 text-red-700";
  if (normalized === "half day") return "bg-orange-100 text-orange-700";
  if (normalized === "on leave" || normalized === "leave")
    return "bg-purple-100 text-purple-700";
  return "bg-gray-100 text-gray-600";
}

// ── Props ────────────────────────────────────────────────

interface HREmployeeAttendanceListProps {
  employees: Employee[];
  selectedDateAttendance: Attendance[];
  isLoadingEmployees: boolean;
  isLoadingSelectedDate: boolean;
  isFutureDate: boolean;
  isTodaySelected: boolean;
  selectedDateFormatted: string;
}

// ── Main Component ───────────────────────────────────────

export default function HREmployeeAttendanceList({
  employees,
  selectedDateAttendance,
  isLoadingEmployees,
  isLoadingSelectedDate,
  isFutureDate,
  isTodaySelected,
  selectedDateFormatted,
}: HREmployeeAttendanceListProps) {
  // ── Attendance Map ─────────────────────────────────────

  const employeeAttendanceMap = useMemo(() => {
    const map = new Map<string, Attendance>();
    selectedDateAttendance.forEach((record) => {
      if (record.employeeId) {
        map.set(record.employeeId, record);
      }
    });
    return map;
  }, [selectedDateAttendance]);

  // ── Helpers ────────────────────────────────────────────

  function getAttendanceStatusForEmployee(emp: Employee): string {
    const record = employeeAttendanceMap.get(emp.id);
    if (!record) return "Absent";
    if (record.status) return record.status;
    if (record.checkIn && record.checkOut) return "Present";
    if (record.checkIn) return "Checked In";
    return "Absent";
  }

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 lg:sticky lg:top-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        {isTodaySelected ? "Today's Attendance" : selectedDateFormatted}
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        {isFutureDate
          ? "Future date — no records available"
          : isLoadingSelectedDate
            ? "Loading records..."
            : `${selectedDateAttendance.length} of ${employees.length} employees recorded`}
      </p>

      {/* Loading state */}
      {isLoadingEmployees || isLoadingSelectedDate ? (
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <EmployeeRowSkeleton key={i} />
          ))}
        </div>
      ) : isFutureDate ? (
        /* Future date empty state */
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Attendance records are only available for past and present dates.
          </p>
        </div>
      ) : employees.length === 0 ? (
        /* No employees empty state */
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No employees found</p>
        </div>
      ) : (
        /* Employee list with attendance status */
        <div className="space-y-1 max-h-[500px] overflow-y-auto -mx-3 px-3">
          {employees.map((emp) => {
            const status = getAttendanceStatusForEmployee(emp);

            return (
              <div
                key={emp.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                  {emp.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {emp.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {emp.department || "—"}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getStatusBadgeClass(status)}`}
                >
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}