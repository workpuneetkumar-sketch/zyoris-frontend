// hooks/useReminders.ts

"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  Reminder,
  ReminderStatus,
  CreateReminderPayload,
  SnoozeReminderPayload,
} from "@/types/reminders";
import {
  getReminders,
  createReminder,
  snoozeReminder,
  completeReminder,
  skipReminder,
  deleteReminderById,
} from "@/lib/api/reminderService";

export type ReminderFilterStatus = "ALL" | ReminderStatus;

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ReminderFilterStatus>("ALL");
  const [isCreating, setIsCreating] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getReminders();
      setReminders(res.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load reminders";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = filterStatus === "ALL"
    ? reminders
    : reminders.filter((r) => r.status === filterStatus);

  // ── Create ─────────────────────────────────────────────────────────────

  const create = useCallback(async (payload: CreateReminderPayload) => {
    setIsCreating(true);
    try {
      const created = await createReminder(payload);
      setReminders((prev) => [created, ...prev]);
      toast.success("Reminder created.");
      return created;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400) toast.error("Invalid data. Please check all required fields.");
      else if (status === 403) toast.error("You don't have permission to create reminders.");
      else toast.error("Failed to create reminder.");
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // ── Snooze ─────────────────────────────────────────────────────────────

  const snooze = useCallback(async (id: string, payload: SnoozeReminderPayload) => {
    setActionLoadingId(id);
    try {
      const updated = await snoozeReminder(id, payload);
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success("Reminder snoozed.");
    } catch {
      toast.error("Failed to snooze reminder.");
    } finally {
      setActionLoadingId(null);
    }
  }, []);

  // ── Complete ───────────────────────────────────────────────────────────

  const complete = useCallback(async (id: string) => {
    setActionLoadingId(id);
    try {
      const updated = await completeReminder(id);
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success("Reminder marked as complete. ✓");
    } catch {
      toast.error("Failed to complete reminder.");
    } finally {
      setActionLoadingId(null);
    }
  }, []);

  // ── Skip ───────────────────────────────────────────────────────────────

  const skip = useCallback(async (id: string) => {
    setActionLoadingId(id);
    try {
      const updated = await skipReminder(id);
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success("Reminder skipped.");
    } catch {
      toast.error("Failed to skip reminder.");
    } finally {
      setActionLoadingId(null);
    }
  }, []);

  // ── Delete ─────────────────────────────────────────────────────────────

  const remove = useCallback(async (id: string) => {
    setActionLoadingId(id);
    try {
      await deleteReminderById(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      toast.success("Reminder deleted.");
    } catch {
      toast.error("Failed to delete reminder.");
    } finally {
      setActionLoadingId(null);
    }
  }, []);

  const counts = {
    ALL: reminders.length,
    PENDING: reminders.filter((r) => r.status === "PENDING").length,
    SNOOZED: reminders.filter((r) => r.status === "SNOOZED").length,
    COMPLETED: reminders.filter((r) => r.status === "COMPLETED").length,
    SKIPPED: reminders.filter((r) => r.status === "SKIPPED").length,
  };

  const overdueCount = reminders.filter(
    (r) => r.status === "PENDING" && new Date(r.dueAt) < new Date()
  ).length;

  return {
    reminders: filtered,
    allReminders: reminders,
    isLoading,
    error,
    isCreating,
    actionLoadingId,
    filterStatus,
    counts,
    overdueCount,
    setFilterStatus,
    create,
    snooze,
    complete,
    skip,
    remove,
    retry: load,
  };
}
