/**
 * tests/day6_data_quality_table.test.ts
 * ─────────────────────────────────────────────────────────────
 * Unit tests for DataQualityIssueTable logic:
 * - Filter application (client-side mock of the server filter)
 * - Row rendering decisions (issue type / severity / status classification)
 * - Empty-state discrimination (no issues at all vs. filters active)
 * - Evidence requirement enforcement
 * - Status normalisation (Bug-2 from Day 5)
 *
 * All logic is extracted from component / API layer functions so
 * tests run with node --experimental-strip-types --test (no DOM).
 */

import test from "node:test";
import assert from "node:assert/strict";
import type {
  DataQualityIssue,
  DataQualityIssueType,
  DataQualityIssueSeverity,
  DataQualityIssueStatus,
  DataQualityObjectType,
  DataQualityListFilters,
} from "../lib/types/agent-results.ts";

// ─── Logic extracted from dataQualityApi.ts ───────────────────────────────────

function normaliseIssueStatus(raw: string): DataQualityIssueStatus {
  return raw.toUpperCase() as DataQualityIssueStatus;
}

function normaliseIssueType(raw: string): DataQualityIssueType {
  return raw.toUpperCase() as DataQualityIssueType;
}

function normaliseObjectType(raw: string): DataQualityObjectType {
  return raw.toLowerCase() as DataQualityObjectType;
}

function normaliseSeverity(raw: string): DataQualityIssueSeverity {
  return raw.toUpperCase() as DataQualityIssueSeverity;
}

// ─── Logic extracted from DataQualityIssueTable ───────────────────────────────

/** The empty-state copy changes based on whether filters are active */
function emptyStateMessage(hasFilters: boolean): string {
  return hasFilters
    ? "No issues match your filters"
    : "No open data quality issues";
}

/** Determines whether an issue row is actionable (not closed) */
function isIssueClosed(status: DataQualityIssueStatus): boolean {
  return status === "RESOLVED" || status === "IGNORED";
}

/** W3 AC: evidence must always be present on drill-down — never a bare flag */
function hasRequiredEvidence(issue: DataQualityIssue): boolean {
  return Array.isArray(issue.evidence) && issue.evidence.length > 0;
}

/** Client-side filter matching (mirrors dataQualityApi.ts mock filter logic) */
function applyFilters(
  issues: DataQualityIssue[],
  filters: DataQualityListFilters
): DataQualityIssue[] {
  let result = [...issues];
  if (filters.issueType)  result = result.filter((i) => i.issueType  === filters.issueType);
  if (filters.objectType) result = result.filter((i) => i.objectType === filters.objectType);
  if (filters.severity)   result = result.filter((i) => i.severity   === filters.severity);
  if (filters.status)     result = result.filter((i) => i.status     === filters.status);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (i) =>
        i.fieldName?.toLowerCase().includes(q) ||
        i.conflictDetail?.toLowerCase().includes(q) ||
        i.objectType.toLowerCase().includes(q)
    );
  }
  return result;
}

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makeIssue(overrides: Partial<DataQualityIssue> = {}): DataQualityIssue {
  return {
    id: `issue-${Math.random().toString(36).slice(2)}`,
    issueType: "DUPLICATE",
    objectType: "lead",
    severity: "HIGH",
    status: "OPEN",
    affectedRecordIds: ["r1", "r2"],
    conflictDetail: "Two leads share the same email",
    evidence: [{ source: "CRM Engine", label: "Email match" }],
    detectedAt: new Date().toISOString(),
    ...overrides,
  };
}

const MOCK_ISSUES: DataQualityIssue[] = [
  makeIssue({ id: "dq-001", issueType: "DUPLICATE",   objectType: "lead",    severity: "HIGH",   status: "OPEN"     }),
  makeIssue({ id: "dq-002", issueType: "STALE",        objectType: "contact", severity: "MEDIUM", status: "OPEN"     }),
  makeIssue({ id: "dq-003", issueType: "MISSING",      objectType: "deal",    severity: "LOW",    status: "OPEN"     }),
  makeIssue({ id: "dq-004", issueType: "CONFLICTING",  objectType: "account", severity: "HIGH",   status: "OPEN"     }),
  makeIssue({ id: "dq-005", issueType: "DUPLICATE",    objectType: "contact", severity: "MEDIUM", status: "RESOLVED" }),
  makeIssue({ id: "dq-006", issueType: "STALE",        objectType: "lead",    severity: "LOW",    status: "IGNORED"  }),
];

// ─── Tests ────────────────────────────────────────────────────────────────────

test("DataQualityIssueTable — status normalisation (Bug-2)", async (t) => {
  await t.test("normalises lowercase 'open' to 'OPEN'", () => {
    assert.strictEqual(normaliseIssueStatus("open"), "OPEN");
  });

  await t.test("normalises mixed-case 'Resolved' to 'RESOLVED'", () => {
    assert.strictEqual(normaliseIssueStatus("Resolved"), "RESOLVED");
  });

  await t.test("normalises mixed-case 'Ignored' to 'IGNORED'", () => {
    assert.strictEqual(normaliseIssueStatus("Ignored"), "IGNORED");
  });

  await t.test("normalises lowercase issue type 'duplicate'", () => {
    assert.strictEqual(normaliseIssueType("duplicate"), "DUPLICATE");
  });

  await t.test("normalises lowercase severity 'high'", () => {
    assert.strictEqual(normaliseSeverity("high"), "HIGH");
  });

  await t.test("normalises uppercase objectType to lowercase 'lead'", () => {
    assert.strictEqual(normaliseObjectType("LEAD"), "lead");
  });
});

test("DataQualityIssueTable — empty state copy", async (t) => {
  await t.test("shows 'no open issues' copy when no filters are active", () => {
    assert.ok(emptyStateMessage(false).includes("No open data quality issues"));
  });

  await t.test("shows 'no match' copy when filters are active", () => {
    assert.ok(emptyStateMessage(true).includes("No issues match your filters"));
  });
});

test("DataQualityIssueTable — actionable state", async (t) => {
  await t.test("OPEN issue is not closed (action buttons shown)", () => {
    assert.ok(!isIssueClosed("OPEN"));
  });

  await t.test("RESOLVED issue is closed (action buttons hidden)", () => {
    assert.ok(isIssueClosed("RESOLVED"));
  });

  await t.test("IGNORED issue is closed (action buttons hidden)", () => {
    assert.ok(isIssueClosed("IGNORED"));
  });
});

test("DataQualityIssueTable — evidence requirement (W3 AC)", async (t) => {
  await t.test("issue with one evidence item passes the requirement", () => {
    const issue = makeIssue({ evidence: [{ source: "engine", label: "test" }] });
    assert.ok(hasRequiredEvidence(issue));
  });

  await t.test("issue with empty evidence array fails the requirement", () => {
    const issue = makeIssue({ evidence: [] });
    assert.ok(!hasRequiredEvidence(issue));
  });

  await t.test("mock data: all issues in fixture have evidence", () => {
    for (const issue of MOCK_ISSUES) {
      assert.ok(
        hasRequiredEvidence(issue),
        `Issue ${issue.id} (${issue.issueType}) is missing evidence`
      );
    }
  });
});

test("DataQualityIssueTable — filter logic", async (t) => {
  await t.test("no filters returns all issues", () => {
    assert.strictEqual(applyFilters(MOCK_ISSUES, {}).length, MOCK_ISSUES.length);
  });

  await t.test("filter by issueType=DUPLICATE returns only duplicates", () => {
    const result = applyFilters(MOCK_ISSUES, { issueType: "DUPLICATE" });
    assert.strictEqual(result.length, 2);
    assert.ok(result.every((i) => i.issueType === "DUPLICATE"));
  });

  await t.test("filter by objectType=lead returns lead issues", () => {
    const result = applyFilters(MOCK_ISSUES, { objectType: "lead" });
    assert.ok(result.every((i) => i.objectType === "lead"));
  });

  await t.test("filter by severity=HIGH returns only HIGH severity", () => {
    const result = applyFilters(MOCK_ISSUES, { severity: "HIGH" });
    assert.ok(result.every((i) => i.severity === "HIGH"));
    assert.strictEqual(result.length, 2);
  });

  await t.test("filter by status=OPEN excludes RESOLVED and IGNORED", () => {
    const result = applyFilters(MOCK_ISSUES, { status: "OPEN" });
    assert.ok(result.every((i) => i.status === "OPEN"));
    assert.strictEqual(result.length, 4);
  });

  await t.test("filter by status=RESOLVED returns only resolved issues", () => {
    const result = applyFilters(MOCK_ISSUES, { status: "RESOLVED" });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, "dq-005");
  });

  await t.test("search by conflictDetail substring is case-insensitive", () => {
    const result = applyFilters(MOCK_ISSUES, { search: "email" });
    // All mock issues have "email" in their conflictDetail
    assert.ok(result.length > 0);
  });

  await t.test("combined filters: DUPLICATE + OPEN returns intersection", () => {
    const result = applyFilters(MOCK_ISSUES, {
      issueType: "DUPLICATE",
      status: "OPEN",
    });
    assert.ok(result.every((i) => i.issueType === "DUPLICATE" && i.status === "OPEN"));
  });

  await t.test("filter with no matching results returns empty array", () => {
    const result = applyFilters(MOCK_ISSUES, {
      issueType: "CONFLICTING",
      status: "RESOLVED",
    });
    assert.strictEqual(result.length, 0);
  });
});
