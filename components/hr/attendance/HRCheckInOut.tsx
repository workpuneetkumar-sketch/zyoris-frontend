// components/HRCheckInOut.tsx

"use client";

import {
  Clock,
  LogIn,
  LogOut,
  Loader2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────

interface CurrentUserAttendance {
  checkedIn: boolean;
  checkedOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string | null;
}

interface Employee {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  department?: string;
  position?: string;
}

// ── Helpers ──────────────────────────────────────────────

function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

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

interface HRCheckInOutProps {
  currentEmployee: Employee | null;
  currentUserAttendance: CurrentUserAttendance;
  isCheckingIn: boolean;
  isCheckingOut: boolean;
  isLoadingEmployees: boolean;
  todayFormatted: string;
  onCheckIn: () => void;
  onCheckOut: () => void;
}

// ── Main Component ───────────────────────────────────────

export default function HRCheckInOut({
  currentEmployee,
  currentUserAttendance,
  isCheckingIn,
  isCheckingOut,
  isLoadingEmployees,
  todayFormatted,
  onCheckIn,
  onCheckOut,
}: HRCheckInOutProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {currentEmployee?.name || "My Attendance"}
            </h2>
            <p className="text-sm text-gray-500">{todayFormatted}</p>
          </div>
        </div>
        {currentUserAttendance.status && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusBadgeClass(currentUserAttendance.status)}`}
          >
            {currentUserAttendance.status}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[120px]">
          <p className="text-xs text-gray-500 mb-1">Check In</p>
          <p className="text-sm font-medium text-gray-900">
            {currentUserAttendance.checkInTime
              ? formatTime(currentUserAttendance.checkInTime)
              : "Not checked in"}
          </p>
        </div>
        <div className="flex-1 min-w-[120px]">
          <p className="text-xs text-gray-500 mb-1">Check Out</p>
          <p className="text-sm font-medium text-gray-900">
            {currentUserAttendance.checkOutTime
              ? formatTime(currentUserAttendance.checkOutTime)
              : "Not checked out"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCheckIn}
            disabled={
              isCheckingIn ||
              currentUserAttendance.checkedIn ||
              !currentEmployee
            }
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                currentUserAttendance.checkedIn
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isCheckingIn ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {currentUserAttendance.checkedIn ? "Checked In" : "Check In"}
          </button>
          <button
            onClick={onCheckOut}
            disabled={
              isCheckingOut ||
              !currentUserAttendance.checkedIn ||
              currentUserAttendance.checkedOut ||
              !currentEmployee
            }
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                !currentUserAttendance.checkedIn ||
                currentUserAttendance.checkedOut
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isCheckingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {currentUserAttendance.checkedOut ? "Checked Out" : "Check Out"}
          </button>
        </div>
      </div>

      {!currentEmployee && !isLoadingEmployees && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700">
            Your employee profile is not set up yet. Please contact HR.
          </p>
        </div>
      )}
    </div>
  );
}