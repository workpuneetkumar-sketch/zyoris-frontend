"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarViewType,
  UnifiedCalendarEvent,
  CalendarDepartment,
  CalendarCategory,
} from "@/types/calendar";
import {
  loadCalendarData,
  saveCalendarEvent,
  deleteCalendarEvent,
  isSameDay,
  formatDateKey,
} from "@/lib/api/calendarService";
import { Meeting } from "@/lib/api/meetingsApi";
import { Task } from "@/lib/api/tasksApi";
import { Call } from "@/lib/api/callsApi";
import { downloadIcsFile } from "@/lib/utils/icsExport";
import CalendarToolbar from "@/components/calendar/CalendarToolbar";
import CalendarSidebarFilters from "@/components/calendar/CalendarSidebarFilters";
import MonthView from "@/components/calendar/MonthView";
import WeekView from "@/components/calendar/WeekView";
import DayView from "@/components/calendar/DayView";
import ScheduleView from "@/components/calendar/ScheduleView";
import DailySummaryPanel from "@/components/calendar/DailySummaryPanel";
import EventModal from "@/components/calendar/EventModal";
import EventDetailsModal from "@/components/calendar/EventDetailsModal";
import { toast } from "react-toastify";
import {
  Loader2,
  AlertCircle,
  CheckSquare,
  Phone,
  X,
  Calendar as CalendarIcon,
  RefreshCw,
} from "lucide-react";

export default function CalendarPage() {
  // Navigation & View State
  const [view, setView] = useState<CalendarViewType>("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Data State
  const [events, setEvents] = useState<UnifiedCalendarEvent[]>([]);
  const [rawMeetings, setRawMeetings] = useState<Meeting[]>([]);
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [rawCalls, setRawCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<CalendarDepartment[]>([
    "personal",
    "company",
    "development",
    "hr",
    "marketing",
    "sales",
    "management",
  ]);
  const [selectedCategories, setSelectedCategories] = useState<CalendarCategory[]>([
    "meeting",
    "call",
    "task",
    "interview",
    "out_of_office",
    "deadline",
    "holiday",
    "event",
  ]);

  // Modal States
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<UnifiedCalendarEvent | null>(null);
  const [slotDate, setSlotDate] = useState<Date>(new Date());
  const [slotHour, setSlotHour] = useState<number>(10);

  const [detailsEvent, setDetailsEvent] = useState<UnifiedCalendarEvent | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

  // Initial Data Fetch
  useEffect(() => {
    fetchCalendar();
  }, []);

  const fetchCalendar = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await loadCalendarData();
      setEvents(res.events);
      setRawMeetings(res.rawMeetings);
      setRawTasks(res.rawTasks);
      setRawCalls(res.rawCalls);
    } catch (err: any) {
      console.error("Failed to load calendar data:", err);
      setError("Failed to load live calendar data. Showing offline schedule.");
      toast.error("Network issue loading calendar. Using cached data.");
    } finally {
      setIsLoading(false);
    }
  };

  // Date Navigation Handlers
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === "month" || view === "schedule") {
        d.setMonth(d.getMonth() - 1);
      } else if (view === "week") {
        d.setDate(d.getDate() - 7);
      } else if (view === "workweek") {
        d.setDate(d.getDate() - 7);
      } else {
        d.setDate(d.getDate() - 1);
      }
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === "month" || view === "schedule") {
        d.setMonth(d.getMonth() + 1);
      } else if (view === "week") {
        d.setDate(d.getDate() + 7);
      } else if (view === "workweek") {
        d.setDate(d.getDate() + 7);
      } else {
        d.setDate(d.getDate() + 1);
      }
      return d;
    });
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // Category filter
      if (evt.category && !selectedCategories.includes(evt.category)) {
        return false;
      }
      // Department / Calendar filter
      if (evt.department && !selectedDepartments.includes(evt.department)) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = evt.title.toLowerCase().includes(q);
        const matchesDesc = (evt.description || "").toLowerCase().includes(q);
        const matchesLocation = (evt.room || evt.location || "").toLowerCase().includes(q);
        const matchesParticipant = (evt.participants || []).some((p) =>
          p.name.toLowerCase().includes(q)
        );
        if (!matchesTitle && !matchesDesc && !matchesLocation && !matchesParticipant) {
          return false;
        }
      }
      return true;
    });
  }, [events, selectedCategories, selectedDepartments, searchQuery]);

  // Event Creation & Edit Handlers
  const handleOpenCreateModal = (date?: Date, hour?: number) => {
    setEditingEvent(null);
    setSlotDate(date || selectedDate || new Date());
    setSlotHour(hour !== undefined ? hour : 10);
    setIsEventModalOpen(true);
  };

  const handleOpenEditModal = (event: UnifiedCalendarEvent) => {
    setEditingEvent(event);
    setDetailsEvent(null);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (
    eventData: Partial<UnifiedCalendarEvent>,
    id?: string | null
  ) => {
    const result = await saveCalendarEvent(eventData, id);
    const saved = result.event;
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });

    if (result.isSynced) {
      toast.success(id ? "Event updated and synced with server" : "Event created and synced with server");
    } else {
      toast.info("Saved locally – waiting for server connection", {
        autoClose: 4500,
      });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteCalendarEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast.info("Event cancelled and removed");
  };

  // Export to .ics
  const handleExportIcs = () => {
    downloadIcsFile(filteredEvents, `zyoris-calendar-${formatDateKey(currentDate)}.ics`);
    toast.success("Calendar exported as iCalendar (.ics) file");
  };

  return (
    <div className="flex flex-col min-h-full p-4 md:p-6 lg:p-8 bg-[#F8FAFC] space-y-6">
      {/* Top Header & Calendar Toolbar */}
      <CalendarToolbar
        view={view}
        onViewChange={setView}
        currentDate={currentDate}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onSelectDate={handleSelectDate}
        onCreateEvent={() => handleOpenCreateModal(selectedDate)}
        onExportIcs={handleExportIcs}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalEventsCount={filteredEvents.length}
      />

      {/* Main Content Area */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Optional Collapsible Filter Sidebar */}
        {isFilterOpen && (
          <div className="w-full xl:w-64 shrink-0">
            <CalendarSidebarFilters
              selectedDepartments={selectedDepartments}
              onChangeDepartments={setSelectedDepartments}
              selectedCategories={selectedCategories}
              onChangeCategories={setSelectedCategories}
              onResetFilters={() => {
                setSelectedDepartments([
                  "personal",
                  "company",
                  "development",
                  "hr",
                  "marketing",
                  "sales",
                  "management",
                ]);
                setSelectedCategories([
                  "meeting",
                  "call",
                  "task",
                  "interview",
                  "out_of_office",
                  "deadline",
                  "holiday",
                  "event",
                ]);
                setSearchQuery("");
              }}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>
        )}

        {/* Calendar View Container */}
        <div className="flex-1 w-full min-w-0 flex flex-col">
          {isLoading && events.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center min-h-[480px] p-8">
              <Loader2 className="w-9 h-9 animate-spin text-blue-600 mb-3" />
              <p className="text-slate-800 font-bold text-sm">Loading your schedule...</p>
              <p className="text-slate-400 text-xs mt-1">
                Synchronizing meetings, calls & tasks with Zyoris intelligence layer
              </p>
            </div>
          ) : error && events.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center min-h-[480px] p-8">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
              <p className="text-slate-900 font-bold text-base mb-1">{error}</p>
              <button
                type="button"
                onClick={fetchCalendar}
                className="mt-3 px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-1.5"
              >
                <RefreshCw size={13} />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : (
            <>
              {/* Month View */}
              {view === "month" && (
                <MonthView
                  currentDate={currentDate}
                  selectedDate={selectedDate}
                  events={filteredEvents}
                  onSelectDate={handleSelectDate}
                  onSelectEvent={(evt) => setDetailsEvent(evt)}
                  onCreateEventForDate={(date) => handleOpenCreateModal(date)}
                />
              )}

              {/* Week View */}
              {view === "week" && (
                <WeekView
                  currentDate={currentDate}
                  selectedDate={selectedDate}
                  events={filteredEvents}
                  isWorkweek={false}
                  onSelectDate={handleSelectDate}
                  onSelectEvent={(evt) => setDetailsEvent(evt)}
                  onCreateEventSlot={(date, hour) => handleOpenCreateModal(date, hour)}
                />
              )}

              {/* Workweek View */}
              {view === "workweek" && (
                <WeekView
                  currentDate={currentDate}
                  selectedDate={selectedDate}
                  events={filteredEvents}
                  isWorkweek={true}
                  onSelectDate={handleSelectDate}
                  onSelectEvent={(evt) => setDetailsEvent(evt)}
                  onCreateEventSlot={(date, hour) => handleOpenCreateModal(date, hour)}
                />
              )}

              {/* Day View */}
              {view === "day" && (
                <DayView
                  currentDate={currentDate}
                  events={filteredEvents}
                  onSelectEvent={(evt) => setDetailsEvent(evt)}
                  onCreateEventSlot={(date, hour) => handleOpenCreateModal(date, hour)}
                  onPrevDay={handlePrev}
                  onNextDay={handleNext}
                  onToday={handleToday}
                />
              )}

              {/* Schedule / Agenda View */}
              {view === "schedule" && (
                <ScheduleView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onSelectEvent={(evt) => setDetailsEvent(evt)}
                  onCreateEvent={() => handleOpenCreateModal(selectedDate)}
                />
              )}
            </>
          )}
        </div>

        {/* Right Daily Summary Panel */}
        <DailySummaryPanel
          selectedDate={selectedDate}
          events={filteredEvents}
          rawMeetings={rawMeetings}
          rawCalls={rawCalls}
          rawTasks={rawTasks}
          onOpenCreate={(date) => handleOpenCreateModal(date)}
          onSelectEvent={(evt) => setDetailsEvent(evt)}
          onSelectMeeting={(m) => {
            const unified = events.find((e) => e.id === m.id);
            if (unified) setDetailsEvent(unified);
          }}
          onSelectCall={(c) => setSelectedCall(c)}
          onSelectTask={(t) => setSelectedTask(t)}
        />
      </div>

      {/* Create / Edit Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        initialEvent={editingEvent}
        initialDate={slotDate}
        initialHour={slotHour}
      />

      {/* Event Details View Modal */}
      <EventDetailsModal
        event={detailsEvent}
        onClose={() => setDetailsEvent(null)}
        onEdit={(evt) => handleOpenEditModal(evt)}
        onDelete={handleDeleteEvent}
      />

      {/* Task Details Modal (Preserved from existing application) */}
      {selectedTask && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50/70">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare size={18} className="text-blue-600" /> Task Details
              </h2>
              <button
                type="button"
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
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-5 py-2 bg-white border border-gray-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Details Modal (Preserved from existing application) */}
      {selectedCall && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50/70">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Phone size={18} className="text-emerald-600" /> Call Details
              </h2>
              <button
                type="button"
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
                type="button"
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