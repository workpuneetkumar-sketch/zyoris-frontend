"use client";

import React, { useState, useEffect } from "react";
import { UnifiedCalendarEvent } from "@/types/calendar";
import { formatTimeDisplay, calculateDuration, isSameDay } from "@/lib/api/calendarService";
import { getCategoryToken } from "./calendarTheme";
import {
  Clock,
  MapPin,
  Video,
  ChevronLeft,
  ChevronRight,
  Flame,
  CloudOff,
} from "lucide-react";

interface DayViewProps {
  currentDate: Date;
  events: UnifiedCalendarEvent[];
  onSelectEvent: (event: UnifiedCalendarEvent) => void;
  onCreateEventSlot: (date: Date, hour: number) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
}

export default function DayView({
  currentDate,
  events,
  onSelectEvent,
  onCreateEventSlot,
  onPrevDay,
  onNextDay,
  onToday,
}: DayViewProps) {
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
  const startHour = 8; // 8:00 AM
  const endHour = 20; // 8:00 PM
  const rowHeight = 84; // generous vertical spacing

  const hoursArray = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  // Filter events for this day
  const dayEvents = events.filter((e) => {
    if (!e.date) return false;
    const [ey, em, ed] = e.date.split("-").map(Number);
    return (
      currentDate.getFullYear() === ey &&
      currentDate.getMonth() === em - 1 &&
      currentDate.getDate() === ed
    );
  });

  // Calculate upcoming meeting countdown
  const getNextEventBadge = () => {
    if (!isToday) return null;
    const upcoming = dayEvents
      .map((e) => {
        const [h, m] = (e.startTime || "00:00").split(":").map(Number);
        const eventMins = (h || 0) * 60 + (m || 0);
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
  };

  const nextEvt = getNextEventBadge();

  const parseMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    if (timeStr.includes("T")) {
      const d = new Date(timeStr);
      return d.getHours() * 60 + d.getMinutes();
    }
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex-1">
      {/* Day View Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 md:p-6 border-b border-slate-200/70 bg-slate-50/50 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-200/90 rounded-xl p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={onPrevDay}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={onNextDay}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div>
            <h3 className="text-xl md:text-2xl font-bold text-[#1E293B] tracking-tight flex items-center gap-2">
              <span>
                {currentDate.toLocaleDateString("en-US", { weekday: "short" })},{" "}
                {currentDate.getDate()}
                {["th", "st", "nd", "rd"][
                  (currentDate.getDate() % 100 > 10 && currentDate.getDate() % 100 < 14) ||
                  currentDate.getDate() % 10 > 3
                    ? 0
                    : currentDate.getDate() % 10
                ]}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[#E7F0FF] text-[#355D91] text-xs md:text-sm font-semibold border border-[#C5DAFD]/60">
                {currentDate.getFullYear()}
              </span>
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {currentDate.toLocaleDateString("en-US", { month: "long" })} • {dayEvents.length}{" "}
              {dayEvents.length === 1 ? "Event scheduled" : "Events scheduled"}
            </p>
          </div>
        </div>

        {/* Status Indicator / Upcoming Badge */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {nextEvt && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FFF0E5] text-[#A96D46] border border-[#FCDCC6] shadow-2xs">
              <Flame size={14} className="text-[#A96D46] shrink-0" />
              <div className="text-xs">
                <span className="font-semibold truncate max-w-[140px] inline-block align-bottom">
                  {nextEvt.title}
                </span>{" "}
                in <span className="font-bold">{nextEvt.timeStr}</span>
              </div>
            </div>
          )}

          {!isToday && (
            <button
              type="button"
              onClick={onToday}
              className="px-3.5 py-1.5 rounded-xl bg-[#E7F0FF] hover:bg-[#D9E7FC] text-[#355D91] text-xs font-semibold border border-[#C5DAFD] transition-colors shadow-2xs"
            >
              Back to Today
            </button>
          )}
        </div>
      </div>

      {/* Hourly Timeline Grid */}
      <div className="overflow-y-auto max-h-[700px] flex-1 relative p-2 md:p-4">
        <div className="relative">
          {/* Time Labels Column & Background Grid */}
          <div className="space-y-0">
            {hoursArray.map((hour) => {
              const ampm = hour >= 12 ? "PM" : "AM";
              const displayHour = hour % 12 === 0 ? 12 : hour % 12;

              return (
                <div
                  key={hour}
                  className="flex items-start border-t border-slate-100 relative group"
                  style={{ height: `${rowHeight}px` }}
                >
                  {/* Time label */}
                  <div className="w-16 shrink-0 text-right pr-4 text-xs font-semibold text-slate-400 -translate-y-2.5 select-none">
                    {displayHour}:00 {ampm}
                  </div>

                  {/* Horizontal Guideline Clickable Slot */}
                  <div
                    onClick={() => onCreateEventSlot(currentDate, hour)}
                    className="flex-1 h-full hover:bg-[#E7F0FF]/20 rounded-lg transition-colors cursor-pointer relative"
                    title={`Click to schedule an event at ${displayHour}:00 ${ampm}`}
                  >
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] font-semibold text-[#355D91] absolute right-3 top-2 transition-opacity">
                      + Add Event
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Current Time Needle */}
            {isToday &&
              currentTimeMinutes >= startHour * 60 &&
              currentTimeMinutes <= endHour * 60 && (
                <div
                  className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                  style={{
                    top: `${((currentTimeMinutes - startHour * 60) / 60) * rowHeight}px`,
                  }}
                >
                  <div className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold tracking-wider shadow-sm -ml-2">
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="flex-1 h-[2px] bg-rose-500 shadow-2xs" />
                </div>
              )}

            {/* Positioned Event Cards */}
            {dayEvents.map((evt) => {
              const startMin = parseMinutes(evt.startTime);
              const endMin = Math.max(startMin + 30, parseMinutes(evt.endTime));

              if (endMin <= startHour * 60 || startMin >= endHour * 60) {
                return null;
              }

              const topMin = Math.max(0, startMin - startHour * 60);
              const durationMin = Math.min(
                endHour * 60 - Math.max(startHour * 60, startMin),
                endMin - Math.max(startHour * 60, startMin)
              );

              const topPx = (topMin / 60) * rowHeight;
              const heightPx = Math.max(48, (durationMin / 60) * rowHeight - 6);

              const token = getCategoryToken(evt.category);
              const durText = calculateDuration(evt.startTime, evt.endTime);
              const isPendingSync = evt.syncStatus === "pending_sync";

              return (
                <div
                  key={evt.id}
                  onClick={() => onSelectEvent(evt)}
                  className="absolute left-20 right-4 rounded-xl p-3.5 shadow-2xs border border-l-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.005] z-10 flex flex-col justify-between"
                  style={{
                    top: `${topPx}px`,
                    height: `${heightPx}px`,
                    backgroundColor: token.bg,
                    borderColor: token.border,
                    borderLeftColor: token.dot,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm md:text-base font-bold" style={{ color: token.text }}>
                          {evt.title}
                        </h4>
                        {isPendingSync && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white/70 border border-amber-300 text-amber-700 font-semibold">
                            <CloudOff size={11} />
                            <span>Pending Sync</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs opacity-80 font-medium">
                        <Clock size={13} style={{ color: token.dot }} />
                        <span style={{ color: token.text }}>
                          {formatTimeDisplay(evt.startTime)} – {formatTimeDisplay(evt.endTime)}
                        </span>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
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
                        className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                      >
                        <Video size={13} />
                        <span>Join</span>
                      </a>
                    )}
                  </div>

                  {/* Room / Location / Attendees */}
                  {heightPx > 80 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/50 mt-2">
                      <div className="flex items-center gap-3 text-xs" style={{ color: token.text }}>
                        {(evt.room || evt.location) && (
                          <span className="flex items-center gap-1 font-medium opacity-85">
                            <MapPin size={12} style={{ color: token.dot }} />
                            {evt.room || evt.location}
                          </span>
                        )}
                        <span className="capitalize font-medium opacity-75">
                          {evt.department} Calendar
                        </span>
                      </div>

                      {evt.participants && evt.participants.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="flex -space-x-1.5">
                            {evt.participants.slice(0, 4).map((p, pIdx) => (
                              <div
                                key={pIdx}
                                className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-[9px] font-bold shadow-2xs"
                                style={{ backgroundColor: token.badgeBg, color: token.text }}
                                title={p.name}
                              >
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                          {evt.participants.length > 4 && (
                            <span className="text-[10px] font-semibold opacity-70">
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
