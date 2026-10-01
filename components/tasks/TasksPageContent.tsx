"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { TasksUI } from "@/components/tasks/TasksUI";
import { MyTasksView } from "@/components/tasks/MyTasksView";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { useTasks } from "@/hooks/useTasks";
import { useMyTasks } from "@/hooks/useMyTasks";
import { useAuth } from "@/context/AuthContext";
import { Inbox, KanbanSquare } from "lucide-react";
import { EffectiveAssignmentResponse } from "@/types/workspaceAssignment";

export function TasksPageContent({ defaultTab }: { defaultTab?: "my" | "all" }) {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const urlTab = searchParams?.get("tab");

    const [activeViewTab, setActiveViewTab] = useState<"my" | "all">(
        urlTab === "all" ? "all" : defaultTab || "my"
    );

    // Sync if URL tab changes
    useEffect(() => {
        if (urlTab === "all") setActiveViewTab("all");
        else if (urlTab === "my") setActiveViewTab("my");
    }, [urlTab]);

    // All Tasks (Jira Board & List) Hook
    const allTasksState = useTasks(user?.id);

    // Dedicated Employee Portal / My Tasks Hook
    const myTasksState = useMyTasks(user?.id);

    return (
        <>
            {/* Top View Mode Switcher Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 pt-3 pb-0 flex items-center justify-between">
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => setActiveViewTab("my")}
                        className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 text-xs font-bold transition ${
                            activeViewTab === "my"
                                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20"
                                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                    >
                        <Inbox size={15} />
                        <span>My Tasks (Employee Portal)</span>
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {myTasksState.counts.all}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveViewTab("all")}
                        className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 text-xs font-bold transition ${
                            activeViewTab === "all"
                                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20"
                                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                    >
                        <KanbanSquare size={15} />
                        <span>Jira Board & All Tasks</span>
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {allTasksState.tasks.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* Active View Content */}
            {activeViewTab === "my" ? (
                <MyTasksView
                    tasks={myTasksState.tasks}
                    filteredTasks={myTasksState.filteredTasks}
                    counts={myTasksState.counts}
                    loading={myTasksState.loading}
                    error={myTasksState.error}
                    bucket={myTasksState.bucket}
                    priorityFilter={myTasksState.priorityFilter}
                    search={myTasksState.search}
                    statusUpdatingId={myTasksState.statusUpdatingId}
                    permissionError={myTasksState.permissionError}
                    newAssignmentsCount={myTasksState.newAssignmentsCount}
                    assignmentEvents={myTasksState.assignmentEvents}
                    isEventsDrawerOpen={myTasksState.isEventsDrawerOpen}
                    onSelectBucket={myTasksState.setBucket}
                    onPriorityFilterChange={myTasksState.setPriorityFilter}
                    onSearchChange={myTasksState.setSearch}
                    onClearPermissionError={() => myTasksState.setPermissionError(null)}
                    onToggleEventsDrawer={myTasksState.setIsEventsDrawerOpen}
                    onDismissNotificationBanner={myTasksState.dismissNotificationBanner}
                    onUpdateStatus={myTasksState.handleUpdateStatus}
                    onRefresh={myTasksState.refresh}
                    onOpenTaskDetail={allTasksState.openDetail}
                    onReassignedTask={myTasksState.handleReassign}
                />
            ) : (
                <TasksUI
                    tasks={allTasksState.tasks}
                    filteredTasks={allTasksState.filteredTasks}
                    loading={allTasksState.loading}
                    error={allTasksState.error}
                    filter={allTasksState.filter}
                    statusFilter={allTasksState.statusFilter}
                    priorityFilter={allTasksState.priorityFilter}
                    assigneeFilter={allTasksState.assigneeFilter}
                    projectFilter={allTasksState.projectFilter}
                    labelFilter={allTasksState.labelFilter}
                    search={allTasksState.search}
                    isCreateOpen={allTasksState.isCreateOpen}
                    saving={allTasksState.saving}
                    saveError={allTasksState.saveError}
                    selectedTaskIds={allTasksState.selectedTaskIds}
                    isAllSelected={allTasksState.isAllSelected}
                    isIndeterminate={allTasksState.isIndeterminate}
                    bulkUpdating={allTasksState.bulkUpdating}
                    onFilterChange={allTasksState.setFilter}
                    onStatusFilterChange={allTasksState.setStatusFilter}
                    onPriorityFilterChange={allTasksState.setPriorityFilter}
                    onAssigneeFilterChange={allTasksState.setAssigneeFilter}
                    onProjectFilterChange={allTasksState.setProjectFilter}
                    onLabelFilterChange={allTasksState.setLabelFilter}
                    onSearchChange={allTasksState.setSearch}
                    onToggleSelect={allTasksState.toggleSelect}
                    onSelectAll={allTasksState.selectAll}
                    onClearSelection={allTasksState.clearSelection}
                    onBulkUpdate={allTasksState.handleBulkUpdate}
                    onOpenCreate={() => allTasksState.setIsCreateOpen(true)}
                    onCloseCreate={() => allTasksState.setIsCreateOpen(false)}
                    onCreateTask={allTasksState.handleCreate}
                    onOpenDetail={allTasksState.openDetail}
                    onCycleStatus={allTasksState.cycleStatus}
                    onUpdateTask={(id, data) => allTasksState.handleStatusChange(id, data.status)}
                    onDeleteTask={allTasksState.handleDelete}
                    onRetry={allTasksState.retry}
                />
            )}

            {/* Task Detail Modal (shared) */}
            {allTasksState.isDetailOpen && allTasksState.selectedTask && (
                <TaskDetailModal
                    task={allTasksState.selectedTask}
                    allTasks={allTasksState.tasks}
                    saving={allTasksState.saving}
                    saveError={allTasksState.saveError}
                    onClose={allTasksState.closeDetail}
                    onUpdate={allTasksState.handleUpdate}
                    onDelete={allTasksState.handleDelete}
                    onReassigned={(updatedAssignment: EffectiveAssignmentResponse) => {
                        allTasksState.handleReassign(updatedAssignment);
                        myTasksState.handleReassign(updatedAssignment);
                        myTasksState.refresh();
                        allTasksState.retry();
                    }}
                    onRefresh={() => {
                        myTasksState.refresh();
                        allTasksState.retry();
                    }}
                />
            )}
        </>
    );
}
