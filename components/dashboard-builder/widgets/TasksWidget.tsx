"use client";

import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

interface TasksWidgetProps {
  title: string;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
  }>;
}

const MOCK_TASKS = [
  { id: "t1", title: "Review Q3 budget proposal", status: "TODO", priority: "HIGH", dueDate: "2026-07-25" },
  { id: "t2", title: "Schedule team standup", status: "IN_PROGRESS", priority: "MEDIUM", dueDate: "2026-07-23" },
  { id: "t3", title: "Update sales playbook", status: "TODO", priority: "LOW", dueDate: "2026-08-01" },
  { id: "t4", title: "Prepare client presentation", status: "DONE", priority: "HIGH", dueDate: "2026-07-22" },
  { id: "t5", title: "Send weekly report", status: "IN_PROGRESS", priority: "MEDIUM", dueDate: "2026-07-24" },
];

const priorityColors: Record<string, string> = {
  HIGH: "text-red-500",
  MEDIUM: "text-amber-500",
  LOW: "text-gray-400",
};

const statusIcons: Record<string, React.ReactNode> = {
  TODO: <Circle size={14} className="text-gray-300" />,
  IN_PROGRESS: <AlertCircle size={14} className="text-amber-400" />,
  DONE: <CheckCircle2 size={14} className="text-emerald-500" />,
};

const statusLabels: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

export function TasksWidget({ title }: TasksWidgetProps) {
  const tasks = MOCK_TASKS;

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </h3>
      </div>
      <div className="flex-1 overflow-auto px-4 pb-2 space-y-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
          >
            <div className="shrink-0">{statusIcons[task.status]}</div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-xs font-medium ${
                  task.status === "DONE"
                    ? "text-gray-400 line-through"
                    : "text-gray-800"
                }`}
              >
                {task.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gray-400">
                  {statusLabels[task.status]}
                </span>
                <span
                  className={`text-[10px] font-semibold ${priorityColors[task.priority] ?? "text-gray-400"}`}
                >
                  {task.priority}
                </span>
                {task.dueDate && (
                  <span className="text-[10px] text-gray-400">
                    Due: {task.dueDate}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
