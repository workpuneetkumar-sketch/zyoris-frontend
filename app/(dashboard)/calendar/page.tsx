"use client";

import React, { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock, Phone, CheckSquare, AlertCircle, Loader2 } from "lucide-react";
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

    // Additional states for details and loading/error
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
                fetchCalls()
            ]);
            setTasks(tasksRes.tasks || []);
            setMeetings(meetingsRes || []);
            setCalls(callsRes.calls || []);
        } catch (error) {
            console.error("Failed to load calendar data:", error);
            setError("Failed to load calendar data. Please try again.");
            toast.error("Failed to load calendar data");
        } finally {
            setIsLoading(false);
        }
    };

    // Calendar logic
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const days = [];
        // Pad previous month
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(new Date(year, month, -firstDay.getDay() + i + 1));
        }
        // Current month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        // Pad next month
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
            days.push(new Date(curr.setDate(first + i)));
        }
        return days;
    };

    const prevPeriod = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (view === "month") newDate.setMonth(newDate.getMonth() - 1);
            else if (view === "week") newDate.setDate(newDate.getDate() - 7);
            else newDate.setDate(newDate.getDate() - 1);
            return newDate;
        });
    };

    const nextPeriod = () => {
        setCurrentDate(prev => {
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
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    const getItemsForDay = (date: Date) => {
        const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), date));
        const dayMeetings = meetings.filter(m => {
            const meetingDate = m.date ? new Date(m.date) : new Date(m.startTime);
            return isSameDay(meetingDate, date);
        });
        const dayCalls = calls.filter(c => c.date && isSameDay(new Date(c.date), date));
        return { dayTasks, dayMeetings, dayCalls };
    };

    const formatTime = (timeString: string) => {
        if (!timeString) return "";
        if (timeString.includes("T")) {
            const d = new Date(timeString);
            if (!isNaN(d.getTime())) {
                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        }
        return timeString;
    };

    const days = view === "month" ? getDaysInMonth(currentDate) : view === "week" ? getDaysInWeek(currentDate) : [currentDate];

    return (
        <div className="flex flex-col h-full xl:h-[calc(100vh-theme(spacing.16))] p-4 md:p-8 bg-[#F8FAFC]">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">Calendar</h1>
                    <p className="text-[15px] text-gray-500 mt-1 font-medium">Manage your schedule, tasks, and meetings seamlessly.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <div className="flex bg-white/60 backdrop-blur-md rounded-xl p-1 border border-gray-200/60 shadow-sm w-full md:w-auto justify-between">
                        <button
                            onClick={() => setView("day")}
                            className={`flex-1 md:flex-none px-4 py-2 text-[13px] font-bold rounded-lg transition-all duration-200 ${view === "day" ? "bg-white shadow-sm text-blue-700" : "text-gray-500 hover:text-gray-900 hover:bg-white/50"}`}
                        >
                            Day
                        </button>
                        <button
                            onClick={() => setView("week")}
                            className={`flex-1 md:flex-none px-4 py-2 text-[13px] font-bold rounded-lg transition-all duration-200 ${view === "week" ? "bg-white shadow-sm text-blue-700" : "text-gray-500 hover:text-gray-900 hover:bg-white/50"}`}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => setView("month")}
                            className={`flex-1 md:flex-none px-4 py-2 text-[13px] font-bold rounded-lg transition-all duration-200 ${view === "month" ? "bg-white shadow-sm text-blue-700" : "text-gray-500 hover:text-gray-900 hover:bg-white/50"}`}
                        >
                            Month
                        </button>
                    </div>
                    <button
                        onClick={() => { setEditingMeeting(null); setIsModalOpen(true); }}
                        className="flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[14px] font-bold hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200 w-full md:w-auto"
                    >
                        <Plus size={18} /> Schedule Meeting
                    </button>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0">
                {/* Left Side: Calendar View */}
                <div className="flex-1 flex flex-col min-h-[500px] xl:min-h-0 relative">

            {/* Calendar Controls */}
            {isLoading ? (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200/60 flex-1 flex flex-col overflow-hidden items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                    <p className="text-gray-500 font-medium">Loading calendar...</p>
                </div>
            ) : error ? (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200/60 flex-1 flex flex-col overflow-hidden items-center justify-center">
                    <AlertCircle className="w-14 h-14 text-red-500 mb-4" />
                    <p className="text-gray-900 font-bold mb-2 text-lg">Oops! Something went wrong.</p>
                    <p className="text-gray-500 mb-6">{error}</p>
                    <button onClick={loadData} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5">Try Again</button>
                </div>
            ) : tasks.length === 0 && meetings.length === 0 && calls.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200/60 flex-1 flex flex-col overflow-hidden items-center justify-center">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-5">
                        <CalendarIcon className="text-blue-500" size={36} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Your calendar is clear</h3>
                    <p className="text-[15px] text-gray-500 mb-8 max-w-sm text-center">You don't have any tasks, meetings, or calls right now. Enjoy your free time or schedule something new.</p>
                    <button onClick={() => { setEditingMeeting(null); setIsModalOpen(true); }} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5">
                        <Plus size={18} /> Schedule a Meeting
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200/60 flex-1 flex flex-col overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-center justify-between px-4 md:px-6 py-4 md:py-5 bg-white border-b border-gray-100 gap-4">
                        <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-between sm:justify-start">
                            <button onClick={prevPeriod} className="p-2 md:p-2.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-600 transition-all duration-200 border border-gray-200/60"><ChevronLeft size={18} /></button>
                            <h2 className="text-base md:text-xl font-extrabold tracking-tight text-gray-900 min-w-[120px] md:min-w-[180px] text-center">
                                {view === "day" ? currentDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : view === "week" ? "Week of " + formatMonthYear(currentDate) : formatMonthYear(currentDate)}
                            </h2>
                            <button onClick={nextPeriod} className="p-2 md:p-2.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-600 transition-all duration-200 border border-gray-200/60"><ChevronRight size={18} /></button>
                        </div>
                        <button onClick={() => setCurrentDate(new Date())} className="text-[13px] font-bold text-blue-700 hover:text-blue-800 transition-colors px-5 py-2 hover:bg-blue-50/80 rounded-xl w-full sm:w-auto border border-blue-100 bg-blue-50/40">Today</button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="flex-1 flex flex-col min-h-0 bg-gray-50/30">
                        <div className={`grid ${view === "day" ? "grid-cols-1" : "grid-cols-7"} border-b border-gray-200/60 shrink-0 bg-white`}>
                            {view === "day" ? (
                                <div className="py-2 md:py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][currentDate.getDay()]}
                                </div>
                            ) : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                <div key={day} className="py-2 md:py-4 text-center text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest hidden md:block">
                                    {day}
                                </div>
                            ))}
                            {/* Mobile short names */}
                            {view !== "day" && ["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                                <div key={i} className="py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest md:hidden">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className={`flex-1 grid ${view === "day" ? "grid-cols-1" : "grid-cols-7"} ${view === "month" ? "grid-rows-6" : "grid-rows-1"} overflow-y-auto`}>
                            {days.map((date, i) => {
                                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                                const isToday = isSameDay(date, new Date());
                                const isSelected = selectedDate && isSameDay(date, selectedDate);
                                const { dayTasks, dayMeetings, dayCalls } = getItemsForDay(date);

                                return (
                                    <div 
                                        key={i} 
                                        className={`min-h-[80px] md:min-h-[120px] border-r border-b border-gray-200/50 p-1 md:p-2.5 cursor-pointer transition-all duration-200 group ${isSelected ? "bg-blue-50/40 ring-1 ring-inset ring-blue-500/20" : !isCurrentMonth && view === "month" ? "bg-gray-100/50" : "bg-white hover:bg-blue-50/20"}`}
                                        onClick={() => {
                                            setSelectedDate(date);
                                            // On mobile, scroll to details
                                            if (window.innerWidth < 1280) {
                                                setTimeout(() => {
                                                    document.getElementById('mobile-details-panel')?.scrollIntoView({ behavior: 'smooth' });
                                                }, 50);
                                            }
                                        }}
                                    >
                                        <div className="flex justify-center md:justify-start items-start mb-1 md:mb-2">
                                            <span className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full text-[12px] md:text-[14px] transition-all duration-300 ${isToday ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/30 ring-2 ring-white" : isSelected ? "bg-blue-100 text-blue-700 font-bold" : !isCurrentMonth && view === "month" ? "text-gray-400 font-medium" : "text-gray-700 font-bold group-hover:text-blue-600 group-hover:bg-blue-50"}`}>
                                                {date.getDate()}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1 md:gap-1.5 overflow-y-auto max-h-[50px] md:max-h-[100px] pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                                            {dayMeetings.map(m => (
                                                <div key={m.id} className="truncate text-[9px] md:text-[11px] px-1 md:px-2 py-0.5 md:py-1.5 rounded-md md:rounded-lg bg-purple-50 text-purple-700 border border-purple-100/60 font-semibold shadow-sm transition-all hover:brightness-95 flex items-center gap-1">
                                                    <Clock size={10} className="shrink-0 opacity-70 hidden md:block"/> 
                                                    <span className="md:hidden w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                                                    {m.title}
                                                </div>
                                            ))}
                                            {dayTasks.map(t => (
                                                <div key={t.id} className="truncate text-[9px] md:text-[11px] px-1 md:px-2 py-0.5 md:py-1.5 rounded-md md:rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100/60 font-medium shadow-sm transition-all hover:brightness-95 flex items-center gap-1">
                                                    <CheckSquare size={10} className="shrink-0 opacity-70 hidden md:block"/> 
                                                    <span className="md:hidden w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                                                    {t.title}
                                                </div>
                                            ))}
                                            {dayCalls.map(c => (
                                                <div key={c.id} className="truncate text-[9px] md:text-[11px] px-1 md:px-2 py-0.5 md:py-1.5 rounded-md md:rounded-lg bg-orange-50 text-orange-700 border border-orange-100/60 font-medium shadow-sm transition-all hover:brightness-95 flex items-center gap-1">
                                                    <Phone size={10} className="shrink-0 opacity-70 hidden md:block" /> 
                                                    <span className="md:hidden w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></span>
                                                    {c.contactName || 'Call'}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            </div>

            {/* Selected Date Right Panel */}
            {selectedDate && (
                <div id="mobile-details-panel" className="w-full xl:w-[400px] 2xl:w-[450px] shrink-0 bg-white rounded-3xl shadow-sm border border-gray-200/60 flex flex-col overflow-hidden h-auto xl:h-full xl:max-h-full">
                    <div className="p-5 md:p-8 bg-gradient-to-br from-white to-gray-50/50 border-b border-gray-100 flex items-center justify-between shrink-0">
                        <div>
                            <h3 className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
                                {selectedDate.toLocaleDateString("en-US", { weekday: "long" })}
                            </h3>
                            <p className="text-gray-500 font-medium mt-1 text-[15px]">{selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <CalendarIcon size={24} className="text-blue-600" />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar bg-gray-50/20">
                        {/* Meetings */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span> Meetings
                            </h4>
                            <div className="space-y-3">
                                {getItemsForDay(selectedDate).dayMeetings.length > 0 ? getItemsForDay(selectedDate).dayMeetings.map(m => (
                                    <div key={m.id} className="p-4 bg-white rounded-2xl border border-gray-200/60 shadow-sm flex flex-col hover:border-purple-200 transition-colors group">
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="font-bold text-gray-900 line-clamp-2 pr-2 leading-snug">{m.title}</p>
                                            <button 
                                                onClick={() => { setEditingMeeting(m); setIsModalOpen(true); }} 
                                                className="text-[11px] uppercase tracking-widest text-purple-600 hover:text-purple-700 font-bold px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 rounded-lg shrink-0 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
                                            <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md"><Clock size={12} className="text-purple-500"/> {formatTime(m.startTime)} - {formatTime(m.endTime)}</span>
                                        </div>
                                    </div>
                                )) : <p className="text-[13px] text-gray-400 font-medium italic pl-4 border-l-2 border-gray-200">No meetings scheduled.</p>}
                            </div>
                        </div>

                        {/* Tasks */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Tasks Due
                            </h4>
                            <div className="space-y-3">
                                {getItemsForDay(selectedDate).dayTasks.length > 0 ? getItemsForDay(selectedDate).dayTasks.map(t => (
                                    <div key={t.id} className="p-4 bg-white rounded-2xl border border-gray-200/60 shadow-sm flex flex-col hover:border-indigo-200 transition-colors group">
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="font-bold text-gray-900 line-clamp-2 pr-2 leading-snug">{t.title}</p>
                                            <button 
                                                onClick={() => setSelectedTask(t)} 
                                                className="text-[11px] uppercase tracking-widest text-indigo-600 hover:text-indigo-700 font-bold px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg shrink-0 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                View
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 ${
                                                t.priority === 'HIGH' ? 'bg-red-50 text-red-600' : 
                                                t.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 
                                                'bg-emerald-50 text-emerald-600'
                                            }`}>
                                                {t.priority}
                                            </span>
                                            <span className="text-xs font-medium text-gray-400">&bull; {t.status}</span>
                                        </div>
                                    </div>
                                )) : <p className="text-[13px] text-gray-400 font-medium italic pl-4 border-l-2 border-gray-200">No tasks due today.</p>}
                            </div>
                        </div>

                        {/* Calls */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span> Logged Calls
                            </h4>
                            <div className="space-y-3">
                                {getItemsForDay(selectedDate).dayCalls.length > 0 ? getItemsForDay(selectedDate).dayCalls.map(c => (
                                    <div key={c.id} className="p-4 bg-white rounded-2xl border border-gray-200/60 shadow-sm flex flex-col hover:border-orange-200 transition-colors group">
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="font-bold text-gray-900 line-clamp-1 pr-2 leading-snug flex items-center gap-2">
                                                <Phone size={14} className="text-orange-500"/>
                                                {c.contactName || 'Unknown Contact'}
                                            </p>
                                            <button 
                                                onClick={() => setSelectedCall(c)} 
                                                className="text-[11px] uppercase tracking-widest text-orange-600 hover:text-orange-700 font-bold px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 rounded-lg shrink-0 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                View
                                            </button>
                                        </div>
                                        <p className="text-[13px] font-medium text-gray-500 flex items-center gap-2">
                                            <span className="bg-gray-50 px-2 py-0.5 rounded text-gray-600">{c.duration} mins</span>
                                            <span className="text-gray-300">&bull;</span>
                                            <span>{c.outcome}</span>
                                        </p>
                                    </div>
                                )) : <p className="text-[13px] text-gray-400 font-medium italic pl-4 border-l-2 border-gray-200">No calls logged.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>

            {/* Task Details Modal */}
            {selectedTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><CheckSquare size={18} className="text-blue-600"/> Task Details</h2>
                            <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <h3 className="font-bold text-xl text-gray-900 mb-2">{selectedTask.title}</h3>
                            {selectedTask.description && <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">{selectedTask.description}</p>}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Status</span>
                                    <span className="font-medium text-gray-900">{selectedTask.status}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Priority</span>
                                    <span className="font-medium text-gray-900">{selectedTask.priority}</span>
                                </div>
                                {selectedTask.dueDate && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Due Date</span>
                                        <span className="font-medium text-gray-900">{new Date(selectedTask.dueDate).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button onClick={() => setSelectedTask(null)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Call Details Modal */}
            {selectedCall && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Phone size={18} className="text-orange-600"/> Call Details</h2>
                            <button onClick={() => setSelectedCall(null)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <h3 className="font-bold text-xl text-gray-900 mb-2">{selectedCall.contactName || 'Unknown Contact'}</h3>
                            {selectedCall.notes && <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">{selectedCall.notes}</p>}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Outcome</span>
                                    <span className="font-medium text-gray-900">{selectedCall.outcome}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Duration</span>
                                    <span className="font-medium text-gray-900">{selectedCall.duration} minutes</span>
                                </div>
                                {selectedCall.date && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Date</span>
                                        <span className="font-medium text-gray-900">{new Date(selectedCall.date).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button onClick={() => setSelectedCall(null)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Meeting Modal */}
            <ScheduleMeetingModal 
                isOpen={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingMeeting(null);
                }} 
                onSuccess={loadData}
                initialDate={selectedDate || new Date()}
                editingMeeting={editingMeeting}
            />
        </div>
    );
}

function ScheduleMeetingModal({ isOpen, onClose, onSuccess, initialDate, editingMeeting }: { isOpen: boolean, onClose: () => void, onSuccess: () => void, initialDate: Date | null, editingMeeting?: Meeting | null }) {
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (editingMeeting) {
                setTitle(editingMeeting.title);
                const meetingDateStr = editingMeeting.date || editingMeeting.startTime;
                if (meetingDateStr) {
                    setDate(new Date(meetingDateStr).toISOString().split("T")[0]);
                } else {
                    setDate("");
                }
                
                const extractTime = (isoString: string) => {
                    if (!isoString) return "";
                    if (isoString.includes("T")) {
                        const d = new Date(isoString);
                        if (!isNaN(d.getTime())) {
                            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                        }
                    }
                    return isoString;
                };

                setStartTime(extractTime(editingMeeting.startTime));
                setEndTime(extractTime(editingMeeting.endTime));
            } else {
                setTitle("");
                setStartTime("");
                setEndTime("");
                if (initialDate) {
                    setDate(initialDate.toISOString().split("T")[0]);
                }
            }
        }
    }, [isOpen, initialDate, editingMeeting]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const startDateTime = new Date(`${date}T${startTime}`);
            const endDateTime = new Date(`${date}T${endTime}`);
            
            if (editingMeeting) {
                await updateMeeting(editingMeeting.id, {
                    title,
                    date: new Date(date).toISOString(),
                    startTime: startDateTime.toISOString(),
                    endTime: endDateTime.toISOString()
                });
                toast.success("Meeting updated successfully");
            } else {
                await createMeeting({
                    title,
                    date: new Date(date).toISOString(),
                    startTime: startDateTime.toISOString(),
                    endTime: endDateTime.toISOString()
                });
                toast.success("Meeting scheduled successfully");
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(editingMeeting ? "Failed to update meeting" : "Failed to schedule meeting");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">{editingMeeting ? "Edit Meeting" : "Schedule Meeting"}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-4 md:p-6 overflow-y-auto">
                    <form id="meeting-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Title <span className="text-red-500">*</span></label>
                            <input required value={title} onChange={e => setTitle(e.target.value)} type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="e.g. Sync with client" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                            <input required value={date} onChange={e => setDate(e.target.value)} type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time <span className="text-red-500">*</span></label>
                                <input required value={startTime} onChange={e => setStartTime(e.target.value)} type="time" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Time <span className="text-red-500">*</span></label>
                                <input required value={endTime} onChange={e => setEndTime(e.target.value)} type="time" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                            </div>
                        </div>
                    </form>
                </div>
                <div className="px-4 md:px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                    <button type="submit" form="meeting-form" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
                        {loading ? "Saving..." : editingMeeting ? "Update Meeting" : "Schedule Meeting"}
                    </button>
                </div>
            </div>
        </div>
    );
}