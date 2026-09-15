// types/reminders.ts
// Matches the real API spec from /reminders endpoints

export type ReminderStatus = "PENDING" | "SNOOZED" | "COMPLETED" | "SKIPPED";

export type ReminderChannel = "EMAIL" | "SMS" | "PUSH" | "IN_APP" | "WHATSAPP";

export type ReminderRecurrence = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";

export interface Reminder {
  id: string;
  title: string;
  message?: string;
  channel: ReminderChannel;
  recurrence: ReminderRecurrence;
  status: ReminderStatus;
  dueAt: string;           // ISO datetime — API field name
  snoozedUntil?: string;   // ISO datetime — set when status=SNOOZED
  leadId?: string | null;
  assignedToId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;

  // Extra fields returned by some implementations
  leadName?: string;
  assignedToName?: string;
}

export interface CreateReminderPayload {
  title: string;
  message?: string;
  leadId?: string | null;
  assignedToId?: string | null;
  dueAt: string;           // ISO datetime
  channel: ReminderChannel;
  recurrence: ReminderRecurrence;
  metadata?: Record<string, unknown>;
}

export interface UpdateReminderPayload {
  title?: string;
  message?: string;
  leadId?: string | null;
  assignedToId?: string | null;
  dueAt?: string;
  channel?: ReminderChannel;
  recurrence?: ReminderRecurrence;
  status?: ReminderStatus;
  metadata?: Record<string, unknown>;
}

export interface SnoozeReminderPayload {
  snoozedUntil: string;   // ISO datetime — API field name
}

export interface RemindersResponse {
  data: Reminder[];
  total?: number;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}
