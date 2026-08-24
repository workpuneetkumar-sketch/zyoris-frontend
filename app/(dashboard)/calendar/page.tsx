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
  UserCheck,
} from "lucide-react";
import { fetchTasks, Task } from "@/lib/api/tasksApi";
import { getMeetings, createMeeting, updateMeeting, Meeting } from "@/lib/api/meetingsApi";
import { fetchCalls, Call } from "@/lib/api/callsApi";
import { toast } from "react-toastify";

export default function CalendarPage() {
  const [view, setView] = useState<"day" | "month" | "week">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
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
      if (view === "month") newDate.setMonth(newDate.getMonth() - 1);
      else if (view === "week") newDate.setDate(newDate.getDate() - 7);
      else newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const nextPeriod = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === "month") newDate.setMonth(newDate.getMonth() + 1);
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
    view === "month"
      ? getDaysInMonth(currentDate)
      : view === "week"
      ? getDaysInWeek(currentDate)
      : [currentDate];

  return (
    <div className="flex flex-col min-h-full p-4 md:p-6 lg:p-8 bg-[#F8FAFC] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight tracking-tight">
            Calendar
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            Manage your schedule, tasks, and meetings seamlessly.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* View toggle */}
          <div className="flex p-1 bg-white border border-gray-200/80 rounded-xl shadow-sm">
            {(["day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                  view === v
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setEditingMeeting(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 active:scale-95"
          >
            <Plus size={16} /> Schedule Meeting
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Side: Calendar Grid */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 border-b border-gray-100 gap-4 bg-gray-50/40">
            <div className="flex items-center gap-3">
              <button
                onClick={prevPeriod}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95"
              >
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-lg font-black text-gray-900 min-w-[160px] text-center tracking-tight">
                {view === "day"
                  ? currentDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })
                  : view === "week"
                  ? "Week of " + formatMonthYear(currentDate)
                  : formatMonthYear(currentDate)}
              </h2>
              <button
                onClick={nextPeriod}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-1.5 rounded-xl border border-blue-200 bg-blue-50/60 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-all active:scale-95"
            >
              Today
            </button>
          </div>

          {/* Grid Headers */}
          <div
            className={`grid ${
              view === "day" ? "grid-cols-1" : "grid-cols-7"
            } border-b border-gray-100 bg-gray-50/80 text-center py-2.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest`}
          >
            {view === "day"
              ? [
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ][currentDate.getDay()]
              : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day}>{day}</div>
                ))}
          </div>

          {/* Grid Cells */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[450px] p-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
              <p className="text-gray-400 text-sm font-medium">
                Loading calendar schedule...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center min-h-[450px] p-8">
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
              } divide-x divide-y divide-gray-100 bg-gray-100/40`}
            >
              {days.map((date, i) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isToday = isSameDay(date, new Date());
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const { dayTasks, dayMeetings, dayCalls } = getItemsForDay(date);
                const totalItems = dayMeetings.length + dayTasks.length + dayCalls.length;

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`min-h-[110px] md:min-h-[130px] p-2 flex flex-col justify-start transition-all cursor-pointer group ${
                      isSelected
                        ? "bg-blue-50/70 ring-2 ring-inset ring-blue-500/50"
                        : !isCurrentMonth && view === "month"
                        ? "bg-gray-50/40 text-gray-300"
                        : "bg-white hover:bg-blue-50/20"
                    }`}
                  >
                    {/* Date Number Header */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`w-7 h-7 flex items-center justify-center rounded-full text-xs transition-all ${
                          isToday
                            ? "bg-blue-600 text-white font-black shadow-md shadow-blue-500/30"
                            : isSelected
                            ? "bg-blue-100 text-blue-700 font-bold"
                            : !isCurrentMonth && view === "month"
                            ? "text-gray-300 font-medium"
                            : "text-gray-700 font-bold group-hover:text-blue-600"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      {totalItems > 0 && (
                        <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {totalItems}
                        </span>
                      )}
                    </div>

                    {/* Event Badges */}
                    <div className="space-y-1 overflow-hidden flex-1">
                      {/* Meetings */}
                      {dayMeetings.slice(0, 2).map((m) => (
                        <div
                          key={m.id}
                          className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200/60 text-[11px] font-semibold flex items-center gap-1.5 truncate shadow-2xs hover:brightness-95 transition-all"
                        >
                          <Video size={10} className="shrink-0 text-purple-500" />
                          <span className="truncate">{m.title}</span>
                        </div>
                      ))}

                      {/* Tasks */}
                      {dayTasks.slice(0, 2 - Math.min(dayMeetings.length, 2)).map((t) => (
                        <div
                          key={t.id}
                          className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[11px] font-semibold flex items-center gap-1.5 truncate shadow-2xs hover:brightness-95 transition-all"
                        >
                          <CheckSquare size={10} className="shrink-0 text-indigo-500" />
                          <span className="truncate">{t.title}</span>
                        </div>
                      ))}

                      {/* Calls */}
                      {dayCalls
                        .slice(
                          0,
                          Math.max(
                            0,
                            2 - (Math.min(dayMeetings.length, 2) + Math.min(dayTasks.length, 2))
                          )
                        )
                        .map((c) => (
                          <div
                            key={c.id}
                            className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 text-[11px] font-semibold flex items-center gap-1.5 truncate shadow-2xs hover:brightness-95 transition-all"
                          >
                            <Phone size={10} className="shrink-0 text-amber-500" />
                            <span className="truncate">{c.contactName || "Call"}</span>
                          </div>
                        ))}

                      {totalItems > 2 && (
                        <div className="text-[10px] font-bold text-gray-400 pl-1 pt-0.5">
                          +{totalItems - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Selected Day Details Panel */}
        {selectedDate && (
          <div className="w-full xl:w-[380px] shrink-0 bg-white rounded-2xl border border-gray-200/80 shadow-sm flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className="p-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  {selectedDate.toLocaleDateString("en-US", { weekday: "long" })}
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {selectedDate.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200/80 flex items-center justify-center shadow-xs">
                <CalendarIcon size={18} className="text-blue-600" />
              </div>
            </div>

            {/* Panel Content */}
            <div className="p-5 space-y-6 overflow-y-auto max-h-[600px] no-scrollbar">
              {/* Meetings Section */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" /> Meetings
                </h4>
                <div className="space-y-2.5">
                  {getItemsForDay(selectedDate).dayMeetings.length > 0 ? (
                    getItemsForDay(selectedDate).dayMeetings.map((m) => (
                      <div
                        key={m.id}
                        className="p-3.5 bg-gray-50/60 rounded-xl border border-gray-100 hover:border-purple-200 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="font-bold text-gray-900 text-sm leading-snug">
                            {m.title}
                          </p>
                          <button
                            onClick={() => {
                              setEditingMeeting(m);
                              setIsModalOpen(true);
                            }}
                            className="text-[10px] font-bold text-purple-600 hover:text-purple-700 bg-purple-50 px-2 py-1 rounded-md transition-colors"
                          >
                            Edit
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                          <Clock size={12} className="text-purple-500" />
                          <span>
                            {formatTime(m.startTime)} - {formatTime(m.endTime)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic pl-3 border-l-2 border-gray-200">
                      No meetings scheduled
                    </p>
                  )}
                </div>
              </div>

              {/* Tasks Section */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" /> Tasks Due
                </h4>
                <div className="space-y-2.5">
                  {getItemsForDay(selectedDate).dayTasks.length > 0 ? (
                    getItemsForDay(selectedDate).dayTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 bg-gray-50/60 rounded-xl border border-gray-100 hover:border-indigo-200 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="font-bold text-gray-900 text-sm leading-snug">
                            {t.title}
                          </p>
                          <button
                            onClick={() => setSelectedTask(t)}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md transition-colors"
                          >
                            View
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              t.priority === "HIGH"
                                ? "bg-red-50 text-red-600"
                                : t.priority === "MEDIUM"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            {t.priority}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">
                            • {t.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic pl-3 border-l-2 border-gray-200">
                      No tasks due today
                    </p>
                  )}
                </div>
              </div>

              {/* Calls Section */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Logged Calls
                </h4>
                <div className="space-y-2.5">
                  {getItemsForDay(selectedDate).dayCalls.length > 0 ? (
                    getItemsForDay(selectedDate).dayCalls.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 bg-gray-50/60 rounded-xl border border-gray-100 hover:border-amber-200 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="font-bold text-gray-900 text-sm leading-snug flex items-center gap-1.5">
                            <Phone size={13} className="text-amber-500" />
                            {c.contactName || "Call"}
                          </p>
                          <button
                            onClick={() => setSelectedCall(c)}
                            className="text-[10px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-2 py-1 rounded-md transition-colors"
                          >
                            View
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                          {c.duration} mins • {c.outcome}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic pl-3 border-l-2 border-gray-200">
                      No calls logged
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CheckSquare size={18} className="text-indigo-600" /> Task Details
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
                <h3 className="font-extrabold text-lg text-gray-900">
                  {selectedTask.title}
                </h3>
                {selectedTask.description && (
                  <p className="text-xs text-gray-500 mt-1.5 whitespace-pre-wrap">
                    {selectedTask.description}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">
                    Status
                  </span>
                  <span className="text-xs font-bold text-gray-900">
                    {selectedTask.status}
                  </span>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">
                    Priority
                  </span>
                  <span className="text-xs font-bold text-gray-900">
                    {selectedTask.priority}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Details Modal */}
      {selectedCall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Phone size={18} className="text-amber-600" /> Call Details
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
                <h3 className="font-extrabold text-lg text-gray-900">
                  {selectedCall.contactName || "Call Log"}
                </h3>
                {selectedCall.notes && (
                  <p className="text-xs text-gray-500 mt-1.5 whitespace-pre-wrap">
                    {selectedCall.notes}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">
                    Outcome
                  </span>
                  <span className="text-xs font-bold text-gray-900">
                    {selectedCall.outcome}
                  </span>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">
                    Duration
                  </span>
                  <span className="text-xs font-bold text-gray-900">
                    {selectedCall.duration} mins
                  </span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all"
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