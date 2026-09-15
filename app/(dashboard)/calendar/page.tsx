"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar as CalendarIcon,
  Clock,
  Phone,
  CheckSquare,
  AlertCircle,
  Loader2,
  Video,
} from "lucide-react";
import { fetchTasks, Task } from "@/lib/api/tasksApi";
import { getMeetings, Meeting } from "@/lib/api/meetingsApi";
import { fetchCalls, Call } from "@/lib/api/callsApi";
import { toast } from "react-toastify";

export default function CalendarPage() {
  const [view, setView] = useState<"month" | "week" | "day" | "schedule">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<{
    text: string;
    type: string;
    time?: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tasksRes, meetingsRes, callsRes] = await Promise.all([
        fetchTasks(),
        getMeetings(),
        fetchCalls(),
      ]);
      setTasks(tasksRes.tasks || []);
      setMeetings(meetingsRes || []);
      setCalls(callsRes.calls || []);
    } catch (err) {
      console.error("Failed to load calendar data:", err);
      setError("Failed to load calendar data. Please try again.");
      toast.error("Failed to load calendar data");
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    const firstDayIndex = firstDay.getDay(); // 0 is Sunday
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
    return days;
  };

  const getDaysInWeek = (date: Date) => {
    const curr = new Date(date);
    const first = curr.getDate() - curr.getDay();
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(new Date(curr.getFullYear(), curr.getMonth(), first + i));
    }
    return days;
  };

  const prevPeriod = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === "month" || view === "schedule") newDate.setMonth(newDate.getMonth() - 1);
      else if (view === "week") newDate.setDate(newDate.getDate() - 7);
      else newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const nextPeriod = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === "month" || view === "schedule") newDate.setMonth(newDate.getMonth() + 1);
      else if (view === "week") newDate.setDate(newDate.getDate() + 7);
      else newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const getItemsForDay = (date: Date) => {
    const dayTasks = tasks.filter(
      (t) => t.dueDate && isSameDay(new Date(t.dueDate), date)
    );
    const dayMeetings = meetings.filter((m) => {
      const meetingDate = m.date ? new Date(m.date) : new Date(m.startTime);
      return isSameDay(meetingDate, date);
    });
    const dayCalls = calls.filter(
      (c) => c.date && isSameDay(new Date(c.date), date)
    );
    return { dayTasks, dayMeetings, dayCalls };
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    if (timeString.includes("T")) {
      const d = new Date(timeString);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
    }
    return timeString;
  };

  const days =
    view === "month" || view === "schedule"
      ? getDaysInMonth(currentDate)
      : view === "week"
      ? getDaysInWeek(currentDate)
      : [currentDate];

  return (
    <div className="flex flex-col min-h-full p-4 md:p-6 lg:p-8 bg-[#F8FAFC] space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Navigation Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center bg-blue-500 hover:bg-blue-600 rounded-full p-0.5 text-white shadow-sm transition-all">
            <button
              onClick={prevPeriod}
              className="p-2 hover:bg-blue-600/50 rounded-full transition-colors active:scale-95"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="w-px h-5 bg-blue-400/60" />
            <button
              onClick={nextPeriod}
              className="p-2 hover:bg-blue-600/50 rounded-full transition-colors active:scale-95"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-5 py-2 rounded-full bg-blue-400/30 text-blue-700 hover:bg-blue-400/40 text-xs font-black tracking-wider uppercase transition-all active:scale-95"
          >
            Today
          </button>
        </div>

        {/* Center: Month & Year */}
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight text-center">
          {view === "day"
            ? currentDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })
            : formatMonthYear(currentDate)}
        </h2>

        {/* Right: View Switcher Segmented Pill */}
        <div className="flex items-center bg-blue-500 rounded-full p-1 shadow-sm w-full md:w-auto overflow-x-auto">
          {(["month", "week", "day", "schedule"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all ${
                view === v
                  ? "bg-white text-blue-600 rounded-full shadow-sm"
                  : "text-white/90 hover:text-white hover:bg-blue-600/50 rounded-full"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-white text-center py-3 text-xs font-bold text-slate-600">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Grid Cells */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[480px] p-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
              <p className="text-gray-400 text-sm font-medium">Loading schedule...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center min-h-[480px] p-8">
              <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
              <p className="text-gray-900 font-bold text-base mb-1">{error}</p>
              <button
                onClick={loadData}
                className="mt-3 px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
              >
                Retry
              </button>
            </div>
          ) : (
            <div
              className={`grid ${
                view === "day" ? "grid-cols-1" : "grid-cols-7"
              } border-l border-t border-gray-200`}
            >
              {days.map((date, i) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isToday = isSameDay(date, new Date());
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const { dayTasks, dayMeetings, dayCalls } = getItemsForDay(date);

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`min-h-[110px] md:min-h-[125px] border-r border-b border-gray-200 p-2 flex flex-col transition-all cursor-pointer relative group ${
                      isSelected
                        ? "bg-sky-50/80 ring-2 ring-inset ring-blue-400"
                        : !isCurrentMonth && view === "month"
                        ? "bg-gray-50/50"
                        : "bg-white hover:bg-sky-50/30"
                    }`}
                  >
                    {/* Top Date Number Alignment */}
                    <div className="flex justify-end mb-1">
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded-full transition-all ${
                          isToday
                            ? "bg-blue-600 text-white shadow-sm"
                            : isSelected
                            ? "text-blue-700 font-black"
                            : !isCurrentMonth && view === "month"
                            ? "text-slate-300 font-normal"
                            : "text-slate-600 group-hover:text-blue-600"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </div>

                    {/* Event Badges (Cute & Filled Colorful Style as in reference photo) */}
                    <div className="space-y-1.5 overflow-hidden flex-1">
                      {/* Meetings (Blue Pills) */}
                      {dayMeetings.map((m) => (
                        <div
                          key={m.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMeeting(m);
                            setIsModalOpen(true);
                          }}
                          className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-xs truncate hover:brightness-110 transition-all cursor-pointer flex items-center justify-between"
                          title={m.title}
                        >
                          <span className="truncate">{m.title}</span>
                          {m.startTime && (
                            <span className="text-[10px] text-blue-100 ml-1 shrink-0">
                              {formatTime(m.startTime)}
                            </span>
                          )}
                        </div>
                      ))}

                      {/* Calls (Emerald / Amber Green Pills) */}
                      {dayCalls.map((c) => (
                        <div
                          key={c.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCall(c);
                          }}
                          className="bg-emerald-500 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-xs truncate hover:brightness-110 transition-all cursor-pointer"
                          title={c.contactName || "Call"}
                        >
                          Call - {c.contactName || "Contact"}
                        </div>
                      ))}

                      {/* Tasks (Amber / Rose Pills) */}
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(t);
                          }}
                          className={`text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-xs truncate hover:brightness-110 transition-all cursor-pointer ${
                            t.priority === "HIGH" ? "bg-rose-500" : "bg-amber-500"
                          }`}
                          title={t.title}
                        >
                          {t.priority === "HIGH" ? "Urgent - " : ""}{t.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Details Panel */}
        {selectedDate && (
          <div className="w-full xl:w-[380px] shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-5 bg-blue-500 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black tracking-tight">
                  {selectedDate.toLocaleDateString("en-US", { weekday: "long" })}
                </h3>
                <p className="text-xs text-blue-100 font-medium mt-0.5">
                  {selectedDate.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <CalendarIcon size={18} className="text-white" />
              </div>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto max-h-[600px] no-scrollbar">
              {/* Meetings */}
              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Meetings
                </h4>
                <div className="space-y-2">
                  {getItemsForDay(selectedDate).dayMeetings.length > 0 ? (
                    getItemsForDay(selectedDate).dayMeetings.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{m.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {formatTime(m.startTime)} - {formatTime(m.endTime)}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingMeeting(m);
                            setIsModalOpen(true);
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs"
                        >
                          Edit
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No meetings scheduled</p>
                  )}
                </div>
              </div>

              {/* Calls */}
              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Calls
                </h4>
                <div className="space-y-2">
                  {getItemsForDay(selectedDate).dayCalls.length > 0 ? (
                    getItemsForDay(selectedDate).dayCalls.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-800 text-xs">
                            {c.contactName || "Call Log"}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {c.duration} mins • {c.outcome}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedCall(c)}
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs"
                        >
                          View
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No calls logged</p>
                  )}
                </div>
              </div>

              {/* Tasks */}
              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Tasks
                </h4>
                <div className="space-y-2">
                  {getItemsForDay(selectedDate).dayTasks.length > 0 ? (
                    getItemsForDay(selectedDate).dayTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{t.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Priority: {t.priority} • Status: {t.status}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedTask(t)}
                          className="text-[10px] font-bold text-amber-600 hover:text-amber-700 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs"
                        >
                          View
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No tasks due today</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare size={18} className="text-blue-600" /> Task Details
              </h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">
                  {selectedTask.title}
                </h3>
                {selectedTask.description && (
                  <p className="text-xs text-slate-500 mt-1.5 whitespace-pre-wrap">
                    {selectedTask.description}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                    Status
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {selectedTask.status}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                    Priority
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {selectedTask.priority}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-5 py-2 bg-white border border-gray-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Modal */}
      {selectedCall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Phone size={18} className="text-emerald-600" /> Call Details
              </h2>
              <button
                onClick={() => setSelectedCall(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">
                  {selectedCall.contactName || "Call Log"}
                </h3>
                {selectedCall.notes && (
                  <p className="text-xs text-slate-500 mt-1.5 whitespace-pre-wrap">
                    {selectedCall.notes}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                    Outcome
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {selectedCall.outcome}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                    Duration
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {selectedCall.duration} mins
                  </span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-5 py-2 bg-white border border-gray-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}