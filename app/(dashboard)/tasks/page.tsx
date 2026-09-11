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
                onUpdateTask={(id, data) => handleUpdate(id, data)}
                onDeleteTask={handleDelete}
                onRetry={retry}
            />

            {isDetailOpen && selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
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
