"use client";

import React, { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock } from "lucide-react";
import { fetchTasks, Task } from "@/lib/api/tasksApi";
import { getMeetings, createMeeting, updateMeeting, Meeting } from "@/lib/api/meetingsApi";
import { toast } from "react-toastify";

export default function CalendarPage() {
    const [view, setView] = useState<"month" | "week">("month");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState<Task[]>([]);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [tasksRes, meetingsRes] = await Promise.all([
                fetchTasks(),
                getMeetings()
            ]);
            setTasks(tasksRes.tasks || []);
            setMeetings(meetingsRes || []);
        } catch (error) {
            console.error("Failed to load calendar data:", error);
            toast.error("Failed to load calendar data");
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
            else newDate.setDate(newDate.getDate() - 7);
            return newDate;
        });
    };

    const nextPeriod = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (view === "month") newDate.setMonth(newDate.getMonth() + 1);
            else newDate.setDate(newDate.getDate() + 7);
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
        return { dayTasks, dayMeetings };
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

    const days = view === "month" ? getDaysInMonth(currentDate) : getDaysInWeek(currentDate);

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] p-4 md:p-6 bg-gray-50/50">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your schedule, tasks, and meetings</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                        <button
                            onClick={() => setView("month")}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === "month" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
                        >
                            Month
                        </button>
                        <button
                            onClick={() => setView("week")}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === "week" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
                        >
                            Week
                        </button>
                    </div>
                    <button
                        onClick={() => { setEditingMeeting(null); setIsModalOpen(true); }}
                        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm w-full md:w-auto"
                    >
                        <Plus size={18} /> Schedule Meeting
                    </button>
                </div>
            </div>

            {/* Calendar Controls */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100 gap-4">
                    <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto justify-between sm:justify-start">
                        <button onClick={prevPeriod} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ChevronLeft size={20} /></button>
                        <h2 className="text-base md:text-lg font-semibold text-gray-900 min-w-[140px] md:min-w-[160px] text-center">
                            {view === "week" ? "Week of " : ""}{formatMonthYear(currentDate)}
                        </h2>
                        <button onClick={nextPeriod} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ChevronRight size={20} /></button>
                    </div>
                    <button onClick={() => setCurrentDate(new Date())} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors px-3 py-1.5 hover:bg-blue-50 rounded-lg w-full sm:w-auto border sm:border-none border-gray-200">Today</button>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="grid grid-cols-7 border-b border-gray-100 shrink-0">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                            <div key={day} className="py-2 md:py-3 text-center text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className={`flex-1 grid grid-cols-7 ${view === "month" ? "grid-rows-6" : "grid-rows-1"} overflow-y-auto`}>
                        {days.map((date, i) => {
                            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                            const isToday = isSameDay(date, new Date());
                            const { dayTasks, dayMeetings } = getItemsForDay(date);

                            return (
                                <div 
                                    key={i} 
                                    className={`min-h-[80px] md:min-h-[100px] border-r border-b border-gray-100 p-1 md:p-2 cursor-pointer transition-colors ${!isCurrentMonth && view === "month" ? "bg-gray-50" : "bg-white hover:bg-gray-50"}`}
                                    onClick={() => setSelectedDate(date)}
                                >
                                    <div className="flex justify-between items-start mb-1 md:mb-2">
                                        <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm ${isToday ? "bg-blue-600 text-white font-medium shadow-sm" : !isCurrentMonth && view === "month" ? "text-gray-400" : "text-gray-700 font-medium"}`}>
                                            {date.getDate()}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[60px] md:max-h-[80px] no-scrollbar">
                                        {dayMeetings.map(m => (
                                            <div key={m.id} className="truncate text-[10px] md:text-xs px-1 md:px-2 py-0.5 md:py-1 rounded bg-purple-50 text-purple-700 border border-purple-100 font-medium">
                                                {formatTime(m.startTime)} {m.title}
                                            </div>
                                        ))}
                                        {dayTasks.map(t => (
                                            <div key={t.id} className="truncate text-[10px] md:text-xs px-1 md:px-2 py-0.5 md:py-1 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                                {t.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Selected Date Drawer/Details */}
            {selectedDate && (
                <div className="fixed inset-0 z-50 bg-white overflow-y-auto p-4 md:static md:mt-6 md:rounded-2xl md:shadow-sm md:border md:border-gray-100 md:p-6 md:z-auto">
                    <div className="md:hidden flex items-center mb-6">
                        <button onClick={() => setSelectedDate(null)} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                            <ChevronLeft size={18} /> Back to Calendar
                        </button>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <CalendarIcon size={20} className="text-blue-600" />
                        Schedule for {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Meetings</h4>
                            <div className="space-y-2">
                                {getItemsForDay(selectedDate).dayMeetings.length > 0 ? getItemsForDay(selectedDate).dayMeetings.map(m => (
                                    <div key={m.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <p className="font-medium text-gray-900 line-clamp-1">{m.title}</p>
                                            <button 
                                                onClick={() => {
                                                    setEditingMeeting(m);
                                                    setIsModalOpen(true);
                                                }} 
                                                className="text-[11px] uppercase tracking-wider text-blue-600 hover:text-blue-700 font-bold px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded shrink-0 ml-2 transition-colors"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 flex items-center gap-1.5"><Clock size={12}/> {formatTime(m.startTime)} - {formatTime(m.endTime)}</p>
                                    </div>
                                )) : <p className="text-sm text-gray-400">No meetings scheduled.</p>}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Tasks Due</h4>
                            <div className="space-y-2">
                                {getItemsForDay(selectedDate).dayTasks.length > 0 ? getItemsForDay(selectedDate).dayTasks.map(t => (
                                    <div key={t.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <p className="font-medium text-gray-900">{t.title}</p>
                                        <p className="text-xs text-gray-500 mt-1">Priority: {t.priority}</p>
                                    </div>
                                )) : <p className="text-sm text-gray-400">No tasks due.</p>}
                            </div>
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