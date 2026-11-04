"use client";

import React, { useState } from "react";
import { UnifiedCalendarEvent } from "@/types/calendar";
import {
  formatTimeDisplay,
  isSameDay,
  parseTimeMinutes,
  formatDateKey,
  calculateDuration,
} from "@/lib/api/calendarService";
import { getCategoryToken } from "./calendarTheme";
import { Plus, CloudOff, Clock, MapPin, X, ArrowRight } from "lucide-react";

interface MonthViewProps {
  currentDate: Date;
  selectedDate: Date;
  events: UnifiedCalendarEvent[];
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: UnifiedCalendarEvent) => void;
  onCreateEventForDate: (date: Date) => void;
  onSwitchToDayView?: (date: Date) => void;
}

export default function MonthView({
  currentDate,
  selectedDate,
  events,
  onSelectDate,
  onSelectEvent,
  onCreateEventForDate,
  onSwitchToDayView,
}: MonthViewProps) {
  const [overflowDayDate, setOverflowDayDate] = useState<Date | null>(null);

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

  // Sort events chronologically within each day (all-day first, then by startTime)
  const getEventsForDay = (date: Date): UnifiedCalendarEvent[] => {
    const targetKey = formatDateKey(date);
    return events
      .filter((e) => e.date === targetKey)
      .sort((a, b) => {
        if (Boolean(a.allDay) !== Boolean(b.allDay)) {
          return a.allDay ? -1 : 1;
        }
        return parseTimeMinutes(a.startTime) - parseTimeMinutes(b.startTime);
      });
  };

  const selectedDayEvents = getEventsForDay(selectedDate);
  const overflowEvents = overflowDayDate ? getEventsForDay(overflowDayDate) : [];

  return (
    <div className="flex flex-col bg-white flex-1 min-h-0 relative">
      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 border-b border-[#E2E8F0] bg-[#FFFFFF] text-center py-2.5 text-[11px] font-semibold text-[#637381] tracking-wide">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-0.5">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}
      </div>

      {/* Grid of Days */}
      <div className="grid grid-cols-7 flex-1 border-l border-[#F1F3F5]">
        {days.map(({ date, isCurrentMonth }, i) => {
          const isToday = isSameDay(date, new Date());
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const dayEvents = getEventsForDay(date);
          const maxVisible = 3;
          const visibleEvents = dayEvents.slice(0, maxVisible);
          const extraCount = Math.max(0, dayEvents.length - maxVisible);

          return (
            <div
              key={i}
              onClick={() => onSelectDate(date)}
              className={`min-h-[64px] sm:min-h-[96px] md:min-h-[122px] border-r border-b border-[#F1F3F5] p-1.5 md:p-2 flex flex-col transition-colors cursor-pointer relative group ${
                isSelected
                  ? "bg-[#F4F6F8]/80"
                  : !isCurrentMonth
                  ? "bg-[#FAFBFB] text-[#919EAB]"
                  : "bg-white hover:bg-[#F4F6F8]/40"
              }`}
            >
              {/* Top date indicator + quick add on desktop hover */}
              <div className="flex items-center justify-between mb-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateEventForDate(date);
                  }}
                  className="hidden md:flex opacity-0 group-hover:opacity-100 w-5 h-5 items-center justify-center hover:bg-[#E2E8F0]/60 text-[#637381] hover:text-[#212B36] rounded-md transition-opacity"
                  title="Add event on this date"
                  aria-label={`Add event on ${formatDateKey(date)}`}
                >
                  <Plus size={13} strokeWidth={2.2} />
                </button>

                <span
                  className={`w-6 h-6 md:w-7 md:h-7 mx-auto md:mx-0 md:ml-auto text-xs flex items-center justify-center rounded-full transition-colors ${
                    isToday
                      ? "bg-[#FF5630] text-white font-bold shadow-sm"
                      : isSelected
                      ? "bg-[#212B36] text-white font-semibold"
                      : !isCurrentMonth
                      ? "text-[#919EAB] font-normal"
                      : "text-[#212B36] font-medium group-hover:bg-[#F1F3F5]"
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* Mobile View: Compact colored event dots */}
              <div className="flex md:hidden items-center justify-center gap-1 flex-wrap mt-auto pb-0.5">
                {dayEvents.slice(0, 4).map((evt) => {
                  const token = getCategoryToken(evt.category, evt.customColor);
                  return (
                    <span
                      key={evt.id}
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: token.dot }}
                    />
                  );
                })}
                {dayEvents.length > 4 && (
                  <span className="text-[9px] font-bold text-[#637381] leading-none">+</span>
                )}
              </div>

              {/* Desktop View: Compact pastel event cards */}
              <div className="hidden md:flex flex-col space-y-1 overflow-hidden flex-1">
                {visibleEvents.map((evt) => {
                  const token = getCategoryToken(evt.category, evt.customColor);
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
                        borderLeftColor: token.dot,
                        color: token.text,
                      }}
                      className="border-l-[3px] text-[11px] font-medium px-2 py-0.5 rounded-r-md rounded-l-[2px] truncate hover:brightness-95 transition-all cursor-pointer flex items-center justify-between gap-1"
                      title={`${evt.title}${
                        evt.startTime ? ` (${formatTimeDisplay(evt.startTime)})` : " (All day)"
                      }${isPendingSync ? " [Pending sync]" : ""}`}
                    >
                      <span className="truncate font-semibold min-w-0 flex-1">{evt.title}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {isPendingSync && (
                          <span title="Saved locally – pending server sync">
                            <CloudOff size={10} className="text-amber-600/90" />
                          </span>
                        )}
                        {!evt.allDay && evt.startTime && (
                          <span className="hidden xl:inline text-[10px] opacity-80 font-normal">
                            {formatTimeDisplay(evt.startTime)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Functional +X more overflow indicator */}
                {extraCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(date);
                      setOverflowDayDate(date);
                    }}
                    className="w-full text-left text-[11px] font-semibold text-[#637381] hover:text-[#212B36] px-1.5 py-0.5 rounded hover:bg-[#F1F3F5] transition-colors"
                  >
                    +{extraCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Selected-Day Agenda List (visible on < md viewports, with clearance for floating widgets) */}
      <div className="md:hidden border-t border-[#E2E8F0] bg-[#FFFFFF] p-4 pr-16 pb-28 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[#212B36] truncate">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </h4>
            <p className="text-[11px] text-[#637381]">
              {selectedDayEvents.length}{" "}
              {selectedDayEvents.length === 1 ? "event scheduled" : "events scheduled"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onCreateEventForDate(selectedDate)}
            className="px-3 py-1.5 rounded-lg bg-[#FF5630] hover:bg-[#FF4842] text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors shrink-0"
          >
            <Plus size={14} />
            <span>Add</span>
          </button>
        </div>

        {selectedDayEvents.length === 0 ? (
          <div className="py-6 text-center bg-[#F4F6F8]/60 rounded-xl border border-[#F1F3F5]">
            <p className="text-xs text-[#919EAB]">No events scheduled for this day</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayEvents.map((evt) => {
              const token = getCategoryToken(evt.category, evt.customColor);
              return (
                <div
                  key={evt.id}
                  onClick={() => onSelectEvent(evt)}
                  style={{
                    backgroundColor: token.bg,
                    borderLeftColor: token.dot,
                    color: token.text,
                  }}
                  className="p-3 rounded-xl border-l-[4px] flex items-center justify-between gap-3 cursor-pointer transition-opacity active:opacity-80"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{evt.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] opacity-85">
                      <span>
                        {evt.allDay || !evt.startTime
                          ? "All day"
                          : `${formatTimeDisplay(evt.startTime)} – ${formatTimeDisplay(evt.endTime)}`}
                      </span>
                      {(evt.room || evt.location) && (
                        <span className="truncate">• {evt.room || evt.location}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/60 shrink-0">
                    {calculateDuration(evt.startTime, evt.endTime, evt.allDay)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop +X More Overflow Popover Modal */}
      {overflowDayDate && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          onClick={() => setOverflowDayDate(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[#F1F3F5] flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#919EAB]">
                  {overflowDayDate.toLocaleDateString("en-US", { weekday: "long" })}
                </p>
                <h4 className="text-base font-bold text-[#212B36]">
                  {overflowDayDate.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setOverflowDayDate(null)}
                className="p-1.5 text-[#637381] hover:text-[#212B36] hover:bg-[#F4F6F8] rounded-lg transition-colors"
                aria-label="Close day events popover"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 max-h-[320px] overflow-y-auto space-y-2">
              {overflowEvents.map((evt) => {
                const token = getCategoryToken(evt.category, evt.customColor);
                return (
                  <div
                    key={evt.id}
                    onClick={() => {
                      setOverflowDayDate(null);
                      onSelectEvent(evt);
                    }}
                    style={{
                      backgroundColor: token.bg,
                      borderLeftColor: token.dot,
                      color: token.text,
                    }}
                    className="p-2.5 rounded-lg border-l-[3px] cursor-pointer hover:brightness-95 transition-all"
                  >
                    <p className="text-xs font-semibold truncate">{evt.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] opacity-85">
                      <Clock size={11} />
                      <span>
                        {evt.allDay || !evt.startTime
                          ? "All day"
                          : `${formatTimeDisplay(evt.startTime)} – ${formatTimeDisplay(evt.endTime)}`}
                      </span>
                      {(evt.room || evt.location) && (
                        <span className="flex items-center gap-0.5 truncate">
                          <MapPin size={10} />
                          {evt.room || evt.location}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-2.5 bg-[#F4F6F8] border-t border-[#E2E8F0] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const d = overflowDayDate;
                  setOverflowDayDate(null);
                  onCreateEventForDate(d);
                }}
                className="text-xs font-semibold text-[#FF5630] hover:text-[#FF4842] flex items-center gap-1"
              >
                <Plus size={13} />
                <span>Add Event</span>
              </button>

              {onSwitchToDayView && (
                <button
                  type="button"
                  onClick={() => {
                    const d = overflowDayDate;
                    setOverflowDayDate(null);
                    onSwitchToDayView(d);
                  }}
                  className="text-xs font-semibold text-[#212B36] hover:text-[#FF5630] flex items-center gap-1 transition-colors"
                >
                  <span>Day timeline</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
