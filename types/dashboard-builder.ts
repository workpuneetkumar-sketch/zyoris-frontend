// ── Types for the Dashboard Builder feature ──────────────────────────────────

/**
 * A widget as returned by the catalog API: GET /dashboard/widgets/catalog
 * Each module contains an array of these.
 */
export interface CatalogWidget {
  id: string;
  title: string;
  minW: number;
  minH: number;
}

/**
 * A module grouping from the catalog API response.
 */
export interface CatalogModule {
  module: string;
  widgets: CatalogWidget[];
}

/**
 * Single catalog item as returned by the API
 * GET /dashboard/widgets/catalog
 */
export interface WidgetCatalogItem {
  widgetId: string;
  title: string;
  description?: string;
  minW: number;
  minH: number;
  defaultW?: number;
  defaultH?: number;
  type?: string;
}

/**
 * Grouped catalog response from GET /dashboard/widgets/catalog
 */
export interface WidgetCatalogGroup {
  module: string;
  widgets: WidgetCatalogItem[];
}

/**
 * Flattened widget definition used internally by the builder.
 * Combines catalog data with a module name and sensible defaults.
 */
export interface WidgetDefinition {
  id: string;
  title: string;
  module: string;
  icon?: string;          // emoji icon for display
  description?: string;
  minW: number;
  minH: number;
  defaultW: number;
  defaultH: number;
  type?: string;
}

/**
 * Full dashboard widget definition including endpoint and metadata.
 */
export interface DashboardWidgetDefinition {
  id: string;
  title: string;
  module: string;
  description: string;
  endpoint: string;
  minW: number;
  minH: number;
  defaultW: number;
  defaultH: number;
  requiresParams?: boolean;
}

/**
 * Layout item as required by the POST /dashboard/layouts API spec.
 * { widgetId, x, y, w, h }
 */
export interface LayoutItem {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * An instance of a widget placed on the dashboard canvas.
 * instanceId is a UI-only field for React key management.
 */
export interface WidgetInstance extends LayoutItem {
  instanceId: string; // unique ID for this specific instance (UI-only, not sent to API)
}

/**
 * A saved dashboard layout as returned by GET /dashboard/layouts
 */
export interface SavedDashboardLayout {
  id: string;
  name: string;
  layout: LayoutItem[];
  isDefault?: boolean;
  isOrgDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  organizationId?: string;
}

/**
 * Paginated response from GET /dashboard/layouts
 */
export interface SavedDashboardLayoutsResponse {
  data: SavedDashboardLayout[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  total?: number;
  page?: number;
  totalPages?: number;
}

/**
 * Payload shape for creating a dashboard layout.
 */
export interface CreateDashboardLayoutPayload {
  name: string;
  layout: LayoutItem[];
}

/**
 * Payload shape for updating a dashboard layout.
 */
export interface UpdateDashboardLayoutPayload {
  name?: string;
  layout?: LayoutItem[];
}

/**
 * @deprecated Use LayoutItem instead
 * Payload shape for saving the dashboard layout (reserved for future API use).
 */
export interface DashboardLayoutPayload {
  name: string;
  widgets: WidgetInstance[];
}
