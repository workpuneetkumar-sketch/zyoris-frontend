"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Download,
  Filter,
  Search,
  Globe,
} from "lucide-react";
import { CalendarViewType } from "@/types/calendar";
import MiniDatePickerPopover from "./MiniDatePickerPopover";

interface CalendarToolbarProps {
  view: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelectDate: (date: Date) => void;
  onCreateEvent: () => void;
  onExportIcs: () => void;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalEventsCount: number;
}

export default function CalendarToolbar({
  view,
  onViewChange,
  currentDate,
  onPrev,
  onNext,
  onToday,
  onSelectDate,
  onCreateEvent,
  onExportIcs,
  isFilterOpen,
  onToggleFilter,
  searchQuery,
  onSearchChange,
  totalEventsCount,
}: CalendarToolbarProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsDatePickerOpen(false);
      }
    }
    if (isDatePickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDatePickerOpen]);

  // Dynamic heading decomposed into primary label and independent year highlight
  const getHeadingParts = (): { primary: string; year: string } => {
    const yearStr = currentDate.getFullYear().toString();

    if (view === "day") {
      const primary = currentDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return { primary, year: yearStr };
    }

    if (view === "week" || view === "workweek") {
      const start = new Date(currentDate);
      const dayOffset = view === "workweek" ? 1 : 0;
      const first = start.getDate() - start.getDay() + dayOffset;
      const startWeek = new Date(start.getFullYear(), start.getMonth(), first);
      const endWeek = new Date(startWeek);
      endWeek.setDate(startWeek.getDate() + (view === "workweek" ? 4 : 6));

      if (startWeek.getMonth() === endWeek.getMonth()) {
        const primary = `${startWeek.toLocaleDateString("en-US", {
          month: "short",
        })} ${startWeek.getDate()} – ${endWeek.getDate()}`;
        return { primary, year: startWeek.getFullYear().toString() };
      }
      const primary = `${startWeek.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} – ${endWeek.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
      return { primary, year: endWeek.getFullYear().toString() };
    }

    // Month or Schedule view: Month Name + Year Badge
    const monthName = currentDate.toLocaleDateString("en-US", { month: "long" });
    return { primary: monthName, year: yearStr };
  };

  const { primary: headingPrimary, year: headingYear } = getHeadingParts();

  const views: { id: CalendarViewType; label: string }[] = [
    { id: "month", label: "Month" },
    { id: "week", label: "Week" },
    { id: "workweek", label: "Workweek" },
    { id: "day", label: "Day" },
    { id: "schedule", label: "Schedule" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 md:p-5 flex flex-col gap-4">
      {/* Upper row: Navigation + Header + Quick actions */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left: Navigation Buttons & Date Picker Button */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-start flex-wrap">
          <div className="flex items-center bg-white border border-slate-200/90 rounded-full p-0.5 text-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={onPrev}
              className="p-1.5 hover:bg-slate-100/80 rounded-full transition-colors active:scale-95 text-slate-600 hover:text-slate-900"
              aria-label="Previous period"
            >
              <ChevronLeft size={17} />
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <button
              type="button"
              onClick={onNext}
              className="p-1.5 hover:bg-slate-100/80 rounded-full transition-colors active:scale-95 text-slate-600 hover:text-slate-900"
              aria-label="Next period"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          <button
            type="button"
            onClick={onToday}
            className="px-3.5 py-1.5 rounded-full bg-[#E7F0FF] text-[#355D91] hover:bg-[#D9E7FC] text-xs font-semibold tracking-wide transition-all active:scale-95 border border-[#C5DAFD]/70 shadow-2xs"
          >
            Today
          </button>

          {/* Date Picker Trigger Popover */}
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-medium transition-colors shadow-2xs"
              title="Jump to date"
            >
              <CalendarIcon size={14} className="text-[#355D91]" />
              <span className="hidden sm:inline">Jump to Date</span>
            </button>

            {isDatePickerOpen && (
              <MiniDatePickerPopover
                selectedDate={currentDate}
                onSelectDate={(d) => {
                  onSelectDate(d);
                  setIsDatePickerOpen(false);
                }}
                onClose={() => setIsDatePickerOpen(false)}
              />
            )}
          </div>
        </div>

        {/* Center: Dynamic Month / Year Heading with Independent Year Highlight */}
        <div className="text-center flex flex-col items-center order-first lg:order-none w-full lg:w-auto">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#1E293B] flex items-center justify-center gap-2.5">
            <span>{headingPrimary}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-[#E7F0FF] text-[#355D91] text-sm md:text-base font-semibold border border-[#C5DAFD]/60 tracking-normal whitespace-nowrap shadow-2xs">
              {headingYear}
            </span>
          </h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <Globe size={11} className="text-[#355D91]" /> IST (UTC+5:30)
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-medium text-slate-500">
              {totalEventsCount} {totalEventsCount === 1 ? "Event" : "Events"}
            </span>
          </div>
        </div>

        {/* Right: Restrained Actions & Primary New Event Button */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={onExportIcs}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl border border-slate-200/90 transition-colors shadow-2xs"
            title="Export Calendar to .ics (Google Calendar, Outlook, Apple Calendar)"
            aria-label="Export Calendar"
          >
            <Download size={16} />
          </button>

          <button
            type="button"
            onClick={onToggleFilter}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors shadow-2xs ${
              isFilterOpen
                ? "bg-[#E7F0FF] border-[#C5DAFD] text-[#355D91]"
                : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50"
            }`}
            title="Filter Calendars and Categories"
          >
            <Filter size={14} className={isFilterOpen ? "text-[#355D91]" : "text-slate-500"} />
            <span className="hidden sm:inline">Filters</span>
          </button>

          <button
            type="button"
            onClick={onCreateEvent}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#0F172A] text-white font-semibold text-xs tracking-wide shadow-sm hover:shadow active:scale-95 transition-all"
          >
            <Plus size={16} strokeWidth={2.2} />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* Lower row: Search Bar & View Selector Segmented Control */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
        {/* Search Bar */}
        <div className="relative w-full sm:w-64 md:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search meetings, calls, tasks..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#355D91]/20 focus:border-[#355D91] focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* View Switcher Segmented Control */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onViewChange(v.id)}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize whitespace-nowrap ${
                view === v.id
                  ? "bg-white text-[#1E293B] shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
