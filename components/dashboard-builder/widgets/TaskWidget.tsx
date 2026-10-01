"use client";
// components/dashboard-builder/widgets/TaskWidget.tsx
// Real data: GET /workspace/my-tasks (with /tasks/my-tasks fallback) via useMyTasks hook.
// Mock const TASKS removed entirely.

import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { useMyTasks } from "@/hooks/useDashboard";
import type { Task } from "@/lib/api/tasksApi";

// ── Priority colours ──────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  HIGH:   "text-red-500 bg-red-50",
  MEDIUM: "text-amber-500 bg-amber-50",
  LOW:    "text-gray-400 bg-gray-50",
};

// ── Status → display icon ─────────────────────────────────────────────────────
function StatusIcon({ status }: { status: string }) {
  const s = (status ?? "").toUpperCase();
  if (s === "DONE")        return <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />;
  if (s === "IN_PROGRESS") return <Clock        size={16} className="text-indigo-400  flex-shrink-0 mt-0.5" />;
  if (s === "OVERDUE")     return <AlertCircle  size={16} className="text-red-400     flex-shrink-0 mt-0.5" />;
  return                          <Circle       size={16} className="text-gray-300    flex-shrink-0 mt-0.5" />;
}

/** Convert ISO dueDate to a short display label */
function dueLabel(dueDate?: string | null): string {
  if (!dueDate) return "";
  const d    = new Date(dueDate);
  const now  = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
  if (diff < 0)  return "Overdue";
  if (diff === 0) return "Due today";
  if (diff === 1) return "Tomorrow";
  if (diff <= 7)  return "This week";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Derive display status (backend uses TODO/IN_PROGRESS/DONE; widget also shows OVERDUE) */
function displayStatus(task: Task): string {
  const s = (task.status ?? "").toUpperCase();
  if (s === "DONE") return "DONE";
  if (task.dueDate && new Date(task.dueDate) < new Date() && s !== "DONE") return "OVERDUE";
  if (s === "IN_PROGRESS") return "IN_PROGRESS";
  return "PENDING";
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-2.5 p-2">
      <div className="w-4 h-4 rounded-full bg-gray-100 animate-pulse flex-shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
        <div className="h-2 w-1/3 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function TaskWidget({ isPreview }: { isPreview?: boolean }) {
  const router = useRouter();
  const { data: tasks, total, loading, error, refetch } = useMyTasks({ limit: 10 });

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col gap-1">
        {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center p-3">
        <AlertCircle size={20} className="text-red-400" />
        <p className="text-xs text-gray-500">{error}</p>
        <button
          onClick={refetch}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
        >
          <RefreshCw size={11} /> Retry
        </button>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (!tasks || tasks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1 text-center p-3">
        <CheckCircle2 size={20} className="text-gray-300" />
        <p className="text-xs text-gray-400">No tasks assigned to you</p>
      </div>
    );
  }

  // ── Summary counts ────────────────────────────────────────────────────────────
  const pending = tasks.filter((t) => (t.status ?? "").toUpperCase() !== "DONE").length;
  const overdue = tasks.filter((t) => {
    const s = (t.status ?? "").toUpperCase();
    return t.dueDate && new Date(t.dueDate) < new Date() && s !== "DONE";
  }).length;

  return (
    <div className="h-full flex flex-col">
      {/* Summary bar */}
      <div className="flex gap-3 mb-2 px-1">
        <div className="text-xs">
          <span className="font-bold text-gray-800">{pending}</span>
          <span className="text-gray-500"> pending</span>
        </div>
        {overdue > 0 && (
          <div className="text-xs">
            <span className="font-bold text-red-500">{overdue}</span>
            <span className="text-gray-500"> overdue</span>
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {tasks.map((task: Task) => {
          const status   = displayStatus(task);
          const label    = dueLabel(task.dueDate);
          const priority = (task.priority ?? "LOW").toUpperCase();

          return (
            <div
              key={task.id}
              role="button"
              tabIndex={0}
              aria-label={`View task: ${task.title}`}
              onClick={() => router.push("/tasks")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/tasks"); }}
              className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors cursor-pointer"
            >
              <StatusIcon status={status} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${
                  status === "OVERDUE" ? "text-red-600" : "text-gray-800"
                }`}>
                  {task.title}
                </p>
                {label && <p className="text-[10px] text-gray-400">{label}</p>}
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.LOW
              }`}>
                {priority}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
