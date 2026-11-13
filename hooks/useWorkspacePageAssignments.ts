"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { WorkspacePageAssignment } from "@/types/workspace";

const STORAGE_PREFIX = "zyoris-workspace-page-assignments";
const CHANGE_EVENT = "zyoris:workspace-page-assignments-updated";

function isAssignment(value: unknown): value is WorkspacePageAssignment {
  if (!value || typeof value !== "object") return false;
  const assignment = value as Record<string, unknown>;
  return (
    typeof assignment.pageId === "string" &&
    typeof assignment.pageTitle === "string" &&
    typeof assignment.assignedUserId === "string" &&
    typeof assignment.assignedUserName === "string" &&
    typeof assignment.assignedUserEmail === "string" &&
    typeof assignment.assignedByUserId === "string" &&
    typeof assignment.assignedAt === "string"
  );
}

function readAssignments(storageKey: string | null): Record<string, WorkspacePageAssignment> {
  if (!storageKey || typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Saved page assignments have an invalid format.");
  }
  const records = Object.entries(parsed);
  if (records.some(([pageId, assignment]) => !isAssignment(assignment) || assignment.pageId !== pageId)) {
    throw new Error("Saved page assignments contain invalid entries.");
  }
  return parsed as Record<string, WorkspacePageAssignment>;
}

export function useWorkspacePageAssignments() {
  const { user } = useAuth();
  const storageKey = user?.organizationId
    ? `${STORAGE_PREFIX}:${user.organizationId}`
    : null;
  const [assignments, setAssignments] = useState<Record<string, WorkspacePageAssignment>>({});
  const [storageError, setStorageError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    try {
      setAssignments(readAssignments(storageKey));
      setStorageError(null);
    } catch (error) {
      console.error("Failed to load Workspace page assignments:", error);
      setStorageError(error instanceof Error ? error.message : "Could not load page assignments.");
    }
  }, [storageKey]);

  useEffect(() => {
    refresh();
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) refresh();
    };
    const handleLocalChange = () => refresh();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(CHANGE_EVENT, handleLocalChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CHANGE_EVENT, handleLocalChange);
    };
  }, [refresh, storageKey]);

  const saveAssignment = useCallback((assignment: WorkspacePageAssignment): boolean => {
    if (!storageKey) {
      setStorageError("Sign in to an organization before assigning Workspace pages.");
      return false;
    }
    try {
      const current = readAssignments(storageKey);
      const next = { ...current, [assignment.pageId]: assignment };
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setAssignments(next);
      setStorageError(null);
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
      return true;
    } catch (error) {
      console.error("Failed to save Workspace page assignment:", error);
      setStorageError(error instanceof Error ? error.message : "Could not save this page assignment.");
      return false;
    }
  }, [storageKey]);

  const removeAssignment = useCallback((pageId: string): boolean => {
    if (!storageKey) {
      setStorageError("Sign in to an organization before managing Workspace page assignments.");
      return false;
    }
    try {
      const current = readAssignments(storageKey);
      const next = { ...current };
      delete next[pageId];
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setAssignments(next);
      setStorageError(null);
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
      return true;
    } catch (error) {
      console.error("Failed to remove Workspace page assignment:", error);
      setStorageError(error instanceof Error ? error.message : "Could not remove this page assignment.");
      return false;
    }
  }, [storageKey]);

  return useMemo(() => ({
    assignments,
    currentUserId: user?.id || "",
    storageError,
    saveAssignment,
    removeAssignment,
  }), [assignments, user?.id, storageError, saveAssignment, removeAssignment]);
}
