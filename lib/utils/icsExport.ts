// lib/utils/icsExport.ts
// RFC 5545 iCalendar (.ics) generator for exporting calendar events

import { UnifiedCalendarEvent } from "@/types/calendar";

function formatIcsDateTime(dateStr: string, timeStr?: string): string {
  try {
    let d: Date;
    if (timeStr && timeStr.includes("T")) {
      d = new Date(timeStr);
    } else if (dateStr && timeStr && /^\d{2}:\d{2}/.test(timeStr)) {
      d = new Date(`${dateStr}T${timeStr}:00`);
    } else if (dateStr) {
      d = new Date(dateStr);
    } else {
      d = new Date();
    }

    if (isNaN(d.getTime())) {
      d = new Date();
    }

    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  } catch {
    return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }
}

function cleanIcsText(str?: string): string {
  if (!str) return "";
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function generateIcsContent(events: UnifiedCalendarEvent[], calendarName: string = "Zyoris Calendar"): string {
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
    const uid = `${event.id}@zyoris.com`;
    const dtStamp = formatIcsDateTime(new Date().toISOString());
    const dtStart = formatIcsDateTime(event.date, event.startTime);
    const dtEnd = formatIcsDateTime(event.date, event.endTime || event.startTime);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${cleanIcsText(event.title)}`);

    if (event.description) {
      lines.push(`DESCRIPTION:${cleanIcsText(event.description)}`);
    }

    if (event.location || event.room) {
      lines.push(`LOCATION:${cleanIcsText(event.room || event.location)}`);
    }

    if (event.meetingLink) {
      lines.push(`URL:${cleanIcsText(event.meetingLink)}`);
    }

    if (event.category) {
      lines.push(`CATEGORIES:${event.category.toUpperCase()}`);
    }

    if (event.recurrence && event.recurrence !== "none") {
      const freq = event.recurrence.toUpperCase();
      lines.push(`RRULE:FREQ=${freq}`);
    }

    if (event.status) {
      lines.push(`STATUS:${event.status}`);
    }

    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcsFile(events: UnifiedCalendarEvent[], filename: string = "zyoris-calendar.ics") {
  const content = generateIcsContent(events);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
