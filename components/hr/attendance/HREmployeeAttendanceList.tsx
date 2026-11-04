// components/hr/attendance/HREmployeeAttendanceList.tsx

"use client";

import { useMemo } from "react";
import { Calendar, Users, Clock } from "lucide-react";

// ── Types ────────────────────────────────────────────────

interface Employee {
  id: string;
  userId?: string;
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

function formatTime(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function getStatusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "present" || normalized === "checked out" || normalized === "completed")
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (normalized === "checked in")
    return "bg-blue-50 text-blue-700 border border-blue-200";
  if (normalized === "late")
    return "bg-amber-50 text-amber-700 border border-amber-200";
  if (normalized === "absent")
    return "bg-red-50 text-red-700 border border-red-200";
  if (normalized === "half day")
    return "bg-orange-50 text-orange-700 border border-orange-200";
  if (normalized === "on leave" || normalized === "leave")
    return "bg-purple-50 text-purple-700 border border-purple-200";
  return "bg-gray-50 text-gray-700 border border-gray-200";
}

interface CurrentUserAttendance {
  checkedIn: boolean;
  checkedOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string | null;
}

// ── Props ────────────────────────────────────────────────

interface HREmployeeAttendanceListProps {
  employees: Employee[];
  selectedDateAttendance: Attendance[];
  currentUserAttendance?: CurrentUserAttendance;
  currentEmployee?: Employee | null;
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
  currentUserAttendance,
  currentEmployee,
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
      const anyRec = record as any;
      if (anyRec.employee?.id) {
        map.set(anyRec.employee.id, record);
      }
      if (anyRec.employee?.userId) {
        map.set(anyRec.employee.userId, record);
      }
      if (anyRec.employee?.email) {
        map.set(anyRec.employee.email.toLowerCase(), record);
      }
      if (anyRec.employee?.user?.email) {
        map.set(anyRec.employee.user.email.toLowerCase(), record);
      }
    });
    return map;
  }, [selectedDateAttendance]);

  // ── Helpers ────────────────────────────────────────────

  function getAttendanceDetails(emp: Employee) {
    const isEmpCurrent =
      Boolean(currentEmployee) &&
      (emp.id === currentEmployee?.id ||
        (emp.userId && emp.userId === currentEmployee?.userId) ||
        (emp.email && currentEmployee?.email && emp.email.toLowerCase() === currentEmployee.email.toLowerCase()));

    if (isTodaySelected && isEmpCurrent && currentUserAttendance?.checkedIn) {
      return {
        status: currentUserAttendance.status || "Present",
        checkInTime: formatTime(currentUserAttendance.checkInTime),
        checkOutTime: currentUserAttendance.checkOutTime ? formatTime(currentUserAttendance.checkOutTime) : null,
      };
    }

    const record =
      employeeAttendanceMap.get(emp.id) ||
      (emp.userId ? employeeAttendanceMap.get(emp.userId) : undefined) ||
      (emp.email ? employeeAttendanceMap.get(emp.email.toLowerCase()) : undefined);

    if (!record || !record.checkIn) {
      return {
        status: "Absent",
        checkInTime: null,
        checkOutTime: null,
      };
    }

    const checkInTime = formatTime(record.checkIn);
    const checkOutTime = record.checkOut ? formatTime(record.checkOut) : null;

    let status = record.status || "Present";
    if (status.toUpperCase() === "PRESENT") {
      status = "Present";
    }

    return {
      status,
      checkInTime,
      checkOutTime,
    };
  }

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 lg:sticky lg:top-8">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-gray-900">
          {isTodaySelected ? "Today's Attendance" : selectedDateFormatted}
        </h2>
      </div>
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
        /* Employee list with attendance status and check-in / check-out times */
        <div className="space-y-2 max-h-[520px] overflow-y-auto -mx-2 px-2">
          {employees.map((emp) => {
            const { status, checkInTime, checkOutTime } = getAttendanceDetails(emp);

            return (
              <div
                key={emp.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50/70 hover:bg-blue-50/30 border border-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 shadow-sm flex-shrink-0">
                    {emp.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {emp.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
                      <span className="truncate">{emp.department || "General"}</span>
                      {checkInTime && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-blue-600 font-medium">
                            In: {checkInTime}
                          </span>
                        </>
                      )}
                      {checkOutTime && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-emerald-600 font-medium">
                            Out: {checkOutTime}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadgeClass(status)}`}
                  >
                    {status}
                  </span>
                  {checkOutTime ? (
                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5 text-gray-400" />
                      {checkOutTime}
                    </span>
                  ) : checkInTime ? (
                    <span className="text-[10px] text-blue-500 font-medium flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5 text-blue-400" />
                      Working
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
