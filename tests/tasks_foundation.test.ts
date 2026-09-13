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
  task?: Task;
}

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
});
