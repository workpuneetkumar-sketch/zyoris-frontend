// hooks/useDashboardBuilder.ts
// Central state management for the Dashboard Builder.

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import { WidgetDefinition, WidgetInstance } from "@/types/dashboard-builder";
import { getWidgetCatalog } from "@/lib/api/dashboardWidgetService";
import {
  getDashboardLayout,
  saveDashboardLayout,
  resetDashboardLayout as resetLayoutService,
} from "@/lib/api/dashboardLayoutService";

export function useDashboardBuilder() {
  const [catalog, setCatalog] = useState<WidgetDefinition[]>([]);
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [initialWidgets, setInitialWidgets] = useState<WidgetInstance[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removedWidget, setRemovedWidget] = useState<{
    instance: WidgetInstance;
    definition: WidgetDefinition;
  } | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Computed ───────────────────────────────────────────────────────────────

  const hasUnsavedChanges = useMemo(() => {
    if (widgets.length !== initialWidgets.length) return true;
    const sortedA = [...widgets].sort((a, b) =>
      a.instanceId.localeCompare(b.instanceId)
    );
    const sortedB = [...initialWidgets].sort((a, b) =>
      a.instanceId.localeCompare(b.instanceId)
    );
    return JSON.stringify(sortedA) !== JSON.stringify(sortedB);
  }, [widgets, initialWidgets]);

  const isEmpty = !isLoading && widgets.length === 0;

  // ── Beforeunload warning ───────────────────────────────────────────────────

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // ── Load data on mount ─────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedCatalog, fetchedLayout] = await Promise.all([
        getWidgetCatalog(),
        getDashboardLayout(),
      ]);
      setCatalog(fetchedCatalog);
      setWidgets(fetchedLayout);
      setInitialWidgets(fetchedLayout);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load dashboard data";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Cleanup undo timeout on unmount ────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const addWidget = useCallback(
    (def: WidgetDefinition) => {
      const maxY = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
      const newInstance: WidgetInstance = {
        widgetId: def.id,
        instanceId: `inst-${def.id}-${Date.now()}`,
        x: 0,
        y: maxY,
        w: def.defaultW,
        h: def.defaultH,
      };
      setWidgets((prev) => [...prev, newInstance]);
    },
    [widgets]
  );

  const removeWidget = useCallback(
    (instanceId: string) => {
      // Store removed widget info for undo
      const removed = widgets.find((w) => w.instanceId === instanceId);
      if (!removed) return;
      const def = catalog.find((d) => d.id === removed.widgetId);

      // Remove immediately
      setWidgets((prev) => prev.filter((w) => w.instanceId !== instanceId));

      if (def) {
        setRemovedWidget({ instance: removed, definition: def });

        // Clear previous timeout
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

        // Show undo toast
        const toastId = toast(
          ({ closeToast }) => (
            <div className="flex items-center gap-3">
              <span className="text-sm">Widget removed</span>
              <button
                onClick={() => {
                  undoRemove();
                  closeToast?.();
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
              >
                Undo
              </button>
            </div>
          ),
          {
            autoClose: 5000,
            onClose: () => {
              setRemovedWidget(null);
            },
          }
        );

        undoTimeoutRef.current = setTimeout(() => {
          setRemovedWidget(null);
        }, 5000);
      }
    },
    [widgets, catalog]
  );

  const undoRemove = useCallback(() => {
    if (!removedWidget) return;
    setWidgets((prev) => [...prev, removedWidget.instance]);
    setRemovedWidget(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  }, [removedWidget]);

  const updateLayout = useCallback((newWidgets: WidgetInstance[]) => {
    setWidgets(newWidgets);
  }, []);

  const saveLayout = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveDashboardLayout(widgets);
      setInitialWidgets([...widgets]);
      toast.success("Dashboard layout saved successfully.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save layout";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [widgets]);

  const resetLayout = useCallback(async () => {
    try {
      await resetLayoutService();
      const defaultLayout = await getDashboardLayout();
      setWidgets(defaultLayout);
      setInitialWidgets(defaultLayout);
      toast.success("Layout reset to default.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reset layout";
      toast.error(message);
    }
  }, []);

  const togglePreview = useCallback(() => {
    setIsPreview((p) => !p);
  }, []);

  return {
    catalog,
    widgets,
    isPreview,
    isLoading,
    isSaving,
    error,
    hasUnsavedChanges,
    isEmpty,
    addWidget,
    removeWidget,
    updateLayout,
    saveLayout,
    resetLayout,
    togglePreview,
    retry: loadData,
  };
}
