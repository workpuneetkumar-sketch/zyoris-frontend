"use client";
// components/dashboard-builder/widgets/TasksWidget.tsx

import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

const TASKS = [
  { title: "Review Q3 pipeline", priority: "HIGH", done: false, due: "Today" },
  { title: "Send onboarding docs to Stark Industries", priority: "MEDIUM", done: false, due: "Tomorrow" },
  { title: "Update CRM records", priority: "LOW", done: true, due: "Done" },
  { title: "Prepare board presentation", priority: "HIGH", done: false, due: "Aug 2" },
  { title: "Follow up with TechFlow", priority: "MEDIUM", done: true, due: "Done" },
];

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "text-red-500 bg-red-50",
  MEDIUM: "text-amber-500 bg-amber-50",
  LOW: "text-gray-400 bg-gray-100",
};

export function TasksWidget({ isPreview }: { isPreview?: boolean }) {
  const pending = TASKS.filter((t) => !t.done).length;
  const done = TASKS.filter((t) => t.done).length;

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
        {TASKS.map((t, i) => (
          <div key={i} className={`flex items-center gap-2 ${t.done ? "opacity-50" : ""}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              t.done ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
            }`}>
              {t.done && <CheckCircle2 size={10} className="text-white" />}
            </div>
            <p className={`flex-1 text-xs ${t.done ? "line-through text-gray-400" : "text-gray-800 font-medium"} truncate`}>
              {t.title}
            </p>
            <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${PRIORITY_COLORS[t.priority]}`}>
              {t.priority[0]}
            </span>
            <span className="text-[9px] text-gray-400 flex-shrink-0">{t.due}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
