"use client";

import React from "react";
import { Meeting } from "@/lib/api/meetingsApi";
import { Task } from "@/lib/api/tasksApi";
import { Call } from "@/lib/api/callsApi";
import { UnifiedCalendarEvent } from "@/types/calendar";
import { formatTimeDisplay } from "@/lib/api/calendarService";
import {
  Calendar as CalendarIcon,
  Video,
  Clock,
  Plus,
  CloudOff,
} from "lucide-react";

interface DailySummaryPanelProps {
  selectedDate: Date;
  events: UnifiedCalendarEvent[];
  rawMeetings: Meeting[];
  rawCalls: Call[];
  rawTasks: Task[];
  onOpenCreate: (date: Date) => void;
  onSelectEvent: (event: UnifiedCalendarEvent) => void;
  onSelectMeeting: (meeting: Meeting) => void;
  onSelectCall: (call: Call) => void;
  onSelectTask: (task: Task) => void;
}

export default function DailySummaryPanel({
  selectedDate,
  events,
  rawMeetings,
  rawCalls,
  rawTasks,
  onOpenCreate,
  onSelectEvent,
  onSelectMeeting,
  onSelectCall,
  onSelectTask,
}: DailySummaryPanelProps) {
  // Helper to test if a string date matches selectedDate
  const isSelectedDateMatch = (dateStr?: string) => {
    if (!dateStr) return false;
    let d: Date;
    if (dateStr.includes("T")) {
      d = new Date(dateStr);
    } else {
      const parts = dateStr.split("-").map(Number);
      d = new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return (
      d.getFullYear() === selectedDate.getFullYear() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getDate() === selectedDate.getDate()
    );
  };

  // Filter meetings from unified events that are meetings or custom
  const dayMeetings = events.filter(
    (e) => (e.category === "meeting" || e.category === "interview" || e.sourceType === "meeting") && isSelectedDateMatch(e.date)
  );

  // Filter calls
  const dayCalls = rawCalls.filter((c) => isSelectedDateMatch(c.date));

  // Filter tasks
  const dayTasks = rawTasks.filter((t) => isSelectedDateMatch(t.dueDate || undefined));

  return (
    <div className="w-full xl:w-[380px] shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col overflow-hidden">
      {/* Soft Powder-Blue Header */}
      <div className="p-5 bg-gradient-to-b from-[#F0F5FF] to-slate-50/70 border-b border-slate-200/70 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#1E293B] tracking-tight">
            {selectedDate.toLocaleDateString("en-US", { weekday: "long" })}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {selectedDate.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenCreate(selectedDate)}
            className="p-2 rounded-xl bg-white hover:bg-slate-100/90 text-slate-700 border border-slate-200/90 shadow-2xs transition-colors active:scale-95"
            title="Add event for this date"
          >
            <Plus size={16} strokeWidth={2.2} />
          </button>
          <div className="w-9 h-9 rounded-xl bg-[#E7F0FF] border border-[#C5DAFD]/60 flex items-center justify-center text-[#355D91] shadow-2xs">
            <CalendarIcon size={18} />
          </div>
        </div>
      </div>

      {/* Sections Container */}
      <div className="p-5 space-y-6 overflow-y-auto max-h-[640px] no-scrollbar flex-1">
        {/* MEETINGS SECTION */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#355D91]" /> Meetings & Events
            </h4>
            <span className="text-[10px] font-semibold text-[#355D91] bg-[#E7F0FF] border border-[#C5DAFD]/60 px-2 py-0.5 rounded-full">
              {dayMeetings.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {dayMeetings.length > 0 ? (
              dayMeetings.map((m) => {
                const isPendingSync = m.syncStatus === "pending_sync";
                return (
                  <div
                    key={m.id}
                    onClick={() => onSelectEvent(m)}
                    className="p-3 bg-white hover:bg-slate-50/70 rounded-xl border border-slate-200/80 border-l-4 border-l-[#355D91] shadow-2xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-800 text-xs truncate group-hover:text-[#355D91] transition-colors">
                          {m.title}
                        </p>
                        {isPendingSync && (
                          <span title="Saved locally – pending server sync">
                            <CloudOff size={11} className="text-amber-600 shrink-0" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
                        <Clock size={11} className="text-[#355D91]" />
                        <span>
                          {formatTimeDisplay(m.startTime)} – {formatTimeDisplay(m.endTime)}
                        </span>
                      </p>
                      {(m.room || m.location) && (
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {m.room || m.location}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {m.meetingLink && (
                        <a
                          href={m.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-[#355D91] hover:text-[#23436D] bg-[#E7F0FF] rounded-lg border border-[#C5DAFD]/60 shadow-2xs transition-colors"
                          title="Join video call"
                        >
                          <Video size={13} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(m);
                        }}
                        className="text-[10px] font-semibold text-slate-700 hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 bg-slate-50/70 rounded-xl border border-dashed border-slate-200/80 flex items-center justify-between">
                <p className="text-xs text-slate-400 italic">No meetings scheduled</p>
                <button
                  type="button"
                  onClick={() => onOpenCreate(selectedDate)}
                  className="text-[11px] font-semibold text-[#355D91] hover:underline"
                >
                  + Add
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CALLS SECTION */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#A45F60]" /> Calls
            </h4>
            <span className="text-[10px] font-semibold text-[#A45F60] bg-[#FCE9E7] border border-[#F6CBC8]/60 px-2 py-0.5 rounded-full">
              {dayCalls.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {dayCalls.length > 0 ? (
              dayCalls.map((c) => (
                <div
                  key={c.id || Math.random()}
                  onClick={() => onSelectCall(c)}
                  className="p-3 bg-white hover:bg-slate-50/70 rounded-xl border border-slate-200/80 border-l-4 border-l-[#A45F60] shadow-2xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-xs truncate group-hover:text-[#A45F60] transition-colors">
                      {c.contactName || "Call Log"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {c.duration} mins • <span className="font-medium">{c.outcome}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCall(c);
                    }}
                    className="text-[10px] font-semibold text-slate-700 hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors shrink-0"
                  >
                    View
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic p-3 bg-slate-50/70 rounded-xl border border-dashed border-slate-200/80">
                No calls logged for this date
              </p>
            )}
          </div>
        </div>

        {/* TASKS SECTION */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#397858]" /> Tasks Due
            </h4>
            <span className="text-[10px] font-semibold text-[#397858] bg-[#E7F5EC] border border-[#C6E7D2]/60 px-2 py-0.5 rounded-full">
              {dayTasks.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {dayTasks.length > 0 ? (
              dayTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTask(t)}
                  className="p-3 bg-white hover:bg-slate-50/70 rounded-xl border border-slate-200/80 border-l-4 border-l-[#397858] shadow-2xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-xs truncate group-hover:text-[#397858] transition-colors">
                      {t.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          t.priority === "HIGH"
                            ? "bg-[#FFF0E5] text-[#A96D46] border border-[#FCDCC6]"
                            : "bg-[#E7F5EC] text-[#397858] border border-[#C6E7D2]"
                        }`}
                      >
                        {t.priority}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500">
                        {t.status}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTask(t);
                    }}
                    className="text-[10px] font-semibold text-slate-700 hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors shrink-0"
                  >
                    View
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic p-3 bg-slate-50/70 rounded-xl border border-dashed border-slate-200/80">
                No tasks due on this date
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
