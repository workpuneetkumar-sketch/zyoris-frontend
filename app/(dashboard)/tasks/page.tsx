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
                search={search}
                isCreateOpen={isCreateOpen}
                saving={saving}
                saveError={saveError}
                onFilterChange={setFilter}
                onStatusFilterChange={setStatusFilter}
                onSearchChange={setSearch}
                onOpenCreate={() => setIsCreateOpen(true)}
                onCloseCreate={() => setIsCreateOpen(false)}
                onCreateTask={handleCreate}
                onOpenDetail={openDetail}
                onCycleStatus={cycleStatus}
                onUpdateTask={handleUpdate}
                onRetry={retry}
            />

            {isDetailOpen && selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    saving={saving}
                    saveError={saveError}
                    onClose={closeDetail}
                    onUpdate={handleUpdate}
                />
            )}
        </>
    );
}
