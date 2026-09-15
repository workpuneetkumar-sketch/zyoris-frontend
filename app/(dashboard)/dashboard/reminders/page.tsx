"use client";

// app/(dashboard)/dashboard/reminders/page.tsx

import { useState } from "react";
import { Bell, Plus, AlertTriangle } from "lucide-react";
import { useReminders, ReminderFilterStatus } from "@/hooks/useReminders";
import { ReminderList } from "@/components/reminders/ReminderList";
import { CreateReminderModal } from "@/components/reminders/CreateReminderModal";

const FILTER_TABS: { value: ReminderFilterStatus; label: string; emoji: string }[] = [
  { value: "ALL", label: "All", emoji: "" },
  { value: "PENDING", label: "Pending", emoji: "🟣" },
  { value: "SNOOZED", label: "Snoozed", emoji: "🟡" },
  { value: "COMPLETED", label: "Completed", emoji: "🟢" },
  { value: "SKIPPED", label: "Skipped", emoji: "⚫" },
];

export default function RemindersPage() {
  const {
    reminders,
    isLoading,
    error,
    isCreating,
    actionLoadingId,
    filterStatus,
    counts,
    overdueCount,
    setFilterStatus,
    create,
    snooze,
    complete,
    skip,
    remove,
    retry,
  } = useReminders();

  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="max-w-2xl mx-auto py-2">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Reminders
            </h1>
            {overdueCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full animate-pulse">
                <AlertTriangle size={10} />
                {overdueCount} overdue
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Smart follow-ups, notifications, and recurring reminders
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-indigo-200"
          style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
        >
          <Plus size={16} />
          New Reminder
        </button>
      </div>

      {/* ── Stats grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Pending",
            count: counts.PENDING,
            gradient: "from-indigo-500 to-violet-500",
            bg: "from-indigo-50 to-violet-50",
            border: "border-indigo-100",
            text: "text-indigo-700",
          },
          {
            label: "Snoozed",
            count: counts.SNOOZED,
            gradient: "from-amber-400 to-orange-400",
            bg: "from-amber-50 to-orange-50",
            border: "border-amber-100",
            text: "text-amber-700",
          },
          {
            label: "Completed",
            count: counts.COMPLETED,
            gradient: "from-emerald-400 to-teal-500",
            bg: "from-emerald-50 to-teal-50",
            border: "border-emerald-100",
            text: "text-emerald-700",
          },
          {
            label: "Skipped",
            count: counts.SKIPPED,
            gradient: "from-gray-400 to-gray-500",
            bg: "from-gray-50 to-slate-50",
            border: "border-gray-100",
            text: "text-gray-600",
          },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={() => setFilterStatus(stat.label.toUpperCase() as ReminderFilterStatus)}
            className={`rounded-2xl border p-4 text-left bg-gradient-to-br ${stat.bg} ${stat.border} hover:shadow-md transition-all active:scale-95`}
          >
            <p className={`text-3xl font-extrabold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
              {stat.count}
            </p>
            <p className={`text-xs font-semibold mt-0.5 ${stat.text}`}>{stat.label}</p>
          </button>
        ))}
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5 pb-1 overflow-x-auto">
        {FILTER_TABS.map((tab) => {
          const count = counts[tab.value];
          const isActive = filterStatus === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isActive
                  ? "text-white border-transparent shadow-lg shadow-indigo-200"
                  : "bg-white text-gray-500 border-gray-200 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
              style={isActive ? { background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" } : {}}
            >
              {tab.emoji && <span>{tab.emoji}</span>}
              {tab.label}
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Reminder list ────────────────────────────────────────────────── */}
      <ReminderList
        reminders={reminders}
        isLoading={isLoading}
        error={error}
        actionLoadingId={actionLoadingId}
        onComplete={complete}
        onSnooze={snooze}
        onSkip={skip}
        onDelete={remove}
        onRetry={retry}
      />

      {/* ── Create modal ─────────────────────────────────────────────────── */}
      <CreateReminderModal
        isOpen={createOpen}
        isCreating={isCreating}
        onClose={() => setCreateOpen(false)}
        onCreate={create}
      />
    </div>
  );
}
