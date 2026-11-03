// components/calendar/calendarTheme.ts
// Central design tokens for the Zyoris Calendar module
// Minimalist, professional, soft pastel modern office aesthetic

import { CalendarCategory } from "@/types/calendar";

export interface CategoryThemeToken {
  id: CalendarCategory;
  label: string;
  bg: string;          // Pastel background
  border: string;      // Subtle matching border
  text: string;        // Dark readable accent text
  dot: string;         // Accent dot indicator
  hoverBg: string;     // Hover background
  badgeBg: string;     // Subtle pill badge background
}

export const PASTEL_CATEGORY_TOKENS: Record<CalendarCategory, CategoryThemeToken> = {
  meeting: {
    id: "meeting",
    label: "Meetings",
    bg: "#E7F0FF",
    border: "#C5DAFD",
    text: "#355D91",
    dot: "#355D91",
    hoverBg: "#DBE8FC",
    badgeBg: "#D8E6FC",
  },
  call: {
    id: "call",
    label: "Calls",
    bg: "#FCE9E7",
    border: "#F6CBC8",
    text: "#A45F60",
    dot: "#A45F60",
    hoverBg: "#F8DDDA",
    badgeBg: "#F6D6D4",
  },
  task: {
    id: "task",
    label: "Tasks",
    bg: "#E7F5EC",
    border: "#C6E7D2",
    text: "#397858",
    dot: "#397858",
    hoverBg: "#DBECE2",
    badgeBg: "#D3EDDC",
  },
  interview: {
    id: "interview",
    label: "Interviews",
    bg: "#F0EAFE",
    border: "#DDD1FA",
    text: "#7657A8",
    dot: "#7657A8",
    hoverBg: "#E6DCFC",
    badgeBg: "#E2D5FA",
  },
  deadline: {
    id: "deadline",
    label: "Deadlines",
    bg: "#FFF0E5",
    border: "#FCDCC6",
    text: "#A96D46",
    dot: "#A96D46",
    hoverBg: "#FCE6D7",
    badgeBg: "#FCDDC7",
  },
  out_of_office: {
    id: "out_of_office",
    label: "Out of Office",
    bg: "#E8F4F1",
    border: "#C8E7E0",
    text: "#397D70",
    dot: "#397D70",
    hoverBg: "#DBECE8",
    badgeBg: "#D2EAE4",
  },
  holiday: {
    id: "holiday",
    label: "Holidays",
    bg: "#FFF5DE",
    border: "#FCE9B8",
    text: "#97752F",
    dot: "#97752F",
    hoverBg: "#FCEECB",
    badgeBg: "#FCE3A7",
  },
  event: {
    id: "event",
    label: "Events",
    bg: "#E7F0FF",
    border: "#C5DAFD",
    text: "#355D91",
    dot: "#355D91",
    hoverBg: "#DBE8FC",
    badgeBg: "#D8E6FC",
  },
};

/** Get the token for an event category, falling back gracefully */
export function getCategoryToken(category?: string | null): CategoryThemeToken {
  if (!category) return PASTEL_CATEGORY_TOKENS.meeting;
  const key = category.toLowerCase().trim() as CalendarCategory;
  return PASTEL_CATEGORY_TOKENS[key] || PASTEL_CATEGORY_TOKENS.meeting;
}

/** Format year highlight badge */
export const YEAR_BADGE_STYLE = {
  background: "#E7F0FF",
  color: "#355D91",
  borderColor: "#C5DAFD",
};
