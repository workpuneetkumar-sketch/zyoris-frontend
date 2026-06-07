// lib/api/tasksApi.ts
// All network calls for the Tasks module.
// Backend Swagger endpoints:
//   POST   /tasks/create           — bearerAuth required
//   GET    /tasks/get-tasks        — bearerAuth required
//   GET    /tasks/get-task/{id}    — bearerAuth required
//   PATCH  /tasks/update-task/{id} — bearerAuth required
//
// NOTE on dueDate: Swagger specifies format:"date-time" — send full ISO string.

import api from "@/lib/api/api";

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
    } | null;
    createdById?: string;
    organizationId?: string;
    createdAt: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface TasksResponse {
    tasks: Task[];
    total: number;
}

export interface CreateTaskPayload {
    title: string;
    description?: string | null;
    priority?: TaskPriority;
    dueDate?: string | null;
    assignedToId?: string | null;
    status?: TaskStatus;
}

export interface UpdateTaskPayload {
    title?: string;
    description?: string | null;
    priority?: TaskPriority;
    dueDate?: string | null;
    assignedToId?: string | null;
    status?: TaskStatus;
}

// ── Helper: normalise date string → ISO 8601 datetime ─────────────────────────
// Swagger specifies dueDate as format:"date-time".
// Input from <input type="date"> gives "YYYY-MM-DD" — convert to full ISO.

function toISODateTime(date: string | null | undefined): string | null {
    if (!date) return null;
    // Already a full ISO string
    if (date.includes("T")) return date;
    // "YYYY-MM-DD" → "YYYY-MM-DDT00:00:00.000Z"
    return new Date(date).toISOString();
}

// ── Normalise response → TasksResponse ───────────────────────────────────────

function normaliseTasksResponse(raw: unknown): TasksResponse {
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
    // Some endpoints wrap in { task: [...] }
    if (Array.isArray(r.task)) {
        return { tasks: r.task as Task[], total: (r.task as unknown[]).length };
    }
    return { tasks: [], total: 0 };
}

// ── GET all tasks ─────────────────────────────────────────────────────────────
// GET /tasks/get-tasks

export async function fetchTasks(): Promise<TasksResponse> {
    const res = await api.get("/tasks/get-tasks");
    return normaliseTasksResponse(res.data);
}

// ── GET single task ───────────────────────────────────────────────────────────
// GET /tasks/get-task/{id}

export async function fetchTaskById(id: string): Promise<Task> {
    const res = await api.get<Task>(`/tasks/get-task/${id}`);
    return res.data;
}

// ── POST create task ──────────────────────────────────────────────────────────
// POST /tasks/create

export async function createTask(data: CreateTaskPayload): Promise<Task> {
    const payload: Record<string, unknown> = {
        title: data.title,
        status: data.status ?? "TODO",
        priority: data.priority ?? "MEDIUM",
    };

    if (data.description) payload.description = data.description;
    if (data.assignedToId?.trim()) payload.assignedToId = data.assignedToId.trim();

    const isoDate = toISODateTime(data.dueDate);
    if (isoDate) payload.dueDate = isoDate;

const res = await api.post<Task>("/tasks/create", payload);
    return res.data;
}

// ── PATCH update task ─────────────────────────────────────────────────────────
// PATCH /tasks/update-task/{id}

export async function updateTask(id: string, data: UpdateTaskPayload): Promise<Task> {
    const payload: Record<string, unknown> = {};

    if (data.title !== undefined)       payload.title       = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.priority !== undefined)    payload.priority    = data.priority;
    if (data.status !== undefined)      payload.status      = data.status;

    // assignedToId: send null explicitly to unassign
    if ("assignedToId" in data) {
        payload.assignedToId = (data.assignedToId as string)?.trim() || null;
    }

    // dueDate: convert to ISO datetime if provided
    if ("dueDate" in data) {
        payload.dueDate = toISODateTime(data.dueDate);
    }

    const res = await api.patch<Task>(`/tasks/update-task/${id}`, payload);
    return res.data;
}
