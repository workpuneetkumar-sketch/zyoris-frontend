// hooks/useMyTasks.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
  Task,
  TaskStatus,
  TaskPriority,
  fetchMyTasks,
  fetchAssignmentEvents,
  updateTask,
  TaskAssignmentEvent,
  UpdateTaskPayload,
} from "@/lib/api/tasksApi";

export type MyTaskBucket = "all" | "overdue" | "dueToday" | "upcoming" | "completed";

export interface TaskCounts {
  all: number;
  overdue: number;
  dueToday: number;
  upcoming: number;
  completed: number;
}

/**
 * Categorize a task into one of the employee portal buckets:
 * - Completed: status === "DONE"
 * - Overdue: dueDate < start of today (local) and status !== "DONE"
 * - Due Today: dueDate is today (local) and status !== "DONE"
 * - Upcoming: dueDate > end of today (local) and status !== "DONE"
 */
export function getTaskBucket(task: Task, refDate: Date = new Date()): MyTaskBucket {
  if (task.status === "DONE") return "completed";

  if (!task.dueDate) return "upcoming";

  const due = new Date(task.dueDate);
  if (isNaN(due.getTime())) return "upcoming";

  const startOfToday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 23, 59, 59, 999);

  if (due < startOfToday) {
    return "overdue";
  } else if (due >= startOfToday && due <= endOfToday) {
    return "dueToday";
  } else {
    return "upcoming";
  }
}

export function computeTaskCounts(tasks: Task[], refDate: Date = new Date()): TaskCounts {
  const counts: TaskCounts = {
    all: tasks.length,
    overdue: 0,
    dueToday: 0,
    upcoming: 0,
    completed: 0,
  };

  for (const t of tasks) {
    const bucket = getTaskBucket(t, refDate);
    if (bucket === "completed") counts.completed++;
    else if (bucket === "overdue") counts.overdue++;
    else if (bucket === "dueToday") counts.dueToday++;
    else if (bucket === "upcoming") counts.upcoming++;
  }

  return counts;
}

export function useMyTasks(currentUserId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bucket, setBucket] = useState<MyTaskBucket>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Assignment Notification & Short-polling state
  const [lastCheckTime, setLastCheckTime] = useState<string>(() => new Date().toISOString());
  const [assignmentEvents, setAssignmentEvents] = useState<TaskAssignmentEvent[]>([]);
  const [newAssignmentsCount, setNewAssignmentsCount] = useState<number>(0);
  const [isEventsDrawerOpen, setIsEventsDrawerOpen] = useState(false);

  // ── Load tasks ─────────────────────────────────────────────────────────────
  const loadMyTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyTasks();
      const rawTasks = data.tasks ?? [];
      setTasks(rawTasks);
      setNewAssignmentsCount(0);
    } catch (err: any) {
      if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 204)) {
        setTasks([]);
      } else {
        setError(err.message || "Failed to load assigned tasks");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyTasks();
  }, [loadMyTasks]);

  // ── Short-polling for assignment / reassignment events ───────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const events = await fetchAssignmentEvents(lastCheckTime);
        if (events && events.length > 0) {
          setLastCheckTime(new Date().toISOString());
          setAssignmentEvents((prev) => [...events, ...prev]);

          // Check if any event targets current user or general assignment
          const relevant = events.filter((e) => {
            if (!currentUserId) return true;
            return e.assignedToId === currentUserId || !e.assignedToId;
          });

          if (relevant.length > 0) {
            setNewAssignmentsCount((prev) => prev + relevant.length);
          }
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [lastCheckTime, currentUserId]);

  // ── Dismiss assignment notification banner ──────────────────────────────────
  const dismissNotificationBanner = useCallback(() => {
    setNewAssignmentsCount(0);
  }, []);

  // ── Employee Status Update (Permission-Aware) ──────────────────────────────
  const handleUpdateStatus = useCallback(
    async (taskId: string, newStatus: TaskStatus): Promise<boolean> => {
      setPermissionError(null);
      setStatusUpdatingId(taskId);

      // Optimistic update
      const previousTasks = [...tasks];
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );

      try {
        await updateTask(taskId, { status: newStatus });
        return true;
      } catch (err: any) {
        // Rollback on failure
        setTasks(previousTasks);

        let msg = "Failed to update task status.";
        if (err?.response?.status === 403 || err?.message?.includes("Permission denied")) {
          msg = "Permission denied: You do not have permission to update this task's status.";
        } else if (err?.response?.data?.message) {
          msg = err.response.data.message;
        } else if (err.message) {
          msg = err.message;
        }

        setPermissionError(msg);
        return false;
      } finally {
        setStatusUpdatingId(null);
      }
    },
    [tasks]
  );

  // ── Filtered tasks and counts ──────────────────────────────────────────────
  const counts = useMemo(() => computeTaskCounts(tasks), [tasks]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    return tasks.filter((task) => {
      // Bucket filter
      if (bucket !== "all") {
        const taskBucket = getTaskBucket(task, now);
        if (taskBucket !== bucket) return false;
      }

      // Priority filter
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const inTitle = task.title?.toLowerCase().includes(q) ?? false;
        const inDesc = task.description?.toLowerCase().includes(q) ?? false;
        const inProject =
          typeof (task as any).projectName === "string" &&
          (task as any).projectName.toLowerCase().includes(q);
        const inLabels = task.labels?.some((l) => l.toLowerCase().includes(q)) ?? false;
        if (!inTitle && !inDesc && !inProject && !inLabels) return false;
      }

      return true;
    });
  }, [tasks, bucket, priorityFilter, search]);

  return {
    tasks,
    filteredTasks,
    counts,
    loading,
    error,
    bucket,
    priorityFilter,
    search,
    statusUpdatingId,
    permissionError,
    newAssignmentsCount,
    assignmentEvents,
    isEventsDrawerOpen,
    setBucket,
    setPriorityFilter,
    setSearch,
    setPermissionError,
    setIsEventsDrawerOpen,
    dismissNotificationBanner,
    handleUpdateStatus,
    refresh: loadMyTasks,
  };
}
