import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import type { DatabasePropertyType } from "../types/workspace";

// ── Test Helpers & Pure Logic Re-creations for Contract Verification ─────────

export function parseSpreadsheetBuffer(content: string): Record<string, any>[] {
  const workbook = XLSX.read(content, { type: "string", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { raw: true });
}

export function buildImportPreviewRequest(
  databaseId: string,
  sampleRows: Record<string, any>[]
) {
  if (!databaseId) throw new Error("databaseId is required");
  if (!Array.isArray(sampleRows) || sampleRows.length === 0) {
    throw new Error("sampleRows must be a non-empty array");
  }
  return {
    endpoint: `/workspace/databases/${databaseId}/import/preview`,
    method: "POST",
    body: {
      data: sampleRows.slice(0, 10),
    },
  };
}

export function buildImportCommitRequest(
  databaseId: string,
  schema: Record<string, string>,
  rows: Record<string, any>[]
) {
  if (!databaseId) throw new Error("databaseId is required");
  if (!schema || Object.keys(schema).length === 0) {
    throw new Error("schema must contain at least one mapped property");
  }
  if (!Array.isArray(rows)) {
    throw new Error("rows must be an array");
  }

  // Sanitize schema types to strictly uppercase enums
  const upperSchema: Record<string, string> = {};
  for (const [col, t] of Object.entries(schema)) {
    upperSchema[col] = (t || "TEXT").toUpperCase();
  }

  return {
    endpoint: `/workspace/databases/${databaseId}/import/commit`,
    method: "POST",
    body: {
      schema: upperSchema,
      rows,
    },
  };
}

export interface ValidationIssue {
  rowIndex: number;
  column: string;
  value: any;
  message: string;
  severity: "error" | "warning";
}

export function runValidationScan(
  rows: Record<string, any>[],
  schema: Record<string, DatabasePropertyType>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  rows.forEach((row, idx) => {
    for (const [col, propType] of Object.entries(schema)) {
      const val = row[col];
      const upperType = (propType || "TEXT").toUpperCase();

      if (upperType === "NUMBER" && val !== "" && val !== null && val !== undefined) {
        if (isNaN(Number(val))) {
          issues.push({
            rowIndex: idx + 1,
            column: col,
            value: val,
            message: `Expected number, found '${val}'`,
            severity: "warning",
          });
        }
      }

      if (upperType === "DATE" && val !== "" && val !== null && val !== undefined) {
        if (!(val instanceof Date) && isNaN(Date.parse(String(val)))) {
          issues.push({
            rowIndex: idx + 1,
            column: col,
            value: val,
            message: `Invalid date format '${val}'`,
            severity: "warning",
          });
        }
      }

      if (
        (col.toLowerCase() === "name" || col.toLowerCase() === "title") &&
        (val === "" || val === null || val === undefined)
      ) {
        issues.push({
          rowIndex: idx + 1,
          column: col,
          value: val,
          message: "Primary Name/Title is empty",
          severity: "error",
        });
      }
    }
  });

  return issues;
}

export interface FilterRule {
  column: string;
  operator: "contains" | "equals" | "starts_with" | "is_empty" | "is_not_empty" | "gt" | "lt";
  value: string;
}

export function applyFilterRules(
  rows: Record<string, any>[],
  rules: FilterRule[]
): Record<string, any>[] {
  if (rules.length === 0) return rows;

  return rows.filter((row) => {
    return rules.every((rule) => {
      const rawVal = row[rule.column];
      const strVal = rawVal !== undefined && rawVal !== null ? String(rawVal).toLowerCase() : "";
      const target = (rule.value || "").toLowerCase().trim();

      switch (rule.operator) {
        case "contains":
          return strVal.includes(target);
        case "equals":
          return strVal === target;
        case "starts_with":
          return strVal.startsWith(target);
        case "is_empty":
          return rawVal === "" || rawVal === null || rawVal === undefined;
        case "is_not_empty":
          return rawVal !== "" && rawVal !== null && rawVal !== undefined;
        case "gt":
          return Number(rawVal) > Number(rule.value);
        case "lt":
          return Number(rawVal) < Number(rule.value);
        default:
          return true;
      }
    });
  });
}

export function groupRowsForBoardView(
  rows: Record<string, any>[],
  groupColumn: string,
  predefinedColumns: string[]
): Record<string, Record<string, any>[]> {
  const groups: Record<string, Record<string, any>[]> = {};
  predefinedColumns.forEach((col) => {
    groups[col] = [];
  });

  rows.forEach((row) => {
    const rawVal = row[groupColumn];
    const matchingKey = predefinedColumns.find(
      (c) => c.toLowerCase() === String(rawVal || "").toLowerCase()
    );
    if (matchingKey) {
      groups[matchingKey].push(row);
    } else {
      if (!groups["Unassigned"]) groups["Unassigned"] = [];
      groups["Unassigned"].push(row);
    }
  });

  return groups;
}

// ── Test Suites ─────────────────────────────────────────────────────────────

test("Day 4: Spreadsheet Upload & Parser extracts structured rows correctly", () => {
  const csvContent = `Project Name,Budget,Launch Date,Priority,Completed
Alpha Redesign,50000,2026-10-01,High,true
Beta Release,12000,2026-11-15,Medium,false
Gamma Security Audit,75000,2026-12-20,High,true`;

  const rows = parseSpreadsheetBuffer(csvContent);
  assert.equal(rows.length, 3);
  assert.equal(rows[0]["Project Name"], "Alpha Redesign");
  assert.equal(rows[0]["Budget"], 50000);
  assert.equal(rows[0]["Priority"], "High");
  assert.equal(rows[1]["Project Name"], "Beta Release");
});

test("Day 4: BE-1 Import Preview Endpoint formats request payload correctly", () => {
  const sample = [
    { Name: "Item 1", Cost: 100 },
    { Name: "Item 2", Cost: 200 },
  ];
  const req = buildImportPreviewRequest("db_12345", sample);
  assert.equal(req.endpoint, "/workspace/databases/db_12345/import/preview");
  assert.equal(req.method, "POST");
  assert.deepEqual(req.body.data, sample);
});

test("Day 4: BE-1 Import Commit strictly enforces uppercase property types", () => {
  const schema = {
    Name: "text",
    Budget: "number",
    DueDate: "date",
    Status: "select",
  };
  const rows = [
    { Name: "Sprint 1", Budget: 1000, DueDate: "2026-10-01", Status: "Done" },
  ];

  const req = buildImportCommitRequest("db_999", schema, rows);
  assert.equal(req.endpoint, "/workspace/databases/db_999/import/commit");
  assert.equal(req.method, "POST");
  assert.equal(req.body.schema.Name, "TEXT");
  assert.equal(req.body.schema.Budget, "NUMBER");
  assert.equal(req.body.schema.DueDate, "DATE");
  assert.equal(req.body.schema.Status, "SELECT");
  assert.equal(req.body.rows.length, 1);
});

test("Day 4: Data Quality Validation Scanner catches number and date formatting issues", () => {
  const rows = [
    { Name: "Valid Row", Price: 100, ReleaseDate: "2026-10-01" },
    { Name: "Invalid Number", Price: "NOT_A_NUMBER", ReleaseDate: "2026-10-02" },
    { Name: "Invalid Date", Price: 250, ReleaseDate: "invalid-date-string" },
    { Name: "", Price: 300, ReleaseDate: "2026-10-05" }, // missing name
  ];

  const schema: Record<string, DatabasePropertyType> = {
    Name: "TEXT",
    Price: "NUMBER",
    ReleaseDate: "DATE",
  };

  const issues = runValidationScan(rows, schema);

  assert.equal(issues.length, 3);
  assert.equal(issues[0].rowIndex, 2);
  assert.equal(issues[0].column, "Price");
  assert.equal(issues[0].severity, "warning");

  assert.equal(issues[1].rowIndex, 3);
  assert.equal(issues[1].column, "ReleaseDate");
  assert.equal(issues[1].severity, "warning");

  assert.equal(issues[2].rowIndex, 4);
  assert.equal(issues[2].column, "Name");
  assert.equal(issues[2].severity, "error");
});

test("Day 4: Multi-Rule Database Filter evaluates multiple compound criteria", () => {
  const records = [
    { Name: "Task Alpha", Priority: "High", Hours: 20 },
    { Name: "Task Beta", Priority: "Low", Hours: 5 },
    { Name: "Task Gamma", Priority: "High", Hours: 45 },
    { Name: "Meeting Delta", Priority: "Medium", Hours: 2 },
  ];

  // Filter 1: Name contains "Task" AND Priority equals "High"
  const rules1: FilterRule[] = [
    { column: "Name", operator: "contains", value: "task" },
    { column: "Priority", operator: "equals", value: "high" },
  ];
  const filtered1 = applyFilterRules(records, rules1);
  assert.equal(filtered1.length, 2);
  assert.equal(filtered1[0].Name, "Task Alpha");
  assert.equal(filtered1[1].Name, "Task Gamma");

  // Filter 2: Numeric filter: Hours > 10
  const rules2: FilterRule[] = [
    { column: "Hours", operator: "gt", value: "10" },
  ];
  const filtered2 = applyFilterRules(records, rules2);
  assert.equal(filtered2.length, 2);
  assert.equal(filtered2[0].Name, "Task Alpha");
  assert.equal(filtered2[1].Name, "Task Gamma");
});

test("Day 4: Board (Kanban) View groups database rows by select/status property", () => {
  const rows = [
    { id: "1", Title: "Setup Pipeline", Status: "Done" },
    { id: "2", Title: "Add Authentication", Status: "In Progress" },
    { id: "3", Title: "Write Tests", Status: "To Do" },
    { id: "4", Title: "Release v1.0", Status: "To Do" },
    { id: "5", Title: "Floating Bug" }, // no status -> Unassigned
  ];

  const columns = ["To Do", "In Progress", "Done", "Unassigned"];
  const grouped = groupRowsForBoardView(rows, "Status", columns);

  assert.equal(grouped["To Do"].length, 2);
  assert.equal(grouped["In Progress"].length, 1);
  assert.equal(grouped["Done"].length, 1);
  assert.equal(grouped["Unassigned"].length, 1);
  assert.equal(grouped["Unassigned"][0].Title, "Floating Bug");
});
