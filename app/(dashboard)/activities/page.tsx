// app/(dashboard)/activities/page.tsx
"use client";

import { ActivitiesTable } from "@/components/activities/ActivitiesUI";
import { useActivities } from "@/hooks/useActivities";
import { PER_PAGE } from "@/types/activities";

export default function ActivitiesPage() {
    const {
        activities,
        total,
        page,
        filters,
        loading,
        error,
        openMenu,
        stats,
        overdue,
        breakdown,
        dateRange,
        setPage,
        setOpenMenu,
        handleFiltersChange,
        handleTabChange,
        handleNewActivity,
        handleAction,
        retry,
    } = useActivities();

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <p className="text-red-500 text-sm">{error}</p>
                <button
                    onClick={retry}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <ActivitiesTable
            activities={activities}
            total={total}
            page={page}
            perPage={PER_PAGE}
            filters={filters}
            loading={loading}
            openMenu={openMenu}
            stats={stats}
            overdue={overdue}
            breakdown={breakdown}
            dateRange={dateRange}
            onPageChange={setPage}
            onFiltersChange={handleFiltersChange}
            onTabChange={handleTabChange}
            onNewActivity={handleNewActivity}
            onAction={handleAction}
            setOpenMenu={setOpenMenu}
        />
    );
}