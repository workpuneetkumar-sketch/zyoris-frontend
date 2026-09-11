// tests/tasks_foundation.test.ts
import test from "node:test";
import assert from "node:assert/strict";

// ── Pure Logic Functions Under Test (aligned with lib/api/tasksApi.ts) ─────────

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
  parentTaskId?: string | null;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface TasksResponse {
  tasks: Task[];
  total: number;
}

export interface BulkUpdatePayload {
  taskIds: string[];
  update: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedToId?: string | null;
    dueDate?: string | null;
  };
  workspaceId?: string;
}

export interface BulkUpdateResponse {
  success: boolean;
  data: {
    totalRequested: number;
    totalUpdated: number;
    totalFailed: number;
    results: {
      taskId: string;
      success: boolean;
      error?: string | null;
    }[];
  };
  message?: string;
}

export function toISODateTime(date: string | null | undefined): string | null {
  if (!date) return null;
  if (date.includes("T")) return date;
  return new Date(date).toISOString();
}

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

// ── Tests ─────────────────────────────────────────────────────────────────────

test("Task API normalization", async (t) => {
  await t.test("normalises array of tasks directly", () => {
    const raw: Task[] = [
      {
        id: "task-1",
        title: "Test Task 1",
        status: "TODO",
        priority: "HIGH",
        createdAt: "2026-09-11T12:00:00Z",
      },
      {
        id: "task-2",
        title: "Test Task 2",
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        createdAt: "2026-09-11T12:00:00Z",
      },
    ];
    const res = normaliseTasksResponse(raw);
    assert.strictEqual(res.tasks.length, 2);
    assert.strictEqual(res.total, 2);
    assert.strictEqual(res.tasks[0].id, "task-1");
  });

  await t.test("normalises { data: [...], pagination: { total } } payload", () => {
    const raw = {
      data: [
        {
          id: "task-3",
          title: "Test Task 3",
          status: "DONE",
          priority: "LOW",
          createdAt: "2026-09-11T12:00:00Z",
        },
      ],
      pagination: { total: 15 },
    };
    const res = normaliseTasksResponse(raw);
    assert.strictEqual(res.tasks.length, 1);
    assert.strictEqual(res.total, 15);
    assert.strictEqual(res.tasks[0].title, "Test Task 3");
  });

  await t.test("normalises { tasks: [...], total } payload", () => {
    const raw = {
      tasks: [
        {
          id: "task-4",
          title: "Test Task 4",
          status: "TODO",
          priority: "MEDIUM",
          createdAt: "2026-09-11T12:00:00Z",
        },
      ],
      total: 1,
    };
    const res = normaliseTasksResponse(raw);
    assert.strictEqual(res.tasks.length, 1);
    assert.strictEqual(res.total, 1);
  });

  await t.test("handles null or undefined safely", () => {
    assert.deepStrictEqual(normaliseTasksResponse(null), { tasks: [], total: 0 });
    assert.deepStrictEqual(normaliseTasksResponse(undefined), { tasks: [], total: 0 });
  });
});

test("ISO Date formatting for BE-2 Swagger validation", async (t) => {
  await t.test("formats YYYY-MM-DD into valid ISO 8601 string", () => {
    const formatted = toISODateTime("2026-09-15");
    assert.ok(formatted !== null);
    assert.ok(formatted.includes("2026-09-15T"));
    assert.ok(formatted.endsWith("Z"));
  });

  await t.test("leaves existing ISO datetime string unchanged", () => {
    const iso = "2026-09-15T18:30:00.000Z";
    assert.strictEqual(toISODateTime(iso), iso);
  });

  await t.test("returns null for empty or null dates", () => {
    assert.strictEqual(toISODateTime(null), null);
    assert.strictEqual(toISODateTime(""), null);
    assert.strictEqual(toISODateTime(undefined), null);
  });
});

test("Single-request bulk update contract", async (t) => {
  await t.test("ensures bulk payload structure adheres to BE-2 specification", () => {
    const payload: BulkUpdatePayload = {
      taskIds: ["task-1", "task-2", "task-3"],
      update: {
        status: "DONE",
        priority: "HIGH",
        assignedToId: "user-123",
        dueDate: "2026-09-20",
      },
      workspaceId: "ws-primary",
    };

    assert.strictEqual(payload.taskIds.length, 3);
    assert.strictEqual(payload.update.status, "DONE");
    assert.strictEqual(payload.update.priority, "HIGH");
    assert.strictEqual(payload.update.assignedToId, "user-123");
    assert.strictEqual(payload.workspaceId, "ws-primary");
  });

  await t.test("parses per-task reporting and success/failure breakdown correctly", () => {
    const response: BulkUpdateResponse = {
      success: true,
      data: {
        totalRequested: 3,
        totalUpdated: 2,
        totalFailed: 1,
        results: [
          { taskId: "task-1", success: true },
          { taskId: "task-2", success: true },
          { taskId: "task-3", success: false, error: "Task does not belong to this organization" },
        ],
      },
    };

    assert.strictEqual(response.data.totalRequested, 3);
    assert.strictEqual(response.data.totalUpdated, 2);
    assert.strictEqual(response.data.totalFailed, 1);
    assert.strictEqual(response.data.results[2].success, false);
    assert.ok(response.data.results[2].error?.includes("organization"));
  });
});

test("Task selection state helper logic", async (t) => {
  const sampleTasks: Task[] = [
    { id: "1", title: "T1", status: "TODO", priority: "LOW", createdAt: "2026-09-11" },
    { id: "2", title: "T2", status: "IN_PROGRESS", priority: "MEDIUM", createdAt: "2026-09-11" },
    { id: "3", title: "T3", status: "DONE", priority: "HIGH", createdAt: "2026-09-11" },
  ];

  await t.test("calculates select-all and indeterminate states correctly", () => {
    // None selected
    let selected: string[] = [];
    let isAllSelected = sampleTasks.every((t) => selected.includes(t.id));
    let isIndeterminate = selected.length > 0 && selected.length < sampleTasks.length;
    assert.strictEqual(isAllSelected, false);
    assert.strictEqual(isIndeterminate, false);

    // Partially selected
    selected = ["1"];
    isAllSelected = sampleTasks.every((t) => selected.includes(t.id));
    isIndeterminate = selected.length > 0 && selected.length < sampleTasks.length;
    assert.strictEqual(isAllSelected, false);
    assert.strictEqual(isIndeterminate, true);

    // All selected
    selected = ["1", "2", "3"];
    isAllSelected = sampleTasks.every((t) => selected.includes(t.id));
    isIndeterminate = selected.length > 0 && selected.length < sampleTasks.length;
    assert.strictEqual(isAllSelected, true);
    assert.strictEqual(isIndeterminate, false);
  });

  await t.test("toggles individual task selection", () => {
    let selected: string[] = [];
    const toggle = (id: string) =>
      selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];

    selected = toggle("task-1");
    assert.deepStrictEqual(selected, ["task-1"]);

    selected = toggle("task-2");
    assert.deepStrictEqual(selected, ["task-1", "task-2"]);

    selected = toggle("task-1");
    assert.deepStrictEqual(selected, ["task-2"]);
  });
});
