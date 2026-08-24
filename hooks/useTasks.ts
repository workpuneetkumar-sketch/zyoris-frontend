"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
    Task,
    TaskStatus,
    fetchTasks,
    createTask,
    updateTask,
    CreateTaskPayload,
    UpdateTaskPayload,
} from "@/lib/api/tasksApi";

export type TaskFilter = "all" | "my" | "overdue";

export function useTasks(currentUserId?: string) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<TaskFilter>("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const loadTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchTasks();
            setTasks(data.tasks ?? []);
        } catch (err) {
            // 404 from /tasks/get-tasks may mean no tasks exist yet for this org.
            // Treat as empty list rather than an error that blocks the UI.
            if (axios.isAxiosError(err) && err.response?.status === 404) {
                setTasks([]);
            } else {
                setError(err instanceof Error ? err.message : "Failed to fetch tasks.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    // ── Client-side filtering ─────────────────────────────────────────────────
    const filteredTasks = tasks.filter((task) => {
        if (filter === "my" && currentUserId) {
            if (
                task.assignedTo?.id !== currentUserId &&
                task.assignedToId !== currentUserId
            ) {
                return false;
            }
        }
        if (filter === "overdue") {
            if (!task.dueDate) return false;
            const due = new Date(task.dueDate);
            if (due >= new Date() || task.status === "DONE") return false;
        }
        if (statusFilter !== "all" && task.status !== statusFilter) {
            return false;
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            const inTitle = task.title.toLowerCase().includes(q);
            const inDesc = task.description?.toLowerCase().includes(q) ?? false;
            if (!inTitle && !inDesc) return false;
        }
        return true;
    });

    // ── Create task ───────────────────────────────────────────────────────────
    async function handleCreate(data: CreateTaskPayload): Promise<boolean> {
        setSaving(true);
        setSaveError(null);
        try {
            await createTask(data);
            await loadTasks();
            setIsCreateOpen(false);
            return true;
        } catch (err) {
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.error ?? err.response?.data?.message ?? err.message
                : err instanceof Error
                ? err.message
                : "Failed to create task.";
            setSaveError(msg);
            return false;
        } finally {
            setSaving(false);
        }
    }

    // ── Update task ───────────────────────────────────────────────────────────
    async function handleUpdate(id: string, data: UpdateTaskPayload): Promise<boolean> {
        setSaving(true);
        setSaveError(null);
        // Optimistic update for instant 0ms feedback
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
        try {
            const updated = await updateTask(id, data);
            setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
            setSelectedTask(updated);
            return true;
        } catch (err) {
            loadTasks(); // rollback on failure
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.error ?? err.response?.data?.message ?? err.message
                : err instanceof Error
                ? err.message
                : "Failed to update task.";
            setSaveError(msg);
            return false;
        } finally {
            setSaving(false);
        }
    }

    // ── Status cycle ──────────────────────────────────────────────────────────
    const STATUS_NEXT: Record<TaskStatus, TaskStatus> = {
        TODO: "IN_PROGRESS",
        IN_PROGRESS: "DONE",
        DONE: "TODO",
    };

    async function cycleStatus(task: Task): Promise<void> {
        await handleUpdate(task.id, { status: STATUS_NEXT[task.status] });
    }

    function openDetail(task: Task) {
        setSelectedTask(task);
        setIsDetailOpen(true);
    }

    function closeDetail() {
        setIsDetailOpen(false);
        setSelectedTask(null);
        setSaveError(null);
    }

    return {
        tasks,
        filteredTasks,
        loading,
        error,
        filter,
        statusFilter,
        search,
        selectedTask,
        isDetailOpen,
        isCreateOpen,
        saving,
        saveError,
        setFilter,
        setStatusFilter,
        setSearch,
        setIsCreateOpen,
        openDetail,
        closeDetail,
        handleCreate,
        handleUpdate,
        cycleStatus,
        retry: loadTasks,
    };
}
