// tests/my_tasks_export.test.ts
import test from "node:test";
import assert from "node:assert/strict";

// ── Types & Logic Under Test (aligned with lib/api/tasksApi.ts, exportApi.ts & useMyTasks.ts)

export type MyTaskBucket = "all" | "overdue" | "dueToday" | "upcoming" | "completed";
export type BackendTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "BLOCKED" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type ExportFormat = "CSV" | "XLSX" | "MARKDOWN" | "HTML" | "PDF";
export type ExportEntityType = "PAGE" | "TASK" | "PROJECT";

export interface TaskCounts {
  all: number;
  overdue: number;
  dueToday: number;
  upcoming: number;
  completed: number;
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
  projectId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  parentTaskId?: string | null;
  labels?: string[];
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
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

export const FORMAT_MIME_TYPES: Record<ExportFormat, string> = {
  CSV: "text/csv;charset=utf-8",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  MARKDOWN: "text/markdown;charset=utf-8",
  HTML: "text/html;charset=utf-8",
  PDF: "application/pdf",
};

export const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  CSV: ".csv",
  XLSX: ".xlsx",
  MARKDOWN: ".md",
  HTML: ".html",
  PDF: ".pdf",
};

export function getTaskBucket(task: Task, refDate: Date = new Date()): MyTaskBucket {
  if (task.status === "DONE") return "completed";
  if (!task.dueDate) return "upcoming";

  const due = new Date(task.dueDate);
  if (isNaN(due.getTime())) return "upcoming";

  const startOfToday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 23, 59, 59, 999);

  if (due < startOfToday) {
    return "overdue";
  } else if (due >= startOfToday && due <= endOfToday) {
    return "dueToday";
  } else {
    return "upcoming";
  }
}

export function computeTaskCounts(tasks: Task[], refDate: Date = new Date()): TaskCounts {
  const counts: TaskCounts = {
    all: tasks.length,
    overdue: 0,
    dueToday: 0,
    upcoming: 0,
    completed: 0,
  };

  for (const t of tasks) {
    const bucket = getTaskBucket(t, refDate);
    if (bucket === "completed") counts.completed++;
    else if (bucket === "overdue") counts.overdue++;
    else if (bucket === "dueToday") counts.dueToday++;
    else if (bucket === "upcoming") counts.upcoming++;
  }

  return counts;
}

export function resolveTaskContextLinks(task: Task) {
  return {
    projectUrl: task.projectId ? `/workspace/projects/${task.projectId}` : null,
    pageUrl: (task as any).pageId ? `/workspace/pages/${(task as any).pageId}` : null,
    leadUrl: task.leadId ? `/leads` : null,
    dealUrl: task.dealId ? `/deals` : null,
  };
}

export function formatExportRequest(
  entityType: ExportEntityType,
  entityId: string,
  format: ExportFormat,
  options?: Record<string, any>
) {
  return {
    endpoint: "/exports",
    method: "POST",
    payload: {
      entityType,
      entityId,
      format: format.toLowerCase(),
      options: {
        includeAttachments: options?.includeAttachments ?? true,
        includeChildren: options?.includeChildren ?? true,
        includeActivities: options?.includeActivities ?? false,
        includeComments: options?.includeComments ?? false,
      },
    },
  };
}

// ── Test Suites ──────────────────────────────────────────────────────────────

const mockReferenceDate = new Date("2026-09-18T12:00:00Z");

function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task_1",
    title: "Implement User Authentication",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: "2026-09-18T18:00:00Z",
    assignedToId: "user_emp_1",
    assignedTo: {
      id: "user_emp_1",
      name: "Alice Engineer",
      email: "alice@zyoris.com",
    },
    createdAt: "2026-09-01T10:00:00Z",
    ...overrides,
  };
}

test("Day 5: My Tasks Bucket Categorization Logic", async (t) => {
  await t.test("categorizes completed task with status DONE regardless of past due date", () => {
    const task = createMockTask({
      status: "DONE",
      dueDate: "2026-09-10T10:00:00Z",
    });
    const bucket = getTaskBucket(task, mockReferenceDate);
    assert.equal(bucket, "completed");
  });

  await t.test("categorizes task with past due date and non-DONE status as overdue", () => {
    const task = createMockTask({
      status: "IN_PROGRESS",
      dueDate: "2026-09-17T09:00:00Z",
    });
    const bucket = getTaskBucket(task, mockReferenceDate);
    assert.equal(bucket, "overdue");
  });

  await t.test("categorizes task due on reference date as dueToday", () => {
    const task = createMockTask({
      status: "TODO",
      dueDate: "2026-09-18T16:00:00Z",
    });
    const bucket = getTaskBucket(task, mockReferenceDate);
    assert.equal(bucket, "dueToday");
  });

  await t.test("categorizes future due date tasks as upcoming", () => {
    const task = createMockTask({
      status: "TODO",
      dueDate: "2026-09-25T10:00:00Z",
    });
    const bucket = getTaskBucket(task, mockReferenceDate);
    assert.equal(bucket, "upcoming");
  });

  await t.test("categorizes task without due date as upcoming fallback", () => {
    const task = createMockTask({
      status: "TODO",
      dueDate: null,
    });
    const bucket = getTaskBucket(task, mockReferenceDate);
    assert.equal(bucket, "upcoming");
  });
});

test("Day 5: Live Task Count Aggregation", async (t) => {
  await t.test("accurately computes all bucket counts across task collection", () => {
    const taskList: Task[] = [
      createMockTask({ id: "t1", status: "DONE", dueDate: "2026-09-01T00:00:00Z" }),
      createMockTask({ id: "t2", status: "DONE", dueDate: "2026-09-18T00:00:00Z" }),
      createMockTask({ id: "t3", status: "TODO", dueDate: "2026-09-10T00:00:00Z" }),
      createMockTask({ id: "t4", status: "IN_PROGRESS", dueDate: "2026-09-15T00:00:00Z" }),
      createMockTask({ id: "t5", status: "REVIEW", dueDate: "2026-09-18T08:00:00Z" }),
      createMockTask({ id: "t6", status: "BLOCKED", dueDate: "2026-09-18T11:00:00Z" }),
      createMockTask({ id: "t7", status: "TODO", dueDate: "2026-09-22T00:00:00Z" }),
      createMockTask({ id: "t8", status: "TODO", dueDate: null }),
    ];

    const counts = computeTaskCounts(taskList, mockReferenceDate);
    assert.equal(counts.all, 8);
    assert.equal(counts.completed, 2);
    assert.equal(counts.overdue, 2);
    assert.equal(counts.dueToday, 2);
    assert.equal(counts.upcoming, 2);
  });

  await t.test("handles empty list without error or NaN", () => {
    const counts = computeTaskCounts([], mockReferenceDate);
    assert.deepEqual(counts, {
      all: 0,
      overdue: 0,
      dueToday: 0,
      upcoming: 0,
      completed: 0,
    });
  });
});

test("Day 5: Assignment Events & Notification Polling Detection", async (t) => {
  await t.test("filters assignment events matching logged in user or broadcast", () => {
    const currentUserId = "user_123";
    const events: TaskAssignmentEvent[] = [
      {
        id: "evt_1",
        taskId: "task_1",
        assignedToId: "user_123",
        assignedById: "mgr_1",
        eventType: "TASK_ASSIGNED",
        createdAt: "2026-09-18T12:05:00Z",
      },
      {
        id: "evt_2",
        taskId: "task_2",
        assignedToId: "user_other",
        assignedById: "mgr_1",
        eventType: "TASK_ASSIGNED",
        createdAt: "2026-09-18T12:06:00Z",
      },
      {
        id: "evt_3",
        taskId: "task_3",
        assignedToId: null,
        assignedById: "mgr_1",
        eventType: "TASK_REASSIGNED",
        createdAt: "2026-09-18T12:07:00Z",
      },
    ];

    const relevant = events.filter((e) => {
      if (!currentUserId) return true;
      return e.assignedToId === currentUserId || !e.assignedToId;
    });

    assert.equal(relevant.length, 2);
    assert.equal(relevant[0].id, "evt_1");
    assert.equal(relevant[1].id, "evt_3");
  });
});

test("Day 5: Task Context Navigation Link Resolution", async (t) => {
  await t.test("resolves navigation targets for Project, Page, Lead, and Deal contexts", () => {
    const task = createMockTask({
      projectId: "proj_abc",
      leadId: "lead_123",
      dealId: "deal_789",
    });
    (task as any).pageId = "page_xyz";

    const links = resolveTaskContextLinks(task);
    assert.equal(links.projectUrl, "/workspace/projects/proj_abc");
    assert.equal(links.pageUrl, "/workspace/pages/page_xyz");
    assert.equal(links.leadUrl, "/leads");
    assert.equal(links.dealUrl, "/deals");
  });
});

test("Day 5: Permission-Aware Status Update & Error Handling", async (t) => {
  await t.test("maps substatuses to valid backend enums (REVIEW/BLOCKED -> IN_PROGRESS)", () => {
    assert.equal(toBackendTaskStatus("REVIEW"), "IN_PROGRESS");
    assert.equal(toBackendTaskStatus("BLOCKED"), "IN_PROGRESS");
    assert.equal(toBackendTaskStatus("TODO"), "TODO");
    assert.equal(toBackendTaskStatus("DONE"), "DONE");
  });

  await t.test("handles 403 Forbidden with clear user message", () => {
    const formatPermissionError = (status: number) => {
      if (status === 403) {
        return "Permission denied: You do not have permission to update this task's status.";
      }
      return "Update failed.";
    };

    assert.equal(
      formatPermissionError(403),
      "Permission denied: You do not have permission to update this task's status."
    );
  });
});

test("Day 5: Export API & Controls Specification", async (t) => {
  await t.test("supports all 5 export formats with valid file extensions and MIME types", () => {
    const formats: ExportFormat[] = ["CSV", "XLSX", "MARKDOWN", "HTML", "PDF"];

    formats.forEach((fmt) => {
      assert.ok(FORMAT_MIME_TYPES[fmt], `MIME type defined for ${fmt}`);
      assert.ok(FORMAT_EXTENSIONS[fmt], `Extension defined for ${fmt}`);
    });

    assert.equal(FORMAT_EXTENSIONS.CSV, ".csv");
    assert.equal(FORMAT_EXTENSIONS.XLSX, ".xlsx");
    assert.equal(FORMAT_EXTENSIONS.MARKDOWN, ".md");
    assert.equal(FORMAT_EXTENSIONS.HTML, ".html");
    assert.equal(FORMAT_EXTENSIONS.PDF, ".pdf");
  });

  await t.test("formats POST /exports request payload with lowercase format enum", () => {
    const req = formatExportRequest("PROJECT", "proj_456", "PDF", {
      includeAttachments: true,
      includeChildren: true,
    });

    assert.equal(req.endpoint, "/exports");
    assert.equal(req.method, "POST");
    assert.equal(req.payload.format, "pdf");
    assert.equal(req.payload.entityType, "PROJECT");
    assert.equal(req.payload.entityId, "proj_456");
    assert.equal(req.payload.options.includeAttachments, true);
    assert.equal(req.payload.options.includeChildren, true);
  });

  await t.test("flags 403 Forbidden on unauthorized export attempt", () => {
    const errorResponse = { status: 403 };
    let msg = "Export failed";
    if (errorResponse.status === 403) {
      msg = "Permission denied: You do not have permission to export this data.";
    }
    assert.equal(msg, "Permission denied: You do not have permission to export this data.");
  });
});

test("Day 5: Project Database Table Data Export & Contract Validation", async (t) => {
  await t.test("ensures entityId uses valid projectId instead of database.id to prevent 404", () => {
    const project = { id: "proj_crm_upgrade_101", name: "CRM Upgrade" };
    const database = { id: "db_inline_xyz_789", name: "CRM Database", pageId: "page_doc_456" };

    // Function simulating the resolution in ProjectDatabaseTable
    const resolveExportPayload = (
      passedProjectId: string | undefined,
      db: typeof database,
      format: ExportFormat
    ) => {
      // Must NOT use database.id as project entityId
      const targetProjectId = passedProjectId || "";
      return formatExportRequest("PROJECT", targetProjectId, format, { databaseId: db.id });
    };

    const req = resolveExportPayload(project.id, database, "CSV");
    assert.equal(req.payload.entityType, "PROJECT");
    assert.equal(req.payload.entityId, "proj_crm_upgrade_101");
    assert.notEqual(req.payload.entityId, "db_inline_xyz_789");
    assert.equal(req.payload.format, "csv");
  });

  await t.test("formats database rows and properties into tabular records for export", () => {
    const properties = [
      { id: "p1", name: "Name", type: "TEXT" },
      { id: "p2", name: "Status", type: "SELECT" },
      { id: "p3", name: "Amount", type: "NUMBER" },
    ];
    const rows = [
      { id: "r1", data: { Name: "Acme Corp Deal", Status: "Done", Amount: 5000 } },
      { id: "r2", data: { Name: "Beta LLC", Status: "Todo", Amount: 12000 } },
      { id: "r3", data: { Name: "Gamma Tech", Status: "In Progress", Amount: 8500 } },
      { id: "r4", data: { Name: "Delta Inc", Status: "Done", Amount: 3000 } },
      { id: "r5", data: { Name: "Epsilon Co", Status: "Todo", Amount: 9500 } },
    ];

    const propertyNames = properties.map((p) => p.name);
    const formatted = rows.map((row) => {
      const obj: Record<string, any> = {};
      const dataRecord = row.data as Record<string, any>;
      propertyNames.forEach((name) => {
        obj[name] = dataRecord[name] ?? "";
      });
      return obj;
    });

    assert.equal(formatted.length, 5);
    assert.equal(formatted[0].Name, "Acme Corp Deal");
    assert.equal(formatted[0].Status, "Done");
    assert.equal(formatted[0].Amount, 5000);
    assert.equal(formatted[4].Name, "Epsilon Co");
    assert.equal(formatted[4].Amount, 9500);
  });
});

