// components/notes/noteStyles.ts
// Shared color palette + styling helpers for the Notes feature.

export interface NoteColor {
  name: string;
  value: string | null;
}

// Extended palette — the note's `color` value is stored on the backend
// as a hex string (e.g. "#6366f1") or `null` for the default surface.
export const NOTE_COLORS: NoteColor[] = [
  { name: "Default", value: null },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Slate", value: "#64748b" },
];

/** Convert a hex color (#rgb or #rrggbb) to an rgba() string. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const int = parseInt(full, 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}

export interface NoteSurfaceStyle {
  background: string;
  borderColor: string;
}

/**
 * Soft tinted background + border for a note card / writing surface.
 * Notes without a color get a clean white→slate gradient.
 */
export function getNoteSurfaceStyle(
  color: string | null | undefined
): NoteSurfaceStyle {
  if (!color) {
    return {
      background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
      borderColor: "#e2e8f0",
    };
  }
  return {
    background: `linear-gradient(145deg, ${hexToRgba(color, 0.16)} 0%, ${hexToRgba(
      color,
      0.05
    )} 100%)`,
    borderColor: hexToRgba(color, 0.35),
  };
}
