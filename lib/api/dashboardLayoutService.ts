// lib/api/dashboardLayoutService.ts
// Mock service for the Dashboard Builder layout CRUD.
// Day 1: localStorage persistence.
// Future: Replace with GET /dashboard/layout and POST /dashboard/layout

import { WidgetInstance } from "@/types/dashboard-builder";

const STORAGE_KEY = "dashboard-builder-layout";

const DEFAULT_LAYOUT: WidgetInstance[] = [
  { widgetId: "kpi-revenue", instanceId: "inst-kpi-revenue-1", x: 0, y: 0, w: 2, h: 1 },
  { widgetId: "kpi-leads", instanceId: "inst-kpi-leads-1", x: 2, y: 0, w: 2, h: 1 },
  {
    widgetId: "chart-revenue",
    instanceId: "inst-chart-revenue-1",
    x: 0,
    y: 1,
    w: 4,
    h: 2,
  },
  {
    widgetId: "activity-feed",
    instanceId: "inst-activity-1",
    x: 0,
    y: 3,
    w: 4,
    h: 2,
  },
];

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch the current dashboard layout.
 * Falls back to DEFAULT_LAYOUT if nothing is stored or if storage is corrupted.
 */
export async function getDashboardLayout(): Promise<WidgetInstance[]> {
  await delay(300);
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Corrupted storage -- fall through to default
  }
  return DEFAULT_LAYOUT.map((w) => ({ ...w }));
}

/**
 * Persist the current dashboard layout to localStorage.
 */
export async function saveDashboardLayout(widgets: WidgetInstance[]): Promise<void> {
  await delay(200);
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

/**
 * Remove the stored layout so the next load returns the default.
 */
export async function resetDashboardLayout(): Promise<void> {
  await delay(200);
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
