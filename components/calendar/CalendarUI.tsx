"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Calendar as CalendarIcon, Clock, AlertCircle } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { fetchMeetings, createMeeting, Meeting, CreateMeetingPayload } from "@/lib/api/meetingsApi";
import { Task } from "@/lib/api/tasksApi";

type ViewMode = "month" | "week";

export function CalendarUI() {
    const { tasks, loading: tasksLoading, error: tasksError, retry: retryTasks } = useTasks();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [meetingsLoading, setMeetingsLoading] = useState(true);
    const [meetingsError, setMeetingsError] = useState<string | null>(null);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("month");
    
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    
    // Fetch meetings
    const loadMeetings = async () => {
        setMeetingsLoading(true);
        setMeetingsError(null);
        try {
            const data = await fetchMeetings();
            setMeetings(data.meetings || []);
        } catch (err: any) {
            setMeetingsError(err.message || "Failed to fetch meetings.");
        } finally {
            setMeetingsLoading(false);
        }
    };

    useEffect(() => {
        loadMeetings();
    }, []);

    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (viewMode === "month") {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setDate(newDate.getDate() - 7);
        }
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === "month") {
            newDate.setMonth(newDate.getMonth() + 1);
        } else {
            newDate.setDate(newDate.getDate() + 7);
        }
        setCurrentDate(newDate);
    };

    const handleToday = () => {
        setCurrentDate(newDate());
    };

    const newDate = () => new Date();

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const monthDays = useMemo(() => {
        const days = [];
        const totalDays = getDaysInMonth(currentYear, currentMonth);
        const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
        
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= totalDays; i++) {
            days.push(new Date(currentYear, currentMonth, i));
        }
        return days;
    }, [currentYear, currentMonth]);

    const weekDays = useMemo(() => {
        const start = new Date(currentDate);
        start.setDate(start.getDate() - start.getDay());
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            days.push(d);
        }
        return days;
    }, [currentDate]);

    const getItemsForDate = (date: Date) => {
        const dateStr = date.toLocaleDateString("en-CA"); // YYYY-MM-DD local timezone
        const dayTasks = tasks.filter(t => t.dueDate && t.dueDate.startsWith(dateStr));
        const dayMeetings = meetings.filter(m => m.date && m.date.startsWith(dateStr));
        return { dayTasks, dayMeetings };
    };

    const loading = tasksLoading || meetingsLoading;
    const error = tasksError || meetingsError;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <AlertCircle size={32} className="text-red-400" />
                <p className="text-red-500 text-sm">{error}</p>
                <button
                    onClick={() => { retryTasks(); loadMeetings(); }}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-full space-y-6 md:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 leading-tight tracking-tight">Calendar</h1>
                    <p className="text-sm text-gray-400 font-medium mt-0.5">Manage your tasks and meetings.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setViewMode("month")}
                            className={`px-4 py-1.5 text-[13px] font-bold rounded-lg transition-all ${viewMode === "month" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            Month
                        </button>
                        <button 
                            onClick={() => setViewMode("week")}
                            className={`px-4 py-1.5 text-[13px] font-bold rounded-lg transition-all ${viewMode === "week" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            Week
                        </button>
                    </div>
                    <button
                        onClick={() => setIsScheduleOpen(true)}
                        className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-blue-600 text-white text-[13px] font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                    >
                        <Plus size={18} />
                        Schedule Meeting
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900">
                        {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrev} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={handleToday} className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
                            Today
                        </button>
                        <button onClick={handleNext} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="h-[500px] flex items-center justify-center">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                    </div>
                ) : viewMode === "month" ? (
                    <div className="grid grid-cols-7 gap-x-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                            <div key={day} className="bg-gray-50 py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                        {monthDays.map((date, idx) => (
                            <CalendarCell 
                                key={idx} 
                                date={date} 
                                getItemsForDate={getItemsForDate}
                                onClick={() => date && setSelectedDate(date)}
                                isToday={date ? date.toLocaleDateString() === new Date().toLocaleDateString() : false}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-7 gap-x-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
                        {weekDays.map((date, idx) => (
                            <div key={idx} className="bg-gray-50 py-2 text-center">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{date.toLocaleDateString("en-US", { weekday: "short" })}</p>
                                <p className="text-sm font-bold text-gray-900 mt-1">{date.getDate()}</p>
                            </div>
                        ))}
                        {weekDays.map((date, idx) => (
                            <CalendarCell 
                                key={`week-${idx}`} 
                                date={date} 
                                getItemsForDate={getItemsForDate}
                                onClick={() => date && setSelectedDate(date)}
                                isToday={date ? date.toLocaleDateString() === new Date().toLocaleDateString() : false}
                                isWeekView
                            />
                        ))}
                    </div>
                )}
            </div>

            {selectedDate && (
                <DateDetailsModal 
                    date={selectedDate}
                    onClose={() => setSelectedDate(null)}
                    items={getItemsForDate(selectedDate)}
                />
            )}

            {isScheduleOpen && (
                <ScheduleMeetingModal
                    onClose={() => setIsScheduleOpen(false)}
                    onSave={async (data) => {
                        await createMeeting(data);
                        await loadMeetings();
                        setIsScheduleOpen(false);
                    }}
                />
            )}
        </div>
    );
}

function CalendarCell({ date, getItemsForDate, onClick, isToday, isWeekView = false }: any) {
    if (!date) return <div className="bg-white min-h-[120px] border-t border-gray-200" />;
    
    const { dayTasks, dayMeetings } = getItemsForDate(date);
    const hasItems = dayTasks.length > 0 || dayMeetings.length > 0;

    return (
        <div 
            onClick={onClick}
            className={`bg-white p-2 min-h-[120px] border-t border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${isWeekView ? 'min-h-[400px]' : ''} ${isToday ? 'bg-blue-50/30' : ''}`}
        >
            <div className={`text-sm font-semibold mb-2 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                {date.getDate()}
            </div>
            <div className="space-y-1.5">
                {dayMeetings.map((m: any) => (
                    <div key={m.id} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md truncate border border-purple-100 font-medium">
                        {m.startTime ? `${m.startTime} ` : ''}{m.title}
                    </div>
                ))}
                {dayTasks.map((t: any) => (
                    <div key={t.id} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md truncate border border-blue-100 font-medium">
                        {t.title}
                    </div>
                ))}
            </div>
        </div>
    );
}

function DateDetailsModal({ date, onClose, items }: any) {
    const { dayTasks, dayMeetings } = items;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 md:p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">
                        {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-5 md:p-6 max-h-[70vh] overflow-y-auto space-y-6">
                    <div>
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Clock size={14} /> Meetings ({dayMeetings.length})
                        </h3>
                        {dayMeetings.length === 0 ? (
                            <p className="text-sm text-gray-500">No meetings scheduled.</p>
                        ) : (
                            <div className="space-y-3">
                                {dayMeetings.map((m: any) => (
                                    <div key={m.id} className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl">
                                        <p className="text-sm font-bold text-purple-900">{m.title}</p>
                                        <div className="flex items-center gap-3 mt-1.5 text-xs text-purple-700">
                                            {m.startTime && m.endTime && (
                                                <span className="flex items-center gap-1"><Clock size={12} /> {m.startTime} - {m.endTime}</span>
                                            )}
                                        </div>
                                        {m.description && <p className="text-xs text-purple-600 mt-2">{m.description}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <CalendarIcon size={14} /> Tasks Due ({dayTasks.length})
                        </h3>
                        {dayTasks.length === 0 ? (
                            <p className="text-sm text-gray-500">No tasks due.</p>
                        ) : (
                            <div className="space-y-3">
                                {dayTasks.map((t: any) => (
                                    <div key={t.id} className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                                        <p className="text-sm font-bold text-blue-900">{t.title}</p>
                                        <div className="flex items-center gap-3 mt-1.5 text-xs">
                                            <span className={`px-2 py-0.5 rounded-full font-semibold ${t.status === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {t.status.replace("_", " ")}
                                            </span>
                                            <span className="text-blue-700">{t.priority} Priority</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ScheduleMeetingModal({ onClose, onSave }: any) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        title: "",
        date: "",
        startTime: "",
        endTime: "",
        description: ""
    });

    const handleSubmit = async () => {
        if (!form.title || !form.date || !form.startTime || !form.endTime) {
            setError("Title, Date, Start Time, and End Time are required.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            // 1 & 2. Combine the selected date with the selected start and end times
            const startDateTime = new Date(`${form.date}T${form.startTime}`);
            const endDateTime = new Date(`${form.date}T${form.endTime}`);
            
            // 3. Convert both values into ISO datetime strings using toISOString()
            const startTimeIso = startDateTime.toISOString();
            const endTimeIso = endDateTime.toISOString();

            // 4. Send these ISO strings as startTime and endTime
            const payload: any = {
                title: form.title,
                startTime: startTimeIso,
                endTime: endTimeIso,
            };
            
            if (form.description) {
                payload.description = form.description;
            }

            await onSave(payload);
        } catch (err: any) {
            setError(err.message || "Failed to schedule meeting.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 md:p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Schedule Meeting</h2>
                        <p className="text-sm text-gray-400 mt-0.5">Add a new meeting to your calendar</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-5 md:p-6 space-y-5">
                    {error && (
                        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-600 flex items-center gap-2">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Meeting Title <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                            placeholder="Enter meeting title"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Date <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Start Time</label>
                                <input
                                    type="time"
                                    value={form.startTime}
                                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                                    className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">End Time</label>
                                <input
                                    type="time"
                                    value={form.endTime}
                                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                                    className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none resize-none transition-all"
                            rows={3}
                            placeholder="Add meeting details or links..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 px-5 md:px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="h-11 px-6 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-white transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="h-11 px-8 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-70 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
                    >
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        {saving ? "Scheduling..." : "Schedule Meeting"}
                    </button>
                </div>
            </div>
        </div>
    );
}
