// lib/api/reminderService.ts
// Smart Reminder CRUD — matches exact API spec:
// POST   /reminders
// GET    /reminders?status=&leadId=&assignedToId=
// GET    /reminders/{id}
// PATCH  /reminders/{id}
// DELETE /reminders/{id}
// PATCH  /reminders/{id}/snooze   body: { snoozedUntil }
// PATCH  /reminders/{id}/complete
// PATCH  /reminders/{id}/skip

import api from "@/lib/api/api";
import {
  Reminder,
  CreateReminderPayload,
  UpdateReminderPayload,
  SnoozeReminderPayload,
  RemindersResponse,
  ReminderStatus,
} from "@/types/reminders";

function resolveList(data: unknown): Reminder[] {
  if (Array.isArray(data)) return data as Reminder[];
  if (Array.isArray((data as any)?.data)) return (data as any).data as Reminder[];
  if (Array.isArray((data as any)?.reminders)) return (data as any).reminders as Reminder[];
  return [];
}

// ── List Reminders ─────────────────────────────────────────────────────────

export async function getReminders(params?: {
  status?: ReminderStatus;
  leadId?: string;
  assignedToId?: string;
}): Promise<RemindersResponse> {
  const res = await api.get<unknown>("/reminders", { params });
  return { data: resolveList(res.data), total: resolveList(res.data).length };
}

// ── Create Reminder ────────────────────────────────────────────────────────

export async function createReminder(payload: CreateReminderPayload): Promise<Reminder> {
  const res = await api.post<any>("/reminders", payload);
  return res.data?.data ?? res.data;
}

// ── Update Reminder ────────────────────────────────────────────────────────

export async function updateReminder(id: string, payload: UpdateReminderPayload): Promise<Reminder> {
  const res = await api.patch<any>(`/reminders/${id}`, payload);
  return res.data?.data ?? res.data;
}

// ── Snooze Reminder  (body: { snoozedUntil }) ─────────────────────────────

export async function snoozeReminder(id: string, payload: SnoozeReminderPayload): Promise<Reminder> {
  const res = await api.patch<any>(`/reminders/${id}/snooze`, payload);
  return res.data?.data ?? res.data;
}

// ── Complete Reminder ──────────────────────────────────────────────────────

export async function completeReminder(id: string): Promise<Reminder> {
  const res = await api.patch<any>(`/reminders/${id}/complete`);
  return res.data?.data ?? res.data;
}

// ── Skip Reminder ──────────────────────────────────────────────────────────

export async function skipReminder(id: string): Promise<Reminder> {
  const res = await api.patch<any>(`/reminders/${id}/skip`);
  return res.data?.data ?? res.data;
}

// ── Delete Reminder ────────────────────────────────────────────────────────

export async function deleteReminderById(id: string): Promise<void> {
  await api.delete(`/reminders/${id}`);
}
