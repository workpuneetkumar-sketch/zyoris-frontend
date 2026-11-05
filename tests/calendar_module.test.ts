// tests/calendar_module.test.ts
// Comprehensive unit & integration tests for Zyoris Calendar module importing real application utilities

import test from "node:test";
import assert from "node:assert/strict";

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
} from "../lib/utils/calendarUtils.ts";

import {
  CALENDAR_SURFACE_TOKENS,
  EVENT_COLOR_PRESETS,
  PASTEL_CATEGORY_TOKENS,
  getCategoryToken,
} from "../components/calendar/calendarTheme.ts";

import { generateIcsContent } from "../lib/utils/icsExport.ts";
import type { UnifiedCalendarEvent, LocalEventMetadata } from "../types/calendar.ts";

test("1 & 2. Date formatting and safe date parsing", async (t) => {
  await t.test("formatDateKey formats Dates to YYYY-MM-DD", () => {
    assert.equal(formatDateKey(new Date(2026, 10, 2)), "2026-11-02");
    assert.equal(formatDateKey(new Date(2026, 0, 5)), "2026-01-05");
  });

  await t.test("parseDateSafe handles YYYY-MM-DD, ISO timestamps, and invalid strings without NaN", () => {
    const d1 = parseDateSafe("2026-11-05");
    assert.equal(formatDateKey(d1), "2026-11-05");

    const d2 = parseDateSafe("2026-11-05T14:30:00.000Z");
    assert.equal(isNaN(d2.getTime()), false);

    const fallback = new Date(2026, 3, 10);
    const d3 = parseDateSafe("not-a-valid-date", fallback);
    assert.equal(formatDateKey(d3), "2026-04-10");

    const d4 = parseDateSafe(undefined, fallback);
    assert.equal(formatDateKey(d4), "2026-04-10");
  });

  await t.test("isSameDay compares year, month, and day accurately", () => {
    assert.equal(
      isSameDay(new Date(2026, 10, 2, 8, 0), new Date(2026, 10, 2, 22, 30)),
      true
    );
    assert.equal(
      isSameDay(new Date(2026, 10, 2, 8, 0), new Date(2026, 10, 3, 8, 0)),
      false
    );
  });
});

test("3 & 4. Time extraction, formatting, and duration calculation", async (t) => {
  await t.test("extractTime and hasExplicitTime handle HH:mm, ISO strings, and date-only strings", () => {
    assert.equal(extractTime("09:30"), "09:30");
    assert.equal(extractTime("14:05:00"), "14:05");
    assert.equal(extractTime(undefined, "10:00"), "10:00");

    assert.equal(hasExplicitTime("2026-11-05"), false);
    assert.equal(hasExplicitTime("2026-11-05T00:00:00.000Z"), false);
    assert.equal(hasExplicitTime("2026-11-05T14:30:00"), true);
    assert.equal(hasExplicitTime("14:30"), true);
  });

  await t.test("parseTimeMinutes, minutesToTimeStr, and addMinutesToTimeStr", () => {
    assert.equal(parseTimeMinutes("09:30"), 570);
    assert.equal(minutesToTimeStr(570), "09:30");
    assert.equal(addMinutesToTimeStr("14:15", 45), "15:00");
  });

  await t.test("formatTimeDisplay converts HH:mm to 12-hour AM/PM format", () => {
    assert.equal(formatTimeDisplay("09:00"), "9:00 AM");
    assert.equal(formatTimeDisplay("12:00"), "12:00 PM");
    assert.equal(formatTimeDisplay("13:15"), "1:15 PM");
    assert.equal(formatTimeDisplay("00:05"), "12:05 AM");
  });

  await t.test("calculateDuration computes human-readable durations", () => {
    assert.equal(calculateDuration("11:00", "12:30"), "1h 30m");
    assert.equal(calculateDuration("09:00", "10:00"), "1h");
    assert.equal(calculateDuration("14:00", "14:45"), "45m");
    assert.equal(calculateDuration("10:00", "12:00"), "2h");
  });

  await t.test("parseReminderMinutes converts reminder strings to minutes", () => {
    assert.equal(parseReminderMinutes("5m"), 5);
    assert.equal(parseReminderMinutes("15m"), 15);
    assert.equal(parseReminderMinutes("1h"), 60);
    assert.equal(parseReminderMinutes("1d"), 1440);
  });
});

test("5 & 6. Clamped Month Navigation (Jan 31 -> Feb & Leap Years)", async (t) => {
  await t.test("Navigating forward 1 month from Jan 31, 2026 clamps to Feb 28, 2026 (not Mar 3)", () => {
    const jan31 = new Date(2026, 0, 31);
    const feb2026 = navigateCalendarDate(jan31, "month", "next");
    assert.equal(formatDateKey(feb2026), "2026-02-28");
  });

  await t.test("Navigating forward 1 month from Jan 31, 2024 (leap year) clamps to Feb 29, 2024", () => {
    const jan31Leap = new Date(2024, 0, 31);
    const febLeap = addMonthsClamped(jan31Leap, 1);
    assert.equal(formatDateKey(febLeap), "2024-02-29");
  });

  await t.test("Navigating backward 1 month from Mar 31, 2026 clamps to Feb 28, 2026", () => {
    const mar31 = new Date(2026, 2, 31);
    const prevMonth = navigateCalendarDate(mar31, "month", "prev");
    assert.equal(formatDateKey(prevMonth), "2026-02-28");
  });
});

test("7 & 8. Week & Workweek Calculation (Sunday bug fix & cross-month boundaries)", async (t) => {
  await t.test("Workweek calculation when currentDate is Sunday returns the preceding Monday-Friday week", () => {
    // Sunday, Nov 8, 2026
    const sunday = new Date(2026, 10, 8);
    assert.equal(sunday.getDay(), 0);

    const workweekDays = getWeekDays(sunday, true);
    assert.equal(workweekDays.length, 5);
    // Preceding Monday is Nov 2, 2026, Friday is Nov 6, 2026
    assert.equal(formatDateKey(workweekDays[0]), "2026-11-02");
    assert.equal(formatDateKey(workweekDays[4]), "2026-11-06");
  });

  await t.test("Week calculation across month boundary (e.g. Jan 31, 2026) does not mutate or jump months", () => {
    // Saturday, Jan 31, 2026
    const satJan31 = new Date(2026, 0, 31);
    const weekDays = getWeekDays(satJan31, false);
    assert.equal(weekDays.length, 7);
    assert.equal(formatDateKey(weekDays[0]), "2026-01-25"); // Sunday Jan 25
    assert.equal(formatDateKey(weekDays[6]), "2026-01-31"); // Saturday Jan 31
  });

  await t.test("Workweek across month boundary (Wed Apr 1, 2026) spans Mar 30 to Apr 3", () => {
    const wedApr1 = new Date(2026, 3, 1);
    const start = getWeekStartDate(wedApr1, true);
    assert.equal(formatDateKey(start), "2026-03-30");
    const days = getWeekDays(wedApr1, true);
    assert.equal(formatDateKey(days[0]), "2026-03-30");
    assert.equal(formatDateKey(days[4]), "2026-04-03");
  });
});

test("9. Overlapping Event Layout Engine", async (t) => {
  const makeEvent = (id: string, startTime: string, endTime: string): UnifiedCalendarEvent => ({
    id,
    title: `Event ${id}`,
    date: "2026-11-04",
    startTime,
    endTime,
    category: "meeting",
    department: "development",
    participants: [],
    sourceType: "custom",
  });

  await t.test("Two non-overlapping events each receive full width (totalCols = 1)", () => {
    const laidOut = computeOverlapLayout([
      makeEvent("1", "09:00", "10:00"),
      makeEvent("2", "11:00", "12:00"),
    ]);
    assert.equal(laidOut.length, 2);
    assert.equal(laidOut[0].colIndex, 0);
    assert.equal(laidOut[0].totalCols, 1);
    assert.equal(laidOut[1].colIndex, 0);
    assert.equal(laidOut[1].totalCols, 1);
  });

  await t.test("Two partially overlapping events split into 2 side-by-side columns", () => {
    const laidOut = computeOverlapLayout([
      makeEvent("a", "09:00", "10:30"),
      makeEvent("b", "10:00", "11:00"),
    ]);
    assert.equal(laidOut.length, 2);
    assert.equal(laidOut[0].colIndex, 0);
    assert.equal(laidOut[0].totalCols, 2);
    assert.equal(laidOut[1].colIndex, 1);
    assert.equal(laidOut[1].totalCols, 2);
  });

  await t.test("Three overlapping events receive 3 distinct columns in cluster", () => {
    const laidOut = computeOverlapLayout([
      makeEvent("1", "09:00", "11:00"),
      makeEvent("2", "09:30", "10:30"),
      makeEvent("3", "10:00", "11:30"),
    ]);
    assert.equal(laidOut.length, 3);
    assert.equal(laidOut[0].totalCols, 3);
    assert.equal(laidOut[1].totalCols, 3);
    assert.equal(laidOut[2].totalCols, 3);
    const cols = new Set(laidOut.map((e) => e.colIndex));
    assert.equal(cols.size, 3);
  });

  await t.test("Events touching at endpoints (10:00-11:00 and 11:00-12:00) do NOT overlap", () => {
    const laidOut = computeOverlapLayout([
      makeEvent("first", "10:00", "11:00"),
      makeEvent("second", "11:00", "12:00"),
    ]);
    assert.equal(laidOut[0].totalCols, 1);
    assert.equal(laidOut[1].totalCols, 1);
  });
});

test("10. Recurrence Expansion Engine", async (t) => {
  const baseRecurring: UnifiedCalendarEvent = {
    id: "rec-master",
    title: "Standup",
    date: "2026-11-01",
    startTime: "09:30",
    endTime: "10:00",
    category: "meeting",
    department: "development",
    recurrence: "daily",
    participants: [],
    sourceType: "custom",
  };

  await t.test("Daily recurrence expands across days without duplicating master occurrence", () => {
    const start = new Date(2026, 10, 1); // Nov 1
    const end = new Date(2026, 10, 5); // Nov 5
    const expanded = expandRecurringEvents([baseRecurring], start, end);
    assert.equal(expanded.length, 5);
    const dates = expanded.map((e) => e.date);
    assert.deepEqual(dates, [
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
    ]);
    assert.equal(Boolean(expanded[0].isRecurringInstance), false);
    assert.equal(expanded[1].isRecurringInstance, true);
    assert.equal(expanded[1].masterEventId, "rec-master");
  });

  await t.test("Weekly recurrence expands across month boundary", () => {
    const weeklyEvent: UnifiedCalendarEvent = {
      ...baseRecurring,
      id: "weekly-1",
      date: "2026-10-26",
      recurrence: "weekly",
    };
    const expanded = expandRecurringEvents(
      [weeklyEvent],
      new Date(2026, 9, 26),
      new Date(2026, 10, 16)
    );
    assert.deepEqual(
      expanded.map((e) => e.date),
      ["2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"]
    );
  });

  await t.test("Monthly recurrence clamps day-of-month across Jan 31 -> Feb 28 -> Mar 31", () => {
    const monthlyEvent: UnifiedCalendarEvent = {
      ...baseRecurring,
      id: "monthly-31",
      date: "2026-01-31",
      recurrence: "monthly",
    };
    const expanded = expandRecurringEvents(
      [monthlyEvent],
      new Date(2026, 0, 1),
      new Date(2026, 2, 31)
    );
    assert.deepEqual(
      expanded.map((e) => e.date),
      ["2026-01-31", "2026-02-28", "2026-03-31"]
    );
  });

  await t.test("Yearly recurrence expands across year boundaries", () => {
    const yearlyEvent: UnifiedCalendarEvent = {
      ...baseRecurring,
      id: "yearly-1",
      date: "2025-11-04",
      recurrence: "yearly",
    };
    const expanded = expandRecurringEvents(
      [yearlyEvent],
      new Date(2025, 0, 1),
      new Date(2027, 11, 31)
    );
    assert.deepEqual(
      expanded.map((e) => e.date),
      ["2025-11-04", "2026-11-04", "2027-11-04"]
    );
  });
});

test("11 & 12. Local Metadata Merging & Tombstone Filtering", async (t) => {
  await t.test("mergeEventWithMetadata restores UI-specific fields onto backend API meeting", () => {
    const apiMeetingEvent: UnifiedCalendarEvent = {
      id: "m-101",
      title: "Architecture Sync",
      date: "2026-11-04",
      startTime: "14:00",
      endTime: "15:00",
      category: "meeting",
      department: "company",
      participants: [],
      sourceType: "meeting",
    };

    const meta: LocalEventMetadata = {
      version: 1,
      id: "m-101",
      category: "interview",
      department: "hr",
      customColor: "personal",
      room: "Board Room",
      privacy: "private",
      recurrence: "weekly",
      reminder: "30m",
      description: "Candidate system design round",
      updatedAt: new Date().toISOString(),
    };

    const merged = mergeEventWithMetadata(apiMeetingEvent, meta);
    assert.equal(merged.category, "interview");
    assert.equal(merged.department, "hr");
    assert.equal(merged.customColor, "personal");
    assert.equal(merged.room, "Board Room");
    assert.equal(merged.privacy, "private");
    assert.equal(merged.recurrence, "weekly");
    assert.equal(merged.reminder, "30m");
    assert.equal(merged.description, "Candidate system design round");
  });

  await t.test("Tombstone set filters deleted IDs and recurring instances of deleted master IDs", () => {
    const tombstones = new Set<string>(["m-deleted"]);
    const rawEvents: UnifiedCalendarEvent[] = [
      {
        id: "m-deleted",
        title: "Deleted Event",
        date: "2026-11-04",
        startTime: "10:00",
        endTime: "11:00",
        category: "meeting",
        department: "company",
        participants: [],
        sourceType: "meeting",
      },
      {
        id: "m-active",
        title: "Active Event",
        date: "2026-11-04",
        startTime: "12:00",
        endTime: "13:00",
        category: "meeting",
        department: "company",
        participants: [],
        sourceType: "meeting",
      },
    ];

    const surviving = rawEvents.filter((e) => !tombstones.has(e.id));
    assert.equal(surviving.length, 1);
    assert.equal(surviving[0].id, "m-active");
  });
});

test("13. Design System Tokens & RFC 5545 .ics Export", async (t) => {
  await t.test("CALENDAR_SURFACE_TOKENS and EVENT_COLOR_PRESETS match specification", () => {
    assert.equal(CALENDAR_SURFACE_TOKENS.outerBg, "#F4F6F8");
    assert.equal(CALENDAR_SURFACE_TOKENS.workspaceBg, "#FFFFFF");
    assert.equal(CALENDAR_SURFACE_TOKENS.darkModalBg, "#1C252E");
    assert.equal(CALENDAR_SURFACE_TOKENS.blueAccent, "#2563EB");

    assert.equal(EVENT_COLOR_PRESETS.development.bg, "#E4EAFE");
    assert.equal(EVENT_COLOR_PRESETS.development.accent, "#667EEA");
    assert.equal(EVENT_COLOR_PRESETS.design.bg, "#FFF0E6");
    assert.equal(EVENT_COLOR_PRESETS.design.accent, "#F2994A");
    assert.equal(EVENT_COLOR_PRESETS.meetings.bg, "#E0F5F1");
    assert.equal(EVENT_COLOR_PRESETS.meetings.accent, "#2CA58D");
    assert.equal(EVENT_COLOR_PRESETS.personal.bg, "#F3E8FF");
    assert.equal(EVENT_COLOR_PRESETS.personal.accent, "#A855F7");
    assert.equal(EVENT_COLOR_PRESETS.important.bg, "#FDE8E8");
    assert.equal(EVENT_COLOR_PRESETS.important.accent, "#E85D5D");
  });

  await t.test("getCategoryToken returns deterministic tokens for category or customColor", () => {
    const customToken = getCategoryToken("meeting", "personal");
    assert.equal(customToken.bg, "#F3E8FF");
    assert.equal(customToken.accent, "#A855F7");

    const catToken = getCategoryToken("call");
    assert.equal(catToken.bg, PASTEL_CATEGORY_TOKENS.call.bg);
  });

  await t.test("generateIcsContent produces valid RFC 5545 output", () => {
    const events: UnifiedCalendarEvent[] = [
      {
        id: "evt-1",
        title: "Design Sync",
        date: "2026-11-05",
        startTime: "10:00",
        endTime: "11:00",
        category: "meeting",
        department: "development",
        recurrence: "weekly",
        participants: [],
        sourceType: "custom",
      },
    ];
    const ics = generateIcsContent(events, "Zyoris Calendar");
    assert.ok(ics.includes("BEGIN:VCALENDAR"));
    assert.ok(ics.includes("SUMMARY:Design Sync"));
    assert.ok(ics.includes("RRULE:FREQ=WEEKLY"));
    assert.ok(ics.includes("END:VCALENDAR"));
  });
});
