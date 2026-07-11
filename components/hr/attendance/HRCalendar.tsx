// components/HRCalendar.tsx

"use client";

import { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  status: "present" | "absent" | "leave" | "future" | "no-record";
}

interface Attendance {
  id?: string;
  employeeId?: string;
  attendanceDate?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
}

// ── Constants ────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Helpers ──────────────────────────────────────────────

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getStartDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// ── Sub-component ────────────────────────────────────────

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

// ── Props ────────────────────────────────────────────────

interface HRCalendarProps {
  currentDate: Date;
  selectedDate: Date;
  today: Date;
  monthAttendance: Attendance[];
  leaveDates: Set<string>;
  isLoadingMonthAttendance: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onSelectDate: (date: Date) => void;
}

// ── Main Component ───────────────────────────────────────

export default function HRCalendar({
  currentDate,
  selectedDate,
  today,
  monthAttendance,
  leaveDates,
  isLoadingMonthAttendance,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onSelectDate,
}: HRCalendarProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // ── Date Status Logic ─────────────────────────────────

  function getStatusColor(status: CalendarDay["status"]): string {
    switch (status) {
      case "present":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200";
      case "absent":
        return "bg-red-100 text-red-700 border-red-200 hover:bg-red-200";
      case "leave":
        return "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200";
      case "future":
        return "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed";
      case "no-record":
      default:
        return "bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100";
    }
  }

  function getStatusDot(status: CalendarDay["status"]): string {
    switch (status) {
      case "present":
        return "bg-emerald-500";
      case "absent":
        return "bg-red-500";
      case "leave":
        return "bg-amber-500";
      default:
        return "bg-gray-200";
    }
  }

  // ── Calendar Grid ──────────────────────────────────────

  const calendarDays: (CalendarDay | null)[] = useMemo(() => {
    const getDateStatus = (date: Date): CalendarDay["status"] => {
      const dateStr = formatDate(date);

      // Future dates
      if (date > today) return "future";

      // Check approved leaves
      if (leaveDates.has(dateStr)) return "leave";

      // Check attendance records
      const record = monthAttendance.find((r) => {
        if (!r.attendanceDate) return false;
        const recordDate = new Date(r.attendanceDate);
        return isSameDay(recordDate, date);
      });

      if (record) {
        if (record.status === "Absent") return "absent";
        if (record.checkIn) return "present";
      }

      // Past dates without record are considered absent
      if (date < today) return "absent";

      // Today without record
      return "no-record";
    };

    const days: (CalendarDay | null)[] = [];
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getStartDayOfMonth(year, month);

    // Previous month padding
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        day,
        isCurrentMonth: true,
        isToday: isSameDay(date, today),
        status: getDateStatus(date),
      });
    }

    // Fill remaining cells to make 6 rows
    const remaining = 42 - days.length;
    for (let i = 0; i < remaining; i++) {
      days.push(null);
    }

    return days;
  }, [year, month, today, monthAttendance, leaveDates]);

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {MONTH_NAMES[month]} {year}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onPreviousMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={onNextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={onToday}
            className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Desktop Legend */}
        <div className="hidden sm:flex items-center gap-3">
          <LegendItem color="bg-emerald-500" label="Present" />
          <LegendItem color="bg-red-500" label="Absent" />
          <LegendItem color="bg-amber-500" label="Leave" />
          <LegendItem color="bg-gray-200" label="No Record" />
        </div>
      </div>

      {/* Mobile Legend */}
      <div className="flex items-center gap-3 mb-4 sm:hidden flex-wrap">
        <LegendItem color="bg-emerald-500" label="Present" />
        <LegendItem color="bg-red-500" label="Absent" />
        <LegendItem color="bg-amber-500" label="Leave" />
        <LegendItem color="bg-gray-200" label="No Record" />
      </div>

      {/* Loading overlay for calendar */}
      {isLoadingMonthAttendance && (
        <div className="flex items-center justify-center py-4 mb-2">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">
            Loading attendance data...
          </span>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {DAY_NAMES.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 py-2"
          >
            {day}
          </div>
        ))}

        {/* Days */}
        {calendarDays.map((dayData, index) => {
          if (!dayData) {
            return (
              <div key={`empty-${index}`} className="aspect-square p-1" />
            );
          }

          const { day, isToday, status } = dayData;
          const isSelected = isSameDay(dayData.date, selectedDate);

          return (
            <button
              key={`day-${index}`}
              onClick={() => {
                if (status !== "future") {
                  onSelectDate(dayData.date);
                }
              }}
              disabled={status === "future"}
              className={`aspect-square p-1 rounded-lg text-sm font-medium transition-all
                ${getStatusColor(status)}
                ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}
                ${isToday ? "font-bold" : ""}
              `}
              aria-label={`${MONTH_NAMES[dayData.date.getMonth()]} ${day}, ${dayData.date.getFullYear()} - ${status}`}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <span>{day}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${getStatusDot(status)}`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}