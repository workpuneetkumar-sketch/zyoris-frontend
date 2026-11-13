"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  UnifiedCalendarEvent,
  CalendarDepartment,
  CalendarCategory,
  RecurrenceType,
  PrivacyLevel,
  CalendarParticipant,
  EventColorKey,
} from "@/types/calendar";
import {
  EVENT_COLOR_PRESETS,
  PASTEL_CATEGORY_TOKENS,
  getCategoryToken,
} from "./calendarTheme";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  Users,
  Repeat,
  Bell,
  Lock,
  Trash2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Building,
  Check,
  Palette,
} from "lucide-react";
import {
  formatDateKey,
  calculateDuration,
  parseTimeMinutes,
  formatTimeDisplay,
} from "@/lib/api/calendarService";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    eventData: Partial<UnifiedCalendarEvent>,
    id?: string | null
  ) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialEvent?: UnifiedCalendarEvent | null;
  initialDate?: Date;
  initialHour?: number;
}

const DEPARTMENTS: { id: CalendarDepartment; label: string }[] = [
  { id: "personal", label: "Personal Calendar" },
  { id: "company", label: "Company-Wide" },
  { id: "development", label: "Development" },
  { id: "hr", label: "HR & Recruitment" },
  { id: "marketing", label: "Marketing" },
  { id: "sales", label: "Sales & Clients" },
  { id: "management", label: "Management" },
];

const CATEGORIES: { id: CalendarCategory; label: string; defaultColor: EventColorKey }[] = [
  { id: "meeting", label: "Meeting", defaultColor: "meetings" },
  { id: "interview", label: "Interview", defaultColor: "personal" },
  { id: "call", label: "Call", defaultColor: "important" },
  { id: "task", label: "Task", defaultColor: "meetings" },
  { id: "deadline", label: "Deadline / Design", defaultColor: "design" },
  { id: "out_of_office", label: "Out of Office", defaultColor: "development" },
  { id: "holiday", label: "Holiday", defaultColor: "design" },
];

const COLOR_SWATCHES: { key: EventColorKey; label: string }[] = [
  { key: "development", label: "Development Blue" },
  { key: "design", label: "Design Peach" },
  { key: "meetings", label: "Meetings Mint" },
  { key: "personal", label: "Personal Lavender" },
  { key: "important", label: "Important Rose" },
];

const ROOMS = [
  "Conference Room 1",
  "Conference Room 2",
  "Board Room",
  "Interview Room",
  "Executive Suite",
];

// Full 24-hour time options in 30-minute increments
const FULL_24H_TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, idx) => {
  const h = Math.floor(idx / 2);
  const m = idx % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export default function EventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialEvent,
  initialDate,
  initialHour,
}: EventModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [department, setDepartment] =
    useState<CalendarDepartment>("development");
  const [category, setCategory] = useState<CalendarCategory>("meeting");
  const [customColor, setCustomColor] = useState<EventColorKey>("meetings");
  const [room, setRoom] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [provider, setProvider] = useState<string>("google_meet");
  const [meetingLink, setMeetingLink] = useState("");
  const [description, setDescription] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
  const [reminder, setReminder] = useState("15m");
  const [privacy, setPrivacy] = useState<PrivacyLevel>("internal");

  const [participants, setParticipants] = useState<CalendarParticipant[]>([]);
  const [newParticipantInput, setNewParticipantInput] = useState("");

  // Radial clock dial state
  const [activeDialTarget, setActiveDialTarget] = useState<"start" | "end">(
    "start"
  );
  const [showDial, setShowDial] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title || "");
      setDate(initialEvent.date || formatDateKey(new Date()));
      setAllDay(Boolean(initialEvent.allDay));
      setStartTime(initialEvent.startTime || "10:00");
      setEndTime(initialEvent.endTime || "11:00");
      setDepartment(initialEvent.department || "development");
      setCategory(initialEvent.category || "meeting");
      setCustomColor(
        (initialEvent.customColor as EventColorKey) ||
          CATEGORIES.find((c) => c.id === initialEvent.category)?.defaultColor ||
          "meetings"
      );
      setRoom(initialEvent.room || "");
      setCustomLocation(
        initialEvent.location && initialEvent.location !== initialEvent.room
          ? initialEvent.location
          : ""
      );
      setProvider(initialEvent.provider || "google_meet");
      setMeetingLink(initialEvent.meetingLink || "");
      setDescription(initialEvent.description || "");
      setRecurrence(initialEvent.recurrence || "none");
      setReminder(initialEvent.reminder || "15m");
      setPrivacy(initialEvent.privacy || "internal");
      setParticipants(initialEvent.participants || []);
    } else {
      const defaultDate = initialDate
        ? formatDateKey(initialDate)
        : formatDateKey(new Date());
      const defaultHour =
        initialHour !== undefined ? Math.min(22, Math.max(0, initialHour)) : 10;
      const startStr = `${String(defaultHour).padStart(2, "0")}:00`;
      const endStr = `${String(Math.min(23, defaultHour + 1)).padStart(
        2,
        "0"
      )}:00`;

      setTitle("");
      setDate(defaultDate);
      setAllDay(false);
      setStartTime(startStr);
      setEndTime(endStr);
      setDepartment("development");
      setCategory("meeting");
      setCustomColor("meetings");
      setRoom("");
      setCustomLocation("");
      setProvider("google_meet");
      setMeetingLink("");
      setDescription("");
      setRecurrence("none");
      setReminder("15m");
      setPrivacy("internal");
      setParticipants([]);
    }
    setError(null);
  }, [initialEvent, initialDate, initialHour, isOpen]);

  const activeToken = useMemo(
    () => getCategoryToken(category, customColor),
    [category, customColor]
  );

  if (!isOpen) return null;

  const durationText = allDay
    ? "All Day"
    : calculateDuration(startTime, endTime);

  const handleCategorySelect = (cat: CalendarCategory) => {
    setCategory(cat);
    const defaultPreset = CATEGORIES.find((c) => c.id === cat)?.defaultColor;
    if (defaultPreset) {
      setCustomColor(defaultPreset);
    }
  };

  // Interactive Radial Clock Hour Selection
  const targetTimeStr = activeDialTarget === "start" ? startTime : endTime;
  const targetMinutes = parseTimeMinutes(targetTimeStr);
  const currentHour24 = Math.floor(targetMinutes / 60);
  const currentMinPart = targetMinutes % 60;
  const isPM = currentHour24 >= 12;

  const handleClockHourClick = (hour12: number) => {
    const newHour24 = isPM
      ? hour12 === 12
        ? 12
        : hour12 + 12
      : hour12 === 12
      ? 0
      : hour12;
    const formatted = `${String(newHour24).padStart(2, "0")}:${String(
      currentMinPart
    ).padStart(2, "0")}`;

    if (activeDialTarget === "start") {
      setStartTime(formatted);
      const newStartMin = newHour24 * 60 + currentMinPart;
      const curEndMin = parseTimeMinutes(endTime);
      if (curEndMin <= newStartMin) {
        const autoEndMin = Math.min(23 * 60 + 59, newStartMin + 60);
        const eh = Math.floor(autoEndMin / 60);
        const em = autoEndMin % 60;
        setEndTime(
          `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`
        );
      }
    } else {
      setEndTime(formatted);
    }
  };

  const toggleAmPm = (wantPm: boolean) => {
    let h = currentHour24;
    if (wantPm && h < 12) h += 12;
    if (!wantPm && h >= 12) h -= 12;
    const formatted = `${String(h).padStart(2, "0")}:${String(
      currentMinPart
    ).padStart(2, "0")}`;
    if (activeDialTarget === "start") {
      setStartTime(formatted);
    } else {
      setEndTime(formatted);
    }
  };

  const handleAddParticipant = () => {
    const trimmed = newParticipantInput.trim();
    if (!trimmed) return;
    const isEmail = trimmed.includes("@");
    const newP: CalendarParticipant = {
      name: isEmail ? trimmed.split("@")[0] : trimmed,
      email: isEmail ? trimmed : undefined,
      rsvp: "attending",
    };
    setParticipants([...participants, newP]);
    setNewParticipantInput("");
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide an event title");
      return;
    }
    if (!date) {
      setError("Please select an event date");
      return;
    }

    if (!allDay) {
      const startMin = parseTimeMinutes(startTime);
      const endMin = parseTimeMinutes(endTime);
      if (endMin <= startMin) {
        setError("End time must be after start time");
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const resolvedLocation = customLocation.trim() || room || undefined;
      const payload: Partial<UnifiedCalendarEvent> = {
        title: title.trim(),
        date,
        allDay,
        startTime: allDay ? "00:00" : startTime,
        endTime: allDay ? "23:59" : endTime,
        department,
        category,
        customColor,
        room: room || undefined,
        location: resolvedLocation,
        provider,
        meetingLink: meetingLink.trim() || undefined,
        description: description.trim() || undefined,
        recurrence,
        reminder,
        privacy,
        participants,
      };

      const targetId = initialEvent
        ? initialEvent.masterEventId || initialEvent.id
        : null;
      await onSave(payload, targetId);
      onClose();
    } catch (err: any) {
      console.error("Save event failed:", err);
      setError(err?.message || "Failed to save event. Please check inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const targetId = initialEvent?.masterEventId || initialEvent?.id;
    if (!targetId || !onDelete) return;
    if (!confirm("Are you sure you want to delete this event?")) return;

    setIsDeleting(true);
    try {
      await onDelete(targetId);
      onClose();
    } catch (err: any) {
      console.error("Delete event failed:", err);
      setError(err?.message || "Failed to delete event.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute SVG arc for the circular time-picker visualization
  const startMin = parseTimeMinutes(startTime);
  const endMin = parseTimeMinutes(endTime);
  const startAngleDeg = ((startMin % 720) / 720) * 360 - 90;
  const endAngleDeg = ((endMin % 720) / 720) * 360 - 90;
  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const dialRadius = 68;
  const dialCenter = 90;
  const startPt = polarToCartesian(dialCenter, dialCenter, dialRadius, startAngleDeg);
  const endPt = polarToCartesian(dialCenter, dialCenter, dialRadius, endAngleDeg);
  const diffMinutes = Math.max(15, endMin - startMin);
  const largeArcFlag = diffMinutes > 360 ? 1 : 0;
  const arcPath = `M ${startPt.x} ${startPt.y} A ${dialRadius} ${dialRadius} 0 ${largeArcFlag} 1 ${endPt.x} ${endPt.y}`;

  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#1C252E] text-white w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[92vh] sm:rounded-2xl shadow-2xl border border-[#28323D] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#28323D] bg-[#161C24]">
          <div className="flex items-center gap-3">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0 ring-4 ring-white/10"
              style={{ backgroundColor: activeToken.accent }}
            />
            <div>
              <h3 className="text-[15px] font-bold text-white tracking-tight">
                {initialEvent ? "Edit Event" : "Add New Event"}
              </h3>
              <p className="text-[11px] text-[#AAB4BE]">
                {date
                  ? new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Select date & time"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#AAB4BE] hover:text-white hover:bg-[#28323D] rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-4 overflow-y-auto flex-1"
        >
          {error && (
            <div className="p-3 bg-[#2563EB]/15 border border-[#2563EB]/40 rounded-xl flex items-center gap-2 text-xs text-[#93C5FD]">
              <AlertCircle size={15} className="shrink-0 text-[#2563EB]" />
              <span>{error}</span>
            </div>
          )}

          {/* Event Title */}
          <div>
            <label className="block text-[11px] font-semibold text-[#AAB4BE] uppercase tracking-wider mb-1.5">
              Event Title <span className="text-[#2563EB]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design System Review"
              className="w-full px-3.5 py-2.5 bg-[#28323D] border border-white/10 rounded-xl text-[14px] font-semibold text-white placeholder-[#AAB4BE]/60 focus:outline-none focus:border-[#2563EB] transition-all"
            />
          </div>

          {/* Category Pills & Pastel Color Swatches */}
          <div className="p-3.5 rounded-xl bg-[#161C24] border border-[#28323D] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#AAB4BE] uppercase tracking-wider flex items-center gap-1.5">
                <Palette size={12} className="text-[#2563EB]" />
                <span>Category & Color Theme</span>
              </span>
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                style={{
                  backgroundColor: activeToken.bg,
                  color: activeToken.text,
                }}
              >
                {activeToken.label}
              </span>
            </div>

            {/* Category Selector Chips */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                const catToken = PASTEL_CATEGORY_TOKENS[cat.id];
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 border ${
                      isSelected
                        ? "bg-[#28323D] text-white border-white/30 shadow-xs"
                        : "bg-transparent text-[#AAB4BE] border-white/5 hover:bg-[#28323D]/60 hover:text-white"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: catToken.accent }}
                    />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Pastel Swatch Circles */}
            <div className="flex items-center justify-between pt-2 border-t border-[#28323D]">
              <span className="text-[11px] text-[#AAB4BE]">Card Accent</span>
              <div className="flex items-center gap-2">
                {COLOR_SWATCHES.map((swatch) => {
                  const preset = EVENT_COLOR_PRESETS[swatch.key];
                  const isSelected = customColor === swatch.key;
                  return (
                    <button
                      key={swatch.key}
                      type="button"
                      onClick={() => setCustomColor(swatch.key)}
                      title={swatch.label}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                        isSelected
                          ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#161C24]"
                          : "opacity-75 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: preset.accent }}
                    >
                      {isSelected && (
                        <Check size={12} strokeWidth={3} className="text-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Date, Department & All-Day Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#AAB4BE] uppercase tracking-wider mb-1">
                Date <span className="text-[#2563EB]">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#28323D] border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-[#2563EB] [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#AAB4BE] uppercase tracking-wider mb-1">
                Calendar
              </label>
              <select
                value={department}
                onChange={(e) =>
                  setDepartment(e.target.value as CalendarDepartment)
                }
                className="w-full px-3 py-2 bg-[#28323D] border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-[#2563EB]"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[#1C252E]">
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Selection & Circular Time-Picker Visualization */}
          <div className="p-4 rounded-xl bg-[#161C24] border border-[#28323D] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#2563EB]" />
                <span className="text-xs font-semibold text-white">
                  Time & Duration
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#28323D] text-[#AAB4BE] text-[10px] font-bold">
                  {durationText}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[11px] text-[#AAB4BE] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="rounded border-white/20 bg-[#28323D] text-[#2563EB] focus:ring-0"
                  />
                  <span>All day</span>
                </label>

                {!allDay && (
                  <button
                    type="button"
                    onClick={() => setShowDial(!showDial)}
                    className="text-[11px] font-semibold text-[#2563EB] hover:underline"
                  >
                    {showDial ? "Hide Dial" : "Clock Dial"}
                  </button>
                )}
              </div>
            </div>

            {!allDay && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setActiveDialTarget("start")}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      activeDialTarget === "start"
                        ? "bg-[#28323D] border-[#2563EB]"
                        : "bg-[#28323D]/60 border-white/5"
                    }`}
                  >
                    <span className="block text-[10px] font-semibold text-[#AAB4BE] uppercase">
                      Start Time
                    </span>
                    <div className="flex items-center justify-between mt-1 gap-1">
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="bg-transparent text-sm font-bold text-white focus:outline-none [color-scheme:dark] w-full"
                      />
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveDialTarget("end")}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      activeDialTarget === "end"
                        ? "bg-[#28323D] border-[#2563EB]"
                        : "bg-[#28323D]/60 border-white/5"
                    }`}
                  >
                    <span className="block text-[10px] font-semibold text-[#AAB4BE] uppercase">
                      End Time
                    </span>
                    <div className="flex items-center justify-between mt-1 gap-1">
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="bg-transparent text-sm font-bold text-white focus:outline-none [color-scheme:dark] w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Circular Time-Picker Visualization (Inspired by Reference #3) */}
                {showDial && (
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-4 pt-2">
                    <div className="relative w-[180px] h-[180px] flex items-center justify-center">
                      <svg
                        width="180"
                        height="180"
                        viewBox="0 0 180 180"
                        className="overflow-visible"
                      >
                        {/* Outer dial track */}
                        <circle
                          cx={dialCenter}
                          cy={dialCenter}
                          r={dialRadius}
                          fill="#1C252E"
                          stroke="#28323D"
                          strokeWidth="12"
                        />
                        {/* Highlighted duration arc */}
                        <path
                          d={arcPath}
                          fill="none"
                          stroke={activeToken.accent}
                          strokeWidth="12"
                          strokeLinecap="round"
                        />
                        {/* Start & End handles */}
                        <circle
                          cx={startPt.x}
                          cy={startPt.y}
                          r="6"
                          fill="#FFFFFF"
                          stroke={activeToken.accent}
                          strokeWidth="3"
                        />
                        <circle
                          cx={endPt.x}
                          cy={endPt.y}
                          r="6"
                          fill="#2563EB"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                        />
                      </svg>

                      {/* Hour numbers around the clock dial */}
                      {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h12) => {
                        const angle = (h12 % 12) * 30 - 90;
                        const pos = polarToCartesian(
                          dialCenter,
                          dialCenter,
                          dialRadius,
                          angle
                        );
                        const selectedH12 =
                          currentHour24 % 12 === 0 ? 12 : currentHour24 % 12;
                        const isHourSelected = selectedH12 === h12;
                        return (
                          <button
                            key={h12}
                            type="button"
                            onClick={() => handleClockHourClick(h12)}
                            style={{
                              left: `${pos.x}px`,
                              top: `${pos.y}px`,
                            }}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                              isHourSelected
                                ? "bg-[#2563EB] text-white shadow-sm scale-110"
                                : "text-[#AAB4BE] hover:text-white"
                            }`}
                          >
                            {h12}
                          </button>
                        );
                      })}

                      {/* Center Duration Readout */}
                      <div className="text-center pointer-events-none">
                        <span className="block text-[15px] font-extrabold text-white">
                          {durationText}
                        </span>
                        <span className="block text-[10px] text-[#AAB4BE]">
                          {formatTimeDisplay(startTime)} –{" "}
                          {formatTimeDisplay(endTime)}
                        </span>
                      </div>
                    </div>

                    {/* Quick Controls alongside Dial */}
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <div className="flex items-center bg-[#28323D] p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setActiveDialTarget("start")}
                          className={`flex-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                            activeDialTarget === "start"
                              ? "bg-[#2563EB] text-white"
                              : "text-[#AAB4BE] hover:text-white"
                          }`}
                        >
                          Set Start
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveDialTarget("end")}
                          className={`flex-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                            activeDialTarget === "end"
                              ? "bg-[#2563EB] text-white"
                              : "text-[#AAB4BE] hover:text-white"
                          }`}
                        >
                          Set End
                        </button>
                      </div>

                      <div className="flex items-center bg-[#28323D] p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => toggleAmPm(false)}
                          className={`flex-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                            !isPM
                              ? "bg-white text-[#1C252E]"
                              : "text-[#AAB4BE] hover:text-white"
                          }`}
                        >
                          AM
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAmPm(true)}
                          className={`flex-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                            isPM
                              ? "bg-white text-[#1C252E]"
                              : "text-[#AAB4BE] hover:text-white"
                          }`}
                        >
                          PM
                        </button>
                      </div>

                      <select
                        value={
                          activeDialTarget === "start" ? startTime : endTime
                        }
                        onChange={(e) =>
                          activeDialTarget === "start"
                            ? setStartTime(e.target.value)
                            : setEndTime(e.target.value)
                        }
                        className="px-2.5 py-1.5 bg-[#28323D] border border-white/10 rounded-lg text-[11px] font-semibold text-white"
                      >
                        {FULL_24H_TIME_OPTIONS.map((t) => (
                          <option key={t} value={t} className="bg-[#1C252E]">
                            {formatTimeDisplay(t)} ({t})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Location & Room Booking Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#AAB4BE] uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin size={12} className="text-[#2563EB]" />
                <span>Location / Address</span>
              </label>
              <input
                type="text"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="Office floor, address, or city..."
                className="w-full px-3 py-2 bg-[#28323D] border border-white/10 rounded-xl text-xs text-white placeholder-[#AAB4BE]/60 focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#AAB4BE] uppercase tracking-wider mb-1 flex items-center gap-1">
                <Building size={12} className="text-[#2563EB]" />
                <span>Room Booking</span>
              </label>
              <select
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full px-3 py-2 bg-[#28323D] border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-[#2563EB]"
              >
                <option value="" className="bg-[#1C252E]">
                  No Room Selected
                </option>
                {ROOMS.map((r) => (
                  <option key={r} value={r} className="bg-[#1C252E]">
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Video Provider & Meeting Link */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#AAB4BE] uppercase tracking-wider mb-1 flex items-center gap-1">
                <Video size={12} className="text-[#2563EB]" />
                <span>Platform</span>
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2 bg-[#28323D] border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-[#2563EB]"
              >
                <option value="google_meet" className="bg-[#1C252E]">
                  Google Meet
                </option>
                <option value="zoom" className="bg-[#1C252E]">
                  Zoom
                </option>
                <option value="teams" className="bg-[#1C252E]">
                  MS Teams
                </option>
                <option value="custom" className="bg-[#1C252E]">
                  Custom URL
                </option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-[#AAB4BE] uppercase tracking-wider mb-1">
                Meeting Link
              </label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full px-3 py-2 bg-[#28323D] border border-white/10 rounded-xl text-xs text-white placeholder-[#AAB4BE]/60 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-[#AAB4BE] uppercase tracking-wider mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add meeting agenda, context, or preparation notes..."
              className="w-full px-3 py-2 bg-[#28323D] border border-white/10 rounded-xl text-xs text-white placeholder-[#AAB4BE]/60 focus:outline-none focus:border-[#2563EB] resize-none"
            />
          </div>

          {/* Participants */}
          <div>
            <label className="block text-[11px] font-semibold text-[#AAB4BE] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Users size={12} className="text-[#2563EB]" />
              <span>Guests & Participants ({participants.length})</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newParticipantInput}
                onChange={(e) => setNewParticipantInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddParticipant();
                  }
                }}
                placeholder="Add guest name or email..."
                className="flex-1 px-3 py-1.5 bg-[#28323D] border border-white/10 rounded-xl text-xs text-white placeholder-[#AAB4BE]/60 focus:outline-none focus:border-[#2563EB]"
              />
              <button
                type="button"
                onClick={handleAddParticipant}
                className="px-3.5 py-1.5 bg-[#28323D] hover:bg-white/15 text-white font-semibold text-xs rounded-xl border border-white/10 transition-colors"
              >
                + Add
              </button>
            </div>

            {participants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-[#161C24] rounded-xl border border-[#28323D]">
                {participants.map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#28323D] rounded-lg text-xs font-medium text-white"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#2563EB]/20 text-[#2563EB] text-[10px] font-bold flex items-center justify-center">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <span>{p.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(idx)}
                      className="text-[#AAB4BE] hover:text-[#2563EB] ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Recurrence, Reminder & Privacy */}
          <div className="pt-1 border-t border-[#28323D]">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-[#AAB4BE] hover:text-white flex items-center gap-1.5 py-1"
            >
              <ChevronDown
                size={14}
                className={`transition-transform ${
                  showAdvanced ? "rotate-180" : ""
                }`}
              />
              <span>
                Repeat ({recurrence}), Reminder ({reminder}) & Privacy ({privacy})
              </span>
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2.5 p-3 bg-[#161C24] rounded-xl border border-[#28323D]">
                <div>
                  <label className="block text-[10px] font-semibold text-[#AAB4BE] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Repeat size={11} />
                    <span>Recurrence</span>
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) =>
                      setRecurrence(e.target.value as RecurrenceType)
                    }
                    className="w-full px-2.5 py-1.5 bg-[#28323D] border border-white/10 rounded-lg text-xs font-semibold text-white"
                  >
                    <option value="none" className="bg-[#1C252E]">
                      Does not repeat
                    </option>
                    <option value="daily" className="bg-[#1C252E]">
                      Daily
                    </option>
                    <option value="weekly" className="bg-[#1C252E]">
                      Weekly
                    </option>
                    <option value="monthly" className="bg-[#1C252E]">
                      Monthly
                    </option>
                    <option value="yearly" className="bg-[#1C252E]">
                      Yearly
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#AAB4BE] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Bell size={11} />
                    <span>Reminder</span>
                  </label>
                  <select
                    value={reminder}
                    onChange={(e) => setReminder(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#28323D] border border-white/10 rounded-lg text-xs font-semibold text-white"
                  >
                    <option value="5m" className="bg-[#1C252E]">
                      5 mins before
                    </option>
                    <option value="10m" className="bg-[#1C252E]">
                      10 mins before
                    </option>
                    <option value="15m" className="bg-[#1C252E]">
                      15 mins before
                    </option>
                    <option value="30m" className="bg-[#1C252E]">
                      30 mins before
                    </option>
                    <option value="1h" className="bg-[#1C252E]">
                      1 hour before
                    </option>
                    <option value="1d" className="bg-[#1C252E]">
                      1 day before
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#AAB4BE] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Lock size={11} />
                    <span>Privacy</span>
                  </label>
                  <select
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value as PrivacyLevel)}
                    className="w-full px-2.5 py-1.5 bg-[#28323D] border border-white/10 rounded-lg text-xs font-semibold text-white"
                  >
                    <option value="internal" className="bg-[#1C252E]">
                      Internal
                    </option>
                    <option value="public" className="bg-[#1C252E]">
                      Public
                    </option>
                    <option value="private" className="bg-[#1C252E]">
                      Private
                    </option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#28323D] flex items-center justify-between gap-3">
            {initialEvent && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="px-3.5 py-2 text-[#2563EB] hover:bg-[#2563EB]/15 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border border-[#2563EB]/30"
              >
                {isDeleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[#AAB4BE] hover:text-white hover:bg-[#28323D] rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-2"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                <span>{initialEvent ? "Save Changes" : "Create Event"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
