"use client";
// components/dashboard-builder/widgets/TasksWidget.tsx
// Real data: GET /workspace/my-tasks via useMyTasks hook.
// Mock const TASKS removed entirely.

import { CheckCircle2, Circle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { useMyTasks } from "@/hooks/useDashboard";
import type { Task } from "@/lib/api/tasksApi";

const PRIORITY_COLORS: Record<string, string> = {
  HIGH:   "text-red-500 bg-red-50",
  MEDIUM: "text-amber-500 bg-amber-50",
  LOW:    "text-gray-400 bg-gray-100",
};

function isDone(task: Task): boolean {
  return (task.status ?? "").toUpperCase() === "DONE";
}

function dueLabel(task: Task): string {
  if (isDone(task)) return "Done";
  if (!task.dueDate) return "";
  const d    = new Date(task.dueDate);
  const now  = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
  if (diff < 0)  return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function TasksWidget({ isPreview }: { isPreview?: boolean }) {
  const { data: tasks, loading, error, refetch } = useMyTasks({ limit: 8 });

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 p-1">
            <div className="w-4 h-4 rounded-full bg-gray-100 animate-pulse" />
            <div className="flex-1 h-3 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 p-3 text-center">
        <AlertCircle size={18} className="text-red-400" />
        <p className="text-xs text-gray-500">{error}</p>
        <button onClick={refetch} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
          <RefreshCw size={10} /> Retry
        </button>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-1 p-3 text-center">
        <CheckCircle2 size={20} className="text-gray-300" />
        <p className="text-xs text-gray-400">No tasks assigned to you</p>
      </div>
    );
  }

  const pending = tasks.filter((t) => !isDone(t)).length;
  const done    = tasks.filter((t) =>  isDone(t)).length;

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {/* Summary */}
      <div className="flex items-center gap-3 pb-1.5 border-b border-gray-100">
        <div className="flex items-center gap-1 text-xs font-bold text-indigo-600">
          <Clock size={12} /> {pending} pending
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
          <CheckCircle2 size={12} /> {done} done
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {tasks.map((task: Task, i: number) => {
          const done    = isDone(task);
          const label   = dueLabel(task);
          const priority = (task.priority ?? "LOW").toUpperCase();

          return (
            <div key={task.id ?? i} className={`flex items-center gap-2 ${done ? "opacity-50" : ""}`}>
              {/* Checkbox-style indicator */}
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                done ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
              }`}>
                {done && <CheckCircle2 size={10} className="text-white" />}
              </div>

              <p className={`text-xs flex-1 truncate ${done ? "line-through text-gray-400" : "text-gray-700 font-medium"}`}>
                {task.title}
              </p>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {label && (
                  <span className={`text-[10px] font-medium ${
                    label === "Overdue" ? "text-red-500" :
                    label === "Today"   ? "text-amber-600" :
                    label === "Done"    ? "text-emerald-500" :
                                          "text-gray-400"
                  }`}>
                    {label}
                  </span>
                )}
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                  PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.LOW
                }`}>
                  {priority}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
