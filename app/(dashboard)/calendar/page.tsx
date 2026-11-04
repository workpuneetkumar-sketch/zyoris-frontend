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
  formatDateKey,
  navigateCalendarDate,
  expandRecurringEvents,
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
import EventModal from "@/components/calendar/EventModal";
import EventDetailsModal from "@/components/calendar/EventDetailsModal";
import { toast } from "react-toastify";
import {
  Loader2,
  AlertCircle,
  CheckSquare,
  Phone,
  X,
  RefreshCw,
  Plus,
  CloudOff,
} from "lucide-react";

const ALL_DEPARTMENTS: CalendarDepartment[] = [
  "personal",
  "company",
  "development",
  "hr",
  "marketing",
  "sales",
  "management",
];

const ALL_CATEGORIES: CalendarCategory[] = [
  "meeting",
  "call",
  "task",
  "interview",
  "out_of_office",
  "deadline",
  "holiday",
  "event",
];

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
  const [isCached, setIsCached] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Sidebar & Filter State
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartments, setSelectedDepartments] =
    useState<CalendarDepartment[]>(ALL_DEPARTMENTS);
  const [selectedCategories, setSelectedCategories] =
    useState<CalendarCategory[]>(ALL_CATEGORIES);

  // Modal States
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] =
    useState<UnifiedCalendarEvent | null>(null);
  const [slotDate, setSlotDate] = useState<Date>(new Date());
  const [slotHour, setSlotHour] = useState<number>(10);

  const [detailsEvent, setDetailsEvent] =
    useState<UnifiedCalendarEvent | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

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
      setIsCached(res.isCached);
      setIsOffline(res.isOffline);
    } catch (err: any) {
      console.error("Failed to load calendar data:", err);
      setError("Failed to load live calendar data. Showing offline schedule.");
      setIsOffline(true);
      toast.error("Network issue loading calendar. Using cached data.");
    } finally {
      setIsLoading(false);
    }
  };

  // Clamped Date Navigation Handlers (fixes Jan 31 -> Mar 3 bug)
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const nextDate = navigateCalendarDate(prev, view, -1);
      setSelectedDate(nextDate);
      return nextDate;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const nextDate = navigateCalendarDate(prev, view, 1);
      setSelectedDate(nextDate);
      return nextDate;
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

  // Expand recurring events across the visible window & filter
  const expandedEvents = useMemo(() => {
    const rangeStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 3,
      1
    );
    const rangeEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 6,
      0
    );
    return expandRecurringEvents(events, rangeStart, rangeEnd);
  }, [events, currentDate]);

  const filteredEvents = useMemo(() => {
    return expandedEvents.filter((evt) => {
      if (evt.category && !selectedCategories.includes(evt.category)) {
        return false;
      }
      if (evt.department && !selectedDepartments.includes(evt.department)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = evt.title.toLowerCase().includes(q);
        const matchesDesc = (evt.description || "").toLowerCase().includes(q);
        const matchesLocation = (evt.room || evt.location || "")
          .toLowerCase()
          .includes(q);
        const matchesParticipant = (evt.participants || []).some(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.email || "").toLowerCase().includes(q)
        );
        if (
          !matchesTitle &&
          !matchesDesc &&
          !matchesLocation &&
          !matchesParticipant
        ) {
          return false;
        }
      }
      return true;
    });
  }, [expandedEvents, selectedCategories, selectedDepartments, searchQuery]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedDepartments.length < ALL_DEPARTMENTS.length) count += 1;
    if (selectedCategories.length < ALL_CATEGORIES.length) count += 1;
    if (searchQuery.trim()) count += 1;
    return count;
  }, [selectedDepartments, selectedCategories, searchQuery]);

  const handleResetFilters = () => {
    setSelectedDepartments([...ALL_DEPARTMENTS]);
    setSelectedCategories([...ALL_CATEGORIES]);
    setSearchQuery("");
  };

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      setIsMobileDrawerOpen((prev) => !prev);
    } else {
      setIsDesktopSidebarOpen((prev) => !prev);
    }
  };

  // Event Creation & Edit Handlers
  const handleOpenCreateModal = (date?: Date, hour?: number) => {
    setEditingEvent(null);
    setSlotDate(date || selectedDate || new Date());
    setSlotHour(hour !== undefined ? hour : 10);
    setIsEventModalOpen(true);
  };

  const handleOpenEditModal = (event: UnifiedCalendarEvent) => {
    const masterId = event.masterEventId || event.id;
    const masterEvent = events.find((e) => e.id === masterId) || event;
    setEditingEvent(masterEvent);
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
      toast.success(
        id
          ? "Event updated and synced with server"
          : "Event created and synced with server"
      );
    } else {
      toast.info("Saved locally – waiting for server connection", {
        autoClose: 4500,
      });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const masterId = id.includes("__rec_") ? id.split("__rec_")[0] : id;
    await deleteCalendarEvent(masterId);
    setEvents((prev) =>
      prev.filter((e) => e.id !== masterId && e.masterEventId !== masterId)
    );
    toast.info("Event removed from calendar");
  };

  const handleUpdateRsvp = async (
    eventId: string,
    participantIndex: number,
    rsvp: "attending" | "tentative" | "declined"
  ) => {
    const masterId = eventId.includes("__rec_")
      ? eventId.split("__rec_")[0]
      : eventId;
    const target = events.find((e) => e.id === masterId);
    if (!target || !target.participants) return;

    const updatedParticipants = target.participants.map((p, idx) =>
      idx === participantIndex ? { ...p, rsvp } : p
    );

    const result = await saveCalendarEvent(
      { ...target, participants: updatedParticipants },
      masterId
    );
    setEvents((prev) =>
      prev.map((e) => (e.id === masterId ? result.event : e))
    );
    setDetailsEvent((prev) =>
      prev ? { ...prev, participants: updatedParticipants } : null
    );
  };

  const handleExportIcs = () => {
    downloadIcsFile(
      filteredEvents,
      `zyoris-calendar-${formatDateKey(currentDate)}.ics`
    );
    toast.success("Calendar exported as iCalendar (.ics) file");
  };

  return (
    <div className="flex flex-col min-h-full p-0 sm:p-2 xl:p-6 bg-[#F4F6F8]">
      {/* Unified White Calendar Workspace */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden flex-1 flex flex-col min-h-[720px] xl:min-h-[760px]">
        {/* Compact Calendar Navigation Header */}
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
          isFilterOpen={isMobileDrawerOpen}
          onToggleFilter={handleToggleSidebar}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalEventsCount={filteredEvents.length}
          activeFilterCount={activeFilterCount}
        />

        {/* Subtle Cached / Offline Status Bar */}
        {(isOffline || isCached) && !isLoading && (
          <div className="px-4 py-1.5 bg-amber-50/80 border-b border-amber-200/70 flex items-center justify-between gap-2 text-[11px] text-amber-900">
            <div className="flex items-center gap-2">
              <CloudOff size={13} className="text-amber-600 shrink-0" />
              <span>
                {isOffline
                  ? "Offline mode — displaying locally saved schedule. Changes will persist in browser storage."
                  : "Showing cached calendar data alongside live updates."}
              </span>
            </div>
            <button
              type="button"
              onClick={fetchCalendar}
              className="font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 shrink-0"
            >
              <RefreshCw size={11} />
              <span>Sync Now</span>
            </button>
          </div>
        )}

        {/* Workspace Split: Left Sidebar + Main Calendar Canvas */}
        <div className="flex-1 flex min-h-0 relative">
          {/* Desktop Integrated Left Sidebar (xl: 1280px+ including 1440×900) */}
          {isDesktopSidebarOpen && (
            <div className="hidden xl:flex w-[276px] shrink-0 border-r border-[#E2E8F0] flex-col bg-white">
              <CalendarSidebarFilters
                selectedDepartments={selectedDepartments}
                onChangeDepartments={setSelectedDepartments}
                selectedCategories={selectedCategories}
                onChangeCategories={setSelectedCategories}
                onResetFilters={handleResetFilters}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                events={filteredEvents}
                rawMeetings={rawMeetings}
                rawCalls={rawCalls}
                rawTasks={rawTasks}
                onOpenCreate={(date) => handleOpenCreateModal(date)}
                onSelectEvent={(evt) => setDetailsEvent(evt)}
                onEditEvent={(evt) => handleOpenEditModal(evt)}
                onSelectMeeting={(m) => {
                  const unified = filteredEvents.find(
                    (e) => e.id === m.id || e.masterEventId === m.id
                  );
                  if (unified) setDetailsEvent(unified);
                }}
                onSelectCall={(c) => setSelectedCall(c)}
                onSelectTask={(t) => setSelectedTask(t)}
              />
            </div>
          )}

          {/* Mobile & Tablet Slide-Over Sidebar Drawer (< xl, including 1024×768, 390×844, 375×812) */}
          {isMobileDrawerOpen && (
            <div className="fixed inset-0 z-[10000] flex xl:hidden">
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-xs"
                onClick={() => setIsMobileDrawerOpen(false)}
              />
              <div className="relative z-10 w-[290px] max-w-[85vw] h-full bg-white shadow-2xl border-r border-[#E2E8F0] flex flex-col">
                <CalendarSidebarFilters
                  selectedDepartments={selectedDepartments}
                  onChangeDepartments={setSelectedDepartments}
                  selectedCategories={selectedCategories}
                  onChangeCategories={setSelectedCategories}
                  onResetFilters={handleResetFilters}
                  onClose={() => setIsMobileDrawerOpen(false)}
                  selectedDate={selectedDate}
                  onSelectDate={(d) => {
                    handleSelectDate(d);
                    setIsMobileDrawerOpen(false);
                  }}
                  events={filteredEvents}
                  rawMeetings={rawMeetings}
                  rawCalls={rawCalls}
                  rawTasks={rawTasks}
                  onOpenCreate={(date) => {
                    setIsMobileDrawerOpen(false);
                    handleOpenCreateModal(date);
                  }}
                  onSelectEvent={(evt) => {
                    setIsMobileDrawerOpen(false);
                    setDetailsEvent(evt);
                  }}
                  onEditEvent={(evt) => {
                    setIsMobileDrawerOpen(false);
                    handleOpenEditModal(evt);
                  }}
                  onSelectMeeting={(m) => {
                    setIsMobileDrawerOpen(false);
                    const unified = filteredEvents.find(
                      (e) => e.id === m.id || e.masterEventId === m.id
                    );
                    if (unified) setDetailsEvent(unified);
                  }}
                  onSelectCall={(c) => {
                    setIsMobileDrawerOpen(false);
                    setSelectedCall(c);
                  }}
                  onSelectTask={(t) => {
                    setIsMobileDrawerOpen(false);
                    setSelectedTask(t);
                  }}
                />
              </div>
            </div>
          )}

          {/* Main Calendar View Surface */}
          <main className="flex-1 min-w-0 flex flex-col bg-white">
            {isLoading && events.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[520px] p-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF5630] mb-3" />
                <p className="text-[#212B36] font-bold text-sm">
                  Loading your schedule...
                </p>
                <p className="text-[#919EAB] text-xs mt-1">
                  Synchronizing meetings, calls & tasks
                </p>
              </div>
            ) : error && events.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[520px] p-8">
                <AlertCircle className="w-10 h-10 text-[#FF5630] mb-3" />
                <p className="text-[#212B36] font-bold text-base mb-1">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={fetchCalendar}
                  className="mt-3 px-4 py-2 bg-[#1C252E] text-white rounded-xl text-xs font-semibold hover:bg-[#28323D] transition-all flex items-center gap-1.5"
                >
                  <RefreshCw size={13} />
                  <span>Retry Connection</span>
                </button>
              </div>
            ) : (
              <>
                {view === "month" && (
                  <MonthView
                    currentDate={currentDate}
                    selectedDate={selectedDate}
                    events={filteredEvents}
                    onSelectDate={handleSelectDate}
                    onSelectEvent={(evt) => setDetailsEvent(evt)}
                    onCreateEventForDate={(date) => handleOpenCreateModal(date)}
                    onSwitchToDayView={(date) => {
                      handleSelectDate(date);
                      setView("day");
                    }}
                  />
                )}

                {view === "week" && (
                  <WeekView
                    currentDate={currentDate}
                    selectedDate={selectedDate}
                    events={filteredEvents}
                    isWorkweek={false}
                    onSelectDate={handleSelectDate}
                    onSelectEvent={(evt) => setDetailsEvent(evt)}
                    onCreateEventSlot={(date, hour) =>
                      handleOpenCreateModal(date, hour)
                    }
                  />
                )}

                {view === "workweek" && (
                  <WeekView
                    currentDate={currentDate}
                    selectedDate={selectedDate}
                    events={filteredEvents}
                    isWorkweek={true}
                    onSelectDate={handleSelectDate}
                    onSelectEvent={(evt) => setDetailsEvent(evt)}
                    onCreateEventSlot={(date, hour) =>
                      handleOpenCreateModal(date, hour)
                    }
                  />
                )}

                {view === "day" && (
                  <DayView
                    currentDate={currentDate}
                    events={filteredEvents}
                    onSelectDate={handleSelectDate}
                    onSelectEvent={(evt) => setDetailsEvent(evt)}
                    onCreateEventSlot={(date, hour) =>
                      handleOpenCreateModal(date, hour)
                    }
                  />
                )}

                {view === "schedule" && (
                  <ScheduleView
                    currentDate={currentDate}
                    events={filteredEvents}
                    selectedDate={selectedDate}
                    onSelectEvent={(evt) => setDetailsEvent(evt)}
                    onCreateEvent={() => handleOpenCreateModal(selectedDate)}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Coral-Red Floating Action Button (positioned cleanly above ZII assistant FAB) */}
      <button
        type="button"
        onClick={() => handleOpenCreateModal(selectedDate)}
        className="calendar-create-fab fixed bottom-24 right-6 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#FF5630] hover:bg-[#FF4842] text-white shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center"
        title="Create New Event"
        aria-label="Create New Event"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {/* Dark Navy Event Creation & Editing Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        initialEvent={editingEvent}
        initialDate={slotDate}
        initialHour={slotHour}
      />

      {/* Event Details Modal */}
      <EventDetailsModal
        event={detailsEvent}
        onClose={() => setDetailsEvent(null)}
        onEdit={(evt) => handleOpenEditModal(evt)}
        onDelete={handleDeleteEvent}
        onUpdateRsvp={handleUpdateRsvp}
      />

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F3F5]">
              <h2 className="text-base font-bold text-[#212B36] flex items-center gap-2">
                <CheckSquare size={18} className="text-[#2CA58D]" /> Task Details
              </h2>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="text-[#919EAB] hover:text-[#212B36]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-bold text-lg text-[#212B36]">
                  {selectedTask.title}
                </h3>
                {selectedTask.description && (
                  <p className="text-xs text-[#637381] mt-1.5 whitespace-pre-wrap">
                    {selectedTask.description}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#F1F3F5]">
                <div className="bg-[#F4F6F8] p-2.5 rounded-xl">
                  <span className="text-[10px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                    Status
                  </span>
                  <span className="text-xs font-bold text-[#212B36]">
                    {selectedTask.status}
                  </span>
                </div>
                <div className="bg-[#F4F6F8] p-2.5 rounded-xl">
                  <span className="text-[10px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                    Priority
                  </span>
                  <span className="text-xs font-bold text-[#212B36]">
                    {selectedTask.priority}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#F4F6F8] border-t border-[#E2E8F0] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const taskId = `task-${selectedTask.id}`;
                  const unified = events.find((e) => e.id === taskId);
                  setSelectedTask(null);
                  if (unified) handleOpenEditModal(unified);
                }}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#212B36] rounded-xl text-xs font-semibold hover:bg-[#F4F6F8]"
              >
                Edit Task
              </button>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-5 py-2 bg-[#1C252E] text-white rounded-xl text-xs font-semibold hover:bg-[#28323D] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Details Modal */}
      {selectedCall && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F3F5]">
              <h2 className="text-base font-bold text-[#212B36] flex items-center gap-2">
                <Phone size={18} className="text-[#E85D5D]" /> Call Details
              </h2>
              <button
                type="button"
                onClick={() => setSelectedCall(null)}
                className="text-[#919EAB] hover:text-[#212B36]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-bold text-lg text-[#212B36]">
                  {selectedCall.contactName || "Call Log"}
                </h3>
                {selectedCall.notes && (
                  <p className="text-xs text-[#637381] mt-1.5 whitespace-pre-wrap">
                    {selectedCall.notes}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#F1F3F5]">
                <div className="bg-[#F4F6F8] p-2.5 rounded-xl">
                  <span className="text-[10px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                    Outcome
                  </span>
                  <span className="text-xs font-bold text-[#212B36]">
                    {selectedCall.outcome}
                  </span>
                </div>
                <div className="bg-[#F4F6F8] p-2.5 rounded-xl">
                  <span className="text-[10px] font-bold text-[#919EAB] uppercase tracking-wider block mb-0.5">
                    Duration
                  </span>
                  <span className="text-xs font-bold text-[#212B36]">
                    {selectedCall.duration} mins
                  </span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#F4F6F8] border-t border-[#E2E8F0] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCall(null)}
                className="px-5 py-2 bg-[#1C252E] text-white rounded-xl text-xs font-semibold hover:bg-[#28323D] transition-all"
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
