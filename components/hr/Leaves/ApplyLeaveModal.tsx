"use client";

import React, { useState } from "react";
import { X, CheckCheck, XCircle, Loader2 } from "lucide-react";
import { applyLeave } from "@/lib/api/hrApi";

const HARDCODED_EMPLOYEE_ID = "cmq0vv9qj04gtf66zrxc37mq3";

interface ApplyLeaveModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApplyLeaveModal({ onClose, onSuccess }: ApplyLeaveModalProps) {
  const [form, setForm] = useState({
    type: "CASUAL" as "SICK" | "CASUAL" | "EARNED",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      setError("All fields are required.");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError("End date cannot be before start date.");
      return;
    }
    setLoading(true);
    try {
      await applyLeave({
        employeeId: HARDCODED_EMPLOYEE_ID,
        startDate: form.startDate,
        endDate: form.endDate,
        type: form.type,
        reason: form.reason,
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (e: any) {
      setError(e.message || "Failed to apply for leave.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Apply for Leave</h2>
            <p className="text-sm text-gray-500 mt-0.5">Submit a new leave request</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
              <CheckCheck size={16} />
              Leave applied successfully!
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              <XCircle size={16} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Leave Type</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as "SICK" | "CASUAL" | "EARNED" })}
            >
              <option value="SICK">Sick Leave</option>
              <option value="CASUAL">Casual Leave</option>
              <option value="EARNED">Earned Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
            <textarea
              rows={3}
              placeholder="Provide a reason for leave..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || success}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}