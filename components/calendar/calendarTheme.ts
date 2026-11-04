// components/calendar/calendarTheme.ts
// Central design tokens for the Zyoris Calendar module
// Minimalist, professional, soft pastel modern scheduling workspace aesthetic

import type { CalendarCategory, CalendarDepartment, EventColorKey } from "../../types/calendar.ts";

export const CALENDAR_SURFACE_TOKENS = {
  outerBg: "#F4F6F8",
  workspaceBg: "#FFFFFF",
  textPrimary: "#212B36",
  textSecondary: "#637381",
  textMuted: "#919EAB",
  borderPrimary: "#E2E8F0",
  dividerSubtle: "#F1F3F5",
  darkModalBg: "#1C252E",
  darkModalSecondary: "#161C24",
  darkInputBg: "#28323D",
  darkTextPrimary: "#FFFFFF",
  darkTextSecondary: "#AAB4BE",
  coralPrimary: "#FF5630",
  coralAccent: "#FF5630",
  coralHover: "#FF4842",
} as const;

export interface PastelColorPreset {
  id: EventColorKey;
  label: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
  accent: string;
  hoverBg: string;
  badgeBg: string;
}

export const EVENT_COLOR_PRESETS: Record<EventColorKey, PastelColorPreset> = {
  development: {
    id: "development",
    label: "Development",
    bg: "#E4EAFE",
    border: "#C7D3FC",
    text: "#3B52B5",
    dot: "#667EEA",
    accent: "#667EEA",
    hoverBg: "#D8E1FD",
    badgeBg: "#D2DCFC",
  },
  design: {
    id: "design",
    label: "Design",
    bg: "#FFF0E6",
    border: "#FCD9C2",
    text: "#B85E19",
    dot: "#F2994A",
    accent: "#F2994A",
    hoverBg: "#FCE5D6",
    badgeBg: "#FADBC6",
  },
  meetings: {
    id: "meetings",
    label: "Meetings",
    bg: "#E0F5F1",
    border: "#BCE8DF",
    text: "#1E7866",
    dot: "#2CA58D",
    accent: "#2CA58D",
    hoverBg: "#D2EFEA",
    badgeBg: "#C6EBE4",
  },
  personal: {
    id: "personal",
    label: "Personal",
    bg: "#F3E8FF",
    border: "#E2C9FE",
    text: "#7B34C4",
    dot: "#A855F7",
    accent: "#A855F7",
    hoverBg: "#EAD8FE",
    badgeBg: "#E3CDFD",
  },
  important: {
    id: "important",
    label: "Important",
    bg: "#FDE8E8",
    border: "#F9CACA",
    text: "#B53838",
    dot: "#E85D5D",
    accent: "#E85D5D",
    hoverBg: "#FBDADA",
    badgeBg: "#F8CECE",
  },
  interview: {
    id: "interview",
    label: "Interviews",
    bg: "#F0EAFE",
    border: "#DDD1FA",
    text: "#644496",
    dot: "#7657A8",
    accent: "#7657A8",
    hoverBg: "#E6DCFC",
    badgeBg: "#E2D5FA",
  },
  holiday: {
    id: "holiday",
    label: "Holidays",
    bg: "#FFF5DE",
    border: "#FCE9B8",
    text: "#8C6A24",
    dot: "#D99B26",
    accent: "#D99B26",
    hoverBg: "#FCEECB",
    badgeBg: "#FCE3A7",
  },
};

export interface CategoryThemeToken {
  id: CalendarCategory;
  label: string;
  bg: string;          // Pastel background
  border: string;      // Subtle matching border
  text: string;        // Dark readable accent text
  dot: string;         // Accent dot / bar indicator
  accent: string;      // Alias for dot / accent bar
  hoverBg: string;     // Hover background
  badgeBg: string;     // Subtle pill badge background
}

export const PASTEL_CATEGORY_TOKENS: Record<CalendarCategory, CategoryThemeToken> = {
  meeting: {
    id: "meeting",
    label: "Meetings",
    bg: "#E4EAFE",
    border: "#C7D3FC",
    text: "#3B52B5",
    dot: "#667EEA",
    accent: "#667EEA",
    hoverBg: "#D8E1FD",
    badgeBg: "#D2DCFC",
  },
  call: {
    id: "call",
    label: "Calls",
    bg: "#FDE8E8",
    border: "#F9CACA",
    text: "#B53838",
    dot: "#E85D5D",
    accent: "#E85D5D",
    hoverBg: "#FBDADA",
    badgeBg: "#F8CECE",
  },
  task: {
    id: "task",
    label: "Tasks",
    bg: "#E0F5F1",
    border: "#BCE8DF",
    text: "#1E7866",
    dot: "#2CA58D",
    accent: "#2CA58D",
    hoverBg: "#D2EFEA",
    badgeBg: "#C6EBE4",
  },
  interview: {
    id: "interview",
    label: "Interviews",
    bg: "#F3E8FF",
    border: "#E2C9FE",
    text: "#7B34C4",
    dot: "#A855F7",
    accent: "#A855F7",
    hoverBg: "#EAD8FE",
    badgeBg: "#E3CDFD",
  },
  deadline: {
    id: "deadline",
    label: "Deadlines",
    bg: "#FFF0E6",
    border: "#FCD9C2",
    text: "#B85E19",
    dot: "#F2994A",
    accent: "#F2994A",
    hoverBg: "#FCE5D6",
    badgeBg: "#FADBC6",
  },
  out_of_office: {
    id: "out_of_office",
    label: "Out of Office",
    bg: "#E0F5F1",
    border: "#BCE8DF",
    text: "#1E7866",
    dot: "#2CA58D",
    accent: "#2CA58D",
    hoverBg: "#D2EFEA",
    badgeBg: "#C6EBE4",
  },
  holiday: {
    id: "holiday",
    label: "Holidays",
    bg: "#FFF5DE",
    border: "#FCE9B8",
    text: "#8C6A24",
    dot: "#D99B26",
    accent: "#D99B26",
    hoverBg: "#FCEECB",
    badgeBg: "#FCE3A7",
  },
  event: {
    id: "event",
    label: "Events",
    bg: "#E4EAFE",
    border: "#C7D3FC",
    text: "#3B52B5",
    dot: "#667EEA",
    accent: "#667EEA",
    hoverBg: "#D8E1FD",
    badgeBg: "#D2DCFC",
  },
};

export const DEPARTMENT_CALENDAR_TOKENS: Record<
  CalendarDepartment,
  { id: CalendarDepartment; label: string; dot: string; color: string; bg: string; text: string }
> = {
  personal: {
    id: "personal",
    label: "Personal",
    dot: "#A855F7",
    color: "#A855F7",
    bg: "#F3E8FF",
    text: "#7B34C4",
  },
  company: {
    id: "company",
    label: "Company-Wide",
    dot: "#FF5630",
    color: "#FF5630",
    bg: "#FDE8E8",
    text: "#B53838",
  },
  development: {
    id: "development",
    label: "Development",
    dot: "#667EEA",
    color: "#667EEA",
    bg: "#E4EAFE",
    text: "#3B52B5",
  },
  hr: {
    id: "hr",
    label: "HR & People",
    dot: "#2CA58D",
    color: "#2CA58D",
    bg: "#E0F5F1",
    text: "#1E7866",
  },
  marketing: {
    id: "marketing",
    label: "Design & Marketing",
    dot: "#F2994A",
    color: "#F2994A",
    bg: "#FFF0E6",
    text: "#B85E19",
  },
  sales: {
    id: "sales",
    label: "Sales & Client",
    dot: "#E85D5D",
    color: "#E85D5D",
    bg: "#FDE8E8",
    text: "#B53838",
  },
  management: {
    id: "management",
    label: "Management",
    dot: "#637381",
    color: "#637381",
    bg: "#F1F3F5",
    text: "#212B36",
  },
};

/**
 * Deterministic event color resolver.
 * Priority:
 * 1. Explicit `customColor` preset (e.g., "development", "design", "meetings", "personal", "important")
 * 2. Event `category` token
 * 3. Fallback to "meeting" token
 */
export function getCategoryToken(
  category?: string | null,
  customColor?: string | null
): CategoryThemeToken {
  if (customColor) {
    const colorKey = customColor.toLowerCase().trim() as EventColorKey;
    const preset = EVENT_COLOR_PRESETS[colorKey];
    if (preset) {
      const catId = (category?.toLowerCase().trim() as CalendarCategory) || "meeting";
      return {
        id: catId,
        label: preset.label,
        bg: preset.bg,
        border: preset.border,
        text: preset.text,
        dot: preset.dot,
        accent: preset.accent,
        hoverBg: preset.hoverBg,
        badgeBg: preset.badgeBg,
      };
    }
  }

  if (!category) return PASTEL_CATEGORY_TOKENS.meeting;
  const key = category.toLowerCase().trim() as CalendarCategory;
  return PASTEL_CATEGORY_TOKENS[key] || PASTEL_CATEGORY_TOKENS.meeting;
}

/** Format year highlight badge */
export const YEAR_BADGE_STYLE = {
  background: "#F4F6F8",
  color: "#212B36",
  borderColor: "#E2E8F0",
};
