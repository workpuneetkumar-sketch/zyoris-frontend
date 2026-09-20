// components/tasks/MyTasksView.tsx
"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw,
  Bell,
  X,
  ExternalLink,
  ChevronRight,
  FolderKanban,
  FileText,
  Briefcase,
  Users,
  Check,
  AlertTriangle,
  Loader2,
  ChevronDown,
  Layers,
  Sparkles,
  Inbox,
  FileSpreadsheet,
  FileType,
  Code,
} from "lucide-react";
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskAssignmentEvent,
} from "@/lib/api/tasksApi";
import {
  MyTaskBucket,
  TaskCounts,
  getTaskBucket,
} from "@/hooks/useMyTasks";
import {
  ExportFormat,
  createExport,
  quickExport,
  downloadExportResult,
  exportTasksToClientFile,
  FORMAT_EXTENSIONS,
} from "@/lib/api/exportApi";
import { ExportModal } from "@/components/workspace/ExportModal";
import {
  STATUS_STYLES,
  STATUS_LABELS,
  PRIORITY_STYLES,
} from "./TasksUI";

interface MyTasksViewProps {
  tasks: Task[];
  filteredTasks: Task[];
  counts: TaskCounts;
  loading: boolean;
  error: string | null;
  bucket: MyTaskBucket;
  priorityFilter: string;
  search: string;
  statusUpdatingId: string | null;
  permissionError: string | null;
  newAssignmentsCount: number;
  assignmentEvents: TaskAssignmentEvent[];
  isEventsDrawerOpen: boolean;
  onSelectBucket: (b: MyTaskBucket) => void;
  onPriorityFilterChange: (p: string) => void;
  onSearchChange: (s: string) => void;
  onClearPermissionError: () => void;
  onToggleEventsDrawer: (open: boolean) => void;
  onDismissNotificationBanner: () => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => Promise<boolean>;
  onRefresh: () => void;
  onOpenTaskDetail?: (task: Task) => void;
}

export const MyTasksView: React.FC<MyTasksViewProps> = ({
  tasks,
  filteredTasks,
  counts,
  loading,
  error,
  bucket,
  priorityFilter,
  search,
  statusUpdatingId,
  permissionError,
  newAssignmentsCount,
  assignmentEvents,
  isEventsDrawerOpen,
  onSelectBucket,
  onPriorityFilterChange,
  onSearchChange,
  onClearPermissionError,
  onToggleEventsDrawer,
  onDismissNotificationBanner,
  onUpdateStatus,
  onRefresh,
  onOpenTaskDetail,
}) => {
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalEntity, setExportModalEntity] = useState<{
    type: "TASK" | "PROJECT" | "PAGE";
    id: string;
    name: string;
  } | null>(null);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [activeTaskExportId, setActiveTaskExportId] = useState<string | null>(null);
  const [taskExportDropdownId, setTaskExportDropdownId] = useState<string | null>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getDueDateLabel = (dateStr?: string | null) => {
    if (!dateStr) return { label: "No Due Date", style: "text-slate-400 dark:text-slate-500", icon: Calendar };

    const due = new Date(dateStr);
    if (isNaN(due.getTime())) return { label: "No Due Date", style: "text-slate-400", icon: Calendar };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (due < startOfToday) {
      const days = Math.max(1, Math.floor((startOfToday.getTime() - due.getTime()) / (1000 * 3600 * 24)));
      return {
        label: `Overdue by ${days}d (${due.toLocaleDateString()})`,
        style: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50",
        icon: AlertCircle,
      };
    } else if (due >= startOfToday && due <= endOfToday) {
      return {
        label: `Due Today (${due.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
        style: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50",
        icon: Clock,
      };
    } else {
      return {
        label: `Due ${due.toLocaleDateString()}`,
        style: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40",
        icon: Calendar,
      };
    }
  };

  // ── Quick Export Handlers ──────────────────────────────────────────────────
  const handleExportFilteredTasks = async (format: ExportFormat) => {
    setExportingFormat(format);
    setIsExportDropdownOpen(false);
    try {
      // Export current filtered list with xlsx / formatted file download
      exportTasksToClientFile(filteredTasks, format, `my_tasks_${bucket}`);
    } catch (err) {
      console.error("Failed to export tasks:", err);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleQuickExportSingleTask = async (task: Task, format: ExportFormat) => {
    setActiveTaskExportId(task.id);
    setTaskExportDropdownId(null);
    try {
      // Try backend quickExport API first
      try {
        const result = await quickExport("TASK", task.id, format);
        downloadExportResult(result, `task_${task.id}${FORMAT_EXTENSIONS[format]}`);
      } catch (backendErr) {
        // Fallback to client-side task exporter
        exportTasksToClientFile([task], format, `task_${task.id}`);
      }
    } catch (err: any) {
      console.error("Single task export error:", err);
    } finally {
      setActiveTaskExportId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-28">
      {/* ── Top Header & Employee Summary ─────────────────────────────────── */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  My Tasks
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Employee Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Personal inbox with assignment indicators, context navigation & data export
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Assignment Events Bell Button */}
            <button
              onClick={() => onToggleEventsDrawer(!isEventsDrawerOpen)}
              title="Recent Assignment Events"
              className="relative inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              <Bell className="w-4 h-4" />
              <span>Events</span>
              {newAssignmentsCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] inline-flex items-center justify-center font-bold animate-pulse">
                  {newAssignmentsCount}
                </span>
              )}
            </button>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Refresh Tasks"
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Export Action Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsExportDropdownOpen((prev) => !prev)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold shadow-xs transition"
              >
                {exportingFormat ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                )}
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isExportDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-30 w-56 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Export Filtered ({filteredTasks.length})
                  </div>
                  {(["CSV", "XLSX", "MARKDOWN", "HTML", "PDF"] as ExportFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => handleExportFilteredTasks(fmt)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <span className="flex items-center space-x-2">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
                        <span>Export as {fmt}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {FORMAT_EXTENSIONS[fmt]}
                      </span>
                    </button>
                  ))}
                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                  <button
                    onClick={() => {
                      setIsExportDropdownOpen(false);
                      if (filteredTasks[0]) {
                        setExportModalEntity({
                          type: "TASK",
                          id: filteredTasks[0].id,
                          name: filteredTasks[0].title,
                        });
                        setIsExportModalOpen(true);
                      }
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Advanced Export Options...</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Task Counts Summary Metric Pills ─────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-5">
          <button
            onClick={() => onSelectBucket("all")}
            className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
              bucket === "all"
                ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/20"
                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100"
            }`}
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                All My Tasks
              </span>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {counts.all}
              </div>
            </div>
            <Inbox className="w-5 h-5 text-slate-400" />
          </button>

          <button
            onClick={() => onSelectBucket("overdue")}
            className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
              bucket === "overdue"
                ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700 text-red-950 dark:text-red-200 ring-2 ring-red-500/20"
                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-red-50/40"
            }`}
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                Overdue
              </span>
              <div className="text-xl font-extrabold text-red-600 dark:text-red-400 mt-0.5">
                {counts.overdue}
              </div>
            </div>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </button>

          <button
            onClick={() => onSelectBucket("dueToday")}
            className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
              bucket === "dueToday"
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20"
                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-amber-50/40"
            }`}
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Due Today
              </span>
              <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                {counts.dueToday}
              </div>
            </div>
            <Clock className="w-5 h-5 text-amber-500" />
          </button>

          <button
            onClick={() => onSelectBucket("upcoming")}
            className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
              bucket === "upcoming"
                ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-indigo-50/40"
            }`}
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Upcoming
              </span>
              <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {counts.upcoming}
              </div>
            </div>
            <Calendar className="w-5 h-5 text-indigo-500" />
          </button>

          <button
            onClick={() => onSelectBucket("completed")}
            className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
              bucket === "completed"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20"
                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-emerald-50/40"
            }`}
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Completed
              </span>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {counts.completed}
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </button>
        </div>
      </div>

      {/* ── Assignment Notification Alert Banner ──────────────────────────── */}
      {newAssignmentsCount > 0 && (
        <div className="mx-6 mt-4 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-bold">
                {newAssignmentsCount} New Task Assignment Event{newAssignmentsCount > 1 ? "s" : ""}
              </h4>
              <p className="text-xs text-blue-100">
                You have received new task assignments or reassignments. Refresh your inbox to view them.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              className="px-4 py-1.5 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold transition shadow-xs"
            >
              Refresh Inbox
            </button>
            <button
              onClick={onDismissNotificationBanner}
              className="p-1.5 text-white/80 hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Permission Restriction Alert Banner ───────────────────────────── */}
      {permissionError && (
        <div className="mx-6 mt-4 p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{permissionError}</span>
          </div>
          <button
            onClick={onClearPermissionError}
            className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Filter Bar & Search Controls ──────────────────────────────────── */}
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, description, or project..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-7 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white placeholder-slate-400 shadow-xs"
            />
            {search && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityFilterChange(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
          >
            <option value="all">Priority: All</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Showing <span className="text-slate-900 dark:text-white font-bold">{filteredTasks.length}</span> of {tasks.length} tasks
        </div>
      </div>

      {/* ── Tasks List Section ────────────────────────────────────────────── */}
      <div className="px-6 space-y-3">
        {loading && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs text-slate-500 font-medium">Loading your assigned tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl text-center space-y-3 shadow-xs">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No tasks found in {bucket === "all" ? "inbox" : bucket}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              {search || priorityFilter !== "all"
                ? "No tasks match your current filter settings. Try clearing search or filters."
                : bucket === "overdue"
                ? "Great job! You have no overdue tasks."
                : bucket === "dueToday"
                ? "No tasks due today. Check upcoming tasks to plan ahead."
                : "You currently have no tasks assigned in this view."}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const dueInfo = getDueDateLabel(task.dueDate);
            const DueIcon = dueInfo.icon;
            const isUpdating = statusUpdatingId === task.id;

            return (
              <div
                key={task.id}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400/80 dark:hover:border-blue-600/80 rounded-2xl p-4 sm:p-5 transition shadow-xs hover:shadow-md space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left: Title & Descriptions */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.MEDIUM
                        }`}
                      >
                        {task.priority}
                      </span>

                      <button
                        onClick={() => onOpenTaskDetail && onOpenTaskDetail(task)}
                        className="text-left font-bold text-slate-900 dark:text-white text-sm hover:text-blue-600 dark:hover:text-blue-400 transition truncate max-w-lg"
                      >
                        {task.title}
                      </button>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 max-w-2xl">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Right: Employee Status Update Dropdown */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="relative">
                      <select
                        value={task.status}
                        disabled={isUpdating}
                        onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer appearance-none pr-7 ${
                          STATUS_STYLES[task.status] || STATUS_STYLES.TODO
                        } disabled:opacity-60`}
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="REVIEW">Review</option>
                        <option value="BLOCKED">Blocked</option>
                        <option value="DONE">Done</option>
                      </select>
                      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500">
                        {isUpdating ? (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </div>

                    {/* Task Quick Export Menu */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setTaskExportDropdownId(
                            taskExportDropdownId === task.id ? null : task.id
                          )
                        }
                        title="Export Task"
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                      >
                        {activeTaskExportId === task.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {taskExportDropdownId === task.id && (
                        <div className="absolute right-0 top-full mt-1 z-30 w-44 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-0.5">
                          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase">
                            Export Single Task
                          </div>
                          {(["CSV", "XLSX", "MARKDOWN", "HTML", "PDF"] as ExportFormat[]).map((fmt) => (
                            <button
                              key={fmt}
                              onClick={() => handleQuickExportSingleTask(task, fmt)}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              <span>{fmt}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {FORMAT_EXTENSIONS[fmt]}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Task Context Navigation Badges & Due Date ──────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Project Context Link */}
                    {task.projectId && (
                      <Link
                        href={`/workspace/projects/${task.projectId}`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg text-xs font-semibold transition border border-slate-200/60 dark:border-slate-700/60"
                      >
                        <FolderKanban className="w-3.5 h-3.5 text-blue-500" />
                        <span>Project: {(task as any).projectName || task.projectId}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    )}

                    {/* Page Context Link */}
                    {(task as any).pageId && (
                      <Link
                        href={`/workspace/pages/${(task as any).pageId}`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg text-xs font-semibold transition border border-slate-200/60 dark:border-slate-700/60"
                      >
                        <FileText className="w-3.5 h-3.5 text-purple-500" />
                        <span>Page Docs</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    )}

                    {/* Lead Context Link */}
                    {task.leadId && (
                      <Link
                        href={`/leads`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg text-xs font-semibold transition border border-slate-200/60 dark:border-slate-700/60"
                      >
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Lead: {task.leadId}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    )}

                    {/* Deal Context Link */}
                    {task.dealId && (
                      <Link
                        href={`/deals`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg text-xs font-semibold transition border border-slate-200/60 dark:border-slate-700/60"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                        <span>Deal: {task.dealId}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    )}

                    {/* Labels Tag Badges */}
                    {Array.isArray(task.labels) &&
                      task.labels.map((lbl) => (
                        <span
                          key={lbl}
                          className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                        >
                          #{lbl}
                        </span>
                      ))}
                  </div>

                  {/* Due Date Indicator */}
                  <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${dueInfo.style}`}>
                    <DueIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{dueInfo.label}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Assignment Events History Drawer ──────────────────────────────── */}
      {isEventsDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Assignment Events
              </h3>
            </div>
            <button
              onClick={() => onToggleEventsDrawer(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {assignmentEvents.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  No recent assignment events detected.
                </p>
              </div>
            ) : (
              assignmentEvents.map((evt, idx) => (
                <div
                  key={evt.id || idx}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-[11px] uppercase">
                      {evt.eventType || "Assignment"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {evt.createdAt ? new Date(evt.createdAt).toLocaleTimeString() : "Just now"}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Task ID: {evt.taskId}
                  </p>
                  {evt.task?.title && (
                    <p className="text-slate-500 line-clamp-1">{evt.task.title}</p>
                  )}
                  {evt.assignedById && (
                    <span className="text-[10px] text-slate-400">
                      Assigned by: {evt.assignedById}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={onRefresh}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Sync & Refresh Tasks
            </button>
          </div>
        </div>
      )}

      {/* ── Advanced Export Modal ─────────────────────────────────────────── */}
      {isExportModalOpen && exportModalEntity && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => {
            setIsExportModalOpen(false);
            setExportModalEntity(null);
          }}
          entityType={exportModalEntity.type}
          entityId={exportModalEntity.id}
          entityName={exportModalEntity.name}
        />
      )}
    </div>
  );
};
