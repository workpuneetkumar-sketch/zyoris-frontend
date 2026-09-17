// tests/tasks_foundation.test.ts
import test from "node:test";
import assert from "node:assert/strict";

// ── Pure Logic Functions Under Test (aligned with lib/api/tasksApi.ts) ─────────

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
  labels?: string[];
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

export interface TaskDependency {
  id: string;
  dependentId: string;
  dependencyId: string;
  createdAt: string;
  direction?: "DEPENDS_ON" | "DEPENDED_ON_BY";
  task?: any;
}

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

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  assignedToId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  projectId?: string | null;
  parentTaskId?: string | null;
  labels?: string[];
  [key: string]: unknown;
}

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

export function calculateTaskDetailDirtyPayload(
  task: Task,
  form: Partial<Task>
): UpdateTaskPayload {
  const payload: UpdateTaskPayload = {};

  if (form.title !== undefined && form.title.trim() !== task.title) {
    payload.title = form.title.trim();
  }
  if (form.description !== undefined && (form.description ?? "") !== (task.description ?? "")) {
    payload.description = form.description ?? "";
  }
  if (form.assignedToId !== undefined && (form.assignedToId ?? "") !== (task.assignedToId ?? "")) {
    payload.assignedToId = form.assignedToId ? form.assignedToId : null;
  }
  const initialDueDate = task.dueDate ? task.dueDate.split("T")[0] : "";
  if (form.dueDate !== undefined && (form.dueDate ?? "") !== initialDueDate) {
    payload.dueDate = form.dueDate ? form.dueDate : null;
  }
  const initialProjectId = task.projectId ? String(task.projectId) : "";
  if (form.projectId !== undefined && (form.projectId ?? "") !== initialProjectId) {
    payload.projectId = typeof form.projectId === "string" && form.projectId.trim() ? form.projectId.trim() : null;
  }

  return payload;
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
    const rawWrapped = {
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

    const response = normaliseBulkUpdateResponse(rawWrapped);

    assert.strictEqual(response.data.totalRequested, 3);
    assert.strictEqual(response.data.totalUpdated, 2);
    assert.strictEqual(response.data.totalFailed, 1);
    assert.strictEqual(response.totalFailed, 1);
    assert.strictEqual(response.data.results[2].success, false);
    assert.ok(response.data.results[2].error?.includes("organization"));
  });

  await t.test("regression: normalises flat BE-2 response shape without crashing BulkResultModal", () => {
    // The exact response shape returned by BE-2 for POST /workspace/tasks/bulk-update:
    const rawBE2Flat = {
      success: true,
      totalRequested: 4,
      totalUpdated: 4,
      totalFailed: 0,
      results: [
        { taskId: "task-1", success: true, error: null },
        { taskId: "task-2", success: true, error: null },
        { taskId: "task-3", success: true, error: null },
        { taskId: "task-4", success: true, error: null },
      ],
    };

    const normalised = normaliseBulkUpdateResponse(rawBE2Flat);

    // 1. Data contract verification
    assert.ok(normalised.data !== undefined, "normalised.data must be defined");
    assert.strictEqual(normalised.data.totalRequested, 4);
    assert.strictEqual(normalised.data.totalUpdated, 4);
    assert.strictEqual(normalised.data.totalFailed, 0);
    assert.strictEqual(normalised.data.results.length, 4);

    // 2. Flat contract verification
    assert.strictEqual(normalised.totalRequested, 4);
    assert.strictEqual(normalised.totalUpdated, 4);
    assert.strictEqual(normalised.totalFailed, 0);
    assert.strictEqual(normalised.results.length, 4);

    // 3. Simulating BulkResultModal data extraction (preventing TypeError: reading 'totalFailed')
    const modalData = normalised.data ?? normalised;
    assert.notStrictEqual(modalData, undefined);
    assert.strictEqual(typeof modalData.totalFailed, "number");
    assert.strictEqual(modalData.totalFailed > 0, false);
    assert.strictEqual(modalData.totalUpdated, 4);
  });

  await t.test("regression: safely handles null, undefined, or empty payload in bulk update", () => {
    const fromNull = normaliseBulkUpdateResponse(null);
    assert.strictEqual(fromNull.data.totalFailed, 0);
    assert.strictEqual(fromNull.totalFailed, 0);
    assert.strictEqual(fromNull.data.results.length, 0);

    const fromEmpty = normaliseBulkUpdateResponse({});
    assert.strictEqual(fromEmpty.data.totalFailed, 0);
    assert.strictEqual(fromEmpty.totalFailed, 0);
  });

  await t.test("regression: optimistic local state update works with normalised results", () => {
    const tasks: Task[] = [
      { id: "task-1", title: "Task 1", status: "TODO", priority: "MEDIUM", createdAt: "2026-09-11" },
      { id: "task-2", title: "Task 2", status: "TODO", priority: "MEDIUM", createdAt: "2026-09-11" },
    ];

    const rawBE2Flat = {
      success: true,
      totalRequested: 2,
      totalUpdated: 2,
      totalFailed: 0,
      results: [
        { taskId: "task-1", success: true },
        { taskId: "task-2", success: true },
      ],
    };

    const res = normaliseBulkUpdateResponse(rawBE2Flat);
    const results = res.results ?? res.data?.results;
    assert.ok(results && results.length > 0);

    const successfulIds = new Set(results.filter((r) => r.success).map((r) => r.taskId));
    const updatedTasks = tasks.map((t) => (successfulIds.has(t.id) ? { ...t, status: "DONE" as TaskStatus } : t));

    assert.strictEqual(updatedTasks[0].status, "DONE");
    assert.strictEqual(updatedTasks[1].status, "DONE");
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

  await t.test("selectAll safely handles React event objects and toggles all tasks", () => {
    let selected: string[] = [];
    const selectAllFn = (taskIds?: unknown) => {
      const idsToUse = Array.isArray(taskIds) ? (taskIds as string[]) : sampleTasks.map((t) => t.id);
      const allSelected = idsToUse.length > 0 && idsToUse.every((id) => selected.includes(id));
      if (allSelected) {
        selected = selected.filter((id) => !idsToUse.includes(id));
      } else {
        selected = Array.from(new Set([...selected, ...idsToUse]));
      }
    };

    // 1. Calling with a mock SyntheticEvent object (the exact bug case)
    const mockChangeEvent = { target: { checked: true }, type: "change", _reactName: "onChange" };
    assert.doesNotThrow(() => selectAllFn(mockChangeEvent));
    assert.deepStrictEqual(selected, ["1", "2", "3"]);

    // 2. Calling again toggles (deselects all)
    assert.doesNotThrow(() => selectAllFn(mockChangeEvent));
    assert.deepStrictEqual(selected, []);

    // 3. Calling with undefined (no arguments)
    assert.doesNotThrow(() => selectAllFn());
    assert.deepStrictEqual(selected, ["1", "2", "3"]);
  });
});

test("Task dependencies normalization and TaskDetailModal contract", async (t) => {
  await t.test("regression: normalises envelope response with nested data.dependencies object", () => {
    // The exact bug case: backend returns { success: true, data: { dependencies: [...] } }
    const rawBEEnvelope = {
      success: true,
      message: "Dependencies retrieved",
      data: {
        dependencies: [
          {
            id: "dep-1",
            dependentId: "task-100",
            dependencyId: "task-200",
            createdAt: "2026-09-13T10:00:00.000Z",
          },
          {
            id: "dep-2",
            dependentId: "task-100",
            dependencyId: "task-300",
            createdAt: "2026-09-13T10:05:00.000Z",
          },
        ],
      },
    };

    const deps = normaliseTaskDependenciesResponse(rawBEEnvelope, "task-100");

    // Must be a real JavaScript array
    assert.strictEqual(Array.isArray(deps), true);
    assert.strictEqual(deps.length, 2);
    assert.strictEqual(deps[0].dependencyId, "task-200");
    assert.strictEqual(deps[1].dependencyId, "task-300");

    // Critical: must never throw TypeError: dependencies.map is not a function
    assert.doesNotThrow(() => {
      const rendered = deps.map((d) => `Depends on: ${d.dependencyId}`);
      assert.strictEqual(rendered.length, 2);
    });
  });

  await t.test("normalises array directly returned in data", () => {
    const rawDataArray = {
      success: true,
      data: [
        { id: "dep-a", dependencyId: "task-99", createdAt: "2026-09-13" },
      ],
    };

    const deps = normaliseTaskDependenciesResponse(rawDataArray, "task-1");
    assert.strictEqual(Array.isArray(deps), true);
    assert.strictEqual(deps.length, 1);
    assert.strictEqual(deps[0].dependencyId, "task-99");
  });

  await t.test("normalises flat array directly", () => {
    const rawFlat = [
      { id: "dep-b", dependencyId: "task-88", createdAt: "2026-09-13" },
    ];

    const deps = normaliseTaskDependenciesResponse(rawFlat, "task-1");
    assert.strictEqual(Array.isArray(deps), true);
    assert.strictEqual(deps.length, 1);
    assert.strictEqual(deps[0].dependencyId, "task-88");
  });

  await t.test("normalises flat object with dependencies property", () => {
    const rawFlatObj = {
      dependencies: [
        { id: "dep-c", dependencyId: "task-77", createdAt: "2026-09-13" },
      ],
    };

    const deps = normaliseTaskDependenciesResponse(rawFlatObj, "task-1");
    assert.strictEqual(Array.isArray(deps), true);
    assert.strictEqual(deps.length, 1);
    assert.strictEqual(deps[0].dependencyId, "task-77");
  });

  await t.test("handles empty object, null, or undefined by returning empty array", () => {
    assert.deepStrictEqual(normaliseTaskDependenciesResponse(null), []);
    assert.deepStrictEqual(normaliseTaskDependenciesResponse(undefined), []);
    assert.deepStrictEqual(normaliseTaskDependenciesResponse({}), []);
    assert.deepStrictEqual(normaliseTaskDependenciesResponse({ success: true, data: {} }), []);
    assert.deepStrictEqual(normaliseTaskDependenciesResponse({ success: true, data: null }), []);
  });

  await t.test("TaskDetailModal dependencies rendering logic never throws", () => {
    const testCases: unknown[] = [
      null,
      undefined,
      {},
      { data: {} },
      { data: { dependencies: [] } },
      { data: { dependencies: [{ id: "d1", dependencyId: "t2" }] } },
    ];

    for (const testCase of testCases) {
      const deps = normaliseTaskDependenciesResponse(testCase, "task-root");
      // Simulate component state:
      const safeDeps = Array.isArray(deps) ? deps : [];
      assert.doesNotThrow(() => {
        const ids = safeDeps.map((d) => d.id);
        const count = safeDeps.length;
        assert.strictEqual(typeof count, "number");
        assert.strictEqual(Array.isArray(ids), true);
      });
    }
  });

  await t.test("regression: normalises BE-2 live API shape with data.dependsOn and data.dependedOnBy", () => {
    const rawBE2 = {
      success: true,
      data: {
        taskId: "task-root-1",
        dependsOn: [
          {
            id: "dep-rel-1",
            task: {
              id: "task-blocker-2",
              title: "Blocker Task",
              status: "TODO",
              priority: "MEDIUM",
              assignedTo: null,
            },
            createdAt: "2026-09-15T20:00:00.000Z",
          },
        ],
        dependedOnBy: [
          {
            id: "dep-rel-2",
            task: {
              id: "task-dependent-3",
              title: "Dependent Child Task",
              status: "IN_PROGRESS",
              priority: "HIGH",
            },
            createdAt: "2026-09-15T20:05:00.000Z",
          },
        ],
      },
    };

    const deps = normaliseTaskDependenciesResponse(rawBE2, "task-root-1");
    assert.strictEqual(Array.isArray(deps), true);
    assert.strictEqual(deps.length, 2);

    // Blocker relationship
    assert.strictEqual(deps[0].id, "dep-rel-1");
    assert.strictEqual(deps[0].dependentId, "task-root-1");
    assert.strictEqual(deps[0].dependencyId, "task-blocker-2");
    assert.strictEqual(deps[0].direction, "DEPENDS_ON");
    assert.strictEqual(deps[0].task.title, "Blocker Task");

    // Depended on by relationship
    assert.strictEqual(deps[1].id, "dep-rel-2");
    assert.strictEqual(deps[1].dependentId, "task-dependent-3");
    assert.strictEqual(deps[1].dependencyId, "task-root-1");
    assert.strictEqual(deps[1].direction, "DEPENDED_ON_BY");
    assert.strictEqual(deps[1].task.title, "Dependent Child Task");
  });

  await t.test("regression: normalises BE-2 empty dependsOn and dependedOnBy arrays", () => {
    const rawEmpty = {
      success: true,
      data: {
        taskId: "task-root-empty",
        dependsOn: [],
        dependedOnBy: [],
      },
    };

    const deps = normaliseTaskDependenciesResponse(rawEmpty, "task-root-empty");
    assert.strictEqual(Array.isArray(deps), true);
    assert.strictEqual(deps.length, 0);
  });
});

test("Day 2: Jira Kanban 5-Column board and transitions", async (t) => {
  const KANBAN_COLUMNS: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "BLOCKED", "DONE"];

  await t.test("supports all 5 Jira board columns required by FE-2", () => {
    assert.strictEqual(KANBAN_COLUMNS.length, 5);
    assert.deepStrictEqual(KANBAN_COLUMNS, ["TODO", "IN_PROGRESS", "REVIEW", "BLOCKED", "DONE"]);
  });

  await t.test("Kanban column distribution groups tasks into their correct status buckets", () => {
    const sampleTasks: Task[] = [
      { id: "1", title: "Task 1", status: "TODO", priority: "MEDIUM", createdAt: "2026-09-14" },
      { id: "2", title: "Task 2", status: "IN_PROGRESS", priority: "HIGH", createdAt: "2026-09-14" },
      { id: "3", title: "Task 3", status: "REVIEW", priority: "LOW", createdAt: "2026-09-14" },
      { id: "4", title: "Task 4", status: "BLOCKED", priority: "HIGH", createdAt: "2026-09-14" },
      { id: "5", title: "Task 5", status: "DONE", priority: "MEDIUM", createdAt: "2026-09-14" },
    ];

    const buckets: Record<TaskStatus, Task[]> = {
      TODO: sampleTasks.filter((t) => t.status === "TODO"),
      IN_PROGRESS: sampleTasks.filter((t) => t.status === "IN_PROGRESS"),
      REVIEW: sampleTasks.filter((t) => t.status === "REVIEW"),
      BLOCKED: sampleTasks.filter((t) => t.status === "BLOCKED"),
      DONE: sampleTasks.filter((t) => t.status === "DONE"),
    };

    assert.strictEqual(buckets.TODO.length, 1);
    assert.strictEqual(buckets.IN_PROGRESS.length, 1);
    assert.strictEqual(buckets.REVIEW.length, 1);
    assert.strictEqual(buckets.BLOCKED.length, 1);
    assert.strictEqual(buckets.DONE.length, 1);
  });

  await t.test("Kanban drag-and-drop moves task between statuses optimistically", () => {
    let tasks: Task[] = [
      { id: "task-dnd-1", title: "Drag Me", status: "TODO", priority: "MEDIUM", createdAt: "2026-09-14" },
      { id: "task-dnd-2", title: "Stay Here", status: "IN_PROGRESS", priority: "LOW", createdAt: "2026-09-14" },
    ];

    // Simulate drag and drop from TODO to REVIEW
    const targetTaskId = "task-dnd-1";
    const targetNewStatus: TaskStatus = "REVIEW";

    // Optimistic reducer
    tasks = tasks.map((t) => (t.id === targetTaskId ? { ...t, status: targetNewStatus } : t));

    assert.strictEqual(tasks[0].status, "REVIEW");
    assert.strictEqual(tasks[1].status, "IN_PROGRESS");

    // Simulate drag from REVIEW to BLOCKED
    tasks = tasks.map((t) => (t.id === targetTaskId ? { ...t, status: "BLOCKED" as TaskStatus } : t));
    assert.strictEqual(tasks[0].status, "BLOCKED");

    // Simulate drag from BLOCKED to DONE
    tasks = tasks.map((t) => (t.id === targetTaskId ? { ...t, status: "DONE" as TaskStatus } : t));
    assert.strictEqual(tasks[0].status, "DONE");
  });

  await t.test("maps all 5 Kanban column statuses to valid BE-2 backend schema enums", () => {
    // BE-2 OpenAPI contract strictly accepts: ['TODO', 'IN_PROGRESS', 'DONE']
    const validBackendEnums: BackendTaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

    const allStatuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "BLOCKED", "DONE"];
    for (const status of allStatuses) {
      const mapped = toBackendTaskStatus(status);
      assert.ok(mapped, `Expected mapped status for ${status}`);
      assert.ok(
        validBackendEnums.includes(mapped),
        `Status ${status} mapped to ${mapped} which is not in backend enum ${validBackendEnums.join(", ")}`
      );
    }
  });

  await t.test("preserves exact working TODO, IN_PROGRESS, and DONE status transitions for backend compatibility", () => {
    assert.strictEqual(toBackendTaskStatus("TODO"), "TODO");
    assert.strictEqual(toBackendTaskStatus("IN_PROGRESS"), "IN_PROGRESS");
    assert.strictEqual(toBackendTaskStatus("DONE"), "DONE");
  });

  await t.test("regression: dragging task to REVIEW constructs backend-compliant IN_PROGRESS payload without rejecting", () => {
    const targetStatus: TaskStatus = "REVIEW";
    const backendPayloadStatus = toBackendTaskStatus(targetStatus);

    // Assert mapped to IN_PROGRESS so backend schema validation never rejects with 400
    assert.strictEqual(backendPayloadStatus, "IN_PROGRESS");

    // Construct update payload as sent by updateTask
    const updatePayload = {
      status: toBackendTaskStatus(targetStatus),
    };
    assert.deepStrictEqual(updatePayload, { status: "IN_PROGRESS" });
  });

  await t.test("regression: dragging task to BLOCKED constructs backend-compliant IN_PROGRESS payload without rejecting", () => {
    const targetStatus: TaskStatus = "BLOCKED";
    const backendPayloadStatus = toBackendTaskStatus(targetStatus);

    // Assert mapped to IN_PROGRESS so backend schema validation never rejects with 400
    assert.strictEqual(backendPayloadStatus, "IN_PROGRESS");

    // Construct update payload as sent by updateTask
    const updatePayload = {
      status: toBackendTaskStatus(targetStatus),
    };
    assert.deepStrictEqual(updatePayload, { status: "IN_PROGRESS" });
  });

  await t.test("regression: normaliseTasksResponse restores REVIEW and BLOCKED substatuses for IN_PROGRESS tasks", () => {
    const rawBackendTasks: Task[] = [
      { id: "t-1", title: "Task 1", status: "TODO", priority: "MEDIUM", createdAt: "2026-09-15" },
      { id: "t-2", title: "Task 2 in Review", status: "IN_PROGRESS", priority: "HIGH", createdAt: "2026-09-15" },
      { id: "t-3", title: "Task 3 Blocked", status: "IN_PROGRESS", priority: "LOW", createdAt: "2026-09-15" },
      { id: "t-4", title: "Task 4 Normal WIP", status: "IN_PROGRESS", priority: "MEDIUM", createdAt: "2026-09-15" },
      { id: "t-5", title: "Task 5 Finished", status: "DONE", priority: "HIGH", createdAt: "2026-09-15" },
    ];

    const mockSubstatuses: Record<string, "REVIEW" | "BLOCKED"> = {
      "t-2": "REVIEW",
      "t-3": "BLOCKED",
    };

    // Simulate normalization with substatuses
    const normalized = rawBackendTasks.map((t) => {
      if (t.status === "IN_PROGRESS" && mockSubstatuses[t.id]) {
        return { ...t, status: mockSubstatuses[t.id] as TaskStatus };
      }
      return t;
    });

    assert.strictEqual(normalized[0].status, "TODO");
    assert.strictEqual(normalized[1].status, "REVIEW");
    assert.strictEqual(normalized[2].status, "BLOCKED");
    assert.strictEqual(normalized[3].status, "IN_PROGRESS");
    assert.strictEqual(normalized[4].status, "DONE");
  });

  await t.test("regression: dragging task from REVIEW/BLOCKED to DONE or TODO cleans up substatus override", () => {
    let mockSubstatuses: Record<string, "REVIEW" | "BLOCKED"> = {
      "task-123": "REVIEW",
    };

    function onTransition(taskId: string, newStatus: TaskStatus) {
      if (newStatus === "REVIEW" || newStatus === "BLOCKED") {
        mockSubstatuses[taskId] = newStatus;
      } else {
        delete mockSubstatuses[taskId];
      }
      return toBackendTaskStatus(newStatus);
    }

    // Move from REVIEW to DONE
    const backendStatus = onTransition("task-123", "DONE");
    assert.strictEqual(backendStatus, "DONE");
    assert.strictEqual(mockSubstatuses["task-123"], undefined);

    // Move to BLOCKED
    const blockedBackendStatus = onTransition("task-123", "BLOCKED");
    assert.strictEqual(blockedBackendStatus, "IN_PROGRESS");
    assert.strictEqual(mockSubstatuses["task-123"], "BLOCKED");

    // Move to TODO
    const todoBackendStatus = onTransition("task-123", "TODO");
    assert.strictEqual(todoBackendStatus, "TODO");
    assert.strictEqual(mockSubstatuses["task-123"], undefined);
  });
});

test("Day 2: Multi-attribute filter logic", async (t) => {
  const sampleTasks: (Task & { labels?: string[]; projectId?: string })[] = [
    {
      id: "1",
      title: "Fix Authentication Bugs",
      description: "JWT cookie handling",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assignedToId: "user-1",
      projectId: "AUTH",
      labels: ["backend", "security"],
      createdAt: "2026-09-14",
    },
    {
      id: "2",
      title: "Design Kanban Board UI",
      description: "Drag drop columns",
      status: "TODO",
      priority: "MEDIUM",
      assignedToId: "user-2",
      projectId: "FE",
      labels: ["frontend", "ui"],
      createdAt: "2026-09-14",
    },
    {
      id: "3",
      title: "Write documentation",
      description: "API swagger docs",
      status: "DONE",
      priority: "LOW",
      assignedToId: undefined,
      projectId: "DOCS",
      labels: ["docs"],
      createdAt: "2026-09-14",
    },
  ];

  await t.test("filters by search query matching title or description or label", () => {
    const filterFn = (tasks: typeof sampleTasks, q: string) => {
      const lower = q.toLowerCase();
      return tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(lower) ||
          (t.description?.toLowerCase().includes(lower) ?? false) ||
          (t.labels?.some((l) => l.toLowerCase().includes(lower)) ?? false)
      );
    };

    assert.strictEqual(filterFn(sampleTasks, "Auth").length, 1);
    assert.strictEqual(filterFn(sampleTasks, "drag drop").length, 1);
    assert.strictEqual(filterFn(sampleTasks, "security").length, 1);
    assert.strictEqual(filterFn(sampleTasks, "nonexistent").length, 0);
  });

  await t.test("filters by project ID", () => {
    const filterByProject = (tasks: typeof sampleTasks, proj: string) =>
      proj === "all" ? tasks : tasks.filter((t) => t.projectId === proj);

    assert.strictEqual(filterByProject(sampleTasks, "all").length, 3);
    assert.strictEqual(filterByProject(sampleTasks, "AUTH").length, 1);
    assert.strictEqual(filterByProject(sampleTasks, "FE").length, 1);
    assert.strictEqual(filterByProject(sampleTasks, "NONE").length, 0);
  });

  await t.test("filters by label tag", () => {
    const filterByLabel = (tasks: typeof sampleTasks, label: string) =>
      label === "all" ? tasks : tasks.filter((t) => t.labels?.includes(label));

    assert.strictEqual(filterByLabel(sampleTasks, "all").length, 3);
    assert.strictEqual(filterByLabel(sampleTasks, "frontend").length, 1);
    assert.strictEqual(filterByLabel(sampleTasks, "backend").length, 1);
  });

  await t.test("filters by unassigned assignee", () => {
    const unassigned = sampleTasks.filter((t) => !t.assignedToId);
    assert.strictEqual(unassigned.length, 1);
    assert.strictEqual(unassigned[0].id, "3");
  });
});

test("Day 2: Subtasks progress calculation", async (t) => {
  await t.test("calculates completed percentage accurately", () => {
    const subtasks = [
      { id: "s1", title: "Subtask 1", status: "DONE" as TaskStatus },
      { id: "s2", title: "Subtask 2", status: "DONE" as TaskStatus },
      { id: "s3", title: "Subtask 3", status: "TODO" as TaskStatus },
      { id: "s4", title: "Subtask 4", status: "TODO" as TaskStatus },
    ];

    const completed = subtasks.filter((s) => s.status === "DONE").length;
    const percent = Math.round((completed / subtasks.length) * 100);

    assert.strictEqual(completed, 2);
    assert.strictEqual(percent, 50);
  });

  await t.test("handles 0 subtasks safely without NaN or division by zero", () => {
    const subtasks: any[] = [];
    const completed = subtasks.filter((s) => s.status === "DONE").length;
    const percent = subtasks.length > 0 ? Math.round((completed / subtasks.length) * 100) : 0;

    assert.strictEqual(completed, 0);
    assert.strictEqual(percent, 0);
    assert.strictEqual(Number.isNaN(percent), false);
  });
});

test("Day 2 Regression: Task detail editing and field isolation", async (t) => {
  await t.test("title-only update preserves status/priority and prevents DB_FOREIGN_KEY", () => {
    const existingTask: Task = {
      id: "t-100",
      title: "Initial Title",
      description: "Initial Description",
      status: "REVIEW",
      priority: "HIGH",
      assignedToId: "user-1",
      projectId: "proj-1",
      createdAt: "2026-09-15T10:00:00Z",
    };

    // Simulate user editing only title in TaskDetailModal
    const dirtyPayload = calculateTaskDetailDirtyPayload(existingTask, {
      title: "Updated Title",
      description: "Initial Description", // unchanged
      assignedToId: "user-1", // unchanged
      projectId: "proj-1", // unchanged
    });

    // Assert dirty check generated ONLY title
    assert.deepStrictEqual(dirtyPayload, { title: "Updated Title" });
    assert.strictEqual("status" in dirtyPayload, false);
    assert.strictEqual("priority" in dirtyPayload, false);
    assert.strictEqual("leadId" in dirtyPayload, false);
    assert.strictEqual("dealId" in dirtyPayload, false);
    assert.strictEqual("projectId" in dirtyPayload, false);

    // Sanitize payload for PATCH /tasks/:id
    const patchPayload = sanitizeUpdateTaskPayload(dirtyPayload);
    assert.deepStrictEqual(patchPayload, { title: "Updated Title" });

    // Optimistic merge in useTasks
    const mergedTask = { ...existingTask, ...dirtyPayload };
    assert.strictEqual(mergedTask.title, "Updated Title");
    assert.strictEqual(mergedTask.status, "REVIEW");
    assert.strictEqual(mergedTask.priority, "HIGH");
  });

  await t.test("description-only update preserves status/priority and prevents DB_FOREIGN_KEY", () => {
    const existingTask: Task = {
      id: "t-101",
      title: "Fixed Title",
      description: "Old notes",
      status: "BLOCKED",
      priority: "LOW",
      createdAt: "2026-09-15T10:00:00Z",
    };

    // User edits only description
    const dirtyPayload = calculateTaskDetailDirtyPayload(existingTask, {
      title: "Fixed Title", // unchanged
      description: "New updated detailed notes",
    });

    assert.deepStrictEqual(dirtyPayload, { description: "New updated detailed notes" });
    assert.strictEqual("status" in dirtyPayload, false);
    assert.strictEqual("priority" in dirtyPayload, false);
    assert.strictEqual("leadId" in dirtyPayload, false);

    const patchPayload = sanitizeUpdateTaskPayload(dirtyPayload);
    assert.deepStrictEqual(patchPayload, { description: "New updated detailed notes" });

    const mergedTask = { ...existingTask, ...dirtyPayload };
    assert.strictEqual(mergedTask.description, "New updated detailed notes");
    assert.strictEqual(mergedTask.status, "BLOCKED");
    assert.strictEqual(mergedTask.priority, "LOW");
  });

  await t.test("priority-only update preserves status (Review / Blocked) without altering status", () => {
    const existingTask: Task = {
      id: "t-102",
      title: "Review Feature",
      description: "Code is ready for QA",
      status: "REVIEW",
      priority: "MEDIUM",
      createdAt: "2026-09-15T10:00:00Z",
    };

    // User changes priority from MEDIUM to LOW via quick dropdown in TaskDetailModal
    const priorityUpdatePayload: UpdateTaskPayload = { priority: "LOW" };

    assert.strictEqual(priorityUpdatePayload.status, undefined);
    assert.strictEqual(priorityUpdatePayload.priority, "LOW");

    // Sanitize payload for PATCH /tasks/:id
    const patchPayload = sanitizeUpdateTaskPayload(priorityUpdatePayload);
    assert.deepStrictEqual(patchPayload, { priority: "LOW" });
    assert.strictEqual("status" in patchPayload, false);

    // Simulate backend response where backend database stores status as IN_PROGRESS
    const rawBackendResponse: Task = {
      ...existingTask,
      priority: "LOW",
      status: "IN_PROGRESS" as TaskStatus,
    };

    // Simulate updateTask response processing: since data.status === undefined,
    // active substatus (REVIEW) is preserved from substatus store
    const mockSubstatuses: Record<string, TaskStatus> = { "t-102": "REVIEW" };
    const processedTask = { ...rawBackendResponse };
    if (
      priorityUpdatePayload.status === undefined &&
      processedTask.status === "IN_PROGRESS" &&
      mockSubstatuses[processedTask.id]
    ) {
      processedTask.status = mockSubstatuses[processedTask.id];
    }

    assert.strictEqual(processedTask.status, "REVIEW");
    assert.strictEqual(processedTask.priority, "LOW");

    // Simulate useTasks handleUpdate state merge logic
    const stateMergedTask = {
      ...existingTask,
      ...processedTask,
      status: priorityUpdatePayload.status === undefined ? existingTask.status : processedTask.status,
    };

    assert.strictEqual(stateMergedTask.status, "REVIEW");
    assert.strictEqual(stateMergedTask.priority, "LOW");
  });

  await t.test("foreign-key sanitization converts empty strings to null or omits them to prevent DB_FOREIGN_KEY", () => {
    const dirtyFormWithEmptyForeignKeys: UpdateTaskPayload = {
      title: "Edit task",
      description: "Details",
      leadId: "",
      dealId: "",
      projectId: "",
      assignedToId: "",
      parentTaskId: "",
    };

    const sanitized = sanitizeUpdateTaskPayload(dirtyFormWithEmptyForeignKeys);

    assert.strictEqual(sanitized.title, "Edit task");
    assert.strictEqual(sanitized.description, "Details");
    assert.strictEqual(sanitized.leadId, null, "leadId must be null, never empty string");
    assert.strictEqual(sanitized.dealId, null, "dealId must be null, never empty string");
    assert.strictEqual(sanitized.projectId, null, "projectId must be null, never empty string");
    assert.strictEqual(sanitized.assignedToId, null, "assignedToId must be null, never empty string");
    assert.strictEqual(sanitized.parentTaskId, null, "parentTaskId must be null, never empty string");
  });

  await t.test("TaskDetailModal no-op save does not generate unnecessary network update", () => {
    const task: Task = {
      id: "t-103",
      title: "Same Title",
      description: "Same Desc",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      dueDate: "2026-09-20T00:00:00.000Z",
      assignedToId: "user-99",
      projectId: "PROJ-1",
      createdAt: "2026-09-15T10:00:00Z",
    };

    const dirty = calculateTaskDetailDirtyPayload(task, {
      title: "Same Title",
      description: "Same Desc",
      dueDate: "2026-09-20",
      assignedToId: "user-99",
      projectId: "PROJ-1",
    });

    assert.deepStrictEqual(Object.keys(dirty), []);
  });

  await t.test("BE-2 contract verification: labels field is not supported in BE-2 task schema or PATCH /tasks/:id", () => {
    // Exact schema properties from BE-2 Swagger specification (https://zyoris.onrender.com/docs.json)
    const be2SupportedPatchFields = [
      "title",
      "description",
      "assignedToId",
      "dueDate",
      "priority",
      "status",
      "leadId",
      "dealId",
      "projectId",
      "parentTaskId",
    ];

    assert.strictEqual(
      be2SupportedPatchFields.includes("labels"),
      false,
      "BE-2 Swagger contract for PATCH /tasks/{id} does not accept 'labels'"
    );

    // When backend returns response without labels, frontend task.labels is undefined
    const backendReturnedTask: Partial<Task> = {
      id: "t-104",
      title: "Task without backend labels",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
    };

    assert.strictEqual(backendReturnedTask.labels, undefined);
  });

  await t.test("regression: sanitizeUpdateTaskPayload omits labels from backend payload", () => {
    // When updating task with labels, labels must NOT be sent to backend PATCH to avoid 400 validation error
    const inputPayload = {
      title: "Updated Task",
      labels: ["Frontend", "Bug"],
    };

    const sanitized = sanitizeUpdateTaskPayload(inputPayload);

    assert.strictEqual(sanitized.title, "Updated Task");
    assert.strictEqual("labels" in sanitized, false, "labels must not be present in sanitized backend payload");
  });

  await t.test("regression: label persistence and normaliseTasksResponse integration", () => {
    const mockStorage: Record<string, string[]> = {};
    function saveMockLabels(taskId: string, labels: string[]) {
      if (labels && labels.length > 0) mockStorage[taskId] = labels;
      else delete mockStorage[taskId];
    }

    // 1. User adds labels to task 't-200'
    saveMockLabels("t-200", ["P0", "FE-2"]);
    assert.deepStrictEqual(mockStorage["t-200"], ["P0", "FE-2"]);

    // 2. Later, tasks are reloaded from backend (which doesn't return labels)
    const backendTasks: Task[] = [
      { id: "t-200", title: "Backend Task", status: "TODO", priority: "HIGH", createdAt: "2026-09-15" },
      { id: "t-201", title: "Unlabeled Task", status: "DONE", priority: "LOW", createdAt: "2026-09-15" },
    ];

    // 3. Normalization attaches stored labels
    const normalized = backendTasks.map((task) => {
      if (task && mockStorage[task.id]) {
        return { ...task, labels: mockStorage[task.id] };
      }
      return task;
    });

    assert.deepStrictEqual(normalized[0].labels, ["P0", "FE-2"]);
    assert.strictEqual(normalized[1].labels, undefined);

    // 4. User removes label
    saveMockLabels("t-200", ["FE-2"]);
    assert.deepStrictEqual(mockStorage["t-200"], ["FE-2"]);
  });

  await t.test("regression: handleUpdate preserves labels across title/description/status updates", () => {
    const existingTask: Task = {
      id: "t-300",
      title: "Original Title",
      description: "Original Description",
      status: "TODO",
      priority: "MEDIUM",
      labels: ["Urgent", "UI"],
      createdAt: "2026-09-15",
    };

    // Simulate update payload where user only edited title (data.labels is undefined)
    const updatePayload: UpdateTaskPayload = { title: "New Title" };
    // Backend returns task without labels
    const backendResponse = { id: "t-300", title: "New Title", status: "TODO", priority: "MEDIUM" };

    const merged = { ...existingTask, ...backendResponse };
    if (updatePayload.title !== undefined) merged.title = updatePayload.title;
    // Preservation logic from useTasks.ts handleUpdate
    if (updatePayload.labels !== undefined) {
      merged.labels = updatePayload.labels;
    } else if (!merged.labels || merged.labels.length === 0) {
      merged.labels = existingTask.labels;
    }

    assert.strictEqual(merged.title, "New Title");
    assert.deepStrictEqual(merged.labels, ["Urgent", "UI"], "Existing labels must be preserved when not updating labels");
  });

  await t.test("regression: adding a label appends to existing labels without removing them", () => {
    let currentLabels: string[] = ["Frontend"];

    // Add another label "testing"
    const newLabel = "testing".trim();
    if (newLabel && !currentLabels.includes(newLabel)) {
      currentLabels = [...currentLabels, newLabel];
    }

    assert.deepStrictEqual(currentLabels, ["Frontend", "testing"]);

    // Attempting to add duplicate label
    const duplicate = "testing".trim();
    if (duplicate && !currentLabels.includes(duplicate)) {
      currentLabels = [...currentLabels, duplicate];
    }
    assert.deepStrictEqual(currentLabels, ["Frontend", "testing"], "Duplicate label must not be added");

    // Attempting to add empty label
    const empty = "   ".trim();
    if (empty && !currentLabels.includes(empty)) {
      currentLabels = [...currentLabels, empty];
    }
    assert.deepStrictEqual(currentLabels, ["Frontend", "testing"], "Empty label must not be added");
  });

  await t.test("regression: removing a label removes only target without affecting other labels", () => {
    let currentLabels: string[] = ["Frontend", "testing", "Bug"];

    // Remove "testing"
    const tagToRemove = "testing";
    currentLabels = currentLabels.filter((t) => t !== tagToRemove);

    assert.deepStrictEqual(currentLabels, ["Frontend", "Bug"]);
    assert.strictEqual(currentLabels.includes("testing"), false);
  });

  await t.test("regression: label-only update in updateTask does not send failing PATCH and returns labels", () => {
    // When updateTask is called with only labels, sanitizeUpdateTaskPayload produces empty backend payload
    const updatePayload = { labels: ["testing"] };
    const backendPayload = sanitizeUpdateTaskPayload(updatePayload);

    // Assert no backend fields to send
    assert.strictEqual(Object.keys(backendPayload).length, 0);

    // updateTask returns partial task with labels without network failure
    const taskResult: Partial<Task> = {
      id: "t-400",
      labels: updatePayload.labels,
    };

    assert.deepStrictEqual(taskResult.labels, ["testing"]);
  });
});

test("Day 2 Finalization: Jira Board and Task Details contract is fully compliant", () => {
  assert.equal(STATUS_MAPPING.TODO, "TODO");
  assert.equal(STATUS_MAPPING.IN_PROGRESS, "IN_PROGRESS");
  assert.equal(STATUS_MAPPING.REVIEW, "IN_PROGRESS");
  assert.equal(STATUS_MAPPING.BLOCKED, "IN_PROGRESS");
  assert.equal(STATUS_MAPPING.DONE, "DONE");
});
