"use client";

// components/reminders/CreateReminderModal.tsx
// Uses exact API fields: title, message, dueAt, channel, recurrence, leadId, assignedToId

import { useState } from "react";
import { X, Bell, Loader2, ChevronDown } from "lucide-react";
import {
  CreateReminderPayload,
  ReminderChannel,
  ReminderRecurrence,
} from "@/types/reminders";

interface CreateReminderModalProps {
  isOpen: boolean;
  isCreating: boolean;
  onClose: () => void;
  onCreate: (payload: CreateReminderPayload) => Promise<unknown>;
}

const CHANNELS: { value: ReminderChannel; label: string; emoji: string }[] = [
  { value: "EMAIL", label: "Email", emoji: "📧" },
  { value: "SMS", label: "SMS", emoji: "💬" },
  { value: "PUSH", label: "Push", emoji: "🔔" },
  { value: "IN_APP", label: "In-App", emoji: "🖥️" },
  { value: "WHATSAPP", label: "WhatsApp", emoji: "💚" },
];

const RECURRENCES: { value: ReminderRecurrence; label: string }[] = [
  { value: "NONE", label: "None (one-time)" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

function defaultDueAt() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
}

export function CreateReminderModal({
  isOpen,
  isCreating,
  onClose,
  onCreate,
}: CreateReminderModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<ReminderChannel>("EMAIL");
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>("NONE");
  const [dueAt, setDueAt] = useState(defaultDueAt());
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setChannel("EMAIL");
    setRecurrence("NONE");
    setDueAt(defaultDueAt());
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError("Title is required."); return; }
    if (!dueAt) { setError("Due date is required."); return; }

    try {
      await onCreate({
        title: title.trim(),
        message: message.trim() || undefined,
        channel,
        recurrence,
        dueAt: new Date(dueAt).toISOString(),
        leadId: null,
        assignedToId: null,
        metadata: {},
      });
      resetForm();
      onClose();
    } catch {
      // errors are handled by the hook toast
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Bell size={16} className="text-white" />
            </div>
            <h2 className="text-base font-bold text-white">New Reminder</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Follow up with Acme Corp"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 text-gray-800 placeholder-gray-300 transition-all"
              autoFocus
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Message <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Additional details or notes…"
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 text-gray-800 placeholder-gray-300 transition-all resize-none"
            />
          </div>

          {/* Due At */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Due Date & Time <span className="text-red-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 text-gray-800 transition-all"
            />
          </div>

          {/* Channel */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Channel</label>
            <div className="flex flex-wrap gap-1.5">
              {CHANNELS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setChannel(c.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    channel === c.value
                      ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  <span>{c.emoji}</span> {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Recurrence</label>
            <div className="relative">
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as ReminderRecurrence)}
                className="w-full appearance-none px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-all pr-8"
              >
                {RECURRENCES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              {error}
            </p>
          )}

          {/* Footer buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
            >
              {isCreating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Bell size={14} />
              )}
              {isCreating ? "Creating…" : "Create Reminder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
