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

// ── Mock data (fallback if API is unavailable) ─────────────────────────────

let mockReminders: Reminder[] = [
  {
    id: "mock-rem-1",
    title: "Follow up with Acme Corp",
    message: "Call John about the new proposal",
    channel: "EMAIL",
    recurrence: "NONE",
    status: "PENDING",
    dueAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    leadId: "lead-1",
    leadName: "Acme Corp",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "mock-rem-2",
    title: "Schedule demo call",
    message: "Product demo for Q4 prospects.",
    channel: "PUSH",
    recurrence: "NONE",
    status: "PENDING",
    dueAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: "mock-rem-3",
    title: "Send contract to GlobalTech",
    channel: "EMAIL",
    recurrence: "NONE",
    status: "SNOOZED",
    dueAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    snoozedUntil: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    leadName: "GlobalTech",
    createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mock-rem-4",
    title: "Review pipeline report",
    channel: "IN_APP",
    recurrence: "NONE",
    status: "COMPLETED",
    dueAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: "mock-rem-5",
    title: "Weekly Sales Sync",
    message: "Prepare slides before the meeting",
    channel: "EMAIL",
    recurrence: "WEEKLY",
    status: "PENDING",
    dueAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

let useMock = false;

function generateId() {
  return `rem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function resolveList(data: unknown): Reminder[] {
  if (Array.isArray(data)) return data as Reminder[];
  if (Array.isArray((data as any)?.data)) return (data as any).data as Reminder[];
  if (Array.isArray((data as any)?.reminders)) return (data as any).reminders as Reminder[];
  return [];
}

function isMockable(err: unknown): boolean {
  const status = (err as any)?.response?.status;
  return !status || status === 404 || status === 0;
}

// ── List Reminders ─────────────────────────────────────────────────────────

export async function getReminders(params?: {
  status?: ReminderStatus;
  leadId?: string;
  assignedToId?: string;
}): Promise<RemindersResponse> {
  if (useMock) {
    let list = [...mockReminders];
    if (params?.status) list = list.filter((r) => r.status === params.status);
    if (params?.leadId) list = list.filter((r) => r.leadId === params.leadId);
    if (params?.assignedToId) list = list.filter((r) => r.assignedToId === params.assignedToId);
    return { data: list, total: list.length };
  }
  try {
    const res = await api.get<unknown>("/reminders", { params });
    return { data: resolveList(res.data), total: resolveList(res.data).length };
  } catch (err) {
    if (isMockable(err)) { useMock = true; return getReminders(params); }
    throw err;
  }
}

// ── Create Reminder ────────────────────────────────────────────────────────

export async function createReminder(payload: CreateReminderPayload): Promise<Reminder> {
  if (useMock) {
    const r: Reminder = {
      id: generateId(),
      ...payload,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockReminders = [r, ...mockReminders];
    return r;
  }
  try {
    const res = await api.post<any>("/reminders", payload);
    return res.data?.data ?? res.data;
  } catch (err) {
    if (isMockable(err)) { useMock = true; return createReminder(payload); }
    throw err;
  }
}

// ── Update Reminder ────────────────────────────────────────────────────────

export async function updateReminder(id: string, payload: UpdateReminderPayload): Promise<Reminder> {
  if (useMock) {
    const idx = mockReminders.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("Reminder not found");
    mockReminders[idx] = { ...mockReminders[idx], ...payload, updatedAt: new Date().toISOString() };
    return { ...mockReminders[idx] };
  }
  try {
    const res = await api.patch<any>(`/reminders/${id}`, payload);
    return res.data?.data ?? res.data;
  } catch (err) {
    if (isMockable(err)) { useMock = true; return updateReminder(id, payload); }
    throw err;
  }
}

// ── Snooze Reminder  (body: { snoozedUntil }) ─────────────────────────────

export async function snoozeReminder(id: string, payload: SnoozeReminderPayload): Promise<Reminder> {
  if (useMock) {
    const idx = mockReminders.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("Reminder not found");
    mockReminders[idx] = {
      ...mockReminders[idx],
      status: "SNOOZED",
      snoozedUntil: payload.snoozedUntil,
      updatedAt: new Date().toISOString(),
    };
    return { ...mockReminders[idx] };
  }
  try {
    const res = await api.patch<any>(`/reminders/${id}/snooze`, payload);
    return res.data?.data ?? res.data;
  } catch (err) {
    if (isMockable(err)) { useMock = true; return snoozeReminder(id, payload); }
    throw err;
  }
}

// ── Complete Reminder ──────────────────────────────────────────────────────

export async function completeReminder(id: string): Promise<Reminder> {
  if (useMock) {
    const idx = mockReminders.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("Reminder not found");
    mockReminders[idx] = { ...mockReminders[idx], status: "COMPLETED", updatedAt: new Date().toISOString() };
    return { ...mockReminders[idx] };
  }
  try {
    const res = await api.patch<any>(`/reminders/${id}/complete`);
    return res.data?.data ?? res.data;
  } catch (err) {
    if (isMockable(err)) { useMock = true; return completeReminder(id); }
    throw err;
  }
}

// ── Skip Reminder ──────────────────────────────────────────────────────────

export async function skipReminder(id: string): Promise<Reminder> {
  if (useMock) {
    const idx = mockReminders.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("Reminder not found");
    mockReminders[idx] = { ...mockReminders[idx], status: "SKIPPED", updatedAt: new Date().toISOString() };
    return { ...mockReminders[idx] };
  }
  try {
    const res = await api.patch<any>(`/reminders/${id}/skip`);
    return res.data?.data ?? res.data;
  } catch (err) {
    if (isMockable(err)) { useMock = true; return skipReminder(id); }
    throw err;
  }
}

// ── Delete Reminder ────────────────────────────────────────────────────────

export async function deleteReminderById(id: string): Promise<void> {
  if (useMock) {
    mockReminders = mockReminders.filter((r) => r.id !== id);
    return;
  }
  try {
    await api.delete(`/reminders/${id}`);
  } catch (err) {
    if (isMockable(err)) { useMock = true; return deleteReminderById(id); }
    throw err;
  }
}
