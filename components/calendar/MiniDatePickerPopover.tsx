"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";
import { UnifiedCalendarEvent } from "@/types/calendar";
import { formatDateKey } from "@/lib/api/calendarService";

interface MiniDatePickerPopoverProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose?: () => void;
  inline?: boolean;
  events?: UnifiedCalendarEvent[];
}

export default function MiniDatePickerPopover({
  selectedDate,
  onSelectDate,
  onClose,
  inline = false,
  events = [],
}: MiniDatePickerPopoverProps) {
  const [viewDate, setViewDate] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const [mode, setMode] = useState<"days" | "months" | "years">("days");

  // Keep mini calendar month synchronized when selectedDate changes externally
  useEffect(() => {
    setViewDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const prevMonthLastDate = new Date(year, month, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const yearsRange: number[] = [];
  const startYear = Math.floor(year / 12) * 12;
  for (let y = startYear - 2; y <= startYear + 13; y++) {
    yearsRange.push(y);
  }

  const isToday = (d: number) => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
  };

  const isSelected = (d: number) => {
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === d
    );
  };

  const hasEventOnDay = (d: number) => {
    if (!events || events.length === 0) return false;
    const key = formatDateKey(new Date(year, month, d));
    return events.some((e) => e.date === key);
  };

  const containerClass = inline
    ? "w-full bg-white select-none"
    : "absolute top-full mt-2 left-0 z-50 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] p-3.5 sm:p-4 w-[276px] sm:w-[296px] max-w-[calc(100vw-24px)] animate-in fade-in zoom-in-95 duration-150 select-none";

  return (
    <div className={containerClass}>
      {/* Header (Minimals DatePicker aesthetic) */}
      <div className="flex items-center justify-between pb-2.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode(mode === "months" ? "days" : "months")}
            className="text-[13px] font-bold text-[#212B36] hover:bg-[#F4F6F8] px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
          >
            <span>{monthNames[month]}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "years" ? "days" : "years")}
            className="text-[13px] font-bold text-[#212B36] hover:bg-[#F4F6F8] px-1.5 py-1 rounded-lg transition-colors flex items-center gap-0.5"
          >
            <span>{year}</span>
            <ChevronDown
              size={13}
              className={`text-[#637381] transition-transform ${
                mode === "years" ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 text-[#637381] hover:text-[#212B36] hover:bg-[#F4F6F8] rounded-full transition-colors"
            aria-label="Previous Month"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 text-[#637381] hover:text-[#212B36] hover:bg-[#F4F6F8] rounded-full transition-colors"
            aria-label="Next Month"
          >
            <ChevronRight size={15} />
          </button>
          {!inline && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#919EAB] hover:text-[#212B36] hover:bg-[#F4F6F8] rounded-full transition-colors ml-0.5"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Mode = Days */}
      {mode === "days" && (
        <div>
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[#919EAB] mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
              <div key={idx} className="h-7 flex items-center justify-center">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {/* Leading trailing days from previous month */}
            {Array.from({ length: firstDayIndex }).map((_, i) => {
              const prevDay = prevMonthLastDate - firstDayIndex + i + 1;
              return (
                <button
                  key={`prev-${i}`}
                  type="button"
                  onClick={() => {
                    const picked = new Date(year, month - 1, prevDay);
                    onSelectDate(picked);
                    onClose?.();
                  }}
                  className="h-8 w-8 mx-auto flex items-center justify-center text-xs text-[#919EAB]/60 hover:bg-[#F4F6F8] rounded-full transition-colors"
                >
                  {prevDay}
                </button>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const sel = isSelected(dayNum);
              const tod = isToday(dayNum);
              const hasEvt = hasEventOnDay(dayNum);

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => {
                    const picked = new Date(year, month, dayNum);
                    onSelectDate(picked);
                    onClose?.();
                  }}
                  className={`relative h-8 w-8 mx-auto flex items-center justify-center text-xs rounded-full transition-all ${
                    sel
                      ? "bg-[#2563EB] text-white font-bold shadow-sm"
                      : tod
                      ? "border border-[#2563EB] text-[#2563EB] font-bold"
                      : "text-[#212B36] font-medium hover:bg-[#F4F6F8]"
                  }`}
                >
                  <span>{dayNum}</span>
                  {hasEvt && !sel && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#2563EB]" />
                  )}
                </button>
              );
            })}
          </div>

          {!inline && (
            <div className="mt-3 pt-2.5 border-t border-[#F1F3F5] flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
                  onSelectDate(now);
                  onClose?.();
                }}
                className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold"
              >
                Today
              </button>
              <span className="text-[11px] text-[#919EAB]">IST (UTC+5:30)</span>
            </div>
          )}
        </div>
      )}

      {/* Mode = Months */}
      {mode === "months" && (
        <div className="grid grid-cols-3 gap-1.5 pt-2">
          {monthNames.map((name, idx) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setViewDate(new Date(year, idx, 1));
                setMode("days");
              }}
              className={`py-2 px-1 text-xs font-semibold rounded-lg transition-colors ${
                idx === month
                  ? "bg-[#212B36] text-white font-bold"
                  : "text-[#212B36] hover:bg-[#F4F6F8]"
              }`}
            >
              {name.substring(0, 3)}
            </button>
          ))}
        </div>
      )}

      {/* Mode = Years */}
      {mode === "years" && (
        <div className="grid grid-cols-4 gap-1.5 pt-2 max-h-[184px] overflow-y-auto">
          {yearsRange.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                setViewDate(new Date(y, month, 1));
                setMode("days");
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                y === year
                  ? "bg-[#2563EB] text-white font-bold"
                  : "text-[#212B36] hover:bg-[#F4F6F8]"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
