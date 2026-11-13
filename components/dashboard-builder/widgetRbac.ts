// components/dashboard-builder/widgetRbac.ts
// Pure helper functions and permission mappings for dashboard widgets and KPI cards.
// Isolated from JSX components to enable direct unit testing in Node.

import type { WidgetInstance } from "@/types/dashboard-builder";

export const WIDGET_PERMISSION_MAP: Record<string, string[]> = {
  "executive-dashboard": ["dashboard.view"],
  "analytics": ["analytics.view"],
  "inventory-risk": ["analytics.view"],
  "pipeline": ["deals.view", "crm.view"],
  "conversion-rate": ["analytics.view", "deals.view"],
  "crm": ["crm.view", "leads.view"],
  "activities": ["crm.view", "leads.view", "activities.view"],
  "cash-flow": ["finance.view"],
  "revenue": ["finance.view"],
  "hr": ["employees.view", "hr.view"],
  "attendance": ["attendance.view", "hr.view"],
  "projects": ["projects.view"],
  "tasks": ["tasks.view"],
  "communications": ["communication.access"],
  "marketing": ["marketing.view", "campaigns.view"],
  "ai-insights": ["ai_copilot.access", "crm.view"],
};

export const KPI_PERMISSION_MAP: Record<string, string[]> = {
  "leads-count": ["leads.view", "crm.view"],
  "total-deal-value": ["deals.view", "crm.view"],
  "revenue": ["finance.view"],
  "overdue-tasks": ["tasks.view"],
  "emails-sent": ["email.access", "communication.access"],
  "calls-today": ["calls.access", "communication.access"],
  "ai-briefing": ["dashboard.view", "ai_copilot.access"],
};

/**
 * Check if a widget is permitted based on effective permissions.
 * ADMIN role always has access. For other roles, user must hold at least
 * one of the requiredPermissions defined for that widget.
 */
export function isWidgetPermitted(
  widgetId: string,
  userPermissions?: Record<string, boolean>,
  isAdmin?: boolean
): boolean {
  if (isAdmin) return true;
  if (!userPermissions) return false;
  const required = WIDGET_PERMISSION_MAP[widgetId];
  if (!required || required.length === 0) return true;
  return required.some((perm) => userPermissions[perm] === true);
}

/**
 * Check if a dashboard KPI metric card is permitted.
 */
export function isKpiPermitted(
  kpiKey: string,
  userPermissions?: Record<string, boolean>,
  isAdmin?: boolean
): boolean {
  if (isAdmin) return true;
  if (!userPermissions) return false;
  const required = KPI_PERMISSION_MAP[kpiKey];
  if (!required || required.length === 0) return true;
  return required.some((perm) => userPermissions[perm] === true);
}

/**
 * Automatically reorganizes remaining widgets after unauthorized ones are removed.
 * Removes empty rows and columns, packs widgets tightly from top-left, and avoids blank holes.
 */
export function compactLayout(
  widgets: WidgetInstance[],
  cols: number = 12
): WidgetInstance[] {
  const sorted = [...widgets].sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));
  const placed: WidgetInstance[] = [];

  const overlaps = (
    item: { x: number; y: number; w: number; h: number },
    other: { x: number; y: number; w: number; h: number }
  ) => {
    return (
      item.x < other.x + other.w &&
      item.x + item.w > other.x &&
      item.y < other.y + other.h &&
      item.y + item.h > other.y
    );
  };

  for (const w of sorted) {
    const width = Math.min(w.w, cols);
    const height = w.h;
    let found = false;
    let y = 0;
    while (!found) {
      for (let x = 0; x <= cols - width; x++) {
        const candidate = { x, y, w: width, h: height };
        const hasCollision = placed.some((p) => overlaps(candidate, p));
        if (!hasCollision) {
          placed.push({ ...w, x, y, w: width, h: height });
          found = true;
          break;
        }
      }
      if (!found) y++;
    }
  }

  return placed;
}