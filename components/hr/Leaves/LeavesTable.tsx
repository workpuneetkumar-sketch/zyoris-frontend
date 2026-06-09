"use client";

import React from "react";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { LeaveRequest } from "@/lib/api/hrApi";
import StatusBadge from "./StatusBadge";

interface LeaveWithEmployee extends LeaveRequest {
  employee?: {
    id: string;
    department: string;
    user?: {
      name: string;
      email: string;
      designation?: string;
    };
  };
}

const LEAVE_TYPE_COLORS: Record<string, string> = {
  SICK: "bg-red-100 text-red-700",
  CASUAL: "bg-purple-100 text-purple-700",
  EARNED: "bg-blue-100 text-blue-700",
  ANNUAL: "bg-green-100 text-green-700",
  MATERNITY: "bg-pink-100 text-pink-700",
  WORK_FROM_HOME: "bg-orange-100 text-orange-700",
};

const LEAVE_TYPE_LABEL: Record<string, string> = {
  SICK: "Sick Leave",
  CASUAL: "Casual Leave",
  EARNED: "Earned Leave",
  ANNUAL: "Annual Leave",
  MATERNITY: "Maternity Leave",
  WORK_FROM_HOME: "Work From Home",
};

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calcDays(start: string, end: string) {
  if (!start || !end) return "—";
  const diff =
    Math.round(
      (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
  return `${diff} ${diff === 1 ? "Day" : "Days"}`;
}

function dayLabel(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
}

interface LeavesTableProps {
  leaves: LeaveWithEmployee[];
  loading: boolean;
  actionLoading: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export default function LeavesTable({
  leaves,
  loading,
  actionLoading,
  onApprove,
  onReject,
}: LeavesTableProps) {
  const avatarColors = [
    "bg-blue-500", "bg-purple-500", "bg-green-500",
    "bg-orange-500", "bg-pink-500", "bg-teal-500",
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50/70 border-b border-gray-100">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Leave Type</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Leave Dates</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Applied On</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? (
            <tr>
              <td colSpan={8} className="text-center py-16">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <Loader2 size={28} className="animate-spin text-blue-500" />
                  <span className="text-sm">Loading leave requests...</span>
                </div>
              </td>
            </tr>
          ) : leaves.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-16">
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <CalendarDays size={36} className="text-gray-200" />
                  <p className="text-sm font-medium text-gray-500">No leave requests found</p>
                  <p className="text-xs text-gray-400">
                    Click + Apply Leave to submit a request.
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            leaves.map((leave, idx) => {
              const emp = leave.employee;
              const name = emp?.user?.name || "Unknown";
              const dept = emp?.department || "—";
              const initials = name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              const colorClass = avatarColors[idx % avatarColors.length];
              const typeKey = leave.type as string;
              const typeLabel = LEAVE_TYPE_LABEL[typeKey] || typeKey;
              const typeColor = LEAVE_TYPE_COLORS[typeKey] || "bg-gray-100 text-gray-600";

              return (
                <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${colorClass} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{name}</p>
                        <p className="text-xs text-gray-400">{dept}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${typeColor}`}>
                      {typeLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-700 font-medium">
                    {calcDays(leave.startDate, leave.endDate)}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-gray-700">
                      {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {dayLabel(leave.startDate)} – {dayLabel(leave.endDate)}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-600 max-w-[160px] truncate">
                    {leave.reason || "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={leave.status} />
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-500">
                    {formatDate(leave.createdAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    {leave.status === "PENDING" ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onApprove(leave.id)}
                          disabled={!!actionLoading}
                          title="Approve"
                          className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === leave.id + "_approve" ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => onReject(leave.id)}
                          disabled={!!actionLoading}
                          title="Reject"
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === leave.id + "_reject" ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <XCircle size={14} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}