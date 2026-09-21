/**
 * tests/day7_agent_config.test.ts
 * ─────────────────────────────────────────────────────────────
 * Unit tests for AgentConfigForm and agentConfigApi logic.
 *
 * Tests the pure-logic functions that drive the config form:
 * - Backend tool-rejection handling (never silently hidden)
 * - Trusted-content boundary trust-level normalisation
 * - System prompt character tracking
 * - Save-button dirty-state logic
 * - Tool scope selection (add/remove)
 * - Safety control validation (min/max bounds)
 * - RiskTier and PermissionLevel normalisation (Bug-2)
 */

import test from "node:test";
import assert from "node:assert/strict";
import type {
  AgentConfig,
  SaveAgentConfigPayload,
  TrustedContentBoundary,
  ContentTrustLevel,
} from "../lib/types/day7.ts";

// ─── Logic extracted from agentConfigApi.ts ───────────────────────────────────

function normaliseRiskTier(raw: string): AgentConfig["riskTier"] {
  return raw.toUpperCase() as AgentConfig["riskTier"];
}

function normalisePermissionLevel(raw: string): AgentConfig["permissionLevel"] {
  return raw.toUpperCase() as AgentConfig["permissionLevel"];
}

function normaliseTrustLevel(raw: string): ContentTrustLevel {
  return raw.toUpperCase() as ContentTrustLevel;
}

function normaliseBoundaries(
  raw: TrustedContentBoundary[]
): TrustedContentBoundary[] {
  return raw.map((b) => ({
    ...b,
    trustLevel: normaliseTrustLevel(b.trustLevel),
  }));
}

// ─── Logic extracted from AgentConfigForm.tsx ─────────────────────────────────

/** The save button is enabled only when the form is dirty */
function isSaveEnabled(dirty: boolean, saving: boolean): boolean {
  return dirty && !saving;
}

/** Toggle a tool in/out of the selected set */
function toggleTool(selected: string[], toolId: string): string[] {
  return selected.includes(toolId)
    ? selected.filter((id) => id !== toolId)
    : [...selected, toolId];
}

/** Rejected tools must be removed from the accepted list */
function applyRejections(
  selected: string[],
  rejected: string[]
): string[] {
  return selected.filter((id) => !rejected.includes(id));
}

/**
 * Backend rejection rule extracted from agentConfigApi mock:
 * finance.read and workflow.trigger are always rejected for agents
 * below AUTONOMOUS permission level.
 */
const HIGH_RISK_TOOLS = ["finance.read", "workflow.trigger"];

function simulateBackendToolValidation(
  requested: string[]
): { accepted: string[]; rejected: string[] } {
  const rejected = requested.filter((id) => HIGH_RISK_TOOLS.includes(id));
  const accepted = requested.filter((id) => !HIGH_RISK_TOOLS.includes(id));
  return { accepted, rejected };
}

/** Safety control: maxTokensPerCall must be 256–32768 in steps of 256 */
function isMaxTokensValid(value: number): boolean {
  return value >= 256 && value <= 32768 && value % 256 === 0;
}

/** Safety control: minConfidenceThreshold must be 0–100 */
function isConfidenceValid(value: number): boolean {
  return value >= 0 && value <= 100;
}

/** Add a new blank trusted-content boundary */
function addBoundary(
  existing: TrustedContentBoundary[]
): TrustedContentBoundary[] {
  return [...existing, { label: "", pattern: "", trustLevel: "VERIFIED" }];
}

/** Remove boundary at index */
function removeBoundary(
  existing: TrustedContentBoundary[],
  index: number
): TrustedContentBoundary[] {
  return existing.filter((_, i) => i !== index);
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    agentId: "test-agent",
    agentName: "Test Agent",
    systemPrompt: "You are a test agent.",
    allowedToolIds: ["crm.lead.read", "enrichment.clearbit"],
    rejectedToolIds: [],
    trustedContentBoundaries: [
      { label: "Internal", pattern: "*.zyoris.com", trustLevel: "TRUSTED" },
    ],
    maxTokensPerCall: 4096,
    promptInjectionDefenceEnabled: true,
    minConfidenceThreshold: 60,
    riskTier: "MEDIUM",
    permissionLevel: "EXECUTE_WITH_APPROVAL",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("AgentConfigForm — save button state", async (t) => {
  await t.test("disabled when not dirty", () => {
    assert.ok(!isSaveEnabled(false, false));
  });

  await t.test("disabled when saving in progress", () => {
    assert.ok(!isSaveEnabled(true, true));
  });

  await t.test("enabled when dirty and not saving", () => {
    assert.ok(isSaveEnabled(true, false));
  });
});

test("AgentConfigForm — tool scope selection", async (t) => {
  const initial = ["crm.lead.read", "enrichment.clearbit"];

  await t.test("adds a new tool to the selection", () => {
    const result = toggleTool(initial, "web.search");
    assert.ok(result.includes("web.search"));
    assert.strictEqual(result.length, 3);
  });

  await t.test("removes an existing tool from the selection", () => {
    const result = toggleTool(initial, "enrichment.clearbit");
    assert.ok(!result.includes("enrichment.clearbit"));
    assert.strictEqual(result.length, 1);
  });

  await t.test("toggling same tool twice restores original set", () => {
    const after1 = toggleTool(initial, "web.search");
    const after2 = toggleTool(after1, "web.search");
    assert.deepStrictEqual(after2, initial);
  });
});

test("AgentConfigForm — backend tool rejection (non-negotiable: never hidden)", async (t) => {
  await t.test("simulateBackendToolValidation rejects high-risk tools", () => {
    const { accepted, rejected } = simulateBackendToolValidation([
      "crm.lead.read",
      "finance.read",
      "workflow.trigger",
      "web.search",
    ]);
    assert.deepStrictEqual(rejected, ["finance.read", "workflow.trigger"]);
    assert.deepStrictEqual(accepted, ["crm.lead.read", "web.search"]);
  });

  await t.test("applyRejections removes rejected tools from accepted set", () => {
    const after = applyRejections(
      ["crm.lead.read", "finance.read", "web.search"],
      ["finance.read"]
    );
    assert.ok(!after.includes("finance.read"));
    assert.ok(after.includes("crm.lead.read"));
    assert.ok(after.includes("web.search"));
  });

  await t.test("no rejection when no high-risk tools requested", () => {
    const { accepted, rejected } = simulateBackendToolValidation([
      "crm.lead.read",
      "enrichment.clearbit",
    ]);
    assert.strictEqual(rejected.length, 0);
    assert.strictEqual(accepted.length, 2);
  });
});

test("AgentConfigForm — safety control validation", async (t) => {
  await t.test("maxTokensPerCall: 4096 is valid", () => {
    assert.ok(isMaxTokensValid(4096));
  });

  await t.test("maxTokensPerCall: 256 (min) is valid", () => {
    assert.ok(isMaxTokensValid(256));
  });

  await t.test("maxTokensPerCall: 32768 (max) is valid", () => {
    assert.ok(isMaxTokensValid(32768));
  });

  await t.test("maxTokensPerCall: 100 is invalid (below min)", () => {
    assert.ok(!isMaxTokensValid(100));
  });

  await t.test("maxTokensPerCall: 40000 is invalid (above max)", () => {
    assert.ok(!isMaxTokensValid(40000));
  });

  await t.test("maxTokensPerCall: 1000 is invalid (not a multiple of 256)", () => {
    assert.ok(!isMaxTokensValid(1000));
  });

  await t.test("minConfidenceThreshold: 0 is valid", () => {
    assert.ok(isConfidenceValid(0));
  });

  await t.test("minConfidenceThreshold: 100 is valid", () => {
    assert.ok(isConfidenceValid(100));
  });

  await t.test("minConfidenceThreshold: 60 is valid", () => {
    assert.ok(isConfidenceValid(60));
  });

  await t.test("minConfidenceThreshold: -1 is invalid", () => {
    assert.ok(!isConfidenceValid(-1));
  });

  await t.test("minConfidenceThreshold: 101 is invalid", () => {
    assert.ok(!isConfidenceValid(101));
  });
});

test("AgentConfigForm — trusted content boundaries", async (t) => {
  const initial: TrustedContentBoundary[] = [
    { label: "Internal", pattern: "*.zyoris.com", trustLevel: "TRUSTED" },
  ];

  await t.test("addBoundary appends a blank VERIFIED boundary", () => {
    const result = addBoundary(initial);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[1].trustLevel, "VERIFIED");
    assert.strictEqual(result[1].label, "");
    assert.strictEqual(result[1].pattern, "");
  });

  await t.test("removeBoundary removes the correct index", () => {
    const result = removeBoundary(initial, 0);
    assert.strictEqual(result.length, 0);
  });

  await t.test("removeBoundary with 2 items removes only the targeted index", () => {
    const two = [
      { label: "A", pattern: "a.com", trustLevel: "TRUSTED" as ContentTrustLevel },
      { label: "B", pattern: "b.com", trustLevel: "UNTRUSTED" as ContentTrustLevel },
    ];
    const result = removeBoundary(two, 0);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].label, "B");
  });
});

test("AgentConfigApi — normalisation (Bug-2)", async (t) => {
  await t.test("lowercase 'medium' → 'MEDIUM' riskTier", () => {
    assert.strictEqual(normaliseRiskTier("medium"), "MEDIUM");
  });

  await t.test("mixed case 'High' → 'HIGH' riskTier", () => {
    assert.strictEqual(normaliseRiskTier("High"), "HIGH");
  });

  await t.test("lowercase 'execute_with_approval' → uppercase permissionLevel", () => {
    assert.strictEqual(
      normalisePermissionLevel("execute_with_approval"),
      "EXECUTE_WITH_APPROVAL"
    );
  });

  await t.test("mixed case 'Trusted' → 'TRUSTED' trustLevel", () => {
    assert.strictEqual(normaliseTrustLevel("Trusted"), "TRUSTED");
  });

  await t.test("normaliseBoundaries uppercases all trust levels", () => {
    const raw: TrustedContentBoundary[] = [
      { label: "A", pattern: "a.com", trustLevel: "trusted" as any },
      { label: "B", pattern: "b.com", trustLevel: "verified" as any },
      { label: "C", pattern: "c.com", trustLevel: "untrusted" as any },
    ];
    const result = normaliseBoundaries(raw);
    assert.strictEqual(result[0].trustLevel, "TRUSTED");
    assert.strictEqual(result[1].trustLevel, "VERIFIED");
    assert.strictEqual(result[2].trustLevel, "UNTRUSTED");
  });
});
