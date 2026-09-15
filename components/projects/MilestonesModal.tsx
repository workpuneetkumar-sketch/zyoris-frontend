"use client";

import React, { useEffect, useState, useCallback } from "react";
import { X, Plus, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import {
  getMilestones,
  createMilestone,
  Milestone,
  CreateMilestonePayload,
} from "@/lib/api/projectsApi";

interface MilestonesModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  showToast: (type: "success" | "error", message: string) => void;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  PENDING: {
    label: "Pending",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: (
      <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-100" />
    ),
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: (
      <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-100" />
    ),
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: (
      <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
    ),
  },
};

export default function MilestonesModal({
  projectId,
  projectName,
  onClose,
  showToast,
}: MilestonesModalProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("PENDING");

  const loadMilestones = useCallback(async () => {
    try {
      const data = await getMilestones(projectId);
      setMilestones(data);
    } catch (err: any) {
      showToast("error", err.message || "Failed to load milestones");
    } finally {
      setLoading(false);
    }
  }, [projectId, showToast]);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setStatus("PENDING");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const payload: CreateMilestonePayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,   // ✅ now allowed by the optional type
        status,
      };
      const created = await createMilestone(projectId, payload);
      setMilestones((prev) => [...prev, created]);
      resetForm();
      setShowForm(false);
      showToast("success", "Milestone created");
    } catch (err: any) {
      showToast("error", err.message || "Failed to create milestone");
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Milestones</h2>
            <p className="text-sm text-gray-500">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Toggle button */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full flex items-center justify-between gap-2 px-5 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-indigo-700 font-semibold text-sm transition-colors"
          >
            <span className="flex items-center gap-2">
              <Plus size={18} />
              {showForm ? "Cancel" : "Add Milestone"}
            </span>
            {showForm ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {/* Form – always mounted, hidden with CSS */}
          <div className={showForm ? "" : "hidden"}>
            <form
              onSubmit={handleCreate}
              className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g., Design phase complete"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {creating && <Loader2 size={16} className="animate-spin" />}
                  {creating ? "Adding..." : "Add Milestone"}
                </button>
              </div>
            </form>
          </div>

          {/* Existing milestones */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
            </div>
          ) : milestones.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🎯</div>
              <p className="text-gray-500 font-medium">No milestones yet</p>
              <p className="text-sm text-gray-400">
                Click “Add Milestone” to create your first one.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((m) => {
                const statusInfo = STATUS_MAP[m.status] || STATUS_MAP.PENDING;
                return (
                  <div
                    key={m.id}
                    className="relative pl-4 border-l-2 border-gray-200 hover:border-indigo-300 transition-colors"
                  >
                    <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-white border-2 border-gray-200" />
                    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {m.title}
                          </h4>
                          {m.description && (
                            <p className="text-sm text-gray-500 mt-1">
                              {m.description}
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}
                        >
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                        <span>📅 {formatDate(m.dueDate)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}