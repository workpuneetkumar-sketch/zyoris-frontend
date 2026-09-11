// lib/api/tasksApi.ts
// All network calls for the Tasks module aligned with BE-2 endpoints.
// Endpoints:
//   POST   /tasks                      — Create task
//   GET    /tasks                      — List/filter tasks
//   GET    /tasks/:id                  — Get task details
//   PATCH  /tasks/:id                  — Update single task
//   DELETE /tasks/:id                  — Delete task
//   POST   /workspace/tasks/bulk-update — Bulk update 1–100 tasks in one request
//   GET    /tasks/:taskId/comments     — List comments
//   POST   /tasks/:taskId/comments     — Add comment
//   GET    /tasks/:taskId/subtasks     — List subtasks
//   POST   /tasks/:taskId/subtasks     — Add subtask
//   GET    /tasks/:taskId/dependencies — List dependencies
//   POST   /tasks/:taskId/dependencies — Add dependency
//   GET    /tasks/:taskId/activity     — Get activity timeline

import api from "@/lib/api/api";
import axios from "axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface Task {
    id: string;
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string | null;
    assignedToId?: string | null;
    assignedTo?: {
        id: string;
        name: string;
        email?: string;
        avatarUrl?: string | null;
    } | null;
    parentTaskId?: string | null;
    createdById?: string;
    organizationId?: string;
    leadId?: string | null;
    dealId?: string | null;
    projectId?: string | null;
    createdAt: string;
    updatedAt?: string;
    subtasks?: TaskSubtask[];
    dependencies?: TaskDependency[];
    [key: string]: unknown;
}

export interface TasksResponse {
    tasks: Task[];
    total: number;
}

export interface TaskQueryParams {
    assignedToId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string;
    search?: string;
    parentTaskId?: string;
    page?: number;
    limit?: number;
}

export interface CreateTaskPayload {
    title: string;
    description?: string | null;
    priority?: TaskPriority;
    dueDate?: string | null;
    assignedToId?: string | null;
    status?: TaskStatus;
    leadId?: string | null;
    dealId?: string | null;
    projectId?: string | null;
    parentTaskId?: string | null;
    reminderMinutes?: number;
    reminderType?: "EMAIL" | "SMS" | "PUSH";
    dependsOnIds?: string[];
}

export interface UpdateTaskPayload {
    title?: string;
    description?: string | null;
    priority?: TaskPriority;
    dueDate?: string | null;
    assignedToId?: string | null;
    status?: TaskStatus;
    leadId?: string | null;
    dealId?: string | null;
    projectId?: string | null;
    parentTaskId?: string | null;
}

export interface BulkUpdateFields {
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedToId?: string | null;
    dueDate?: string | null;
}

export interface BulkUpdatePayload {
    taskIds: string[];
    update: BulkUpdateFields;
    workspaceId?: string;
}

export interface BulkUpdateTaskResult {
    taskId: string;
    success: boolean;
    error?: string | null;
}

export interface BulkUpdateResponse {
    success: boolean;
    data: {
        totalRequested: number;
        totalUpdated: number;
        totalFailed: number;
        results: BulkUpdateTaskResult[];
    };
    message?: string;
}

export interface TaskComment {
    id: string;
    taskId: string;
    authorId?: string;
    content: string;
    createdAt: string;
    updatedAt?: string;
    author?: {
        id: string;
        name: string;
        email?: string;
        avatarUrl?: string | null;
    };
}

export interface TaskSubtask {
    id: string;
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
    assignedToId?: string | null;
    parentTaskId: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateSubtaskPayload {
    title: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
    assignedToId?: string | null;
}

export interface TaskDependency {
    id: string;
    dependentId: string;
    dependencyId: string;
    createdAt: string;
    task?: Task;
}

export interface TaskActivity {
    id: string;
    taskId: string;
    actorId?: string | null;
    type:
        | "TASK_CREATED"
        | "TASK_ASSIGNED"
        | "TASK_UNASSIGNED"
        | "STATUS_CHANGED"
        | "PRIORITY_CHANGED"
        | "DUE_DATE_CHANGED"
        | "COMMENT_ADDED"
        | "COMMENT_UPDATED"
        | "COMMENT_DELETED"
        | "SUBTASK_CREATED"
        | "SUBTASK_UPDATED"
        | "SUBTASK_DELETED"
        | "DEPENDENCY_ADDED"
        | "DEPENDENCY_REMOVED";
    oldValue?: string | null;
    newValue?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
    actor?: {
        id: string;
        name: string;
        email?: string;
        avatarUrl?: string | null;
    };
}

// ── Helper: normalise date string → ISO 8601 datetime ─────────────────────────
export function toISODateTime(date: string | null | undefined): string | null {
    if (!date) return null;
    if (date.includes("T")) return date;
    return new Date(date).toISOString();
}

// ── Normalise response → TasksResponse ───────────────────────────────────────
export function normaliseTasksResponse(raw: unknown): TasksResponse {
    if (!raw) return { tasks: [], total: 0 };
    if (Array.isArray(raw)) {
        return { tasks: raw as Task[], total: (raw as Task[]).length };
    }
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r.data)) {
        const pagination = r.pagination as Record<string, number> | undefined;
        return {
            tasks: r.data as Task[],
            total: pagination?.total ?? (r.data as unknown[]).length,
        };
    }
    if (Array.isArray(r.tasks)) {
        return {
            tasks: r.tasks as Task[],
            total: typeof r.total === "number" ? r.total : (r.tasks as unknown[]).length,
        };
    }
    if (Array.isArray(r.task)) {
        return { tasks: r.task as Task[], total: (r.task as unknown[]).length };
    }
    return { tasks: [], total: 0 };
}

// ── GET all tasks ─────────────────────────────────────────────────────────────
// Primary: GET /tasks, Fallback: GET /tasks/get-tasks
export async function fetchTasks(params?: TaskQueryParams): Promise<TasksResponse> {
    try {
        const queryParams: Record<string, string | number> = {};
        if (params?.status) queryParams.status = params.status;
        if (params?.priority) queryParams.priority = params.priority;
        if (params?.search) queryParams.search = params.search;
        if (params?.assignedToId) queryParams.assignedToId = params.assignedToId;
        if (params?.dueDate) queryParams.dueDate = toISODateTime(params.dueDate) || params.dueDate;
        if (params?.parentTaskId) queryParams.parentTaskId = params.parentTaskId;
        if (params?.page) queryParams.page = params.page;
        if (params?.limit) queryParams.limit = params.limit;

        const res = await api.get("/tasks", { params: queryParams });
        return normaliseTasksResponse(res.data);
    } catch (err) {
        if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 405)) {
            // Fallback for backward compatibility
            try {
                const res = await api.get("/tasks/get-tasks");
                return normaliseTasksResponse(res.data);
            } catch (fallbackErr) {
                throw fallbackErr;
            }
        }
        throw err;
    }
}

// ── GET single task ───────────────────────────────────────────────────────────
// Primary: GET /tasks/:id, Fallback: GET /tasks/get-task/:id
export async function fetchTaskById(id: string): Promise<Task> {
    try {
        const res = await api.get<any>(`/tasks/${id}`);
        const data = res.data?.data || res.data?.task || res.data;
        return data as Task;
    } catch (err) {
        if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 405)) {
            try {
                const res = await api.get<Task>(`/tasks/get-task/${id}`);
                return res.data;
            } catch (fallbackErr) {
                throw fallbackErr;
            }
        }
        throw err;
    }
}

// ── POST create task ──────────────────────────────────────────────────────────
// Primary: POST /tasks, Fallback: POST /tasks/create
export async function createTask(data: CreateTaskPayload): Promise<Task> {
    const payload: Record<string, unknown> = {
        title: data.title,
        status: data.status ?? "TODO",
        priority: data.priority ?? "MEDIUM",
    };

    if (data.description !== undefined) payload.description = data.description;
    if (data.assignedToId) payload.assignedToId = data.assignedToId;
    if (data.leadId) payload.leadId = data.leadId;
    if (data.dealId) payload.dealId = data.dealId;
    if (data.projectId) payload.projectId = data.projectId;
    if (data.parentTaskId) payload.parentTaskId = data.parentTaskId;
    if (data.reminderMinutes !== undefined) payload.reminderMinutes = data.reminderMinutes;
    if (data.reminderType) payload.reminderType = data.reminderType;
    if (data.dependsOnIds && data.dependsOnIds.length > 0) payload.dependsOnIds = data.dependsOnIds;

    const isoDate = toISODateTime(data.dueDate);
    if (isoDate) payload.dueDate = isoDate;

    try {
        const res = await api.post<any>("/tasks", payload);
        const taskData = res.data?.data || res.data?.task || res.data;
        return taskData as Task;
    } catch (err) {
        if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 405)) {
            const res = await api.post<Task>("/tasks/create", payload);
            return res.data;
        }
        throw err;
    }
}

// ── PATCH update task ─────────────────────────────────────────────────────────
// Primary: PATCH /tasks/:id, Fallback: PATCH /tasks/update-task/:id
export async function updateTask(id: string, data: UpdateTaskPayload): Promise<Task> {
    const payload: Record<string, unknown> = {};

    if (data.title !== undefined)       payload.title       = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.priority !== undefined)    payload.priority    = data.priority;
    if (data.status !== undefined)      payload.status      = data.status;
    if (data.leadId !== undefined)      payload.leadId      = data.leadId;
    if (data.dealId !== undefined)      payload.dealId      = data.dealId;
    if (data.projectId !== undefined)   payload.projectId   = data.projectId;
    if (data.parentTaskId !== undefined)payload.parentTaskId= data.parentTaskId;

    if (data.assignedToId !== undefined) {
        payload.assignedToId = data.assignedToId || null;
    }

    if (data.dueDate !== undefined) {
        payload.dueDate = toISODateTime(data.dueDate);
    }

    try {
        const res = await api.patch<any>(`/tasks/${id}`, payload);
        const taskData = res.data?.data || res.data?.task || res.data;
        return taskData as Task;
    } catch (err) {
        if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 405)) {
            const res = await api.patch<Task>(`/tasks/update-task/${id}`, payload);
            return res.data;
        }
        throw err;
    }
}

// ── DELETE task ───────────────────────────────────────────────────────────────
// DELETE /tasks/:id
export async function deleteTask(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await api.delete<any>(`/tasks/${id}`);
    return res.data;
}

// ── POST /workspace/tasks/bulk-update ─────────────────────────────────────────
// Bulk update 1–100 tasks in one single request with per-task reporting
export async function bulkUpdateTasks(payload: BulkUpdatePayload): Promise<BulkUpdateResponse> {
    const updateBody: Record<string, unknown> = {};
    if (payload.update.status) updateBody.status = payload.update.status;
    if (payload.update.priority) updateBody.priority = payload.update.priority;
    if (payload.update.assignedToId !== undefined) {
        updateBody.assignedToId = payload.update.assignedToId || null;
    }
    if (payload.update.dueDate !== undefined) {
        updateBody.dueDate = toISODateTime(payload.update.dueDate);
    }

    const requestData: Record<string, unknown> = {
        taskIds: payload.taskIds,
        update: updateBody,
    };
    if (payload.workspaceId) {
        requestData.workspaceId = payload.workspaceId;
    }

    const res = await api.post<BulkUpdateResponse>("/workspace/tasks/bulk-update", requestData);
    return res.data;
}

// ── Sub-resources: Comments ───────────────────────────────────────────────────

export async function fetchTaskComments(taskId: string, page = 1, limit = 20): Promise<TaskComment[]> {
    try {
        const res = await api.get<any>(`/tasks/${taskId}/comments`, {
            params: { page, limit },
        });
        const comments = res.data?.data || res.data?.comments || (Array.isArray(res.data) ? res.data : []);
        return comments as TaskComment[];
    } catch {
        return [];
    }
}

export async function createTaskComment(taskId: string, content: string): Promise<TaskComment> {
    const res = await api.post<any>(`/tasks/${taskId}/comments`, { content });
    return (res.data?.data || res.data?.comment || res.data) as TaskComment;
}

// ── Sub-resources: Subtasks ───────────────────────────────────────────────────

export async function fetchTaskSubtasks(taskId: string): Promise<TaskSubtask[]> {
    try {
        const res = await api.get<any>(`/tasks/${taskId}/subtasks`);
        const subtasks = res.data?.data || res.data?.subtasks || (Array.isArray(res.data) ? res.data : []);
        return subtasks as TaskSubtask[];
    } catch {
        return [];
    }
}

export async function createTaskSubtask(taskId: string, payload: CreateSubtaskPayload): Promise<TaskSubtask> {
    const body: Record<string, unknown> = {
        title: payload.title,
        status: payload.status ?? "TODO",
        priority: payload.priority ?? "MEDIUM",
    };
    if (payload.description) body.description = payload.description;
    if (payload.assignedToId) body.assignedToId = payload.assignedToId;
    const isoDate = toISODateTime(payload.dueDate);
    if (isoDate) body.dueDate = isoDate;

    const res = await api.post<any>(`/tasks/${taskId}/subtasks`, body);
    return (res.data?.data || res.data?.subtask || res.data) as TaskSubtask;
}

// ── Sub-resources: Dependencies ───────────────────────────────────────────────

export async function fetchTaskDependencies(taskId: string): Promise<TaskDependency[]> {
    try {
        const res = await api.get<any>(`/tasks/${taskId}/dependencies`);
        const deps = res.data?.data || res.data?.dependencies || (Array.isArray(res.data) ? res.data : []);
        return deps as TaskDependency[];
    } catch {
        return [];
    }
}

export async function createTaskDependency(taskId: string, dependencyId: string): Promise<TaskDependency> {
    const res = await api.post<any>(`/tasks/${taskId}/dependencies`, { dependencyId });
    return (res.data?.data || res.data?.dependency || res.data) as TaskDependency;
}

// ── Sub-resources: Activity Timeline ──────────────────────────────────────────

export async function fetchTaskActivity(taskId: string, page = 1, limit = 20): Promise<TaskActivity[]> {
    try {
        const res = await api.get<any>(`/tasks/${taskId}/activity`, {
            params: { page, limit },
        });
        const activities = res.data?.data || res.data?.activities || (Array.isArray(res.data) ? res.data : []);
        return activities as TaskActivity[];
    } catch {
        return [];
    }
}
