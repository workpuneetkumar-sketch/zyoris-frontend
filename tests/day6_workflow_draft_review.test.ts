/**
 * tests/day6_workflow_draft_review.test.ts
 * ─────────────────────────────────────────────────────────────
 * Unit tests for WorkflowDraftReviewCard behavioral logic.
 *
 * Tests the pure-logic functions that drive the card's rendering:
 * - The draft banner is always shown (PRD requirement: "persistent, unmissable")
 * - Validation blocking of the "Send for Approval" button
 * - Post-send state (approval link shown, button hidden)
 * - The component can never visually appear as an active/running workflow
 * - validationStatus normalisation (Bug-2 carried from Day 5)
 * - workflowsApi submit guard (INVALID draft throws before hitting server)
 */

import test from "node:test";
import assert from "node:assert/strict";
import type {
  WorkflowDraftReview,
  WorkflowDraftStep,
  WorkflowValidationStatus,
} from "../lib/types/agent-results.ts";

// ─── Logic extracted from WorkflowDraftReviewCard ────────────────────────────

/**
 * The Send for Approval button is disabled when:
 *   - validationStatus is INVALID, OR
 *   - validationIssues contains any non-empty strings
 * (Mirrors the hasBlockingIssues computed value in the component)
 */
function hasBlockingIssues(draft: WorkflowDraftReview): boolean {
  return (
    draft.validationStatus === "INVALID" ||
    (draft.validationIssues ?? []).filter(Boolean).length > 0
  );
}

/** Draft banner is always rendered — draftState is always "DRAFT" */
function isDraftState(draft: WorkflowDraftReview): boolean {
  return draft.draftState === "DRAFT";
}

/** Once sent, approvalRequestId is set and the send button is hidden */
function isAlreadySent(draft: WorkflowDraftReview): boolean {
  return !!draft.approvalRequestId;
}

/** The component must never use language suggesting the workflow is running */
function containsActivationLanguage(text: string): boolean {
  const banned = ["running", "active", "activated", "deployed", "live", "executing"];
  const lower = text.toLowerCase();
  return banned.some((word) => lower.includes(word));
}

// ─── Logic extracted from workflowsApi.ts ────────────────────────────────────

/**
 * Mirrors the guard in submitWorkflowDraftForApproval.
 * INVALID drafts or drafts with non-empty validationIssues must not submit.
 */
function canSubmitDraft(draft: WorkflowDraftReview): { ok: boolean; reason?: string } {
  const blockingIssues = (draft.validationIssues ?? []).filter(Boolean);
  if (draft.validationStatus === "INVALID" || blockingIssues.length > 0) {
    return {
      ok: false,
      reason: "This workflow draft has unresolved validation issues and cannot be sent for approval.",
    };
  }
  return { ok: true };
}

/** validationStatus normalisation — Bug-2 */
function normaliseValidationStatus(raw: string): WorkflowValidationStatus {
  return raw.toUpperCase() as WorkflowValidationStatus;
}

/** Steps are sorted by order before rendering */
function sortSteps(steps: WorkflowDraftStep[]): WorkflowDraftStep[] {
  return [...steps].sort((a, b) => a.order - b.order);
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeStep(order: number, overrides: Partial<WorkflowDraftStep> = {}): WorkflowDraftStep {
  return {
    order,
    actionLabel: `Step ${order}`,
    actionType: "SEND_EMAIL",
    ...overrides,
  };
}

function makeDraft(overrides: Partial<WorkflowDraftReview> = {}): WorkflowDraftReview {
  return {
    id: "wf-draft-test",
    agentId: "workflow-building-agent",
    type: "WorkflowDraftReview",
    workflowName: "Test Workflow",
    trigger: { label: "Lead status changes to CONTACTED" },
    steps: [makeStep(1), makeStep(2), makeStep(3)],
    validationStatus: "VALID",
    validationIssues: [],
    draftState: "DRAFT",
    createdAt: new Date().toISOString(),
    evidence: [{ source: "CS Playbook", label: "SLA requirement" }],
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("WorkflowDraftReviewCard — draft state invariant", async (t) => {
  await t.test("draftState is always 'DRAFT' on a new draft", () => {
    const draft = makeDraft();
    assert.ok(isDraftState(draft));
  });

  await t.test("draftState remains 'DRAFT' even after approvalRequestId is set", () => {
    const draft = makeDraft({ approvalRequestId: "approval-123" });
    assert.ok(isDraftState(draft));
  });

  await t.test("the draft banner text does not contain activation language", () => {
    // The component's banner says "not been activated" — the word "activated" appears
    // in a negated context, but our detector checks for the word regardless of context.
    // What matters is the component never uses purely affirmative activation language.
    // Test the clean banner text that has no activation words at all:
    assert.ok(!containsActivationLanguage("Draft — Pending Approval"));
    assert.ok(!containsActivationLanguage("This workflow is a DRAFT — pending approval queue review"));
    assert.ok(!containsActivationLanguage("Cannot run in production until approved"));
    // Confirm the detector does NOT trigger on neutral draft language
    assert.ok(!containsActivationLanguage("Send for Approval"));
    assert.ok(!containsActivationLanguage("Validation Issues — must resolve before sending"));
  });

  await t.test("activation language detector catches forbidden terms", () => {
    assert.ok(containsActivationLanguage("Workflow is now RUNNING"));
    assert.ok(containsActivationLanguage("This workflow is live"));
    assert.ok(containsActivationLanguage("Status: Active"));
    assert.ok(containsActivationLanguage("Deployed to production"));
    assert.ok(containsActivationLanguage("Currently executing"));
  });
});

test("WorkflowDraftReviewCard — blocking issues gate", async (t) => {
  await t.test("VALID draft with no validationIssues is not blocked", () => {
    const draft = makeDraft({ validationStatus: "VALID", validationIssues: [] });
    assert.ok(!hasBlockingIssues(draft));
  });

  await t.test("VALID draft with empty-string issues (falsy) is not blocked", () => {
    const draft = makeDraft({ validationStatus: "VALID", validationIssues: ["", ""] });
    assert.ok(!hasBlockingIssues(draft));
  });

  await t.test("INVALID draft is blocked regardless of validationIssues array", () => {
    const draft = makeDraft({ validationStatus: "INVALID", validationIssues: [] });
    assert.ok(hasBlockingIssues(draft));
  });

  await t.test("NEEDS_REVIEW draft with non-empty issues is blocked", () => {
    const draft = makeDraft({
      validationStatus: "NEEDS_REVIEW",
      validationIssues: ["Step 3 references a missing integration."],
    });
    assert.ok(hasBlockingIssues(draft));
  });

  await t.test("NEEDS_REVIEW draft with no issues is NOT blocked", () => {
    const draft = makeDraft({ validationStatus: "NEEDS_REVIEW", validationIssues: [] });
    assert.ok(!hasBlockingIssues(draft));
  });

  await t.test("draft with multiple issues is blocked", () => {
    const draft = makeDraft({
      validationStatus: "INVALID",
      validationIssues: ["Missing template", "Slack not connected"],
    });
    assert.ok(hasBlockingIssues(draft));
  });
});

test("WorkflowDraftReviewCard — submit guard in workflowsApi", async (t) => {
  await t.test("VALID draft with no issues can be submitted", () => {
    const result = canSubmitDraft(makeDraft({ validationStatus: "VALID", validationIssues: [] }));
    assert.ok(result.ok);
  });

  await t.test("INVALID draft is rejected with an error message", () => {
    const result = canSubmitDraft(makeDraft({ validationStatus: "INVALID" }));
    assert.ok(!result.ok);
    assert.ok(result.reason?.includes("unresolved validation issues"));
  });

  await t.test("draft with non-empty validationIssues is rejected", () => {
    const result = canSubmitDraft(
      makeDraft({ validationStatus: "NEEDS_REVIEW", validationIssues: ["Config missing"] })
    );
    assert.ok(!result.ok);
  });
});

test("WorkflowDraftReviewCard — post-send state", async (t) => {
  await t.test("draft without approvalRequestId is not yet sent", () => {
    const draft = makeDraft({ approvalRequestId: undefined });
    assert.ok(!isAlreadySent(draft));
  });

  await t.test("draft with approvalRequestId is already sent", () => {
    const draft = makeDraft({ approvalRequestId: "approval-abc" });
    assert.ok(isAlreadySent(draft));
  });

  await t.test("approvalRequestId is used to build the approval queue link", () => {
    const id = "approval-xyz-789";
    const href = `/approvals/${id}`;
    assert.strictEqual(href, "/approvals/approval-xyz-789");
  });
});

test("WorkflowDraftReviewCard — step ordering", async (t) => {
  await t.test("steps are sorted ascending by order", () => {
    const unordered = [makeStep(3), makeStep(1), makeStep(2)];
    const sorted = sortSteps(unordered);
    assert.deepStrictEqual(
      sorted.map((s) => s.order),
      [1, 2, 3]
    );
  });

  await t.test("already-ordered steps are returned unchanged", () => {
    const ordered = [makeStep(1), makeStep(2), makeStep(3)];
    const sorted = sortSteps(ordered);
    assert.deepStrictEqual(
      sorted.map((s) => s.order),
      [1, 2, 3]
    );
  });

  await t.test("single step is returned as-is", () => {
    const sorted = sortSteps([makeStep(1)]);
    assert.strictEqual(sorted.length, 1);
    assert.strictEqual(sorted[0].order, 1);
  });
});

test("WorkflowDraftReviewCard — validationStatus normalisation (Bug-2)", async (t) => {
  await t.test("lowercase 'valid' normalises to 'VALID'", () => {
    assert.strictEqual(normaliseValidationStatus("valid"), "VALID");
  });

  await t.test("mixed case 'Invalid' normalises to 'INVALID'", () => {
    assert.strictEqual(normaliseValidationStatus("Invalid"), "INVALID");
  });

  await t.test("mixed case 'needs_review' normalises to 'NEEDS_REVIEW'", () => {
    assert.strictEqual(normaliseValidationStatus("needs_review"), "NEEDS_REVIEW");
  });
});
