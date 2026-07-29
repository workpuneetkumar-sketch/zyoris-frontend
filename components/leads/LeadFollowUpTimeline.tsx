"use client";

// components/leads/LeadFollowUpTimeline.tsx

import { useState } from "react";
import {
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { LeadFollowUpItem, FollowUpType, FollowUpStatus, FollowUpPriority, AddFollowUpPayload } from "@/types/leadFollowUp";
import { useLeadFollowUp } from "@/hooks/useLeadFollowUp";

// ── Icons + colors per type ────────────────────────────────────────────────

const TYPE_CONFIG: Record<FollowUpType, { icon: React.ComponentType<any>; label: string; color: string; bg: string }> = {
  CALL: { icon: Phone, label: "Call", color: "#10b981", bg: "#f0fdf4" },
  MEETING: { icon: Calendar, label: "Meeting", color: "#f59e0b", bg: "#fffbeb" },
  EMAIL: { icon: Mail, label: "Email", color: "#3b82f6", bg: "#eff6ff" },
  NOTE: { icon: FileText, label: "Note", color: "#8b5cf6", bg: "#f5f3ff" },
  WHATSAPP: { icon: MessageSquare, label: "WhatsApp", color: "#25d366", bg: "#f0fdf4" },
  OTHER: { icon: MessageSquare, label: "Activity", color: "#64748b", bg: "#f8fafc" },
};

const STATUS_CONFIG: Record<FollowUpStatus, { label: string; chip: string }> = {
  PENDING: { label: "Pending", chip: "text-indigo-600 bg-indigo-50 border-indigo-100" },
  COMPLETED: { label: "Completed", chip: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  OVERDUE: { label: "Overdue", chip: "text-red-600 bg-red-50 border-red-100" },
  CANCELLED: { label: "Cancelled", chip: "text-gray-400 bg-gray-50 border-gray-100" },
};

const PRIORITY_DOT: Record<FollowUpPriority, string> = {
  HIGH: "bg-red-400",
  MEDIUM: "bg-amber-400",
  LOW: "bg-gray-300",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Timeline item ──────────────────────────────────────────────────────────

function TimelineItem({ item }: { item: LeadFollowUpItem }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.OTHER;
  const statusCfg = STATUS_CONFIG[item.status];
  const Icon = cfg.icon;
  const hasNotes = !!(item.notes || item.callNotes || item.meetingNotes);

  return (
    <div className="flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10"
          style={{ backgroundColor: cfg.bg, border: `2px solid ${cfg.color}20` }}
        >
          <Icon size={14} style={{ color: cfg.color }} />
        </div>
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-5 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[item.priority]}`} title={`${item.priority} priority`} />
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${statusCfg.chip}`}>
              {statusCfg.label}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 flex-shrink-0">{formatDate(item.createdAt)}</span>
        </div>

        {item.ownerName && (
          <p className="text-xs text-gray-500 mb-1">
            <span className="font-medium text-gray-700">{item.ownerName}</span>
          </p>
        )}

        {/* Notes preview */}
        {hasNotes && (
          <div className="mt-1.5">
            <button
              onClick={() => setExpanded((p) => !p)}
              className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? "Hide notes" : "Show notes"}
            </button>
            {expanded && (
              <div className="mt-2 bg-gray-50 rounded-xl p-3 text-xs text-gray-600 whitespace-pre-wrap border border-gray-100">
                {item.notes || item.callNotes || item.meetingNotes}
              </div>
            )}
          </div>
        )}

        {/* Next follow-up */}
        {item.nextFollowUpDate && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 w-fit">
            <Clock size={11} />
            Next follow-up: {formatDate(item.nextFollowUpDate)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add follow-up form ─────────────────────────────────────────────────────

const TYPES: FollowUpType[] = ["CALL", "MEETING", "EMAIL", "NOTE", "WHATSAPP", "OTHER"];
const PRIORITIES: FollowUpPriority[] = ["HIGH", "MEDIUM", "LOW"];

interface AddFollowUpFormProps {
  onAdd: (payload: AddFollowUpPayload) => Promise<any>;
  onCancel: () => void;
  isAdding: boolean;
}

function AddFollowUpForm({ onAdd, onCancel, isAdding }: AddFollowUpFormProps) {
  const [type, setType] = useState<FollowUpType>("CALL");
  const [priority, setPriority] = useState<FollowUpPriority>("MEDIUM");
  const [notes, setNotes] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAdd({
      type,
      priority,
      notes: notes.trim() || undefined,
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : undefined,
      status: "COMPLETED",
    });
    setNotes("");
    setNextFollowUpDate("");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-3 mb-4">
      <p className="text-xs font-bold text-indigo-700">Log Activity</p>

      {/* Type */}
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => {
          const cfg = TYPE_CONFIG[t];
          const Icon = cfg.icon;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                type === t
                  ? "text-white border-transparent"
                  : "bg-white text-gray-600 border-gray-200 hover:border-indigo-200"
              }`}
              style={type === t ? { backgroundColor: cfg.color, borderColor: cfg.color } : {}}
            >
              <Icon size={11} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Priority */}
      <div className="flex gap-2">
        {PRIORITIES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPriority(p)}
            className={`flex-1 py-1 rounded-lg text-xs font-semibold border transition-all ${
              priority === p
                ? p === "HIGH"
                  ? "bg-red-500 text-white border-red-600"
                  : p === "MEDIUM"
                  ? "bg-amber-400 text-white border-amber-500"
                  : "bg-gray-400 text-white border-gray-500"
                : "bg-white text-gray-500 border-gray-200"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Notes */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={type === "CALL" ? "Call notes…" : type === "MEETING" ? "Meeting notes…" : "Notes…"}
        rows={3}
        className="w-full px-3 py-2 text-xs border border-indigo-200 rounded-xl bg-white text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 resize-none"
      />

      {/* Next follow-up */}
      <div>
        <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Next Follow-up (optional)</label>
        <input
          type="datetime-local"
          value={nextFollowUpDate}
          onChange={(e) => setNextFollowUpDate(e.target.value)}
          className="w-full px-3 py-1.5 text-xs border border-indigo-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-xl bg-white border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isAdding}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {isAdding ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
          {isAdding ? "Saving…" : "Log Activity"}
        </button>
      </div>
    </form>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface LeadFollowUpTimelineProps {
  leadId: string;
}

export function LeadFollowUpTimeline({ leadId }: LeadFollowUpTimelineProps) {
  const { timeline, isLoading, error, isAdding, addFollowUp, retry } = useLeadFollowUp(leadId);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800">Follow-up Timeline</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-100 transition-colors"
          >
            <Plus size={13} />
            Log Activity
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <AddFollowUpForm
          onAdd={async (p) => {
            await addFollowUp(p);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
          isAdding={isAdding}
        />
      )}

      {/* Timeline */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={24} className="animate-spin text-indigo-300" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle size={24} className="text-red-300 mb-2" />
          <p className="text-xs text-gray-500 mb-3">{error}</p>
          <button
            onClick={retry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      ) : timeline.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
            <Clock size={20} className="text-gray-300" />
          </div>
          <p className="text-xs text-gray-400">No follow-up activities yet.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {timeline.map((item) => (
            <TimelineItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
