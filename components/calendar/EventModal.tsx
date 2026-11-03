"use client";

import React, { useState, useEffect } from "react";
import {
  UnifiedCalendarEvent,
  CalendarDepartment,
  CalendarCategory,
  RecurrenceType,
  PrivacyLevel,
  CalendarParticipant,
} from "@/types/calendar";
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
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Building,
} from "lucide-react";
import { formatDateKey } from "@/lib/api/calendarService";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: Partial<UnifiedCalendarEvent>, id?: string | null) => Promise<void>;
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
  { id: "sales", label: "Sales & Client" },
  { id: "management", label: "Management" },
];

const CATEGORIES: { id: CalendarCategory; label: string }[] = [
  { id: "meeting", label: "Meeting" },
  { id: "interview", label: "Interview" },
  { id: "call", label: "Call" },
  { id: "task", label: "Task / Deadline" },
  { id: "out_of_office", label: "Out of Office" },
  { id: "deadline", label: "Release / Milestone" },
];

const ROOMS = [
  "Conference Room 1",
  "Conference Room 2",
  "Board Room",
  "Interview Room",
  "Executive Suite",
];

const TIME_OPTIONS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00",
];

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
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [department, setDepartment] = useState<CalendarDepartment>("development");
  const [category, setCategory] = useState<CalendarCategory>("meeting");
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

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form state
  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title || "");
      setDate(initialEvent.date || formatDateKey(new Date()));
      setStartTime(initialEvent.startTime || "10:00");
      setEndTime(initialEvent.endTime || "11:00");
      setDepartment(initialEvent.department || "development");
      setCategory(initialEvent.category || "meeting");
      setRoom(initialEvent.room || "");
      setCustomLocation(initialEvent.location || "");
      setProvider(initialEvent.provider || "google_meet");
      setMeetingLink(initialEvent.meetingLink || "");
      setDescription(initialEvent.description || "");
      setRecurrence(initialEvent.recurrence || "none");
      setReminder(initialEvent.reminder || "15m");
      setPrivacy(initialEvent.privacy || "internal");
      setParticipants(initialEvent.participants || []);
    } else {
      const defaultDate = initialDate ? formatDateKey(initialDate) : formatDateKey(new Date());
      const defaultHour = initialHour !== undefined ? initialHour : 10;
      const startStr = `${String(defaultHour).padStart(2, "0")}:00`;
      const endStr = `${String(defaultHour + 1).padStart(2, "0")}:00`;

      setTitle("");
      setDate(defaultDate);
      setStartTime(startStr);
      setEndTime(endStr);
      setDepartment("development");
      setCategory("meeting");
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

  if (!isOpen) return null;

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

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Partial<UnifiedCalendarEvent> = {
        title: title.trim(),
        date,
        startTime,
        endTime,
        department,
        category,
        room: room || undefined,
        location: customLocation || room || undefined,
        provider,
        meetingLink: meetingLink.trim() || undefined,
        description: description.trim() || undefined,
        recurrence,
        reminder,
        privacy,
        participants,
      };

      await onSave(payload, initialEvent ? initialEvent.id : null);
      onClose();
    } catch (err: any) {
      console.error("Save event failed:", err);
      setError(err?.message || "Failed to save event. Please check inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialEvent?.id || !onDelete) return;
    if (!confirm("Are you sure you want to delete this event?")) return;

    setIsDeleting(true);
    try {
      await onDelete(initialEvent.id);
      onClose();
    } catch (err: any) {
      console.error("Delete event failed:", err);
      setError(err?.message || "Failed to delete event.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E7F0FF] text-[#355D91] border border-[#C5DAFD]/60 flex items-center justify-center shadow-2xs">
              <CalendarIcon size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1E293B]">
                {initialEvent ? "Edit Calendar Event" : "Create New Event"}
              </h3>
              <p className="text-[11px] text-slate-500">
                Schedule meetings, calls, tasks & room bookings
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle size={15} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Event Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Development Sprint Review"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Calendar Department & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Calendar / Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as CalendarDepartment)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Event Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CalendarCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Start Time
              </label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                End Time
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Meeting Room Booking & Video Provider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Building size={12} className="text-blue-600" />
                <span>Room / Resource Booking</span>
              </label>
              <select
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="">No Room Booking</option>
                {ROOMS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Video size={12} className="text-blue-600" />
                <span>Online Video Platform</span>
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="google_meet">Google Meet</option>
                <option value="zoom">Zoom</option>
                <option value="teams">Microsoft Teams</option>
                <option value="custom">Other Link</option>
              </select>
            </div>
          </div>

          {/* Meeting Link input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Online Meeting URL
            </label>
            <input
              type="url"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/abc-defg-hij or Zoom URL"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Description / Agenda */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description / Meeting Agenda
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Purpose of the meeting, topics to discuss, preparation required..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
            />
          </div>

          {/* Participants */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Users size={12} className="text-blue-600" />
                <span>Participants ({participants.length})</span>
              </span>
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
                placeholder="Enter attendee name or email and press Enter..."
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddParticipant}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                + Add
              </button>
            </div>

            {/* Chips */}
            {participants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                {participants.map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-2xs"
                  >
                    <span>{p.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(idx)}
                      className="text-slate-400 hover:text-red-500 ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Collapsible Section */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <ChevronDown
                size={14}
                className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              />
              <span>{showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings (Recurrence, Alert, Privacy)"}</span>
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Recurrence
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Reminder Notification
                  </label>
                  <select
                    value={reminder}
                    onChange={(e) => setReminder(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    <option value="5m">5 minutes before</option>
                    <option value="10m">10 minutes before</option>
                    <option value="15m">15 minutes before</option>
                    <option value="30m">30 minutes before</option>
                    <option value="1h">1 hour before</option>
                    <option value="1d">1 day before</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Event Privacy
                  </label>
                  <select
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value as PrivacyLevel)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    <option value="internal">Team / Internal</option>
                    <option value="public">Company Public</option>
                    <option value="private">Private (Only me)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            {initialEvent && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-rose-200"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="px-5 py-2.5 bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm active:scale-95 transition-all flex items-center gap-2"
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
