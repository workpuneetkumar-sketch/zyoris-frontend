"use client";

import React, { useState, useEffect, useMemo } from "react";
import { UnifiedCalendarEvent } from "@/types/calendar";
import {
  formatTimeDisplay,
  calculateDuration,
  isSameDay,
  getWeekDays,
  computeOverlapLayout,
  formatDateKey,
  parseTimeMinutes,
} from "@/lib/api/calendarService";
import { getCategoryToken } from "./calendarTheme";
import { Clock, MapPin, CloudOff } from "lucide-react";

interface WeekViewProps {
  currentDate: Date;
  selectedDate: Date;
  events: UnifiedCalendarEvent[];
  isWorkweek?: boolean;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: UnifiedCalendarEvent) => void;
  onCreateEventSlot: (date: Date, hour: number) => void;
}

export default function WeekView({
  currentDate,
  selectedDate,
  events,
  isWorkweek = false,
  onSelectDate,
  onSelectEvent,
  onCreateEventSlot,
}: WeekViewProps) {
  const [showFullDay, setShowFullDay] = useState(false);
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Immutable week days calculation (fixes Sunday workweek bug and Date mutation bug)
  const weekDays = useMemo(
    () => getWeekDays(currentDate, isWorkweek),
    [currentDate, isWorkweek]
  );

  const weekDateKeys = useMemo(
    () => new Set(weekDays.map((d) => formatDateKey(d))),
    [weekDays]
  );

  // Check if any timed event in this week falls outside 8 AM - 8 PM
  const hasOffHoursEvents = useMemo(() => {
    return events.some((e) => {
      if (!e.date || !weekDateKeys.has(e.date) || e.allDay || !e.startTime) return false;
      const s = parseTimeMinutes(e.startTime);
      const end = e.endTime ? parseTimeMinutes(e.endTime) : s + 60;
      return s < 8 * 60 || end > 20 * 60;
    });
  }, [events, weekDateKeys]);

  const effectiveFullDay = showFullDay || hasOffHoursEvents;
  const startHour = effectiveFullDay ? 0 : 8;
  const endHour = effectiveFullDay ? 24 : 20;
  const rowHeight = 64; // 8px multiple (64px per hour)

  const hoursArray = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridColsClass = isWorkweek
    ? "grid-cols-[60px_repeat(5,minmax(120px,1fr))]"
    : "grid-cols-[60px_repeat(7,minmax(115px,1fr))]";

  return (
    <div className="flex flex-col bg-white flex-1 min-h-0 overflow-hidden">
      {/* Subtle Timeline Mode Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#F1F3F5] bg-[#FAFBFB] text-[11px]">
        <span className="font-medium text-[#637381]">
          {isWorkweek ? "Workweek (Mon – Fri)" : "Weekly Schedule"}
          {hasOffHoursEvents && !showFullDay && " • Auto-expanded for early/late events"}
        </span>
        <button
          type="button"
          onClick={() => setShowFullDay(!showFullDay)}
          className="text-[#212B36] hover:text-[#FF5630] font-semibold transition-colors"
        >
          {effectiveFullDay ? "Business Hours (8 AM – 8 PM)" : "All 24 Hours"}
        </button>
      </div>

      {/* Horizontally Scrollable Container for Mobile/Tablet */}
      <div className="flex-1 flex flex-col overflow-x-auto overflow-y-hidden min-h-0">
        <div className={isWorkweek ? "min-w-[660px] flex-1 flex flex-col min-h-0" : "min-w-[860px] flex-1 flex flex-col min-h-0"}>
          {/* Weekday Column Headers */}
          <div className={`grid ${gridColsClass} border-b border-[#E2E8F0] bg-white sticky top-0 z-20`}>
            <div className="border-r border-[#F1F3F5] p-2 flex items-center justify-center text-[10px] font-medium text-[#919EAB]">
              GMT+5:30
            </div>

            {weekDays.map((date, idx) => {
              const isToday = isSameDay(date, new Date());
              const isSelected = selectedDate && isSameDay(date, selectedDate);

              return (
                <div
                  key={idx}
                  onClick={() => onSelectDate(date)}
                  className={`py-2.5 px-2 text-center border-r border-[#F1F3F5] cursor-pointer transition-colors ${
                    isSelected ? "bg-[#F4F6F8]/70" : "hover:bg-[#F4F6F8]/40"
                  }`}
                >
                  <p
                    className={`text-[11px] font-medium uppercase tracking-wide ${
                      isToday ? "text-[#FF5630] font-semibold" : "text-[#637381]"
                    }`}
                  >
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <div className="mt-1 flex items-center justify-center">
                    <span
                      className={`w-7 h-7 text-sm flex items-center justify-center rounded-full transition-colors ${
                        isToday
                          ? "bg-[#FF5630] text-white font-bold shadow-sm"
                          : isSelected
                          ? "bg-[#212B36] text-white font-semibold"
                          : "text-[#212B36] font-semibold"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* All-Day Events Row */}
          <div className={`grid ${gridColsClass} border-b border-[#E2E8F0] bg-[#FAFBFB]/60 shrink-0`}>
            <div className="border-r border-[#F1F3F5] px-2 py-1.5 flex items-center justify-end text-[10px] font-medium text-[#919EAB]">
              All-day
            </div>
            {weekDays.map((dayDate, dayIdx) => {
              const dayKey = formatDateKey(dayDate);
              const allDayEvents = events.filter(
                (e) => e.date === dayKey && (e.allDay || !e.startTime)
              );

              return (
                <div
                  key={dayIdx}
                  onClick={() => onSelectDate(dayDate)}
                  className="border-r border-[#F1F3F5] p-1 min-h-[32px] space-y-1"
                >
                  {allDayEvents.map((evt) => {
                    const token = getCategoryToken(evt.category, evt.customColor);
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
                        className="border-l-[3px] px-1.5 py-0.5 rounded-r text-[10px] font-semibold truncate cursor-pointer hover:brightness-95 transition-all"
                        title={`${evt.title} (All day)`}
                      >
                        {evt.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Hourly Grid with Positioned & Overlap-Aware Events */}
          <div className="relative overflow-y-auto flex-1 max-h-[660px]">
            <div
              className={`grid ${gridColsClass} relative`}
              style={{ height: `${hoursArray.length * rowHeight}px` }}
            >
              {/* Time Labels Column */}
              <div className="border-r border-[#F1F3F5] bg-white select-none">
                {hoursArray.map((hour) => {
                  const ampm = hour >= 12 ? "PM" : "AM";
                  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
                  return (
                    <div
                      key={hour}
                      className="border-b border-[#F1F3F5] pr-2 pt-1 text-right text-[11px] font-medium text-[#919EAB]"
                      style={{ height: `${rowHeight}px` }}
                    >
                      {displayHour} {ampm}
                    </div>
                  );
                })}
              </div>

              {/* Day Columns */}
              {weekDays.map((dayDate, dayIdx) => {
                const isToday = isSameDay(dayDate, new Date());
                const dayKey = formatDateKey(dayDate);
                const dayTimedEvents = events.filter(
                  (e) => e.date === dayKey && !e.allDay && Boolean(e.startTime)
                );

                // Compute proportional non-overlapping column layout
                const positionedEvents = computeOverlapLayout(dayTimedEvents);

                return (
                  <div
                    key={dayIdx}
                    className={`border-r border-[#F1F3F5] relative ${
                      isToday ? "bg-[#F4F6F8]/35" : "bg-white"
                    }`}
                  >
                    {/* Horizontal hour guidelines */}
                    {hoursArray.map((hour) => (
                      <div
                        key={hour}
                        onClick={() => onCreateEventSlot(dayDate, hour)}
                        className="border-b border-[#F1F3F5] hover:bg-[#F4F6F8]/60 transition-colors cursor-pointer"
                        style={{ height: `${rowHeight}px` }}
                        title={`Schedule event at ${hour % 12 === 0 ? 12 : hour % 12}:00 ${
                          hour >= 12 ? "PM" : "AM"
                        }`}
                      />
                    ))}

                    {/* Current Time Coral-Red Indicator (if today) */}
                    {isToday &&
                      currentTimeMinutes >= startHour * 60 &&
                      currentTimeMinutes <= endHour * 60 && (
                        <div
                          className="absolute left-0 right-0 z-30 flex items-center pointer-events-none"
                          style={{
                            top: `${((currentTimeMinutes - startHour * 60) / 60) * rowHeight}px`,
                          }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5630] shadow-sm -ml-1.5" />
                          <div className="flex-1 h-[2px] bg-[#FF5630]" />
                        </div>
                      )}

                    {/* Positioned Event Cards */}
                    {positionedEvents.map(({ event: evt, startMinutes, endMinutes, leftPct, widthPct }) => {
                      if (endMinutes <= startHour * 60 || startMinutes >= endHour * 60) {
                        return null;
                      }

                      const visibleStart = Math.max(startHour * 60, startMinutes);
                      const visibleEnd = Math.min(endHour * 60, endMinutes);
                      const topMin = visibleStart - startHour * 60;
                      const durationMin = Math.max(20, visibleEnd - visibleStart);

                      const topPx = (topMin / 60) * rowHeight;
                      const heightPx = Math.max(32, (durationMin / 60) * rowHeight - 2);

                      const token = getCategoryToken(evt.category, evt.customColor);
                      const durLabel = calculateDuration(evt.startTime, evt.endTime, evt.allDay);
                      const isPendingSync = evt.syncStatus === "pending_sync";

                      return (
                        <div
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(evt);
                          }}
                          className="absolute rounded-lg p-1.5 shadow-sm cursor-pointer overflow-hidden transition-all hover:shadow-md hover:z-20 border-l-[3px]"
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                            backgroundColor: token.bg,
                            borderColor: token.border,
                            borderLeftColor: token.dot,
                            color: token.text,
                          }}
                          title={`${evt.title} (${formatTimeDisplay(evt.startTime)} – ${formatTimeDisplay(
                            evt.endTime
                          )})${isPendingSync ? " [Pending sync]" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <h4
                              className="text-[11px] font-semibold leading-tight truncate"
                              style={{ color: token.text }}
                            >
                              {evt.title}
                            </h4>
                            {isPendingSync && (
                              <span title="Awaiting server sync" className="shrink-0">
                                <CloudOff size={10} className="text-amber-600/90" />
                              </span>
                            )}
                          </div>

                          {heightPx >= 42 && (
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] opacity-85 font-medium truncate">
                              <Clock size={10} style={{ color: token.dot }} className="shrink-0" />
                              <span className="truncate">
                                {formatTimeDisplay(evt.startTime)} – {formatTimeDisplay(evt.endTime)}
                              </span>
                            </div>
                          )}

                          {heightPx >= 60 && (evt.room || evt.location) && (
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] opacity-80 truncate">
                              <MapPin size={10} style={{ color: token.dot }} className="shrink-0" />
                              <span className="truncate">{evt.room || evt.location}</span>
                            </div>
                          )}

                          {heightPx >= 76 && evt.participants && evt.participants.length > 0 && (
                            <div className="flex items-center justify-between gap-1 mt-1.5">
                              <div className="flex -space-x-1 overflow-hidden">
                                {evt.participants.slice(0, 3).map((p, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="w-4 h-4 rounded-full border border-white flex items-center justify-center text-[8px] font-bold"
                                    style={{ backgroundColor: token.badgeBg, color: token.text }}
                                    title={p.name}
                                  >
                                    {p.name.charAt(0).toUpperCase()}
                                  </div>
                                ))}
                              </div>
                              <span className="text-[9px] font-medium opacity-75">{durLabel}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
