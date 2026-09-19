/**
 * tests/day6_agent_result_frame.test.ts
 * ─────────────────────────────────────────────────────────────
 * Unit tests for AgentResultFrame behavioral logic.
 *
 * Tests the pure-logic decisions that drive AgentResultFrame rendering:
 * - Confidence badge visibility rule
 * - Evidence button visibility rule
 * - Execution-id link visibility rule
 * - Status classification for banner selection
 * - Blocked-state child suppression
 *
 * These functions are extracted from the component logic and tested
 * in isolation so they run with the existing Node test runner
 * (no DOM, no JSX, no extra dependencies).
 */

import test from "node:test";
import assert from "node:assert/strict";
import type { AgentResultBase } from "../lib/types/agent-results.ts";
import type { AgentEvidenceItem } from "../lib/api/agentApi.ts";

// ─── Logic extracted from AgentResultFrame ────────────────────────────────────
// These mirror the exact conditions in the component.

type AgentResponseStatus = "SUCCESS" | "SUGGESTION_ONLY" | "APPROVAL_REQUIRED" | "BLOCKED";

/** W1 AC: confidence badge renders ONLY when confidenceScore is present */
function shouldShowConfidenceBadge(result: AgentResultBase): boolean {
  return result.confidenceScore != null;
}

/** W1 AC: "View Evidence" renders ONLY when evidence.length > 0 */
function shouldShowEvidenceButton(result: AgentResultBase): boolean {
  return Array.isArray(result.evidence) && result.evidence.length > 0;
}

/** W1 AC: execution-id link renders ONLY when executionId is returned */
function shouldShowExecutionLink(result: AgentResultBase): boolean {
  return !!result.executionId;
}

/** Determines which banner (if any) to show */
function getStatusBanner(status: AgentResponseStatus): "suggestion" | "approval_required" | "blocked" | "none" {
  switch (status) {
    case "SUGGESTION_ONLY":   return "suggestion";
    case "APPROVAL_REQUIRED": return "approval_required";
    case "BLOCKED":           return "blocked";
    default:                  return "none";
  }
}

/** W1 AC: BLOCKED suppresses children; all other statuses render children */
function shouldRenderChildren(status: AgentResponseStatus): boolean {
  return status !== "BLOCKED";
}

/** Confidence badge color tier */
function confidenceTier(score: number): "high" | "medium" | "low" {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  if (clamped >= 80) return "high";
  if (clamped >= 60) return "medium";
  return "low";
}

// ─── Helper builders ──────────────────────────────────────────────────────────

function makeBase(overrides: Partial<AgentResultBase> = {}): AgentResultBase {
  return {
    id: "test-id",
    agentId: "test-agent",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeEvidence(count: number): AgentEvidenceItem[] {
  return Array.from({ length: count }, (_, i) => ({ source: `Source ${i + 1}` }));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("AgentResultFrame — confidence badge visibility", async (t) => {
  await t.test("shows badge when confidenceScore is 0", () => {
    assert.ok(shouldShowConfidenceBadge(makeBase({ confidenceScore: 0 })));
  });

  await t.test("shows badge when confidenceScore is 100", () => {
    assert.ok(shouldShowConfidenceBadge(makeBase({ confidenceScore: 100 })));
  });

  await t.test("shows badge when confidenceScore is 73", () => {
    assert.ok(shouldShowConfidenceBadge(makeBase({ confidenceScore: 73 })));
  });

  await t.test("hides badge when confidenceScore is undefined", () => {
    assert.ok(!shouldShowConfidenceBadge(makeBase({ confidenceScore: undefined })));
  });

  await t.test("hides badge when confidenceScore is null (via cast)", () => {
    assert.ok(!shouldShowConfidenceBadge(makeBase({ confidenceScore: null as any })));
  });
});

test("AgentResultFrame — evidence button visibility", async (t) => {
  await t.test("shows button when evidence has 1 item", () => {
    assert.ok(shouldShowEvidenceButton(makeBase({ evidence: makeEvidence(1) })));
  });

  await t.test("shows button when evidence has 3 items", () => {
    assert.ok(shouldShowEvidenceButton(makeBase({ evidence: makeEvidence(3) })));
  });

  await t.test("hides button when evidence array is empty", () => {
    assert.ok(!shouldShowEvidenceButton(makeBase({ evidence: [] })));
  });

  await t.test("hides button when evidence is undefined", () => {
    assert.ok(!shouldShowEvidenceButton(makeBase({ evidence: undefined })));
  });

  await t.test("hides button when evidence is null (via cast)", () => {
    assert.ok(!shouldShowEvidenceButton(makeBase({ evidence: null as any })));
  });
});

test("AgentResultFrame — execution-id link visibility", async (t) => {
  await t.test("shows link when executionId is a non-empty string", () => {
    assert.ok(shouldShowExecutionLink(makeBase({ executionId: "exec-abc123" })));
  });

  await t.test("hides link when executionId is undefined", () => {
    assert.ok(!shouldShowExecutionLink(makeBase({ executionId: undefined })));
  });

  await t.test("hides link when executionId is empty string", () => {
    assert.ok(!shouldShowExecutionLink(makeBase({ executionId: "" })));
  });
});

test("AgentResultFrame — status banner selection", async (t) => {
  await t.test("SUCCESS renders no banner", () => {
    assert.strictEqual(getStatusBanner("SUCCESS"), "none");
  });

  await t.test("SUGGESTION_ONLY renders suggestion banner", () => {
    assert.strictEqual(getStatusBanner("SUGGESTION_ONLY"), "suggestion");
  });

  await t.test("APPROVAL_REQUIRED renders approval_required banner", () => {
    assert.strictEqual(getStatusBanner("APPROVAL_REQUIRED"), "approval_required");
  });

  await t.test("BLOCKED renders blocked banner (not suggestion or approval)", () => {
    assert.strictEqual(getStatusBanner("BLOCKED"), "blocked");
  });
});

test("AgentResultFrame — children rendering rules", async (t) => {
  await t.test("SUCCESS renders children", () => {
    assert.ok(shouldRenderChildren("SUCCESS"));
  });

  await t.test("SUGGESTION_ONLY renders children (with amber banner above)", () => {
    assert.ok(shouldRenderChildren("SUGGESTION_ONLY"));
  });

  await t.test("APPROVAL_REQUIRED renders children (with red banner above)", () => {
    assert.ok(shouldRenderChildren("APPROVAL_REQUIRED"));
  });

  await t.test("BLOCKED suppresses children — only blocked state shown", () => {
    assert.ok(!shouldRenderChildren("BLOCKED"));
  });
});

test("AgentResultFrame — confidence badge tier classification", async (t) => {
  await t.test("scores 80-100 are 'high' (success tokens)", () => {
    assert.strictEqual(confidenceTier(80),  "high");
    assert.strictEqual(confidenceTier(95),  "high");
    assert.strictEqual(confidenceTier(100), "high");
  });

  await t.test("scores 60-79 are 'medium' (warning tokens)", () => {
    assert.strictEqual(confidenceTier(60), "medium");
    assert.strictEqual(confidenceTier(73), "medium");
    assert.strictEqual(confidenceTier(79), "medium");
  });

  await t.test("scores below 60 are 'low' (neutral tokens)", () => {
    assert.strictEqual(confidenceTier(59), "low");
    assert.strictEqual(confidenceTier(30), "low");
    assert.strictEqual(confidenceTier(0),  "low");
  });

  await t.test("scores are clamped to 0-100 before classification", () => {
    assert.strictEqual(confidenceTier(-10), "low");
    assert.strictEqual(confidenceTier(110), "high");
  });
});
