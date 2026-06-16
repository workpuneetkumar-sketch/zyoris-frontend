// hooks/useActivities.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
    Activity,
    ActivitiesFilters,
    ActivityStats,
    OverdueActivity,
    ActivityTypeBreakdown,
    DEFAULT_FILTERS,
} from "@/types/activities";
import {
    fetchActivities,
    deleteActivity,
} from "@/lib/api/activitiesApi";

export function useActivities() {
    const router = useRouter();

    // ── State ─────────────────────────────────────────────────────────────────
    const [activities, setActivities] = useState<Activity[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<ActivitiesFilters>(DEFAULT_FILTERS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Activity | null>(null);
    const [stats, setStats] = useState<ActivityStats | null>(null);
    const [overdue, setOverdue] = useState<OverdueActivity[]>([]);
    const [breakdown, setBreakdown] = useState<ActivityTypeBreakdown[]>([]);
    const [dateRange, setDateRange] = useState({ from: "May 1, 2024", to: "May 31, 2024" });

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const loadActivities = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchActivities(page, filters);
            setActivities(data.activities ?? []);
            setTotal(data.total ?? 0);
            setStats(data.stats ?? null);
            setOverdue(data.overdue ?? []);
            setBreakdown(data.breakdown ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch activities.");
        } finally {
            setLoading(false);
        }
    }, [page, filters]);

    useEffect(() => {
        loadActivities();
    }, [loadActivities]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    function handleFiltersChange(next: Partial<ActivitiesFilters>) {
        setFilters((prev) => ({ ...prev, ...next }));
        setPage(1);
    }

    function handleTabChange(tab: ActivitiesFilters["tab"]) {
        handleFiltersChange({ tab });
    }

    function handleNewActivity() {
        router.push("/activities/new");
    }

    async function handleAction(action: string, activity: Activity) {
        switch (action) {
            case "View":
                router.push(`/activities/${activity.id}`);
                break;
            case "Edit":
                router.push(`/activities/${activity.id}/edit`);
                break;
            case "Delete": {
                setConfirmDelete(activity);
                break;
            }
        }
    }

    async function executeDelete() {
        if (!confirmDelete) return;
        const activity = confirmDelete;
        setConfirmDelete(null);
        try {
            await deleteActivity(activity.id);
            loadActivities();
            toast.success(`Activity "${activity.title}" deleted successfully`);
        } catch (err: any) {
            console.error("Delete error:", err);
            toast.error(err.message || "Failed to delete activity.");
        }
    }

    return {
        // state
        activities,
        total,
        page,
        filters,
        loading,
        error,
        openMenu,
        confirmDelete,
        stats,
        overdue,
        breakdown,
        dateRange,
        // setters
        setPage,
        setOpenMenu,
        setConfirmDelete,
        setDateRange,
        // handlers
        handleFiltersChange,
        handleTabChange,
        handleNewActivity,
        handleAction,
        executeDelete,
        retry: loadActivities,
    };
}