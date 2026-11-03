"use client";

import React from "react";
import { CalendarDepartment, CalendarCategory } from "@/types/calendar";
import { PASTEL_CATEGORY_TOKENS } from "./calendarTheme";
import { Check, X, RotateCcw } from "lucide-react";

interface CalendarSidebarFiltersProps {
  selectedDepartments: CalendarDepartment[];
  onChangeDepartments: (depts: CalendarDepartment[]) => void;
  selectedCategories: CalendarCategory[];
  onChangeCategories: (cats: CalendarCategory[]) => void;
  onResetFilters: () => void;
  onClose?: () => void;
}

const DEPARTMENTS: { id: CalendarDepartment; label: string; color: string }[] = [
  { id: "personal", label: "Personal Calendar", color: "bg-blue-400" },
  { id: "company", label: "Company-Wide", color: "bg-indigo-400" },
  { id: "development", label: "Development", color: "bg-sky-400" },
  { id: "hr", label: "HR & Recruitment", color: "bg-teal-400" },
  { id: "marketing", label: "Marketing", color: "bg-purple-400" },
  { id: "sales", label: "Sales & Clients", color: "bg-amber-400" },
  { id: "management", label: "Management", color: "bg-rose-400" },
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
}: CalendarSidebarFiltersProps) {
  const toggleDept = (dept: CalendarDepartment) => {
    if (selectedDepartments.includes(dept)) {
      if (selectedDepartments.length === 1) return; // keep at least 1
      onChangeDepartments(selectedDepartments.filter((d) => d !== dept));
    } else {
      onChangeDepartments([...selectedDepartments, dept]);
    }
  };

  const toggleCat = (cat: CalendarCategory) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length === 1) return; // keep at least 1
      onChangeCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      onChangeCategories([...selectedCategories, cat]);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 md:p-5 space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">
          Filter Calendars
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onResetFilters}
            className="p-1 text-slate-400 hover:text-[#355D91] transition-colors"
            title="Reset filters to default"
          >
            <RotateCcw size={13} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              title="Close panel"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Departments */}
      <div>
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          Calendars
        </h4>
        <div className="space-y-1">
          {DEPARTMENTS.map((dept) => {
            const active = selectedDepartments.includes(dept.id);
            return (
              <label
                key={dept.id}
                onClick={() => toggleDept(dept.id)}
                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition-colors select-none ${
                  active ? "bg-slate-50 font-semibold text-slate-900" : "text-slate-400 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${dept.color}`} />
                  <span>{dept.label}</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                    active ? "bg-[#355D91] border-[#355D91] text-white" : "border-slate-300 bg-white"
                  }`}
                >
                  {active && <Check size={11} strokeWidth={2.8} />}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Categories with unified pastel indicators */}
      <div className="pt-2 border-t border-slate-100">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          Event Types
        </h4>
        <div className="space-y-1">
          {CATEGORIES_LIST.map((cat) => {
            const active = selectedCategories.includes(cat.id);
            const token = PASTEL_CATEGORY_TOKENS[cat.id];
            return (
              <label
                key={cat.id}
                onClick={() => toggleCat(cat.id)}
                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition-colors select-none ${
                  active ? "bg-slate-50 font-semibold text-slate-900" : "text-slate-400 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: token.dot }}
                  />
                  <span>{cat.label}</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                    active ? "bg-[#355D91] border-[#355D91] text-white" : "border-slate-300 bg-white"
                  }`}
                >
                  {active && <Check size={11} strokeWidth={2.8} />}
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
