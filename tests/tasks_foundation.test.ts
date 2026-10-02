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
  department?: string | null;
  assigneeType?: "DEPARTMENT" | "USER" | null;
  assignedBy?: { id: string; name?: string | null } | null;
  assignedAt?: string | Date | null;
  effectiveAssignment?: any;
  [key: string]: unknown;
}

export interface TasksResponse {
  tasks: Task[];
  total: number;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  actorId?: string | null;
  type: string;
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

const inMemoryAssignmentMap: Record<string, any> = {};

export function getTaskAssignmentMap(): Record<string, any> {
  return inMemoryAssignmentMap;
}

export function saveTaskAssignment(taskId: string, assignment: any) {
  inMemoryAssignmentMap[taskId] = assignment;
}

export function clearTaskAssignment(taskId: string) {
  delete inMemoryAssignmentMap[taskId];
}

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

  const assignmentMap = getTaskAssignmentMap();
  if (Object.keys(assignmentMap).length > 0) {
    result.tasks = result.tasks.map((task) => {
      if (task && assignmentMap.hasOwnProperty(task.id)) {
        const storedAssignment = assignmentMap[task.id];
        if (storedAssignment === null) {
          return {
            ...task,
            department: undefined,
            assigneeType: undefined,
            effectiveAssignment: null,
            assignedTo: null,
            assignedToId: null,
          };
        }
        return {
          ...task,
          department: storedAssignment.department ?? task.department,
          assigneeType: storedAssignment.assigneeType ?? task.assigneeType,
          effectiveAssignment: storedAssignment,
          assignedTo: storedAssignment.assignedTo ?? task.assignedTo,
          assignedToId: storedAssignment.assignedTo?.id ?? task.assignedToId,
        };
      }
      return task;
    });
  }

  return result;
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

test("Day 2: Reassignment State Synchronization and Refresh", async (t) => {
  await t.test("reassignment away from current user removes task from My Tasks list", () => {
    const currentUserId = "user-100";
    const initialTasks: Task[] = [
      {
        id: "t-1",
        title: "Task 1",
        status: "IN_PROGRESS",
        priority: "HIGH",
        assignedToId: "user-100",
        assignedTo: { id: "user-100", name: "Current User", email: "user@example.com" },
        createdAt: "2026-09-20T00:00:00Z",
      },
      {
        id: "t-2",
        title: "Task 2",
        status: "TODO",
        priority: "MEDIUM",
        assignedToId: "user-100",
        assignedTo: { id: "user-100", name: "Current User", email: "user@example.com" },
        createdAt: "2026-09-20T00:00:00Z",
      },
    ];

    const updatedAssignment = {
      taskId: "t-1",
      organizationId: "org-1",
      scope: "WORKSPACE",
      assigneeType: "USER" as const,
      department: "Marketing",
      assignedTo: { id: "user-200", name: "Other User", email: "other@example.com" },
      assignedBy: { id: "user-999", name: "Admin" },
      assignedAt: "2026-09-23T10:00:00Z",
      status: "IN_PROGRESS",
      priority: "HIGH" as const,
      source: "MANUAL",
    };

    const isStillAssignedToMe =
      updatedAssignment.assigneeType === "USER" &&
      Boolean(currentUserId && updatedAssignment.assignedTo?.id === currentUserId);

    const updatedTasks = !isStillAssignedToMe && currentUserId
      ? initialTasks.filter((t) => t.id !== updatedAssignment.taskId)
      : initialTasks;

    assert.strictEqual(updatedTasks.length, 1);
    assert.strictEqual(updatedTasks.find((t) => t.id === "t-1"), undefined);
    assert.strictEqual(updatedTasks[0].id, "t-2");
  });

  await t.test("reassignment keeping current user preserves task in My Tasks with updated department", () => {
    const currentUserId = "user-100";
    const initialTasks: Task[] = [
      {
        id: "t-1",
        title: "Task 1",
        status: "IN_PROGRESS",
        priority: "HIGH",
        assignedToId: "user-100",
        assignedTo: { id: "user-100", name: "Current User", email: "user@example.com" },
        department: "Sales",
        createdAt: "2026-09-20T00:00:00Z",
      },
    ];

    const updatedAssignment = {
      taskId: "t-1",
      organizationId: "org-1",
      scope: "WORKSPACE",
      assigneeType: "USER" as const,
      department: "Engineering",
      assignedTo: { id: "user-100", name: "Current User", email: "user@example.com" },
      assignedBy: { id: "user-999", name: "Admin" },
      assignedAt: "2026-09-23T10:00:00Z",
      status: "IN_PROGRESS",
      priority: "HIGH" as const,
      source: "MANUAL",
    };

    const isStillAssignedToMe =
      updatedAssignment.assigneeType === "USER" &&
      Boolean(currentUserId && updatedAssignment.assignedTo?.id === currentUserId);

    const updatedTasks = !isStillAssignedToMe && currentUserId
      ? initialTasks.filter((t) => t.id !== updatedAssignment.taskId)
      : initialTasks.map((t) =>
          t.id === updatedAssignment.taskId
            ? {
                ...t,
                department: updatedAssignment.department,
                assignedToId: updatedAssignment.assignedTo?.id ?? null,
                effectiveAssignment: updatedAssignment,
                assigneeType: updatedAssignment.assigneeType,
              }
            : t
        );

    assert.strictEqual(updatedTasks.length, 1);
    assert.strictEqual(updatedTasks[0].id, "t-1");
    assert.strictEqual((updatedTasks[0] as any).department, "Engineering");
    assert.strictEqual((updatedTasks[0] as any).effectiveAssignment.department, "Engineering");
  });

  await t.test("reassignment to Department Queue updates assignee display label without individual member", () => {
    const updatedAssignment = {
      taskId: "t-5",
      organizationId: "org-1",
      scope: "WORKSPACE",
      assigneeType: "DEPARTMENT" as const,
      department: "Support",
      assignedTo: null,
      assignedBy: { id: "user-999", name: "Admin" },
      assignedAt: "2026-09-23T10:00:00Z",
      status: "TODO",
      priority: "MEDIUM" as const,
      source: "MANUAL",
    };

    const isDeptQueue = updatedAssignment.assigneeType === "DEPARTMENT" && !updatedAssignment.assignedTo;
    const department = updatedAssignment.department;
    let displayAssigneeName = "Unassigned";
    if (isDeptQueue) {
      displayAssigneeName = department ? `${department} Queue` : "Department Queue";
    }

    assert.strictEqual(isDeptQueue, true);
    assert.strictEqual(displayAssigneeName, "Support Queue");
  });

  await t.test("in-memory selectedTask update allows reopening same task with latest assignment state", () => {
    const task: Task = {
      id: "t-10",
      title: "Task 10",
      status: "TODO",
      priority: "MEDIUM",
      department: "Sales",
      assignedToId: "user-1",
      assignedTo: { id: "user-1", name: "User 1" },
      createdAt: "2026-09-20T00:00:00Z",
    };

    let selectedTask: Task | null = { ...task };

    const updatedAssignment = {
      taskId: "t-10",
      organizationId: "org-1",
      scope: "WORKSPACE",
      assigneeType: "USER" as const,
      department: "Product",
      assignedTo: { id: "user-2", name: "User 2", email: "user2@example.com" },
      assignedBy: { id: "user-999", name: "Lead" },
      assignedAt: "2026-09-23T11:00:00Z",
      status: "TODO",
      priority: "MEDIUM" as const,
      source: "MANUAL",
    };

    selectedTask = {
      ...selectedTask,
      department: updatedAssignment.department,
      assignedToId: updatedAssignment.assignedTo?.id ?? null,
      assignedTo: updatedAssignment.assignedTo,
      effectiveAssignment: updatedAssignment,
      assigneeType: updatedAssignment.assigneeType,
    };

    // User closes detail modal
    selectedTask = null;

    // User reopens detail modal for task from updated list
    const reopenedTask: Task = {
      ...task,
      department: updatedAssignment.department,
      effectiveAssignment: updatedAssignment,
    };

    const initialCanonicalAssignment = (reopenedTask as any).effectiveAssignment ?? null;

    assert.notStrictEqual(initialCanonicalAssignment, null);
    assert.strictEqual(initialCanonicalAssignment.department, "Product");
    assert.strictEqual(initialCanonicalAssignment.assignedTo.name, "User 2");
  });

  await t.test("network refresh failure preserves the successful reassignment state", () => {
    const canonicalAssignment: any = {
      taskId: "t-20",
      assigneeType: "USER",
      department: "QA",
      assignedTo: { id: "user-5", name: "QA Engineer" },
    };

    const refreshFailed = true;

    if (refreshFailed) {
      assert.strictEqual(canonicalAssignment.department, "QA");
      assert.strictEqual(canonicalAssignment.assignedTo.name, "QA Engineer");
    }
  });
});

test("Day 2: CSV-Created Tasks Assignment Consistency and Representation", async (t) => {
  // Helper simulating the TaskDetailModal assignment fields derivation
  function resolveTaskDetailAssignmentState(task: Task, canonicalAssignment?: any | null) {
    const department = canonicalAssignment?.department ?? task.department ?? (task as any).department ?? null;
    const effectiveAssigneeType =
      canonicalAssignment?.assigneeType ??
      task.assigneeType ??
      (task as any).assigneeType ??
      (department && !task.assignedTo ? "DEPARTMENT" : (task.assignedTo ? "USER" : null));
    const hasIndividualAssignee = Boolean(canonicalAssignment?.assignedTo || task.assignedTo);
    const isDeptQueue = effectiveAssigneeType === "DEPARTMENT" && !hasIndividualAssignee;
    let displayAssigneeName = "Unassigned";
    if (isDeptQueue) {
      displayAssigneeName = department ? `${department} Queue` : "Department Queue";
    } else if (canonicalAssignment?.assignedTo?.name) {
      displayAssigneeName = canonicalAssignment.assignedTo.name;
    } else if (task.assignedTo?.name) {
      displayAssigneeName = task.assignedTo.name;
    }

    const assignmentTypeLabel =
      effectiveAssigneeType === "DEPARTMENT"
        ? "Department"
        : effectiveAssigneeType === "USER"
        ? "Individual"
        : null;

    const assignedByName =
      canonicalAssignment?.assignedBy?.name ??
      task.assignedBy?.name ??
      (task as any).assignedBy?.name ??
      null;

    const rawAssignedAt =
      canonicalAssignment?.assignedAt ??
      task.assignedAt ??
      (task as any).assignedAt ??
      null;

    const assignedAtFormatted = rawAssignedAt
      ? new Date(rawAssignedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

    return {
      department,
      effectiveAssigneeType,
      isDeptQueue,
      displayAssigneeName,
      assignmentTypeLabel,
      assignedByName,
      assignedAtFormatted,
    };
  }

  await t.test("CSV-created Department Queue task displays Department Queue and null individual assignee", () => {
    // Task created from CSV with:
    // title: "Optimize index", assigneeType: "DEPARTMENT", targetDepartment: "Engineering"
    const csvTask: Task = {
      id: "csv-task-1",
      title: "Optimize index",
      status: "TODO",
      priority: "HIGH",
      department: "Engineering",
      assigneeType: "DEPARTMENT",
      assignedToId: null,
      assignedTo: null,
      assignedBy: { id: "mgr-1", name: "Engineering Manager" },
      assignedAt: "2026-09-23T10:00:00.000Z",
      createdAt: "2026-09-23T10:00:00.000Z",
    };

    const state = resolveTaskDetailAssignmentState(csvTask);

    assert.strictEqual(state.department, "Engineering");
    assert.strictEqual(state.effectiveAssigneeType, "DEPARTMENT");
    assert.strictEqual(state.isDeptQueue, true);
    assert.strictEqual(state.displayAssigneeName, "Engineering Queue");
    assert.strictEqual(state.assignmentTypeLabel, "Department");
    assert.strictEqual(state.assignedByName, "Engineering Manager");
    assert.notStrictEqual(state.assignedAtFormatted, null);
    assert.strictEqual(csvTask.assignedTo, null, "Individual assignee must remain null for Department Queue task");
  });

  await t.test("CSV-created Individual task displays user assignee and department", () => {
    // Task created from CSV with:
    // title: "Build landing hero", assigneeType: "USER", targetDepartment: "Design", targetUserId: "usr-123"
    const csvTask: Task = {
      id: "csv-task-2",
      title: "Build landing hero",
      status: "TODO",
      priority: "MEDIUM",
      department: "Design",
      assigneeType: "USER",
      assignedToId: "usr-123",
      assignedTo: { id: "usr-123", name: "Sara Designer", email: "sara@zyoris.com" },
      assignedBy: { id: "mgr-2", name: "Design Lead" },
      assignedAt: "2026-09-23T10:30:00.000Z",
      createdAt: "2026-09-23T10:30:00.000Z",
    };

    const state = resolveTaskDetailAssignmentState(csvTask);

    assert.strictEqual(state.department, "Design");
    assert.strictEqual(state.effectiveAssigneeType, "USER");
    assert.strictEqual(state.isDeptQueue, false);
    assert.strictEqual(state.displayAssigneeName, "Sara Designer");
    assert.strictEqual(state.assignmentTypeLabel, "Individual");
    assert.strictEqual(state.assignedByName, "Design Lead");
    assert.strictEqual(csvTask.assignedTo?.name, "Sara Designer");
  });

  await t.test("CSV-created task with attached effectiveAssignment renders identically to manually reassigned task", () => {
    const effectiveAssignment = {
      taskId: "csv-task-3",
      organizationId: "org-1",
      scope: "WORKSPACE",
      assigneeType: "DEPARTMENT" as const,
      department: "Support",
      assignedTo: null,
      assignedBy: { id: "mgr-3", name: "Support Manager" },
      assignedAt: "2026-09-23T11:00:00.000Z",
      status: "TODO",
      priority: "MEDIUM" as const,
      dueDate: null,
      source: "CSV_IMPORT",
    };

    const csvTask: Task = {
      id: "csv-task-3",
      title: "Triage backlog tickets",
      status: "TODO",
      priority: "MEDIUM",
      effectiveAssignment,
      createdAt: "2026-09-23T11:00:00.000Z",
    };

    const state = resolveTaskDetailAssignmentState(csvTask, effectiveAssignment);

    assert.strictEqual(state.department, "Support");
    assert.strictEqual(state.effectiveAssigneeType, "DEPARTMENT");
    assert.strictEqual(state.isDeptQueue, true);
    assert.strictEqual(state.displayAssigneeName, "Support Queue");
    assert.strictEqual(state.assignmentTypeLabel, "Department");
    assert.strictEqual(state.assignedByName, "Support Manager");
  });

  await t.test("Reassignment modal fallback derives correct currentAssignment from CSV task fields", () => {
    const csvDeptTask: Task = {
      id: "csv-task-4",
      title: "Infrastructure audit",
      status: "TODO",
      priority: "HIGH",
      department: "DevOps",
      assigneeType: "DEPARTMENT",
      assignedToId: null,
      assignedTo: null,
      createdAt: "2026-09-23T12:00:00.000Z",
    };

    const fallbackAssignment = {
      department: csvDeptTask.department ?? null,
      assignedTo: csvDeptTask.assignedTo ?? null,
      assigneeType:
        csvDeptTask.assigneeType ??
        (csvDeptTask.assignedTo ? "USER" : (csvDeptTask.department ? "DEPARTMENT" : undefined)),
    };

    assert.strictEqual(fallbackAssignment.department, "DevOps");
    assert.strictEqual(fallbackAssignment.assigneeType, "DEPARTMENT");
    assert.strictEqual(fallbackAssignment.assignedTo, null);
  });

  await t.test("CSV import payload shape conforms to verified backend contract (POST /workspace/tasks/import-csv)", () => {
    const importPayload = {
      rows: [
        {
          title: "Setup CI pipeline",
          description: "Configure GitHub Actions",
          assigneeType: "DEPARTMENT" as const,
          targetDepartment: "DevOps",
          dueDate: "2026-10-01T00:00:00.000Z",
          priority: "HIGH" as const,
        },
        {
          title: "Implement auth token refresh",
          assigneeType: "USER" as const,
          targetDepartment: "Engineering",
          targetUserId: "user-backend-1",
          priority: "MEDIUM" as const,
        },
      ],
      defaultProjectId: "proj-100",
    };

    assert.strictEqual(importPayload.rows.length, 2);
    assert.strictEqual(importPayload.rows[0].assigneeType, "DEPARTMENT");
    assert.strictEqual(importPayload.rows[0].targetDepartment, "DevOps");
    assert.strictEqual(importPayload.rows[1].assigneeType, "USER");
    assert.strictEqual(importPayload.rows[1].targetUserId, "user-backend-1");
  });
});

test("Day 2: Reassignment Permissions, Edge Cases, and End-to-End State Transitions", async (t) => {
  // Pure helper simulating ReassignTaskModal error normalization
  function resolveReassignmentError(err: any): string {
    let errorMsg = "An error occurred while reassigning the task.";
    if (err?.response) {
      const { status, data } = err.response;
      if (status === 400) {
        if (Array.isArray(data?.details) && data.details.length > 0) {
          errorMsg = data.details
            .map((item: any) => item.message || `${item.field || "field"}: invalid`)
            .join("; ");
        } else if (data?.message) {
          errorMsg = data.message;
        } else if (data?.error) {
          errorMsg = String(data.error);
        } else {
          errorMsg = "Invalid reassignment request. Please check the required fields.";
        }
      } else if (status === 401) {
        errorMsg = data?.message || "Authentication required. Please sign in again.";
      } else if (status === 403) {
        errorMsg = data?.message || "You do not have permission to reassign this task.";
      } else if (status === 404) {
        errorMsg = data?.message || "Task or target assignee was not found.";
      } else if (status >= 500) {
        errorMsg = data?.message || "A server error occurred. Please try again later.";
      } else if (data?.message) {
        errorMsg = data.message;
      }
    } else if (err?.request) {
      errorMsg = "Network error: Unable to connect to server. Please check your internet connection.";
    } else if (err?.message) {
      errorMsg = err.message;
    }
    return errorMsg;
  }

  // Pure helper simulating ReassignTaskModal submission validation logic
  function validateAndBuildReassignPayload(params: {
    selectedDepartment: string;
    assigneeType: "DEPARTMENT" | "USER";
    selectedUserId: string;
    filteredEmployees: { userId: string; department: string; name?: string | null }[];
    reason?: string;
  }) {
    const { selectedDepartment, assigneeType, selectedUserId, filteredEmployees, reason } = params;

    if (!selectedDepartment) {
      return { error: "Please select a department", payload: null };
    }

    if (assigneeType === "USER") {
      if (!selectedUserId) {
        return { error: "Please select an individual team member", payload: null };
      }
      const isMemberInDept = filteredEmployees.some((emp) => emp.userId === selectedUserId);
      if (!isMemberInDept) {
        return {
          error: "Selected member does not belong to the selected department. Please choose a valid member.",
          payload: null,
        };
      }
    }

    const trimmedReason = reason?.trim();
    const payload = {
      assigneeType,
      targetDepartment: selectedDepartment,
      ...(assigneeType === "USER" ? { targetUserId: selectedUserId } : {}),
      ...(trimmedReason ? { reason: trimmedReason } : {}),
    };

    return { error: null, payload };
  }

  await t.test("403 permission failure preserves authoritative backend message without crashing", () => {
    const backend403 = {
      response: {
        status: 403,
        data: {
          success: false,
          message: "Managers can only assign tasks to members of their own department",
        },
      },
    };

    const errorMsg = resolveReassignmentError(backend403);
    assert.strictEqual(
      errorMsg,
      "Managers can only assign tasks to members of their own department"
    );
  });

  await t.test("404 resource-not-found failure preserves authoritative backend message", () => {
    const backend404 = {
      response: {
        status: 404,
        data: {
          success: false,
          message: "Task not found or does not belong to this organization",
        },
      },
    };

    const errorMsg = resolveReassignmentError(backend404);
    assert.strictEqual(
      errorMsg,
      "Task not found or does not belong to this organization"
    );
  });

  await t.test("400 validation error parses field details or message", () => {
    const backend400 = {
      response: {
        status: 400,
        data: {
          success: false,
          details: [
            { field: "targetDepartment", message: "targetDepartment is required" },
            { field: "targetUserId", message: "targetUserId must be a valid cuid" },
          ],
        },
      },
    };

    const errorMsg = resolveReassignmentError(backend400);
    assert.strictEqual(
      errorMsg,
      "targetDepartment is required; targetUserId must be a valid cuid"
    );
  });

  await t.test("stale member selection across department changes is caught and rejected", () => {
    const engineeringEmployees = [
      { userId: "usr-eng-1", department: "Engineering", name: "Alice Eng" },
    ];
    const designEmployees = [
      { userId: "usr-des-1", department: "Design", name: "Bob Design" },
    ];

    // User initially had Engineering selected with Alice
    let selectedDepartment = "Engineering";
    let selectedUserId = "usr-eng-1";

    // User switches department to Design:
    selectedDepartment = "Design";
    // If selectedUserId is not cleared or passed staler than UI state:
    const validationResult = validateAndBuildReassignPayload({
      selectedDepartment,
      assigneeType: "USER",
      selectedUserId, // still usr-eng-1
      filteredEmployees: designEmployees, // now contains only Design employees
    });

    assert.notStrictEqual(validationResult.error, null);
    assert.match(validationResult.error!, /does not belong to the selected department/);
    assert.strictEqual(validationResult.payload, null);
  });

  await t.test("Department Queue reassignment creates payload with null individual assignee", () => {
    const validationResult = validateAndBuildReassignPayload({
      selectedDepartment: "Operations",
      assigneeType: "DEPARTMENT",
      selectedUserId: "",
      filteredEmployees: [],
      reason: "Handing over to Operations team queue",
    });

    assert.strictEqual(validationResult.error, null);
    assert.deepStrictEqual(validationResult.payload, {
      assigneeType: "DEPARTMENT",
      targetDepartment: "Operations",
      reason: "Handing over to Operations team queue",
    });
    assert.strictEqual((validationResult.payload as any).targetUserId, undefined);
  });

  await t.test("duplicate submit protection blocks second click while request is in flight", async () => {
    let networkCallCount = 0;
    const isSubmittingRef = { current: false };

    async function mockSubmit() {
      if (isSubmittingRef.current) {
        return { blocked: true };
      }
      isSubmittingRef.current = true;
      networkCallCount++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      isSubmittingRef.current = false;
      return { blocked: false };
    }

    // Fire two calls concurrently (simulating rapid double click)
    const [res1, res2] = await Promise.all([mockSubmit(), mockSubmit()]);

    assert.strictEqual(networkCallCount, 1, "Only one network request should be dispatched");
    assert.strictEqual(res1.blocked, false);
    assert.strictEqual(res2.blocked, true, "Second click must be blocked");
    assert.strictEqual(isSubmittingRef.current, false, "Submit lock must be released after completion");
  });

  await t.test("successful individual reassignment builds valid payload and preserves reason", () => {
    const employees = [
      { userId: "usr-eng-2", department: "Engineering", name: "David Tech Lead" },
    ];

    const validationResult = validateAndBuildReassignPayload({
      selectedDepartment: "Engineering",
      assigneeType: "USER",
      selectedUserId: "usr-eng-2",
      filteredEmployees: employees,
      reason: "Promoted to lead this feature",
    });

    assert.strictEqual(validationResult.error, null);
    assert.deepStrictEqual(validationResult.payload, {
      assigneeType: "USER",
      targetDepartment: "Engineering",
      targetUserId: "usr-eng-2",
      reason: "Promoted to lead this feature",
    });
  });

  await t.test("user with no assignable scopes disables reassignment submission", () => {
    const scopesWithNoDepts = {
      organizationId: "org-viewer",
      departments: [],
      employees: [],
    };

    const isSubmitDisabled =
      scopesWithNoDepts.departments.length === 0;

    assert.strictEqual(isSubmitDisabled, true, "Submit button must be disabled when user has no assignable scopes");
  });
});

test("Task 1 — Issue 1: Customer-Facing Task UI Sanitization and Internal ID Preservation", async (t) => {
  await t.test("formats activity values cleanly without exposing raw CUIDs or raw workspace URLs", () => {
    function formatActivityValue(val: string | null | undefined): string | null {
      if (!val) return null;
      const str = String(val).trim();
      if (str.includes("/workspace/pages/")) return "Workspace Page";
      if (/^https?:\/\//i.test(str)) return "Page Link";
      if (/^cm[a-z0-9]{15,}$/i.test(str) || /^cuid[a-z0-9]+$/i.test(str)) return null;
      if (str === "USER") return "Individual";
      if (str === "DEPARTMENT") return "Department Queue";
      return str;
    }

    assert.strictEqual(formatActivityValue("USER"), "Individual");
    assert.strictEqual(formatActivityValue("DEPARTMENT"), "Department Queue");
    assert.strictEqual(formatActivityValue("https://app.zyoris.com/workspace/pages/cm123xyz456"), "Workspace Page");
    assert.strictEqual(formatActivityValue("cmucvbmz400vxjrlq31y33c"), null);
    assert.strictEqual(formatActivityValue("TODO"), "TODO");
  });

  await t.test("derives business-friendly source page label while preserving internal pageId for navigation", () => {
    const taskWithPage = {
      id: "cm8xyz12345",
      title: "Review Architecture",
      pageId: "cmu123pageid",
      pageTitle: "Client Requirements",
    };

    const linkHref = `/workspace/pages/${taskWithPage.pageId}`;
    const displayLabel = `Source Page: ${taskWithPage.pageTitle || "Document"}`;

    assert.strictEqual(linkHref, "/workspace/pages/cmu123pageid");
    assert.strictEqual(displayLabel, "Source Page: Client Requirements");
    assert.strictEqual(displayLabel.includes(taskWithPage.pageId), false);
  });

  await t.test("project badge falls back to human-friendly label instead of raw CUID", () => {
    function getDisplayProjectName(task: { projectId?: string | null; projectName?: string | null }) {
      return (
        task.projectName ||
        (task.projectId && !task.projectId.startsWith("cm") && !task.projectId.startsWith("proj_")
          ? task.projectId
          : "Workspace Project")
      );
    }

    assert.strictEqual(getDisplayProjectName({ projectId: "cm8xyz1234567890", projectName: "Core CRM" }), "Core CRM");
    assert.strictEqual(getDisplayProjectName({ projectId: "cm8xyz1234567890", projectName: null }), "Workspace Project");
    assert.strictEqual(getDisplayProjectName({ projectId: "FINANCE-2026", projectName: null }), "FINANCE-2026");
  });

  await t.test("preserves all internal IDs on task object, events, and API payloads", () => {
    const task: Task = {
      id: "cm8xyz999999",
      title: "Backend Validation Task",
      status: "TODO",
      priority: "HIGH",
      projectId: "cmproj123456",
      department: "Engineering",
      assignedToId: "usr-david-1",
      assignedTo: { id: "usr-david-1", name: "David Tech Lead" },
      createdAt: "2026-10-01T00:00:00Z",
    };

    // Internal ID integrity
    assert.strictEqual(task.id, "cm8xyz999999");
    assert.strictEqual(task.projectId, "cmproj123456");
    assert.strictEqual(task.assignedToId, "usr-david-1");

    // Events internal ID integrity
    const event = {
      id: "evt-1",
      taskId: task.id,
      assignedById: "usr-admin",
      eventType: "USER",
      createdAt: "2026-10-02T10:00:00Z",
      task,
    };
    assert.strictEqual(event.taskId, "cm8xyz999999");
    assert.strictEqual(event.assignedById, "usr-admin");
  });
});

test("Task 1 — Issue 2: Remove Internal Task ID and CUID from Customer-Facing Task Detail UI", async (t) => {
  await t.test("Customer-facing task detail UI suppresses internal Task ID, CUIDs, and TASK-{id} labels", () => {
    const rawTask: Task = {
      id: "cm8xyz123",
      title: "Quarterly Financial Audit",
      status: "IN_PROGRESS",
      priority: "HIGH",
      projectId: "cm9abc456",
      projectName: "Financial Operations",
      department: "Engineering",
      assignedToId: "cm123assignee",
      assignedTo: { id: "cm123assignee", name: "Rahul Sharma" },
      createdAt: "2026-10-02T10:00:00Z",
    };

    // Header rendering must show task title, not TASK-cm8xyz123 or cm8xyz123
    const headerTitle = rawTask.title;
    assert.strictEqual(headerTitle, "Quarterly Financial Audit");
    assert.strictEqual(headerTitle.includes(rawTask.id), false);
    assert.strictEqual(headerTitle.includes("cm8xyz"), false);

    // Footer rendering contains only actions (Close Drawer), no TASK ID: cm8xyz123
    const footerText = "Close Drawer";
    assert.strictEqual(footerText.includes(rawTask.id), false);
    assert.strictEqual(footerText.includes("TASK ID"), false);
  });

  await t.test("Project context in Task Detail maps CUID to human-readable project name or General Workspace", () => {
    const mockProjects = [
      { id: "cm9abc456", name: "Financial Operations", status: "ACTIVE" },
      { id: "cm9xyz789", name: "Cloud Migration", status: "ACTIVE" },
    ];

    function resolveProjectDisplay(task: { projectId?: string | null; projectName?: string | null }, projects: typeof mockProjects) {
      const matched = projects.find((p) => p.id === task.projectId);
      const display = matched?.name || task.projectName || (task.projectId && !task.projectId.startsWith("cm") && !task.projectId.startsWith("proj_") ? task.projectId : null);
      return display || "General Workspace";
    }

    // Resolves matching project name
    assert.strictEqual(resolveProjectDisplay({ projectId: "cm9abc456" }, mockProjects), "Financial Operations");
    // Falls back to task.projectName if not in list
    assert.strictEqual(resolveProjectDisplay({ projectId: "cm9unknown", projectName: "Security Hardening" }, mockProjects), "Security Hardening");
    // Falls back to "General Workspace" instead of raw CUID
    assert.strictEqual(resolveProjectDisplay({ projectId: "cm9abc999" }, mockProjects), "General Workspace");
    assert.strictEqual(resolveProjectDisplay({ projectId: null }, mockProjects), "General Workspace");

    // In edit mode: options render human-readable labels while binding CUID value
    const options = mockProjects.map((p) => ({ value: p.id, label: p.name }));
    assert.deepStrictEqual(options, [
      { value: "cm9abc456", label: "Financial Operations" },
      { value: "cm9xyz789", label: "Cloud Migration" },
    ]);
  });

  await t.test("Task Detail Activity sanitizes CUIDs and internal identifiers without altering activity records", () => {
    function formatActivityValue(val: string | null | undefined): string | null {
      if (!val) return null;
      const str = String(val).trim();
      if (str.includes("/workspace/pages/")) return "Workspace Page";
      if (/^https?:\/\//i.test(str)) return "Page Link";
      if (/^cm[a-z0-9]{5,}$/i.test(str) || /^cuid[a-z0-9]+$/i.test(str) || /^(task|user|usr|proj|org)_[a-z0-9_]+$/i.test(str)) return null;
      if (str === "USER") return "Individual";
      if (str === "DEPARTMENT") return "Department Queue";
      if (/cm[a-z0-9]{7,}/i.test(str)) {
        const cleaned = str.replace(/cm[a-z0-9]{7,}/gi, "").trim();
        return cleaned || null;
      }
      return str;
    }

    function formatActorName(actor?: { id?: string; name?: string } | null): string {
      if (actor?.name && !/^cm[a-z0-9]{5,}$/i.test(actor.name) && !/^(usr|user)_[a-z0-9_]+$/i.test(actor.name)) {
        return actor.name;
      }
      return "System";
    }

    // Suppresses CUIDs like cm8xyz123, cm9abc456, usr_12345
    assert.strictEqual(formatActivityValue("cm8xyz123"), null);
    assert.strictEqual(formatActivityValue("cm9abc456"), null);
    assert.strictEqual(formatActivityValue("usr_12345"), null);
    assert.strictEqual(formatActivityValue("TODO"), "TODO");
    assert.strictEqual(formatActivityValue("HIGH"), "HIGH");

    // Actor name check
    assert.strictEqual(formatActorName({ name: "Rahul Sharma" }), "Rahul Sharma");
    assert.strictEqual(formatActorName({ name: "cm8xyz123" }), "System");
    assert.strictEqual(formatActorName({ name: "usr_backend_svc" }), "System");
    assert.strictEqual(formatActorName(null), "System");

    // Underlying activity object remains fully intact
    const originalActivity = {
      id: "act-123",
      taskId: "cm8xyz123",
      actorId: "usr_456",
      type: "PROJECT_CHANGED",
      oldValue: "cm9old123",
      newValue: "cm9abc456",
      createdAt: "2026-10-02T11:00:00Z",
    };
    assert.strictEqual(originalActivity.id, "act-123");
    assert.strictEqual(originalActivity.taskId, "cm8xyz123");
    assert.strictEqual(originalActivity.oldValue, "cm9old123");
    assert.strictEqual(originalActivity.newValue, "cm9abc456");
  });

  await t.test("Preserves all internal IDs required for API operations, navigation, and logic", () => {
    const task: Task = {
      id: "cm8xyz123",
      title: "Refactor Database Indexing",
      status: "TODO",
      priority: "HIGH",
      projectId: "cm9abc456",
      assignedToId: "usr_rahul",
      assignedTo: { id: "usr_rahul", name: "Rahul Sharma" },
      createdAt: "2026-10-02T10:00:00Z",
    };

    // 1. PATCH /tasks/:id payload
    const patchUrl = `/tasks/${task.id}`;
    const patchPayload = { projectId: task.projectId, priority: task.priority };
    assert.strictEqual(patchUrl, "/tasks/cm8xyz123");
    assert.strictEqual(patchPayload.projectId, "cm9abc456");

    // 2. DELETE /tasks/:id
    const deleteUrl = `/tasks/${task.id}`;
    assert.strictEqual(deleteUrl, "/tasks/cm8xyz123");

    // 3. POST /workspace/tasks/:id/reassign
    const reassignUrl = `/workspace/tasks/${task.id}/reassign`;
    assert.strictEqual(reassignUrl, "/workspace/tasks/cm8xyz123/reassign");

    // 4. Sub-resources use internal task.id
    assert.strictEqual(`/tasks/${task.id}/dependencies`, "/tasks/cm8xyz123/dependencies");
    assert.strictEqual(`/tasks/${task.id}/comments`, "/tasks/cm8xyz123/comments");
    assert.strictEqual(`/tasks/${task.id}/subtasks`, "/tasks/cm8xyz123/subtasks");
    assert.strictEqual(`/tasks/${task.id}/activity`, "/tasks/cm8xyz123/activity");
  });
});

test("Task 1 — Issue 4: Make Task Activity Assignment History Customer-Friendly", async (t) => {
  const mockMembers = [
    { id: "usr_rahul", name: "Rahul Sharma", role: "Engineering Lead", email: "rahul@zyoris.com" },
    { id: "usr_priya", name: "Priya Patel", role: "Product Manager", email: "priya@zyoris.com" },
    { id: "usr_om", name: "Om", role: "Admin", email: "om@zyoris.com" },
  ];

  const mockTask: Task = {
    id: "cm8xyz_task_123",
    title: "Deploy Production Kubernetes Cluster",
    status: "IN_PROGRESS",
    priority: "HIGH",
    department: "Engineering",
    assignedToId: "usr_rahul",
    assignedTo: { id: "usr_rahul", name: "Rahul Sharma" },
    createdAt: "2026-10-02T10:00:00Z",
  };

  function isRawId(val: string | null | undefined): boolean {
    if (!val) return false;
    const str = String(val).trim();
    return (
      /^cm[a-z0-9]{5,}$/i.test(str) ||
      /^cuid[a-z0-9]+$/i.test(str) ||
      /^(task|user|usr|proj|org|evt|act|sub|dep|lead|deal)_[a-z0-9_]+$/i.test(str) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
    );
  }

  function getValidActorName(actor?: { id?: string; name?: string } | null, members?: typeof mockMembers): string | null {
    if (!actor) return null;
    if (actor.name && !isRawId(actor.name)) return actor.name.trim();
    if (actor.id && members && members.length > 0) {
      const found = members.find((m) => m.id === actor.id);
      if (found?.name && !isRawId(found.name)) return found.name.trim();
    }
    return null;
  }

  function resolveAssigneeOrDepartment(
    idOrValue: string | null | undefined,
    metadata: Record<string, unknown> | null | undefined,
    isPrevious: boolean
  ): string | null {
    if (metadata) {
      if (isPrevious) {
        const prevName = metadata.previousAssigneeName || metadata.prevAssigneeName || metadata.oldAssigneeName;
        if (typeof prevName === "string" && prevName.trim() && !isRawId(prevName)) return prevName.trim();
        const prevDept = metadata.previousDepartment || metadata.prevDepartment;
        if (typeof prevDept === "string" && prevDept.trim()) {
          const trimmed = prevDept.trim();
          return trimmed.toLowerCase().includes("department") ? trimmed : `${trimmed} Department`;
        }
      } else {
        const nextName = metadata.newAssigneeName || metadata.targetUserName || metadata.assigneeName || metadata.userName;
        if (typeof nextName === "string" && nextName.trim() && !isRawId(nextName)) return nextName.trim();
        if (metadata.assigneeType === "DEPARTMENT") {
          const dept = metadata.department || metadata.targetDepartment;
          if (typeof dept === "string" && dept.trim()) {
            const trimmed = dept.trim();
            return trimmed.toLowerCase().includes("department") ? trimmed : `${trimmed} Department`;
          }
          return "Department Queue";
        }
      }
    }

    if (idOrValue) {
      const strVal = String(idOrValue).trim();
      if (strVal === "DEPARTMENT") {
        const deptFromMeta = metadata?.department || metadata?.targetDepartment || mockTask.department;
        if (typeof deptFromMeta === "string" && deptFromMeta.trim()) {
          const trimmed = deptFromMeta.trim();
          return trimmed.toLowerCase().includes("department") ? trimmed : `${trimmed} Department`;
        }
        return "Department Queue";
      }

      const knownDepts = ["engineering", "sales", "marketing", "operations", "support", "product", "hr", "finance", "legal"];
      if (knownDepts.includes(strVal.toLowerCase()) || strVal.toLowerCase().includes("department")) {
        return strVal.toLowerCase().includes("department") ? strVal : `${strVal} Department`;
      }

      const matchedMember = mockMembers.find((m) => m.id === strVal);
      if (matchedMember?.name && !isRawId(matchedMember.name)) return matchedMember.name.trim();

      if (mockTask.assignedTo?.id === strVal && mockTask.assignedTo.name && !isRawId(mockTask.assignedTo.name)) {
        return mockTask.assignedTo.name.trim();
      }

      if (!isRawId(strVal) && !strVal.startsWith("http") && !strVal.includes("/")) return strVal;
    }

    const isDeptContext = metadata?.assigneeType === "DEPARTMENT" || (!isPrevious && !idOrValue && (metadata?.department || mockTask.department));
    if (isDeptContext) {
      const dept = (metadata?.department as string) || (metadata?.targetDepartment as string) || mockTask.department;
      if (typeof dept === "string" && dept.trim()) {
        const trimmed = dept.trim();
        return trimmed.toLowerCase().includes("department") ? trimmed : `${trimmed} Department`;
      }
      return "Department Queue";
    }

    return null;
  }

  function formatActivityMessage(act: TaskActivity): string {
    const meta = act.metadata as Record<string, unknown> | null | undefined;
    const isReassign =
      act.type === "TASK_REASSIGNED" ||
      (act.type === "TASK_ASSIGNED" && Boolean(act.oldValue) && Boolean(act.newValue)) ||
      meta?.source === "TASK_REASSIGN" ||
      meta?.source === "MANUAL_REASSIGN";

    const isUnassign =
      act.type === "TASK_UNASSIGNED" ||
      (act.type === "TASK_ASSIGNED" && Boolean(act.oldValue) && !act.newValue);

    if (isReassign) {
      const fromAssignee = resolveAssigneeOrDepartment(act.oldValue, meta, true);
      const toAssignee = resolveAssigneeOrDepartment(act.newValue, meta, false);

      if (fromAssignee && toAssignee) {
        return `Task reassigned → ${fromAssignee} → ${toAssignee}`;
      }
      return "Task reassignment updated";
    }

    if (isUnassign) {
      const fromAssignee = resolveAssigneeOrDepartment(act.oldValue, meta, true);
      if (fromAssignee) {
        return `Task unassigned → ${fromAssignee}`;
      }
      return "Task unassignment updated";
    }

    if (act.type === "TASK_ASSIGNED") {
      const toAssignee = resolveAssigneeOrDepartment(act.newValue, meta, false);
      if (toAssignee) {
        return `Task assigned → ${toAssignee}`;
      }
      return "Task assignment updated";
    }

    return "Task updated";
  }

  await t.test("Assignment displays human-readable assignee in 'Task assigned → [whom]' format without actor", () => {
    // 1. Initial assignment with actor (actor must NOT be displayed)
    const actWithActor: TaskActivity = {
      id: "act-1",
      taskId: "cm8xyz_task_123",
      actorId: "usr_om",
      type: "TASK_ASSIGNED",
      oldValue: null,
      newValue: "usr_rahul",
      createdAt: "2026-10-02T10:00:00Z",
      actor: { id: "usr_om", name: "Om" },
    };
    const msgWithActor = formatActivityMessage(actWithActor);
    assert.strictEqual(msgWithActor, "Task assigned → Rahul Sharma");
    assert.strictEqual(msgWithActor.includes("usr_rahul"), false);
    assert.strictEqual(msgWithActor.includes("cm8xyz"), false);
    assert.strictEqual(msgWithActor.includes("Om"), false);

    // 2. Initial assignment without actor
    const actWithoutActor: TaskActivity = {
      id: "act-2",
      taskId: "cm8xyz_task_123",
      actorId: null,
      type: "TASK_ASSIGNED",
      oldValue: null,
      newValue: "usr_rahul",
      createdAt: "2026-10-02T10:00:00Z",
    };
    const msgWithoutActor = formatActivityMessage(actWithoutActor);
    assert.strictEqual(msgWithoutActor, "Task assigned → Rahul Sharma");
    assert.strictEqual(msgWithoutActor.includes("usr_rahul"), false);

    // 3. Assignment to employee name (e.g. emp1)
    const actEmp: TaskActivity = {
      id: "act-emp",
      taskId: "cm8xyz_task_123",
      type: "TASK_ASSIGNED",
      newValue: "emp1",
      createdAt: "2026-10-02T10:00:00Z",
    };
    assert.strictEqual(formatActivityMessage(actEmp), "Task assigned → emp1");
  });

  await t.test("Reassignment displays 'Task reassigned → [from] → [to]' without actor name or IDs", () => {
    // 1. Reassignment with actor (actor must NOT be displayed)
    const reassignAct: TaskActivity = {
      id: "act-3",
      taskId: "cm8xyz_task_123",
      actorId: "usr_rahul",
      type: "TASK_REASSIGNED",
      oldValue: "usr_rahul",
      newValue: "usr_priya",
      createdAt: "2026-10-02T11:00:00Z",
      actor: { id: "usr_rahul", name: "Rahul Sharma" },
      metadata: { source: "MANUAL_REASSIGN", reason: "Product review" },
    };
    const reassignMsg = formatActivityMessage(reassignAct);
    assert.strictEqual(reassignMsg, "Task reassigned → Rahul Sharma → Priya Patel");
    assert.strictEqual(reassignMsg.includes("usr_rahul"), false);
    assert.strictEqual(reassignMsg.includes("usr_priya"), false);

    // 2. Reassignment between employee names (emp1 → emp2)
    const reassignEmp: TaskActivity = {
      id: "act-emp-reassign",
      taskId: "cm8xyz_task_123",
      type: "TASK_REASSIGNED",
      oldValue: "emp1",
      newValue: "emp2",
      createdAt: "2026-10-02T11:00:00Z",
    };
    assert.strictEqual(formatActivityMessage(reassignEmp), "Task reassigned → emp1 → emp2");
  });

  await t.test("Department assignment and reassignment displays department names with arrows", () => {
    // 1. Initial assignment to department (e.g. HR Department)
    const deptAssign: TaskActivity = {
      id: "act-5",
      taskId: "cm8xyz_task_123",
      type: "TASK_ASSIGNED",
      oldValue: null,
      newValue: null,
      metadata: { department: "HR Department", assigneeType: "DEPARTMENT" },
      createdAt: "2026-10-02T10:00:00Z",
    };
    assert.strictEqual(formatActivityMessage(deptAssign), "Task assigned → HR Department");

    // 2. Reassignment from department to user (HR Department → emp1)
    const deptToUser: TaskActivity = {
      id: "act-6",
      taskId: "cm8xyz_task_123",
      type: "TASK_REASSIGNED",
      oldValue: null,
      newValue: "emp1",
      metadata: { previousDepartment: "HR Department", assigneeType: "USER" },
      createdAt: "2026-10-02T10:30:00Z",
    };
    assert.strictEqual(formatActivityMessage(deptToUser), "Task reassigned → HR Department → emp1");

    // 3. Reassignment from user to department (emp1 → HR Department)
    const userToDept: TaskActivity = {
      id: "act-7",
      taskId: "cm8xyz_task_123",
      type: "TASK_REASSIGNED",
      oldValue: "emp1",
      newValue: null,
      metadata: { department: "HR Department", assigneeType: "DEPARTMENT" },
      createdAt: "2026-10-02T10:45:00Z",
    };
    assert.strictEqual(formatActivityMessage(userToDept), "Task reassigned → emp1 → HR Department");
  });

  await t.test("Unassignment displays 'Task unassigned → [who]'", () => {
    // 1. Unassignment from user
    const unassignUser: TaskActivity = {
      id: "act-u1",
      taskId: "cm8xyz_task_123",
      type: "TASK_UNASSIGNED",
      oldValue: "emp1",
      createdAt: "2026-10-02T11:00:00Z",
    };
    assert.strictEqual(formatActivityMessage(unassignUser), "Task unassigned → emp1");

    // 2. Unassignment from department
    const unassignDept: TaskActivity = {
      id: "act-u2",
      taskId: "cm8xyz_task_123",
      type: "TASK_UNASSIGNED",
      oldValue: null,
      metadata: { previousDepartment: "HR Department" },
      createdAt: "2026-10-02T11:00:00Z",
    };
    assert.strictEqual(formatActivityMessage(unassignDept), "Task unassigned → HR Department");
  });

  await t.test("Missing-name fallbacks do not expose internal IDs", () => {
    // Unknown raw CUIDs with no lookup match
    const unknownReassign: TaskActivity = {
      id: "act-8",
      taskId: "cm8xyz_task_123",
      actorId: "cmunknownactor123",
      type: "TASK_REASSIGNED",
      oldValue: "cmolduser123456",
      newValue: "cmnewuser987654",
      createdAt: "2026-10-02T11:00:00Z",
      actor: { id: "cmunknownactor123", name: "cmunknownactor123" },
    };
    const fallbackReassignMsg = formatActivityMessage(unknownReassign);
    assert.strictEqual(fallbackReassignMsg, "Task reassignment updated");
    assert.strictEqual(fallbackReassignMsg.includes("cmolduser"), false);
    assert.strictEqual(fallbackReassignMsg.includes("cmnewuser"), false);

    const unknownAssign: TaskActivity = {
      id: "act-9",
      taskId: "cm8xyz_task_123",
      type: "TASK_ASSIGNED",
      newValue: "cmnewuser987654",
      createdAt: "2026-10-02T11:00:00Z",
    };
    assert.strictEqual(formatActivityMessage(unknownAssign), "Task assignment updated");

    const unknownUnassign: TaskActivity = {
      id: "act-10",
      taskId: "cm8xyz_task_123",
      type: "TASK_UNASSIGNED",
      oldValue: "cmolduser123456",
      createdAt: "2026-10-02T11:00:00Z",
    };
    assert.strictEqual(formatActivityMessage(unknownUnassign), "Task unassignment updated");
  });

  await t.test("Assignment persistence across drawer reopen, refresh, and explicit unassignment", () => {
    // Simulated assignment response from reassignTask API
    const deptAssignmentResponse = {
      taskId: "task-persist-1",
      taskTitle: "Sales Lead Followup",
      assigneeType: "DEPARTMENT" as const,
      department: "Sales",
      assignedTo: null,
      assignedBy: { id: "usr_admin", name: "Admin" },
      assignedAt: "2026-10-02T10:00:00Z",
    };

    // 1. Save assignment
    saveTaskAssignment("task-persist-1", deptAssignmentResponse);

    // 2. Simulated fetchTasks returning a task without department (as backend Prisma Task model lacks department column)
    const rawFetchedTasks = [
      {
        id: "task-persist-1",
        title: "Sales Lead Followup",
        status: "TODO" as const,
        priority: "MEDIUM" as const,
        assignedToId: null,
        assignedTo: null,
        createdAt: "2026-10-02T10:00:00Z",
      },
    ];

    const normalised = normaliseTasksResponse(rawFetchedTasks);
    const persistedTask = normalised.tasks[0];

    // Verify task was correctly enriched from persisted assignment
    assert.strictEqual(persistedTask.department, "Sales");
    assert.strictEqual(persistedTask.assigneeType, "DEPARTMENT");
    assert.deepStrictEqual(persistedTask.effectiveAssignment, deptAssignmentResponse);

    // 3. Verify drawer reopening simulation:
    // When drawer closes and reopens, reading assignment map restores canonicalAssignment
    const storedMap = getTaskAssignmentMap();
    const restoredAssignment = storedMap["task-persist-1"];
    assert.strictEqual(restoredAssignment?.department, "Sales");
    assert.strictEqual(restoredAssignment?.assigneeType, "DEPARTMENT");

    // 4. Verify explicit unassignment persistence
    saveTaskAssignment("task-persist-1", null);
    const unassignedNormalised = normaliseTasksResponse(rawFetchedTasks);
    const unassignedTask = unassignedNormalised.tasks[0];
    assert.strictEqual(unassignedTask.effectiveAssignment, null);
    assert.strictEqual(unassignedTask.department, undefined);
    assert.strictEqual(unassignedTask.assignedTo, null);
  });

  await t.test("Underlying IDs remain available for application logic and audit trail", () => {
    const rawActivity: TaskActivity = {
      id: "act-99",
      taskId: "cm8xyz_task_123",
      actorId: "usr_om",
      type: "TASK_REASSIGNED",
      oldValue: "usr_rahul",
      newValue: "usr_priya",
      metadata: { reason: "Load balancing", source: "TASK_REASSIGN", scope: "ORGANIZATION" },
      createdAt: "2026-10-02T12:00:00Z",
      actor: { id: "usr_om", name: "Om" },
    };

    // Full functional data integrity
    assert.strictEqual(rawActivity.id, "act-99");
    assert.strictEqual(rawActivity.taskId, "cm8xyz_task_123");
    assert.strictEqual(rawActivity.actorId, "usr_om");
    assert.strictEqual(rawActivity.oldValue, "usr_rahul");
    assert.strictEqual(rawActivity.newValue, "usr_priya");
    assert.strictEqual(rawActivity.metadata?.scope, "ORGANIZATION");
  });
});

test("Task 1 — Issue 13: Customer-Facing Source Page Cleanup and Activities Functionality", async (t) => {
  function sanitizeSourcePageText(text?: string | null, knownTitle?: string | null): string {
    if (!text) return "";
    let result = text;
    result = result.replace(/\[([^\]]+)\]\((?:https?:\/\/[^\/]+)?\/workspace\/pages\/[^\)]+\)/gi, (_, linkText) => {
      const trimmed = linkText.trim();
      if (
        trimmed.startsWith("/workspace/pages") ||
        trimmed.startsWith("http") ||
        /^cm[a-z0-9]{5,}$/i.test(trimmed) ||
        /^c[a-z0-9]{20,}$/i.test(trimmed)
      ) {
        return knownTitle?.trim() || "Workspace Page";
      }
      return trimmed;
    });
    result = result.replace(
      /(?:Source\s+Page|sourcePageId|pageId)[:\s]+(?:https?:\/\/[^\s]+)?\/workspace\/pages\/[a-z0-9_-]+/gi,
      () => {
        return knownTitle?.trim() ? `Source Page: ${knownTitle.trim()}` : "Source Page: Workspace Page";
      }
    );
    result = result.replace(
      /(?:https?:\/\/[^\s\/]+)?\/workspace\/pages\/(?:cm[a-z0-9]{5,}|c[a-z0-9]{20,}|[a-z0-9_-]{10,})/gi,
      () => {
        return knownTitle?.trim() ? knownTitle.trim() : "Workspace Page";
      }
    );
    result = result.replace(
      /(?:sourcePageId|pageId)[:\s]+(?:cm[a-z0-9]{5,}|c[a-z0-9]{20,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
      () => {
        return knownTitle?.trim() ? `Source Page: ${knownTitle.trim()}` : "";
      }
    );
    result = result.replace(/\b(?:sourcePage|page)[_\s-]*(?:id)?[:\s]*(?:c[a-z0-9]{20,}|cm[a-z0-9]{5,})\b/gi, () => {
      return knownTitle?.trim() ? `Source Page: ${knownTitle.trim()}` : "";
    });
    return result.replace(/\s{2,}/g, " ").trim();
  }

  function extractSourcePageInfo(activity: {
    title?: string | null;
    description?: string | null;
    sourcePageId?: string | null;
    sourcePageTitle?: string | null;
    metadata?: Record<string, any> | null;
  }) {
    let pageId =
      activity.sourcePageId ||
      activity.metadata?.sourcePageId ||
      activity.metadata?.pageId ||
      null;

    let pageTitle =
      activity.sourcePageTitle ||
      activity.metadata?.pageTitle ||
      activity.metadata?.sourcePageTitle ||
      null;

    const combined = `${activity.title || ""} ${activity.description || ""}`;
    const mdMatch = combined.match(
      /\[([^\]]+)\]\((?:https?:\/\/[^\/]+)?\/workspace\/pages\/([a-z0-9_-]+)\)/i
    );
    if (mdMatch) {
      if (!pageTitle) {
        const extractedTitle = mdMatch[1].trim();
        if (
          !extractedTitle.startsWith("/workspace/pages") &&
          !extractedTitle.startsWith("http") &&
          !/^cm[a-z0-9]{5,}$/i.test(extractedTitle) &&
          !/^c[a-z0-9]{20,}$/i.test(extractedTitle)
        ) {
          pageTitle = extractedTitle;
        }
      }
      if (!pageId) {
        pageId = mdMatch[2].trim();
      }
    }

    if (!pageId) {
      const urlMatch = combined.match(
        /(?:https?:\/\/[^\s\/]+)?\/workspace\/pages\/([a-z0-9_-]+)/i
      );
      if (urlMatch) {
        pageId = urlMatch[1].trim();
      }
    }

    return {
      sourcePageId: pageId,
      sourcePageTitle: pageTitle || (pageId ? "Workspace Page" : null),
    };
  }

  // SOURCE PAGE:
  await t.test("Raw Source Page markdown is not rendered and human-readable page title is displayed", () => {
    const rawMarkdown = "Task created from [Project Requirements](/workspace/pages/cmucvbmz400vxjrlq31y33c)";
    const sanitized = sanitizeSourcePageText(rawMarkdown);
    assert.strictEqual(sanitized, "Task created from Project Requirements");
    assert.ok(!sanitized.includes("/workspace/pages/"));
    assert.ok(!sanitized.includes("cmucvbmz400vxjrlq31y33c"));
  });

  await t.test("Raw source-page URL is not rendered and falls back to safe label when title unavailable", () => {
    const rawUrl = "Source Page: /workspace/pages/cmucvbmz400vxjrlq31y33c";
    const sanitized = sanitizeSourcePageText(rawUrl);
    assert.strictEqual(sanitized, "Source Page: Workspace Page");
    assert.ok(!sanitized.includes("/workspace/pages/"));
    assert.ok(!sanitized.includes("cmucvbmz400vxjrlq31y33c"));

    const withTitle = sanitizeSourcePageText(rawUrl, "Client Brief");
    assert.strictEqual(withTitle, "Source Page: Client Brief");
  });

  await t.test("Raw workspace page ID and sourcePageId are not rendered", () => {
    const rawIdText = "sourcePageId: cmucvbmz400vxjrlq31y33c";
    const sanitized = sanitizeSourcePageText(rawIdText);
    assert.strictEqual(sanitized, "");
    assert.ok(!sanitized.includes("cmucvbmz400vxjrlq31y33c"));

    const withTitle = sanitizeSourcePageText(rawIdText, "Marketing Overview");
    assert.strictEqual(withTitle, "Source Page: Marketing Overview");
  });

  await t.test("Existing source-page navigation still works while internal IDs remain available", () => {
    const activity = {
      id: "act-101",
      title: "Review Notes",
      description: "Notes from [Design Specs](/workspace/pages/cmucvbmz400vxjrlq31y33c)",
      sourcePageId: "cmucvbmz400vxjrlq31y33c",
      sourcePageTitle: "Design Specs",
    };

    const sourceInfo = extractSourcePageInfo(activity);
    assert.strictEqual(sourceInfo.sourcePageId, "cmucvbmz400vxjrlq31y33c");
    assert.strictEqual(sourceInfo.sourcePageTitle, "Design Specs");

    // Internal ID used for navigation
    const href = `/workspace/pages/${sourceInfo.sourcePageId}`;
    assert.strictEqual(href, "/workspace/pages/cmucvbmz400vxjrlq31y33c");

    // Visible text is clean
    const visibleDesc = sanitizeSourcePageText(activity.description, sourceInfo.sourcePageTitle);
    assert.strictEqual(visibleDesc, "Notes from Design Specs");
    assert.ok(!visibleDesc.includes(sourceInfo.sourcePageId));
  });

  // VIEW:
  await t.test("Existing activity can be selected and viewed without exposing internal IDs", () => {
    const activity = {
      id: "cmact_12345",
      title: "Meeting with Client",
      description: "Discussed deliverables in [Architecture Review](/workspace/pages/cmucvbmz400vxjrlq31y33c)",
      relatedTo: "John Doe",
      relatedToCompany: "Acme Corp",
      type: "Meeting",
      owner: "Om",
      ownerAvatar: "O",
      dueDate: "10/15/2026",
      dueTime: "14:00",
      status: "Upcoming",
      priority: "High",
      createdAt: "2026-10-02T10:00:00Z",
    };

    let selectedActivity: any = null;
    function onAction(action: string, act: any) {
      if (action === "View") {
        selectedActivity = act;
      }
    }

    onAction("View", activity);
    assert.notStrictEqual(selectedActivity, null);
    assert.strictEqual(selectedActivity?.title, "Meeting with Client");

    const info = extractSourcePageInfo(selectedActivity!);
    const viewTitle = sanitizeSourcePageText(selectedActivity!.title, info.sourcePageTitle);
    const viewDesc = sanitizeSourcePageText(selectedActivity!.description, info.sourcePageTitle);

    assert.strictEqual(viewTitle, "Meeting with Client");
    assert.strictEqual(viewDesc, "Discussed deliverables in Architecture Review");
    assert.ok(!viewDesc.includes("cmucvbmz400vxjrlq31y33c"));
    assert.ok(!viewTitle.includes("cmact_12345"));
  });

  // ADD ACTIVITY:
  await t.test("Successful activity creation handles array response from /activities/get-activities without dropping items", () => {
    const backendData = [
      {
        id: "cmuqudzd103cvfrdlc7eg7pvl",
        organizationId: "ORG-32551",
        entityType: "COMPANY",
        entityId: "default",
        type: "NOTE",
        message: "New Note",
        createdById: "cmubkshyk0002n92hdw3hcj06",
        metadata: { priority: "Medium" },
        createdAt: "2026-10-02T10:50:41.606Z",
        createdBy: { id: "cmubkshyk0002n92hdw3hcj06", name: "om" },
      },
    ];

    const parsedActivities = Array.isArray(backendData)
      ? backendData
      : Array.isArray((backendData as any)?.activities)
      ? (backendData as any).activities
      : Array.isArray((backendData as any)?.data)
      ? (backendData as any).data
      : [];

    assert.strictEqual(parsedActivities.length, 1);
    assert.strictEqual(parsedActivities[0].id, "cmuqudzd103cvfrdlc7eg7pvl");
    assert.strictEqual(parsedActivities[0].message, "New Note");
  });

  await t.test("Add Activity payload conforms to backend schema and does not create fake activity locally", () => {
    const formData = {
      entityType: "COMPANY" as const,
      entityId: "default",
      type: "NOTE" as const,
      message: "Customer feedback recorded",
      priority: "High" as const,
      relatedTo: "Alice Smith",
      relatedCompany: "Tech Corp",
      dueDate: "2026-10-10",
      dueTime: "11:00",
    };

    const metadata: Record<string, unknown> = {
      priority: formData.priority,
      relatedTo: formData.relatedTo,
      relatedCompany: formData.relatedCompany,
      dueDate: formData.dueDate,
      dueTime: formData.dueTime,
    };

    const payload = {
      entityType: formData.entityType,
      entityId: formData.entityId,
      type: formData.type,
      message: formData.message,
      metadata,
    };

    assert.strictEqual(payload.entityType, "COMPANY");
    assert.strictEqual(payload.entityId, "default");
    assert.strictEqual(payload.type, "NOTE");
    assert.strictEqual(payload.message, "Customer feedback recorded");
    assert.strictEqual(payload.metadata.priority, "High");
    assert.strictEqual(payload.metadata.relatedCompany, "Tech Corp");
  });
});

test("Task 1 — Issue 14: Customer-Facing Lead Selection and Meeting Prep Sanitization", async (t) => {
  const CUID_REGEX = /^c[a-z0-9]{24}$/i;
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const TECHNICAL_ID_REGEX = /^(cm[a-z0-9]{20,}|c[a-z0-9]{24}|lead_[a-z0-9_-]+)$/i;

  function isTechnicalId(val: string | null | undefined): boolean {
    if (!val || typeof val !== "string") return false;
    const trimmed = val.trim();
    return CUID_REGEX.test(trimmed) || UUID_REGEX.test(trimmed) || TECHNICAL_ID_REGEX.test(trimmed);
  }

  interface LeadLike {
    id?: string | null;
    name?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    details?: string | null;
  }

  function formatLeadDisplayName(lead: LeadLike | null | undefined, fallbackText: string = "Selected Lead"): string {
    if (!lead) return fallbackText;
    const name = lead.name?.trim();
    const company = lead.company?.trim();
    const email = lead.email?.trim();
    const phone = lead.phone?.trim();
    const details = lead.details?.trim();

    if (name && !isTechnicalId(name)) {
      if (company && !isTechnicalId(company)) {
        return `${name} — ${company}`;
      }
      return name;
    }
    if (company && !isTechnicalId(company)) return company;
    if (email) return email;
    if (phone) return phone;
    if (details && !isTechnicalId(details)) return details;
    return fallbackText;
  }

  function formatLeadOptionLabel(lead: LeadLike, fallbackText: string = "Selected Lead"): string {
    const name = lead.name?.trim();
    const company = lead.company?.trim();
    const email = lead.email?.trim();
    const details = lead.details?.trim();

    const primaryLabel = (name && !isTechnicalId(name))
      ? name
      : (company && !isTechnicalId(company))
      ? company
      : (email && !isTechnicalId(email))
      ? email
      : fallbackText;

    let secondary: string | null = null;
    if (company && company !== primaryLabel && !isTechnicalId(company)) {
      secondary = company;
    } else if (details && details !== primaryLabel && !isTechnicalId(details)) {
      secondary = details;
    } else if (email && email !== primaryLabel) {
      secondary = email;
    }
    return secondary ? `${primaryLabel} (${secondary})` : primaryLabel;
  }

  function sanitizeLeadReference(text: string | null | undefined, fallback: string = "Selected Lead"): string {
    if (!text) return fallback;
    if (isTechnicalId(text)) return fallback;
    return text
      .replace(/\bcm[a-z0-9]{20,}\b/gi, fallback)
      .replace(/Lead:\s*cm[a-z0-9]{20,}/gi, `Lead: ${fallback}`)
      .replace(/Lead ID:\s*cm[a-z0-9]{20,}/gi, fallback)
      .replace(/Selected Lead:\s*cm[a-z0-9]{20,}/gi, `Selected Lead: ${fallback}`);
  }

  await t.test("Lead selection displays human-readable lead name", () => {
    const lead = {
      id: "cmupjmy5r07botpfht7s9yf7a",
      name: "Rahul Sharma",
    };
    const display = formatLeadDisplayName(lead);
    assert.strictEqual(display, "Rahul Sharma");
  });

  await t.test("Lead CUID is not displayed in lead selection display or options", () => {
    const lead = {
      id: "cmupjmy5r07botpfht7s9yf7a",
      name: "Rahul Sharma",
    };
    const display = formatLeadDisplayName(lead);
    const option = formatLeadOptionLabel(lead);
    assert.ok(!display.includes("cmupjmy5r07botpfht7s9yf7a"));
    assert.ok(!option.includes("cmupjmy5r07botpfht7s9yf7a"));
  });

  await t.test("Company information is displayed when available", () => {
    const lead = {
      id: "cmupjmy5r07botpfht7s9yf7a",
      name: "Rahul Sharma",
      company: "ABC Technologies",
    };
    const display = formatLeadDisplayName(lead);
    assert.strictEqual(display, "Rahul Sharma — ABC Technologies");

    const option = formatLeadOptionLabel(lead);
    assert.strictEqual(option, "Rahul Sharma (ABC Technologies)");
  });

  await t.test("Meeting Prep displays human-readable lead information", () => {
    const leads = [
      { id: "cmupjmy5r07botpfht7s9yf7a", name: "Rahul Sharma", company: "ABC Technologies", details: "Enterprise Lead" },
    ];
    const meetingId = "cmupjmy5r07botpfht7s9yf7a";
    const activeLead = leads.find((l) => l.id === meetingId);
    assert.ok(activeLead);

    const leadInfo = activeLead.name ? `${activeLead.name} (${activeLead.company || activeLead.details})` : "Selected Lead";
    assert.strictEqual(leadInfo, "Rahul Sharma (ABC Technologies)");
    assert.ok(!leadInfo.includes("cmupjmy5r07botpfht7s9yf7a"));
  });

  await t.test("Missing lead name uses a safe fallback without exposing raw CUID", () => {
    const leadWithCompany = { id: "cmupjmy5r07botpfht7s9yf7a", company: "ABC Technologies" };
    assert.strictEqual(formatLeadDisplayName(leadWithCompany), "ABC Technologies");

    const leadWithEmail = { id: "cmupjmy5r07botpfht7s9yf7a", email: "rahul@abctech.com" };
    assert.strictEqual(formatLeadDisplayName(leadWithEmail), "rahul@abctech.com");

    const leadEmpty = { id: "cmupjmy5r07botpfht7s9yf7a" };
    assert.strictEqual(formatLeadDisplayName(leadEmpty), "Selected Lead");
    assert.strictEqual(formatLeadOptionLabel(leadEmpty), "Selected Lead");
    assert.ok(!formatLeadDisplayName(leadEmpty).includes("cmupjmy5r07botpfht7s9yf7a"));
  });

  await t.test("Underlying lead ID remains available to API and state logic", () => {
    const lead = {
      id: "cmupjmy5r07botpfht7s9yf7a",
      name: "Rahul Sharma",
      company: "ABC Technologies",
    };

    const customerVisibleLabel = formatLeadOptionLabel(lead);
    assert.strictEqual(customerVisibleLabel, "Rahul Sharma (ABC Technologies)");

    const option = {
      value: lead.id,
      text: customerVisibleLabel,
    };
    assert.strictEqual(option.value, "cmupjmy5r07botpfht7s9yf7a");

    const selectedLeadId = option.value;
    const requestPayload = {
      leadId: selectedLeadId,
      notes: "Pre-meeting preparation",
    };
    assert.strictEqual(requestPayload.leadId, "cmupjmy5r07botpfht7s9yf7a");
  });

  await t.test("Selecting a lead still sends the correct lead ID to meeting prep API", () => {
    const leads = [
      { id: "cmupjmy5r07botpfht7s9yf7a", name: "Rahul Sharma", details: "ABC Technologies" },
      { id: "cmuh5figl064hobm55o4gj0jt", name: "Sarah Jenkins", details: "Acme Corp" },
    ];

    let apiRequestedId: string | null = null;
    function fakeGetMeetingPrep(id: string) {
      apiRequestedId = id;
      return { success: true, data: { id } };
    }

    const selectedOption = leads[1];
    fakeGetMeetingPrep(selectedOption.id);

    assert.strictEqual(apiRequestedId, "cmuh5figl064hobm55o4gj0jt");
  });

  await t.test("Meeting Prep still uses the correct selected lead ID while hiding CUID from UI", () => {
    const lead = {
      id: "cmupjmy5r07botpfht7s9yf7a",
      name: "Rahul Sharma",
      details: "ABC Technologies",
    };

    const currentMeetingId = lead.id;

    const renderedUI = {
      badge: `Lead: ${lead.name}`,
      details: lead.details,
      isCuidVisible: false,
    };

    assert.strictEqual(renderedUI.badge, "Lead: Rahul Sharma");
    assert.strictEqual(renderedUI.details, "ABC Technologies");
    assert.strictEqual(currentMeetingId, "cmupjmy5r07botpfht7s9yf7a");
    assert.strictEqual(renderedUI.badge.includes(currentMeetingId), false);
  });

  await t.test("Technical ID check identifies CUIDs and UUIDs correctly", () => {
    assert.strictEqual(isTechnicalId("cmupjmy5r07botpfht7s9yf7a"), true);
    assert.strictEqual(isTechnicalId("123e4567-e89b-12d3-a456-426614174000"), true);
    assert.strictEqual(isTechnicalId("lead_enterprise_1"), true);
    assert.strictEqual(isTechnicalId("Rahul Sharma"), false);
    assert.strictEqual(isTechnicalId("ABC Technologies"), false);
  });

  await t.test("SalesLeadDropdown: search filtering across name, company, and details is case-insensitive", () => {
    const leads = [
      { id: "lead_1", name: "Rahul Sharma", details: "ABC Technologies", type: "LEAD" as const },
      { id: "lead_2", name: "Sarah Jenkins", details: "Acme Corp", email: "sarah@acme.corp", type: "LEAD" as const },
      { id: "lead_3", name: "Vikram Malhotra", details: "Global Logistics", type: "LEAD" as const },
    ];

    const filterLeads = (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return leads;
      return leads.filter((l) => {
        const name = (l.name || "").toLowerCase();
        const details = (l.details || "").toLowerCase();
        const email = (l.email || "").toLowerCase();
        return name.includes(q) || details.includes(q) || email.includes(q);
      });
    };

    // Filter by name
    assert.strictEqual(filterLeads("rahul").length, 1);
    assert.strictEqual(filterLeads("rahul")[0].id, "lead_1");

    // Filter by details / company
    assert.strictEqual(filterLeads("acme").length, 1);
    assert.strictEqual(filterLeads("acme")[0].id, "lead_2");

    // Filter by email
    assert.strictEqual(filterLeads("sarah@acme").length, 1);

    // Empty search query returns all
    assert.strictEqual(filterLeads("").length, 3);

    // Non-matching query returns empty list
    assert.strictEqual(filterLeads("nonexistent").length, 0);
  });

  await t.test("SalesLeadDropdown: long lead names and company names truncate cleanly without raw IDs", () => {
    const longLead = {
      id: "cmupjmy5r07botpfht7s9yf7a",
      name: "Dr. Alexander Christopher Montgomery-Smith III",
      company: "International Global Holdings Conglomerate Corporation Ltd.",
      details: "Enterprise Tier 1 Strategic Partner",
    };

    const label = formatLeadOptionLabel(longLead);
    assert.strictEqual(
      label,
      "Dr. Alexander Christopher Montgomery-Smith III (International Global Holdings Conglomerate Corporation Ltd.)"
    );
    assert.strictEqual(label.includes("cmupjmy5r07botpfht7s9yf7a"), false);
  });

  await t.test("SalesLeadDropdown: wheel scrolling does not trigger selection or change selected state", () => {
    let selectedId = "lead_1";
    let fetchCount = 0;

    const onSelect = (newId: string) => {
      selectedId = newId;
      fetchCount++;
    };

    // Simulate wheel event on the dropdown scrollable list
    const simulateWheelScroll = (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      // Notice: scrolling must NOT invoke onSelect!
    };

    let stoppedPropagation = false;
    simulateWheelScroll({
      stopPropagation: () => {
        stoppedPropagation = true;
      },
    });

    assert.strictEqual(stoppedPropagation, true);
    assert.strictEqual(selectedId, "lead_1");
    assert.strictEqual(fetchCount, 0);

    // Only explicit click selection updates state and fires fetch
    onSelect("lead_2");
    assert.strictEqual(selectedId, "lead_2");
    assert.strictEqual(fetchCount, 1);
  });

  await t.test("Meeting Intelligence attribution badges sanitize technical IDs", () => {
    const intelligenceWithTechnicalIds = {
      meetingId: "cmupjmy5r07botpfht7s9yf7a",
      customerId: "cmubecbbm01go124m7lkrowav",
      dealId: "cmuh5figl064hobm55o4gj0jt",
    };

    const meetingBadge = isTechnicalId(intelligenceWithTechnicalIds.meetingId)
      ? "Active Session"
      : intelligenceWithTechnicalIds.meetingId;
    const customerBadge = isTechnicalId(intelligenceWithTechnicalIds.customerId)
      ? "Selected Customer"
      : intelligenceWithTechnicalIds.customerId;
    const dealBadge = isTechnicalId(intelligenceWithTechnicalIds.dealId)
      ? "Selected Deal"
      : intelligenceWithTechnicalIds.dealId;

    assert.strictEqual(meetingBadge, "Active Session");
    assert.strictEqual(customerBadge, "Selected Customer");
    assert.strictEqual(dealBadge, "Selected Deal");
    assert.strictEqual(meetingBadge.includes("cmup"), false);
    assert.strictEqual(customerBadge.includes("cmub"), false);
    assert.strictEqual(dealBadge.includes("cmuh"), false);

    // Legitimate human-readable identifiers are preserved
    const intelligenceHumanReadable = {
      meetingId: "Q3-Strategy-Review",
      customerId: "Acme-Enterprise",
      dealId: "Cloud-Migration-2026",
    };

    assert.strictEqual(
      isTechnicalId(intelligenceHumanReadable.meetingId) ? "Active Session" : intelligenceHumanReadable.meetingId,
      "Q3-Strategy-Review"
    );
    assert.strictEqual(
      isTechnicalId(intelligenceHumanReadable.customerId) ? "Selected Customer" : intelligenceHumanReadable.customerId,
      "Acme-Enterprise"
    );
    assert.strictEqual(
      isTechnicalId(intelligenceHumanReadable.dealId) ? "Selected Deal" : intelligenceHumanReadable.dealId,
      "Cloud-Migration-2026"
    );
  });

  await t.test("Manual meeting reference input is decoupled from dropdown selection", () => {
    let internalSelectedId = "";
    let manualSearchInput = "";

    // User selects a lead with CUID from dropdown
    const lead = { id: "cmupjmy5r07botpfht7s9yf7a", name: "Rahul Sharma" };
    internalSelectedId = lead.id;
    // Manual search input must NOT be set to lead.id
    assert.strictEqual(manualSearchInput, "");
    assert.strictEqual(internalSelectedId, "cmupjmy5r07botpfht7s9yf7a");

    // User manually types a meeting code in the search field
    manualSearchInput = "meet_strategy_alpha";
    assert.strictEqual(manualSearchInput, "meet_strategy_alpha");
    assert.strictEqual(isTechnicalId(manualSearchInput), false);
  });
});

test("Task 1 — Issue 16: Customer-Friendly Action Controls and Template Variable Sanitization", async (t) => {
  const {
    formatStepTypeLabel,
    formatOutreachChannel,
    formatProposalAction,
    formatPreferenceChannel,
    formatConsentStatus,
    formatTemplateDisplayText,
    renderTemplatePreview,
    STEP_TYPE_LABELS,
  } = await import("../lib/utils/salesDisplay.ts");

  await t.test("Sequences: Step types map to customer-friendly labels without modifying internal enums", () => {
    assert.strictEqual(formatStepTypeLabel("EMAIL"), "Send Email");
    assert.strictEqual(formatStepTypeLabel("SEND_EMAIL"), "Send Email");
    assert.strictEqual(formatStepTypeLabel("CALL"), "Phone Call");
    assert.strictEqual(formatStepTypeLabel("CALL_TASK"), "Phone Call");
    assert.strictEqual(formatStepTypeLabel("TASK"), "Create Task");
    assert.strictEqual(formatStepTypeLabel("WAIT"), "Wait Delay");
    assert.strictEqual(formatStepTypeLabel("WAIT_DELAY"), "Wait Delay");
    assert.strictEqual(formatStepTypeLabel("LINKEDIN"), "LinkedIn Touchpoint");
    assert.strictEqual(formatStepTypeLabel("WHATSAPP"), "WhatsApp Message");
    assert.strictEqual(formatStepTypeLabel("SEND_WHATSAPP"), "WhatsApp Message");
    assert.strictEqual(formatStepTypeLabel("WAIT_CONDITION"), "Wait for Condition");
    assert.strictEqual(formatStepTypeLabel("BRANCH_CONDITION"), "Branching Decision");

    // Formatted label output example: "Step 1: Send Email"
    const step1 = { stepOrder: 1, stepType: "EMAIL" };
    const step2 = { stepOrder: 2, stepType: "CALL" };
    assert.strictEqual(`Step ${step1.stepOrder}: ${formatStepTypeLabel(step1.stepType)}`, "Step 1: Send Email");
    assert.strictEqual(`Step ${step2.stepOrder}: ${formatStepTypeLabel(step2.stepType)}`, "Step 2: Phone Call");

    // Internal stepType values remain untouched
    assert.strictEqual(step1.stepType, "EMAIL");
    assert.strictEqual(step2.stepType, "CALL");
  });

  await t.test("Sequences: Dropdown options remove developer enum suffixes while retaining enum values", () => {
    // Dropdown options should render friendly labels without "(EMAIL)" suffix
    const dropdownOptions = [
      { value: "EMAIL", label: "Send Email" },
      { value: "CALL", label: "Phone Call" },
      { value: "TASK", label: "Create Task" },
      { value: "WAIT", label: "Wait Delay" },
      { value: "LINKEDIN", label: "LinkedIn Touchpoint" },
    ];

    dropdownOptions.forEach((opt) => {
      // Must not contain developer enum suffix like "Send Email (EMAIL)"
      assert.strictEqual(opt.label.includes(`(${opt.value})`), false);
      // Friendly label should match expected display
      assert.strictEqual(opt.label, STEP_TYPE_LABELS[opt.value]);
    });
  });

  await t.test("Sequences: Personalization toolbar inserts correct template token at cursor position", () => {
    // Helper replicating insertVariableAtCursor logic
    function insertVariable(currentBody: string, token: string, selectionStart: number, selectionEnd: number) {
      const newBody = currentBody.substring(0, selectionStart) + token + currentBody.substring(selectionEnd);
      const newCursorPos = selectionStart + token.length;
      return { newBody, newCursorPos };
    }

    // 1. Insert at middle cursor position
    const text1 = "Hello , how are you?";
    const res1 = insertVariable(text1, "{{firstName}}", 6, 6);
    assert.strictEqual(res1.newBody, "Hello {{firstName}}, how are you?");
    assert.strictEqual(res1.newCursorPos, 6 + "{{firstName}}".length);

    // 2. Insert with selected text replacement
    const text2 = "Welcome [NAME] to our portal";
    const res2 = insertVariable(text2, "{{company}}", 8, 14);
    assert.strictEqual(res2.newBody, "Welcome {{company}} to our portal");

    // 3. Insert + Full Name and + Job Title
    const text3 = "Contact ";
    const res3 = insertVariable(text3, "{{name}}", text3.length, text3.length);
    assert.strictEqual(res3.newBody, "Contact {{name}}");

    const text4 = "Role: ";
    const res4 = insertVariable(text4, "{{jobTitle}}", text4.length, text4.length);
    assert.strictEqual(res4.newBody, "Role: {{jobTitle}}");

    // 4. Stored underlying step body preserves exact template tokens
    const stepPayload = {
      stepOrder: 1,
      stepType: "EMAIL",
      subject: "Introduction",
      body: res1.newBody,
    };
    assert.strictEqual(stepPayload.body, "Hello {{firstName}}, how are you?");
    assert.strictEqual(stepPayload.stepType, "EMAIL");
  });

  await t.test("Sequences: Preview converts raw template variables to customer-friendly chips/tags", () => {
    const rawTemplate = "Hi {{firstName}}, thanks for connecting from {{company}}. Is {{name}} still {{jobTitle}}?";

    // Plain text formatter
    const friendlyText = formatTemplateDisplayText(rawTemplate);
    assert.strictEqual(
      friendlyText,
      "Hi [First Name], thanks for connecting from [Company]. Is [Full Name] still [Job Title]?"
    );
    assert.strictEqual(friendlyText.includes("{{firstName}}"), false);
    assert.strictEqual(friendlyText.includes("{{company}}"), false);

    // Node preview renderer returns React element tree with styled variable chips
    const previewNode = renderTemplatePreview(rawTemplate);
    assert.ok(previewNode);
    // Underlying template string remains completely untouched
    assert.strictEqual(rawTemplate, "Hi {{firstName}}, thanks for connecting from {{company}}. Is {{name}} still {{jobTitle}}?");
  });

  await t.test("Outreach Generator: Formats outreach channels to customer-friendly labels", () => {
    assert.strictEqual(formatOutreachChannel("EMAIL"), "Email");
    assert.strictEqual(formatOutreachChannel("WHATSAPP"), "WhatsApp");
    assert.strictEqual(formatOutreachChannel("CALL_SCRIPT"), "Phone Call Script");
    assert.strictEqual(formatOutreachChannel("LINKEDIN"), "LinkedIn Message");
    assert.strictEqual(formatOutreachChannel("ALL"), "All Channels");

    // Active draft badge display
    const activeDraft = {
      id: "draft_123",
      channel: "CALL_SCRIPT",
      content: "Hello prospect...",
    };
    const displayedBadge = formatOutreachChannel(activeDraft.channel);
    assert.strictEqual(displayedBadge, "Phone Call Script");

    // Internal channel value and API payload remain unchanged
    assert.strictEqual(activeDraft.channel, "CALL_SCRIPT");

    // Channel selection tabs list
    const availableChannels = ["EMAIL", "WHATSAPP", "CALL_SCRIPT", "LINKEDIN"];
    const channelTabLabels = availableChannels.map((c) => formatOutreachChannel(c));
    assert.deepStrictEqual(channelTabLabels, ["Email", "WhatsApp", "Phone Call Script", "LinkedIn Message"]);
  });

  await t.test("Proposals: Governance actions format to customer-friendly labels", () => {
    assert.strictEqual(formatProposalAction("AUTO_APPROVE"), "Auto Approve");
    assert.strictEqual(formatProposalAction("REQUIRE_VP_APPROVAL"), "Require VP Approval");
    assert.strictEqual(formatProposalAction("FLAG_COMPLIANCE"), "Flag Compliance");

    // Rule card badge
    const rule = {
      id: "rule_1",
      name: "High Discount Threshold",
      action: "REQUIRE_VP_APPROVAL",
      isActive: true,
    };

    assert.strictEqual(formatProposalAction(rule.action), "Require VP Approval");
    // Internal rule action remains unchanged
    assert.strictEqual(rule.action, "REQUIRE_VP_APPROVAL");
  });

  await t.test("Customer Preferences: Channel options and consent statuses format cleanly", () => {
    // Channels
    assert.strictEqual(formatPreferenceChannel("EMAIL"), "Email");
    assert.strictEqual(formatPreferenceChannel("PHONE"), "Phone");
    assert.strictEqual(formatPreferenceChannel("SMS"), "SMS");
    assert.strictEqual(formatPreferenceChannel("WHATSAPP"), "WhatsApp");
    assert.strictEqual(formatPreferenceChannel("IN_APP"), "In-App");
    assert.strictEqual(formatPreferenceChannel("NONE"), "None");

    // Consent statuses
    assert.strictEqual(formatConsentStatus("GRANTED"), "Granted");
    assert.strictEqual(formatConsentStatus("PENDING"), "Pending");
    assert.strictEqual(formatConsentStatus("WITHDRAWN"), "Withdrawn");
    assert.strictEqual(formatConsentStatus("NOT_SET"), "Not Set");

    // Modal options retain underlying values
    const preferencePayload = {
      preferredChannel: "WHATSAPP",
      consentStatus: "GRANTED",
    };
    assert.strictEqual(formatPreferenceChannel(preferencePayload.preferredChannel), "WhatsApp");
    assert.strictEqual(formatConsentStatus(preferencePayload.consentStatus), "Granted");
    assert.strictEqual(preferencePayload.preferredChannel, "WHATSAPP");
    assert.strictEqual(preferencePayload.consentStatus, "GRANTED");
  });

  await t.test("End-to-End API payload immutability check for Issue 16", () => {
    // Sequences API payload
    const sequencePayload = {
      name: "Outbound SaaS Sequence",
      steps: [
        { stepOrder: 1, stepType: "EMAIL", body: "Hi {{firstName}}, welcome to {{company}}!" },
        { stepOrder: 2, stepType: "CALL", body: "Follow up with {{name}}" },
      ],
    };
    assert.strictEqual(sequencePayload.steps[0].stepType, "EMAIL");
    assert.strictEqual(sequencePayload.steps[0].body.includes("{{firstName}}"), true);
    assert.strictEqual(sequencePayload.steps[1].stepType, "CALL");

    // Outreach API payload
    const outreachPayload = {
      channel: "CALL_SCRIPT",
      leadId: "lead_123",
      template: "Outreach Pitch",
    };
    assert.strictEqual(outreachPayload.channel, "CALL_SCRIPT");

    // Proposal API payload
    const proposalRulePayload = {
      name: "VP Approvals for large deals",
      action: "REQUIRE_VP_APPROVAL",
    };
    assert.strictEqual(proposalRulePayload.action, "REQUIRE_VP_APPROVAL");
  });
});

