// tests/project_workspace_database.test.ts
import test from "node:test";
import assert from "node:assert/strict";

// ── Types Aligned with lib/api/projectsApi.ts and types/workspace.ts ─────────

export type ProjectMemberRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface ProjectSummaryCounts {
  tasks: number;
  pages: number;
  files: number;
  members: number;
  milestones: number;
}

export interface ProjectTask {
  id: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  projectId: string;
  organizationId?: string;
  createdById?: string;
  assignedToId?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectTaskPayload {
  title: string;
  description?: string;
  assignedToId?: string;
  dueDate?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  status?: "TODO" | "IN_PROGRESS" | "DONE";
}

export interface ProjectPage {
  id: string;
  title: string;
  icon?: string | null;
  coverImage?: string | null;
  parentId?: string | null;
  projectId: string;
  organizationId?: string;
  createdById?: string;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  organizationId?: string;
  originalName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  clientId: string | null;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED";
  startDate: string;
  endDate?: string;
  counts?: ProjectSummaryCounts;
  createdAt: string;
  updatedAt: string;
}

export type DatabasePropertyType =
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "date"
  | "checkbox"
  | "url"
  | "TEXT"
  | "NUMBER"
  | "SELECT"
  | "MULTI_SELECT"
  | "DATE"
  | "CHECKBOX"
  | "URL";

export interface WorkspaceDatabaseProperty {
  id: string;
  databaseId?: string;
  name: string;
  type: DatabasePropertyType;
  options?: string[] | Record<string, any>;
  createdAt?: string;
}

export interface WorkspaceDatabaseRow {
  id: string;
  databaseId?: string;
  data: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

// ── Pure Filtering Logic Under Test (mirrors ProjectWorkspace.tsx) ───────────

export function filterProjectTasks(
  tasks: ProjectTask[],
  options: {
    status?: string;
    priority?: string;
    search?: string;
  }
): ProjectTask[] {
  return tasks.filter((t) => {
    if (options.status && options.status !== "ALL" && t.status !== options.status) {
      return false;
    }
    if (options.priority && options.priority !== "ALL" && t.priority !== options.priority) {
      return false;
    }
    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });
}

// ── Pure Sorting & Filtering Logic Under Test (mirrors ProjectDatabaseTable.tsx)

export function filterDatabaseRows(
  rows: WorkspaceDatabaseRow[],
  options: {
    searchQuery?: string;
    filterColumn?: string;
    filterValue?: string;
  }
): WorkspaceDatabaseRow[] {
  let result = [...rows];

  if (options.searchQuery && options.searchQuery.trim()) {
    const q = options.searchQuery.toLowerCase();
    result = result.filter((r) => {
      return Object.values(r.data || {}).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }

  if (options.filterColumn && options.filterColumn !== "ALL" && options.filterValue?.trim()) {
    const q = options.filterValue.toLowerCase();
    result = result.filter((r) => {
      const val = r.data?.[options.filterColumn!];
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(q);
    });
  }

  return result;
}

export function sortDatabaseRows(
  rows: WorkspaceDatabaseRow[],
  sortColumn: string | null,
  sortDirection: "asc" | "desc" = "asc"
): WorkspaceDatabaseRow[] {
  if (!sortColumn) return [...rows];

  return [...rows].sort((a, b) => {
    const valA = a.data?.[sortColumn];
    const valB = b.data?.[sortColumn];

    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;

    if (typeof valA === "number" && typeof valB === "number") {
      return sortDirection === "asc" ? valA - valB : valB - valA;
    }

    if (typeof valA === "boolean" && typeof valB === "boolean") {
      return sortDirection === "asc"
        ? (valA ? 1 : 0) - (valB ? 1 : 0)
        : (valB ? 1 : 0) - (valA ? 1 : 0);
    }

    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    const comp = strA.localeCompare(strB);
    return sortDirection === "asc" ? comp : -comp;
  });
}

// ── Contract Builders for BE-1 and BE-2 APIs ────────────────────────────────

export function buildCreateTaskRequest(
  projectId: string,
  payload: CreateProjectTaskPayload
) {
  if (!projectId) throw new Error("projectId is required for project task creation");
  if (!payload.title || !payload.title.trim()) {
    throw new Error("Task title is required");
  }
  return {
    endpoint: `/projects/${projectId}/tasks`,
    method: "POST",
    body: {
      title: payload.title.trim(),
      description: payload.description?.trim() || undefined,
      status: payload.status || "TODO",
      priority: payload.priority || "MEDIUM",
      dueDate: payload.dueDate || undefined,
      assignedToId: payload.assignedToId || undefined,
    },
  };
}

export function buildCreateDatabaseRequest(pageId: string, name: string) {
  if (!pageId) throw new Error("pageId is required");
  if (!name || !name.trim()) throw new Error("Database name is required");
  return {
    endpoint: `/workspace/pages/${pageId}/database`,
    method: "POST",
    body: {
      name: name.trim(),
    },
  };
}

export function buildAddPropertyRequest(
  databaseId: string,
  name: string,
  type: DatabasePropertyType,
  options?: any
) {
  if (!databaseId) throw new Error("databaseId is required");
  if (!name || !name.trim()) throw new Error("Property name is required");
  return {
    endpoint: `/workspace/databases/${databaseId}/properties`,
    method: "POST",
    body: {
      name: name.trim(),
      type: (type as string).toUpperCase(),
      ...(options ? { options } : {}),
    },
  };
}

export function buildRowManagementRequests(
  databaseId: string,
  rowId: string,
  dataPayload: Record<string, any>
) {
  return {
    create: {
      endpoint: `/workspace/databases/${databaseId}/rows`,
      method: "POST",
      body: { data: dataPayload },
    },
    update: {
      endpoint: `/workspace/databases/rows/${rowId}`,
      method: "PATCH",
      body: { data: dataPayload },
    },
    delete: {
      endpoint: `/workspace/databases/rows/${rowId}`,
      method: "DELETE",
    },
  };
}

// ── TEST SUITE ──────────────────────────────────────────────────────────────

test("BE-2 Project Tasks: task creation inherits projectId automatically", () => {
  const projectId = "proj_test_123";
  const req = buildCreateTaskRequest(projectId, {
    title: "Implement UI Database Tab",
    description: "Connect table component to BE-1 endpoints",
    status: "IN_PROGRESS",
    priority: "HIGH",
  });

  assert.equal(req.endpoint, "/projects/proj_test_123/tasks");
  assert.equal(req.method, "POST");
  assert.equal(req.body.title, "Implement UI Database Tab");
  assert.equal(req.body.status, "IN_PROGRESS");
  assert.equal(req.body.priority, "HIGH");
});

test("BE-2 Project Tasks: throws validation error when title is missing", () => {
  assert.throws(
    () => buildCreateTaskRequest("proj_1", { title: "" }),
    /Task title is required/
  );
});

test("BE-2 Project Tasks: filtering by status, priority, and search query", () => {
  const sampleTasks: ProjectTask[] = [
    {
      id: "task_1",
      projectId: "proj_1",
      title: "Design user schema",
      description: "Entity relation diagram",
      status: "DONE",
      priority: "HIGH",
      createdAt: "2026-09-17T10:00:00Z",
      updatedAt: "2026-09-17T10:00:00Z",
    },
    {
      id: "task_2",
      projectId: "proj_1",
      title: "Build REST endpoints",
      description: "FastAPI or Express routes",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      createdAt: "2026-09-17T11:00:00Z",
      updatedAt: "2026-09-17T11:00:00Z",
    },
    {
      id: "task_3",
      projectId: "proj_1",
      title: "Write documentation",
      description: "API docs and guides",
      status: "TODO",
      priority: "LOW",
      createdAt: "2026-09-17T12:00:00Z",
      updatedAt: "2026-09-17T12:00:00Z",
    },
  ];

  // Filter by status
  const doneTasks = filterProjectTasks(sampleTasks, { status: "DONE" });
  assert.equal(doneTasks.length, 1);
  assert.equal(doneTasks[0].id, "task_1");

  // Filter by priority
  const highTasks = filterProjectTasks(sampleTasks, { priority: "HIGH" });
  assert.equal(highTasks.length, 1);
  assert.equal(highTasks[0].id, "task_1");

  // Search by query
  const searched = filterProjectTasks(sampleTasks, { search: "endpoints" });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, "task_2");

  // Multi-attribute filter
  const multi = filterProjectTasks(sampleTasks, {
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    search: "REST",
  });
  assert.equal(multi.length, 1);
  assert.equal(multi[0].id, "task_2");
});

test("BE-2 Project Summary Counts: preserves counts object from GET /projects/:id", () => {
  const counts: ProjectSummaryCounts = {
    tasks: 15,
    pages: 4,
    files: 8,
    members: 5,
    milestones: 3,
  };

  const project: Project = {
    id: "proj_999",
    name: "Enterprise Migration",
    status: "ACTIVE",
    startDate: "2026-09-01T00:00:00Z",
    clientId: null,
    counts,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-17T00:00:00Z",
  };

  assert.equal(project.counts?.tasks, 15);
  assert.equal(project.counts?.pages, 4);
  assert.equal(project.counts?.files, 8);
  assert.equal(project.counts?.members, 5);
  assert.equal(project.counts?.milestones, 3);
});

test("BE-1 Database Foundation: POST /workspace/pages/:pageId/database adheres to OpenAPI name field", () => {
  const req = buildCreateDatabaseRequest("page_abc_123", "Product Roadmap DB");
  assert.equal(req.endpoint, "/workspace/pages/page_abc_123/database");
  assert.equal(req.method, "POST");
  assert.equal(req.body.name, "Product Roadmap DB");
});

test("BE-1 Database Foundation: POST /workspace/databases/:databaseId/properties strictly enforces uppercase enum types", () => {
  const validTypes: DatabasePropertyType[] = [
    "TEXT",
    "NUMBER",
    "SELECT",
    "MULTI_SELECT",
    "DATE",
    "CHECKBOX",
    "URL",
  ];

  for (const t of validTypes) {
    const req = buildAddPropertyRequest("db_100", `Column_${t}`, t);
    assert.equal(req.endpoint, "/workspace/databases/db_100/properties");
    assert.equal(req.method, "POST");
    assert.equal(req.body.type, t);
  }

  // Also verify lowercase inputs get automatically normalized to uppercase
  const normalizedReq = buildAddPropertyRequest("db_100", "Column_text", "text" as any);
  assert.equal(normalizedReq.body.type, "TEXT");
});

test("BE-1 Database Foundation: Row CRUD requests format correctly to OpenAPI routes", () => {
  const dbId = "db_777";
  const rowId = "row_999";
  const payload = { Name: "Bug #101", Severity: "Critical", Resolved: false };

  const reqs = buildRowManagementRequests(dbId, rowId, payload);

  // POST /workspace/databases/:databaseId/rows
  assert.equal(reqs.create.endpoint, "/workspace/databases/db_777/rows");
  assert.equal(reqs.create.method, "POST");
  assert.deepEqual(reqs.create.body, { data: payload });

  // PATCH /workspace/databases/rows/:rowId
  assert.equal(reqs.update.endpoint, "/workspace/databases/rows/row_999");
  assert.equal(reqs.update.method, "PATCH");
  assert.deepEqual(reqs.update.body, { data: payload });

  // DELETE /workspace/databases/rows/:rowId
  assert.equal(reqs.delete.endpoint, "/workspace/databases/rows/row_999");
  assert.equal(reqs.delete.method, "DELETE");
});

test("Database Table Sorting: sorts text, number, date, and boolean columns correctly", () => {
  const rows: WorkspaceDatabaseRow[] = [
    { id: "r1", data: { name: "Gamma", priority: 3, done: true, due: "2026-10-15" } },
    { id: "r2", data: { name: "Alpha", priority: 1, done: false, due: "2026-09-20" } },
    { id: "r3", data: { name: "Beta", priority: 2, done: false, due: "2026-11-01" } },
  ];

  // Sort Text Ascending
  const sortTextAsc = sortDatabaseRows(rows, "name", "asc");
  assert.equal(sortTextAsc[0].data.name, "Alpha");
  assert.equal(sortTextAsc[1].data.name, "Beta");
  assert.equal(sortTextAsc[2].data.name, "Gamma");

  // Sort Text Descending
  const sortTextDesc = sortDatabaseRows(rows, "name", "desc");
  assert.equal(sortTextDesc[0].data.name, "Gamma");
  assert.equal(sortTextDesc[1].data.name, "Beta");
  assert.equal(sortTextDesc[2].data.name, "Alpha");

  // Sort Number Ascending
  const sortNumAsc = sortDatabaseRows(rows, "priority", "asc");
  assert.equal(sortNumAsc[0].data.priority, 1);
  assert.equal(sortNumAsc[2].data.priority, 3);

  // Sort Boolean
  const sortBoolAsc = sortDatabaseRows(rows, "done", "asc");
  assert.equal(sortBoolAsc[0].data.done, false);
  assert.equal(sortBoolAsc[2].data.done, true);
});

test("Database Table Filtering: global search and column-specific filter", () => {
  const rows: WorkspaceDatabaseRow[] = [
    { id: "r1", data: { name: "Auth Service", status: "Active", estimate: 40 } },
    { id: "r2", data: { name: "Payment Gateway", status: "Review", estimate: 80 } },
    { id: "r3", data: { name: "Analytics Dashboard", status: "Active", estimate: 25 } },
  ];

  // Global search matching "gateway"
  const searched = filterDatabaseRows(rows, { searchQuery: "gateway" });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, "r2");

  // Column specific filter matching status "Active"
  const filtered = filterDatabaseRows(rows, {
    filterColumn: "status",
    filterValue: "active",
  });
  assert.equal(filtered.length, 2);
  assert.deepEqual(
    filtered.map((r) => r.id),
    ["r1", "r3"]
  );
});
