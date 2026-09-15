// app/(dashboard)/tasks/page.tsx
"use client";

import { TasksUI } from "@/components/tasks/TasksUI";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/context/AuthContext";

export default function TasksPage() {
    const { user } = useAuth();
    const {
        tasks,
        filteredTasks,
        loading,
        error,
        filter,
        statusFilter,
        priorityFilter,
        assigneeFilter,
        projectFilter,
        labelFilter,
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
        setProjectFilter,
        setLabelFilter,
        setSearch,
        toggleSelect,
        selectAll,
        clearSelection,
        setIsCreateOpen,
        openDetail,
        closeDetail,
        handleCreate,
        handleUpdate,
        handleStatusChange,
        handleDelete,
        handleBulkUpdate,
        cycleStatus,
        retry,
    } = useTasks(user?.id);

    return (
        <>
            <TasksUI
                tasks={tasks}
                filteredTasks={filteredTasks}
                loading={loading}
                error={error}
                filter={filter}
                statusFilter={statusFilter}
                priorityFilter={priorityFilter}
                assigneeFilter={assigneeFilter}
                projectFilter={projectFilter}
                labelFilter={labelFilter}
                search={search}
                isCreateOpen={isCreateOpen}
                saving={saving}
                saveError={saveError}
                selectedTaskIds={selectedTaskIds}
                isAllSelected={isAllSelected}
                isIndeterminate={isIndeterminate}
                bulkUpdating={bulkUpdating}
                onFilterChange={setFilter}
                onStatusFilterChange={setStatusFilter}
                onPriorityFilterChange={setPriorityFilter}
                onAssigneeFilterChange={setAssigneeFilter}
                onProjectFilterChange={setProjectFilter}
                onLabelFilterChange={setLabelFilter}
                onSearchChange={setSearch}
                onToggleSelect={toggleSelect}
                onSelectAll={selectAll}
                onClearSelection={clearSelection}
                onBulkUpdate={handleBulkUpdate}
                onOpenCreate={() => setIsCreateOpen(true)}
                onCloseCreate={() => setIsCreateOpen(false)}
                onCreateTask={handleCreate}
                onOpenDetail={openDetail}
                onCycleStatus={cycleStatus}
                onUpdateTask={(id, data) => handleStatusChange(id, data.status)}
                onDeleteTask={handleDelete}
                onRetry={retry}
            />

            {isDetailOpen && selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    allTasks={tasks}
                    saving={saving}
                    saveError={saveError}
                    onClose={closeDetail}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                />
            )}
        </>
    );
}
