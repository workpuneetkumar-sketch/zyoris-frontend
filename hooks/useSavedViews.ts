// hooks/useSavedViews.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  fetchSavedViews,
  createSavedView,
  updateSavedView,
  deleteSavedView,
} from "@/lib/api/savedViewsApi";
import { SavedView, CreateSavedViewPayload } from "@/types/savedViews";

export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const loadViews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSavedViews();
      setViews(data.views);
    } catch {
      // Saved views API may not be implemented yet — silently fail
      setViews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadViews();
  }, [loadViews]);

  const handleCreateView = useCallback(async (payload: CreateSavedViewPayload): Promise<boolean> => {
    try {
      const view = await createSavedView(payload);
      setViews((prev) => [...prev, view]);
      toast.success(`View "${payload.name}" saved.`);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save view.");
      return false;
    }
  }, []);

  const handleRenameView = useCallback(async (viewId: string, name: string): Promise<boolean> => {
    try {
      const updated = await updateSavedView(viewId, { name });
      setViews((prev) => prev.map((v) => (v.id === viewId ? updated : v)));
      toast.success("View renamed.");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename view.");
      return false;
    }
  }, []);

  const handleDeleteView = useCallback(async (viewId: string): Promise<boolean> => {
    try {
      await deleteSavedView(viewId);
      setViews((prev) => prev.filter((v) => v.id !== viewId));
      if (activeViewId === viewId) setActiveViewId(null);
      toast.success("View deleted.");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete view.");
      return false;
    }
  }, [activeViewId]);

  const handleActivateView = useCallback((viewId: string | null) => {
    setActiveViewId(viewId);
  }, []);

  const activeView = views.find((v) => v.id === activeViewId) ?? null;

  return {
    views,
    loading,
    error,
    activeViewId,
    activeView,
    handleCreateView,
    handleRenameView,
    handleDeleteView,
    handleActivateView,
    reload: loadViews,
  };
}
