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

export interface TaskAssignmentEvent {
    id: string;
    taskId: string;
    assignedToId?: string | null;
    assignedById?: string | null;
    eventType?: string;
    createdAt: string;
    task?: Task | null;
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

export interface BulkUpdateData {
    totalRequested: number;
    totalUpdated: number;
    totalFailed: number;
    results: BulkUpdateTaskResult[];
}

export interface BulkUpdateResponse {
    success: boolean;
    totalRequested: number;
    totalUpdated: number;
    totalFailed: number;
    results: BulkUpdateTaskResult[];
    data: BulkUpdateData;
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

// ── GET My Tasks (assigned to current user) ──────────────────────────────────
// Primary: GET /workspace/my-tasks, Alias: GET /tasks/my-tasks
export async function fetchMyTasks(params?: TaskQueryParams): Promise<TasksResponse> {
    try {
        const queryParams: Record<string, string | number> = {};
        if (params?.status) queryParams.status = params.status;
        if (params?.priority) queryParams.priority = params.priority;
        if (params?.search) queryParams.search = params.search;
        if (params?.page) queryParams.page = params.page;
        if (params?.limit) queryParams.limit = params.limit;

        const res = await api.get("/workspace/my-tasks", { params: queryParams });
        return normaliseTasksResponse(res.data);
    } catch (err) {
        if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 405)) {
            try {
                const queryParams: Record<string, string | number> = {};
                if (params?.status) queryParams.status = params.status;
                if (params?.priority) queryParams.priority = params.priority;
                if (params?.search) queryParams.search = params.search;
                if (params?.page) queryParams.page = params.page;
                if (params?.limit) queryParams.limit = params.limit;

                const res = await api.get("/tasks/my-tasks", { params: queryParams });
                return normaliseTasksResponse(res.data);
            } catch (fallbackErr) {
                throw fallbackErr;
            }
        }
        throw err;
    }
}

// ── GET Assignment Events (recent assignment/reassignment events) ─────────────
// Primary: GET /workspace/tasks/assignment-events, Alias: GET /tasks/assignment-events
export async function fetchAssignmentEvents(since?: string, limit = 50): Promise<TaskAssignmentEvent[]> {
    try {
        const params: Record<string, string | number> = { limit };
        if (since) params.since = since;

        const res = await api.get("/workspace/tasks/assignment-events", { params });
        const data = res.data?.data || res.data?.events || res.data;
        return Array.isArray(data) ? data : [];
    } catch (err) {
        if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 405)) {
            try {
                const params: Record<string, string | number> = { limit };
                if (since) params.since = since;

                const res = await api.get("/tasks/assignment-events", { params });
                const data = res.data?.data || res.data?.events || res.data;
                return Array.isArray(data) ? data : [];
            } catch {
                return [];
            }
        }
        return [];
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

export function normaliseBulkUpdateResponse(raw: unknown): BulkUpdateResponse {
    if (!raw || typeof raw !== "object") {
        const emptyData: BulkUpdateData = {
            totalRequested: 0,
            totalUpdated: 0,
            totalFailed: 0,
            results: [],
        };
        return {
            success: false,
            ...emptyData,
            data: emptyData,
        };
    }

    const r = raw as Record<string, any>;
    const src = (r.data && typeof r.data === "object" && !Array.isArray(r.data)) ? r.data : r;
    const rawResults = Array.isArray(src.results) ? src.results : (Array.isArray(r.results) ? r.results : []);

    const results: BulkUpdateTaskResult[] = rawResults.map((item: any) => ({
        taskId: String(item.taskId ?? item.id ?? ""),
        success: Boolean(item.success ?? true),
        error: item.error ? String(item.error) : null,
    }));

    const totalRequested = typeof src.totalRequested === "number"
        ? src.totalRequested
        : typeof r.totalRequested === "number"
        ? r.totalRequested
        : results.length;

    const totalUpdated = typeof src.totalUpdated === "number"
        ? src.totalUpdated
        : typeof r.totalUpdated === "number"
        ? r.totalUpdated
        : results.filter((x) => x.success).length;

    const totalFailed = typeof src.totalFailed === "number"
        ? src.totalFailed
        : typeof r.totalFailed === "number"
        ? r.totalFailed
        : results.filter((x) => !x.success).length;

    const data: BulkUpdateData = {
        totalRequested,
        totalUpdated,
        totalFailed,
        results,
    };

    return {
        success: r.success !== false,
        totalRequested,
        totalUpdated,
        totalFailed,
        results,
        data,
        message: r.message,
    };
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

    const res = await api.post("/workspace/tasks/bulk-update", requestData);
    return normaliseBulkUpdateResponse(res.data);
}

// ── Sub-resources: Comments ───────────────────────────────────────────────────

export async function fetchTaskComments(taskId: string, page = 1, limit = 20): Promise<TaskComment[]> {
    try {
        const res = await api.get<any>(`/tasks/${taskId}/comments`, {
            params: { page, limit },
        });
        const raw = res.data;
        if (Array.isArray(raw)) return raw as TaskComment[];
        if (Array.isArray(raw?.data)) return raw.data as TaskComment[];
        if (Array.isArray(raw?.data?.comments)) return raw.data.comments as TaskComment[];
        if (Array.isArray(raw?.comments)) return raw.comments as TaskComment[];
        return [];
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
        const raw = res.data;
        if (Array.isArray(raw)) return raw as TaskSubtask[];
        if (Array.isArray(raw?.data)) return raw.data as TaskSubtask[];
        if (Array.isArray(raw?.data?.subtasks)) return raw.data.subtasks as TaskSubtask[];
        if (Array.isArray(raw?.subtasks)) return raw.subtasks as TaskSubtask[];
        return [];
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

export function normaliseTaskDependenciesResponse(raw: unknown, fallbackTaskId?: string): TaskDependency[] {
    if (!raw) return [];

    let list: unknown[] = [];
    if (Array.isArray(raw)) {
        list = raw;
    } else if (typeof raw === "object") {
        const r = raw as Record<string, any>;
        if (Array.isArray(r.data)) {
            list = r.data;
        } else if (r.data && typeof r.data === "object" && Array.isArray(r.data.dependencies)) {
            list = r.data.dependencies;
        } else if (r.data && typeof r.data === "object" && Array.isArray(r.data.blockers)) {
            list = r.data.blockers;
        } else if (r.data && typeof r.data === "object" && Array.isArray(r.data.items)) {
            list = r.data.items;
        } else if (Array.isArray(r.dependencies)) {
            list = r.dependencies;
        } else if (Array.isArray(r.items)) {
            list = r.items;
        }
    }

    if (!Array.isArray(list)) return [];

    return list.map((item: any, idx: number) => {
        if (!item || typeof item !== "object") {
            return {
                id: `dep-${fallbackTaskId || "task"}-${idx}`,
                dependentId: fallbackTaskId || "",
                dependencyId: String(item ?? ""),
                createdAt: new Date().toISOString(),
            };
        }
        const id = String(item.id ?? item._id ?? `dep-${fallbackTaskId || "task"}-${idx}`);
        const dependencyId = String(
            item.dependencyId ??
            item.dependsOnTaskId ??
            item.dependsOnId ??
            item.blockerTaskId ??
            item.blockedByTaskId ??
            item.targetTaskId ??
            item.taskId ??
            ""
        );
        const dependentId = String(
            item.dependentId ??
            item.sourceTaskId ??
            item.parentTaskId ??
            fallbackTaskId ??
            ""
        );
        const createdAt = item.createdAt ? String(item.createdAt) : new Date().toISOString();

        return {
            id,
            dependentId,
            dependencyId,
            createdAt,
            task: item.task,
        };
    });
}

export function normaliseTaskDependency(raw: unknown, fallbackTaskId?: string, fallbackDepId?: string): TaskDependency {
    if (!raw || typeof raw !== "object") {
        return {
            id: `dep-${Date.now()}`,
            dependentId: fallbackTaskId || "",
            dependencyId: fallbackDepId || "",
            createdAt: new Date().toISOString(),
        };
    }
    const r = raw as Record<string, any>;
    const item = (r.data && typeof r.data === "object" && !Array.isArray(r.data))
        ? (r.data.dependency || r.data)
        : (r.dependency || r);

    return {
        id: String(item.id ?? item._id ?? `dep-${Date.now()}`),
        dependentId: String(item.dependentId ?? item.sourceTaskId ?? fallbackTaskId ?? ""),
        dependencyId: String(item.dependencyId ?? item.dependsOnTaskId ?? fallbackDepId ?? ""),
        createdAt: item.createdAt ? String(item.createdAt) : new Date().toISOString(),
        task: item.task,
    };
}

export async function fetchTaskDependencies(taskId: string): Promise<TaskDependency[]> {
    try {
        const res = await api.get<any>(`/tasks/${taskId}/dependencies`);
        return normaliseTaskDependenciesResponse(res.data, taskId);
    } catch (err) {
        if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 405)) {
            return [];
        }
        throw err;
    }
}

export async function createTaskDependency(taskId: string, dependencyId: string): Promise<TaskDependency> {
    const res = await api.post<any>(`/tasks/${taskId}/dependencies`, { dependencyId });
    return normaliseTaskDependency(res.data, taskId, dependencyId);
}

// ── Sub-resources: Activity Timeline ──────────────────────────────────────────

export async function fetchTaskActivity(taskId: string, page = 1, limit = 20): Promise<TaskActivity[]> {
    try {
        const res = await api.get<any>(`/tasks/${taskId}/activity`, {
            params: { page, limit },
        });
        const raw = res.data;
        if (Array.isArray(raw)) return raw as TaskActivity[];
        if (Array.isArray(raw?.data)) return raw.data as TaskActivity[];
        if (Array.isArray(raw?.data?.activities)) return raw.data.activities as TaskActivity[];
        if (Array.isArray(raw?.activities)) return raw.activities as TaskActivity[];
        return [];
    } catch {
        return [];
    }
}
