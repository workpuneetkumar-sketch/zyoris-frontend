"use client";

import React, { useState, useEffect, useMemo } from "react";
import { UnifiedCalendarEvent } from "@/types/calendar";
import {
  formatTimeDisplay,
  calculateDuration,
  isSameDay,
  computeOverlapLayout,
  formatDateKey,
  parseTimeMinutes,
  getWeekDays,
} from "@/lib/api/calendarService";
import { getCategoryToken } from "./calendarTheme";
import {
  Clock,
  MapPin,
  Video,
  Flame,
  CloudOff,
} from "lucide-react";

interface DayViewProps {
  currentDate: Date;
  events: UnifiedCalendarEvent[];
  onSelectEvent: (event: UnifiedCalendarEvent) => void;
  onCreateEventSlot: (date: Date, hour: number) => void;
  onSelectDate?: (date: Date) => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onToday?: () => void;
}

export default function DayView({
  currentDate,
  events,
  onSelectEvent,
  onCreateEventSlot,
  onSelectDate,
}: DayViewProps) {
  const [showFullDay, setShowFullDay] = useState(false);
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const n = new Date();
      setCurrentTimeMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const isToday = isSameDay(currentDate, new Date());
  const dateKey = formatDateKey(currentDate);

  // Filter events for this day
  const dayEvents = useMemo(
    () => events.filter((e) => e.date === dateKey),
    [events, dateKey]
  );

  const allDayEvents = useMemo(
    () => dayEvents.filter((e) => e.allDay || !e.startTime),
    [dayEvents]
  );

  const timedEvents = useMemo(
    () => dayEvents.filter((e) => !e.allDay && Boolean(e.startTime)),
    [dayEvents]
  );

  // Ensure events outside 8 AM - 8 PM are never hidden
  const hasOffHoursEvents = useMemo(() => {
    return timedEvents.some((e) => {
      const s = parseTimeMinutes(e.startTime);
      const end = e.endTime ? parseTimeMinutes(e.endTime) : s + 60;
      return s < 8 * 60 || end > 20 * 60;
    });
  }, [timedEvents]);

  const effectiveFullDay = showFullDay || hasOffHoursEvents;
  const startHour = effectiveFullDay ? 0 : 8;
  const endHour = effectiveFullDay ? 24 : 20;
  const rowHeight = 80; // 8px multiple (80px per hour)

  const hoursArray = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  // Compute non-overlapping side-by-side layout
  const positionedEvents = useMemo(
    () => computeOverlapLayout(timedEvents),
    [timedEvents]
  );

  // Week strip dates for quick day switching (matches mobile & desktop reference)
  const weekStripDays = useMemo(() => getWeekDays(currentDate, false), [currentDate]);

  // Calculate upcoming meeting countdown if viewing today
  const nextEvt = useMemo(() => {
    if (!isToday) return null;
    const upcoming = timedEvents
      .map((e) => {
        const eventMins = parseTimeMinutes(e.startTime);
        return { event: e, diff: eventMins - currentTimeMinutes };
      })
      .filter((item) => item.diff > 0)
      .sort((a, b) => a.diff - b.diff)[0];

    if (!upcoming) return null;
    const hrs = Math.floor(upcoming.diff / 60);
    const mins = upcoming.diff % 60;
    const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    return {
      title: upcoming.event.title,
      timeStr,
    };
  }, [isToday, timedEvents, currentTimeMinutes]);

  return (
    <div className="flex flex-col bg-white flex-1 min-h-0 overflow-hidden">
      {/* Compact Day Summary & Week Strip Bar */}
      <div className="px-4 md:px-6 py-3 border-b border-[#E2E8F0] bg-white flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2.5">
            <h3 className="text-lg md:text-xl font-bold text-[#212B36] tracking-tight">
              {currentDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </h3>
            <span className="text-xs font-medium text-[#637381]">
              {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {nextEvt && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFF0E6] text-[#B85E19] text-xs font-medium">
                <Flame size={13} className="text-[#F2994A] shrink-0" />
                <span className="truncate max-w-[140px] font-semibold">{nextEvt.title}</span>
                <span>in {nextEvt.timeStr}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowFullDay(!showFullDay)}
              className="text-xs font-semibold text-[#637381] hover:text-[#212B36] transition-colors"
            >
              {effectiveFullDay ? "Business Hours (8 AM – 8 PM)" : "All 24 Hours"}
            </button>
          </div>
        </div>

        {/* Quick 7-Day Week Selector Strip (especially useful on mobile & tablet) */}
        {onSelectDate && (
          <div className="grid grid-cols-7 gap-1 pt-1">
            {weekStripDays.map((d, idx) => {
              const dayIsToday = isSameDay(d, new Date());
              const dayIsSelected = isSameDay(d, currentDate);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectDate(d)}
                  className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition-colors ${
                    dayIsSelected
                      ? "bg-[#212B36] text-white"
                      : dayIsToday
                      ? "bg-[#2563EB]/10 text-[#2563EB]"
                      : "hover:bg-[#F4F6F8] text-[#637381]"
                  }`}
                >
                  <span className="text-[10px] font-medium uppercase">
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className="text-xs font-bold mt-0.5">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* All-Day Events Banner */}
      {allDayEvents.length > 0 && (
        <div className="px-4 md:px-6 py-2 border-b border-[#E2E8F0] bg-[#FAFBFB] flex items-start gap-3">
          <span className="text-[11px] font-semibold text-[#919EAB] w-14 shrink-0 pt-1 text-right">
            All-day
          </span>
          <div className="flex flex-wrap gap-1.5 flex-1">
            {allDayEvents.map((evt) => {
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
                  className="px-2.5 py-1 rounded-md border-l-[3px] text-xs font-semibold cursor-pointer hover:brightness-95 transition-all"
                >
                  {evt.title}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hourly Timeline Grid */}
      <div className="overflow-y-auto max-h-[680px] flex-1 relative px-2 md:px-4 py-2">
        <div
          className="relative"
          style={{ height: `${hoursArray.length * rowHeight}px` }}
        >
          {/* Time Labels Column & Background Slots */}
          {hoursArray.map((hour) => {
            const ampm = hour >= 12 ? "PM" : "AM";
            const displayHour = hour % 12 === 0 ? 12 : hour % 12;

            return (
              <div
                key={hour}
                className="flex items-start border-b border-[#F1F3F5] relative group"
                style={{ height: `${rowHeight}px` }}
              >
                {/* Time label */}
                <div className="w-16 shrink-0 text-right pr-3 pt-1 text-[11px] font-medium text-[#919EAB] select-none">
                  {displayHour}:00 {ampm}
                </div>

                {/* Clickable Hour Slot */}
                <div
                  onClick={() => onCreateEventSlot(currentDate, hour)}
                  className="flex-1 h-full border-l border-[#F1F3F5] hover:bg-[#F4F6F8]/50 transition-colors cursor-pointer relative"
                  title={`Click to schedule an event at ${displayHour}:00 ${ampm}`}
                >
                  <span className="opacity-0 group-hover:opacity-100 text-[10px] font-semibold text-[#637381] absolute right-3 top-2 transition-opacity">
                    + New Event
                  </span>
                </div>
              </div>
            );
          })}

          {/* Current Time Coral-Red Needle */}
          {isToday &&
            currentTimeMinutes >= startHour * 60 &&
            currentTimeMinutes <= endHour * 60 && (
              <div
                className="absolute left-0 right-0 z-30 flex items-center pointer-events-none"
                style={{
                  top: `${((currentTimeMinutes - startHour * 60) / 60) * rowHeight}px`,
                }}
              >
                <div className="w-16 pr-2 flex justify-end">
                  <span className="px-1.5 py-0.5 rounded bg-[#2563EB] text-white text-[10px] font-bold shadow-sm">
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB] -ml-1" />
                <div className="flex-1 h-[2px] bg-[#2563EB]" />
              </div>
            )}

          {/* Positioned & Overlap-Aware Event Cards Container */}
          <div className="absolute top-0 bottom-0 left-16 right-2 pointer-events-none">
            {positionedEvents.map(({ event: evt, startMinutes, endMinutes, leftPct, widthPct }) => {
              if (endMinutes <= startHour * 60 || startMinutes >= endHour * 60) {
                return null;
              }

              const visibleStart = Math.max(startHour * 60, startMinutes);
              const visibleEnd = Math.min(endHour * 60, endMinutes);
              const topMin = visibleStart - startHour * 60;
              const durationMin = Math.max(20, visibleEnd - visibleStart);

              const topPx = (topMin / 60) * rowHeight;
              const heightPx = Math.max(44, (durationMin / 60) * rowHeight - 4);

              const token = getCategoryToken(evt.category, evt.customColor);
              const durText = calculateDuration(evt.startTime, evt.endTime, evt.allDay);
              const isPendingSync = evt.syncStatus === "pending_sync";

              return (
                <div
                  key={evt.id}
                  onClick={() => onSelectEvent(evt)}
                  className="pointer-events-auto absolute rounded-xl p-3 shadow-sm border-l-[4px] cursor-pointer transition-all hover:shadow-md hover:z-20 flex flex-col justify-between overflow-hidden"
                  style={{
                    top: `${topPx}px`,
                    height: `${heightPx}px`,
                    left: `calc(${leftPct}% + 4px)`,
                    width: `calc(${widthPct}% - 8px)`,
                    backgroundColor: token.bg,
                    borderColor: token.border,
                    borderLeftColor: token.dot,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className="text-xs md:text-sm font-bold truncate"
                          style={{ color: token.text }}
                        >
                          {evt.title}
                        </h4>
                        {isPendingSync && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-white/80 text-amber-700 font-semibold shrink-0">
                            <CloudOff size={10} />
                            <span>Local</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] opacity-85 font-medium">
                        <Clock size={12} style={{ color: token.dot }} />
                        <span style={{ color: token.text }}>
                          {formatTimeDisplay(evt.startTime)} – {formatTimeDisplay(evt.endTime)}
                        </span>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: token.badgeBg, color: token.text }}
                        >
                          {durText}
                        </span>
                      </div>
                    </div>

                    {evt.meetingLink && (
                      <a
                        href={evt.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1 bg-[#1C252E] hover:bg-[#28323D] text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-colors shrink-0"
                      >
                        <Video size={12} />
                        <span>Join</span>
                      </a>
                    )}
                  </div>

                  {/* Room / Location / Attendees */}
                  {heightPx >= 76 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-black/5 mt-1">
                      <div
                        className="flex items-center gap-3 text-[11px] truncate"
                        style={{ color: token.text }}
                      >
                        {(evt.room || evt.location) && (
                          <span className="flex items-center gap-1 font-medium opacity-90 truncate">
                            <MapPin size={11} style={{ color: token.dot }} />
                            {evt.room || evt.location}
                          </span>
                        )}
                      </div>

                      {evt.participants && evt.participants.length > 0 && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex -space-x-1.5">
                            {evt.participants.slice(0, 4).map((p, pIdx) => (
                              <div
                                key={pIdx}
                                className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-[9px] font-bold"
                                style={{ backgroundColor: token.badgeBg, color: token.text }}
                                title={p.name}
                              >
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                          {evt.participants.length > 4 && (
                            <span
                              className="text-[10px] font-semibold opacity-75"
                              style={{ color: token.text }}
                            >
                              +{evt.participants.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
