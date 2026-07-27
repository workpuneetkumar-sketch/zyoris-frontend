"use client";

// components/dashboard-builder/widgets/TaskWidget.tsx

import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  dueLabel: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "PENDING" | "IN_PROGRESS" | "OVERDUE";
}

const TASKS: Task[] = [
  { id: "1", title: "Review Q3 pipeline report", dueLabel: "Due today", priority: "HIGH", status: "OVERDUE" },
  { id: "2", title: "Follow up with Acme Corp", dueLabel: "Due today", priority: "HIGH", status: "PENDING" },
  { id: "3", title: "Prepare demo for BlueWave", dueLabel: "Tomorrow", priority: "MEDIUM", status: "IN_PROGRESS" },
  { id: "4", title: "Update deal notes — TechCorp", dueLabel: "This week", priority: "LOW", status: "PENDING" },
  { id: "5", title: "Schedule onboarding call", dueLabel: "This week", priority: "MEDIUM", status: "PENDING" },
];

const priorityColors: Record<string, string> = {
  HIGH: "text-red-500 bg-red-50",
  MEDIUM: "text-amber-500 bg-amber-50",
  LOW: "text-gray-400 bg-gray-50",
};

const statusIcons: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  PENDING: { icon: Circle, color: "text-gray-300" },
  IN_PROGRESS: { icon: Clock, color: "text-indigo-400" },
  OVERDUE: { icon: AlertCircle, color: "text-red-400" },
};

export function TaskWidget({ isPreview }: { isPreview?: boolean }) {
  const pending = TASKS.filter((t) => t.status !== "OVERDUE").length;
  const overdue = TASKS.filter((t) => t.status === "OVERDUE").length;

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-3 mb-2 px-1">
        <div className="text-xs">
          <span className="font-bold text-gray-800">{pending}</span>
          <span className="text-gray-500"> pending</span>
        </div>
        <div className="text-xs">
          <span className="font-bold text-red-500">{overdue}</span>
          <span className="text-gray-500"> overdue</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {TASKS.map((task) => {
          const statusInfo = statusIcons[task.status];
          const StatusIcon = statusInfo.icon;
          return (
            <div key={task.id} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer">
              <StatusIcon size={16} className={`${statusInfo.color} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${task.status === "OVERDUE" ? "text-red-600" : "text-gray-800"} truncate`}>
                  {task.title}
                </p>
                <p className="text-[10px] text-gray-400">{task.dueLabel}</p>
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
