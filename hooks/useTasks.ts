// hooks/useTasks.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
    Task,
    TaskStatus,
    TaskPriority,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    CreateTaskPayload,
    UpdateTaskPayload,
    BulkUpdateFields,
    BulkUpdateResponse,
} from "@/lib/api/tasksApi";

export type TaskFilter = "all" | "my" | "overdue";

export function useTasks(currentUserId?: string) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<TaskFilter>("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [assigneeFilter, setAssigneeFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [bulkUpdating, setBulkUpdating] = useState(false);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const loadTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchTasks();
            setTasks(data.tasks ?? []);
        } catch (err) {
            if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 204)) {
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
    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => {
            // Quick Filter
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

            // Status Filter
            if (statusFilter !== "all" && task.status !== statusFilter) {
                return false;
            }

            // Priority Filter
            if (priorityFilter !== "all" && task.priority !== priorityFilter) {
                return false;
            }

            // Assignee Filter
            if (assigneeFilter !== "all") {
                if (assigneeFilter === "unassigned") {
                    if (task.assignedToId || task.assignedTo) return false;
                } else {
                    const assigneeId = task.assignedToId || task.assignedTo?.id;
                    if (assigneeId !== assigneeFilter) return false;
                }
            }

            // Search
            if (search.trim()) {
                const q = search.toLowerCase();
                const inTitle = task.title.toLowerCase().includes(q);
                const inDesc = task.description?.toLowerCase().includes(q) ?? false;
                if (!inTitle && !inDesc) return false;
            }

            return true;
        });
    }, [tasks, filter, currentUserId, statusFilter, priorityFilter, assigneeFilter, search]);

    // ── Selection State Logic ─────────────────────────────────────────────────
    const isAllSelected = useMemo(() => {
        if (filteredTasks.length === 0) return false;
        return filteredTasks.every((t) => selectedTaskIds.includes(t.id));
    }, [filteredTasks, selectedTaskIds]);

    const isIndeterminate = useMemo(() => {
        const selectedVisibleCount = filteredTasks.filter((t) =>
            selectedTaskIds.includes(t.id)
        ).length;
        return selectedVisibleCount > 0 && selectedVisibleCount < filteredTasks.length;
    }, [filteredTasks, selectedTaskIds]);

    const toggleSelect = useCallback((taskId: string) => {
        setSelectedTaskIds((prev) =>
            prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
        );
    }, []);

    const selectAll = useCallback((taskIds?: string[]) => {
        const idsToUse = Array.isArray(taskIds) ? taskIds : filteredTasks.map((t) => t.id);
        setSelectedTaskIds((prev) => {
            const allSelected = idsToUse.length > 0 && idsToUse.every((id) => prev.includes(id));
            if (allSelected) {
                // Deselect only the currently visible/filtered ones
                return prev.filter((id) => !idsToUse.includes(id));
            } else {
                // Add missing IDs
                return Array.from(new Set([...prev, ...idsToUse]));
            }
        });
    }, [filteredTasks]);

    const clearSelection = useCallback(() => {
        setSelectedTaskIds([]);
    }, []);

    // ── Create task ───────────────────────────────────────────────────────────
    async function handleCreate(data: CreateTaskPayload): Promise<boolean> {
        setSaving(true);
        setSaveError(null);
        try {
            const created = await createTask(data);
            setTasks((prev) => [created, ...prev]);
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
        // Optimistic update
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
        try {
            const updated = await updateTask(id, data);
            setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
            if (selectedTask?.id === id) {
                setSelectedTask((prev) => (prev ? { ...prev, ...updated } : null));
            }
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

    // ── Delete task ───────────────────────────────────────────────────────────
    async function handleDelete(id: string): Promise<boolean> {
        setSaving(true);
        setSaveError(null);
        const previousTasks = [...tasks];
        // Optimistic removal
        setTasks((prev) => prev.filter((t) => t.id !== id));
        setSelectedTaskIds((prev) => prev.filter((taskId) => taskId !== id));
        if (selectedTask?.id === id) {
            closeDetail();
        }
        try {
            await deleteTask(id);
            return true;
        } catch (err) {
            setTasks(previousTasks); // rollback
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.error ?? err.response?.data?.message ?? err.message
                : err instanceof Error
                ? err.message
                : "Failed to delete task.";
            setSaveError(msg);
            return false;
        } finally {
            setSaving(false);
        }
    }

    // ── Bulk update ───────────────────────────────────────────────────────────
    // FE-2 sends ONE request to POST /workspace/tasks/bulk-update
    async function handleBulkUpdate(
        update: BulkUpdateFields,
        workspaceId?: string
    ): Promise<BulkUpdateResponse> {
        if (selectedTaskIds.length === 0) {
            throw new Error("No tasks selected for bulk update.");
        }
        setBulkUpdating(true);
        try {
            const response = await bulkUpdateTasks({
                taskIds: selectedTaskIds,
                update,
                workspaceId,
            });

            // If tasks were updated, reflect in local state
            if (response.data?.results) {
                const successfulIds = new Set(
                    response.data.results
                        .filter((r) => r.success)
                        .map((r) => r.taskId)
                );

                setTasks((prev) =>
                    prev.map((t) => {
                        if (successfulIds.has(t.id)) {
                            return {
                                ...t,
                                ...update,
                                ...(update.dueDate !== undefined ? { dueDate: update.dueDate } : {}),
                            };
                        }
                        return t;
                    })
                );
            } else {
                // Fallback: reload list
                await loadTasks();
            }

            return response;
        } finally {
            setBulkUpdating(false);
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
        priorityFilter,
        assigneeFilter,
        search,
        selectedTaskIds,
        isAllSelected,
        isIndeterminate,
        selectedTask,
        isDetailOpen,
        isCreateOpen,
        saving,
        saveError,
        bulkUpdating,
        setFilter,
        setStatusFilter,
        setPriorityFilter,
        setAssigneeFilter,
        setSearch,
        setSelectedTaskIds,
        toggleSelect,
        selectAll,
        clearSelection,
        setIsCreateOpen,
        openDetail,
        closeDetail,
        handleCreate,
        handleUpdate,
        handleDelete,
        handleBulkUpdate,
        cycleStatus,
        retry: loadTasks,
    };
}
