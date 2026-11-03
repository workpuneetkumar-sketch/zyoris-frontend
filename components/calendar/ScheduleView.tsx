"use client";

import React from "react";
import { UnifiedCalendarEvent } from "@/types/calendar";
import { formatTimeDisplay, calculateDuration, isSameDay } from "@/lib/api/calendarService";
import { getCategoryToken } from "./calendarTheme";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  Users,
  ChevronRight,
  Plus,
  CloudOff,
} from "lucide-react";

interface ScheduleViewProps {
  events: UnifiedCalendarEvent[];
  selectedDate: Date;
  onSelectEvent: (event: UnifiedCalendarEvent) => void;
  onCreateEvent: () => void;
}

export default function ScheduleView({
  events,
  selectedDate,
  onSelectEvent,
  onCreateEvent,
}: ScheduleViewProps) {
  // Sort events chronologically by date and start time
  const sortedEvents = [...events].sort((a, b) => {
    const da = new Date(`${a.date}T${a.startTime || "00:00"}:00`).getTime();
    const db = new Date(`${b.date}T${b.startTime || "00:00"}:00`).getTime();
    return da - db;
  });

  // Group events by date
  const grouped: Record<string, UnifiedCalendarEvent[]> = {};
  sortedEvents.forEach((evt) => {
    const key = evt.date || "Unscheduled";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(evt);
  });

  const dateKeys = Object.keys(grouped);

  const formatGroupHeader = (dateStr: string) => {
    try {
      const parts = dateStr.split("-").map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      if (isSameDay(d, today)) {
        return {
          title: "Today",
          sub: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
          isToday: true,
        };
      }
      if (isSameDay(d, tomorrow)) {
        return {
          title: "Tomorrow",
          sub: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
          isToday: false,
        };
      }
      return {
        title: d.toLocaleDateString("en-US", { weekday: "long" }),
        sub: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        isToday: false,
      };
    } catch {
      return { title: dateStr, sub: "", isToday: false };
    }
  };

  if (dateKeys.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-12 flex flex-col items-center justify-center text-center flex-1">
        <div className="w-16 h-16 rounded-2xl bg-[#E7F0FF] text-[#355D91] flex items-center justify-center mb-4 border border-[#C5DAFD]/60">
          <CalendarIcon size={30} />
        </div>
        <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Upcoming Events</h3>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          Your schedule is completely clear. You can create meetings, record calls, or set tasks to organize your workflow.
        </p>
        <button
          type="button"
          onClick={onCreateEvent}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#0F172A] text-white font-semibold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95"
        >
          <Plus size={16} strokeWidth={2.2} />
          <span>Create First Event</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 md:p-6 overflow-hidden flex-1 flex flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="text-lg font-bold text-[#1E293B] tracking-tight">Agenda & Schedule</h3>
          <p className="text-xs text-slate-400 mt-0.5">Chronological summary of upcoming commitments</p>
        </div>
        <span className="text-xs font-semibold text-[#355D91] bg-[#E7F0FF] border border-[#C5DAFD]/60 px-3 py-1 rounded-full">
          {events.length} {events.length === 1 ? "Event" : "Events"}
        </span>
      </div>

      <div className="space-y-8 overflow-y-auto max-h-[680px] pr-2">
        {dateKeys.map((dateStr) => {
          const { title, sub, isToday } = formatGroupHeader(dateStr);
          const dayItems = grouped[dateStr];

          return (
            <div key={dateStr} className="space-y-3">
              {/* Day Header Badge */}
              <div className="flex items-center gap-3">
                <div
                  className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                    isToday ? "bg-[#1E293B] text-white shadow-2xs" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {title}
                </div>
                <span className="text-xs font-medium text-slate-500">{sub}</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Day Events Cards */}
              <div className="space-y-2.5 pl-1 sm:pl-2">
                {dayItems.map((evt) => {
                  const token = getCategoryToken(evt.category);
                  const dur = calculateDuration(evt.startTime, evt.endTime);
                  const isPendingSync = evt.syncStatus === "pending_sync";

                  return (
                    <div
                      key={evt.id}
                      onClick={() => onSelectEvent(evt)}
                      className="p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white group border-l-4"
                      style={{ borderLeftColor: token.dot }}
                    >
                      <div className="flex items-start gap-4 min-w-0">
                        {/* Time Column */}
                        <div className="w-24 shrink-0">
                          <p className="text-xs font-bold text-slate-800">
                            {formatTimeDisplay(evt.startTime)}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {formatTimeDisplay(evt.endTime)}
                          </p>
                          <span className="inline-block mt-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {dur}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#355D91] transition-colors truncate">
                              {evt.title}
                            </h4>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                              style={{
                                backgroundColor: token.bg,
                                color: token.text,
                                borderColor: token.border,
                              }}
                            >
                              {token.label}
                            </span>
                            {isPendingSync && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                                <CloudOff size={10} />
                                <span>Pending Sync</span>
                              </span>
                            )}
                            <span className="text-[10px] font-medium text-slate-400 capitalize">
                              {evt.department}
                            </span>
                          </div>

                          {evt.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 max-w-lg mb-2">
                              {evt.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            {(evt.room || evt.location) && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} className="text-slate-400" />
                                {evt.room || evt.location}
                              </span>
                            )}

                            {evt.participants && evt.participants.length > 0 && (
                              <span className="flex items-center gap-1.5">
                                <Users size={12} className="text-slate-400" />
                                <span className="truncate">
                                  {evt.participants.map((p) => p.name).join(", ")}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {evt.meetingLink && (
                          <a
                            href={evt.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E7F0FF] text-[#355D91] hover:bg-[#D9E7FC] border border-[#C5DAFD]/60 rounded-xl text-xs font-semibold transition-colors"
                          >
                            <Video size={13} />
                            <span>Join</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectEvent(evt)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <span>Details</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
