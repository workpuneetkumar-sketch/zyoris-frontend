"use client";

// components/reminders/ReminderList.tsx
// Uses correct API fields: dueAt, snoozedUntil, message, channel

import { useState } from "react";
import {
  Bell, Clock, CheckCircle2, SkipForward, AlarmClock,
  Trash2, Loader2, AlertCircle, RefreshCw,
  Mail, RotateCcw,
} from "lucide-react";
import { Reminder, ReminderStatus, SnoozeReminderPayload } from "@/types/reminders";

interface ReminderListProps {
  reminders: Reminder[];
  isLoading: boolean;
  error: string | null;
  actionLoadingId: string | null;
  onComplete: (id: string) => void;
  onSnooze: (id: string, payload: SnoozeReminderPayload) => void;
  onSkip: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry: () => void;
}

// ── Channel icon (always Email) ───────────────────────────────────────────

const CHANNEL_ICON = { icon: Mail, color: "#3b82f6", bg: "#eff6ff" };

const STATUS_CONFIG: Record<ReminderStatus, { label: string; chip: string; dot: string }> = {
  PENDING: { label: "Pending", chip: "text-indigo-700 bg-indigo-50 border-indigo-200", dot: "bg-indigo-500" },
  SNOOZED: { label: "Snoozed", chip: "text-amber-700 bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  COMPLETED: { label: "Done", chip: "text-emerald-700 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  SKIPPED: { label: "Skipped", chip: "text-gray-500 bg-gray-100 border-gray-200", dot: "bg-gray-400" },
};

// ── Snooze menu ────────────────────────────────────────────────────────────

function SnoozeMenu({ onSnooze }: { onSnooze: (p: SnoozeReminderPayload) => void }) {
  const [open, setOpen] = useState(false);

  const options = [
    { label: "In 1 hour", getDate: () => new Date(Date.now() + 3600000) },
    { label: "In 3 hours", getDate: () => new Date(Date.now() + 3 * 3600000) },
    { label: "Tomorrow 9am", getDate: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; } },
    { label: "Next Monday", getDate: () => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() + (8 - day) % 7 || 7); d.setHours(9, 0, 0, 0); return d; } },
  ];

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        title="Snooze"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-all"
      >
        <AlarmClock size={13} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-100 rounded-2xl shadow-2xl p-1.5 min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-150">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">Snooze until</p>
            {options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => { onSnooze({ snoozedUntil: opt.getDate().toISOString() }); setOpen(false); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
              >
                <Clock size={11} className="text-amber-400" />
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Date formatter ─────────────────────────────────────────────────────────

function formatDueDate(iso: string): { text: string; overdue: boolean } {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const isPast = diffMs < 0;
  const absMs = Math.abs(diffMs);

  if (absMs < 60000) return { text: "Just now", overdue: isPast };
  if (absMs < 3600000) {
    const mins = Math.round(absMs / 60000);
    return { text: isPast ? `${mins}m overdue` : `in ${mins}m`, overdue: isPast };
  }
  if (absMs < 86400000) {
    const hrs = Math.round(absMs / 3600000);
    return { text: isPast ? `${hrs}h overdue` : `in ${hrs}h`, overdue: isPast };
  }
  if (absMs < 7 * 86400000) {
    const days = Math.round(absMs / 86400000);
    return { text: isPast ? `${days}d overdue` : `in ${days}d`, overdue: isPast };
  }
  return {
    text: d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    overdue: isPast,
  };
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-gray-100 rounded-md w-3/4" />
          <div className="h-3 bg-gray-100 rounded-md w-1/2" />
          <div className="h-3 bg-gray-100 rounded-md w-1/3" />
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function ReminderList({
  reminders,
  isLoading,
  error,
  actionLoadingId,
  onComplete,
  onSnooze,
  onSkip,
  onDelete,
  onRetry,
}: ReminderListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle size={28} className="text-red-300" />
        </div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Failed to load reminders</p>
        <p className="text-xs text-gray-400 mb-5">{error}</p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw size={13} />
          Try Again
        </button>
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)" }}
        >
          <Bell size={32} className="text-indigo-300" />
        </div>
        <p className="text-sm font-semibold text-gray-700 mb-1">No reminders here</p>
        <p className="text-xs text-gray-400 max-w-48">
          Create a reminder to stay on top of your follow-ups and tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reminders.map((reminder) => {
        const statusCfg = STATUS_CONFIG[reminder.status];
        const isActioning = actionLoadingId === reminder.id;
        const isCompletedOrSkipped = reminder.status === "COMPLETED" || reminder.status === "SKIPPED";
        const displayDate = formatDueDate(
          reminder.status === "SNOOZED" && reminder.snoozedUntil
            ? reminder.snoozedUntil
            : reminder.dueAt
        );
        const { icon: ChannelIcon, color: iconColor, bg: iconBg } = CHANNEL_ICON;

        return (
          <div
            key={reminder.id}
            className={`group bg-white rounded-2xl border p-4 transition-all duration-200 ${
              displayDate.overdue && !isCompletedOrSkipped
                ? "border-red-200 shadow-sm shadow-red-50"
                : isCompletedOrSkipped
                ? "border-gray-100 opacity-60"
                : "border-gray-100 hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-50/50"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Channel icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: iconBg }}
              >
                <ChannelIcon size={16} style={{ color: iconColor }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className={`text-sm font-semibold leading-snug ${
                    isCompletedOrSkipped ? "line-through text-gray-400" : "text-gray-900"
                  }`}>
                    {reminder.title}
                  </p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {reminder.recurrence !== "NONE" && (
                      <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <RotateCcw size={8} />
                        {reminder.recurrence}
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${statusCfg.chip}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                {/* Message */}
                {reminder.message && (
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{reminder.message}</p>
                )}

                {/* Entity */}
                {reminder.leadName && (
                  <p className="text-xs font-medium text-indigo-500 mb-2 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-indigo-400 inline-block" />
                    {reminder.leadName}
                  </p>
                )}

                {/* Footer: date + actions */}
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  {/* Due date */}
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    displayDate.overdue && !isCompletedOrSkipped
                      ? "text-red-500"
                      : "text-gray-400"
                  }`}>
                    <Clock size={10} />
                    {displayDate.text}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isActioning ? (
                      <Loader2 size={14} className="animate-spin text-indigo-400" />
                    ) : isCompletedOrSkipped ? (
                      // Delete only for done/skipped
                      deleteConfirmId === reminder.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-red-500 font-medium">Delete?</span>
                          <button
                            onClick={() => { onDelete(reminder.id); setDeleteConfirmId(null); }}
                            className="text-[10px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-md transition-colors"
                          >Yes</button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-[10px] text-gray-500 px-2 py-0.5 bg-gray-100 rounded-md"
                          >No</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(reminder.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      )
                    ) : (
                      // Active reminder actions
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Complete */}
                        <button
                          onClick={() => onComplete(reminder.id)}
                          title="Mark as complete"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                        >
                          <CheckCircle2 size={13} />
                        </button>

                        {/* Snooze */}
                        <SnoozeMenu onSnooze={(p) => onSnooze(reminder.id, p)} />

                        {/* Skip */}
                        <button
                          onClick={() => onSkip(reminder.id)}
                          title="Skip"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                        >
                          <SkipForward size={13} />
                        </button>

                        {/* Delete */}
                        {deleteConfirmId === reminder.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-red-500 font-medium">Delete?</span>
                            <button
                              onClick={() => { onDelete(reminder.id); setDeleteConfirmId(null); }}
                              className="text-[10px] font-semibold text-white bg-red-500 px-2 py-0.5 rounded-md"
                            >Yes</button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-[10px] text-gray-500 px-2 py-0.5 bg-gray-100 rounded-md"
                            >No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(reminder.id)}
                            title="Delete"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
