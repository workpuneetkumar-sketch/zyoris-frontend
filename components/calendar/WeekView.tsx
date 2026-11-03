"use client";

import React, { useState, useEffect } from "react";
import { UnifiedCalendarEvent } from "@/types/calendar";
import { formatTimeDisplay, calculateDuration, isSameDay } from "@/lib/api/calendarService";
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
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(0);

  // Keep track of current time for live indicator
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Compute days of the current week
  const getDaysOfWeek = (): Date[] => {
    const start = new Date(currentDate);
    const day = start.getDay(); // 0 is Sunday
    // Workweek starts on Monday (offset 1), full week on Sunday (offset 0)
    const diff = start.getDate() - day + (isWorkweek ? 1 : 0);
    const weekStart = new Date(start.setDate(diff));

    const numDays = isWorkweek ? 5 : 7;
    const days: Date[] = [];
    for (let i = 0; i < numDays; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getDaysOfWeek();

  // Hourly grid range: business hours 8 AM - 8 PM vs full 24 hours
  const startHour = showFullDay ? 0 : 8;
  const endHour = showFullDay ? 24 : 20;
  const rowHeight = 60; // px per hour slot

  const parseMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    if (timeStr.includes("T")) {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return d.getHours() * 60 + d.getMinutes();
      }
    }
    const [h, m] = timeStr.split(":");
    return parseInt(h, 10) * 60 + parseInt(m || "0", 10);
  };

  const hoursArray = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex-1">
      {/* View Header with 24h Toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200/60 bg-slate-50/70 text-xs">
        <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
          {isWorkweek ? "Workweek Schedule (Mon – Fri)" : "Weekly Timeline (7 Days)"}
        </span>
        <button
          type="button"
          onClick={() => setShowFullDay(!showFullDay)}
          className="text-[#355D91] hover:text-[#23436D] font-semibold text-[11px] hover:underline transition-colors"
        >
          {showFullDay ? "Show Business Hours (8 AM – 8 PM)" : "Show All 24 Hours"}
        </button>
      </div>

      {/* Weekday Column Headers */}
      <div className="grid grid-cols-[56px_repeat(auto-fit,minmax(110px,1fr))] border-b border-slate-200/70 bg-white sticky top-0 z-20 shadow-2xs">
        {/* Time spacer */}
        <div className="border-r border-slate-200/60 p-2 text-center text-[10px] font-semibold text-slate-400">
          Time
        </div>

        {/* Days */}
        {weekDays.map((date, idx) => {
          const isToday = isSameDay(date, new Date());
          const isSelected = selectedDate && isSameDay(date, selectedDate);

          return (
            <div
              key={idx}
              onClick={() => onSelectDate(date)}
              className={`p-2.5 text-center border-r border-slate-200/60 cursor-pointer transition-colors relative ${
                isSelected ? "bg-[#F0F6FF]" : "hover:bg-slate-50/70"
              }`}
            >
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <span
                  className={`text-sm md:text-base font-bold px-2 py-0.5 rounded-full transition-all ${
                    isToday
                      ? "bg-[#1E293B] text-white shadow-2xs"
                      : isSelected
                      ? "bg-[#E7F0FF] text-[#355D91] border border-[#C5DAFD]/60"
                      : "text-slate-800"
                  }`}
                >
                  {date.getDate()}
                </span>
                {isToday && (
                  <span className="hidden sm:inline-block text-[10px] font-semibold text-[#355D91] uppercase tracking-wider bg-[#E7F0FF] px-1.5 py-0.5 rounded-full border border-[#C5DAFD]/50">
                    Today
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hourly Grid with Events */}
      <div className="relative overflow-y-auto max-h-[680px] flex-1">
        <div
          className="grid grid-cols-[56px_repeat(auto-fit,minmax(110px,1fr))] relative"
          style={{ height: `${hoursArray.length * rowHeight}px` }}
        >
          {/* Time Labels Column */}
          <div className="border-r border-slate-200/60 bg-slate-50/30 select-none">
            {hoursArray.map((hour) => {
              const ampm = hour >= 12 ? "PM" : "AM";
              const displayHour = hour % 12 === 0 ? 12 : hour % 12;
              return (
                <div
                  key={hour}
                  className="border-b border-slate-100 pr-2 text-right text-[11px] font-medium text-slate-400 -translate-y-2.5"
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
            const dayEvents = events.filter((e) => {
              if (!e.date) return false;
              const [ey, em, ed] = e.date.split("-").map(Number);
              return (
                dayDate.getFullYear() === ey &&
                dayDate.getMonth() === em - 1 &&
                dayDate.getDate() === ed
              );
            });

            return (
              <div
                key={dayIdx}
                className={`border-r border-slate-200/60 relative ${
                  isToday ? "bg-[#F0F6FF]/30" : ""
                }`}
              >
                {/* Horizontal hour guidelines */}
                {hoursArray.map((hour) => (
                  <div
                    key={hour}
                    onClick={() => onCreateEventSlot(dayDate, hour)}
                    className="border-b border-slate-100 hover:bg-[#E7F0FF]/25 transition-colors cursor-pointer"
                    style={{ height: `${rowHeight}px` }}
                    title={`Click to schedule at ${hour % 12 === 0 ? 12 : hour % 12}:00`}
                  />
                ))}

                {/* Current Time Red Line Indicator (if today) */}
                {isToday &&
                  currentTimeMinutes >= startHour * 60 &&
                  currentTimeMinutes <= endHour * 60 && (
                    <div
                      className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                      style={{
                        top: `${((currentTimeMinutes - startHour * 60) / 60) * rowHeight}px`,
                      }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm -ml-1" />
                      <div className="flex-1 h-[2px] bg-rose-500 shadow-2xs" />
                      <span className="text-[9px] font-bold bg-rose-500 text-white px-1 py-0.2 rounded mr-1">
                        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}

                {/* Positioned Event Cards */}
                {dayEvents.map((evt) => {
                  const startMin = parseMinutes(evt.startTime);
                  const endMin = Math.max(startMin + 30, parseMinutes(evt.endTime));

                  // Skip events outside the visible time range
                  if (endMin <= startHour * 60 || startMin >= endHour * 60) {
                    return null;
                  }

                  const topMin = Math.max(0, startMin - startHour * 60);
                  const durationMin = Math.min(
                    endHour * 60 - Math.max(startHour * 60, startMin),
                    endMin - Math.max(startHour * 60, startMin)
                  );

                  const topPx = (topMin / 60) * rowHeight;
                  const heightPx = Math.max(34, (durationMin / 60) * rowHeight - 4);

                  const token = getCategoryToken(evt.category);
                  const durLabel = calculateDuration(evt.startTime, evt.endTime);
                  const isPendingSync = evt.syncStatus === "pending_sync";

                  return (
                    <div
                      key={evt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(evt);
                      }}
                      className="absolute left-1 right-1 rounded-xl p-2 shadow-2xs cursor-pointer overflow-hidden transition-all hover:shadow-md hover:z-20 border border-l-3"
                      style={{
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                        backgroundColor: token.bg,
                        borderColor: token.border,
                        borderLeftColor: token.dot,
                        color: token.text,
                      }}
                      title={`${evt.title} (${formatTimeDisplay(evt.startTime)} – ${formatTimeDisplay(evt.endTime)})${isPendingSync ? " [Offline pending sync]" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-bold leading-snug truncate" style={{ color: token.text }}>
                          {evt.title}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          {isPendingSync && (
                            <span title="Awaiting server sync">
                              <CloudOff size={10} className="text-amber-600/90" />
                            </span>
                          )}
                          <span className="text-[10px] font-semibold opacity-75">
                            {durLabel}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] opacity-80 font-medium truncate">
                        <Clock size={11} style={{ color: token.dot }} />
                        <span>
                          {formatTimeDisplay(evt.startTime)} – {formatTimeDisplay(evt.endTime)}
                        </span>
                      </div>

                      {heightPx > 50 && (evt.room || evt.location) && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] opacity-75 truncate">
                          <MapPin size={10} style={{ color: token.dot }} />
                          <span className="truncate">{evt.room || evt.location}</span>
                        </div>
                      )}

                      {heightPx > 60 && evt.participants && evt.participants.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {evt.participants.slice(0, 3).map((p, pIdx) => (
                              <div
                                key={pIdx}
                                className="w-4 h-4 rounded-full border border-white flex items-center justify-center text-[9px] font-bold shadow-2xs"
                                style={{ backgroundColor: token.badgeBg, color: token.text }}
                                title={p.name}
                              >
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                          {evt.participants.length > 3 && (
                            <span className="text-[9px] opacity-70 font-medium">
                              +{evt.participants.length - 3}
                            </span>
                          )}
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
  );
}
