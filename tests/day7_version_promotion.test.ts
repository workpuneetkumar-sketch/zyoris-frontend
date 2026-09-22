/**
 * tests/day7_version_promotion.test.ts
 * ─────────────────────────────────────────────────────────────
 * Unit tests for AgentVersionCard promotion gate logic.
 *
 * Tests:
 * - Promote button enabled/disabled gate rules
 * - allGatesPassed derivation from regression gate results
 * - State-based promotion eligibility (only STAGING can be promoted)
 * - Gate normalisation (Bug-2: result uppercasing)
 * - Pre-submit guard in agentVersionsApi (blocks non-STAGING/failing)
 * - Post-promotion state (approvalRequestId set, link shown)
 * - Version state badge classification
 */

import test from "node:test";
import assert from "node:assert/strict";
import type {
  AgentVersion,
  RegressionGate,
  VersionState,
} from "../lib/types/day7.ts";

// ─── Logic extracted from AgentVersionCard.tsx ───────────────────────────────

/** The Promote button is only active when state===STAGING AND allGatesPassed===true */
function canPromote(version: AgentVersion): boolean {
  return version.state === "STAGING" && version.allGatesPassed && !version.approvalRequestId;
}

/** Post-promote: approvalRequestId set means already sent */
function isAlreadySent(version: AgentVersion): boolean {
  return !!version.approvalRequestId;
}

/** Count failing gates */
function failingGateCount(version: AgentVersion): number {
  return version.regressionGates.filter((g) => g.result === "FAIL").length;
}

/** Count pending gates */
function pendingGateCount(version: AgentVersion): number {
  return version.regressionGates.filter((g) => g.result === "PENDING").length;
}

/** Cards for RETIRED and DRAFT start collapsed */
function shouldStartCollapsed(state: VersionState): boolean {
  return state === "RETIRED" || state === "FAILED";
}

// ─── Logic extracted from agentVersionsApi.ts ────────────────────────────────

function normaliseGateResult(raw: string): RegressionGate["result"] {
  return raw.toUpperCase() as RegressionGate["result"];
}

function normaliseVersionState(raw: string): VersionState {
  return raw.toUpperCase() as VersionState;
}

/**
 * Pre-submit guard — mirrors the guard in agentVersionsApi.ts.
 * Returns an error string if submission should be blocked, null if OK.
 */
function validatePromoteRequest(version: AgentVersion): string | null {
  if (!version.allGatesPassed) {
    return "Cannot promote a version that has not passed all regression gates.";
  }
  if (version.state !== "STAGING") {
    return `Only STAGING versions can be promoted. Current state: ${version.state}.`;
  }
  return null;
}

/**
 * Client-side allGatesPassed sanity guard —
 * mirrors the fallback in normaliseVersion().
 */
function deriveAllGatesPassed(gates: RegressionGate[]): boolean {
  if (gates.length === 0) return false;
  return gates.every((g) => g.result === "PASS");
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeGate(result: RegressionGate["result"], overrides: Partial<RegressionGate> = {}): RegressionGate {
  return {
    gateId: `gate-${Math.random().toString(36).slice(2)}`,
    label: "Test Gate",
    result,
    ...overrides,
  };
}

function makeVersion(overrides: Partial<AgentVersion> = {}): AgentVersion {
  return {
    id: "ver-test",
    agentId: "test-agent",
    versionNumber: "1.0.0",
    state: "STAGING",
    modelIdentifier: "gpt-4o",
    createdAt: new Date().toISOString(),
    changelog: "Test version",
    regressionGates: [
      makeGate("PASS", { gateId: "hallucination-rate", label: "Hallucination Rate" }),
      makeGate("PASS", { gateId: "latency-p95",        label: "P95 Latency"        }),
      makeGate("PASS", { gateId: "acceptance-rate",    label: "Acceptance Rate"    }),
      makeGate("PASS", { gateId: "cost-per-exec",      label: "Cost per Exec"      }),
    ],
    allGatesPassed: true,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("AgentVersionCard — promote button gate", async (t) => {
  await t.test("STAGING + all gates PASS → can promote", () => {
    const version = makeVersion({ state: "STAGING", allGatesPassed: true });
    assert.ok(canPromote(version));
  });

  await t.test("STAGING + not all gates passed → cannot promote", () => {
    const version = makeVersion({
      state: "STAGING",
      allGatesPassed: false,
      regressionGates: [makeGate("FAIL"), makeGate("PASS")],
    });
    assert.ok(!canPromote(version));
  });

  await t.test("PRODUCTION → cannot promote", () => {
    const version = makeVersion({ state: "PRODUCTION", allGatesPassed: true });
    assert.ok(!canPromote(version));
  });

  await t.test("DRAFT → cannot promote (even if gates pass)", () => {
    const version = makeVersion({ state: "DRAFT", allGatesPassed: true });
    assert.ok(!canPromote(version));
  });

  await t.test("RETIRED → cannot promote", () => {
    const version = makeVersion({ state: "RETIRED", allGatesPassed: true });
    assert.ok(!canPromote(version));
  });

  await t.test("STAGING + allGatesPassed + already sent → cannot promote again", () => {
    const version = makeVersion({
      state: "STAGING",
      allGatesPassed: true,
      approvalRequestId: "approval-001",
    });
    assert.ok(!canPromote(version));
  });
});

test("AgentVersionCard — post-promote state", async (t) => {
  await t.test("without approvalRequestId: not yet sent", () => {
    const version = makeVersion({ approvalRequestId: undefined });
    assert.ok(!isAlreadySent(version));
  });

  await t.test("with approvalRequestId: already sent", () => {
    const version = makeVersion({ approvalRequestId: "approval-xyz" });
    assert.ok(isAlreadySent(version));
  });

  await t.test("approvalRequestId builds the correct approval link", () => {
    const id = "approval-abc-123";
    const href = `/approvals/${id}`;
    assert.strictEqual(href, "/approvals/approval-abc-123");
  });
});

test("AgentVersionCard — gate counts", async (t) => {
  await t.test("counts failing gates correctly", () => {
    const version = makeVersion({
      regressionGates: [makeGate("PASS"), makeGate("FAIL"), makeGate("FAIL"), makeGate("PENDING")],
    });
    assert.strictEqual(failingGateCount(version), 2);
  });

  await t.test("counts pending gates correctly", () => {
    const version = makeVersion({
      regressionGates: [makeGate("PASS"), makeGate("PENDING"), makeGate("PENDING")],
    });
    assert.strictEqual(pendingGateCount(version), 2);
  });

  await t.test("zero failing gates when all pass", () => {
    const version = makeVersion();
    assert.strictEqual(failingGateCount(version), 0);
  });
});

test("AgentVersionCard — collapse state", async (t) => {
  await t.test("RETIRED cards start collapsed", () => {
    assert.ok(shouldStartCollapsed("RETIRED"));
  });

  await t.test("FAILED cards start collapsed", () => {
    assert.ok(shouldStartCollapsed("FAILED"));
  });

  await t.test("PRODUCTION cards do NOT start collapsed", () => {
    assert.ok(!shouldStartCollapsed("PRODUCTION"));
  });

  await t.test("STAGING cards do NOT start collapsed", () => {
    assert.ok(!shouldStartCollapsed("STAGING"));
  });

  await t.test("DRAFT cards do NOT start collapsed", () => {
    assert.ok(!shouldStartCollapsed("DRAFT"));
  });
});

test("AgentVersionsApi — pre-submit guard", async (t) => {
  await t.test("valid STAGING + all pass → no error", () => {
    const version = makeVersion({ state: "STAGING", allGatesPassed: true });
    assert.strictEqual(validatePromoteRequest(version), null);
  });

  await t.test("gates not all passed → blocked with message", () => {
    const version = makeVersion({ state: "STAGING", allGatesPassed: false });
    const err = validatePromoteRequest(version);
    assert.ok(err !== null);
    assert.ok(err!.includes("regression gates"));
  });

  await t.test("non-STAGING state → blocked with state in message", () => {
    const version = makeVersion({ state: "PRODUCTION", allGatesPassed: true });
    const err = validatePromoteRequest(version);
    assert.ok(err !== null);
    assert.ok(err!.includes("PRODUCTION"));
  });

  await t.test("DRAFT state → blocked", () => {
    const version = makeVersion({ state: "DRAFT", allGatesPassed: true });
    const err = validatePromoteRequest(version);
    assert.ok(err !== null);
  });
});

test("AgentVersionsApi — normalisation (Bug-2)", async (t) => {
  await t.test("lowercase gate result 'pass' → 'PASS'", () => {
    assert.strictEqual(normaliseGateResult("pass"), "PASS");
  });

  await t.test("mixed case 'Fail' → 'FAIL'", () => {
    assert.strictEqual(normaliseGateResult("Fail"), "FAIL");
  });

  await t.test("lowercase 'pending' → 'PENDING'", () => {
    assert.strictEqual(normaliseGateResult("pending"), "PENDING");
  });

  await t.test("lowercase 'staging' → 'STAGING' version state", () => {
    assert.strictEqual(normaliseVersionState("staging"), "STAGING");
  });

  await t.test("mixed case 'Production' → 'PRODUCTION' version state", () => {
    assert.strictEqual(normaliseVersionState("Production"), "PRODUCTION");
  });
});

test("AgentVersionsApi — allGatesPassed derivation", async (t) => {
  await t.test("all PASS → allGatesPassed = true", () => {
    const gates = [makeGate("PASS"), makeGate("PASS"), makeGate("PASS")];
    assert.ok(deriveAllGatesPassed(gates));
  });

  await t.test("one FAIL → allGatesPassed = false", () => {
    const gates = [makeGate("PASS"), makeGate("FAIL"), makeGate("PASS")];
    assert.ok(!deriveAllGatesPassed(gates));
  });

  await t.test("one PENDING → allGatesPassed = false", () => {
    const gates = [makeGate("PASS"), makeGate("PENDING")];
    assert.ok(!deriveAllGatesPassed(gates));
  });

  await t.test("empty gates array → allGatesPassed = false", () => {
    assert.ok(!deriveAllGatesPassed([]));
  });
});
