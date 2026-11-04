"use client";

import React, { useState, useMemo } from "react";
import { UnifiedCalendarEvent } from "@/types/calendar";
import {
  formatTimeDisplay,
  calculateDuration,
  isSameDay,
  parseDateSafe,
  parseTimeMinutes,
} from "@/lib/api/calendarService";
import { getCategoryToken } from "./calendarTheme";
import {
  Calendar as CalendarIcon,
  MapPin,
  Video,
  Users,
  ChevronRight,
  Plus,
  CloudOff,
} from "lucide-react";

interface ScheduleViewProps {
  events: UnifiedCalendarEvent[];
  currentDate?: Date;
  selectedDate: Date;
  onSelectEvent: (event: UnifiedCalendarEvent) => void;
  onCreateEvent: () => void;
}

export default function ScheduleView({
  events,
  currentDate,
  selectedDate,
  onSelectEvent,
  onCreateEvent,
}: ScheduleViewProps) {
  const [rangeScope, setRangeScope] = useState<"month" | "all">("month");
  const activeMonthDate = currentDate || selectedDate;

  // Filter events to the active navigated month unless user explicitly selects "all"
  const scopedEvents = useMemo(() => {
    const targetYear = activeMonthDate.getFullYear();
    const targetMonth = activeMonthDate.getMonth();

    const filtered =
      rangeScope === "all"
        ? events
        : events.filter((evt) => {
            if (!evt.date) return false;
            const d = parseDateSafe(evt.date);
            return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
          });

    return [...filtered].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (Boolean(a.allDay) !== Boolean(b.allDay)) return a.allDay ? -1 : 1;
      return parseTimeMinutes(a.startTime) - parseTimeMinutes(b.startTime);
    });
  }, [events, activeMonthDate, rangeScope]);

  // Group events chronologically by date
  const grouped = useMemo(() => {
    const map: Record<string, UnifiedCalendarEvent[]> = {};
    scopedEvents.forEach((evt) => {
      const key = evt.date || "Unscheduled";
      if (!map[key]) map[key] = [];
      map[key].push(evt);
    });
    return map;
  }, [scopedEvents]);

  const dateKeys = Object.keys(grouped);

  const formatGroupHeader = (dateStr: string) => {
    try {
      const d = parseDateSafe(dateStr);
      const today = new Date();
      const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const isSelected = isSameDay(d, selectedDate);

      if (isSameDay(d, today)) {
        return {
          title: "Today",
          sub: d.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          isToday: true,
          isSelected,
        };
      }
      if (isSameDay(d, tomorrow)) {
        return {
          title: "Tomorrow",
          sub: d.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          isToday: false,
          isSelected,
        };
      }
      return {
        title: d.toLocaleDateString("en-US", { weekday: "long" }),
        sub: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        isToday: false,
        isSelected,
      };
    } catch {
      return { title: dateStr, sub: "", isToday: false, isSelected: false };
    }
  };

  const monthLabel = activeMonthDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-white p-4 md:p-6 overflow-hidden flex-1 flex flex-col min-h-0">
      {/* Agenda Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0] mb-5">
        <div>
          <h3 className="text-base md:text-lg font-bold text-[#212B36] tracking-tight">
            Agenda — {rangeScope === "month" ? monthLabel : "All Scheduled Events"}
          </h3>
          <p className="text-xs text-[#637381] mt-0.5">
            {scopedEvents.length} {scopedEvents.length === 1 ? "item" : "items"} in view
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-[#F4F6F8] p-0.5 border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setRangeScope("month")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                rangeScope === "month"
                  ? "bg-white text-[#212B36] shadow-sm"
                  : "text-[#637381] hover:text-[#212B36]"
              }`}
            >
              {activeMonthDate.toLocaleDateString("en-US", { month: "short" })}
            </button>
            <button
              type="button"
              onClick={() => setRangeScope("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                rangeScope === "all"
                  ? "bg-white text-[#212B36] shadow-sm"
                  : "text-[#637381] hover:text-[#212B36]"
              }`}
            >
              All Dates
            </button>
          </div>
        </div>
      </div>

      {dateKeys.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center flex-1">
          <div className="w-12 h-12 rounded-2xl bg-[#F4F6F8] text-[#637381] flex items-center justify-center mb-3 border border-[#E2E8F0]">
            <CalendarIcon size={24} />
          </div>
          <h4 className="text-base font-bold text-[#212B36] mb-1">
            No Events Scheduled for {rangeScope === "month" ? monthLabel : "This Filter"}
          </h4>
          <p className="text-xs text-[#637381] max-w-sm mb-5">
            {events.length > 0 && rangeScope === "month"
              ? `There are no events in ${monthLabel}. Use the navigation arrows or switch to "All Dates" to view other months.`
              : "Your schedule is clear for the selected filters. Create a new event to get started."}
          </p>
          <div className="flex items-center gap-2">
            {events.length > 0 && rangeScope === "month" && (
              <button
                type="button"
                onClick={() => setRangeScope("all")}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-[#212B36] hover:bg-[#F4F6F8] font-semibold text-xs transition-colors"
              >
                Show All Dates ({events.length})
              </button>
            )}
            <button
              type="button"
              onClick={onCreateEvent}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF5630] hover:bg-[#FF4842] text-white font-semibold text-xs shadow-sm transition-all"
            >
              <Plus size={15} strokeWidth={2.2} />
              <span>New Event</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 overflow-y-auto max-h-[660px] pr-1">
          {dateKeys.map((dateStr) => {
            const { title, sub, isToday, isSelected } = formatGroupHeader(dateStr);
            const dayItems = grouped[dateStr];

            return (
              <div key={dateStr} className="space-y-2.5">
                {/* Date Separator Header */}
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                      isToday
                        ? "bg-[#FF5630] text-white"
                        : isSelected
                        ? "bg-[#212B36] text-white"
                        : "bg-[#F4F6F8] text-[#212B36]"
                    }`}
                  >
                    {title}
                  </span>
                  <span className="text-xs font-medium text-[#637381]">{sub}</span>
                  <div className="flex-1 h-px bg-[#F1F3F5]" />
                </div>

                {/* Day Events Rows */}
                <div className="space-y-2">
                  {dayItems.map((evt) => {
                    const token = getCategoryToken(evt.category, evt.customColor);
                    const dur = calculateDuration(evt.startTime, evt.endTime, evt.allDay);
                    const isPendingSync = evt.syncStatus === "pending_sync";

                    return (
                      <div
                        key={evt.id}
                        onClick={() => onSelectEvent(evt)}
                        className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#919EAB]/60 hover:bg-[#F4F6F8]/30 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white group border-l-[4px]"
                        style={{ borderLeftColor: token.dot }}
                      >
                        <div className="flex items-start gap-4 min-w-0">
                          {/* Time Column */}
                          <div className="w-24 shrink-0">
                            {evt.allDay || !evt.startTime ? (
                              <span
                                className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded"
                                style={{ backgroundColor: token.bg, color: token.text }}
                              >
                                All day
                              </span>
                            ) : (
                              <>
                                <p className="text-xs font-semibold text-[#212B36]">
                                  {formatTimeDisplay(evt.startTime)}
                                </p>
                                <p className="text-[11px] text-[#637381] mt-0.5">
                                  {formatTimeDisplay(evt.endTime)}
                                </p>
                                <span className="inline-block mt-1 text-[10px] font-medium text-[#637381] bg-[#F4F6F8] px-1.5 py-0.5 rounded">
                                  {dur}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Event Details */}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className="text-sm font-semibold text-[#212B36] group-hover:text-[#FF5630] transition-colors truncate">
                                {evt.title}
                              </h4>
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                                style={{
                                  backgroundColor: token.bg,
                                  color: token.text,
                                }}
                              >
                                {token.label}
                              </span>
                              {isPendingSync && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                                  <CloudOff size={10} />
                                  <span>Pending Sync</span>
                                </span>
                              )}
                              <span className="text-[11px] font-medium text-[#919EAB] capitalize">
                                {evt.department}
                              </span>
                            </div>

                            {evt.description && (
                              <p className="text-xs text-[#637381] line-clamp-1 max-w-xl mb-1.5">
                                {evt.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 text-xs text-[#637381]">
                              {(evt.room || evt.location) && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={12} className="text-[#919EAB]" />
                                  {evt.room || evt.location}
                                </span>
                              )}

                              {evt.participants && evt.participants.length > 0 && (
                                <span className="flex items-center gap-1.5">
                                  <Users size={12} className="text-[#919EAB]" />
                                  <span className="truncate max-w-[240px]">
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
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C252E] text-white hover:bg-[#28323D] rounded-lg text-xs font-semibold transition-colors"
                            >
                              <Video size={13} />
                              <span>Join</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEvent(evt);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-[#212B36] hover:bg-[#F4F6F8] text-xs font-medium transition-colors flex items-center gap-1"
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
      )}
    </div>
  );
}
