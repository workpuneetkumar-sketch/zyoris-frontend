// ── Types for the Dashboard Builder feature ──────────────────────────────────

export type WidgetType = "kpi" | "chart" | "table" | "activity" | "tasks";

/**
 * A widget type definition from the catalog.
 * This describes what kind of widget can be added to the dashboard.
 */
export interface WidgetDefinition {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  icon: string; // lucide-react icon name
  category: string; // e.g. "Finance", "Analytics", "Sales", "Tasks", "Activity"
  defaultW: number; // default width in grid columns
  defaultH: number; // default height in grid rows
  minW?: number;
  minH?: number;
}

/**
 * An instance of a widget placed on the dashboard canvas.
 */
export interface WidgetInstance {
  widgetId: string; // references WidgetDefinition.id
  instanceId: string; // unique ID for this specific instance
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Payload shape for saving the dashboard layout.
 */
export interface DashboardLayoutPayload {
  name: string;
  widgets: WidgetInstance[];
}
