"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";

interface MiniDatePickerPopoverProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

export default function MiniDatePickerPopover({
  selectedDate,
  onSelectDate,
  onClose,
}: MiniDatePickerPopoverProps) {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const [mode, setMode] = useState<"days" | "months" | "years">("days");

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

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const yearsRange: number[] = [];
  const startYear = Math.floor(year / 12) * 12;
  for (let y = startYear - 1; y <= startYear + 14; y++) {
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

  return (
    <div className="absolute top-full mt-2 left-0 md:left-auto z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-[310px] animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode(mode === "months" ? "days" : "months")}
            className="text-xs font-bold text-[#1E293B] hover:text-[#355D91] px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {monthNames[month]}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "years" ? "days" : "years")}
            className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-[#E7F0FF] text-[#355D91] border border-[#C5DAFD]/60 hover:bg-[#D9E7FC] transition-colors"
          >
            {year}
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Next Month"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ml-1"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Mode = Days */}
      {mode === "days" && (
        <div className="pt-3">
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const sel = isSelected(dayNum);
              const tod = isToday(dayNum);

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => {
                    const picked = new Date(year, month, dayNum);
                    onSelectDate(picked);
                    onClose();
                  }}
                  className={`h-8 w-8 mx-auto flex items-center justify-center text-xs font-semibold rounded-full transition-all ${
                    sel
                      ? "bg-[#1E293B] text-white font-bold shadow-2xs scale-105"
                      : tod
                      ? "border border-[#C5DAFD] text-[#355D91] bg-[#E7F0FF] font-bold"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewDate(now);
                onSelectDate(now);
                onClose();
              }}
              className="text-[#355D91] hover:text-[#23436D] font-bold"
            >
              Today
            </button>
            <span className="text-slate-400">Asia/Kolkata (IST)</span>
          </div>
        </div>
      )}

      {/* Mode = Months */}
      {mode === "months" && (
        <div className="grid grid-cols-3 gap-2 pt-3">
          {monthNames.map((name, idx) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setViewDate(new Date(year, idx, 1));
                setMode("days");
              }}
              className={`py-2 px-1 text-xs font-semibold rounded-xl transition-all ${
                idx === month
                  ? "bg-[#1E293B] text-white font-bold shadow-2xs"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {name.substring(0, 3)}
            </button>
          ))}
        </div>
      )}

      {/* Mode = Years */}
      {mode === "years" && (
        <div className="grid grid-cols-4 gap-1.5 pt-3 max-h-[190px] overflow-y-auto no-scrollbar">
          {yearsRange.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                setViewDate(new Date(y, month, 1));
                setMode("days");
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                y === year
                  ? "bg-blue-600 text-white font-bold shadow-sm"
                  : "text-slate-700 hover:bg-slate-100"
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
