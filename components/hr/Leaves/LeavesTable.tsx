"use client";

import React, { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  Clock,
  Info,
  X
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
  SICK: "bg-rose-50 text-rose-700 border-rose-200/60",
  CASUAL: "bg-purple-50 text-purple-700 border-purple-200/60",
  EARNED: "bg-blue-50 text-blue-700 border-blue-200/60",
  ANNUAL: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  MATERNITY: "bg-pink-50 text-pink-700 border-pink-200/60",
  WORK_FROM_HOME: "bg-amber-50 text-amber-700 border-amber-200/60",
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
  const [selectedLeave, setSelectedLeave] = useState<LeaveWithEmployee | null>(null);

  const avatarGradients = [
    "from-blue-500 to-indigo-600",
    "from-purple-500 to-pink-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-red-600",
    "from-cyan-500 to-blue-600",
  ];

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <th className="px-5 py-3.5">Employee</th>
              <th className="px-4 py-3.5">Leave Type</th>
              <th className="px-4 py-3.5">Duration</th>
              <th className="px-4 py-3.5">Leave Dates</th>
              <th className="px-4 py-3.5">Reason</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Applied On</th>
              <th className="px-4 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-20">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <Loader2 size={32} className="animate-spin text-blue-600" />
                    <span className="text-sm font-medium">Loading leave requests from database...</span>
                  </div>
                </td>
              </tr>
            ) : leaves.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-20">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 mb-1">
                      <CalendarDays size={28} />
                    </div>
                    <p className="text-sm font-bold text-gray-700">No Leave Requests Found</p>
                    <p className="text-xs text-gray-400 max-w-sm">
                      There are no leave requests matching the active filter criteria. Click &quot;Apply Leave&quot; to file a new request.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              leaves.map((leave, idx) => {
                const emp = leave.employee;
                const name = emp?.user?.name || "Team Member";
                const dept = emp?.department || "General";
                const initials = name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                const gradientClass = avatarGradients[idx % avatarGradients.length];
                const typeKey = leave.type as string;
                const typeLabel = LEAVE_TYPE_LABEL[typeKey] || typeKey;
                const typeColor = LEAVE_TYPE_COLORS[typeKey] || "bg-gray-50 text-gray-700 border-gray-200";

                return (
                  <tr key={leave.id} className="hover:bg-blue-50/20 transition-colors group">
                    {/* Employee */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${gradientClass} flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
                          <span className="text-xs text-gray-400 font-medium">{dept}</span>
                        </div>
                      </div>
                    </td>

                    {/* Leave Type */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${typeColor}`}>
                        {typeLabel}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-3.5 text-sm font-bold text-gray-900">
                      {calcDays(leave.startDate, leave.endDate)}
                    </td>

                    {/* Dates */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                        <Calendar size={13} className="text-gray-400 shrink-0" />
                        <span>{formatDate(leave.startDate)} – {formatDate(leave.endDate)}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 pl-4.5">
                        {dayLabel(leave.startDate)} – {dayLabel(leave.endDate)}
                      </p>
                    </td>

                    {/* Reason */}
                    <td className="px-4 py-3.5 text-xs text-gray-600 max-w-[180px] truncate" title={leave.reason}>
                      {leave.reason || "—"}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={leave.status} />
                    </td>

                    {/* Applied On */}
                    <td className="px-4 py-3.5 text-xs text-gray-500 font-medium">
                      {formatDate(leave.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center">
                      {leave.status === "PENDING" ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onApprove(leave.id)}
                            disabled={!!actionLoading}
                            title="Approve Leave"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                          >
                            {actionLoading === leave.id + "_approve" ? (
                              <Loader2 size={15} className="animate-spin text-emerald-600" />
                            ) : (
                              <CheckCircle2 size={15} />
                            )}
                          </button>
                          <button
                            onClick={() => onReject(leave.id)}
                            disabled={!!actionLoading}
                            title="Reject Leave"
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                          >
                            {actionLoading === leave.id + "_reject" ? (
                              <Loader2 size={15} className="animate-spin text-rose-600" />
                            ) : (
                              <XCircle size={15} />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedLeave(leave)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                          title="View leave review record"
                        >
                          <Info size={13} />
                          <span>Details</span>
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

      {/* Real Leave Details Modal (Replaced fake dead MoreVertical button) */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedLeave.status} />
                <span className="text-xs font-bold text-gray-700">Leave Record</span>
              </div>
              <button 
                onClick={() => setSelectedLeave(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-gray-400 font-medium">Employee:</span>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {selectedLeave.employee?.user?.name || "Team Member"}
                </p>
                <p className="text-gray-500">{selectedLeave.employee?.department || "Department N/A"}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                <div>
                  <span className="text-gray-400 font-medium">Leave Type:</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {LEAVE_TYPE_LABEL[selectedLeave.type] || selectedLeave.type}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Duration:</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {calcDays(selectedLeave.startDate, selectedLeave.endDate)}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-50">
                <span className="text-gray-400 font-medium">Leave Dates:</span>
                <p className="font-semibold text-gray-800 mt-0.5">
                  {formatDate(selectedLeave.startDate)} – {formatDate(selectedLeave.endDate)}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-50">
                <span className="text-gray-400 font-medium">Reason:</span>
                <p className="text-gray-700 mt-0.5 bg-gray-50 p-2 rounded-lg">
                  {selectedLeave.reason || "No reason specified."}
                </p>
              </div>

              {selectedLeave.approvedBy && (
                <div className="pt-2 border-t border-gray-50">
                  <span className="text-gray-400 font-medium">Decision By:</span>
                  <p className="font-semibold text-gray-800 mt-0.5">{selectedLeave.approvedBy}</p>
                  {selectedLeave.approvedAt && (
                    <p className="text-[11px] text-gray-400">{formatDate(selectedLeave.approvedAt)}</p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedLeave(null)}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}