// lib/api/dashboardWidgetService.ts
// Dashboard Builder widget catalog.
// Calls GET /dashboard/widgets/catalog first, falls back to local registry.

import api from "@/lib/api/api";
import { WidgetDefinition, WidgetCatalogGroup } from "@/types/dashboard-builder";

// ── Local fallback registry ────────────────────────────────────────────────
// Used when the API is unavailable or returns an empty list.

const FALLBACK_CATALOG: WidgetCatalogGroup[] = [
  {
    module: "Sales",
    widgets: [
      { widgetId: "pipeline", title: "Sales Pipeline", minW: 3, minH: 3, defaultW: 6, defaultH: 4 },
      { widgetId: "conversion-rate", title: "Conversion Rate", minW: 2, minH: 2, defaultW: 3, defaultH: 3 },
      { widgetId: "revenue", title: "Revenue", minW: 2, minH: 2, defaultW: 3, defaultH: 3 },
    ],
  },
  {
    module: "Finance",
    widgets: [
      { widgetId: "cash-flow", title: "Cash Flow", minW: 3, minH: 3, defaultW: 6, defaultH: 4 },
      { widgetId: "revenue-kpi", title: "Revenue KPI", minW: 2, minH: 2, defaultW: 3, defaultH: 3 },
    ],
  },
  {
    module: "Operations",
    widgets: [
      { widgetId: "inventory-risk", title: "Inventory Risk", minW: 3, minH: 2, defaultW: 4, defaultH: 3 },
    ],
  },
  {
    module: "HR",
    widgets: [
      { widgetId: "attendance", title: "Attendance", minW: 3, minH: 3, defaultW: 4, defaultH: 3 },
    ],
  },
  {
    module: "CRM",
    widgets: [
      { widgetId: "leads-kpi", title: "Leads Overview", minW: 2, minH: 2, defaultW: 3, defaultH: 3 },
      { widgetId: "activities", title: "Recent Activities", minW: 3, minH: 3, defaultW: 6, defaultH: 4 },
      { widgetId: "tasks", title: "My Tasks", minW: 3, minH: 3, defaultW: 4, defaultH: 4 },
    ],
  },
  {
    module: "Analytics",
    widgets: [
      { widgetId: "deals-kpi", title: "Deals Summary", minW: 2, minH: 2, defaultW: 3, defaultH: 3 },
    ],
  },
];

// ── Normalize API response ─────────────────────────────────────────────────

function normalizeCatalog(data: any): WidgetCatalogGroup[] {
  if (!data) return [];

  // Shape: { Sales: [...], Finance: [...] }
  if (!Array.isArray(data) && typeof data === "object") {
    const entries = Object.entries(data);
    if (entries.length > 0 && Array.isArray(entries[0][1])) {
      return entries.map(([module, widgets]: [string, any]) => ({
        module,
        widgets: (widgets as any[]).map((w) => ({
          widgetId: w.widgetId ?? w.id,
          title: w.title ?? w.name ?? w.widgetId ?? w.id,
          minW: w.minW ?? 2,
          minH: w.minH ?? 2,
          defaultW: w.defaultW ?? Math.max(w.minW ?? 2, 3),
          defaultH: w.defaultH ?? Math.max(w.minH ?? 2, 3),
          description: w.description,
          type: w.type,
        })),
      }));
    }
  }

  // Shape: [{ module, widgets: [...] }]
  if (Array.isArray(data)) {
    return data.map((group: any) => ({
      module: group.module ?? group.name ?? "Other",
      widgets: (group.widgets ?? group.items ?? []).map((w: any) => ({
        widgetId: w.widgetId ?? w.id,
        title: w.title ?? w.name,
        minW: w.minW ?? 2,
        minH: w.minH ?? 2,
        defaultW: w.defaultW ?? Math.max(w.minW ?? 2, 3),
        defaultH: w.defaultH ?? Math.max(w.minH ?? 2, 3),
        description: w.description,
        type: w.type,
      })),
    }));
  }

  return [];
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch widget catalog grouped by module.
 * Calls GET /dashboard/widgets/catalog, falls back to local registry.
 */
export async function getWidgetCatalogGrouped(): Promise<WidgetCatalogGroup[]> {
  try {
    const res = await api.get<any>("/dashboard/widgets/catalog");
    const raw = res.data?.data ?? res.data;
    const groups = normalizeCatalog(raw);
    if (groups.length > 0) return groups;
    // API returned empty — use fallback
    return FALLBACK_CATALOG;
  } catch {
    return FALLBACK_CATALOG;
  }
}

/**
 * Get the complete widget catalog as a flat list of WidgetDefinitions.
 */
export async function getWidgetCatalog(): Promise<WidgetDefinition[]> {
  const groups = await getWidgetCatalogGrouped();
  return groups.flatMap((group) =>
    group.widgets.map((w) => ({
      id: w.widgetId,
      title: w.title,
      module: group.module,
      description: w.description,
      minW: w.minW,
      minH: w.minH,
      defaultW: w.defaultW ?? Math.max(w.minW, 3),
      defaultH: w.defaultH ?? Math.max(w.minH, 3),
      type: w.type,
    }))
  );
}

/**
 * Get a single widget definition by ID from the local fallback catalog.
 */
export function getWidgetDefinitionById(id: string): WidgetDefinition | undefined {
  for (const group of FALLBACK_CATALOG) {
    const w = group.widgets.find((w) => w.widgetId === id);
    if (w) {
      return {
        id: w.widgetId,
        title: w.title,
        module: group.module,
        description: undefined,
        minW: w.minW,
        minH: w.minH,
        defaultW: w.defaultW ?? Math.max(w.minW, 3),
        defaultH: w.defaultH ?? Math.max(w.minH, 3),
      };
    }
  }
  return undefined;
}

/**
 * @deprecated Use getWidgetCatalog instead.
 * Kept for backward compatibility with WidgetRegistry imports.
 */
export function getAllWidgetDefinitions(): WidgetDefinition[] {
  return FALLBACK_CATALOG.flatMap((group) =>
    group.widgets.map((w) => ({
      id: w.widgetId,
      title: w.title,
      module: group.module,
      description: undefined,
      minW: w.minW,
      minH: w.minH,
      defaultW: w.defaultW ?? Math.max(w.minW, 3),
      defaultH: w.defaultH ?? Math.max(w.minH, 3),
    }))
  );
}
