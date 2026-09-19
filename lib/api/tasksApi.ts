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

export type BackendTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "BLOCKED" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export const STATUS_MAPPING: Record<TaskStatus, BackendTaskStatus> = {
    TODO: "TODO",
    IN_PROGRESS: "IN_PROGRESS",
    REVIEW: "IN_PROGRESS",
    BLOCKED: "IN_PROGRESS",
    DONE: "DONE",
};

export function toBackendTaskStatus(status?: TaskStatus): BackendTaskStatus | undefined {
    if (!status) return undefined;
    return STATUS_MAPPING[status] ?? "TODO";
}

const SUBSTATUS_STORAGE_KEY = "zyoris_task_substatuses";

export function getTaskSubstatuses(): Record<string, "REVIEW" | "BLOCKED"> {
    if (typeof window === "undefined" || !window.localStorage) return {};
    try {
        const raw = localStorage.getItem(SUBSTATUS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function saveTaskSubstatus(taskId: string, status: TaskStatus) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
        const current = getTaskSubstatuses();
        if (status === "REVIEW" || status === "BLOCKED") {
            current[taskId] = status;
        } else {
            delete current[taskId];
        }
        localStorage.setItem(SUBSTATUS_STORAGE_KEY, JSON.stringify(current));
    } catch {
        // Ignore storage errors
    }
}

export function clearTaskSubstatus(taskId: string) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
        const current = getTaskSubstatuses();
        if (current[taskId]) {
            delete current[taskId];
            localStorage.setItem(SUBSTATUS_STORAGE_KEY, JSON.stringify(current));
        }
    } catch {
        // Ignore storage errors
    }
}

const LABELS_STORAGE_KEY = "zyoris_task_labels";

export function getTaskLabelsMap(): Record<string, string[]> {
    if (typeof window === "undefined" || !window.localStorage) return {};
    try {
        const raw = localStorage.getItem(LABELS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function saveTaskLabels(taskId: string, labels: string[]) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
        const current = getTaskLabelsMap();
        if (labels && labels.length > 0) {
            current[taskId] = labels;
        } else {
            delete current[taskId];
        }
        localStorage.setItem(LABELS_STORAGE_KEY, JSON.stringify(current));
    } catch {
        // Ignore storage errors
    }
}

export function clearTaskLabels(taskId: string) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
        const current = getTaskLabelsMap();
        if (current[taskId]) {
            delete current[taskId];
            localStorage.setItem(LABELS_STORAGE_KEY, JSON.stringify(current));
        }
    } catch {
        // Ignore storage errors
    }
}

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
    labels?: string[];
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
    projectId?: string;
    labels?: string[];
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
    labels?: string[];
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
    labels?: string[];
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
    direction?: "DEPENDS_ON" | "DEPENDED_ON_BY";
    task?: any;
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
    let result: TasksResponse = { tasks: [], total: 0 };
    if (!raw) return result;
    if (Array.isArray(raw)) {
        result = { tasks: raw as Task[], total: (raw as Task[]).length };
    } else {
        const r = raw as Record<string, unknown>;
        if (Array.isArray(r.data)) {
            const pagination = r.pagination as Record<string, number> | undefined;
            result = {
                tasks: r.data as Task[],
                total: pagination?.total ?? (r.data as unknown[]).length,
            };
        } else if (Array.isArray(r.tasks)) {
            result = {
                tasks: r.tasks as Task[],
                total: typeof r.total === "number" ? r.total : (r.tasks as unknown[]).length,
            };
        } else if (Array.isArray(r.task)) {
            result = { tasks: r.task as Task[], total: (r.task as unknown[]).length };
        }
    }

    // Apply stored substatuses for tasks with backend status IN_PROGRESS
    const substatuses = getTaskSubstatuses();
    if (Object.keys(substatuses).length > 0) {
        result.tasks = result.tasks.map((task) => {
            if (task && task.status === "IN_PROGRESS" && substatuses[task.id]) {
                return { ...task, status: substatuses[task.id] as TaskStatus };
            }
            return task;
        });
    }

    // Apply stored labels for tasks
    const labelsMap = getTaskLabelsMap();
    if (Object.keys(labelsMap).length > 0) {
        result.tasks = result.tasks.map((task) => {
            if (task && labelsMap[task.id]) {
                return { ...task, labels: labelsMap[task.id] };
            }
            return task;
        });
    }

    // Ensure dependencies array is populated if backend returned dependsOn
    result.tasks = result.tasks.map((task) => {
        if (task && !task.dependencies && Array.isArray((task as any).dependsOn)) {
            return {
                ...task,
                dependencies: normaliseTaskDependenciesResponse((task as any).dependsOn, task.id),
            };
        }
        return task;
    });

    return result;
}

// ── GET all tasks ─────────────────────────────────────────────────────────────
// Primary: GET /tasks, Fallback: GET /tasks/get-tasks
export async function fetchTasks(params?: TaskQueryParams): Promise<TasksResponse> {
    try {
        const queryParams: Record<string, string | number> = {};
        if (params?.status) queryParams.status = toBackendTaskStatus(params.status) || params.status;
        if (params?.priority) queryParams.priority = params.priority;
        if (params?.search) queryParams.search = params.search;
        if (params?.assignedToId) queryParams.assignedToId = params.assignedToId;
        if (params?.dueDate) queryParams.dueDate = toISODateTime(params.dueDate) || params.dueDate;
        if (params?.parentTaskId) queryParams.parentTaskId = params.parentTaskId;
        if (params?.projectId) queryParams.projectId = params.projectId;
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
        const data = (res.data?.data || res.data?.task || res.data) as Task;
        const substatuses = getTaskSubstatuses();
        if (data && data.status === "IN_PROGRESS" && substatuses[data.id]) {
            data.status = substatuses[data.id] as TaskStatus;
        }
        const labelsMap = getTaskLabelsMap();
        if (data && labelsMap[data.id]) {
            data.labels = labelsMap[data.id];
        }
        if (data && !data.dependencies && Array.isArray((data as any).dependsOn)) {
            data.dependencies = normaliseTaskDependenciesResponse((data as any).dependsOn, data.id);
        }
        return data;
    } catch (err) {
        if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 405)) {
            try {
                const res = await api.get<Task>(`/tasks/get-task/${id}`);
                const data = res.data;
                const substatuses = getTaskSubstatuses();
                if (data && data.status === "IN_PROGRESS" && substatuses[data.id]) {
                    data.status = substatuses[data.id] as TaskStatus;
                }
                const labelsMap = getTaskLabelsMap();
                if (data && labelsMap[data.id]) {
                    data.labels = labelsMap[data.id];
                }
                if (data && !data.dependencies && Array.isArray((data as any).dependsOn)) {
                    data.dependencies = normaliseTaskDependenciesResponse((data as any).dependsOn, data.id);
                }
                return data;
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
    const requestedStatus = data.status ?? "TODO";
    const backendStatus = toBackendTaskStatus(requestedStatus);

    const payload: Record<string, unknown> = {
        title: data.title,
        status: backendStatus,
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
        const taskData = (res.data?.data || res.data?.task || res.data) as Task;
        if (requestedStatus === "REVIEW" || requestedStatus === "BLOCKED") {
            saveTaskSubstatus(taskData.id, requestedStatus);
            taskData.status = requestedStatus;
        }
        if (data.labels && data.labels.length > 0) {
            saveTaskLabels(taskData.id, data.labels);
            taskData.labels = data.labels;
        }
        return taskData;
    } catch (err) {
        if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 405)) {
            const res = await api.post<Task>("/tasks/create", payload);
            const taskData = res.data;
            if (requestedStatus === "REVIEW" || requestedStatus === "BLOCKED") {
                saveTaskSubstatus(taskData.id, requestedStatus);
                taskData.status = requestedStatus;
            }
            if (data.labels && data.labels.length > 0) {
                saveTaskLabels(taskData.id, data.labels);
                taskData.labels = data.labels;
            }
            return taskData;
        }
        throw err;
    }
}

// ── Helper: build backend-safe PATCH payload ────────────────────────────────
export function sanitizeUpdateTaskPayload(data: UpdateTaskPayload): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.priority !== undefined) payload.priority = data.priority;
    if (data.status !== undefined) payload.status = toBackendTaskStatus(data.status);

    // Foreign key and relational ID fields: empty strings must NEVER be sent as foreign keys
    if (data.leadId !== undefined) payload.leadId = data.leadId ? data.leadId : null;
    if (data.dealId !== undefined) payload.dealId = data.dealId ? data.dealId : null;
    if (data.projectId !== undefined) payload.projectId = data.projectId ? data.projectId : null;
    if (data.parentTaskId !== undefined) payload.parentTaskId = data.parentTaskId ? data.parentTaskId : null;
    if (data.assignedToId !== undefined) payload.assignedToId = data.assignedToId ? data.assignedToId : null;

    if (data.dueDate !== undefined) {
        payload.dueDate = data.dueDate ? toISODateTime(data.dueDate) : null;
    }

    return payload;
}

// ── PATCH update task ─────────────────────────────────────────────────────────
// Primary: PATCH /tasks/:id, Fallback: PATCH /tasks/update-task/:id
export async function updateTask(id: string, data: UpdateTaskPayload): Promise<Task> {
    // 1. Immediately persist labels and substatus client-side
    if (data.labels !== undefined) {
        saveTaskLabels(id, data.labels);
    }
    if (data.status !== undefined) {
        saveTaskSubstatus(id, data.status);
    }

    const payload = sanitizeUpdateTaskPayload(data);
    const hasBackendFields = Object.keys(payload).length > 0;

    // If only client-side metadata (such as labels) was updated, avoid unnecessary/failing backend PATCH
    if (!hasBackendFields) {
        const labelsMap = getTaskLabelsMap();
        const currentLabels = data.labels !== undefined ? data.labels : (labelsMap[id] ?? []);
        const result: Partial<Task> = {
            id,
            labels: currentLabels,
        };
        if (data.status !== undefined) {
            result.status = data.status;
        }
        return result as Task;
    }

    try {
        const res = await api.patch<any>(`/tasks/${id}`, payload);
        const taskData = (res.data?.data || res.data?.task || res.data) as Task;
        if (data.status !== undefined) {
            taskData.status = data.status;
        } else {
            // When status was NOT part of update, preserve substatus (REVIEW/BLOCKED) if backend returned IN_PROGRESS
            const substatuses = getTaskSubstatuses();
            if (taskData && taskData.status === "IN_PROGRESS" && substatuses[id]) {
                taskData.status = substatuses[id] as TaskStatus;
            }
        }
        if (data.labels !== undefined) {
            taskData.labels = data.labels;
        } else {
            const labelsMap = getTaskLabelsMap();
            if (labelsMap[id]) {
                taskData.labels = labelsMap[id];
            }
        }
        return taskData;
    } catch (err) {
        if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 405)) {
            const res = await api.patch<Task>(`/tasks/update-task/${id}`, payload);
            const taskData = res.data;
            if (data.status !== undefined) {
                taskData.status = data.status;
            } else {
                const substatuses = getTaskSubstatuses();
                if (taskData && taskData.status === "IN_PROGRESS" && substatuses[id]) {
                    taskData.status = substatuses[id] as TaskStatus;
                }
            }
            if (data.labels !== undefined) {
                taskData.labels = data.labels;
            } else {
                const labelsMap = getTaskLabelsMap();
                if (labelsMap[id]) {
                    taskData.labels = labelsMap[id];
                }
            }
            return taskData;
        }
        throw err;
    }
}

// ── DELETE task ───────────────────────────────────────────────────────────────
// DELETE /tasks/:id
export async function deleteTask(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await api.delete<any>(`/tasks/${id}`);
    clearTaskSubstatus(id);
    clearTaskLabels(id);
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
// Internal helper to post a single chunk (max 20 items per backend OpenAPI schema)
async function postBulkUpdateChunk(
    chunkIds: string[],
    updateBody: Record<string, unknown>,
    workspaceId?: string
): Promise<BulkUpdateResponse> {
    const requestData: Record<string, unknown> = {
        taskIds: chunkIds,
        update: updateBody,
    };
    if (workspaceId) {
        requestData.workspaceId = workspaceId;
    }

    try {
        const res = await api.post("/workspace/tasks/bulk-update", requestData);
        return normaliseBulkUpdateResponse(res.data);
    } catch (err) {
        if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 405)) {
            try {
                const res = await api.post("/tasks/bulk-update", requestData);
                return normaliseBulkUpdateResponse(res.data);
            } catch (fallbackErr) {
                if (axios.isAxiosError(fallbackErr) && (fallbackErr.response?.status === 404 || fallbackErr.response?.status === 405)) {
                    const res = await api.post("/api/v1/tasks/bulk-update", requestData);
                    return normaliseBulkUpdateResponse(res.data);
                }
                throw fallbackErr;
            }
        }
        throw err;
    }
}

// Bulk update 1–100 tasks in one unified interface with per-task reporting
// Backend OpenAPI validates taskIds array has maxItems: 20, so large batches are auto-chunked
export async function bulkUpdateTasks(payload: BulkUpdatePayload): Promise<BulkUpdateResponse> {
    const updateBody: Record<string, unknown> = {};
    if (payload.update.status) {
        updateBody.status = toBackendTaskStatus(payload.update.status);
        payload.taskIds.forEach((id) => {
            saveTaskSubstatus(id, payload.update.status!);
        });
    }
    if (payload.update.priority) updateBody.priority = payload.update.priority;
    if (payload.update.assignedToId !== undefined) {
        updateBody.assignedToId = payload.update.assignedToId || null;
    }
    if (payload.update.dueDate !== undefined) {
        updateBody.dueDate = toISODateTime(payload.update.dueDate);
    }

    // If batch fits within OpenAPI schema limit (<= 20 tasks), send single request
    if (payload.taskIds.length <= 20) {
        return postBulkUpdateChunk(payload.taskIds, updateBody, payload.workspaceId);
    }

    // Otherwise chunk into batches of 20 and aggregate results
    const CHUNK_SIZE = 20;
    const chunks: string[][] = [];
    for (let i = 0; i < payload.taskIds.length; i += CHUNK_SIZE) {
        chunks.push(payload.taskIds.slice(i, i + CHUNK_SIZE));
    }

    const chunkPromises = chunks.map((chunk) =>
        postBulkUpdateChunk(chunk, updateBody, payload.workspaceId).catch((err) => {
            const errorMsg = axios.isAxiosError(err)
                ? (err.response?.data?.message || err.response?.data?.error || err.message)
                : (err instanceof Error ? err.message : "Bulk update failed");
            const failedResults: BulkUpdateTaskResult[] = chunk.map((id) => ({
                taskId: id,
                success: false,
                error: errorMsg,
            }));
            const chunkData: BulkUpdateData = {
                totalRequested: chunk.length,
                totalUpdated: 0,
                totalFailed: chunk.length,
                results: failedResults,
            };
            return {
                success: false,
                totalRequested: chunk.length,
                totalUpdated: 0,
                totalFailed: chunk.length,
                results: failedResults,
                data: chunkData,
                message: errorMsg,
            } as BulkUpdateResponse;
        })
    );

    const responses = await Promise.all(chunkPromises);

    const allResults: BulkUpdateTaskResult[] = [];
    let totalRequested = 0;
    let totalUpdated = 0;
    let totalFailed = 0;

    for (const r of responses) {
        totalRequested += r.totalRequested;
        totalUpdated += r.totalUpdated;
        totalFailed += r.totalFailed;
        allResults.push(...r.results);
    }

    const combinedData: BulkUpdateData = {
        totalRequested,
        totalUpdated,
        totalFailed,
        results: allResults,
    };

    return {
        success: totalFailed === 0,
        totalRequested,
        totalUpdated,
        totalFailed,
        results: allResults,
        data: combinedData,
        message:
            totalFailed > 0
                ? `Updated ${totalUpdated} of ${totalRequested} tasks (${totalFailed} failed)`
                : `Successfully updated ${totalUpdated} task${totalUpdated === 1 ? "" : "s"}`,
    };
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

<<<<<<< Updated upstream
export async function getTaskComment(taskId: string, commentId: string): Promise<TaskComment> {
    const res = await api.get<any>(`/tasks/${taskId}/comments/${commentId}`);
    return (res.data?.data || res.data?.comment || res.data) as TaskComment;
}

export async function updateTaskComment(taskId: string, commentId: string, content: string): Promise<TaskComment> {
    const res = await api.patch<any>(`/tasks/${taskId}/comments/${commentId}`, { content });
    return (res.data?.data || res.data?.comment || res.data) as TaskComment;
}

export async function deleteTaskComment(taskId: string, commentId: string): Promise<boolean> {
    const res = await api.delete<any>(`/tasks/${taskId}/comments/${commentId}`);
    return res.data?.success !== false;
=======
// ─── My Tasks & Assignment Events ───────────────────────────────────────────────

/**
 * Get tasks assigned to the current user.
 * GET /workspace/my-tasks (alias /tasks/my-tasks)
 */
export async function fetchMyTasks(params?: TaskQueryParams): Promise<TasksResponse> {
    try {
        const res = await api.get("/workspace/my-tasks", { params });
        const raw = res.data?.data ?? res.data;
        if (Array.isArray(raw)) {
            return { tasks: raw, total: raw.length };
        }
        return {
            tasks: raw?.tasks || raw?.items || [],
            total: raw?.total ?? (raw?.tasks?.length || 0),
        };
    } catch (err) {
        try {
            const fallbackRes = await api.get("/tasks/my-tasks", { params });
            const raw = fallbackRes.data?.data ?? fallbackRes.data;
            if (Array.isArray(raw)) {
                return { tasks: raw, total: raw.length };
            }
            return {
                tasks: raw?.tasks || raw?.items || [],
                total: raw?.total ?? (raw?.tasks?.length || 0),
            };
        } catch (e) {
            console.error("Error fetching my tasks:", e);
            return { tasks: [], total: 0 };
        }
    }
}

/**
 * Query recent task assignment / reassignment events for short polling.
 * GET /workspace/tasks/assignment-events (alias /tasks/assignment-events)
 */
export async function fetchTaskAssignmentEvents(since?: string): Promise<any[]> {
    try {
        const res = await api.get("/workspace/tasks/assignment-events", {
            params: { since, limit: 50 },
        });
        const raw = res.data?.data ?? res.data;
        return Array.isArray(raw) ? raw : raw?.events || [];
    } catch (err) {
        try {
            const fallbackRes = await api.get("/tasks/assignment-events", {
                params: { since, limit: 50 },
            });
            const raw = fallbackRes.data?.data ?? fallbackRes.data;
            return Array.isArray(raw) ? raw : raw?.events || [];
        } catch (e) {
            return [];
        }
    }
>>>>>>> Stashed changes
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

export async function getTaskSubtask(taskId: string, subtaskId: string): Promise<TaskSubtask> {
    const res = await api.get<any>(`/tasks/${taskId}/subtasks/${subtaskId}`);
    return (res.data?.data || res.data?.subtask || res.data) as TaskSubtask;
}

export async function updateTaskSubtask(
    taskId: string,
    subtaskId: string,
    payload: Partial<CreateSubtaskPayload>
): Promise<TaskSubtask> {
    const body: Record<string, unknown> = {};
    if (payload.title !== undefined) body.title = payload.title;
    if (payload.status !== undefined) body.status = payload.status;
    if (payload.priority !== undefined) body.priority = payload.priority;
    if (payload.description !== undefined) body.description = payload.description;
    if (payload.assignedToId !== undefined) body.assignedToId = payload.assignedToId;
    if (payload.dueDate !== undefined) {
        const isoDate = toISODateTime(payload.dueDate);
        if (isoDate) body.dueDate = isoDate;
    }

    const res = await api.patch<any>(`/tasks/${taskId}/subtasks/${subtaskId}`, body);
    return (res.data?.data || res.data?.subtask || res.data) as TaskSubtask;
}

export async function deleteTaskSubtask(taskId: string, subtaskId: string): Promise<boolean> {
    const res = await api.delete<any>(`/tasks/${taskId}/subtasks/${subtaskId}`);
    return res.data?.success !== false;
}

// ── Sub-resources: Dependencies ───────────────────────────────────────────────

export function normaliseTaskDependenciesResponse(raw: unknown, fallbackTaskId?: string): TaskDependency[] {
    if (!raw) return [];

    // Check for BE-2 envelope: { success: true, data: { taskId, dependsOn: [...], dependedOnBy: [...] } }
    // Or { dependsOn: [...], dependedOnBy: [...] }
    if (typeof raw === "object" && raw !== null) {
        const r = raw as Record<string, any>;
        const dataObj = (r.data && typeof r.data === "object" && !Array.isArray(r.data)) ? r.data : r;
        const rootTaskId = String(dataObj.taskId || fallbackTaskId || "");

        const hasDependsOn = Array.isArray(dataObj.dependsOn);
        const hasDependedOnBy = Array.isArray(dataObj.dependedOnBy);

        if (hasDependsOn || hasDependedOnBy) {
            const results: TaskDependency[] = [];

            if (hasDependsOn) {
                for (let idx = 0; idx < dataObj.dependsOn.length; idx++) {
                    const item = dataObj.dependsOn[idx];
                    if (!item || typeof item !== "object") continue;
                    const id = String(item.id ?? item._id ?? `dep-${rootTaskId || "task"}-on-${idx}`);
                    const targetTaskId = String(
                        item.task?.id ??
                        item.dependency?.id ??
                        item.dependencyId ??
                        item.dependsOnTaskId ??
                        item.dependsOnId ??
                        item.blockerTaskId ??
                        item.blockedByTaskId ??
                        item.targetTaskId ??
                        item.taskId ??
                        ""
                    );
                    const depId = targetTaskId || String(item.id ?? "");
                    const currentTaskId = String(
                        item.dependentId ??
                        item.sourceTaskId ??
                        item.parentTaskId ??
                        rootTaskId
                    );
                    results.push({
                        id,
                        dependentId: currentTaskId,
                        dependencyId: depId,
                        direction: "DEPENDS_ON",
                        createdAt: item.createdAt ? String(item.createdAt) : new Date().toISOString(),
                        task: item.task || item.dependency,
                    });
                }
            }

            if (hasDependedOnBy) {
                for (let idx = 0; idx < dataObj.dependedOnBy.length; idx++) {
                    const item = dataObj.dependedOnBy[idx];
                    if (!item || typeof item !== "object") continue;
                    const id = String(item.id ?? item._id ?? `dep-${rootTaskId || "task"}-by-${idx}`);
                    const otherTaskId = String(
                        item.task?.id ??
                        item.dependency?.id ??
                        item.dependentId ??
                        item.sourceTaskId ??
                        item.taskId ??
                        ""
                    );
                    results.push({
                        id,
                        dependentId: otherTaskId,
                        dependencyId: rootTaskId,
                        direction: "DEPENDED_ON_BY",
                        createdAt: item.createdAt ? String(item.createdAt) : new Date().toISOString(),
                        task: item.task || item.dependency,
                    });
                }
            }

            return results;
        }
    }

    // Generic list extraction for legacy / flat formats
    let list: unknown[] = [];
    if (Array.isArray(raw)) {
        list = raw;
    } else if (typeof raw === "object" && raw !== null) {
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
        } else if (Array.isArray(r.blockers)) {
            list = r.blockers;
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
                direction: "DEPENDS_ON",
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
            item.task?.id ??
            item.dependency?.id ??
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
            direction: (item.direction === "DEPENDED_ON_BY" ? "DEPENDED_ON_BY" : "DEPENDS_ON") as "DEPENDS_ON" | "DEPENDED_ON_BY",
            createdAt,
            task: item.task || item.dependency,
        };
    });
}

export function normaliseTaskDependency(raw: unknown, fallbackTaskId?: string, fallbackDepId?: string): TaskDependency {
    if (!raw || typeof raw !== "object") {
        return {
            id: `dep-${Date.now()}`,
            dependentId: fallbackTaskId || "",
            dependencyId: fallbackDepId || "",
            direction: "DEPENDS_ON",
            createdAt: new Date().toISOString(),
        };
    }
    const r = raw as Record<string, any>;
    const root = (r.data && typeof r.data === "object" && !Array.isArray(r.data)) ? r.data : r;

    const id = String(root.id ?? root._id ?? `dep-${Date.now()}`);
    const dependentId = String(
        root.dependentId ??
        root.sourceTaskId ??
        fallbackTaskId ??
        ""
    );
    const dependencyId = String(
        root.dependencyId ??
        root.dependsOnTaskId ??
        root.task?.id ??
        root.dependency?.id ??
        fallbackDepId ??
        ""
    );
    const createdAt = root.createdAt ? String(root.createdAt) : new Date().toISOString();
    const taskObj = root.task || root.dependency || undefined;

    return {
        id,
        dependentId,
        dependencyId,
        direction: "DEPENDS_ON",
        createdAt,
        task: taskObj,
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

export async function deleteTaskDependency(taskId: string, dependencyId: string): Promise<boolean> {
    const res = await api.delete<any>(`/tasks/${taskId}/dependencies/${dependencyId}`);
    return res.data?.success !== false;
}

// ── Sub-resources: Activity Timeline ──────────────────────────────────────────

export async function fetchTaskActivity(
    taskId: string,
    page = 1,
    limit = 20,
    type?: string
): Promise<TaskActivity[]> {
    try {
        const params: Record<string, unknown> = { page, limit };
        if (type) params.type = type;
        const res = await api.get<any>(`/tasks/${taskId}/activity`, { params });
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
