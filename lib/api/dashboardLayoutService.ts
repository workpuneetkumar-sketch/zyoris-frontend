// lib/api/dashboardLayoutService.ts
// Dashboard Builder layout persistence via backend API.
// API endpoints: GET/POST/PATCH/DELETE /dashboard/layouts
//                POST /dashboard/layouts/default

import api from "@/lib/api/api";
import {
  LayoutItem,
  SavedDashboardLayout,
  SavedDashboardLayoutsResponse,
  CreateDashboardLayoutPayload,
  UpdateDashboardLayoutPayload,
  WidgetInstance,
} from "@/types/dashboard-builder";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Strip the UI-only instanceId before sending to the API */
function toLayoutItems(widgets: WidgetInstance[]): LayoutItem[] {
  return widgets.map(({ widgetId, x, y, w, h }) => ({ widgetId, x, y, w, h }));
}

/** Re-hydrate LayoutItems from the API with an instanceId for React key management */
export function toWidgetInstances(items: LayoutItem[]): WidgetInstance[] {
  return (items ?? []).map((item, idx) => ({
    ...item,
    instanceId: `inst-${item.widgetId}-${idx}-${Date.now()}`,
  }));
}

function resolveLayouts(data: any): SavedDashboardLayout[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.layouts)) return data.layouts;
  return [];
}

// ── List layouts (paginated) ───────────────────────────────────────────────

export async function listLayouts(
  page = 1,
  limit = 20
): Promise<SavedDashboardLayoutsResponse> {
  const res = await api.get<any>("/dashboard/layouts", {
    params: { page, limit },
  });
  const layouts = resolveLayouts(res.data);
  return {
    data: layouts,
    meta: res.data?.meta ?? res.data?.pagination ?? undefined,
    total: res.data?.total ?? layouts.length,
    page: res.data?.page ?? page,
    totalPages: res.data?.totalPages ?? Math.ceil((res.data?.total ?? layouts.length) / limit),
  };
}

// ── Create a new layout ────────────────────────────────────────────────────

export async function createLayout(
  name: string,
  widgets: WidgetInstance[]
): Promise<SavedDashboardLayout> {
  const payload: CreateDashboardLayoutPayload = {
    name,
    layout: toLayoutItems(widgets),
  };
  const res = await api.post<any>("/dashboard/layouts", payload);
  return res.data?.data ?? res.data;
}

// ── Update an existing layout ──────────────────────────────────────────────

export async function updateLayout(
  id: string,
  data: { name?: string; widgets?: WidgetInstance[] }
): Promise<SavedDashboardLayout> {
  const payload: UpdateDashboardLayoutPayload = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.widgets !== undefined) payload.layout = toLayoutItems(data.widgets);
  const res = await api.patch<any>(`/dashboard/layouts/${id}`, payload);
  return res.data?.data ?? res.data;
}

// ── Delete a layout ────────────────────────────────────────────────────────

export async function deleteLayout(id: string): Promise<void> {
  await api.delete(`/dashboard/layouts/${id}`);
}

// ── Set organization default layout ───────────────────────────────────────
// POST /dashboard/layouts/default — body: { layout: [...] }

export async function setOrgDefaultLayout(id: string): Promise<void> {
  // We need the actual layout items for this layout — fetch it first
  try {
    const result = await listLayouts(1, 50);
    const target = result.data.find((l) => l.id === id);
    const layout: LayoutItem[] = target?.layout ?? [];
    await api.post(`/dashboard/layouts/default`, { layout });
  } catch (err: any) {
    if (err?.response?.status === 403) throw err; // permission errors must propagate
    // If the layout fetch failed, try posting empty layout
    await api.post(`/dashboard/layouts/default`, { layout: [] });
  }
}

// ── Legacy: load default layout as WidgetInstances ────────────────────────
// Used by the simple single-layout useDashboardBuilder flow

export async function getDashboardLayout(): Promise<WidgetInstance[]> {
  try {
    const result = await listLayouts(1, 50);
    const layouts = result.data;

    // Prefer the org default, then any layout marked isDefault, then the first one
    const target =
      layouts.find((l) => l.isOrgDefault) ??
      layouts.find((l) => l.isDefault) ??
      layouts[0];

    if (target?.layout) {
      return toWidgetInstances(target.layout);
    }
    return [];
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
}

// ── Legacy: save default layout ───────────────────────────────────────────

export async function saveDashboardLayout(
  name: string,
  widgets: WidgetInstance[]
): Promise<SavedDashboardLayout> {
  // Check if a layout with this name already exists
  try {
    const result = await listLayouts(1, 50);
    const existing = result.data.find(
      (l) => l.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      return updateLayout(existing.id, { name, widgets });
    }
  } catch {
    // ignore — will try to create
  }
  return createLayout(name, widgets);
}

// ── Legacy: reset ─────────────────────────────────────────────────────────

export async function resetDashboardLayout(): Promise<void> {
  try {
    const result = await listLayouts(1, 50);
    const defaultLayout =
      result.data.find((l) => l.isOrgDefault) ??
      result.data.find((l) => l.isDefault);
    if (defaultLayout) {
      await deleteLayout(defaultLayout.id);
    }
  } catch {
    // silently ignore
  }
}