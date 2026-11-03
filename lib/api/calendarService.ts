import { getMeetings, createMeeting, updateMeeting, Meeting } from "@/lib/api/meetingsApi";
import { fetchTasks, Task } from "@/lib/api/tasksApi";
import { fetchCalls, Call } from "@/lib/api/callsApi";
import { UnifiedCalendarEvent, CalendarDepartment, CalendarCategory, SaveEventResult } from "@/types/calendar";

const STORAGE_KEY_MEETINGS = "zyoris_calendar_meetings_cache";
const STORAGE_KEY_CUSTOM = "zyoris_calendar_custom_events";
const STORAGE_KEY_CALLS = "zyoris_calendar_calls_cache";
const STORAGE_KEY_TASKS = "zyoris_calendar_tasks_cache";

/** Helper to format Date into YYYY-MM-DD */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Helper to parse ISO or time string into HH:mm */
export function extractTime(timeStr?: string): string {
  if (!timeStr) return "09:00";
  if (timeStr.includes("T")) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  }
  if (/^\d{1,2}:\d{2}/.test(timeStr)) {
    const [h, m] = timeStr.split(":");
    return `${h.padStart(2, "0")}:${m.substring(0, 2)}`;
  }
  return timeStr;
}

/** Helper to format time for display (e.g., 09:30 AM) */
export function formatTimeDisplay(timeStr?: string): string {
  if (!timeStr) return "";
  if (timeStr.includes("T")) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  }
  if (/^\d{1,2}:\d{2}/.test(timeStr)) {
    const [hStr, mStr] = timeStr.split(":");
    const h = parseInt(hStr, 10);
    const m = mStr.substring(0, 2);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m} ${ampm}`;
  }
  return timeStr;
}

/** Calculate duration in minutes between two HH:mm or ISO times */
export function calculateDuration(startTime: string, endTime: string): string {
  try {
    let startMin = 0;
    let endMin = 60;

    const parseMinutes = (t: string) => {
      if (t.includes("T")) {
        const d = new Date(t);
        return d.getHours() * 60 + d.getMinutes();
      }
      const parts = t.split(":");
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || "0", 10);
    };

    startMin = parseMinutes(startTime);
    endMin = parseMinutes(endTime);

    const diff = Math.max(15, endMin - startMin);
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;

    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  } catch {
    return "1h";
  }
}

/** Check if two dates represent the same calendar day */
export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/** Fast timeout wrapper for network requests */
function withTimeout<T>(promise: Promise<T>, ms: number = 6000, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** Seed demo calendar items representing real company schedules */
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
      room: "Conference Room 1",
      provider: "google_meet",
      meetingLink: "https://meet.google.com/zyo-des-rev",
      participants: [
        { name: "John Doe", email: "john@zyoris.com", rsvp: "attending" },
        { name: "Silvia Vance", email: "silvia@zyoris.com", rsvp: "attending" },
        { name: "Moulika Sanyal", email: "moulika@zyoris.com", rsvp: "attending" },
      ],
      reminder: "15m",
      privacy: "internal",
      status: "SCHEDULED",
      sourceType: "custom",
    },
    {
      id: "seed-2",
      title: "One to One with Silvia",
      description: "Bi-weekly sprint progress check and architectural feedback",
      date: makeDate(0),
      startTime: "13:45",
      endTime: "15:00",
      category: "interview",
      department: "personal",
      room: "Interview Room",
      provider: "zoom",
      meetingLink: "https://zoom.us/j/9876543210",
      participants: [
        { name: "Silvia Vance", email: "silvia@zyoris.com", rsvp: "attending" },
        { name: "Admin", email: "admin@zyoris.com", rsvp: "attending" },
      ],
      reminder: "10m",
      privacy: "private",
      status: "SCHEDULED",
      sourceType: "custom",
    },
    {
      id: "seed-3",
      title: "Sprint Planning & Standup",
      description: "All-hands technical sprint planning for Q4 roadmap",
      date: makeDate(1),
      startTime: "10:00",
      endTime: "11:00",
      category: "meeting",
      department: "development",
      room: "Board Room",
      provider: "teams",
      meetingLink: "https://teams.microsoft.com/l/meetup-join/zyoris-sprint",
      participants: [
        { name: "Dev Team", email: "dev-team@zyoris.com", rsvp: "attending" },
        { name: "Product Manager", email: "pm@zyoris.com", rsvp: "attending" },
      ],
      reminder: "15m",
      privacy: "internal",
      status: "SCHEDULED",
      sourceType: "custom",
    },
    {
      id: "seed-4",
      title: "Client Demonstration - Enterprise CRM",
      description: "Live demonstration of Zyoris AI Agents and Communication Hub",
      date: makeDate(2),
      startTime: "15:00",
      endTime: "16:00",
      category: "meeting",
      department: "sales",
      room: "Conference Room 2",
      provider: "google_meet",
      meetingLink: "https://meet.google.com/zyo-demo-sale",
      participants: [
        { name: "Enterprise Prospect", email: "lead@client.com", rsvp: "attending" },
        { name: "Sales Lead", email: "sales@zyoris.com", rsvp: "attending" },
      ],
      reminder: "30m",
      privacy: "internal",
      status: "SCHEDULED",
      sourceType: "custom",
    },
    {
      id: "seed-5",
      title: "Team Out of Office - Training Session",
      description: "Quarterly security and compliance certification workshop",
      date: makeDate(4),
      startTime: "09:00",
      endTime: "17:00",
      category: "out_of_office",
      department: "hr",
      location: "Main Auditorium / Virtual",
      participants: [
        { name: "All Employees", email: "team@zyoris.com", rsvp: "attending" },
      ],
      reminder: "1d",
      privacy: "public",
      status: "SCHEDULED",
      sourceType: "custom",
    },
  ];
}

/** Read custom local events stored by the user */
export function getStoredCustomEvents(): UnifiedCalendarEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM);
    if (!raw) {
      const seeds = getSeedEvents();
      localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(seeds));
      return seeds;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Save custom events to localStorage */
export function persistCustomEvents(events: UnifiedCalendarEvent[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(events));
  } catch (e) {
    console.error("Failed to persist custom calendar events", e);
  }
}

/** Convert a backend Meeting into UnifiedCalendarEvent */
export function convertMeetingToEvent(m: Meeting): UnifiedCalendarEvent {
  const dateStr = m.date
    ? m.date.includes("T")
      ? m.date.split("T")[0]
      : m.date
    : m.startTime
    ? m.startTime.split("T")[0]
    : formatDateKey(new Date());

  const attendeesList = Array.isArray(m.attendees)
    ? m.attendees.map((a: any) =>
        typeof a === "string"
          ? { name: a, email: a.includes("@") ? a : undefined, rsvp: "attending" as const }
          : { name: a.name || a.email || "Guest", email: a.email, rsvp: "attending" as const }
      )
    : [];

  return {
    id: m.id || `meeting-${Date.now()}`,
    title: m.title || "Untitled Meeting",
    description: m.description,
    date: dateStr,
    startTime: extractTime(m.startTime),
    endTime: extractTime(m.endTime || m.startTime),
    category: ((m as any).category as CalendarCategory) || "meeting",
    department: ((m as any).department as CalendarDepartment) || "development",
    room: (m as any).room || m.location,
    location: m.location,
    meetingLink: m.joinUrl || m.link || m.meetingLink,
    provider: m.provider || "google_meet",
    participants: attendeesList,
    reminder: m.reminder || "15m",
    recurrence: ((m as any).recurrence as any) || "none",
    privacy: ((m as any).privacy as any) || "internal",
    status: (m.status as any) || "SCHEDULED",
    sourceType: "meeting",
    rawSource: m,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

/** Convert a backend Task into UnifiedCalendarEvent */
export function convertTaskToEvent(t: Task): UnifiedCalendarEvent {
  const dateStr = t.dueDate
    ? t.dueDate.includes("T")
      ? t.dueDate.split("T")[0]
      : t.dueDate
    : formatDateKey(new Date(t.createdAt || Date.now()));

  return {
    id: `task-${t.id}`,
    title: `Task: ${t.title}`,
    description: t.description || undefined,
    date: dateStr,
    startTime: "09:00",
    endTime: "10:00",
    category: "task",
    department: (t.department as CalendarDepartment) || "personal",
    location: undefined,
    participants: t.assignedTo ? [{ name: t.assignedTo.name, email: t.assignedTo.email }] : [],
    status: t.status === "DONE" ? "COMPLETED" : "SCHEDULED",
    sourceType: "task",
    rawSource: t,
  };
}

/** Convert a backend Call into UnifiedCalendarEvent */
export function convertCallToEvent(c: Call): UnifiedCalendarEvent {
  const dateStr = c.date
    ? c.date.includes("T")
      ? c.date.split("T")[0]
      : c.date
    : formatDateKey(new Date());

  return {
    id: `call-${c.id || Math.random()}`,
    title: `Call: ${c.contactName || "Client Contact"}`,
    description: c.notes || `Outcome: ${c.outcome} • Duration: ${c.duration} mins`,
    date: dateStr,
    startTime: "14:00",
    endTime: "14:30",
    category: "call",
    department: "sales",
    participants: c.contactName ? [{ name: c.contactName }] : [],
    status: "COMPLETED",
    sourceType: "call",
    rawSource: c,
  };
}

export interface LoadCalendarResult {
  events: UnifiedCalendarEvent[];
  rawMeetings: Meeting[];
  rawTasks: Task[];
  rawCalls: Call[];
  isCached: boolean;
  error?: string | null;
}

/** Load all calendar data with offline fallback and safe timeouts */
export async function loadCalendarData(): Promise<LoadCalendarResult> {
  let cachedMeetings: Meeting[] = [];
  let cachedTasks: Task[] = [];
  let cachedCalls: Call[] = [];

  // Read client-side storage first
  if (typeof window !== "undefined") {
    try {
      const rawM = localStorage.getItem(STORAGE_KEY_MEETINGS);
      if (rawM) cachedMeetings = JSON.parse(rawM);
      const rawT = localStorage.getItem(STORAGE_KEY_TASKS);
      if (rawT) cachedTasks = JSON.parse(rawT);
      const rawC = localStorage.getItem(STORAGE_KEY_CALLS);
      if (rawC) cachedCalls = JSON.parse(rawC);
    } catch {}
  }

  const customEvents = getStoredCustomEvents();

  // Fetch concurrently with timeouts so backend latency never freezes UI
  const [meetingsSettled, tasksSettled, callsSettled] = await Promise.allSettled([
    withTimeout(getMeetings(), 5000, []),
    withTimeout(fetchTasks({ limit: 100 }), 5000, { tasks: [], total: 0 }),
    withTimeout(fetchCalls(1), 5000, { calls: [], total: 0 }),
  ]);

  const liveMeetings: Meeting[] =
    meetingsSettled.status === "fulfilled" && Array.isArray(meetingsSettled.value)
      ? meetingsSettled.value
      : cachedMeetings;

  const liveTasks: Task[] =
    tasksSettled.status === "fulfilled" && Array.isArray(tasksSettled.value?.tasks)
      ? tasksSettled.value.tasks
      : cachedTasks;

  const liveCalls: Call[] =
    callsSettled.status === "fulfilled" && Array.isArray(callsSettled.value?.calls)
      ? callsSettled.value.calls
      : cachedCalls;

  // Cache latest fetched responses
  if (typeof window !== "undefined") {
    try {
      if (liveMeetings.length > 0) {
        localStorage.setItem(STORAGE_KEY_MEETINGS, JSON.stringify(liveMeetings));
      }
      if (liveTasks.length > 0) {
        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(liveTasks));
      }
      if (liveCalls.length > 0) {
        localStorage.setItem(STORAGE_KEY_CALLS, JSON.stringify(liveCalls));
      }
    } catch {}
  }

  // Combine unified events
  const meetingEvents = liveMeetings.map(convertMeetingToEvent);
  const taskEvents = liveTasks.map(convertTaskToEvent);
  const callEvents = liveCalls.map(convertCallToEvent);

  // Deduplicate custom events against meeting events by ID
  const meetingIds = new Set(meetingEvents.map((m) => m.id));
  const filteredCustom = customEvents.filter((c) => !meetingIds.has(c.id));

  const allEvents = [...meetingEvents, ...filteredCustom, ...taskEvents, ...callEvents];

  return {
    events: allEvents,
    rawMeetings: liveMeetings,
    rawTasks: liveTasks,
    rawCalls: liveCalls,
    isCached: meetingsSettled.status === "rejected" || tasksSettled.status === "rejected",
  };
}

/** Create or update calendar event with backend sync + client persistence */
export async function saveCalendarEvent(
  eventData: Partial<UnifiedCalendarEvent>,
  editingId?: string | null
): Promise<SaveEventResult> {
  const dateStr = eventData.date || formatDateKey(new Date());
  const startTime = eventData.startTime || "09:00";
  const endTime = eventData.endTime || "10:00";

  const isoStart = dateStr && startTime ? new Date(`${dateStr}T${startTime}:00`).toISOString() : new Date().toISOString();
  const isoEnd = dateStr && endTime ? new Date(`${dateStr}T${endTime}:00`).toISOString() : new Date().toISOString();

  const attendeeNames = (eventData.participants || []).map((p) => p.name || p.email || "Attendee");

  let backendMeeting: Meeting | null = null;
  let isSynced = false;

  // Attempt backend save if it's a meeting
  try {
    const payload = {
      title: eventData.title || "New Event",
      date: dateStr,
      startTime: isoStart,
      endTime: isoEnd,
      description: eventData.description,
      location: eventData.room || eventData.location,
      link: eventData.meetingLink,
      meetingLink: eventData.meetingLink,
      reminder: eventData.reminder || "15m",
      status: (eventData.status as any) || "SCHEDULED",
      provider: (eventData.provider as any) || "google_meet",
      attendees: attendeeNames,
    };

    if (editingId && !editingId.startsWith("seed-") && !editingId.startsWith("custom-")) {
      backendMeeting = await updateMeeting(editingId, payload);
    } else {
      backendMeeting = await createMeeting(payload);
    }
    if (backendMeeting) {
      isSynced = true;
    }
  } catch (err) {
    console.warn("Backend save failed, falling back to local persistence:", err);
    isSynced = false;
  }

  const resolvedId = backendMeeting?.id || editingId || `custom-${Date.now()}`;

  const unified: UnifiedCalendarEvent = {
    id: resolvedId,
    title: eventData.title || "Untitled Event",
    description: eventData.description,
    date: dateStr,
    startTime: startTime,
    endTime: endTime,
    category: eventData.category || "meeting",
    department: eventData.department || "development",
    location: eventData.location,
    room: eventData.room,
    meetingLink: eventData.meetingLink,
    provider: eventData.provider || "google_meet",
    participants: eventData.participants || [],
    reminder: eventData.reminder || "15m",
    recurrence: eventData.recurrence || "none",
    privacy: eventData.privacy || "internal",
    status: eventData.status || "SCHEDULED",
    sourceType: "custom",
    syncStatus: isSynced ? "synced" : "pending_sync",
    createdAt: new Date().toISOString(),
  };

  // Update localStorage custom events
  const current = getStoredCustomEvents();
  const existingIdx = current.findIndex((e) => e.id === resolvedId);
  if (existingIdx >= 0) {
    current[existingIdx] = unified;
  } else {
    current.unshift(unified);
  }
  persistCustomEvents(current);

  return {
    event: unified,
    isSynced,
    syncStatus: unified.syncStatus as "synced" | "pending_sync",
    message: isSynced
      ? (editingId ? "Event updated and synced with server" : "Event created and synced with server")
      : "Saved locally – waiting for server connection",
  };
}

/** Delete calendar event */
export async function deleteCalendarEvent(id: string): Promise<boolean> {
  const current = getStoredCustomEvents();
  const filtered = current.filter((e) => e.id !== id);
  persistCustomEvents(filtered);
  return true;
}
