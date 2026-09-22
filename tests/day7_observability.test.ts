/**
 * tests/day7_observability.test.ts
 * ─────────────────────────────────────────────────────────────
 * Unit tests for ObservabilityMetricCard and AuditLogTable logic.
 *
 * Tests:
 * - MetricCard variant classification rules
 * - DeltaIndicator direction logic (higher=good vs higher=bad)
 * - Audit event normalisation (Bug-2: category/outcome uppercasing)
 * - Evidence requirement enforcement on EXECUTION/SECURITY events
 * - Audit filter application (category, outcome, search)
 * - AuditLogTable cost/latency formatting
 * - Audit event cross-link derivation (executionId, approvalId)
 */

import test from "node:test";
import assert from "node:assert/strict";
import type {
  AuditEvent,
  AuditEventCategory,
  AuditEventOutcome,
  AuditEventFilters,
  AgentObservabilityMetrics,
  MetricDataPoint,
} from "../lib/types/day7.ts";

// ─── Logic extracted from ObservabilityMetricCard.tsx ────────────────────────

type MetricVariant = "success" | "danger" | "cost" | "latency" | "neutral";

/**
 * DeltaIndicator direction:
 * - success variant: positive delta vs threshold is good
 * - danger/cost/latency: negative delta (below threshold) is good
 */
function isDeltaGood(
  value: number,
  threshold: number,
  variant: MetricVariant
): boolean {
  const delta = value - threshold;
  if (variant === "danger" || variant === "cost" || variant === "latency") {
    return delta <= 0;
  }
  return delta >= 0;
}

/** Format latency for display (ms vs s) */
function formatLatency(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/** Format cost for display */
function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

// ─── Logic extracted from observabilityApi.ts ─────────────────────────────────

function normaliseCategory(raw: string): AuditEventCategory {
  return raw.toUpperCase() as AuditEventCategory;
}

function normaliseOutcome(raw: string): AuditEventOutcome {
  return raw.toUpperCase() as AuditEventOutcome;
}

function normaliseEvent(raw: AuditEvent): AuditEvent {
  return {
    ...raw,
    category: normaliseCategory(raw.category as string),
    outcome:  normaliseOutcome(raw.outcome as string),
  };
}

/** Evidence requirement: EXECUTION and SECURITY events must have evidenceSnippet */
function requiresEvidence(category: AuditEventCategory): boolean {
  return category === "EXECUTION" || category === "SECURITY";
}

function hasRequiredEvidence(event: AuditEvent): boolean {
  if (!requiresEvidence(event.category)) return true;
  return !!event.evidenceSnippet;
}

/** Client-side filter matching for audit events */
function applyAuditFilters(
  events: AuditEvent[],
  filters: AuditEventFilters
): AuditEvent[] {
  let result = [...events];
  if (filters.category)
    result = result.filter(
      (e) => e.category === filters.category!.toUpperCase()
    );
  if (filters.outcome)
    result = result.filter(
      (e) => e.outcome === filters.outcome!.toUpperCase()
    );
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.agentName?.toLowerCase().includes(q) ||
        e.initiatedBy?.toLowerCase().includes(q)
    );
  }
  return result;
}

/** Derive whether an event row should show the Execution Ledger link */
function hasExecutionLink(event: AuditEvent): boolean {
  return !!event.executionId;
}

/** Derive whether an event row should show the Approval Queue link */
function hasApprovalLink(event: AuditEvent): boolean {
  return !!event.approvalId;
}

// ─── Logic extracted from AgentVersionCard / versions page ────────────────────

type VersionState = "PRODUCTION" | "STAGING" | "DRAFT" | "RETIRED" | "FAILED";

const STATE_ORDER: Record<VersionState, number> = {
  PRODUCTION: 0,
  STAGING:    1,
  DRAFT:      2,
  RETIRED:    3,
  FAILED:     4,
};

function sortVersionsByState<T extends { state: VersionState; createdAt: string }>(
  versions: T[]
): T[] {
  return [...versions].sort(
    (a, b) =>
      (STATE_ORDER[a.state] ?? 99) - (STATE_ORDER[b.state] ?? 99) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2)}`,
    agentId: "test-agent",
    agentName: "Test Agent",
    category: "EXECUTION",
    description: "Test execution completed.",
    outcome: "SUCCESS",
    occurredAt: new Date().toISOString(),
    evidenceSnippet: "Evidence: all claims verified.",
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("ObservabilityMetricCard — delta direction logic", async (t) => {
  await t.test("success variant: value above threshold is good", () => {
    assert.ok(isDeltaGood(85, 70, "success")); // acceptance rate 85% vs 70% threshold
  });

  await t.test("success variant: value below threshold is bad", () => {
    assert.ok(!isDeltaGood(60, 70, "success")); // acceptance rate 60% vs 70% threshold
  });

  await t.test("success variant: value equal to threshold is good (exact pass)", () => {
    assert.ok(isDeltaGood(70, 70, "success"));
  });

  await t.test("danger variant: value below threshold is good (fewer hallucinations)", () => {
    assert.ok(isDeltaGood(2, 5, "danger")); // 2 hallucinations vs 5 threshold = good
  });

  await t.test("danger variant: value above threshold is bad", () => {
    assert.ok(!isDeltaGood(8, 5, "danger")); // 8 hallucinations vs 5 threshold = bad
  });

  await t.test("cost variant: value below threshold is good (cheaper)", () => {
    assert.ok(isDeltaGood(0.04, 0.10, "cost")); // $0.04 vs $0.10 limit = good
  });

  await t.test("cost variant: value above threshold is bad (over budget)", () => {
    assert.ok(!isDeltaGood(0.15, 0.10, "cost")); // $0.15 vs $0.10 limit = bad
  });

  await t.test("latency variant: value below threshold is good (faster)", () => {
    assert.ok(isDeltaGood(1200, 4000, "latency")); // 1.2s vs 4s limit = good
  });

  await t.test("latency variant: value above threshold is bad (too slow)", () => {
    assert.ok(!isDeltaGood(5000, 4000, "latency")); // 5s vs 4s limit = bad
  });
});

test("ObservabilityMetricCard — display formatting", async (t) => {
  await t.test("formatLatency: under 1000ms shows ms", () => {
    assert.strictEqual(formatLatency(820), "820ms");
  });

  await t.test("formatLatency: 1000ms shows 1.0s", () => {
    assert.strictEqual(formatLatency(1000), "1.0s");
  });

  await t.test("formatLatency: 3100ms shows 3.1s", () => {
    assert.strictEqual(formatLatency(3100), "3.1s");
  });

  await t.test("formatCost: 4 decimal places", () => {
    assert.strictEqual(formatCost(0.041), "$0.0410");
  });

  await t.test("formatCost: sub-cent precision", () => {
    assert.strictEqual(formatCost(0.0043), "$0.0043");
  });
});

test("AuditLogTable — event normalisation (Bug-2)", async (t) => {
  await t.test("lowercase category 'execution' → 'EXECUTION'", () => {
    assert.strictEqual(normaliseCategory("execution"), "EXECUTION");
  });

  await t.test("mixed case 'Security' → 'SECURITY'", () => {
    assert.strictEqual(normaliseCategory("Security"), "SECURITY");
  });

  await t.test("lowercase outcome 'success' → 'SUCCESS'", () => {
    assert.strictEqual(normaliseOutcome("success"), "SUCCESS");
  });

  await t.test("normaliseEvent uppercases both category and outcome", () => {
    const raw = makeEvent({ category: "approval" as any, outcome: "approved" as any });
    const norm = normaliseEvent(raw);
    assert.strictEqual(norm.category, "APPROVAL");
    assert.strictEqual(norm.outcome, "APPROVED");
  });
});

test("AuditLogTable — evidence requirement enforcement", async (t) => {
  await t.test("EXECUTION event WITH evidenceSnippet passes requirement", () => {
    const evt = makeEvent({ category: "EXECUTION", evidenceSnippet: "Score derived from..." });
    assert.ok(hasRequiredEvidence(evt));
  });

  await t.test("EXECUTION event WITHOUT evidenceSnippet fails requirement", () => {
    const evt = makeEvent({ category: "EXECUTION", evidenceSnippet: undefined });
    assert.ok(!hasRequiredEvidence(evt));
  });

  await t.test("SECURITY event WITHOUT evidenceSnippet fails requirement", () => {
    const evt = makeEvent({ category: "SECURITY", evidenceSnippet: undefined });
    assert.ok(!hasRequiredEvidence(evt));
  });

  await t.test("CONFIG_CHANGE event without evidenceSnippet passes (not required)", () => {
    const evt = makeEvent({ category: "CONFIG_CHANGE", evidenceSnippet: undefined });
    assert.ok(hasRequiredEvidence(evt));
  });

  await t.test("PROMOTION event without evidenceSnippet passes (not required)", () => {
    const evt = makeEvent({ category: "PROMOTION", evidenceSnippet: undefined });
    assert.ok(hasRequiredEvidence(evt));
  });
});

test("AuditLogTable — filter logic", async (t) => {
  const events: AuditEvent[] = [
    makeEvent({ id: "1", category: "EXECUTION", outcome: "SUCCESS",  agentId: "lqa", agentName: "Lead Qual", description: "Qualified lead" }),
    makeEvent({ id: "2", category: "SECURITY",  outcome: "REJECTED", agentId: "sup", agentName: "Support",  description: "Injection blocked" }),
    makeEvent({ id: "3", category: "APPROVAL",  outcome: "APPROVED", agentId: "lqa", agentName: "Lead Qual", description: "Action approved" }),
    makeEvent({ id: "4", category: "EXECUTION", outcome: "FAILURE",  agentId: "ra",  agentName: "Research",  description: "Grounding failure" }),
  ];

  await t.test("no filters returns all events", () => {
    assert.strictEqual(applyAuditFilters(events, {}).length, 4);
  });

  await t.test("filter by category=EXECUTION returns only execution events", () => {
    const result = applyAuditFilters(events, { category: "EXECUTION" });
    assert.strictEqual(result.length, 2);
    assert.ok(result.every((e) => e.category === "EXECUTION"));
  });

  await t.test("filter by outcome=SUCCESS returns only successful events", () => {
    const result = applyAuditFilters(events, { outcome: "SUCCESS" });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, "1");
  });

  await t.test("filter by search matches agentName case-insensitively", () => {
    const result = applyAuditFilters(events, { search: "lead" });
    assert.ok(result.every((e) => e.agentName?.toLowerCase().includes("lead")));
    assert.strictEqual(result.length, 2);
  });

  await t.test("filter by search matches description", () => {
    const result = applyAuditFilters(events, { search: "grounding" });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, "4");
  });

  await t.test("combined category + outcome filter returns intersection", () => {
    const result = applyAuditFilters(events, {
      category: "EXECUTION",
      outcome: "FAILURE",
    });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, "4");
  });

  await t.test("filter with no matching events returns empty array", () => {
    const result = applyAuditFilters(events, { category: "PROMOTION" });
    assert.strictEqual(result.length, 0);
  });
});

test("AuditLogTable — cross-link derivation", async (t) => {
  await t.test("event with executionId has execution link", () => {
    const evt = makeEvent({ executionId: "exec-001" });
    assert.ok(hasExecutionLink(evt));
  });

  await t.test("event without executionId has no execution link", () => {
    const evt = makeEvent({ executionId: undefined });
    assert.ok(!hasExecutionLink(evt));
  });

  await t.test("event with approvalId has approval link", () => {
    const evt = makeEvent({ approvalId: "approval-001" });
    assert.ok(hasApprovalLink(evt));
  });

  await t.test("event without approvalId has no approval link", () => {
    const evt = makeEvent({ approvalId: undefined });
    assert.ok(!hasApprovalLink(evt));
  });
});

test("AgentVersionsPage — version sort order", async (t) => {
  const unsorted = [
    { id: "4", state: "RETIRED"    as VersionState, createdAt: "2026-01-01" },
    { id: "1", state: "PRODUCTION" as VersionState, createdAt: "2026-01-03" },
    { id: "3", state: "DRAFT"      as VersionState, createdAt: "2026-01-02" },
    { id: "2", state: "STAGING"    as VersionState, createdAt: "2026-01-04" },
    { id: "5", state: "FAILED"     as VersionState, createdAt: "2026-01-01" },
  ];

  await t.test("PRODUCTION comes first", () => {
    const sorted = sortVersionsByState(unsorted);
    assert.strictEqual(sorted[0].state, "PRODUCTION");
  });

  await t.test("STAGING comes second", () => {
    const sorted = sortVersionsByState(unsorted);
    assert.strictEqual(sorted[1].state, "STAGING");
  });

  await t.test("DRAFT comes third", () => {
    const sorted = sortVersionsByState(unsorted);
    assert.strictEqual(sorted[2].state, "DRAFT");
  });

  await t.test("RETIRED comes fourth", () => {
    const sorted = sortVersionsByState(unsorted);
    assert.strictEqual(sorted[3].state, "RETIRED");
  });

  await t.test("FAILED comes last", () => {
    const sorted = sortVersionsByState(unsorted);
    assert.strictEqual(sorted[4].state, "FAILED");
  });

  await t.test("already sorted array is unchanged", () => {
    const preSorted = [
      { id: "a", state: "PRODUCTION" as VersionState, createdAt: "2026-01-01" },
      { id: "b", state: "STAGING"    as VersionState, createdAt: "2026-01-01" },
    ];
    const result = sortVersionsByState(preSorted);
    assert.strictEqual(result[0].state, "PRODUCTION");
    assert.strictEqual(result[1].state, "STAGING");
  });
});
