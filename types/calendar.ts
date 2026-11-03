// types/calendar.ts
// Calendar System domain types matching Calendar System.docx specification

import { Meeting } from "@/lib/api/meetingsApi";
import { Task } from "@/lib/api/tasksApi";
import { Call } from "@/lib/api/callsApi";

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

export interface CalendarParticipant {
  id?: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  rsvp?: ParticipantRsvp;
}
export interface UnifiedCalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO string or HH:mm
  endTime: string; // ISO string or HH:mm
  allDay?: boolean;
  category: CalendarCategory;
  department: CalendarDepartment;
  location?: string;
  meetingLink?: string;
  provider?: "google_meet" | "zoom" | "teams" | "custom" | string;
  room?: string;
  participants: CalendarParticipant[];
  reminder?: string; // "5m" | "10m" | "15m" | "30m" | "1h" | "1d"
  recurrence?: RecurrenceType;
  privacy?: PrivacyLevel;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  sourceType: "meeting" | "task" | "call" | "custom";
  rawSource?: Meeting | Task | Call;
  syncStatus?: "synced" | "pending_sync" | "local_only";
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveEventResult {
  event: UnifiedCalendarEvent;
  isSynced: boolean;
  syncStatus: "synced" | "pending_sync";
  message: string;
}

export interface CalendarFilterState {
  searchQuery: string;
  departments: CalendarDepartment[];
  categories: CalendarCategory[];
  showCompletedTasks: boolean;
}
