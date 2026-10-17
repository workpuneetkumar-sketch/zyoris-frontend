"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, CheckCheck, XCircle, Loader2, Calendar, User, FileText, Clock } from "lucide-react";
import { applyLeave, getEmployees, Employee, LeaveRequest } from "@/lib/api/hrApi";

interface ApplyLeaveModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApplyLeaveModal({ onClose, onSuccess }: ApplyLeaveModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);

  const [form, setForm] = useState({
    type: "CASUAL" as LeaveRequest["type"],
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadRealEmployees() {
      try {
        setLoadingEmployees(true);
        const data = await getEmployees();
        if (isMounted && Array.isArray(data)) {
          setEmployees(data);
          
          // Try to match current logged in user from localStorage
          let currentId = "";
          try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
              const u = JSON.parse(userStr);
              const matched = data.find((emp) => emp.userId === u.id || emp.id === u.employeeId || emp.email === u.email);
              if (matched) currentId = matched.id;
            }
          } catch {}

          if (!currentId && data.length > 0) {
            currentId = data[0].id;
          }
          setSelectedEmployeeId(currentId);
        }
      } catch (err) {
        console.error("Failed to fetch employees:", err);
      } finally {
        if (isMounted) setLoadingEmployees(false);
      }
    }

    loadRealEmployees();
    return () => { isMounted = false; };
  }, []);

  const daysCount = useMemo(() => {
    if (!form.startDate || !form.endDate) return 0;
    const start = new Date(form.startDate).getTime();
    const end = new Date(form.endDate).getTime();
    if (end < start) return 0;
    return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }, [form.startDate, form.endDate]);

  const handleSubmit = async () => {
    setError("");
    if (!selectedEmployeeId) {
      setError("Please select an employee.");
      return;
    }
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    setLoading(true);
    try {
      await applyLeave({
        employeeId: selectedEmployeeId,
        startDate: form.startDate,
        endDate: form.endDate,
        type: form.type,
        reason: form.reason.trim(),
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (e: any) {
      setError(e.message || "Failed to submit leave request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">Apply for Leave</h2>
              <p className="text-xs text-gray-500">Submit a leave request for managerial approval</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-semibold">
              <CheckCheck size={16} className="text-emerald-600 shrink-0" />
              <span>Leave request submitted successfully! Synchronizing...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-800 text-xs font-semibold">
              <XCircle size={16} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Employee Selection (Real live directory) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User size={13} className="text-gray-400" />
                Employee Name *
              </span>
              {loadingEmployees && (
                <span className="text-[11px] font-normal text-blue-600 flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin" /> Loading team...
                </span>
              )}
            </label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-2xs font-medium"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              disabled={loadingEmployees}
            >
              {employees.length === 0 && !loadingEmployees ? (
                <option value="">No employees found in directory</option>
              ) : (
                employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.department ? `(${emp.department})` : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Leave Type */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText size={13} className="text-gray-400" />
              Leave Type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "CASUAL", label: "Casual Leave" },
                { key: "SICK", label: "Sick Leave" },
                { key: "EARNED", label: "Earned Leave" },
              ].map((item) => (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => setForm({ ...form, type: item.key as LeaveRequest["type"] })}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                    form.type === item.key
                      ? "border-blue-600 bg-blue-50/70 text-blue-700 shadow-2xs"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Start Date *
              </label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-2xs"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                End Date *
              </label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-2xs"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>

          {/* Duration Preview */}
          {daysCount > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-800 font-semibold">
              <Clock size={14} className="text-blue-600" />
              <span>Calculated Duration: <strong>{daysCount} {daysCount === 1 ? "Day" : "Days"}</strong></span>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Reason for Absence *
            </label>
            <textarea
              rows={3}
              placeholder="State the reason for taking leave (e.g., personal errands, medical, family event)..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-2xs"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button 
            type="button"
            onClick={onClose} 
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || success || loadingEmployees}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            <span>{loading ? "Submitting..." : "Submit Leave Request"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}