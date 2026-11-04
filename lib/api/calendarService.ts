import {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  createMeetingReminder,
  Meeting,
} from "@/lib/api/meetingsApi";
import { fetchTasks, updateTask, Task } from "@/lib/api/tasksApi";
import { fetchCalls, Call } from "@/lib/api/callsApi";
import {
  UnifiedCalendarEvent,
  CalendarDepartment,
  CalendarCategory,
  SaveEventResult,
  LocalEventMetadata,
  CalendarParticipant,
  ParticipantRsvp,
} from "@/types/calendar";
import {
  formatDateKey,
  parseDateSafe,
  isSameDay,
  hasExplicitTime,
  extractTime,
  parseTimeMinutes,
  minutesToTimeStr,
  addMinutesToTimeStr,
  formatTimeDisplay,
  calculateDuration,
  parseReminderMinutes,
  addMonthsClamped,
  navigateCalendarDate,
  getWeekStartDate,
  getWeekDays,
  computeOverlapLayout,
  expandRecurringEvents,
  mergeEventWithMetadata,
} from "@/lib/utils/calendarUtils";

export {
  formatDateKey,
  parseDateSafe,
  isSameDay,
  hasExplicitTime,
  extractTime,
  parseTimeMinutes,
  minutesToTimeStr,
  addMinutesToTimeStr,
  formatTimeDisplay,
  calculateDuration,
  parseReminderMinutes,
  addMonthsClamped,
  navigateCalendarDate,
  getWeekStartDate,
  getWeekDays,
  computeOverlapLayout,
  expandRecurringEvents,
  mergeEventWithMetadata,
};

export const STORAGE_KEY_MEETINGS = "zyoris_calendar_meetings_cache";
export const STORAGE_KEY_CUSTOM = "zyoris_calendar_custom_events";
export const STORAGE_KEY_CALLS = "zyoris_calendar_calls_cache";
export const STORAGE_KEY_TASKS = "zyoris_calendar_tasks_cache";
export const STORAGE_KEY_METADATA = "zyoris_calendar_event_metadata_v1";
export const STORAGE_KEY_TOMBSTONES = "zyoris_calendar_deleted_tombstones_v1";

const METADATA_SCHEMA_VERSION = 1;

/** Timeout wrapper that rejects on timeout so Promise.allSettled detects network failures */
function withTimeoutReject<T>(promise: Promise<T>, ms = 6000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Calendar API request timed out after ${ms}ms`));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ── Tombstone Management (prevents deleted items from reappearing via cache) ──

export function getDeletedTombstones(): Set<string> {
  if (typeof window === "undefined" || !window.localStorage) return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TOMBSTONES);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

export function addDeletedTombstone(id: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const current = getDeletedTombstones();
    current.add(id);
    localStorage.setItem(STORAGE_KEY_TOMBSTONES, JSON.stringify(Array.from(current)));
  } catch {
    // Ignore storage errors
  }
}

// ── Versioned Local Metadata Layer ───────────────────────────────────────────

export function getEventMetadataMap(): Record<string, LocalEventMetadata> {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_METADATA);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, LocalEventMetadata>;
  } catch {
    return {};
  }
}

export function saveEventMetadata(
  id: string,
  meta: Partial<Omit<LocalEventMetadata, "id" | "version" | "updatedAt">>
): LocalEventMetadata {
  const map = getEventMetadataMap();
  const existing = map[id];
  const record: LocalEventMetadata = {
    ...existing,
    ...meta,
    version: METADATA_SCHEMA_VERSION,
    id,
    updatedAt: new Date().toISOString(),
  };
  map[id] = record;

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY_METADATA, JSON.stringify(map));
    } catch (e) {
      console.warn("Failed to persist calendar event metadata:", e);
    }
  }
  return record;
}

export function removeEventMetadata(id: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const map = getEventMetadataMap();
    if (id in map) {
      delete map[id];
      localStorage.setItem(STORAGE_KEY_METADATA, JSON.stringify(map));
    }
  } catch {
    // Ignore storage errors
  }
}

// ── Custom Local Events Storage ──────────────────────────────────────────────

/**
 * Isolated demo seed events generator (only used if explicitly invoked in demo/test mode,
 * never automatically injected into live user storage).
 */
export function getSeedEvents(): UnifiedCalendarEvent[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  const makeDate = (offsetDays: number) => {
    const d = new Date(year, month, date + offsetDays);
    return formatDateKey(d);
  };

  return [
    {
      id: "seed-1",
      title: "Design Discussion & Review",
      description: "Review new weekly timeline & date picker components for the Zyoris Portal",
      date: makeDate(0),
      startTime: "11:00",
      endTime: "12:30",
      category: "meeting",
      department: "development",
      customColor: "development",
      room: "Conference Room 1",
      provider: "google_meet",
      meetingLink: "https://meet.google.com/zyo-des-rev",
      participants: [
        { name: "John Doe", email: "john@zyoris.com", rsvp: "attending" },
        { name: "Silvia Vance", email: "silvia@zyoris.com", rsvp: "attending" },
      ],
      reminder: "15m",
      privacy: "internal",
      status: "SCHEDULED",
      sourceType: "custom",
    },
  ];
}

/** Read custom local events stored by the user (filters out legacy auto-injected seed-* items and tombstones) */
export function getStoredCustomEvents(): UnifiedCalendarEvent[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const tombstones = getDeletedTombstones();
    const cleaned = parsed.filter(
      (evt: any) =>
        evt &&
        typeof evt.id === "string" &&
        !evt.id.startsWith("seed-") &&
        !tombstones.has(evt.id)
    );
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

/** Save custom events to localStorage */
export function persistCustomEvents(events: UnifiedCalendarEvent[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(events));
  } catch (e) {
    console.error("Failed to persist custom calendar events", e);
  }
}

// ── Entity Converters ────────────────────────────────────────────────────────

/** Parse an attendee entry that may be a string ("Name <email>" or "email") or object */
export function parseAttendeeEntry(raw: unknown): CalendarParticipant {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    const angleMatch = trimmed.match(/^(.+?)\s*<([^<>]+@[^<>]+)>$/);
    if (angleMatch) {
      return {
        name: angleMatch[1].trim(),
        email: angleMatch[2].trim(),
        rsvp: "attending",
      };
    }
    if (trimmed.includes("@")) {
      return {
        name: trimmed.split("@")[0],
        email: trimmed,
        rsvp: "attending",
      };
    }
    return { name: trimmed || "Guest", rsvp: "attending" };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, any>;
    return {
      id: obj.id ? String(obj.id) : undefined,
      name: obj.name || (obj.email ? String(obj.email).split("@")[0] : "Guest"),
      email: obj.email ? String(obj.email) : undefined,
      avatarUrl: obj.avatarUrl ? String(obj.avatarUrl) : undefined,
      rsvp: (obj.rsvp || obj.status?.toLowerCase() || "attending") as ParticipantRsvp,
    };
  }
  return { name: "Guest", rsvp: "attending" };
}

/** Convert a backend Meeting into UnifiedCalendarEvent and merge stored local metadata */
export function convertMeetingToEvent(
  m: Meeting,
  metadataMap?: Record<string, LocalEventMetadata>
): UnifiedCalendarEvent {
  const dateSource = m.date || m.startTime;
  const parsedDate = parseDateSafe(dateSource);
  const dateStr = dateSource ? formatDateKey(parsedDate) : formatDateKey(new Date());

  const startStr = extractTime(m.startTime, "09:00");
  const endStr = m.endTime
    ? extractTime(m.endTime, addMinutesToTimeStr(startStr, 60))
    : addMinutesToTimeStr(startStr, 60);

  const attendeesList: CalendarParticipant[] = Array.isArray(m.attendees)
    ? m.attendees.map(parseAttendeeEntry)
    : [];

  const baseEvent: UnifiedCalendarEvent = {
    id: m.id,
    title: m.title || "Untitled Meeting",
    description: m.description,
    date: dateStr,
    startTime: startStr,
    endTime: endStr,
    allDay: false,
    category: ((m as any).category as CalendarCategory) || "meeting",
    department: ((m as any).department as CalendarDepartment) || "development",
    room: (m as any).room || undefined,
    location: m.location || undefined,
    meetingLink: m.joinUrl || m.link || m.meetingLink,
    provider: (m.provider ? String(m.provider).toLowerCase() : "google_meet") as any,
    participants: attendeesList,
    reminder: m.reminder || "15m",
    recurrence: ((m as any).recurrence as any) || "none",
    privacy: ((m as any).privacy as any) || "internal",
    status: (m.status as any) || "SCHEDULED",
    sourceType: "meeting",
    syncStatus: "synced",
    rawSource: m,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };

  const map = metadataMap ?? getEventMetadataMap();
  const meta = map[m.id];
  return mergeEventWithMetadata(baseEvent, meta);
}

/**
 * Convert a backend Task into UnifiedCalendarEvent.
 * - Uses actual timestamp if `t.dueDate` includes an explicit time of day.
 * - Represents date-only tasks as `allDay: true` items so no arbitrary 09:00-10:00 time is invented.
 */
export function convertTaskToEvent(
  t: Task,
  metadataMap?: Record<string, LocalEventMetadata>
): UnifiedCalendarEvent {
  const dateSource = t.dueDate || t.createdAt;
  const parsedDate = parseDateSafe(dateSource);
  const dateStr = formatDateKey(parsedDate);

  const explicitTimed = hasExplicitTime(t.dueDate);
  const startTime = explicitTimed && t.dueDate ? extractTime(t.dueDate, "09:00") : "";
  const endTime = startTime ? addMinutesToTimeStr(startTime, 60) : "";

  const validDepartments: CalendarDepartment[] = [
    "personal",
    "company",
    "hr",
    "development",
    "marketing",
    "sales",
    "management",
  ];
  const deptRaw = (t.department || "").toLowerCase().trim() as CalendarDepartment;
  const resolvedDept: CalendarDepartment = validDepartments.includes(deptRaw)
    ? deptRaw
    : "personal";

  const eventId = `task-${t.id}`;
  const baseEvent: UnifiedCalendarEvent = {
    id: eventId,
    title: t.title.startsWith("Task:") ? t.title : `Task: ${t.title}`,
    description: t.description || undefined,
    date: dateStr,
    startTime,
    endTime,
    allDay: !explicitTimed,
    category: "task",
    department: resolvedDept,
    customColor: "meetings",
    location: undefined,
    participants: t.assignedTo
      ? [{ id: t.assignedTo.id, name: t.assignedTo.name, email: t.assignedTo.email, rsvp: "attending" }]
      : [],
    status: t.status === "DONE" ? "COMPLETED" : "SCHEDULED",
    sourceType: "task",
    syncStatus: "synced",
    rawSource: t,
  };

  const map = metadataMap ?? getEventMetadataMap();
  return mergeEventWithMetadata(baseEvent, map[eventId]);
}

/**
 * Convert a backend Call into UnifiedCalendarEvent.
 * - Extracts the actual timestamp from `c.date` when present, and computes `endTime` from `c.duration`.
 */
export function convertCallToEvent(
  c: Call,
  metadataMap?: Record<string, LocalEventMetadata>
): UnifiedCalendarEvent {
  const parsedDate = parseDateSafe(c.date);
  const dateStr = c.date ? formatDateKey(parsedDate) : formatDateKey(new Date());

  const explicitTimed = hasExplicitTime(c.date);
  const durationMins = Math.max(15, Number(c.duration) || 30);
  const startTime = explicitTimed && c.date ? extractTime(c.date, "10:00") : "10:00";
  const endTime = addMinutesToTimeStr(startTime, durationMins);

  const eventId = `call-${c.id || `${dateStr}-${c.contactName || "log"}`}`;
  const baseEvent: UnifiedCalendarEvent = {
    id: eventId,
    title: `Call: ${c.contactName || "Client Contact"}`,
    description: c.notes || `Outcome: ${c.outcome} • Duration: ${c.duration} mins`,
    date: dateStr,
    startTime,
    endTime,
    allDay: false,
    category: "call",
    department: "sales",
    customColor: "important",
    participants: c.contactName ? [{ name: c.contactName, rsvp: "attending" }] : [],
    status: "COMPLETED",
    sourceType: "call",
    syncStatus: "synced",
    rawSource: c,
  };

  const map = metadataMap ?? getEventMetadataMap();
  return mergeEventWithMetadata(baseEvent, map[eventId]);
}

// ── Data Loading & Sync State ────────────────────────────────────────────────

export interface LoadCalendarResult {
  events: UnifiedCalendarEvent[];
  rawMeetings: Meeting[];
  rawTasks: Task[];
  rawCalls: Call[];
  isCached: boolean;
  isOffline: boolean;
  error?: string | null;
}

/**
 * Load all calendar data concurrently, distinguishing between:
 * - Live API success (including genuine empty results)
 * - Cached / offline fallback when requests reject or time out
 */
export async function loadCalendarData(): Promise<LoadCalendarResult> {
  const tombstones = getDeletedTombstones();
  const metadataMap = getEventMetadataMap();

  let cachedMeetings: Meeting[] = [];
  let cachedTasks: Task[] = [];
  let cachedCalls: Call[] = [];

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const rawM = localStorage.getItem(STORAGE_KEY_MEETINGS);
      if (rawM) cachedMeetings = JSON.parse(rawM);
      const rawT = localStorage.getItem(STORAGE_KEY_TASKS);
      if (rawT) cachedTasks = JSON.parse(rawT);
      const rawC = localStorage.getItem(STORAGE_KEY_CALLS);
      if (rawC) cachedCalls = JSON.parse(rawC);
    } catch {
      // Ignore malformed cache
    }
  }

  const customEvents = getStoredCustomEvents();

  const [meetingsSettled, tasksSettled, callsSettled] = await Promise.allSettled([
    withTimeoutReject(getMeetings(), 6000),
    withTimeoutReject(fetchTasks({ limit: 100 }), 6000),
    withTimeoutReject(fetchCalls(1), 6000),
  ]);

  const meetingsFailed = meetingsSettled.status === "rejected";
  const tasksFailed = tasksSettled.status === "rejected";
  const callsFailed = callsSettled.status === "rejected";

  const allFailed = meetingsFailed && tasksFailed && callsFailed;
  const anyFailed = meetingsFailed || tasksFailed || callsFailed;

  const liveMeetings: Meeting[] = (
    !meetingsFailed && Array.isArray(meetingsSettled.value)
      ? meetingsSettled.value
      : cachedMeetings
  ).filter((m) => m && m.id && !tombstones.has(String(m.id)));

  const liveTasks: Task[] = (
    !tasksFailed && Array.isArray(tasksSettled.value?.tasks)
      ? tasksSettled.value.tasks
      : cachedTasks
  ).filter((t) => t && t.id && !tombstones.has(`task-${t.id}`));

  const liveCalls: Call[] = (
    !callsFailed && Array.isArray(callsSettled.value?.calls)
      ? callsSettled.value.calls
      : cachedCalls
  ).filter((c) => c && !tombstones.has(`call-${c.id}`));

  // Update caches only when the respective live endpoint succeeded
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      if (!meetingsFailed) {
        localStorage.setItem(STORAGE_KEY_MEETINGS, JSON.stringify(liveMeetings));
      }
      if (!tasksFailed) {
        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(liveTasks));
      }
      if (!callsFailed) {
        localStorage.setItem(STORAGE_KEY_CALLS, JSON.stringify(liveCalls));
      }
    } catch {
      // Ignore quota errors
    }
  }

  const meetingEvents = liveMeetings.map((m) => convertMeetingToEvent(m, metadataMap));
  const taskEvents = liveTasks.map((t) => convertTaskToEvent(t, metadataMap));
  const callEvents = liveCalls.map((c) => convertCallToEvent(c, metadataMap));

  // Deduplicate custom events against synced meeting events by ID
  const meetingIds = new Set(meetingEvents.map((m) => m.id));
  const filteredCustom = customEvents
    .filter((c) => !meetingIds.has(c.id) && !tombstones.has(c.id))
    .map((c) => mergeEventWithMetadata(c, metadataMap[c.id]));

  const allEvents = [...meetingEvents, ...filteredCustom, ...taskEvents, ...callEvents];

  return {
    events: allEvents,
    rawMeetings: liveMeetings,
    rawTasks: liveTasks,
    rawCalls: liveCalls,
    isCached: anyFailed,
    isOffline: allFailed,
    error: allFailed
      ? "Unable to reach calendar server. Showing locally saved schedule."
      : null,
  };
}

// ── Create / Update Calendar Event ───────────────────────────────────────────

export async function saveCalendarEvent(
  eventData: Partial<UnifiedCalendarEvent>,
  editingId?: string | null
): Promise<SaveEventResult> {
  // Normalize recurring instance ID back to its master event ID when editing
  const resolvedEditingId = editingId?.includes("__occ__")
    ? editingId.split("__occ__")[0]
    : editingId;

  const dateStr = eventData.date || formatDateKey(new Date());
  const isAllDay = Boolean(eventData.allDay);
  const startTime = isAllDay ? "00:00" : eventData.startTime || "09:00";
  const endTime = isAllDay ? "23:59" : eventData.endTime || addMinutesToTimeStr(startTime, 60);

  // Route task edits through the Tasks API instead of converting tasks into meetings
  if (
    (resolvedEditingId && resolvedEditingId.startsWith("task-")) ||
    eventData.sourceType === "task"
  ) {
    const rawTaskId = (resolvedEditingId || "").replace(/^task-/, "");
    const cleanTitle = (eventData.title || "Untitled Task").replace(/^Task:\s*/i, "");
    let isTaskSynced = false;

    if (rawTaskId) {
      try {
        const dueIso = isAllDay
          ? new Date(`${dateStr}T00:00:00.000Z`).toISOString()
          : new Date(`${dateStr}T${startTime}:00`).toISOString();
        await updateTask(rawTaskId, {
          title: cleanTitle,
          description: eventData.description ?? null,
          dueDate: dueIso,
        });
        isTaskSynced = true;
      } catch (err) {
        console.warn("Task update failed, persisting metadata locally:", err);
      }
    }

    const taskIdKey = resolvedEditingId || `task-${Date.now()}`;
    saveEventMetadata(taskIdKey, {
      category: eventData.category || "task",
      department: eventData.department || "personal",
      customColor: eventData.customColor,
      room: eventData.room,
      location: eventData.location,
      description: eventData.description,
      recurrence: eventData.recurrence || "none",
      reminder: eventData.reminder || "15m",
      privacy: eventData.privacy || "internal",
      allDay: isAllDay,
      participants: eventData.participants || [],
    });

    const updatedTaskEvent: UnifiedCalendarEvent = {
      id: taskIdKey,
      title: `Task: ${cleanTitle}`,
      description: eventData.description,
      date: dateStr,
      startTime: isAllDay ? "" : startTime,
      endTime: isAllDay ? "" : endTime,
      allDay: isAllDay,
      category: eventData.category || "task",
      department: eventData.department || "personal",
      customColor: eventData.customColor || "meetings",
      location: eventData.location,
      room: eventData.room,
      participants: eventData.participants || [],
      reminder: eventData.reminder || "15m",
      recurrence: eventData.recurrence || "none",
      privacy: eventData.privacy || "internal",
      status: eventData.status || "SCHEDULED",
      sourceType: "task",
      syncStatus: isTaskSynced ? "synced" : "local_only",
    };

    return {
      event: updatedTaskEvent,
      isSynced: isTaskSynced,
      syncStatus: isTaskSynced ? "synced" : "local_only",
      message: isTaskSynced
        ? "Task updated and synced with server"
        : "Task metadata saved locally",
    };
  }

  // Standard Meeting / Custom Event creation & update
  const isoStart = new Date(`${dateStr}T${startTime}:00`).toISOString();
  const isoEnd = new Date(`${dateStr}T${endTime}:00`).toISOString();

  // Preserve both name and email when sending attendee strings to backend
  const attendeeStrings = (eventData.participants || []).map((p) => {
    if (p.name && p.email && p.name !== p.email) {
      return `${p.name} <${p.email}>`;
    }
    return p.email || p.name || "Attendee";
  });

  let backendMeeting: Meeting | null = null;
  let isSynced = false;
  let reminderSynced = false;

  const validProviders = ["google_meet", "zoom", "teams"];
  const normalizedProvider =
    eventData.provider && validProviders.includes(eventData.provider.toLowerCase())
      ? (eventData.provider.toLowerCase() as "google_meet" | "zoom" | "teams")
      : undefined;

  try {
    const payload = {
      title: eventData.title || "New Event",
      date: dateStr,
      startTime: isoStart,
      endTime: isoEnd,
      description: eventData.description,
      location: eventData.location || eventData.room,
      link: eventData.meetingLink,
      meetingLink: eventData.meetingLink,
      status: (eventData.status as any) || "SCHEDULED",
      provider: normalizedProvider,
      attendees: attendeeStrings,
    };

    if (
      resolvedEditingId &&
      !resolvedEditingId.startsWith("seed-") &&
      !resolvedEditingId.startsWith("custom-") &&
      !resolvedEditingId.startsWith("call-")
    ) {
      backendMeeting = await updateMeeting(resolvedEditingId, payload);
    } else {
      backendMeeting = await createMeeting(payload);
    }

    if (backendMeeting && backendMeeting.id) {
      isSynced = true;
      // Sync reminder via confirmed POST /api/meetings/{id}/reminders endpoint
      const reminderMins = parseReminderMinutes(eventData.reminder);
      if (reminderMins !== null) {
        try {
          await createMeetingReminder(backendMeeting.id, reminderMins, "PUSH");
          reminderSynced = true;
        } catch (remErr) {
          console.warn("Meeting created, but reminder sync failed:", remErr);
          reminderSynced = false;
        }
      }
    }
  } catch (err) {
    console.warn("Backend meeting save failed, falling back to local persistence:", err);
    isSynced = false;
  }

  const resolvedId = backendMeeting?.id || resolvedEditingId || `custom-${Date.now()}`;

  // Always persist non-backend UI properties in versioned local metadata keyed by resolvedId
  saveEventMetadata(resolvedId, {
    category: eventData.category || "meeting",
    department: eventData.department || "development",
    customColor: eventData.customColor,
    room: eventData.room,
    location: eventData.location || eventData.room,
    description: eventData.description,
    recurrence: eventData.recurrence || "none",
    reminder: eventData.reminder || "15m",
    privacy: eventData.privacy || "internal",
    allDay: isAllDay,
    participants: eventData.participants || [],
  });

  // If editing replaced a custom-* ID with a real backend ID, clean up the old custom ID
  if (resolvedEditingId && resolvedEditingId !== resolvedId) {
    removeEventMetadata(resolvedEditingId);
  }

  const unified: UnifiedCalendarEvent = {
    id: resolvedId,
    title: eventData.title || "Untitled Event",
    description: eventData.description,
    date: dateStr,
    startTime: isAllDay ? "" : startTime,
    endTime: isAllDay ? "" : endTime,
    allDay: isAllDay,
    category: eventData.category || "meeting",
    department: eventData.department || "development",
    customColor: eventData.customColor,
    location: eventData.location || eventData.room,
    room: eventData.room,
    meetingLink:
      backendMeeting?.joinUrl ||
      backendMeeting?.meetingLink ||
      backendMeeting?.link ||
      eventData.meetingLink,
    provider: eventData.provider || "google_meet",
    participants: eventData.participants || [],
    reminder: eventData.reminder || "15m",
    reminderSynced,
    recurrence: eventData.recurrence || "none",
    privacy: eventData.privacy || "internal",
    status: eventData.status || "SCHEDULED",
    sourceType: isSynced ? "meeting" : "custom",
    syncStatus: isSynced ? "synced" : "pending_sync",
    createdAt: backendMeeting?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Update localStorage caches so reloads immediately reflect the saved event
  const currentCustom = getStoredCustomEvents().filter(
    (e) => e.id !== resolvedId && e.id !== resolvedEditingId
  );
  if (!isSynced) {
    currentCustom.unshift(unified);
  }
  persistCustomEvents(currentCustom);

  if (isSynced && typeof window !== "undefined" && window.localStorage) {
    try {
      const rawM = localStorage.getItem(STORAGE_KEY_MEETINGS);
      const cachedM: Meeting[] = rawM ? JSON.parse(rawM) : [];
      const idx = cachedM.findIndex((m) => m.id === resolvedId);
      const meetingRecord: Meeting = {
        ...(backendMeeting || {}),
        id: resolvedId,
        title: unified.title,
        description: unified.description,
        date: dateStr,
        startTime: isoStart,
        endTime: isoEnd,
        location: unified.location,
        meetingLink: unified.meetingLink,
        provider: unified.provider,
        attendees: (unified.participants || []).map((p) => ({
          id: p.id,
          name: p.name,
          email: p.email,
        })),
      };
      if (idx >= 0) {
        cachedM[idx] = meetingRecord;
      } else {
        cachedM.unshift(meetingRecord);
      }
      localStorage.setItem(STORAGE_KEY_MEETINGS, JSON.stringify(cachedM));
    } catch {
      // Ignore cache update errors
    }
  }

  return {
    event: unified,
    isSynced,
    syncStatus: unified.syncStatus as "synced" | "pending_sync",
    reminderSynced,
    message: isSynced
      ? resolvedEditingId
        ? "Event updated and synced with server"
        : "Event created and synced with server"
      : "Saved locally – waiting for server connection",
  };
}

/**
 * Delete a calendar event from backend (when applicable), custom event storage,
 * cached meeting storage, and local metadata, recording a tombstone so stale caches
 * never resurrect deleted items.
 */
export async function deleteCalendarEvent(
  id: string
): Promise<{ deleted: boolean; isSynced: boolean }> {
  const masterId = id.includes("__occ__") ? id.split("__occ__")[0] : id;

  // Record tombstone immediately so reload never resurrects the event
  addDeletedTombstone(masterId);
  if (id !== masterId) {
    addDeletedTombstone(id);
  }

  // Remove from custom events
  const currentCustom = getStoredCustomEvents();
  const filteredCustom = currentCustom.filter((e) => e.id !== masterId && e.id !== id);
  persistCustomEvents(filteredCustom);

  // Remove from cached meetings
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const rawM = localStorage.getItem(STORAGE_KEY_MEETINGS);
      if (rawM) {
        const parsedM: Meeting[] = JSON.parse(rawM);
        if (Array.isArray(parsedM)) {
          const nextM = parsedM.filter((m) => m && m.id !== masterId && m.id !== id);
          localStorage.setItem(STORAGE_KEY_MEETINGS, JSON.stringify(nextM));
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  // Remove associated local metadata
  removeEventMetadata(masterId);

  // Attempt backend DELETE if it's a server-backed meeting ID
  const isLocalOnlyId =
    masterId.startsWith("custom-") ||
    masterId.startsWith("seed-") ||
    masterId.startsWith("task-") ||
    masterId.startsWith("call-");

  if (!isLocalOnlyId) {
    try {
      await deleteMeeting(masterId);
      return { deleted: true, isSynced: true };
    } catch (err) {
      console.warn("Backend meeting delete failed, tombstone saved locally:", err);
      return { deleted: true, isSynced: false };
    }
  }

  return { deleted: true, isSynced: true };
}

/**
 * Update a participant's RSVP status in local metadata.
 */
export function updateEventParticipantRsvp(
  event: UnifiedCalendarEvent,
  participantIndex: number,
  nextRsvp: ParticipantRsvp
): UnifiedCalendarEvent {
  const masterId = event.masterEventId || event.id;
  const updatedParticipants = (event.participants || []).map((p, idx) =>
    idx === participantIndex ? { ...p, rsvp: nextRsvp } : p
  );

  saveEventMetadata(masterId, {
    participants: updatedParticipants,
  });

  // Also update custom events cache if present
  const custom = getStoredCustomEvents();
  const cIdx = custom.findIndex((e) => e.id === masterId);
  if (cIdx >= 0) {
    custom[cIdx] = { ...custom[cIdx], participants: updatedParticipants };
    persistCustomEvents(custom);
  }

  return {
    ...event,
    participants: updatedParticipants,
  };
}
