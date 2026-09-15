// app/(dashboard)/hr/attendance/page.tsx

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  LogIn,
  LogOut,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  Timer,
  X,
} from "lucide-react";
import {
  getEmployees,
  checkIn,
  checkOut,
  fetchAttendance,
  fetchTodaySummary,
  fetchLeaves,
  type Employee,
  type Attendance,
  type HRStats,
  type LeaveRequest,
} from "@/lib/api/hrApi";
import HRCalendar from "@/components/hr/attendance/HRCalendar";
import HRCheckInOut from "@/components/hr/attendance/HRCheckInOut";
import HREmployeeAttendanceList from "@/components/hr/attendance/HREmployeeAttendanceList";

// ── Helpers ──────────────────────────────────────────────

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getDaysBetween(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);

  while (current <= endDate) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// ── Sub-components ───────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${bgColor} ${color}`}>{icon}</div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 animate-pulse">
      <div className="h-4 w-16 bg-gray-200 rounded mb-2" />
      <div className="h-8 w-12 bg-gray-200 rounded" />
    </div>
  );
}

// ── Types ────────────────────────────────────────────────

interface CurrentUserAttendance {
  checkedIn: boolean;
  checkedOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string | null;
}

// ── Main Component ───────────────────────────────────────

export default function HRAttendancePage() {
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // ── State ──────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [monthAttendance, setMonthAttendance] = useState<Attendance[]>([]);
  const [selectedDateAttendance, setSelectedDateAttendance] = useState<
    Attendance[]
  >([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRequest[]>([]);
  const [summary, setSummary] = useState<HRStats | null>(null);
  const [currentUserAttendance, setCurrentUserAttendance] =
    useState<CurrentUserAttendance>({
      checkedIn: false,
      checkedOut: false,
      checkInTime: null,
      checkOutTime: null,
      status: null,
    });

  // UI states
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingMonthAttendance, setIsLoadingMonthAttendance] =
    useState(false);
  const [isLoadingSelectedDate, setIsLoadingSelectedDate] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Derived State ──────────────────────────────────────

  const user = useMemo(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const userId = user?.id || user?.userId;

  const currentEmployee = useMemo(() => {
    if (!userId || employees.length === 0) return null;
    return (
      employees.find(
        (emp) => emp.userId === userId
      ) || null
    );
  }, [employees, userId]);

  const leaveDates = useMemo(() => {
    const dates = new Set<string>();
    leaveRecords
      .filter((leave) => leave.status === "APPROVED")
      .forEach((leave) => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        getDaysBetween(start, end).forEach((dateStr) => {
          dates.add(dateStr);
        });
      });
    return dates;
  }, [leaveRecords]);

  // ── Data Fetching ──────────────────────────────────────

  const loadEmployees = useCallback(async () => {
    try {
      setIsLoadingEmployees(true);
      const data = await getEmployees();
      setEmployees(data);
    } catch (err: any) {
      console.error("Failed to load employees:", err);
      setError(err.message || "Failed to load employees");
    } finally {
      setIsLoadingEmployees(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      setIsLoadingSummary(true);
      const data = await fetchTodaySummary();
      setSummary(data);
    } catch (err: any) {
      console.error("Failed to load summary:", err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  const loadMonthAttendance = useCallback(
    async (year: number, month: number) => {
      try {
        setIsLoadingMonthAttendance(true);
        const startDate = formatDate(new Date(year, month, 1));
        const endDate = formatDate(new Date(year, month + 1, 0));
        const records = await fetchAttendance({ startDate, endDate });
        setMonthAttendance(records);
      } catch (err: any) {
        console.error("Failed to load month attendance:", err);
      } finally {
        setIsLoadingMonthAttendance(false);
      }
    },
    []
  );

  const loadSelectedDateAttendance = useCallback(async (date: Date) => {
    try {
      setIsLoadingSelectedDate(true);
      const dateStr = formatDate(date);
      const records = await fetchAttendance({
        startDate: dateStr,
        endDate: dateStr,
      });
      setSelectedDateAttendance(records);
    } catch (err: any) {
      console.error("Failed to load selected date attendance:", err);
    } finally {
      setIsLoadingSelectedDate(false);
    }
  }, []);

  const loadLeaves = useCallback(async (year: number, month: number) => {
    try {
      setIsLoadingLeaves(true);
      const startDate = formatDate(new Date(year, month, 1));
      const endDate = formatDate(new Date(year, month + 1, 0));
      const leaves = await fetchLeaves({
        startDate,
        endDate,
        status: "APPROVED",
      });
      setLeaveRecords(leaves);
    } catch (err: any) {
      console.error("Failed to load leaves:", err);
    } finally {
      setIsLoadingLeaves(false);
    }
  }, []);

  const loadCurrentUserAttendance = useCallback(async () => {
    if (!currentEmployee) return;

    try {
      const todayStr = formatDate(new Date());
      const records = await fetchAttendance({
        employeeId: currentEmployee.id,
        startDate: todayStr,
        endDate: todayStr,
      });

      if (records.length > 0) {
        const todayRecord = records[0];
        setCurrentUserAttendance({
          checkedIn: !!todayRecord.checkIn,
          checkedOut: !!todayRecord.checkOut,
          checkInTime: todayRecord.checkIn || null,
          checkOutTime: todayRecord.checkOut || null,
          status: todayRecord.status || null,
        });
      } else {
        setCurrentUserAttendance({
          checkedIn: false,
          checkedOut: false,
          checkInTime: null,
          checkOutTime: null,
          status: null,
        });
      }
    } catch (err: any) {
      console.error("Failed to load current user attendance:", err);
    }
  }, [currentEmployee]);

  // ── Effects ────────────────────────────────────────────

  useEffect(() => {
    loadEmployees();
    loadSummary();
  }, [loadEmployees, loadSummary]);

  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    loadMonthAttendance(year, month);
    loadLeaves(year, month);
  }, [currentDate, loadMonthAttendance, loadLeaves]);

  useEffect(() => {
    loadSelectedDateAttendance(selectedDate);
  }, [selectedDate, loadSelectedDateAttendance]);

  useEffect(() => {
    if (currentEmployee) {
      loadCurrentUserAttendance();
    } else if (!isLoadingEmployees) {
      setCurrentUserAttendance({
        checkedIn: false,
        checkedOut: false,
        checkInTime: null,
        checkOutTime: null,
        status: null,
      });
    }
  }, [currentEmployee, isLoadingEmployees, loadCurrentUserAttendance]);

  // ── Navigation ─────────────────────────────────────────

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  }, []);

  // ── Actions ────────────────────────────────────────────

  const refreshAll = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    await Promise.all([
      loadSummary(),
      loadMonthAttendance(year, month),
      loadSelectedDateAttendance(selectedDate),
      loadCurrentUserAttendance(),
    ]);
  }, [
    loadSummary,
    loadMonthAttendance,
    loadSelectedDateAttendance,
    loadCurrentUserAttendance,
    currentDate,
    selectedDate,
  ]);

  const handleCheckIn = useCallback(async () => {
    if (!currentEmployee) {
      setError("Employee profile not found. Please contact HR.");
      return;
    }

    try {
      setIsCheckingIn(true);
      setError(null);
      await checkIn({ employeeId: currentEmployee.id });
      await refreshAll();
    } catch (err: any) {
      const message = err.message || "Failed to check in. Please try again.";
      setError(message);
      console.error("Check-in error:", err);
    } finally {
      setIsCheckingIn(false);
    }
  }, [currentEmployee, refreshAll]);

  const handleCheckOut = useCallback(async () => {
    if (!currentEmployee) {
      setError("Employee profile not found. Please contact HR.");
      return;
    }

    try {
      setIsCheckingOut(true);
      setError(null);
      await checkOut({ employeeId: currentEmployee.id });
      await refreshAll();
    } catch (err: any) {
      const message = err.message || "Failed to check out. Please try again.";
      setError(message);
      console.error("Check-out error:", err);
    } finally {
      setIsCheckingOut(false);
    }
  }, [currentEmployee, refreshAll]);

  // ── Derived display values ─────────────────────────────

  const isTodaySelected = isSameDay(selectedDate, today);
  const isFutureDate = selectedDate > today;

  const selectedDateFormatted = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const todayFormatted = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* ── Header ─────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track employee attendance, check-ins, and daily status.
          </p>
        </div>

        {/* ── Error Alert ────────────────────────────── */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 flex-shrink-0 transition-colors"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Today Summary Cards ────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {isLoadingSummary
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : (
              <>
                <SummaryCard
                  icon={<Users className="h-5 w-5" />}
                  label="Total Employees"
                  value={summary?.totalEmployees ?? 0}
                  color="text-blue-600"
                  bgColor="bg-blue-100"
                />
                <SummaryCard
                  icon={<LogIn className="h-5 w-5" />}
                  label="Checked In"
                  value={summary?.checkedIn ?? 0}
                  color="text-emerald-600"
                  bgColor="bg-emerald-100"
                />
                <SummaryCard
                  icon={<LogOut className="h-5 w-5" />}
                  label="Checked Out"
                  value={summary?.checkedOut ?? 0}
                  color="text-violet-600"
                  bgColor="bg-violet-100"
                />
                <SummaryCard
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  label="On Time"
                  value={summary?.onTime ?? 0}
                  color="text-emerald-600"
                  bgColor="bg-emerald-100"
                />
                <SummaryCard
                  icon={<Timer className="h-5 w-5" />}
                  label="Late"
                  value={summary?.late ?? 0}
                  color="text-amber-600"
                  bgColor="bg-amber-100"
                />
                <SummaryCard
                  icon={<UserX className="h-5 w-5" />}
                  label="Absent"
                  value={summary?.absent ?? 0}
                  color="text-red-600"
                  bgColor="bg-red-100"
                />
              </>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left Column ──────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">
            {/* ── Current User Attendance Card ────────── */}
            <HRCheckInOut
              currentEmployee={currentEmployee}
              currentUserAttendance={currentUserAttendance}
              isCheckingIn={isCheckingIn}
              isCheckingOut={isCheckingOut}
              isLoadingEmployees={isLoadingEmployees}
              todayFormatted={todayFormatted}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
            />

            {/* ── Calendar View ───────────────────────── */}
            <HRCalendar
              currentDate={currentDate}
              selectedDate={selectedDate}
              today={today}
              monthAttendance={monthAttendance}
              leaveDates={leaveDates}
              isLoadingMonthAttendance={isLoadingMonthAttendance}
              onPreviousMonth={goToPreviousMonth}
              onNextMonth={goToNextMonth}
              onToday={goToToday}
              onSelectDate={setSelectedDate}
            />
          </div>

          {/* ── Right Column: Admin Attendance Table ──── */}
          <div className="lg:col-span-1">
            <HREmployeeAttendanceList
              employees={employees}
              selectedDateAttendance={selectedDateAttendance}
              isLoadingEmployees={isLoadingEmployees}
              isLoadingSelectedDate={isLoadingSelectedDate}
              isFutureDate={isFutureDate}
              isTodaySelected={isTodaySelected}
              selectedDateFormatted={selectedDateFormatted}
            />
          </div>
        </div>
      </div>
    </div>
  );
}