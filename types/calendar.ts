// types/calendar.ts
// Calendar System domain types matching Calendar System specification

import type { Meeting } from "../lib/api/meetingsApi";
import type { Task } from "../lib/api/tasksApi";
import type { Call } from "../lib/api/callsApi";

export type CalendarViewType = "month" | "week" | "workweek" | "day" | "schedule";

export type CalendarCategory =
  | "meeting"
  | "call"
  | "task"
  | "interview"
  | "out_of_office"
  | "deadline"
  | "holiday"
  | "event";

export type CalendarDepartment =
  | "personal"
  | "company"
  | "hr"
  | "development"
  | "marketing"
  | "sales"
  | "management";

export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "yearly";

export type PrivacyLevel = "public" | "internal" | "private";

export type ParticipantRsvp = "attending" | "declined" | "tentative" | "pending";

export type EventColorKey =
  | "development"
  | "design"
  | "meetings"
  | "personal"
  | "important"
  | "interview"
  | "holiday";

export interface CalendarParticipant {
  id?: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  rsvp?: ParticipantRsvp;
}

export interface UnifiedCalendarEvent {
  id: string;
  masterEventId?: string;
  isRecurringInstance?: boolean;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm or "" for untimed/all-day
  endTime: string; // HH:mm or "" for untimed/all-day
  allDay?: boolean;
  category: CalendarCategory;
  department: CalendarDepartment;
  customColor?: EventColorKey | string;
  location?: string;
  meetingLink?: string;
  provider?: "google_meet" | "zoom" | "teams" | "custom" | string;
  room?: string;
  participants: CalendarParticipant[];
  reminder?: string; // "5m" | "10m" | "15m" | "30m" | "1h" | "1d"
  reminderSynced?: boolean;
  recurrence?: RecurrenceType;
  privacy?: PrivacyLevel;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  sourceType: "meeting" | "task" | "call" | "custom";
  rawSource?: Meeting | Task | Call;
  syncStatus?: "synced" | "pending_sync" | "local_only";
  createdAt?: string;
  updatedAt?: string;
}

export interface PositionedCalendarEvent {
  event: UnifiedCalendarEvent;
  startMinutes: number;
  endMinutes: number;
  colIndex: number;
  totalCols: number;
  leftPct: number;
  widthPct: number;
}

export interface LocalEventMetadata {
  version: number;
  id: string;
  category?: CalendarCategory;
  department?: CalendarDepartment;
  customColor?: EventColorKey | string;
  room?: string;
  location?: string;
  description?: string;
  recurrence?: RecurrenceType;
  reminder?: string;
  privacy?: PrivacyLevel;
  allDay?: boolean;
  participants?: CalendarParticipant[];
  updatedAt: string;
}

export interface SaveEventResult {
  event: UnifiedCalendarEvent;
  isSynced: boolean;
  syncStatus: "synced" | "pending_sync" | "local_only";
  reminderSynced?: boolean;
  message: string;
}

export interface CalendarFilterState {
  searchQuery: string;
  departments: CalendarDepartment[];
  categories: CalendarCategory[];
  showCompletedTasks: boolean;
}
