"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Search,
  PanelLeft,
  X,
  ChevronDown,
} from "lucide-react";
import { CalendarViewType } from "@/types/calendar";
import { getWeekStartDate } from "@/lib/api/calendarService";
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
  activeFilterCount?: number;
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
  activeFilterCount = 0,
}: CalendarToolbarProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  const getHeadingText = (): { primary: string; secondary: string } => {
    const yearStr = currentDate.getFullYear().toString();

    if (view === "day") {
      const primary = currentDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });
      const weekday = currentDate.toLocaleDateString("en-US", {
        weekday: "short",
      });
      return { primary, secondary: `${yearStr} · ${weekday}` };
    }

    if (view === "week" || view === "workweek") {
      const isWorkweek = view === "workweek";
      const startWeek = getWeekStartDate(currentDate, isWorkweek);
      const endWeek = new Date(startWeek);
      endWeek.setDate(startWeek.getDate() + (isWorkweek ? 4 : 6));

      if (startWeek.getMonth() === endWeek.getMonth()) {
        const primary = `${startWeek.toLocaleDateString("en-US", {
          month: "short",
        })} ${startWeek.getDate()} – ${endWeek.getDate()}`;
        return { primary, secondary: startWeek.getFullYear().toString() };
      }

      const primary = `${startWeek.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} – ${endWeek.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
      return { primary, secondary: endWeek.getFullYear().toString() };
    }

    const monthName = currentDate.toLocaleDateString("en-US", {
      month: "long",
    });
    return { primary: monthName, secondary: yearStr };
  };

  const { primary: headingPrimary, secondary: headingSecondary } =
    getHeadingText();

  const views: { id: CalendarViewType; label: string }[] = [
    { id: "month", label: "Month" },
    { id: "week", label: "Week" },
    { id: "workweek", label: "Workweek" },
    { id: "day", label: "Day" },
    { id: "schedule", label: "Agenda" },
  ];

  return (
    <header className="bg-white border-b border-[#E2E8F0] px-3 sm:px-5 py-2.5 flex flex-col gap-2">
      {/* Row 1: Primary Header & Action Controls */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 min-h-[40px] min-w-0">
        {/* Left: Sidebar Toggle + (Tablet/Desktop Prev/Today/Next) + Clickable Date Heading */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggleFilter}
            className={`relative p-1.5 sm:p-2 rounded-lg border transition-colors shrink-0 ${
              isFilterOpen
                ? "bg-[#F4F6F8] border-[#E2E8F0] text-[#212B36]"
                : "bg-white border-[#E2E8F0] text-[#637381] hover:text-[#212B36] hover:bg-[#F4F6F8]"
            }`}
            title="Toggle calendar sidebar & filters"
            aria-label="Toggle calendar sidebar"
          >
            <PanelLeft size={16} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#2563EB] ring-2 ring-white" />
            )}
          </button>

          {/* Prev / Today / Next (inline on sm+ tablet & desktop; dedicated row on <sm mobile) */}
          <div className="hidden sm:flex items-center bg-[#F4F6F8] rounded-lg p-0.5 border border-[#E2E8F0]/70 shrink-0">
            <button
              type="button"
              onClick={onPrev}
              className="p-1.5 text-[#637381] hover:text-[#212B36] hover:bg-white rounded-md transition-all"
              aria-label="Previous period"
              title="Previous"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={onToday}
              className="px-2.5 py-1 text-[12px] font-semibold text-[#212B36] hover:bg-white rounded-md transition-all"
            >
              Today
            </button>
            <button
              type="button"
              onClick={onNext}
              className="p-1.5 text-[#637381] hover:text-[#212B36] hover:bg-white rounded-md transition-all"
              aria-label="Next period"
              title="Next"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Clickable Date Heading with Popover Date Picker */}
          <div className="relative min-w-0 shrink-0" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className="flex items-center gap-1 sm:gap-1.5 px-1 sm:px-2 py-1 rounded-lg hover:bg-[#F4F6F8] transition-colors text-left group"
              title="Click to jump to a specific date"
            >
              <h1 className="text-[14px] sm:text-[18px] xl:text-[20px] font-bold text-[#212B36] tracking-tight whitespace-nowrap">
                {headingPrimary}
              </h1>
              <span className="text-[12px] sm:text-[14px] xl:text-[15px] font-medium text-[#637381] shrink-0">
                {headingSecondary}
              </span>
              <ChevronDown
                size={14}
                className={`text-[#919EAB] group-hover:text-[#212B36] transition-transform shrink-0 ${
                  isDatePickerOpen ? "rotate-180" : ""
                }`}
              />
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

          <span className="hidden 2xl:inline-flex items-center px-2 py-0.5 rounded-full bg-[#F4F6F8] text-[#637381] text-[11px] font-semibold shrink-0">
            {totalEventsCount} {totalEventsCount === 1 ? "event" : "events"}
          </span>
        </div>

        {/* Right: Search + (Desktop xl+ View Switcher) + Export + New Event */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Tablet & Desktop Search Bar */}
          <div className="hidden md:flex items-center relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#919EAB]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search events..."
              className="w-36 lg:w-40 xl:w-44 2xl:w-52 pl-8 pr-7 py-1.5 bg-[#F4F6F8] border border-transparent focus:border-[#E2E8F0] focus:bg-white rounded-lg text-[12px] text-[#212B36] placeholder-[#919EAB] focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#919EAB] hover:text-[#212B36]"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Mobile & Small-Tablet Search Toggle */}
          <button
            type="button"
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            className={`md:hidden p-1.5 sm:p-2 rounded-lg border transition-colors ${
              isSearchExpanded || searchQuery
                ? "bg-[#F4F6F8] border-[#E2E8F0] text-[#212B36]"
                : "bg-white border-[#E2E8F0] text-[#637381]"
            }`}
            aria-label="Search events"
          >
            <Search size={15} />
          </button>

          {/* Desktop (xl+) Inline View Switcher */}
          <div className="hidden xl:flex items-center bg-[#F4F6F8] p-0.5 rounded-lg border border-[#E2E8F0]/70">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onViewChange(v.id)}
                className={`px-2.5 py-1 text-[12px] font-semibold rounded-md transition-all whitespace-nowrap ${
                  view === v.id
                    ? "bg-white text-[#212B36] shadow-xs"
                    : "text-[#637381] hover:text-[#212B36]"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Export .ics Button */}
          <button
            type="button"
            onClick={onExportIcs}
            className="p-1.5 sm:p-2 text-[#637381] hover:text-[#212B36] hover:bg-[#F4F6F8] rounded-lg border border-[#E2E8F0] transition-colors"
            title="Export Calendar (.ics)"
            aria-label="Export Calendar (.ics)"
          >
            <Download size={15} />
          </button>

          {/* Primary Coral-Red New Event Button */}
          <button
            type="button"
            onClick={onCreateEvent}
            className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-[12px] shadow-xs active:scale-95 transition-all shrink-0"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span className="hidden sm:inline">New Event</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Expandable Search Input for < md Viewports */}
      {isSearchExpanded && (
        <div className="relative md:hidden">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#919EAB]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search meetings, calls, tasks..."
            className="w-full pl-8 pr-8 py-1.5 bg-[#F4F6F8] border border-[#E2E8F0] rounded-lg text-[12px] text-[#212B36] placeholder-[#919EAB] focus:outline-none focus:bg-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#919EAB]"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Tablet Secondary Row (sm to < xl, including 1024×768): View Switcher + Event Count */}
      <div className="hidden sm:flex xl:hidden items-center justify-between gap-3 pt-1.5 border-t border-[#F1F3F5]">
        <div className="flex items-center bg-[#F4F6F8] p-0.5 rounded-lg border border-[#E2E8F0]/70">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onViewChange(v.id)}
              className={`px-3 py-1 text-[12px] font-semibold rounded-md transition-all whitespace-nowrap ${
                view === v.id
                  ? "bg-white text-[#212B36] shadow-xs"
                  : "text-[#637381] hover:text-[#212B36]"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#F4F6F8] text-[#637381] text-[11px] font-semibold shrink-0">
          {totalEventsCount} {totalEventsCount === 1 ? "event" : "events"}
        </span>
      </div>

      {/* Mobile Secondary Rows (< sm, including 390×844 & 375×812): Dedicated Navigation Row + View Switcher */}
      <div className="flex flex-col gap-2 sm:hidden pt-1 border-t border-[#F1F3F5]">
        {/* Dedicated Mobile Date Navigation Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center bg-[#F4F6F8] rounded-lg p-0.5 border border-[#E2E8F0]/70">
            <button
              type="button"
              onClick={onPrev}
              className="p-1.5 text-[#637381] hover:text-[#212B36] hover:bg-white rounded-md transition-all"
              aria-label="Previous period"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={onToday}
              className="px-3 py-1 text-[12px] font-semibold text-[#212B36] hover:bg-white rounded-md transition-all"
            >
              Today
            </button>
            <button
              type="button"
              onClick={onNext}
              className="p-1.5 text-[#637381] hover:text-[#212B36] hover:bg-white rounded-md transition-all"
              aria-label="Next period"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#F4F6F8] text-[#637381] text-[11px] font-semibold">
            {totalEventsCount} {totalEventsCount === 1 ? "event" : "events"}
          </span>
        </div>

        {/* Mobile 5-Tab View Switcher */}
        <div className="flex items-center justify-between bg-[#F4F6F8] p-0.5 rounded-lg border border-[#E2E8F0]/70">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onViewChange(v.id)}
              className={`flex-1 py-1 px-1 text-[11px] font-semibold rounded-md transition-all whitespace-nowrap text-center ${
                view === v.id
                  ? "bg-white text-[#212B36] shadow-xs"
                  : "text-[#637381] hover:text-[#212B36]"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
