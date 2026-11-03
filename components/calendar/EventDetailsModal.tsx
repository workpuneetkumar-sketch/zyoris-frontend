"use client";

import React from "react";
import { UnifiedCalendarEvent } from "@/types/calendar";
import { formatTimeDisplay, calculateDuration } from "@/lib/api/calendarService";
import { getCategoryToken } from "./calendarTheme";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  Video,
  Users,
  Edit2,
  Trash2,
  ExternalLink,
  Building,
  CloudOff,
} from "lucide-react";

interface EventDetailsModalProps {
  event: UnifiedCalendarEvent | null;
  onClose: () => void;
  onEdit: (event: UnifiedCalendarEvent) => void;
  onDelete?: (id: string) => Promise<void>;
}

export default function EventDetailsModal({
  event,
  onClose,
  onEdit,
  onDelete,
}: EventDetailsModalProps) {
  if (!event) return null;

  const dur = calculateDuration(event.startTime, event.endTime);
  const token = getCategoryToken(event.category);
  const isPendingSync = event.syncStatus === "pending_sync";

  const handleDelete = async () => {
    if (!onDelete) return;
    if (confirm("Are you sure you want to delete this event?")) {
      await onDelete(event.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Soft Header */}
        <div className="p-6 bg-slate-50/90 border-b border-slate-200/80 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
              style={{
                backgroundColor: token.bg,
                color: token.text,
                borderColor: token.border,
              }}
            >
              {token.label}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium capitalize border border-slate-200/60">
              {event.department} Calendar
            </span>
          </div>

          <h3 className="text-xl font-bold text-[#1E293B] tracking-tight leading-tight mb-2">
            {event.title}
          </h3>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <CalendarIcon size={13} className="text-[#355D91]" />
              {new Date(event.date + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <Clock size={13} className="text-[#355D91]" />
              {formatTimeDisplay(event.startTime)} – {formatTimeDisplay(event.endTime)} ({dur})
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Pending Sync Notification Banner */}
          {isPendingSync && (
            <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 font-medium">
              <CloudOff size={16} className="text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">Saved locally – waiting for server connection</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  The backend service is temporarily offline or unreachable. Your event is safely preserved in browser storage.
                </p>
              </div>
            </div>
          )}

          {/* Join Call Banner if link exists */}
          {event.meetingLink && (
            <div className="p-3.5 bg-[#E7F0FF] border border-[#C5DAFD]/70 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#355D91] text-white flex items-center justify-center shadow-2xs shrink-0">
                  <Video size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#355D91]">Video Conference</p>
                  <p className="text-[11px] text-slate-600 truncate">{event.meetingLink}</p>
                </div>
              </div>
              <a
                href={event.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-[#1E293B] hover:bg-[#0F172A] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-all shrink-0"
              >
                <span>Join Now</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Description & Agenda
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60 whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Location & Room */}
          {(event.room || event.location) && (
            <div className="flex items-center gap-2 text-xs text-slate-700 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <Building size={16} className="text-[#355D91] shrink-0" />
              <div>
                <span className="font-semibold text-slate-800">Location / Room:</span>{" "}
                <span className="text-slate-600">{event.room || event.location}</span>
              </div>
            </div>
          )}

          {/* Participants */}
          {event.participants && event.participants.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users size={13} className="text-[#355D91]" />
                <span>Participants ({event.participants.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {event.participants.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-[#E7F0FF] text-[#355D91] border border-[#C5DAFD]/60 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                        {p.email && (
                          <p className="text-[10px] text-slate-400 truncate">{p.email}</p>
                        )}
                      </div>
                    </div>
                    {p.rsvp && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        {p.rsvp}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata badges */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Repeat
              </span>
              <span className="text-xs font-semibold text-slate-800 capitalize">
                {event.recurrence || "None"}
              </span>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Reminder
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {event.reminder || "15m"}
              </span>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Privacy
              </span>
              <span className="text-xs font-semibold text-slate-800 capitalize">
                {event.privacy || "Internal"}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border border-rose-200"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => onEdit(event)}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Edit2 size={13} />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1E293B] text-white hover:bg-[#0F172A] rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
