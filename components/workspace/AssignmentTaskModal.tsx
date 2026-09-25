"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CheckSquare,
  Building2,
  User,
  Calendar,
  Flag,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getAssignableScopes, assignPageAsTask } from "@/lib/api/workspaceApi";
import {
  AssignableScopesResponse,
  AssigneeType,
  AssignPageAsTaskPayload,
  AssignmentResult,
} from "@/types/workspaceAssignment";

interface AssignmentTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  pageTitle: string;
  onSuccess: (result?: AssignmentResult) => void;
}

export const AssignmentTaskModal: React.FC<AssignmentTaskModalProps> = ({
  isOpen,
  onClose,
  pageId,
  pageTitle,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [mounted, setMounted] = useState<boolean>(false);

  // Form State
  const [assigneeType, setAssigneeType] = useState<AssigneeType>("DEPARTMENT");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [taskTitle, setTaskTitle] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");

  // Scopes State
  const [scopes, setScopes] = useState<AssignableScopesResponse | null>(null);
  const [isLoadingScopes, setIsLoadingScopes] = useState<boolean>(false);
  const [scopesError, setScopesError] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize and fetch assignable scopes when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Reset form fields
    setTaskTitle(pageTitle ? `[Page Task] ${pageTitle}` : "");
    setSelectedDepartment("");
    setSelectedUserId("");
    setDueDate("");
    setPriority("MEDIUM");
    setAssigneeType("DEPARTMENT");
    setSubmitError(null);
    setIsSuccess(false);

    let isSubscribed = true;
    setIsLoadingScopes(true);
    setScopesError(null);

    getAssignableScopes()
      .then((data) => {
        if (!isSubscribed) return;
        setScopes(data);
        if (data.departments && data.departments.length > 0) {
          // Preselect first department for convenience
          setSelectedDepartment(data.departments[0].name);
        }
      })
      .catch((err) => {
        if (!isSubscribed) return;
        console.error("Failed to load assignable scopes:", err);
        let msg = "Failed to load assignable scopes.";
        if (err?.response?.data?.message) {
          msg = err.response.data.message;
        } else if (err?.message) {
          msg = err.message;
        }
        setScopesError(msg);
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoadingScopes(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, pageTitle]);

  // Filter employees strictly by selected department name
  const filteredEmployees = useMemo(() => {
    if (!scopes?.employees || !selectedDepartment) return [];
    return scopes.employees.filter(
      (emp) =>
        emp.department &&
        emp.department.trim().toLowerCase() === selectedDepartment.trim().toLowerCase()
    );
  }, [scopes, selectedDepartment]);

  // Handle department change: update department and clear selected user
  const handleDepartmentChange = (deptName: string) => {
    setSelectedDepartment(deptName);
    setSelectedUserId("");
    setSubmitError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setSubmitError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isSuccess) return;

    // Client-side validations
    const cleanTitle = taskTitle.trim();
    if (!cleanTitle) {
      setSubmitError("Task title cannot be empty");
      return;
    }

    if (!selectedDepartment) {
      setSubmitError("Please select a department");
      return;
    }

    if (assigneeType === "USER" && !selectedUserId) {
      setSubmitError("Please select an individual team member");
      return;
    }

    let isoDueDate: string | undefined = undefined;
    if (dueDate) {
      const parsedDate = new Date(dueDate);
      if (isNaN(parsedDate.getTime())) {
        setSubmitError("Please enter a valid due date");
        return;
      }
      isoDueDate = parsedDate.toISOString();
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload: AssignPageAsTaskPayload = {
      assigneeType,
      targetDepartment: selectedDepartment,
      ...(assigneeType === "USER" ? { targetUserId: selectedUserId } : {}),
      title: cleanTitle,
      dueDate: isoDueDate,
      priority,
    };

    try {
      const result = await assignPageAsTask(pageId, payload);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess(result);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error("Assignment submission error:", err);
      let errorMsg = "Failed to assign page as task";

      if (err?.response?.data) {
        const data = err.response.data;
        if (Array.isArray(data.details) && data.details.length > 0) {
          errorMsg = data.details
            .map((item: any) => item.message || `${item.field}: invalid`)
            .join("; ");
        } else if (data.message) {
          errorMsg = data.message;
        } else if (data.error) {
          errorMsg = String(data.error);
        }
      } else if (err?.message) {
        errorMsg = err.message;
      }

      setSubmitError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Assign Page as Task
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Organization Context */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
            <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
              <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                Organization:
              </span>
              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[240px]">
                {user?.organizationName || user?.organizationId || "Active Organization"}
              </span>
            </div>
            {scopes?.organizationId && (
              <span className="text-[11px] text-slate-400 font-mono truncate max-w-[100px]">
                {scopes.organizationId}
              </span>
            )}
          </div>

          {/* Success Notification */}
          {isSuccess && (
            <div className="flex items-center space-x-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Task created and assigned successfully!</span>
            </div>
          )}

          {/* Error Notification */}
          {(submitError || scopesError) && !isSuccess && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">
                {submitError || scopesError}
              </span>
            </div>
          )}

          {/* Loading Scopes Spinner */}
          {isLoadingScopes ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs">Loading assignable departments & members...</span>
            </div>
          ) : (
            <>
              {/* Assignment Type Toggle */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Assignment Target
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setAssigneeType("DEPARTMENT");
                      setSelectedUserId("");
                      setSubmitError(null);
                    }}
                    className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-bold transition ${
                      assigneeType === "DEPARTMENT"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Department Queue</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAssigneeType("USER");
                      setSubmitError(null);
                    }}
                    className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-bold transition ${
                      assigneeType === "USER"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Individual Member</span>
                  </button>
                </div>
              </div>

              {/* Department Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedDepartment}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    disabled={isSubmitting || !scopes?.departments?.length}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 transition"
                  >
                    <option value="">Select a department...</option>
                    {scopes?.departments?.map((dept) => (
                      <option key={dept.name} value={dept.name}>
                        {dept.name} ({dept.memberCount} {dept.memberCount === 1 ? "member" : "members"})
                      </option>
                    ))}
                  </select>
                </div>
                {scopes?.departments?.length === 0 && !isLoadingScopes && (
                  <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                    No assignable departments available for your role.
                  </p>
                )}
              </div>

              {/* Individual Person Selector (Cascades strictly from Department) */}
              {assigneeType === "USER" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Team Member <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedUserId}
                      onChange={(e) => {
                        setSelectedUserId(e.target.value);
                        setSubmitError(null);
                      }}
                      disabled={isSubmitting || !selectedDepartment || filteredEmployees.length === 0}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 transition"
                    >
                      <option value="">
                        {!selectedDepartment
                          ? "Select a department first..."
                          : filteredEmployees.length === 0
                          ? "No members in this department"
                          : "Select a team member..."}
                      </option>
                      {filteredEmployees.map((emp) => (
                        <option key={emp.userId} value={emp.userId}>
                          {emp.name || emp.email} {emp.role ? `(${emp.role})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedDepartment && filteredEmployees.length === 0 && (
                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                      No members are currently registered under {selectedDepartment}.
                    </p>
                  )}
                </div>
              )}

              {/* Task Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => {
                    setTaskTitle(e.target.value);
                    setSubmitError(null);
                  }}
                  maxLength={255}
                  disabled={isSubmitting}
                  placeholder="e.g. Review workspace specification"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 transition"
                />
              </div>

              {/* Priority and Due Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Priority */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                    <Flag className="w-3.5 h-3.5 text-slate-400" />
                    <span>Priority</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH")
                    }
                    disabled={isSubmitting}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 transition"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Due Date</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      setSubmitError(null);
                    }}
                    disabled={isSubmitting}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 transition"
                  />
                </div>
              </div>
            </>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                isLoadingScopes ||
                isSuccess ||
                !selectedDepartment ||
                (assigneeType === "USER" && !selectedUserId)
              }
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Assign</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
