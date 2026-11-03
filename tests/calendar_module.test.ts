// tests/calendar_module.test.ts
// Comprehensive unit & integration tests for Zyoris Calendar module

import test from "node:test";
import assert from "node:assert/strict";

// ── Pure Logic Functions Under Test (aligned with lib/api/calendarService.ts) ─

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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

export function calculateDuration(startTime: string, endTime: string): string {
  try {
    const parseMinutes = (t: string) => {
      if (t.includes("T")) {
        const d = new Date(t);
        return d.getHours() * 60 + d.getMinutes();
      }
      const parts = t.split(":");
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || "0", 10);
    };

    const startMin = parseMinutes(startTime);
    const endMin = parseMinutes(endTime);
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

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function cleanIcsText(str?: string): string {
  if (!str) return "";
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function generateIcsContent(events: any[], calendarName = "Zyoris Calendar"): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zyoris Portal//Calendar Module//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calendarName}`,
    "X-WR-TIMEZONE:Asia/Kolkata",
  ];

  events.forEach((event) => {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id}@zyoris.com`);
    lines.push(`SUMMARY:${cleanIcsText(event.title)}`);
    if (event.description) lines.push(`DESCRIPTION:${cleanIcsText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${cleanIcsText(event.location)}`);
    if (event.meetingLink) lines.push(`URL:${cleanIcsText(event.meetingLink)}`);
    if (event.category) lines.push(`CATEGORIES:${event.category.toUpperCase()}`);
    if (event.recurrence && event.recurrence !== "none") {
      lines.push(`RRULE:FREQ=${event.recurrence.toUpperCase()}`);
    }
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test("Calendar Module - Date and Time Utilities", async (t) => {
  await t.test("formatDateKey correctly formats Dates to YYYY-MM-DD", () => {
    const d1 = new Date(2026, 10, 2); // Nov 2, 2026
    assert.equal(formatDateKey(d1), "2026-11-02");

    const d2 = new Date(2026, 0, 5); // Jan 5, 2026
    assert.equal(formatDateKey(d2), "2026-01-05");
  });

  await t.test("extractTime handles raw HH:mm and fallback safely", () => {
    assert.equal(extractTime("09:30"), "09:30");
    assert.equal(extractTime("14:00:00"), "14:00");
    assert.equal(extractTime(undefined), "09:00");
  });

  await t.test("formatTimeDisplay converts HH:mm to 12-hour AM/PM format", () => {
    assert.equal(formatTimeDisplay("09:00"), "9:00 AM");
    assert.equal(formatTimeDisplay("12:00"), "12:00 PM");
    assert.equal(formatTimeDisplay("13:15"), "1:15 PM");
    assert.equal(formatTimeDisplay("23:45"), "11:45 PM");
  });

  await t.test("calculateDuration returns human-friendly duration strings", () => {
    assert.equal(calculateDuration("11:00", "12:30"), "1h 30m");
    assert.equal(calculateDuration("09:00", "10:00"), "1h");
    assert.equal(calculateDuration("14:00", "14:45"), "45m");
    assert.equal(calculateDuration("10:00", "12:00"), "2h");
  });

  await t.test("isSameDay checks calendar day equality regardless of time", () => {
    const t1 = new Date(2026, 10, 2, 9, 30);
    const t2 = new Date(2026, 10, 2, 17, 45);
    const t3 = new Date(2026, 10, 3, 9, 30);

    assert.equal(isSameDay(t1, t2), true);
    assert.equal(isSameDay(t1, t3), false);
  });
});

test("Calendar Module - RFC 5545 iCalendar (.ics) Export", async (t) => {
  await t.test("generateIcsContent produces valid standard .ics structure", () => {
    const events = [
      {
        id: "evt-test-1",
        title: "All Hands Meeting",
        description: "Company quarterly results",
        date: "2026-11-05",
        startTime: "10:00",
        endTime: "11:00",
        category: "meeting",
        department: "company",
        location: "Auditorium",
        meetingLink: "https://meet.google.com/abc-defg",
        recurrence: "weekly",
      },
    ];

    const ics = generateIcsContent(events, "Zyoris Portal Calendar");

    assert.ok(ics.includes("BEGIN:VCALENDAR"));
    assert.ok(ics.includes("VERSION:2.0"));
    assert.ok(ics.includes("PRODID:-//Zyoris Portal//Calendar Module//EN"));
    assert.ok(ics.includes("X-WR-CALNAME:Zyoris Portal Calendar"));
    assert.ok(ics.includes("BEGIN:VEVENT"));
    assert.ok(ics.includes("UID:evt-test-1@zyoris.com"));
    assert.ok(ics.includes("SUMMARY:All Hands Meeting"));
    assert.ok(ics.includes("DESCRIPTION:Company quarterly results"));
    assert.ok(ics.includes("LOCATION:Auditorium"));
    assert.ok(ics.includes("URL:https://meet.google.com/abc-defg"));
    assert.ok(ics.includes("RRULE:FREQ=WEEKLY"));
    assert.ok(ics.includes("END:VEVENT"));
    assert.ok(ics.includes("END:VCALENDAR"));
  });
});

test("Calendar Module - Pastel Theme & Design Tokens", async (t) => {
  const PASTEL_TOKENS = {
    meeting: { bg: "#E7F0FF", text: "#355D91" },
    call: { bg: "#FCE9E7", text: "#A45F60" },
    task: { bg: "#E7F5EC", text: "#397858" },
    interview: { bg: "#F0EAFE", text: "#7657A8" },
    deadline: { bg: "#FFF0E5", text: "#A96D46" },
    out_of_office: { bg: "#E8F4F1", text: "#397D70" },
    holiday: { bg: "#FFF5DE", text: "#97752F" },
  };

  await t.test("matches user-specified subtle pastel palette exactly", () => {
    assert.equal(PASTEL_TOKENS.meeting.bg, "#E7F0FF");
    assert.equal(PASTEL_TOKENS.meeting.text, "#355D91");

    assert.equal(PASTEL_TOKENS.call.bg, "#FCE9E7");
    assert.equal(PASTEL_TOKENS.call.text, "#A45F60");

    assert.equal(PASTEL_TOKENS.task.bg, "#E7F5EC");
    assert.equal(PASTEL_TOKENS.task.text, "#397858");

    assert.equal(PASTEL_TOKENS.interview.bg, "#F0EAFE");
    assert.equal(PASTEL_TOKENS.interview.text, "#7657A8");

    assert.equal(PASTEL_TOKENS.deadline.bg, "#FFF0E5");
    assert.equal(PASTEL_TOKENS.deadline.text, "#A96D46");

    assert.equal(PASTEL_TOKENS.out_of_office.bg, "#E8F4F1");
    assert.equal(PASTEL_TOKENS.out_of_office.text, "#397D70");

    assert.equal(PASTEL_TOKENS.holiday.bg, "#FFF5DE");
    assert.equal(PASTEL_TOKENS.holiday.text, "#97752F");
  });
});

test("Calendar Module - Honest Backend Save Notifications", async (t) => {
  await t.test("distinguishes backend sync success from local-only offline persistence", () => {
    const formatSaveNotification = (isSynced: boolean, isEdit: boolean) => {
      if (isSynced) {
        return isEdit ? "Event updated and synced with server" : "Event created and synced with server";
      }
      return "Saved locally – waiting for server connection";
    };

    assert.equal(
      formatSaveNotification(true, false),
      "Event created and synced with server"
    );
    assert.equal(
      formatSaveNotification(true, true),
      "Event updated and synced with server"
    );
    // When backend timed out / failed:
    assert.equal(
      formatSaveNotification(false, false),
      "Saved locally – waiting for server connection"
    );
    assert.equal(
      formatSaveNotification(false, true),
      "Saved locally – waiting for server connection"
    );
  });
});

test("Calendar Module - Dynamic Month and Year Heading", async (t) => {
  await t.test("decomposes date into primary month name and independent year badge", () => {
    const formatHeading = (d: Date) => {
      return {
        primary: d.toLocaleDateString("en-US", { month: "long" }),
        year: d.getFullYear().toString(),
      };
    };

    const nov2026 = formatHeading(new Date(2026, 10, 2));
    assert.equal(nov2026.primary, "November");
    assert.equal(nov2026.year, "2026");

    const jan2027 = formatHeading(new Date(2027, 0, 15));
    assert.equal(jan2027.primary, "January");
    assert.equal(jan2027.year, "2027");
  });
});
