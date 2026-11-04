// lib/utils/calendarUtils.ts
// Pure, deterministic calendar utilities for date math, overlap layout, recurrence expansion,
// time conversion, and metadata merging.

import type {
  CalendarViewType,
  UnifiedCalendarEvent,
  PositionedCalendarEvent,
  LocalEventMetadata,
} from "../../types/calendar.ts";

/** Format a Date into local YYYY-MM-DD */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Safely parse a YYYY-MM-DD string, ISO timestamp, or Date into a local Date object
 * without UTC midnight date-shift issues.
 */
export function parseDateSafe(
  dateInput?: string | Date | null,
  fallbackDate?: Date
): Date {
  const defaultFallback = fallbackDate ? new Date(fallbackDate.getTime()) : new Date();
  if (!dateInput) return defaultFallback;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? defaultFallback : new Date(dateInput.getTime());
  }
  const str = String(dateInput).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed;
    const [y, m, d] = str.split("T")[0].split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? defaultFallback : fallback;
}

/** Check if two Date objects fall on the same local calendar day */
export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/** Determine whether a date/time string carries an explicit time of day */
export function hasExplicitTime(timeOrIso?: string | null): boolean {
  if (!timeOrIso) return false;
  const s = timeOrIso.trim();
  if (/^\d{1,2}:\d{2}/.test(s)) return true;
  if (s.includes("T")) {
    // Check if it is midnight UTC from a date-only conversion (e.g. T00:00:00.000Z)
    if (/T00:00(:00(\.000)?)?Z?$/.test(s)) {
      return false;
    }
    const d = new Date(s);
    return !isNaN(d.getTime());
  }
  return false;
}

/** Extract HH:mm from an ISO string or time string */
export function extractTime(timeStr?: string | null, fallback = "09:00"): string {
  if (!timeStr) return fallback;
  const trimmed = timeStr.trim();
  if (trimmed.includes("T")) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  }
  if (/^\d{1,2}:\d{2}/.test(trimmed)) {
    const [h, m] = trimmed.split(":");
    const hourNum = Math.max(0, Math.min(23, parseInt(h, 10) || 0));
    const minNum = Math.max(0, Math.min(59, parseInt(m.substring(0, 2), 10) || 0));
    return `${String(hourNum).padStart(2, "0")}:${String(minNum).padStart(2, "0")}`;
  }
  return fallback;
}

/** Convert HH:mm or ISO string into minutes since midnight (0 - 1439) */
export function parseTimeMinutes(timeStr?: string | null): number {
  if (!timeStr) return 0;
  const trimmed = timeStr.trim();
  if (trimmed.includes("T")) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes();
    }
  }
  const parts = trimmed.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt((parts[1] || "0").substring(0, 2), 10);
  if (isNaN(h)) return 0;
  return Math.max(0, Math.min(24 * 60, h * 60 + (isNaN(m) ? 0 : m)));
}

/** Convert minutes since midnight into HH:mm */
export function minutesToTimeStr(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Add duration in minutes to a HH:mm start time, clamped within the day */
export function addMinutesToTimeStr(startTime: string, durationMinutes: number): string {
  const startMins = parseTimeMinutes(startTime);
  const safeDuration = Math.max(5, Number(durationMinutes) || 30);
  return minutesToTimeStr(startMins + safeDuration);
}

/** Format HH:mm or ISO time string for human display (e.g. "9:30 AM") */
export function formatTimeDisplay(timeStr?: string | null): string {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  if (!trimmed) return "";
  if (trimmed.includes("T")) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  }
  if (/^\d{1,2}:\d{2}/.test(trimmed)) {
    const [hStr, mStr] = trimmed.split(":");
    const h = parseInt(hStr, 10);
    const m = mStr.substring(0, 2);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m} ${ampm}`;
  }
  return trimmed;
}

/** Calculate human-readable duration between two times */
export function calculateDuration(
  startTime?: string | null,
  endTime?: string | null,
  allDay?: boolean
): string {
  if (allDay || (!startTime && !endTime)) return "All day";
  if (!startTime || !endTime) return "All day";
  try {
    const startMin = parseTimeMinutes(startTime);
    const endMin = parseTimeMinutes(endTime);
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

/** Parse reminder shorthand ("5m", "15m", "30m", "1h", "1d") into minutesBefore number */
export function parseReminderMinutes(reminder?: string | null): number | null {
  if (!reminder) return null;
  const r = reminder.trim().toLowerCase();
  if (r === "none" || r === "0" || r === "0m") return null;
  const match = r.match(/^(\d+)\s*(m|min|mins|h|hr|hrs|d|day|days)$/);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  if (unit.startsWith("m")) return val;
  if (unit.startsWith("h")) return val * 60;
  if (unit.startsWith("d")) return val * 1440;
  return null;
}

/**
 * Add or subtract months without overflowing across month boundaries.
 * Example: Jan 31 + 1 month -> Feb 28 (or Feb 29 in a leap year).
 */
export function addMonthsClamped(date: Date, deltaMonths: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const targetFirst = new Date(year, month + deltaMonths, 1);
  const maxDaysInTargetMonth = new Date(
    targetFirst.getFullYear(),
    targetFirst.getMonth() + 1,
    0
  ).getDate();

  const clampedDay = Math.min(day, maxDaysInTargetMonth);
  return new Date(
    targetFirst.getFullYear(),
    targetFirst.getMonth(),
    clampedDay,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  );
}

/**
 * Navigate calendar date immutably for any view ("month", "week", "workweek", "day", "schedule").
 */
export function navigateCalendarDate(
  currentDate: Date,
  view: CalendarViewType,
  direction: "prev" | "next" | -1 | 1
): Date {
  const step = direction === "next" || direction === 1 ? 1 : -1;
  if (view === "month" || view === "schedule") {
    return addMonthsClamped(currentDate, step);
  }
  if (view === "week" || view === "workweek") {
    return new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + step * 7
    );
  }
  return new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate() + step
  );
}

/**
 * Compute the start of the week immutably.
 * - For standard week (`isWorkweek = false`): Sunday of the current week.
 * - For workweek (`isWorkweek = true`): Monday of the current ISO week
 *   (When `date` is Sunday, returns the preceding Monday of that same week, not the next week's Monday).
 */
export function getWeekStartDate(date: Date, isWorkweek = false): Date {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  if (isWorkweek) {
    const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    return new Date(y, m, d + offsetToMonday);
  }
  return new Date(y, m, d - dayOfWeek);
}

/**
 * Generate the array of Dates for a Week (7 days, Sun-Sat) or Workweek (5 days, Mon-Fri).
 */
export function getWeekDays(date: Date, isWorkweek = false): Date[] {
  const start = getWeekStartDate(date, isWorkweek);
  const count = isWorkweek ? 5 : 7;
  const days: Date[] = [];
  for (let i = 0; i < count; i++) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return days;
}

/**
 * Compute side-by-side column positions (`colIndex`, `totalCols`, `leftPct`, `widthPct`)
 * for overlapping timed events on a single day.
 *
 * Rules:
 * - Events that touch at endpoints (`a.endMinutes === b.startMinutes`) do NOT overlap.
 * - Transitive overlaps belong to the same connected cluster and share a common `totalCols` denominator.
 */
export function computeOverlapLayout(events: UnifiedCalendarEvent[]): PositionedCalendarEvent[] {
  const timedEvents = events.filter((e) => !e.allDay && Boolean(e.startTime));
  if (timedEvents.length === 0) return [];

  interface InternalItem {
    event: UnifiedCalendarEvent;
    startMinutes: number;
    endMinutes: number;
    colIndex: number;
  }

  const items: InternalItem[] = timedEvents.map((evt) => {
    const startMinutes = parseTimeMinutes(evt.startTime);
    const rawEnd = evt.endTime ? parseTimeMinutes(evt.endTime) : startMinutes + 30;
    const endMinutes = rawEnd > startMinutes ? rawEnd : startMinutes + 30;
    return {
      event: evt,
      startMinutes,
      endMinutes,
      colIndex: 0,
    };
  });

  // Sort by start time ascending, then longer duration first, then ID for determinism
  items.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    const durA = a.endMinutes - a.startMinutes;
    const durB = b.endMinutes - b.startMinutes;
    if (durB !== durA) return durB - durA;
    return a.event.id.localeCompare(b.event.id);
  });

  const results: PositionedCalendarEvent[] = [];

  // Partition into connected overlap clusters
  let cluster: InternalItem[] = [];
  let clusterMaxEnd = -1;

  const flushCluster = (group: InternalItem[]) => {
    if (group.length === 0) return;
    // Track end time of last event placed in each column
    const columnEndTimes: number[] = [];

    for (const item of group) {
      let placedCol = -1;
      for (let c = 0; c < columnEndTimes.length; c++) {
        // Non-strict inequality: if previous event ends at 10:00 and this starts at 10:00, reuse column
        if (columnEndTimes[c] <= item.startMinutes) {
          placedCol = c;
          columnEndTimes[c] = item.endMinutes;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = columnEndTimes.length;
        columnEndTimes.push(item.endMinutes);
      }
      item.colIndex = placedCol;
    }

    const totalCols = Math.max(1, columnEndTimes.length);
    const widthPct = Number((100 / totalCols).toFixed(4));

    for (const item of group) {
      results.push({
        event: item.event,
        startMinutes: item.startMinutes,
        endMinutes: item.endMinutes,
        colIndex: item.colIndex,
        totalCols,
        leftPct: Number((item.colIndex * widthPct).toFixed(4)),
        widthPct,
      });
    }
  };

  for (const item of items) {
    if (cluster.length === 0) {
      cluster.push(item);
      clusterMaxEnd = item.endMinutes;
    } else if (item.startMinutes < clusterMaxEnd) {
      // Overlaps with the current connected cluster
      cluster.push(item);
      if (item.endMinutes > clusterMaxEnd) {
        clusterMaxEnd = item.endMinutes;
      }
    } else {
      // Disjoint from previous cluster (item.startMinutes >= clusterMaxEnd)
      flushCluster(cluster);
      cluster = [item];
      clusterMaxEnd = item.endMinutes;
    }
  }
  flushCluster(cluster);

  return results;
}

/**
 * Expand recurring events ("daily", "weekly", "monthly", "yearly") within a bounded date range
 * `[rangeStart, rangeEnd]`.
 *
 * - Preserves the master event on its original start date.
 * - Generates deterministic occurrence IDs (`${id}__occ__${YYYY-MM-DD}`).
 * - Handles month-end clamping (e.g., Jan 31 -> Feb 28/29 -> Mar 31) and leap-year Feb 29 dates.
 * - Prevents duplicate occurrences and infinite loops.
 */
export function expandRecurringEvents(
  events: UnifiedCalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): UnifiedCalendarEvent[] {
  const startBound = new Date(
    rangeStart.getFullYear(),
    rangeStart.getMonth(),
    rangeStart.getDate(),
    0,
    0,
    0,
    0
  );
  const endBound = new Date(
    rangeEnd.getFullYear(),
    rangeEnd.getMonth(),
    rangeEnd.getDate(),
    23,
    59,
    59,
    999
  );

  if (endBound.getTime() < startBound.getTime()) {
    return events;
  }

  const expanded: UnifiedCalendarEvent[] = [];
  const seenKeys = new Set<string>();
  const MAX_OCCURRENCES_PER_EVENT = 366;

  for (const evt of events) {
    if (!evt.date) continue;
    const masterId = evt.masterEventId || evt.id;
    const masterDate = parseDateSafe(evt.date);
    const masterDateNormalized = new Date(
      masterDate.getFullYear(),
      masterDate.getMonth(),
      masterDate.getDate()
    );
    const masterKey = `${masterId}::${formatDateKey(masterDateNormalized)}`;

    // Always include original event so filtering or direct lookups work
    if (!seenKeys.has(masterKey)) {
      seenKeys.add(masterKey);
      expanded.push(evt);
    }

    const recurrence = evt.recurrence || "none";
    if (recurrence === "none" || evt.isRecurringInstance) {
      continue;
    }

    const masterYear = masterDateNormalized.getFullYear();
    const masterMonth = masterDateNormalized.getMonth();
    const masterDay = masterDateNormalized.getDate();

    let step = 1;
    let generatedCount = 0;

    while (generatedCount < MAX_OCCURRENCES_PER_EVENT) {
      let nextDate: Date;

      if (recurrence === "daily") {
        nextDate = new Date(masterYear, masterMonth, masterDay + step);
      } else if (recurrence === "weekly") {
        nextDate = new Date(masterYear, masterMonth, masterDay + step * 7);
      } else if (recurrence === "monthly") {
        const targetFirst = new Date(masterYear, masterMonth + step, 1);
        const maxDays = new Date(
          targetFirst.getFullYear(),
          targetFirst.getMonth() + 1,
          0
        ).getDate();
        nextDate = new Date(
          targetFirst.getFullYear(),
          targetFirst.getMonth(),
          Math.min(masterDay, maxDays)
        );
      } else if (recurrence === "yearly") {
        const targetYear = masterYear + step;
        const maxDays = new Date(targetYear, masterMonth + 1, 0).getDate();
        nextDate = new Date(targetYear, masterMonth, Math.min(masterDay, maxDays));
      } else {
        break;
      }

      step++;

      if (nextDate.getTime() > endBound.getTime()) {
        break;
      }

      if (nextDate.getTime() >= startBound.getTime()) {
        const occDateStr = formatDateKey(nextDate);
        const dedupKey = `${masterId}::${occDateStr}`;
        if (!seenKeys.has(dedupKey)) {
          seenKeys.add(dedupKey);
          expanded.push({
            ...evt,
            id: `${masterId}__occ__${occDateStr}`,
            masterEventId: masterId,
            isRecurringInstance: true,
            date: occDateStr,
          });
          generatedCount++;
        }
      }
    }
  }

  return expanded;
}

/**
 * Merge a backend-loaded event with persisted local metadata without overwriting authoritative
 * server fields (id, title, date, startTime, endTime, meetingLink, status).
 */
export function mergeEventWithMetadata(
  serverEvent: UnifiedCalendarEvent,
  meta?: LocalEventMetadata | null
): UnifiedCalendarEvent {
  if (!meta) return serverEvent;
  return {
    ...serverEvent,
    category: meta.category || serverEvent.category,
    department: meta.department || serverEvent.department,
    customColor: meta.customColor ?? serverEvent.customColor,
    room: meta.room ?? serverEvent.room,
    location: serverEvent.location || meta.location || meta.room,
    description: serverEvent.description || meta.description,
    recurrence: meta.recurrence || serverEvent.recurrence || "none",
    reminder: meta.reminder || serverEvent.reminder || "15m",
    privacy: meta.privacy || serverEvent.privacy || "internal",
    allDay: meta.allDay ?? serverEvent.allDay,
    participants:
      serverEvent.participants && serverEvent.participants.length > 0
        ? serverEvent.participants.map((sp) => {
            const matched = meta.participants?.find(
              (mp) =>
                (mp.email && sp.email && mp.email.toLowerCase() === sp.email.toLowerCase()) ||
                mp.name.toLowerCase() === sp.name.toLowerCase()
            );
            return matched ? { ...sp, ...matched } : sp;
          })
        : meta.participants || [],
  };
}
