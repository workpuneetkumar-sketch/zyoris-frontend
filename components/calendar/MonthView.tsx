"use client";

import React from "react";
import { UnifiedCalendarEvent } from "@/types/calendar";
import { formatTimeDisplay, isSameDay } from "@/lib/api/calendarService";
import { getCategoryToken } from "./calendarTheme";
import { Plus, CloudOff } from "lucide-react";

interface MonthViewProps {
  currentDate: Date;
  selectedDate: Date;
  events: UnifiedCalendarEvent[];
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: UnifiedCalendarEvent) => void;
  onCreateEventForDate: (date: Date) => void;
}

export default function MonthView({
  currentDate,
  selectedDate,
  events,
  onSelectDate,
  onSelectEvent,
  onCreateEventForDate,
}: MonthViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getCalendarDays = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    const firstDayIndex = firstDay.getDay(); // 0 is Sunday

    // Days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month, -i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Remaining slots to form full 35 or 42 grid
    const totalSlots = days.length > 35 ? 42 : 35;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const days = getCalendarDays();

  const getEventsForDay = (date: Date) => {
    return events.filter((e) => {
      if (!e.date) return false;
      const [ey, em, ed] = e.date.split("-").map(Number);
      return (
        date.getFullYear() === ey &&
        date.getMonth() === em - 1 &&
        date.getDate() === ed
      );
    });
  };

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex-1">
      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 border-b border-slate-200/70 bg-slate-50/70 text-center py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* Grid of Days */}
      <div className="grid grid-cols-7 border-l border-t border-slate-200/60 flex-1">
        {days.map(({ date, isCurrentMonth }, i) => {
          const isToday = isSameDay(date, new Date());
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const dayEvents = getEventsForDay(date);
          const maxVisible = 3;
          const visibleEvents = dayEvents.slice(0, maxVisible);
          const extraCount = dayEvents.length - maxVisible;

          return (
            <div
              key={i}
              onClick={() => onSelectDate(date)}
              className={`min-h-[110px] md:min-h-[125px] border-r border-b border-slate-200/60 p-2 flex flex-col transition-all cursor-pointer relative group ${
                isSelected
                  ? "bg-[#F0F6FF] ring-1 ring-inset ring-[#C5DAFD]"
                  : !isCurrentMonth
                  ? "bg-slate-50/40 text-slate-400"
                  : "bg-white hover:bg-slate-50/70"
              }`}
            >
              {/* Top date indicator + quick add */}
              <div className="flex items-center justify-between mb-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateEventForDate(date);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#E7F0FF] text-[#355D91] rounded-md transition-opacity"
                  title="Add event on this date"
                >
                  <Plus size={13} strokeWidth={2.2} />
                </button>

                <span
                  className={`text-xs px-2 py-0.5 rounded-full transition-all ${
                    isToday
                      ? "bg-[#1E293B] text-white font-bold shadow-2xs"
                      : isSelected
                      ? "bg-[#E7F0FF] text-[#355D91] font-bold border border-[#C5DAFD]/60"
                      : !isCurrentMonth
                      ? "text-slate-300 font-normal"
                      : "text-slate-700 font-medium group-hover:text-slate-900"
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* Event badges list */}
              <div className="space-y-1.5 overflow-hidden flex-1">
                {visibleEvents.map((evt) => {
                  const token = getCategoryToken(evt.category);
                  const isPendingSync = evt.syncStatus === "pending_sync";

                  return (
                    <div
                      key={evt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(evt);
                      }}
                      style={{
                        backgroundColor: token.bg,
                        borderColor: token.border,
                        borderLeftColor: token.dot,
                        color: token.text,
                      }}
                      className="border border-l-2 text-[11px] font-semibold px-2 py-1 rounded-md shadow-2xs truncate hover:opacity-95 transition-all cursor-pointer flex items-center justify-between gap-1.5"
                      title={`${evt.title} (${formatTimeDisplay(evt.startTime)})${isPendingSync ? " [Saved locally – waiting for server]" : ""}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: token.dot }}
                        />
                        <span className="truncate">{evt.title}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isPendingSync && (
                          <span title="Saved locally – pending server sync">
                            <CloudOff size={10} className="text-amber-600/90" />
                          </span>
                        )}
                        {evt.startTime && (
                          <span className="text-[10px] opacity-75 font-normal">
                            {formatTimeDisplay(evt.startTime)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* More events overflow chip */}
                {extraCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(date);
                    }}
                    className="w-full text-left text-[10px] font-semibold text-[#355D91] hover:text-[#23436D] px-2 py-0.5 rounded-md bg-[#E7F0FF]/80 hover:bg-[#E7F0FF] border border-[#C5DAFD]/60 transition-colors"
                  >
                    +{extraCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
