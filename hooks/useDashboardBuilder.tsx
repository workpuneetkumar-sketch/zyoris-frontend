// hooks/useDashboardBuilder.tsx
// Central state management for the Dashboard Builder with multi-layout support.

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import { WidgetDefinition, WidgetInstance, SavedDashboardLayout } from "@/types/dashboard-builder";
import { getWidgetCatalog, getWidgetCatalogGrouped } from "@/lib/api/dashboardWidgetService";
import { isWidgetPermitted, compactLayout } from "@/components/dashboard-builder/WidgetRegistry";
import {
  listLayouts,
  createLayout,
  updateLayout,
  deleteLayout,
  setOrgDefaultLayout,
  toWidgetInstances,
} from "@/lib/api/dashboardLayoutService";

const DEFAULT_LAYOUT_NAME = "My Dashboard";
const ADMIN_ROLES = ["ADMIN", "CEO", "OWNER", "SUPER_ADMIN"];

const DEFAULT_STANDARD_WIDGETS: WidgetInstance[] = [
  { widgetId: "pipeline", instanceId: "inst-pipeline-default", x: 0, y: 0, w: 6, h: 4 },
  { widgetId: "revenue", instanceId: "inst-revenue-default", x: 6, y: 0, w: 3, h: 4 },
  { widgetId: "conversion-rate", instanceId: "inst-conversion-default", x: 9, y: 0, w: 3, h: 4 },
  { widgetId: "activities", instanceId: "inst-activities-default", x: 0, y: 4, w: 6, h: 4 },
  { widgetId: "tasks", instanceId: "inst-tasks-default", x: 6, y: 4, w: 6, h: 4 },
];

// ─────────────────────────────────────────────────────────────────────────────

// ── Debounce utility ────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─────────────────────────────────────────────────────────────────────────────

export function useDashboardBuilder(userRole?: string) {
  const { sessionStatus, token, userPermissions, isAdmin, permissionsLoaded } = useAuth();
  // ── Widget catalog ────────────────────────────────────────────────────────
  const [catalog, setCatalog] = useState<WidgetDefinition[]>([]);

  // ── Current canvas widgets ────────────────────────────────────────────────
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [initialWidgets, setInitialWidgets] = useState<WidgetInstance[]>([]);

  // ── Saved layouts ─────────────────────────────────────────────────────────
  const [layouts, setLayouts] = useState<SavedDashboardLayout[]>([]);
  const [activeLayoutId, setActiveLayoutId] = useState<string | null>(null);

  // ── UI flags ──────────────────────────────────────────────────────────────
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLayouts, setIsLoadingLayouts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Undo for widget removal ───────────────────────────────────────────────
  const [removedWidget, setRemovedWidget] = useState<{
    instance: WidgetInstance;
    definition: WidgetDefinition;
  } | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Permissions ───────────────────────────────────────────────────────────
  const canSetOrgDefault = ADMIN_ROLES.includes(userRole?.toUpperCase() ?? "");

  // ── Computed ──────────────────────────────────────────────────────────────

  const hasUnsavedChanges = useMemo(() => {
    if (widgets.length !== initialWidgets.length) return true;
    const sortedA = [...widgets].sort((a, b) => a.instanceId.localeCompare(b.instanceId));
    const sortedB = [...initialWidgets].sort((a, b) => a.instanceId.localeCompare(b.instanceId));
    return JSON.stringify(sortedA) !== JSON.stringify(sortedB);
  }, [widgets, initialWidgets]);

  const permittedWidgets = useMemo(() => {
    if (isAdmin) return widgets;
    if (!permissionsLoaded) return [];
    const filtered = widgets.filter((w) =>
      isWidgetPermitted(w.widgetId, userPermissions, isAdmin)
    );
    return compactLayout(filtered);
  }, [widgets, userPermissions, isAdmin, permissionsLoaded]);

  const permittedCatalog = useMemo(() => {
    if (isAdmin) return catalog;
    if (!permissionsLoaded) return [];
    return catalog.filter((c) =>
      isWidgetPermitted(c.id, userPermissions, isAdmin)
    );
  }, [catalog, userPermissions, isAdmin, permissionsLoaded]);

  const isEmpty = !isLoading && permittedWidgets.length === 0;

  const activeLayout = useMemo(
    () => layouts.find((l) => l.id === activeLayoutId) ?? null,
    [layouts, activeLayoutId]
  );

  // ── Beforeunload warning ──────────────────────────────────────────────────

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // ── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, []);

  // ── Load catalog + layouts ────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (sessionStatus === "checking") return;
    if (sessionStatus === "unauthenticated" || !token) {
      try {
        const fetchedCatalog = await getWidgetCatalog();
        setCatalog(fetchedCatalog);
      } catch (_) {}
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [fetchedCatalog, layoutsRes] = await Promise.all([
        getWidgetCatalog(),
        listLayouts(1, 50),
      ]);

      setCatalog(fetchedCatalog);
      setLayouts(layoutsRes?.data || []);

      const target =
        layoutsRes?.data?.find((l) => l.isOrgDefault) ??
        layoutsRes?.data?.find((l) => l.isDefault) ??
        layoutsRes?.data?.[0];

      if (target && target.layout && target.layout.length > 0) {
        setActiveLayoutId(target.id);
        const instances = toWidgetInstances(target.layout);
        setWidgets(instances);
        setInitialWidgets(instances);
      } else {
        setWidgets(DEFAULT_STANDARD_WIDGETS);
        setInitialWidgets(DEFAULT_STANDARD_WIDGETS);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Failed to load dashboard data";
      setError(message);
      if (err?.response?.status !== 401 && !message.toLowerCase().includes("authentication")) {
        toast.error(message);
      }
      setWidgets(DEFAULT_STANDARD_WIDGETS);
      setInitialWidgets(DEFAULT_STANDARD_WIDGETS);
    } finally {
      setIsLoading(false);
    }
  }, [sessionStatus, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Refresh layouts list ──────────────────────────────────────────────────

  const refreshLayouts = useCallback(async () => {
    setIsLoadingLayouts(true);
    try {
      const res = await listLayouts(1, 50);
      setLayouts(res.data);
    } catch {
      // silently ignore
    } finally {
      setIsLoadingLayouts(false);
    }
  }, []);

  // ── Widget actions ────────────────────────────────────────────────────────

  const addWidget = useCallback(
    (def: WidgetDefinition) => {
      if (widgets.some((widget) => widget.widgetId === def.id)) {
        toast.info(`${def.title} is already on your dashboard.`);
        return;
      }

      const newInstanceId = `inst-${def.id}-${Date.now()}`;
      setWidgets((prev) => {
        if (prev.some((widget) => widget.widgetId === def.id)) return prev;
        const maxY = prev.reduce((max, widget) => Math.max(max, widget.y + widget.h), 0);
        const newInstance: WidgetInstance = {
          widgetId: def.id,
          instanceId: newInstanceId,
          x: 0,
          y: maxY,
          w: def.defaultW,
          h: def.defaultH,
        };
        return [...prev, newInstance];
      });
    },
    [widgets]
  );

  const undoRemove = useCallback(() => {
    if (!removedWidget) return;
    setWidgets((prev) =>
      prev.some((widget) => widget.widgetId === removedWidget.instance.widgetId)
        ? prev
        : [...prev, removedWidget.instance]
    );
    setRemovedWidget(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  }, [removedWidget]);

  const removeWidget = useCallback(
    (instanceId: string) => {
      const removed = widgets.find((w) => w.instanceId === instanceId);
      if (!removed) return;
      const def = catalog.find((d) => d.id === removed.widgetId);

      setWidgets((prev) => prev.filter((w) => w.instanceId !== instanceId));

      if (def) {
        setRemovedWidget({ instance: removed, definition: def });
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

        const undoFn = () => {
          undoRemove();
        };

        toast(
          ({ closeToast }) => (
            <div className="flex items-center gap-3">
              <span className="text-sm">Widget removed</span>
              <button
                onClick={() => {
                  undoFn();
                  closeToast?.();
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
              >
                Undo
              </button>
            </div>
          ),
          { autoClose: 5000, onClose: () => setRemovedWidget(null) }
        );

        undoTimeoutRef.current = setTimeout(() => setRemovedWidget(null), 5000);
      }
    },
    [widgets, catalog, undoRemove]
  );

  const updateLayoutWidgets = useCallback((newWidgets: WidgetInstance[]) => {
    setWidgets(newWidgets);
  }, []);

  // ── Layout save ───────────────────────────────────────────────────────────

  const saveLayout = useCallback(async () => {
    setIsSaving(true);
    try {
      if (activeLayoutId) {
        // Update existing layout
        const updated = await updateLayout(activeLayoutId, { widgets });
        setLayouts((prev) =>
          prev.map((l) => (l.id === activeLayoutId ? updated : l))
        );
        setInitialWidgets([...widgets]);
        toast.success("Dashboard saved.");
      } else {
        // Create a new layout with a default name
        const created = await createLayout(DEFAULT_LAYOUT_NAME, widgets);
        setLayouts((prev) => [...prev, created]);
        setActiveLayoutId(created.id);
        setInitialWidgets([...widgets]);
        toast.success(`Dashboard "${created.name}" created.`);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        toast.error("You don't have permission to save this dashboard.");
      } else if (status === 401) {
        toast.error("Session expired. Please log in again.");
      } else {
        toast.error("Failed to save dashboard.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [activeLayoutId, widgets]);

  // ── Create layout ─────────────────────────────────────────────────────────

  const handleCreateLayout = useCallback(async (name: string) => {
    setIsCreating(true);
    try {
      const created = await createLayout(name, []);
      setLayouts((prev) => [...prev, created]);
      setActiveLayoutId(created.id);
      setWidgets([]);
      setInitialWidgets([]);
      toast.success(`Dashboard "${name}" created.`);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        toast.error("Permission denied: cannot create dashboard.");
      } else {
        toast.error("Failed to create dashboard.");
      }
    } finally {
      setIsCreating(false);
    }
  }, []);

  // ── Switch layout ─────────────────────────────────────────────────────────

  const switchLayout = useCallback(
    (layoutOrId: SavedDashboardLayout | string) => {
      const id = typeof layoutOrId === "string" ? layoutOrId : layoutOrId.id;
      const layout = layouts.find((l) => l.id === id);
      if (!layout) return;
      setActiveLayoutId(id);
      const instances = toWidgetInstances(layout.layout ?? []);
      setWidgets(instances);
      setInitialWidgets(instances);
    },
    [layouts]
  );

  // ── Rename layout ─────────────────────────────────────────────────────────

  const renameLayout = useCallback(async (id: string, name: string) => {
    try {
      const updated = await updateLayout(id, { name });
      setLayouts((prev) => prev.map((l) => (l.id === id ? updated : l)));
      toast.success("Dashboard renamed.");
    } catch {
      toast.error("Failed to rename dashboard.");
    }
  }, []);

  // ── Delete layout ─────────────────────────────────────────────────────────

  const handleDeleteLayout = useCallback(async (id: string) => {
    setIsDeletingId(id);
    try {
      await deleteLayout(id);
      setLayouts((prev) => prev.filter((l) => l.id !== id));
      if (activeLayoutId === id) {
        // Switch to the first remaining layout
        const remaining = layouts.filter((l) => l.id !== id);
        if (remaining.length > 0) {
          switchLayout(remaining[0]);
        } else {
          setActiveLayoutId(null);
          setWidgets([]);
          setInitialWidgets([]);
        }
      }
      toast.success("Dashboard deleted.");
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        toast.error("Permission denied: cannot delete dashboard.");
      } else {
        toast.error("Failed to delete dashboard.");
      }
    } finally {
      setIsDeletingId(null);
    }
  }, [activeLayoutId, layouts, switchLayout]);

  // ── Set org default ───────────────────────────────────────────────────────

  const handleSetOrgDefault = useCallback(async (id: string) => {
    if (!canSetOrgDefault) {
      toast.error("You don't have permission to set the organization default.");
      return;
    }
    setIsSettingDefault(true);
    try {
      await setOrgDefaultLayout(id);
      // Update local state to reflect the new org default
      setLayouts((prev) =>
        prev.map((l) => ({
          ...l,
          isOrgDefault: l.id === id,
        }))
      );
      toast.success("Organization default dashboard updated.");
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        toast.error("Permission denied: only admins can set the organization default.");
      } else if (status === 404) {
        toast.error("Dashboard not found.");
      } else {
        toast.error("Failed to set organization default.");
      }
    } finally {
      setIsSettingDefault(false);
    }
  }, [canSetOrgDefault]);

  // ── Reset layout ──────────────────────────────────────────────────────────

  const resetLayout = useCallback(async () => {
    if (!activeLayoutId) {
      setWidgets([]);
      setInitialWidgets([]);
      return;
    }
    try {
      const updated = await updateLayout(activeLayoutId, { widgets: [] });
      setLayouts((prev) =>
        prev.map((l) => (l.id === activeLayoutId ? updated : l))
      );
      setWidgets([]);
      setInitialWidgets([]);
      toast.success("Layout cleared.");
    } catch {
      toast.error("Failed to reset layout.");
    }
  }, [activeLayoutId]);

  const togglePreview = useCallback(() => {
    setIsPreview((p) => !p);
  }, []);

  return {
    // State
    catalog: permittedCatalog,
    widgets: permittedWidgets,
    layouts,
    activeLayout,
    activeLayoutId,
    isPreview,
    isLoading,
    isLoadingLayouts,
    isSaving,
    isCreating,
    isDeletingId,
    isSettingDefault,
    error,
    hasUnsavedChanges,
    isEmpty,
    canSetOrgDefault,

    // Widget actions
    addWidget,
    removeWidget,
    updateLayout: updateLayoutWidgets,
    saveLayout,
    resetLayout,
    togglePreview,

    // Layout management
    createLayout: handleCreateLayout,
    switchLayout,
    renameLayout,
    deleteLayout: handleDeleteLayout,
    setOrgDefault: handleSetOrgDefault,
    refreshLayouts,

    // Retry
    retry: loadData,
  };
}
