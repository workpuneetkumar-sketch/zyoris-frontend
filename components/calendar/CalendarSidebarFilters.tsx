"use client";

import React, { useMemo, useState } from "react";
import {
  CalendarDepartment,
  CalendarCategory,
  UnifiedCalendarEvent,
} from "@/types/calendar";
import {
  PASTEL_CATEGORY_TOKENS,
  DEPARTMENT_CALENDAR_TOKENS,
} from "./calendarTheme";
import MiniDatePickerPopover from "./MiniDatePickerPopover";
import DailySummaryPanel from "./DailySummaryPanel";
import { Meeting } from "@/lib/api/meetingsApi";
import { Call } from "@/lib/api/callsApi";
import { Task } from "@/lib/api/tasksApi";
import { Check, X, RotateCcw, ChevronDown, Plus } from "lucide-react";

interface CalendarSidebarFiltersProps {
  selectedDepartments: CalendarDepartment[];
  onChangeDepartments: (depts: CalendarDepartment[]) => void;
  selectedCategories: CalendarCategory[];
  onChangeCategories: (cats: CalendarCategory[]) => void;
  onResetFilters: () => void;
  onClose?: () => void;
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  events?: UnifiedCalendarEvent[];
  rawMeetings?: Meeting[];
  rawCalls?: Call[];
  rawTasks?: Task[];
  onOpenCreate?: (date: Date) => void;
  onSelectEvent?: (event: UnifiedCalendarEvent) => void;
  onEditEvent?: (event: UnifiedCalendarEvent) => void;
  onSelectMeeting?: (meeting: Meeting) => void;
  onSelectCall?: (call: Call) => void;
  onSelectTask?: (task: Task) => void;
}

const ALL_DEPARTMENTS: CalendarDepartment[] = [
  "personal",
  "company",
  "development",
  "hr",
  "marketing",
  "sales",
  "management",
];

const CATEGORIES_LIST: { id: CalendarCategory; label: string }[] = [
  { id: "meeting", label: "Meetings" },
  { id: "call", label: "Calls" },
  { id: "task", label: "Tasks" },
  { id: "interview", label: "Interviews" },
  { id: "deadline", label: "Deadlines" },
  { id: "out_of_office", label: "Out of Office" },
  { id: "holiday", label: "Holidays" },
];

export default function CalendarSidebarFilters({
  selectedDepartments,
  onChangeDepartments,
  selectedCategories,
  onChangeCategories,
  onResetFilters,
  onClose,
  selectedDate = new Date(),
  onSelectDate,
  events = [],
  rawMeetings = [],
  rawCalls = [],
  rawTasks = [],
  onOpenCreate,
  onSelectEvent,
  onEditEvent,
  onSelectMeeting,
  onSelectCall,
  onSelectTask,
}: CalendarSidebarFiltersProps) {
  const [calendarsExpanded, setCalendarsExpanded] = useState(true);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);

  // Allow unchecking all departments (fixed previous single-item lock bug)
  const toggleDept = (dept: CalendarDepartment) => {
    if (selectedDepartments.includes(dept)) {
      onChangeDepartments(selectedDepartments.filter((d) => d !== dept));
    } else {
      onChangeDepartments([...selectedDepartments, dept]);
    }
  };

  // Allow unchecking all categories (fixed previous single-item lock bug)
  const toggleCat = (cat: CalendarCategory) => {
    if (selectedCategories.includes(cat)) {
      onChangeCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      onChangeCategories([...selectedCategories, cat]);
    }
  };

  const eventDates = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.date) set.add(e.date);
    });
    return set;
  }, [events]);

  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      const d = e.department || "company";
      counts[d] = (counts[d] || 0) + 1;
    });
    return counts;
  }, [events]);

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      const c = e.category || "meeting";
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [events]);

  return (
    <aside className="w-full h-full flex flex-col bg-white select-none overflow-y-auto">
      {/* Mobile / Tablet Drawer Header */}
      {onClose && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F3F5] xl:hidden">
          <span className="text-[13px] font-bold text-[#212B36]">
            Calendar & Filters
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#637381] hover:text-[#212B36] hover:bg-[#F4F6F8] rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Quick Create Event Action */}
      {onOpenCreate && (
        <div className="px-4 pt-4 pb-1">
          <button
            type="button"
            onClick={() => onOpenCreate(selectedDate)}
            className="w-full py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-[13px] shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Create Event</span>
          </button>
        </div>
      )}

      {/* Inline Mini Calendar Date Picker */}
      {onSelectDate && (
        <div className="px-2 pt-1 pb-2 border-b border-[#F1F3F5]">
          <MiniDatePickerPopover
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            onClose={() => {}}
            inline={true}
            events={events}
          />
        </div>
      )}

      {/* Calendars / Departments Section */}
      <div className="px-4 py-3 border-b border-[#F1F3F5]">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setCalendarsExpanded(!calendarsExpanded)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-[#637381] uppercase tracking-wider hover:text-[#212B36] transition-colors"
          >
            <ChevronDown
              size={13}
              className={`transition-transform ${
                calendarsExpanded ? "" : "-rotate-90"
              }`}
            />
            <span>Calendars</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (selectedDepartments.length === ALL_DEPARTMENTS.length) {
                  onChangeDepartments([]);
                } else {
                  onChangeDepartments([...ALL_DEPARTMENTS]);
                }
              }}
              className="text-[11px] font-semibold text-[#637381] hover:text-[#212B36] transition-colors"
            >
              {selectedDepartments.length === ALL_DEPARTMENTS.length
                ? "Clear"
                : "All"}
            </button>
            <button
              type="button"
              onClick={onResetFilters}
              className="p-1 text-[#919EAB] hover:text-[#212B36] rounded transition-colors"
              title="Reset all filters"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>

        {calendarsExpanded && (
          <div className="space-y-0.5">
            {ALL_DEPARTMENTS.map((deptId) => {
              const meta = DEPARTMENT_CALENDAR_TOKENS[deptId];
              const active = selectedDepartments.includes(deptId);
              const count = deptCounts[deptId] || 0;

              return (
                <button
                  key={deptId}
                  type="button"
                  onClick={() => toggleDept(deptId)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${
                    active
                      ? "text-[#212B36] font-medium hover:bg-[#F4F6F8]"
                      : "text-[#919EAB] hover:bg-[#F4F6F8]/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-4 h-4 rounded-[5px] flex items-center justify-center transition-all shrink-0 border"
                      style={{
                        backgroundColor: active ? meta.color : "transparent",
                        borderColor: active ? meta.color : "#CBD5E1",
                      }}
                    >
                      {active && (
                        <Check size={11} strokeWidth={3} className="text-white" />
                      )}
                    </span>
                    <span className="truncate">{meta.label}</span>
                  </div>
                  {count > 0 && (
                    <span className="text-[10px] font-semibold text-[#919EAB] ml-2">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Event Categories Section */}
      <div className="px-4 py-3 border-b border-[#F1F3F5]">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setCategoriesExpanded(!categoriesExpanded)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-[#637381] uppercase tracking-wider hover:text-[#212B36] transition-colors"
          >
            <ChevronDown
              size={13}
              className={`transition-transform ${
                categoriesExpanded ? "" : "-rotate-90"
              }`}
            />
            <span>Event Categories</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const allCats: CalendarCategory[] = [
                ...CATEGORIES_LIST.map((c) => c.id),
                "event",
              ];
              if (selectedCategories.length >= CATEGORIES_LIST.length) {
                onChangeCategories([]);
              } else {
                onChangeCategories(allCats);
              }
            }}
            className="text-[11px] font-semibold text-[#637381] hover:text-[#212B36] transition-colors"
          >
            {selectedCategories.length >= CATEGORIES_LIST.length
              ? "Clear"
              : "All"}
          </button>
        </div>

        {categoriesExpanded && (
          <div className="space-y-0.5">
            {CATEGORIES_LIST.map((cat) => {
              const active = selectedCategories.includes(cat.id);
              const token = PASTEL_CATEGORY_TOKENS[cat.id];
              const count = catCounts[cat.id] || 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCat(cat.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${
                    active
                      ? "text-[#212B36] font-medium hover:bg-[#F4F6F8]"
                      : "text-[#919EAB] hover:bg-[#F4F6F8]/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-4 h-4 rounded-[5px] flex items-center justify-center transition-all shrink-0 border"
                      style={{
                        backgroundColor: active ? token.accent : "transparent",
                        borderColor: active ? token.accent : "#CBD5E1",
                      }}
                    >
                      {active && (
                        <Check size={11} strokeWidth={3} className="text-white" />
                      )}
                    </span>
                    <span className="truncate">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {count > 0 && (
                      <span className="text-[10px] font-semibold text-[#919EAB]">
                        {count}
                      </span>
                    )}
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: token.bg, border: `1.5px solid ${token.accent}` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected-Day Summary / Daily Agenda */}
      {onSelectEvent && onOpenCreate && (
        <div className="flex-1">
          <DailySummaryPanel
            selectedDate={selectedDate}
            events={events}
            rawMeetings={rawMeetings}
            rawCalls={rawCalls}
            rawTasks={rawTasks}
            onOpenCreate={onOpenCreate}
            onSelectEvent={onSelectEvent}
            onEditEvent={onEditEvent}
            onSelectMeeting={onSelectMeeting || (() => {})}
            onSelectCall={onSelectCall || (() => {})}
            onSelectTask={onSelectTask || (() => {})}
          />
        </div>
      )}
    </aside>
  );
}
